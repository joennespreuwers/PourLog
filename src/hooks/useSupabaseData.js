import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function now() { return new Date().toISOString() }
function uid()  { return crypto.randomUUID() }

// ─── Cache helpers (localStorage as transparent read-cache) ───────────────────

const CACHE = {
  roasteries: 'pourlog_roasteries',
  beans:      'pourlog_beans',
  recipes:    'pourlog_recipes',
  equipment:  'pourlog_equipment',
}

function readCache(key, fallback = []) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}
function writeCache(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch {}
}
function clearAllCache() {
  Object.values(CACHE).forEach(k => localStorage.removeItem(k))
}

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

// Default equipment — IDs prefixed 'default-' so Supabase writes are skipped for them
export const DEFAULT_EQUIPMENT = [
  { id: 'default-v60',         name: 'Hario V60',        category: 'brewer',       brand: 'Hario',     notes: '', created_at: '' },
  { id: 'default-aeropress',   name: 'Aeropress',        category: 'brewer',       brand: 'Aeropress', notes: '', created_at: '' },
  { id: 'default-chemex',      name: 'Chemex',           category: 'brewer',       brand: 'Chemex',    notes: '', created_at: '' },
  { id: 'default-moka',        name: 'Moka Pot',         category: 'brewer',       brand: 'Bialetti',  notes: '', created_at: '' },
  { id: 'default-frenchpress', name: 'French Press',     category: 'brewer',       brand: '',          notes: '', created_at: '' },
  { id: 'default-espresso',    name: 'Espresso Machine', category: 'brewer',       brand: '',          notes: '', created_at: '' },
  { id: 'default-kalita',      name: 'Kalita Wave',      category: 'brewer',       brand: 'Kalita',    notes: '', created_at: '' },
  { id: 'default-clever',      name: 'Clever Dripper',   category: 'brewer',       brand: 'Clever',    notes: '', created_at: '' },
  { id: 'default-v60paper',    name: 'Hario V60 Paper',  category: 'filter_paper', brand: 'Hario',     notes: '', created_at: '' },
  { id: 'default-aropaper',    name: 'Aeropress Paper',  category: 'filter_paper', brand: 'Aeropress', notes: '', created_at: '' },
  { id: 'default-chemexpaper', name: 'Chemex Filter',    category: 'filter_paper', brand: 'Chemex',    notes: '', created_at: '' },
]

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Auth-required data layer backed by Supabase. localStorage is a transparent
 * read-cache — it lets the app show data instantly on load and work offline,
 * but Supabase is always the source of truth.
 * - localStorage is a transparent read-cache (instant load + offline reads)
 * - pullAll() is triggered automatically on login; state is cleared on logout
 * - Writes are optimistic (state + cache update first), then pushed to Supabase.
 *   On write error the optimistic update is reverted.
 * - syncStatus: 'loading' | 'synced' | 'offline' | 'error'
 */
export function useSupabaseData(user) {
  // Initialise from cache for instant render
  const [roasteries, setRoasteries] = useState(() => readCache(CACHE.roasteries, []))
  const [beans,      setBeans]      = useState(() => readCache(CACHE.beans,      []))
  const [recipes,    setRecipes]    = useState(() => readCache(CACHE.recipes,    []))
  const [equipment,  setEquipment]  = useState(() => readCache(CACHE.equipment,  DEFAULT_EQUIPMENT))
  const [syncStatus, setSyncStatus] = useState('loading')

  // Stable refs for callbacks
  const rosteriesRef = useRef(roasteries)
  const beansRef     = useRef(beans)
  const userRef      = useRef(user)
  useEffect(() => { rosteriesRef.current = roasteries }, [roasteries])
  useEffect(() => { beansRef.current     = beans },      [beans])
  useEffect(() => { userRef.current      = user },       [user])

  // Write-through cache: keep localStorage in sync with state
  useEffect(() => { writeCache(CACHE.roasteries, roasteries) }, [roasteries])
  useEffect(() => { writeCache(CACHE.beans,      beans) },      [beans])
  useEffect(() => { writeCache(CACHE.recipes,    recipes) },    [recipes])
  useEffect(() => { writeCache(CACHE.equipment,  equipment) },  [equipment])

  // ── Clear state on logout ─────────────────────────────────────────────────
  const prevUserIdRef = useRef(user?.id)
  useEffect(() => {
    const prev = prevUserIdRef.current
    const curr = user?.id
    if (prev && !curr) {
      setRoasteries([])
      setBeans([])
      setRecipes([])
      setEquipment(DEFAULT_EQUIPMENT)
      clearAllCache()
      setSyncStatus('local')
    }
    prevUserIdRef.current = curr
  }, [user?.id])   // eslint-disable-line react-hooks/exhaustive-deps

  // ── Refresh imported items (public read — no auth needed) ─────────────────
  const refreshImported = useCallback(async () => {
    const importedR = rosteriesRef.current.filter(r => r.imported)
    const importedB = beansRef.current.filter(b => b.imported)
    if (!importedR.length && !importedB.length) return
    const fetches = []
    if (importedR.length) {
      fetches.push(
        supabase.from('roasteries').select('*').in('id', importedR.map(r => r.id))
          .then(({ data }) => {
            if (!data?.length) return
            const fresh = data.map(row => {
              const local = importedR.find(r => r.id === row.id)
              return { ...row, imported: true, rating: local?.rating, notes: local?.notes, is_favorite: local?.is_favorite ?? false }
            })
            setRoasteries(prev => [...prev.filter(r => !r.imported), ...fresh])
          })
      )
    }
    if (importedB.length) {
      fetches.push(
        supabase.from('beans').select('*').in('id', importedB.map(b => b.id))
          .then(({ data }) => {
            if (!data?.length) return
            const fresh = data.map(row => {
              const local = importedB.find(b => b.id === row.id)
              return { ...row, imported: true, rating: local?.rating, notes: local?.notes, is_favorite: local?.is_favorite ?? false }
            })
            setBeans(prev => [...prev.filter(b => !b.imported), ...fresh])
          })
      )
    }
    await Promise.all(fetches)
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pull all data from Supabase ───────────────────────────────────────────
  const pullAll = useCallback(async () => {
    await refreshImported()
    if (!userRef.current) { setSyncStatus('local'); return }
    setSyncStatus('syncing')
    const uid = userRef.current.id
    try {
      const [r, b, rec, eq] = await Promise.all([
        supabase.from('roasteries').select('*').eq('user_id', uid).order('created_at', { ascending: true }),
        supabase.from('beans').select('*').eq('user_id', uid).order('created_at', { ascending: true }),
        supabase.from('recipes').select('*').eq('user_id', uid).order('created_at', { ascending: true }),
        supabase.from('equipment').select('*').eq('user_id', uid).order('created_at', { ascending: true }),
      ])
      if (r.error || b.error || rec.error) throw new Error('fetch failed')
      const eqData    = eq.error ? [] : (eq.data ?? [])
      const defaultIds = new Set(DEFAULT_EQUIPMENT.map(e => e.id))
      // Keep imported items across the pull
      const importedR = rosteriesRef.current.filter(x => x.imported)
      const importedB = beansRef.current.filter(x => x.imported)
      setRoasteries([...r.data,   ...importedR])
      setBeans(     [...b.data,   ...importedB])
      setRecipes(rec.data)
      setEquipment([...DEFAULT_EQUIPMENT, ...eqData.filter(e => !defaultIds.has(e.id))])
      setSyncStatus('synced')
    } catch {
      setSyncStatus('offline')
    }
  }, [refreshImported])  // eslint-disable-line react-hooks/exhaustive-deps

  // Trigger pull on login (or on mount if already logged in); refresh imports when not logged in
  useEffect(() => {
    if (user) pullAll()
    else refreshImported().then(() => setSyncStatus('local'))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // ── Roasteries ───────────────────────────────────────────────────────────
  function addRoastery(data) {
    const id = data.id ?? uid()
    if (rosteriesRef.current.some(r => r.id === id)) return  // dedup (clone/import)
    const item = { ...data, id, user_id: userRef.current?.id, created_at: data.created_at ?? now() }
    setRoasteries(prev => [...prev, item])
    if (userRef.current)
      supabase.from('roasteries').insert(clean(item)).then(({ error }) => {
        if (error) setRoasteries(prev => prev.filter(r => r.id !== item.id))
      })
  }
  function updateRoastery(id, data) {
    setRoasteries(prev => prev.map(r => r.id === id ? { ...r, ...data } : r))
    if (userRef.current) supabase.from('roasteries').update(clean(data)).eq('id', id).then()
  }
  function deleteRoastery(id) {
    setRoasteries(prev => prev.filter(r => r.id !== id))
    if (userRef.current) supabase.from('roasteries').delete().eq('id', id).then()
  }

  // ── Beans ────────────────────────────────────────────────────────────────
  function addBean(data) {
    const id = data.id ?? uid()
    if (beansRef.current.some(b => b.id === id)) return  // dedup (clone/import)
    const item = { ...data, id, user_id: userRef.current?.id, created_at: data.created_at ?? now() }
    setBeans(prev => [...prev, item])
    if (userRef.current)
      supabase.from('beans').insert(clean(item)).then(({ error }) => {
        if (error) setBeans(prev => prev.filter(b => b.id !== item.id))
      })
  }
  function updateBean(id, data) {
    setBeans(prev => prev.map(b => b.id === id ? { ...b, ...data } : b))
    if (userRef.current) supabase.from('beans').update(clean(data)).eq('id', id).then()
  }
  function deleteBean(id) {
    setBeans(prev => prev.filter(b => b.id !== id))
    if (userRef.current) supabase.from('beans').delete().eq('id', id).then()
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
    if (!item.id.startsWith('default-') && userRef.current)
      supabase.from('equipment').insert(clean(item)).then(({ error }) => {
        if (error) setEquipment(prev => prev.filter(e => e.id !== item.id))
      })
  }
  function updateEquipment(id, data) {
    setEquipment(prev => prev.map(e => e.id === id ? { ...e, ...data } : e))
    if (!id.startsWith('default-') && userRef.current)
      supabase.from('equipment').update(clean(data)).eq('id', id).then()
  }
  function deleteEquipment(id) {
    setEquipment(prev => prev.filter(e => e.id !== id))
    if (!id.startsWith('default-') && userRef.current)
      supabase.from('equipment').delete().eq('id', id).then()
  }

  return {
    roasteries, addRoastery, updateRoastery, deleteRoastery,
    beans,      addBean,      updateBean,      deleteBean,
    recipes,    addRecipe,    updateRecipe,    deleteRecipe,
    equipment,  addEquipment, updateEquipment, deleteEquipment,
    syncStatus, pullAll,
  }
}
