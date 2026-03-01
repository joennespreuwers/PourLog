import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useLocalStorage } from './useLocalStorage'

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

// Preserve local-only fields when Supabase data overwrites localStorage
function mergeExtras(sbData, localData, extraKeys) {
  const localMap = Object.fromEntries(localData.map(item => [item.id, item]))
  return sbData.map(sbItem => {
    const local = localMap[sbItem.id]
    if (!local) return sbItem
    const extras = {}
    for (const k of extraKeys) {
      if (local[k] !== undefined) extras[k] = local[k]
    }
    return { ...sbItem, ...extras }
  })
}

// Default equipment — IDs prefixed 'default-' so Supabase writes are skipped for them
export const DEFAULT_EQUIPMENT = [
  { id: 'default-v60',        name: 'Hario V60',        category: 'brewer',       brand: 'Hario',     notes: '', created_at: '' },
  { id: 'default-aeropress',  name: 'Aeropress',        category: 'brewer',       brand: 'Aeropress', notes: '', created_at: '' },
  { id: 'default-chemex',     name: 'Chemex',           category: 'brewer',       brand: 'Chemex',    notes: '', created_at: '' },
  { id: 'default-moka',       name: 'Moka Pot',         category: 'brewer',       brand: 'Bialetti',  notes: '', created_at: '' },
  { id: 'default-frenchpress',name: 'French Press',     category: 'brewer',       brand: '',          notes: '', created_at: '' },
  { id: 'default-espresso',   name: 'Espresso Machine', category: 'brewer',       brand: '',          notes: '', created_at: '' },
  { id: 'default-kalita',     name: 'Kalita Wave',      category: 'brewer',       brand: 'Kalita',    notes: '', created_at: '' },
  { id: 'default-clever',     name: 'Clever Dripper',   category: 'brewer',       brand: 'Clever',    notes: '', created_at: '' },
  { id: 'default-v60paper',   name: 'Hario V60 Paper',  category: 'filter_paper', brand: 'Hario',     notes: '', created_at: '' },
  { id: 'default-aropaper',   name: 'Aeropress Paper',  category: 'filter_paper', brand: 'Aeropress', notes: '', created_at: '' },
  { id: 'default-chemexpaper',name: 'Chemex Filter',    category: 'filter_paper', brand: 'Chemex',    notes: '', created_at: '' },
]

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Local-first data layer backed by Supabase.
 * - Reads localStorage immediately on mount (instant UI)
 * - Fetches Supabase in the background and updates localStorage
 * - Writes hit localStorage first (optimistically), then Supabase if authed
 * - First-time migration: if user is authed, Supabase is empty, and localStorage
 *   has data — auto-pushes all local data to Supabase
 * - Equipment is now synced to Supabase (default-* items are excluded from write ops)
 */
export function useSupabaseData(user) {
  const [roasteries, setRoasteries] = useLocalStorage('pourlog_roasteries', [])
  const [beans,      setBeans]      = useLocalStorage('pourlog_beans',      [])
  const [recipes,    setRecipes]    = useLocalStorage('pourlog_recipes',    [])
  const [equipment,  setEquipment]  = useLocalStorage('pourlog_equipment',  DEFAULT_EQUIPMENT)
  const [syncEnabled, setSyncEnabled] = useLocalStorage('pourlog_sync_enabled', true)

  // Keep stable refs (avoids stale closures in callbacks)
  const rosteriesRef  = useRef(roasteries)
  const beansRef      = useRef(beans)
  const recipesRef    = useRef(recipes)
  const equipmentRef  = useRef(equipment)
  useEffect(() => { rosteriesRef.current  = roasteries }, [roasteries])
  useEffect(() => { beansRef.current      = beans },      [beans])
  useEffect(() => { recipesRef.current    = recipes },    [recipes])
  useEffect(() => { equipmentRef.current  = equipment },  [equipment])

  const [syncStatus, setSyncStatus] = useState('local')
  const userRef         = useRef(user)
  const syncEnabledRef  = useRef(syncEnabled)
  useEffect(() => { userRef.current        = user },        [user])
  useEffect(() => { syncEnabledRef.current = syncEnabled }, [syncEnabled])

  // ── Pull all data from Supabase ────────────────────────────────────────────
  // Refresh imported items from Supabase (public read — works without auth)
  const refreshImported = useCallback(async () => {
    const importedRoasteries = rosteriesRef.current.filter(r => r.imported)
    const importedBeans      = beansRef.current.filter(b => b.imported)
    if (!importedRoasteries.length && !importedBeans.length) return
    const fetches = []
    if (importedRoasteries.length) {
      fetches.push(
        supabase.from('roasteries').select('*').in('id', importedRoasteries.map(r => r.id))
          .then(({ data }) => {
            if (!data?.length) return
            const fresh = data.map(row => {
              const local = importedRoasteries.find(r => r.id === row.id)
              return { ...row, imported: true, rating: local?.rating, notes: local?.notes }
            })
            setRoasteries(prev => [...prev.filter(r => !r.imported), ...fresh])
          })
      )
    }
    if (importedBeans.length) {
      fetches.push(
        supabase.from('beans').select('*').in('id', importedBeans.map(b => b.id))
          .then(({ data }) => {
            if (!data?.length) return
            const fresh = data.map(row => {
              const local = importedBeans.find(b => b.id === row.id)
              return { ...row, imported: true, rating: local?.rating, notes: local?.notes }
            })
            setBeans(prev => [...prev.filter(b => !b.imported), ...fresh])
          })
      )
    }
    await Promise.all(fetches)
  }, [setRoasteries, setBeans])

  const pullAll = useCallback(async () => {
    // Always refresh imported items — they're public reads and the owner may have changed them
    await refreshImported()
    if (!syncEnabledRef.current) { setSyncStatus('disabled'); return }
    if (!userRef.current) { setSyncStatus('local'); return } // not signed in — localStorage only
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

      // Equipment table may not exist yet in Supabase — degrade gracefully
      const eqData = eq.error ? [] : (eq.data ?? [])

      const supabaseIsEmpty = r.data.length === 0 && b.data.length === 0 && rec.data.length === 0
      // Exclude imported items from migration check — they can't be inserted (PK belongs to owner)
      const ownRoasteries = rosteriesRef.current.filter(r => !r.imported)
      const ownBeans      = beansRef.current.filter(b => !b.imported)
      const localHasData  = ownRoasteries.length > 0 || ownBeans.length > 0 || recipesRef.current.length > 0

      if (supabaseIsEmpty && userRef.current && localHasData) {
        // ── First-time migration: push localStorage data to Supabase ──
        const withUid = item => ({ ...item, user_id: uid })
        const inserts = []
        if (ownRoasteries.length) inserts.push(supabase.from('roasteries').insert(ownRoasteries.map(r => clean(withUid(r)))))
        if (ownBeans.length)      inserts.push(supabase.from('beans').insert(ownBeans.map(b => clean(withUid(b)))))
        if (recipesRef.current.length) inserts.push(supabase.from('recipes').insert(recipesRef.current.map(r => cleanRecipe(withUid(r)))))
        const userEq = equipmentRef.current.filter(e => !e.id?.startsWith('default-'))
        if (userEq.length)        inserts.push(supabase.from('equipment').insert(userEq.map(e => clean(withUid(e)))))
        await Promise.all(inserts)
        setSyncStatus('synced')
      } else if (!supabaseIsEmpty) {
        // ── Normal: Supabase is source of truth ──
        const LOCAL_RECIPE_EXTRAS = ['brewer_id', 'filter_id', 'grinder_id', 'time_m', 'time_s']
        const mergedRoasteries = mergeExtras(r.data,   rosteriesRef.current, ['imported'])
        const mergedBeans      = mergeExtras(b.data,   beansRef.current,     ['imported'])
        const mergedRecipes    = mergeExtras(rec.data, recipesRef.current,   LOCAL_RECIPE_EXTRAS)

        // Refresh imported items: re-fetch originals from Supabase so owner edits stay live
        const importedRoasteries = rosteriesRef.current.filter(r => r.imported)
        const importedBeans      = beansRef.current.filter(b => b.imported)
        let freshImportedR = importedRoasteries
        let freshImportedB = importedBeans
        const fetchImported = []
        if (importedRoasteries.length) {
          fetchImported.push(
            supabase.from('roasteries').select('*').in('id', importedRoasteries.map(r => r.id))
              .then(({ data }) => {
                if (data?.length) freshImportedR = data.map(fresh => {
                  const local = importedRoasteries.find(r => r.id === fresh.id)
                  return { ...fresh, imported: true, rating: local?.rating, notes: local?.notes }
                })
              })
          )
        }
        if (importedBeans.length) {
          fetchImported.push(
            supabase.from('beans').select('*').in('id', importedBeans.map(b => b.id))
              .then(({ data }) => {
                if (data?.length) freshImportedB = data.map(fresh => {
                  const local = importedBeans.find(b => b.id === fresh.id)
                  return { ...fresh, imported: true, rating: local?.rating, notes: local?.notes }
                })
              })
          )
        }
        if (fetchImported.length) await Promise.all(fetchImported)

        setRoasteries([...mergedRoasteries, ...freshImportedR])
        setBeans([...mergedBeans, ...freshImportedB])
        setRecipes(mergedRecipes)
        // Equipment: if Supabase has rows use them; otherwise push local to Supabase
        if (eqData.length > 0) {
          const defaultIds = new Set(DEFAULT_EQUIPMENT.map(e => e.id))
          setEquipment([...DEFAULT_EQUIPMENT, ...eqData.filter(e => !defaultIds.has(e.id))])
        } else {
          // Supabase has no equipment yet — migrate local user items
          const userEq = equipmentRef.current.filter(e => !e.id?.startsWith('default-'))
          if (userEq.length && syncEnabledRef.current) {
            supabase.from('equipment').upsert(userEq.map(e => clean({ ...e, user_id: uid })), { onConflict: 'id' }).then()
          }
          // Keep local equipment as-is (don't overwrite with just defaults)
        }
        setSyncStatus('synced')
      } else {
        // Supabase empty + no own local data — keep localStorage as-is
        setSyncStatus('synced')
      }
    } catch {
      setSyncStatus('error')
    }
  }, [setRoasteries, setBeans, setRecipes, setEquipment])

  // Pull on mount
  useEffect(() => { pullAll() }, [pullAll])

  // Re-enable sync: push all local first (so offline additions aren't lost), then pull
  // Disable sync: just update status
  const syncEnabledMounted = useRef(false)
  useEffect(() => {
    if (!syncEnabledMounted.current) { syncEnabledMounted.current = true; return }
    if (!syncEnabled) { setSyncStatus('disabled'); return }

    const pushThenPull = async () => {
      if (!userRef.current) { await pullAll(); return }
      setSyncStatus('syncing')
      try {
        const withUid = item => ({ ...item, user_id: userRef.current.id })
        const ups = []
        if (rosteriesRef.current.length) ups.push(supabase.from('roasteries').upsert(rosteriesRef.current.map(r => clean(withUid(r))), { onConflict: 'id' }))
        if (beansRef.current.length)     ups.push(supabase.from('beans').upsert(beansRef.current.map(b => clean(withUid(b))), { onConflict: 'id' }))
        if (recipesRef.current.length)   ups.push(supabase.from('recipes').upsert(recipesRef.current.map(r => cleanRecipe(withUid(r))), { onConflict: 'id' }))
        const userEq = equipmentRef.current.filter(e => !e.id?.startsWith('default-'))
        if (userEq.length)               ups.push(supabase.from('equipment').upsert(userEq.map(e => clean(withUid(e))), { onConflict: 'id' }))
        await Promise.all(ups)
      } catch { /* non-fatal — pullAll still runs */ }
      await pullAll()
    }
    pushThenPull()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncEnabled])

  // ── Fire-and-forget Supabase mutations (if authenticated + sync on) ────────
  function sbInsert(table, item) {
    if (userRef.current && syncEnabledRef.current) supabase.from(table).insert(clean(item)).then()
  }
  function sbUpdate(table, id, data) {
    if (userRef.current && syncEnabledRef.current) supabase.from(table).update(clean(data)).eq('id', id).then()
  }
  function sbDelete(table, id) {
    if (userRef.current && syncEnabledRef.current) supabase.from(table).delete().eq('id', id).then()
  }

  // ── Roasteries ─────────────────────────────────────────────────────────────
  function addRoastery(data) {
    const id = data.id ?? uid()
    if (rosteriesRef.current.some(r => r.id === id)) return // dedup: already linked
    const item = { ...data, id, user_id: userRef.current?.id, created_at: data.created_at ?? now() }
    setRoasteries(prev => [...prev, item])
    sbInsert('roasteries', item)
  }
  function updateRoastery(id, data) {
    setRoasteries(prev => prev.map(r => r.id === id ? { ...r, ...data } : r))
    sbUpdate('roasteries', id, data)
  }
  function deleteRoastery(id) {
    setRoasteries(prev => prev.filter(r => r.id !== id))
    sbDelete('roasteries', id)
  }

  // ── Beans ──────────────────────────────────────────────────────────────────
  function addBean(data) {
    const id = data.id ?? uid()
    if (beansRef.current.some(b => b.id === id)) return // dedup: already linked
    const item = { ...data, id, user_id: userRef.current?.id, created_at: data.created_at ?? now() }
    setBeans(prev => [...prev, item])
    sbInsert('beans', item)
  }
  function updateBean(id, data) {
    setBeans(prev => prev.map(b => b.id === id ? { ...b, ...data } : b))
    sbUpdate('beans', id, data)
  }
  function deleteBean(id) {
    setBeans(prev => prev.filter(b => b.id !== id))
    sbDelete('beans', id)
  }

  // ── Recipes ────────────────────────────────────────────────────────────────
  function addRecipe(data) {
    const item = { ...data, id: uid(), user_id: userRef.current?.id, created_at: now() }
    setRecipes(prev => [...prev, item])
    if (userRef.current && syncEnabledRef.current) supabase.from('recipes').insert(cleanRecipe(item)).then()
  }
  function updateRecipe(id, data) {
    setRecipes(prev => prev.map(r => r.id === id ? { ...r, ...data } : r))
    if (userRef.current && syncEnabledRef.current) supabase.from('recipes').update(cleanRecipe(data)).eq('id', id).then()
  }
  function deleteRecipe(id) {
    setRecipes(prev => prev.filter(r => r.id !== id))
    sbDelete('recipes', id)
  }

  // ── Equipment ──────────────────────────────────────────────────────────────
  function addEquipment(data) {
    const item = { ...data, id: uid(), user_id: userRef.current?.id, created_at: now() }
    setEquipment(prev => [...prev, item])
    if (!item.id.startsWith('default-')) sbInsert('equipment', item)
  }
  function updateEquipment(id, data) {
    setEquipment(prev => prev.map(e => e.id === id ? { ...e, ...data } : e))
    if (!id.startsWith('default-')) sbUpdate('equipment', id, data)
  }
  function deleteEquipment(id) {
    setEquipment(prev => prev.filter(e => e.id !== id))
    if (!id.startsWith('default-')) sbDelete('equipment', id)
  }

  return {
    roasteries, addRoastery, updateRoastery, deleteRoastery,
    beans,      addBean,      updateBean,      deleteBean,
    recipes,    addRecipe,    updateRecipe,    deleteRecipe,
    equipment,  addEquipment, updateEquipment, deleteEquipment,
    syncStatus, syncEnabled, setSyncEnabled, pullAll,
  }
}

