import { useEffect, useState } from 'react'
import { ArrowLeft, CircleCheck, X } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import { createAccount } from '../api/auth'
import { useAuth } from '../context/AuthContext'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'

/** Checks the existing account password requirements locally without contacting the backend. */
function isPasswordValid(password) {
  const special = `!@#$%^&*()_+-=[]{};':"\\|,.<>/?`
  const valid =
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    !/\s/.test(password) &&
    [...password].some((character) => special.includes(character))
  console.debug('[Accounts] Password validation completed', { valid })
  return valid
}

/** Allows managers to create employee or manager accounts with backend password rules. */
export default function CreateAccountPage() {
  console.debug('[Accounts] Rendering manager account creation')
  const { user } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [passwordInvalid, setPasswordInvalid] = useState(false)
  /** Updates inline password feedback as the manager types, keeping empty input feedback hidden. */
  function handlePasswordChange(event) {
    const password = event.target.value
    console.debug('[Accounts] Updating inline password validation')
    setPasswordInvalid(password.length > 0 && !isPasswordValid(password))
  }
  /** Hides account creation feedback after three seconds and cancels pending dismissal on cleanup. */
  useEffect(() => {
    if (!notice) return
    console.debug('[Accounts] Scheduling success notification dismissal')
    const timeout = window.setTimeout(() => {
      console.debug('[Accounts] Success notification automatically dismissed')
      setNotice('')
    }, 3000)
    return () => window.clearTimeout(timeout)
  }, [notice])
  /** Lets the manager immediately dismiss account creation confirmation. */
  function dismissNotice() {
    console.debug('[Accounts] Success notification dismissed by manager')
    setNotice('')
  }
  /** Validates account fields and creates the requested backend identity. */
  async function handleSubmit(event) {
    event.preventDefault()
    if (busy) return
    console.info('[Accounts] Starting account creation')
    const form = event.currentTarget
    const values = new FormData(form)
    const body = {
      email: values.get('email').trim(),
      fullName: values.get('fullName').trim(),
      password: values.get('password'),
      role: values.get('role'),
    }
    setError('')
    setNotice('')
    if (
      !body.fullName ||
      !body.email ||
      !isPasswordValid(body.password)
    ) {
      console.warn('[Accounts] Account validation failed')
      setError(
        'Điền đầy đủ thông tin. Mật khẩu cần ít nhất 8 ký tự, có chữ hoa, ký tự đặc biệt và không chứa khoảng trắng.',
      )
      return
    }
    setBusy(true)
    try {
      const account = await createAccount(body)
      setNotice('Đã tạo tài khoản ' + account.email + '.')
      form.reset()
      setPasswordInvalid(false)
      console.info('[Accounts] Account creation completed')
    } catch (failure) {
      setError(failure.message)
    } finally {
      setBusy(false)
    }
  }
  if (user?.role !== 'MANAGER') return <Navigate to="/dashboard" replace />
  return (
    <>
      <PageHeader
        title="Tạo tài khoản"
        description="Tạo tài khoản cho nhân viên hoặc quản lý"
        action={
          <Link
            to="/accounts"
            className="ml-auto inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-brand bg-white px-4 py-2 text-xs font-semibold text-brand transition-colors hover:bg-emerald-50"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Quay lại quản lý tài khoản
          </Link>
        }
      />
      {notice && (
        <div
          role="status"
          className="fixed right-4 top-4 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-lg"
        >
          <CircleCheck size={20} className="shrink-0" aria-hidden="true" />
          <p className="min-w-0 break-words">{notice}</p>
          <button
            type="button"
            onClick={dismissNotice}
            aria-label="Đóng thông báo"
            className="shrink-0 rounded p-1 hover:bg-emerald-100"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      )}
      <form
        onSubmit={handleSubmit}
        className="max-w-xl space-y-4 rounded-md border border-slate-200 bg-white p-6"
      >
        <label className="block text-xs">
          Họ tên
          <input
            name="fullName"
            required
            className="mt-2 h-10 w-full rounded border border-slate-200 px-3"
          />
        </label>
        <label className="block text-xs">
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="off"
            className="mt-2 h-10 w-full rounded border border-slate-200 px-3"
          />
        </label>
        <div>
          <label htmlFor="password" className="block text-xs">
            Mật khẩu
          </label>
          <div className="mt-2">
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              onChange={handlePasswordChange}
              aria-invalid={passwordInvalid}
              aria-describedby={passwordInvalid ? 'password-warning' : undefined}
              className="h-10 w-full rounded border border-slate-200 px-3"
            />
          </div>
        </div>
        {passwordInvalid && (
          <p id="password-warning" className="text-xs text-red-600" aria-live="polite">
            Ít nhất 8 ký tự, có chữ hoa, ký tự đặc biệt và không có khoảng trắng.
          </p>
        )}
        <label className="block text-xs">
          Vai trò
          <select
            name="role"
            className="mt-2 h-10 w-full rounded border border-slate-200 px-3"
          >
            <option value="EMPLOYEE">Nhân viên</option>
            <option value="MANAGER">Quản lý</option>
          </select>
        </label>
        {error && (
          <p role="alert" className="text-xs text-red-600">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy}>
          {busy ? 'Đang tạo...' : 'Tạo tài khoản'}
        </Button>
      </form>
    </>
  )
}
