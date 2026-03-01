import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import Drawer from './Drawer'
import { Copy, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'

const SLUG_RE = /^[a-z0-9_-]{3,32}$/

export default function AccountDrawer({ open, onClose, user, onUpdateProfile, onUpdatePassword, onSignOut, syncEnabled, onToggleSync }) {
  const [displayName, setDisplayName] = useState(user?.user_metadata?.display_name ?? '')
  const [profileMsg, setProfileMsg]   = useState(null)
  const [profileSaving, setProfileSaving] = useState(false)
  const [copiedProfile, setCopiedProfile] = useState(false)

  // Slug
  const [slug, setSlug]           = useState('')
  const [slugStatus, setSlugStatus] = useState(null) // null | 'checking' | 'available' | 'taken' | 'invalid'
  const slugDebounce              = useRef(null)
  const currentSlug               = useRef('')  // slug as loaded from DB (to skip self-check)

  const profileUrl = slug
    ? `${window.location.origin}/u/${slug}`
    : `${window.location.origin}/u/${user?.id}`

  const [newPassword, setNewPassword]     = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMsg, setPasswordMsg]     = useState(null)
  const [passwordSaving, setPasswordSaving] = useState(false)

  // Reset state + load current slug whenever the drawer opens
  useEffect(() => {
    if (!open) return
    setDisplayName(user?.user_metadata?.display_name ?? '')
    setProfileMsg(null)
    setPasswordMsg(null)
    setNewPassword('')
    setConfirmPassword('')
    // Load slug from profiles table
    if (user?.id) {
      supabase.from('profiles').select('slug').eq('id', user.id).single()
        .then(({ data }) => {
          const s = data?.slug ?? ''
          setSlug(s)
          currentSlug.current = s
          setSlugStatus(null)
        })
    }
  }, [open, user])

  function onSlugChange(val) {
    const v = val.toLowerCase().replace(/[^a-z0-9_-]/g, '')
    setSlug(v)
    clearTimeout(slugDebounce.current)
    if (v === '') { setSlugStatus(null); return }
    if (!SLUG_RE.test(v)) { setSlugStatus('invalid'); return }
    if (v === currentSlug.current) { setSlugStatus('available'); return }
    setSlugStatus('checking')
    slugDebounce.current = setTimeout(async () => {
      const { data } = await supabase.from('profiles').select('id').eq('slug', v).maybeSingle()
      setSlugStatus(data ? 'taken' : 'available')
    }, 400)
  }

  async function saveProfile(e) {
    e.preventDefault()
    if (slugStatus === 'taken') { setProfileMsg({ ok: false, text: 'That username is already taken.' }); return }
    if (slugStatus === 'invalid') { setProfileMsg({ ok: false, text: 'Username must be 3–32 lowercase letters, numbers, - or _.' }); return }
    setProfileSaving(true)
    setProfileMsg(null)
    try {
      await onUpdateProfile(displayName.trim())
      // Save slug to profiles table
      const newSlug = slug.trim() || null
      await supabase.from('profiles').upsert({ id: user.id, slug: newSlug }, { onConflict: 'id' })
      currentSlug.current = newSlug ?? ''
      setProfileMsg({ ok: true, text: 'Saved.' })
    } catch (err) {
      setProfileMsg({ ok: false, text: err.message ?? 'Failed to save.' })
    } finally {
      setProfileSaving(false)
    }
  }

  async function savePassword(e) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ ok: false, text: 'Passwords do not match.' })
      return
    }
    setPasswordSaving(true)
    setPasswordMsg(null)
    try {
      await onUpdatePassword(newPassword)
      setPasswordMsg({ ok: true, text: 'Password updated.' })
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPasswordMsg({ ok: false, text: err.message ?? 'Failed to update password.' })
    } finally {
      setPasswordSaving(false)
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title="Account">
      <div className="flex flex-col gap-8">

        {/* ── My profile ─────────────────────────────────────── */}
        <section className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-stone)' }}>My profile</p>
          <div className="flex items-center gap-2">
            <Link
              to={slug ? `/u/${slug}` : `/u/${user?.id}`}
              onClick={onClose}
              className="flex-1 text-xs truncate"
              style={{ color: 'var(--color-roast)' }}
            >
              {profileUrl}
            </Link>
            <button
              onClick={() => { navigator.clipboard.writeText(profileUrl).then(() => { setCopiedProfile(true); setTimeout(() => setCopiedProfile(false), 2000) }) }}
              className="shrink-0 px-2.5 py-1.5 rounded-md text-xs font-medium cursor-pointer flex items-center gap-1"
              style={{ border: '1px solid var(--color-border)', backgroundColor: '#fff', color: 'var(--color-stone)' }}
            >
              {copiedProfile ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
            </button>
          </div>
        </section>

        <div style={{ borderTop: '1px solid var(--color-border)' }} />

        {/* ── Profile ─────────────────────────────────────────── */}
        <section className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-stone)' }}>Profile</p>

          <form onSubmit={saveProfile} className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-stone)' }}>Display name</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="w-full px-3 py-2 rounded-md text-sm outline-none"
                style={{ border: '1px solid var(--color-border)', backgroundColor: '#fff', color: 'var(--color-espresso)' }}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--color-roast)'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-stone)' }}>
                Username <span style={{ color: 'var(--color-stone)', fontWeight: 400 }}>— sets your profile URL</span>
              </label>
              <div className="relative">
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-sm select-none pointer-events-none"
                  style={{ color: 'var(--color-stone)' }}
                >@</span>
                <input
                  type="text"
                  value={slug}
                  onChange={e => onSlugChange(e.target.value)}
                  placeholder="yourname"
                  maxLength={32}
                  className="w-full pl-7 pr-3 py-2 rounded-md text-sm outline-none"
                  style={{
                    border: `1px solid ${slugStatus === 'taken' || slugStatus === 'invalid' ? '#fca5a5' : slugStatus === 'available' ? '#86efac' : 'var(--color-border)'}`,
                    backgroundColor: '#fff',
                    color: 'var(--color-espresso)',
                  }}
                />
              </div>
              {slugStatus === 'checking' && <p className="text-xs mt-1" style={{ color: 'var(--color-stone)' }}>Checking…</p>}
              {slugStatus === 'available' && <p className="text-xs mt-1" style={{ color: '#166534' }}>✓ Available</p>}
              {slugStatus === 'taken' && <p className="text-xs mt-1" style={{ color: '#991b1b' }}>Already taken</p>}
              {slugStatus === 'invalid' && <p className="text-xs mt-1" style={{ color: '#991b1b' }}>3–32 chars: letters, numbers, - or _</p>}
              {!slug && <p className="text-xs mt-1" style={{ color: 'var(--color-stone)' }}>Leave empty to use your user ID</p>}
            </div>

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-stone)' }}>Email</label>
              <input
                type="email"
                value={user?.email ?? ''}
                disabled
                className="w-full px-3 py-2 rounded-md text-sm"
                style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-cream)', color: 'var(--color-stone)', cursor: 'default' }}
              />
            </div>

            {profileMsg && (
              <p className="text-xs px-3 py-2 rounded-md"
                style={{ backgroundColor: profileMsg.ok ? '#f0fdf4' : '#fef2f2', color: profileMsg.ok ? '#166534' : '#991b1b', border: `1px solid ${profileMsg.ok ? '#bbf7d0' : '#fecaca'}` }}>
                {profileMsg.text}
              </p>
            )}

            <button
              type="submit"
              disabled={profileSaving}
              className="self-start px-4 py-2 rounded-md text-sm font-medium cursor-pointer disabled:opacity-60"
              style={{ backgroundColor: 'var(--color-espresso)', color: 'var(--color-paper)' }}
            >
              {profileSaving ? 'Saving…' : 'Save profile'}
            </button>
          </form>
        </section>

        <div style={{ borderTop: '1px solid var(--color-border)' }} />

        {/* ── Change password ──────────────────────────────────── */}
        <section className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-stone)' }}>Change password</p>

          <form onSubmit={savePassword} className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-stone)' }}>New password</label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded-md text-sm outline-none"
                style={{ border: '1px solid var(--color-border)', backgroundColor: '#fff', color: 'var(--color-espresso)' }}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--color-roast)'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-stone)' }}>Confirm password</label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded-md text-sm outline-none"
                style={{ border: '1px solid var(--color-border)', backgroundColor: '#fff', color: 'var(--color-espresso)' }}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--color-roast)'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
              />
            </div>

            {passwordMsg && (
              <p className="text-xs px-3 py-2 rounded-md"
                style={{ backgroundColor: passwordMsg.ok ? '#f0fdf4' : '#fef2f2', color: passwordMsg.ok ? '#166534' : '#991b1b', border: `1px solid ${passwordMsg.ok ? '#bbf7d0' : '#fecaca'}` }}>
                {passwordMsg.text}
              </p>
            )}

            <button
              type="submit"
              disabled={passwordSaving}
              className="self-start px-4 py-2 rounded-md text-sm font-medium cursor-pointer disabled:opacity-60"
              style={{ backgroundColor: 'var(--color-espresso)', color: 'var(--color-paper)' }}
            >
              {passwordSaving ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </section>

        <div style={{ borderTop: '1px solid var(--color-border)' }} />

        {/* ── Sync ─────────────────────────────────────────────── */}
        <section className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-stone)' }}>Cloud sync</p>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--color-espresso)' }}>
                {syncEnabled ? 'Sync enabled' : 'Sync disabled'}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-stone)' }}>
                {syncEnabled ? 'Changes are saved to the cloud.' : 'All changes stay local only.'}
              </p>
            </div>
            {/* Pill toggle */}
            <button
              type="button"
              onClick={onToggleSync}
              role="switch"
              aria-checked={syncEnabled}
              className="relative shrink-0 w-11 h-6 rounded-full cursor-pointer transition-colors"
              style={{ backgroundColor: syncEnabled ? 'var(--color-roast)' : 'var(--color-border)' }}
            >
              <span
                className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                style={{ transform: syncEnabled ? 'translateX(20px)' : 'translateX(0)' }}
              />
            </button>
          </div>
        </section>

        <div style={{ borderTop: '1px solid var(--color-border)' }} />

        {/* ── Sign out ─────────────────────────────────────────── */}
        <section>
          <button
            onClick={() => { onSignOut(); onClose() }}
            className="px-4 py-2 rounded-md text-sm font-medium cursor-pointer"
            style={{ border: '1px solid #fecaca', color: '#991b1b', backgroundColor: '#fff' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fef2f2'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#fff'}
          >
            Sign out
          </button>
        </section>

      </div>
    </Drawer>
  )
}
