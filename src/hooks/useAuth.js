import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

async function upsertProfile(user) {
  if (!user) return
  await supabase.from('profiles').upsert({
    id: user.id,
    display_name: user.user_metadata?.display_name ?? null,
  }, { onConflict: 'id' })
}

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) upsertProfile(session.user)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) upsertProfile(session.user)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signUp(email, password) {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function updateProfile(displayName) {
    const { error } = await supabase.auth.updateUser({ data: { display_name: displayName } })
    if (error) throw error
    // Also sync to public profiles table
    const { data: { user: updated } } = await supabase.auth.getUser()
    if (updated) upsertProfile(updated)
  }

  async function updatePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
  }

  return { user, loading, signIn, signUp, signOut, updateProfile, updatePassword }
}