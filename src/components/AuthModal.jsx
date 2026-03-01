import { useState } from 'react'
import { X } from 'lucide-react'

export default function AuthModal({ onSignIn, onSignUp, onResetPassword, onClose, required = false }) {
  const [mode, setMode]       = useState('signin') // 'signin' | 'signup' | 'reset'
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]     = useState(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false) // signup confirmation
  const [resetDone, setResetDone] = useState(false) // password reset email sent

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (mode === 'signin') {
        await onSignIn(email, password)
        onClose()
      } else if (mode === 'signup') {
        await onSignUp(email, password)
        setDone(true)
      } else {
        await onResetPassword(email)
        setResetDone(true)
      }
    } catch (err) {
      setError(err.message ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(30,17,8,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (!required && e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-7 relative"
        style={{ backgroundColor: 'var(--color-paper)', border: '1px solid var(--color-border)' }}
      >
        {/* Close — hidden when required */}
        {!required && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 flex items-center justify-center w-7 h-7 rounded-md cursor-pointer"
            style={{ color: 'var(--color-stone)' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-cream)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            aria-label="Close"
          >
            <X size={15} />
          </button>
        )}

        {done ? (
          // ── Signup confirmation ──────────────────────────────────────────
          <div className="text-center py-4">
            <p className="font-serif text-xl font-medium mb-2" style={{ color: 'var(--color-espresso)' }}>Check your inbox</p>
            <p className="text-sm" style={{ color: 'var(--color-stone)' }}>
              We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then sign in.
            </p>
            <button
              className="mt-5 text-sm font-medium cursor-pointer"
              style={{ color: 'var(--color-roast)' }}
              onClick={() => { setMode('signin'); setDone(false) }}
            >
              Back to sign in
            </button>
          </div>
        ) : resetDone ? (
          // ── Reset email sent ─────────────────────────────────────────────
          <div className="text-center py-4">
            <p className="font-serif text-xl font-medium mb-2" style={{ color: 'var(--color-espresso)' }}>Check your inbox</p>
            <p className="text-sm" style={{ color: 'var(--color-stone)' }}>
              We sent a password reset link to <strong>{email}</strong>. Click it and you'll be taken straight to the change-password form.
            </p>
            <button
              className="mt-5 text-sm font-medium cursor-pointer"
              style={{ color: 'var(--color-roast)' }}
              onClick={() => { setMode('signin'); setResetDone(false) }}
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <>
            {/* ── Header ──────────────────────────────────────────────── */}
            <p className="font-serif text-xl font-medium mb-1" style={{ color: 'var(--color-espresso)' }}>
              {mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Reset password'}
            </p>
            <p className="text-sm mb-6" style={{ color: 'var(--color-stone)' }}>
              {mode === 'reset' ? 'Enter your email and we\'ll send a reset link.' : required && mode === 'signin' ? 'Sign in to access your journal.' : mode === 'signin' ? 'Welcome back to PourLog.' : 'Start your coffee journal.'}
            </p>

            {/* ── Form ────────────────────────────────────────────────── */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-stone)' }}>Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3 py-2 rounded-md text-sm outline-none"
                  style={{
                    border: '1px solid var(--color-border)',
                    backgroundColor: '#fff',
                    color: 'var(--color-espresso)',
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--color-roast)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
                />
              </div>
              {mode !== 'reset' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium" style={{ color: 'var(--color-stone)' }}>Password</label>
                  {mode === 'signin' && (
                    <button type="button" className="text-xs cursor-pointer" style={{ color: 'var(--color-roast)' }} onClick={() => { setMode('reset'); setError(null) }}>Forgot password?</button>
                  )}
                </div>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-md text-sm outline-none"
                  style={{
                    border: '1px solid var(--color-border)',
                    backgroundColor: '#fff',
                    color: 'var(--color-espresso)',
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--color-roast)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
                />
              </div>
              )}

              {error && (
                <p className="text-xs px-3 py-2 rounded-md" style={{ backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 rounded-md text-sm font-medium cursor-pointer mt-1 disabled:opacity-60"
                style={{ backgroundColor: 'var(--color-espresso)', color: 'var(--color-paper)' }}
              >
                {loading ? '…' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
              </button>
            </form>

            {/* ── Toggle ──────────────────────────────────────────────── */}
            <p className="text-xs text-center mt-4" style={{ color: 'var(--color-stone)' }}>
              {mode === 'reset' ? '' : mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
              <button
                className="font-medium cursor-pointer"
                style={{ color: 'var(--color-roast)' }}
                onClick={() => { setMode(m => m === 'signin' ? 'signup' : 'signin'); setError(null) }}
              >
                {mode === 'signin' ? 'Sign up' : mode === 'signup' ? 'Sign in' : ''}
              </button>
              {mode === 'reset' && (
                <button className="font-medium cursor-pointer" style={{ color: 'var(--color-roast)' }} onClick={() => { setMode('signin'); setError(null) }}>Back to sign in</button>
              )}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
