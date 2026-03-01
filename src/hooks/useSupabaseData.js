import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function now() { return new Date().toISOString() }
function uid()  { return crypto.randomUUID() }

// Strip undefined and the local-only 'imported' flag; convert empty strings to null
function clean(obj) {
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([k, v]) => v !== undefined && k !== 'imported')
      .map(([k, v]) => [k, v === '' ? null : v])
  )
}

// Recipes carry extra equipment-link fields not in Supabase schema — strip before writes
const RECIPE_SB_KEYS = new Set([
  'id', 'user_id', 'title', 'bean_id', 'brew_method', 'filter_type',
  'dose_g', 'yield_g', 'water_temp_c', 'grind_size', 'brew_time_sec',
  'steps', 'rating', 'notes', 'is_favorite', 'created_at',
])
function cleanRecipe(item) {
  return Object.fromEntries(Object.entries(clean(item)).filter(([k]) => RECIPE_SB_KEYS.has(k)))
}

// Default equipment — seeded into Supabase on first login (no IDs; DB generates them)
const DEFAULT_EQUIPMENT_SEED = [
  { name: 'Hario V60',        category: 'brewer',       brand: 'Hario',     notes: '' },
  { name: 'Aeropress',        category: 'brewer',       brand: 'Aeropress', notes: '' },
  { name: 'Chemex',           category: 'brewer',       brand: 'Chemex',    notes: '' },
  { name: 'Moka Pot',         category: 'brewer',       brand: 'Bialetti',  notes: '' },
  { name: 'French Press',     category: 'brewer',       brand: '',          notes: '' },
  { name: 'Espresso Machine', category: 'brewer',       brand: '',          notes: '' },
  { name: 'Kalita Wave',      category: 'brewer',       brand: 'Kalita',    notes: '' },
  { name: 'Clever Dripper',   category: 'brewer',       brand: 'Clever',    notes: '' },
  { name: 'Hario V60 Paper',  category: 'filter_paper', brand: 'Hario',     notes: '' },
  { name: 'Aeropress Paper',  category: 'filter_paper', brand: 'Aeropress', notes: '' },
  { name: 'Chemex Filter',    category: 'filter_paper', brand: 'Chemex',    notes: '' },
]

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Supabase-only data layer. No localStorage.
 * - State starts empty; data is fetched from Supabase on login
 * - Equipment is seeded into Supabase on first login (never re-injected client-side)
 * - Writes are optimistic (state updates first), then sent to Supabase
 * - On write error the optimistic update is reverted
 * - Imported items live in memory only (lost on page refresh)
 * - syncStatus: 'loading' | 'syncing' | 'synced' | 'offline' | 'local'
 */
export function useSupabaseData(user) {
  const [roasteries, setRoasteries] = useState([])
  const [beans,      setBeans]      = useState([])
  const [recipes,    setRecipes]    = useState([])
  const [equipment,  setEquipment]  = useState([])
  const [syncStatus, setSyncStatus] = useState('loading')

  // Stable refs for use inside callbacks
  const rosteriesRef = useRef([])
  const beansRef     = useRef([])
  const userRef      = useRef(user)
  useEffect(() => { rosteriesRef.current = roasteries }, [roasteries])
  useEffect(() => { beansRef.current     = beans },      [beans])
  useEffect(() => { userRef.current      = user },       [user])

  // ── Clear state on logout ─────────────────────────────────────────────────
  const prevUserIdRef = useRef(user?.id)
  useEffect(() => {
    const prev = prevUserIdRef.current
    const curr = user?.id
    if (prev && !curr) {
      setRoasteries([])
      setBeans([])
      setRecipes([])
      setEquipment([])
      setSyncStatus('local')
    }
    prevUserIdRef.current = curr
  }, [user?.id])  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pull all data from Supabase ───────────────────────────────────────────
  const pullAll = useCallback(async () => {
    if (!userRef.current) { setSyncStatus('local'); return }

    setSyncStatus('syncing')
    const userId = userRef.current.id
    try {
      // Fetch own data + follow relations in one round-trip
      const [r, b, rec, eq, fr, fb] = await Promise.all([
        supabase.from('roasteries').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
        supabase.from('beans').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
        supabase.from('recipes').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
        supabase.from('equipment').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
        supabase.from('followed_roasteries').select('roastery_id, is_favorite').eq('user_id', userId),
        supabase.from('followed_beans').select('bean_id, is_favorite').eq('user_id', userId),
      ])

      if (r.error || b.error || rec.error) throw new Error('fetch failed')

      let eqData = eq.error ? [] : (eq.data ?? [])

      // ── First login: seed default equipment into Supabase ────────────────
      if (eqData.length === 0) {
        const seeds = DEFAULT_EQUIPMENT_SEED.map(e => ({ ...e, user_id: userId, created_at: new Date().toISOString() }))
        const { data: inserted } = await supabase.from('equipment').insert(seeds).select()
        eqData = inserted ?? seeds
      }

      // Fetch the actual followed items (public read, no user_id filter)
      let followedR = [], followedB = []
      if (fr.data?.length) {
        const ids = fr.data.map(x => x.roastery_id)
        const { data } = await supabase.from('roasteries').select('*').in('id', ids)
        followedR = (data ?? []).map(row => {
          const rel = fr.data.find(x => x.roastery_id === row.id)
          return { ...row, imported: true, is_favorite: rel?.is_favorite ?? false }
        })
      }
      if (fb.data?.length) {
        const ids = fb.data.map(x => x.bean_id)
        const { data } = await supabase.from('beans').select('*').in('id', ids)
        followedB = (data ?? []).map(row => {
          const rel = fb.data.find(x => x.bean_id === row.id)
          return { ...row, imported: true, is_favorite: rel?.is_favorite ?? false }
        })
      }

      setRoasteries([...(r.data ?? []), ...followedR])
      setBeans(     [...(b.data ?? []), ...followedB])
      setRecipes(rec.data)
      setEquipment(eqData)
      setSyncStatus('synced')
    } catch {
      setSyncStatus('offline')
    }
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  // Trigger pull on login (or on mount if already logged in)
  useEffect(() => {
    if (user) pullAll()
    else setSyncStatus('local')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // ── Roasteries ───────────────────────────────────────────────────────────
  function addRoastery(data) {
    const id = data.id ?? uid()
    if (rosteriesRef.current.some(r => r.id === id)) return  // dedup
    const item = { ...data, id, user_id: userRef.current?.id, created_at: data.created_at ?? now() }
    setRoasteries(prev => [...prev, item])
    if (!userRef.current) return
    if (data.imported) {
      // Followed item — write a pointer to the junction table
      supabase.from('followed_roasteries')
        .insert({ user_id: userRef.current.id, roastery_id: id, is_favorite: false })
        .then(({ error }) => { if (error) setRoasteries(prev => prev.filter(r => r.id !== id)) })
    } else {
      supabase.from('roasteries').insert(clean(item)).then(({ error }) => {
        if (error) setRoasteries(prev => prev.filter(r => r.id !== item.id))
      })
    }
  }
  function updateRoastery(id, data) {
    const item = rosteriesRef.current.find(r => r.id === id)
    setRoasteries(prev => prev.map(r => r.id === id ? { ...r, ...data } : r))
    if (!userRef.current) return
    if (item?.imported) {
      // Followed items are read-only; only persist is_favorite changes
      if ('is_favorite' in data)
        supabase.from('followed_roasteries')
          .update({ is_favorite: data.is_favorite })
          .eq('user_id', userRef.current.id).eq('roastery_id', id).then()
    } else {
      supabase.from('roasteries').update(clean(data)).eq('id', id).then()
    }
  }
  function deleteRoastery(id) {
    const item = rosteriesRef.current.find(r => r.id === id)
    setRoasteries(prev => prev.filter(r => r.id !== id))
    if (!userRef.current) return
    if (item?.imported) {
      supabase.from('followed_roasteries').delete()
        .eq('user_id', userRef.current.id).eq('roastery_id', id).then()
    } else {
      supabase.from('roasteries').delete().eq('id', id).then()
    }
  }

  // ── Beans ────────────────────────────────────────────────────────────────
  function addBean(data) {
    const id = data.id ?? uid()
    if (beansRef.current.some(b => b.id === id)) return  // dedup
    const item = { ...data, id, user_id: userRef.current?.id, created_at: data.created_at ?? now() }
    setBeans(prev => [...prev, item])
    if (!userRef.current) return
    if (data.imported) {
      // Followed item — write a pointer to the junction table
      supabase.from('followed_beans')
        .insert({ user_id: userRef.current.id, bean_id: id, is_favorite: false })
        .then(({ error }) => { if (error) setBeans(prev => prev.filter(b => b.id !== id)) })
    } else {
      supabase.from('beans').insert(clean(item)).then(({ error }) => {
        if (error) setBeans(prev => prev.filter(b => b.id !== item.id))
      })
    }
  }
  function updateBean(id, data) {
    const item = beansRef.current.find(b => b.id === id)
    setBeans(prev => prev.map(b => b.id === id ? { ...b, ...data } : b))
    if (!userRef.current) return
    if (item?.imported) {
      // Followed items are read-only; only persist is_favorite changes
      if ('is_favorite' in data)
        supabase.from('followed_beans')
          .update({ is_favorite: data.is_favorite })
          .eq('user_id', userRef.current.id).eq('bean_id', id).then()
    } else {
      supabase.from('beans').update(clean(data)).eq('id', id).then()
    }
  }
  function deleteBean(id) {
    const item = beansRef.current.find(b => b.id === id)
    setBeans(prev => prev.filter(b => b.id !== id))
    if (!userRef.current) return
    if (item?.imported) {
      supabase.from('followed_beans').delete()
        .eq('user_id', userRef.current.id).eq('bean_id', id).then()
    } else {
      supabase.from('beans').delete().eq('id', id).then()
    }
  }

  // ── Recipes ──────────────────────────────────────────────────────────────
  function addRecipe(data) {
    const item = { ...data, id: uid(), user_id: userRef.current?.id, created_at: now() }
    setRecipes(prev => [...prev, item])
    if (userRef.current)
      supabase.from('recipes').insert(cleanRecipe(item)).then(({ error }) => {
        if (error) setRecipes(prev => prev.filter(r => r.id !== item.id))
      })
  }
  function updateRecipe(id, data) {
    setRecipes(prev => prev.map(r => r.id === id ? { ...r, ...data } : r))
    if (userRef.current) supabase.from('recipes').update(cleanRecipe(data)).eq('id', id).then()
  }
  function deleteRecipe(id) {
    setRecipes(prev => prev.filter(r => r.id !== id))
    if (userRef.current) supabase.from('recipes').delete().eq('id', id).then()
  }

  // ── Equipment ────────────────────────────────────────────────────────────
  function addEquipment(data) {
    const item = { ...data, id: uid(), user_id: userRef.current?.id, created_at: now() }
    setEquipment(prev => [...prev, item])
    if (userRef.current)
      supabase.from('equipment').insert(clean(item)).then(({ error }) => {
        if (error) setEquipment(prev => prev.filter(e => e.id !== item.id))
      })
  }
  function updateEquipment(id, data) {
    setEquipment(prev => prev.map(e => e.id === id ? { ...e, ...data } : e))
    if (userRef.current) supabase.from('equipment').update(clean(data)).eq('id', id).then()
  }
  function deleteEquipment(id) {
    setEquipment(prev => prev.filter(e => e.id !== id))
    if (userRef.current) supabase.from('equipment').delete().eq('id', id).then()
  }

  return {
    roasteries, addRoastery, updateRoastery, deleteRoastery,
    beans,      addBean,      updateBean,      deleteBean,
    recipes,    addRecipe,    updateRecipe,    deleteRecipe,
    equipment,  addEquipment, updateEquipment, deleteEquipment,
    syncStatus, pullAll,
  }
}
