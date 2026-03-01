import { useState, useEffect } from 'react'
import Drawer from './Drawer'

export default function AccountDrawer({ open, onClose, user, onUpdateProfile, onUpdatePassword, onSignOut }) {
  const [displayName, setDisplayName] = useState(user?.user_metadata?.display_name ?? '')
  const [profileMsg, setProfileMsg]   = useState(null)
  const [profileSaving, setProfileSaving] = useState(false)

  const [newPassword, setNewPassword]     = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMsg, setPasswordMsg]     = useState(null)
  const [passwordSaving, setPasswordSaving] = useState(false)

  // Reset state whenever the drawer opens
  useEffect(() => {
    if (!open) return
    setDisplayName(user?.user_metadata?.display_name ?? '')
    setProfileMsg(null)
    setPasswordMsg(null)
    setNewPassword('')
    setConfirmPassword('')
  }, [open, user])

  async function saveProfile(e) {
    e.preventDefault()
    setProfileSaving(true)
    setProfileMsg(null)
    try {
      await onUpdateProfile(displayName.trim())
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
