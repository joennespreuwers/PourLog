import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import AuthModal from '../components/AuthModal'

export default function LoginPage() {
  const { user, signIn, signUp, resetPassword } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const from      = location.state?.from ?? '/app'

  useEffect(() => {
    if (user) navigate(from, { replace: true })
  }, [user, navigate, from])

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ backgroundColor: 'var(--color-paper)' }}
    >
      <AuthModal
        required
        onSignIn={signIn}
        onSignUp={signUp}
        onResetPassword={resetPassword}
        onClose={() => {}}
      />
    </div>
  )
}
