import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button'
import { useAuth } from '../context/AuthContext'

/** Authenticates credentials and displays backend validation or account failures. */
export default function LoginPage() {
  console.debug('[Login] Rendering login form')
  const { user, loading, error: sessionError, signIn } = useAuth()
  const navigate = useNavigate()
  const { state } = useLocation()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  /** Toggles password visibility so the user can check the entered credentials. */
  function togglePasswordVisibility() {
    console.debug('[Login] Toggling password visibility')
    setShowPassword((visible) => !visible)
  }
  /** Submits credentials and resumes the originally requested protected screen. */
  async function handleSubmit(event) {
    event.preventDefault()
    if (busy) return
    console.info('[Login] Submitting credentials')
    setBusy(true)
    setError('')
    const form = new FormData(event.currentTarget)
    try {
      await signIn({
        email: form.get('email').trim(),
        password: form.get('password'),
      })
      navigate(state?.returnTo || '/dashboard', { replace: true })
    } catch (failure) {
      console.warn('[Login] Authentication failed')
      setError(failure.message)
    } finally {
      setBusy(false)
    }
  }
  if (loading)
    return (
      <p role="status" className="p-8">
        Đang xác thực...
      </p>
    )
  if (user) return <Navigate to="/dashboard" replace />
  return (
    <main className="flex min-h-dvh items-start justify-center bg-sidebar px-5 pb-16 pt-[clamp(64px,13vh,140px)]">
      <section className="w-full max-w-[400px] rounded-md border border-slate-200 bg-white p-10 shadow-xl">
        <h1 className="text-xl font-bold">Involens</h1>
        <p className="mt-2 text-xs text-slate-500">
          Đăng nhập để tiếp tục xử lý tài liệu
        </p>
        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <label className="block text-xs text-slate-500">
            Email
            <input
              name="email"
              type="email"
              autoComplete="username"
              required
              className="mt-2 h-10 w-full rounded border border-slate-200 px-3 text-slate-800"
            />
          </label>
          <div>
            <label htmlFor="password" className="block text-xs text-slate-500">
              Mật khẩu
            </label>
            <div className="relative mt-2">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                className="h-10 w-full rounded border border-slate-200 pl-3 pr-11 text-slate-800"
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                aria-pressed={showPassword}
                className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded text-slate-500 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
              >
                {showPassword ? (
                  <EyeOff size={18} aria-hidden="true" />
                ) : (
                  <Eye size={18} aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
          {(error || sessionError) && (
            <p role="alert" className="text-xs text-red-600">
              {error || sessionError}
            </p>
          )}
          <Button type="submit" disabled={busy} className="h-10 w-full">
            {busy ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </Button>
        </form>
      </section>
    </main>
  )
}
