import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function now() { return new Date().toISOString() }
function uid()  { return crypto.randomUUID() }

// Strip undefined, local-only meta fields, and empty strings → null
const LOCAL_ONLY_KEYS = new Set(['imported', '_relation_id', '_collected_at'])
function clean(obj) {
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([k, v]) => v !== undefined && !LOCAL_ONLY_KEYS.has(k))
      .map(([k, v]) => [k, v === '' ? null : v])
  )
}

// Personal fields that live in user_roasteries / user_beans (not in global table)
const PERSONAL_FIELDS = new Set(['notes', 'is_favorite'])

// Recipes carry extra equipment-link fields — whitelist before writes
const RECIPE_SB_KEYS = new Set([
  'id', 'user_id', 'title', 'bean_id', 'brew_method', 'filter_type',
  'dose_g', 'yield_g', 'water_temp_c', 'grind_size', 'brew_time_sec',
  'brewer_id', 'grinder_id', 'filter_id',
  'steps', 'notes', 'is_favorite', 'origin_id', 'created_at',
])
function cleanRecipe(item) {
  return Object.fromEntries(Object.entries(clean(item)).filter(([k]) => RECIPE_SB_KEYS.has(k)))
}

// Default equipment seeded into Supabase on first login
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
 * v2 — Global entities model.
 *
 * Roasteries + beans are canonical global objects.
 * Users collect them via user_roasteries / user_beans junction tables.
 * State shape for roasteries / beans:
 *   { ...globalFields, created_by, notes, is_favorite, _relation_id, _collected_at }
 *
 * Recipes remain user-owned (plus followed_recipes for shared ones).
 *
 * syncStatus: 'loading' | 'syncing' | 'synced' | 'offline' | 'local'
 */
export function useSupabaseData(user) {
  const [roasteries, setRoasteries] = useState([])
  const [beans,      setBeans]      = useState([])
  const [recipes,    setRecipes]    = useState([])
  const [equipment,  setEquipment]  = useState([])
  const [syncStatus, setSyncStatus] = useState('loading')

  const roasteriesRef = useRef([])
  const beansRef      = useRef([])
  const recipesRef    = useRef([])
  const userRef       = useRef(user)
  useEffect(() => { roasteriesRef.current = roasteries }, [roasteries])
  useEffect(() => { beansRef.current      = beans },      [beans])
  useEffect(() => { recipesRef.current    = recipes },    [recipes])
  useEffect(() => { userRef.current       = user },       [user])

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
      const [ur, ub, rec, eq, frec] = await Promise.all([
        supabase.from('user_roasteries')
          .select('id, notes, is_favorite, created_at, roastery:roastery_id(*)')
          .eq('user_id', userId)
          .order('created_at', { ascending: true }),
        supabase.from('user_beans')
          .select('id, notes, is_favorite, created_at, bean:bean_id(*)')
          .eq('user_id', userId)
          .order('created_at', { ascending: true }),
        supabase.from('recipes').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
        supabase.from('equipment').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
        supabase.from('followed_recipes').select('recipe_id, is_favorite').eq('user_id', userId),
      ])

      if (ur.error || ub.error || rec.error) throw new Error('fetch failed')

      // Merge global fields with personal collection fields
      const mergedR = (ur.data ?? []).map(row => ({
        ...row.roastery,
        notes:         row.notes,
        is_favorite:   row.is_favorite,
        _relation_id:  row.id,
        _collected_at: row.created_at,
      }))

      const mergedB = (ub.data ?? []).map(row => ({
        ...row.bean,
        notes:         row.notes,
        is_favorite:   row.is_favorite,
        _relation_id:  row.id,
        _collected_at: row.created_at,
      }))

      let eqData = eq.error ? [] : (eq.data ?? [])
      if (eqData.length === 0) {
        const seeds = DEFAULT_EQUIPMENT_SEED.map(e => ({
          ...e, user_id: userId, created_at: new Date().toISOString(),
        }))
        const { data: inserted } = await supabase.from('equipment').insert(seeds).select()
        eqData = inserted ?? seeds
      }

      // Fetch followed recipes (user collected others' recipes)
      let followedRec = []
      if (frec.data?.length) {
        const ids = frec.data.map(x => x.recipe_id)
        const { data } = await supabase.from('recipes').select('*').in('id', ids)
        followedRec = (data ?? []).map(row => {
          const rel = frec.data.find(x => x.recipe_id === row.id)
          return { ...row, imported: true, is_favorite: rel?.is_favorite ?? false }
        })
      }

      setRoasteries(mergedR)
      setBeans(mergedB)
      setRecipes([...(rec.data ?? []), ...followedRec])
      setEquipment(eqData)
      setSyncStatus('synced')
    } catch {
      setSyncStatus('offline')
    }
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (user) pullAll()
    else setSyncStatus('local')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // ── Roasteries ───────────────────────────────────────────────────────────

  /**
   * addRoastery(data)
   *
   * Two modes:
   *   1. Collect existing:  data = { existing_id, globalData: {...}, notes }
   *   2. Create new:        data = { name, country, city, ..., notes }
   */
  function addRoastery(data) {
    const userId = userRef.current?.id

    if (data.existing_id) {
      // ── Collect an existing global roastery ────────────────────────────
      const globalId = data.existing_id
      if (roasteriesRef.current.some(r => r.id === globalId)) return  // already in collection
      const relId = uid()
      const item = {
        ...(data.globalData ?? {}),
        id: globalId,
        notes:         data.notes ?? '',
        is_favorite:   false,
        _relation_id:  relId,
        _collected_at: now(),
      }
      setRoasteries(prev => [...prev, item])
      if (userId) {
        supabase.from('user_roasteries')
          .insert({ id: relId, user_id: userId, roastery_id: globalId, notes: data.notes ?? '', is_favorite: false })
          .then(({ error }) => { if (error) setRoasteries(prev => prev.filter(r => r._relation_id !== relId)) })
      }
    } else {
      // ── Create new global roastery + collect ───────────────────────────
      const globalId = uid()
      const relId    = uid()
      // eslint-disable-next-line no-unused-vars
      const { notes, existing_id: _ei, globalData: _gd, ...globalFields } = data
      const item = {
        ...globalFields,
        id:            globalId,
        created_by:    userId,
        notes:         notes ?? '',
        is_favorite:   false,
        _relation_id:  relId,
        _collected_at: now(),
        created_at:    now(),
      }
      setRoasteries(prev => [...prev, item])
      if (userId) {
        supabase.from('roasteries')
          .insert(clean({ id: globalId, created_by: userId, ...globalFields }))
          .then(({ error }) => {
            if (error) { setRoasteries(prev => prev.filter(r => r.id !== globalId)); return }
            supabase.from('user_roasteries')
              .insert({ id: relId, user_id: userId, roastery_id: globalId, notes: notes ?? '', is_favorite: false })
              .then(({ error: e2 }) => { if (e2) setRoasteries(prev => prev.filter(r => r.id !== globalId)) })
          })
      }
    }
  }

  function updateRoastery(id, data) {
    setRoasteries(prev => prev.map(r => r.id === id ? { ...r, ...data } : r))
    if (!userRef.current) return
    const item = roasteriesRef.current.find(r => r.id === id)

    const personal = {}, global = {}
    for (const [k, v] of Object.entries(data)) {
      if (PERSONAL_FIELDS.has(k)) personal[k] = v
      else global[k] = v
    }

    if (Object.keys(personal).length && item?._relation_id)
      supabase.from('user_roasteries').update(personal).eq('id', item._relation_id).then()

    if (Object.keys(global).length && item?.created_by === userRef.current.id)
      supabase.from('roasteries').update(clean(global)).eq('id', id).then()
  }

  function deleteRoastery(id) {
    const item = roasteriesRef.current.find(r => r.id === id)
    setRoasteries(prev => prev.filter(r => r.id !== id))
    if (!userRef.current || !item?._relation_id) return
    supabase.from('user_roasteries').delete().eq('id', item._relation_id).then()
  }

  // ── Beans ────────────────────────────────────────────────────────────────

  /**
   * addBean(data)
   *
   * Two modes:
   *   1. Collect existing:  data = { existing_id, globalData: {...}, notes }
   *   2. Create new:        data = { name, roastery_id, origin_country, ..., notes }
   */
  function addBean(data) {
    const userId = userRef.current?.id

    if (data.existing_id) {
      const globalId = data.existing_id
      if (beansRef.current.some(b => b.id === globalId)) return
      const relId = uid()
      const item = {
        ...(data.globalData ?? {}),
        id: globalId,
        notes:         data.notes ?? '',
        is_favorite:   false,
        _relation_id:  relId,
        _collected_at: now(),
      }
      setBeans(prev => [...prev, item])
      if (userId) {
        supabase.from('user_beans')
          .insert({ id: relId, user_id: userId, bean_id: globalId, notes: data.notes ?? '', is_favorite: false })
          .then(({ error }) => { if (error) setBeans(prev => prev.filter(b => b._relation_id !== relId)) })
      }
    } else {
      const globalId = uid()
      const relId    = uid()
      // eslint-disable-next-line no-unused-vars
      const { notes, existing_id: _ei, globalData: _gd, ...globalFields } = data
      const item = {
        ...globalFields,
        id:            globalId,
        created_by:    userId,
        notes:         notes ?? '',
        is_favorite:   false,
        _relation_id:  relId,
        _collected_at: now(),
        created_at:    now(),
      }
      setBeans(prev => [...prev, item])
      if (userId) {
        supabase.from('beans')
          .insert(clean({ id: globalId, created_by: userId, ...globalFields }))
          .then(({ error }) => {
            if (error) { setBeans(prev => prev.filter(b => b.id !== globalId)); return }
            supabase.from('user_beans')
              .insert({ id: relId, user_id: userId, bean_id: globalId, notes: notes ?? '', is_favorite: false })
              .then(({ error: e2 }) => { if (e2) setBeans(prev => prev.filter(b => b.id !== globalId)) })
          })
      }
    }
  }

  function updateBean(id, data) {
    setBeans(prev => prev.map(b => b.id === id ? { ...b, ...data } : b))
    if (!userRef.current) return
    const item = beansRef.current.find(b => b.id === id)

    const personal = {}, global = {}
    for (const [k, v] of Object.entries(data)) {
      if (PERSONAL_FIELDS.has(k)) personal[k] = v
      else global[k] = v
    }

    if (Object.keys(personal).length && item?._relation_id)
      supabase.from('user_beans').update(personal).eq('id', item._relation_id).then()

    if (Object.keys(global).length && item?.created_by === userRef.current.id)
      supabase.from('beans').update(clean(global)).eq('id', id).then()
  }

  function deleteBean(id) {
    const item = beansRef.current.find(b => b.id === id)
    setBeans(prev => prev.filter(b => b.id !== id))
    if (!userRef.current || !item?._relation_id) return
    supabase.from('user_beans').delete().eq('id', item._relation_id).then()
  }

  // ── Recipes ──────────────────────────────────────────────────────────────
  function addRecipe(data) {
    if (data.imported) {
      const id = data.id
      if (!id || recipesRef.current.some(r => r.id === id)) return
      const item = { ...data, created_at: data.created_at ?? now() }
      setRecipes(prev => [...prev, item])
      if (userRef.current)
        supabase.from('followed_recipes')
          .insert({ user_id: userRef.current.id, recipe_id: id, is_favorite: false })
          .then(({ error }) => { if (error) setRecipes(prev => prev.filter(r => r.id !== id)) })
      return
    }
    const item = { ...data, id: uid(), user_id: userRef.current?.id, created_at: now() }
    setRecipes(prev => [...prev, item])
    if (userRef.current)
      supabase.from('recipes').insert(cleanRecipe(item)).then(({ error }) => {
        if (error) setRecipes(prev => prev.filter(r => r.id !== item.id))
      })
  }

  function updateRecipe(id, data) {
    const item = recipesRef.current.find(r => r.id === id)
    setRecipes(prev => prev.map(r => r.id === id ? { ...r, ...data } : r))
    if (!userRef.current) return
    if (item?.imported) {
      if ('is_favorite' in data)
        supabase.from('followed_recipes')
          .update({ is_favorite: data.is_favorite })
          .eq('user_id', userRef.current.id).eq('recipe_id', id).then()
    } else {
      supabase.from('recipes').update(cleanRecipe(data)).eq('id', id).then()
    }
  }

  function deleteRecipe(id) {
    const item = recipesRef.current.find(r => r.id === id)
    setRecipes(prev => prev.filter(r => r.id !== id))
    if (!userRef.current) return
    if (item?.imported) {
      supabase.from('followed_recipes').delete()
        .eq('user_id', userRef.current.id).eq('recipe_id', id).then()
    } else {
      supabase.from('recipes').delete().eq('id', id).then()
    }
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
