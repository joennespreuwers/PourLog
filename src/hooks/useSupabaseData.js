import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useLocalStorage } from './useLocalStorage'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function now() { return new Date().toISOString() }
function uid()  { return crypto.randomUUID() }

// Strip undefined; convert empty strings to null so Postgres typed columns (date, int, numeric) don't reject them
function clean(obj) {
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, v === '' ? null : v])
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Local-first data layer backed by Supabase.
 * - Reads localStorage immediately on mount (instant UI)
 * - Fetches Supabase in the background and updates localStorage
 * - Writes hit localStorage first (optimistically), then Supabase if authed
 * - First-time migration: if user is authed, Supabase is empty, and localStorage
 *   has data — auto-pushes all local data to Supabase
 *
 * Equipment is deliberately excluded from Supabase (stays localStorage-only).
 */
export function useSupabaseData(user) {
  const [roasteries, setRoasteries] = useLocalStorage('pourlog_roasteries', [])
  const [beans,      setBeans]      = useLocalStorage('pourlog_beans',      [])
  const [recipes,    setRecipes]    = useLocalStorage('pourlog_recipes',    [])

  // Keep stable refs for the auto-migration check (avoids stale closures)
  const rosteriesRef = useRef(roasteries)
  const beansRef     = useRef(beans)
  const recipesRef   = useRef(recipes)
  useEffect(() => { rosteriesRef.current = roasteries }, [roasteries])
  useEffect(() => { beansRef.current = beans }, [beans])
  useEffect(() => { recipesRef.current = recipes }, [recipes])

  const [syncStatus, setSyncStatus] = useState('local')
  const userRef = useRef(user)
  useEffect(() => { userRef.current = user }, [user])

  // ── Pull all data from Supabase ────────────────────────────────────────────
  const pullAll = useCallback(async () => {
    setSyncStatus('syncing')
    try {
      const [r, b, rec] = await Promise.all([
        supabase.from('roasteries').select('*').order('created_at', { ascending: true }),
        supabase.from('beans').select('*').order('created_at', { ascending: true }),
        supabase.from('recipes').select('*').order('created_at', { ascending: true }),
      ])

      if (r.error || b.error || rec.error) throw new Error('fetch failed')

      const supabaseIsEmpty = r.data.length === 0 && b.data.length === 0 && rec.data.length === 0
      const localHasData    = rosteriesRef.current.length > 0 || beansRef.current.length > 0 || recipesRef.current.length > 0

      if (supabaseIsEmpty && userRef.current && localHasData) {
        // ── First-time migration: push localStorage data to Supabase ──
        const inserts = []
        if (rosteriesRef.current.length) inserts.push(supabase.from('roasteries').insert(rosteriesRef.current.map(clean)))
        if (beansRef.current.length)     inserts.push(supabase.from('beans').insert(beansRef.current.map(clean)))
        if (recipesRef.current.length)   inserts.push(supabase.from('recipes').insert(recipesRef.current.map(clean)))
        await Promise.all(inserts)
        setSyncStatus('synced')
      } else if (!supabaseIsEmpty) {
        // ── Normal: Supabase is the source of truth, update local cache ──
        setRoasteries(r.data)
        setBeans(b.data)
        setRecipes(rec.data)
        setSyncStatus('synced')
      } else {
        // Supabase empty, not authed, or no local data — keep what we have
        setSyncStatus('synced')
      }
    } catch {
      setSyncStatus('error')
    }
  }, [setRoasteries, setBeans, setRecipes])

  // Pull on mount
  useEffect(() => { pullAll() }, [pullAll])

  // ── Fire-and-forget Supabase mutation (if authenticated) ──────────────────
  function sbInsert(table, item) {
    if (userRef.current) supabase.from(table).insert(clean(item)).then()
  }
  function sbUpdate(table, id, data) {
    if (userRef.current) supabase.from(table).update(clean(data)).eq('id', id).then()
  }
  function sbDelete(table, id) {
    if (userRef.current) supabase.from(table).delete().eq('id', id).then()
  }

  // ── Roasteries ─────────────────────────────────────────────────────────────
  function addRoastery(data) {
    const item = { ...data, id: uid(), created_at: now() }
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
    const item = { ...data, id: uid(), created_at: now() }
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
    const item = { ...data, id: uid(), created_at: now() }
    setRecipes(prev => [...prev, item])
    sbInsert('recipes', item)
  }
  function updateRecipe(id, data) {
    setRecipes(prev => prev.map(r => r.id === id ? { ...r, ...data } : r))
    sbUpdate('recipes', id, data)
  }
  function deleteRecipe(id) {
    setRecipes(prev => prev.filter(r => r.id !== id))
    sbDelete('recipes', id)
  }

  return {
    roasteries, addRoastery, updateRoastery, deleteRoastery,
    beans,      addBean,      updateBean,      deleteBean,
    recipes,    addRecipe,    updateRecipe,    deleteRecipe,
    syncStatus, pullAll,
  }
}
