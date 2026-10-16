import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, KeyRound } from 'lucide-react'
import { changePassword } from '../api/auth'
import { useAuth } from '../context/AuthContext'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'

/** Changes the user's password after local validation and ends the current session on success. */
export default function ChangePasswordPage() {
  console.debug('[ChangePassword] Rendering password change form')
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const pending = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  /** Validates password requirements and confirmation before sending only the two API fields. */
  async function handleSubmit(event) {
    event.preventDefault()
    if (pending.current) return
    console.info('[ChangePassword] Validating password change')
    const form = event.currentTarget
    const values = new FormData(form)
    const currentPassword = values.get('currentPassword')
    const newPassword = values.get('newPassword')
    const confirmPassword = values.get('confirmPassword')
    const special = `!@#$%^&*()_+-=[]{};':"\\|,.<>/?`
    let hasSpecialCharacter = false
    for (const character of newPassword) {
      if (special.includes(character)) {
        hasSpecialCharacter = true
        break
      }
    }
    setError('')
    if (!currentPassword || newPassword.length < 8 || !/[A-Z]/.test(newPassword) || /\s/.test(newPassword) || !hasSpecialCharacter) {
      console.warn('[ChangePassword] Password requirements validation failed')
      setError('Điền mật khẩu hiện tại. Mật khẩu mới cần ít nhất 8 ký tự, có chữ hoa, ký tự đặc biệt và không chứa khoảng trắng.')
      return
    }
    if (newPassword !== confirmPassword) {
      console.warn('[ChangePassword] Password confirmation mismatch')
      setError('Xác nhận mật khẩu mới không khớp.')
      return
    }
    pending.current = true
    setBusy(true)
    try {
      await changePassword({ currentPassword, newPassword })
      form.reset()
      console.info('[ChangePassword] Password changed; ending session')
      await signOut()
      navigate('/login', { replace: true })
    } catch (failure) {
      console.error('[ChangePassword] Password change failed')
      setError(failure.message)
    } finally {
      pending.current = false
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Đổi mật khẩu"
        description="Sau khi đổi mật khẩu thành công, bạn cần đăng nhập lại."
        action={
          <Link to="/profile" className="ml-auto inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-brand bg-white px-4 py-2 text-xs font-semibold text-brand transition-colors hover:bg-emerald-50">
            <ArrowLeft size={16} aria-hidden="true" />
            Quay lại hồ sơ
          </Link>
        }
      />
      <form onSubmit={handleSubmit} className="max-w-xl space-y-4 rounded-md border border-slate-200 bg-white p-6">
        <fieldset disabled={busy} className="space-y-4">
          <label className="block text-xs">
            Mật khẩu hiện tại
            <input name="currentPassword" type="password" autoComplete="current-password" required className="mt-2 h-10 w-full rounded border border-slate-200 px-3" />
          </label>
          <label className="block text-xs">
            Mật khẩu mới
            <input name="newPassword" type="password" autoComplete="new-password" required minLength={8} aria-describedby="new-password-rules" className="mt-2 h-10 w-full rounded border border-slate-200 px-3" />
          </label>
          <p id="new-password-rules" className="text-xs text-slate-500">Ít nhất 8 ký tự, có chữ hoa, ký tự đặc biệt và không có khoảng trắng.</p>
          <label className="block text-xs">
            Xác nhận mật khẩu mới
            <input name="confirmPassword" type="password" autoComplete="new-password" required className="mt-2 h-10 w-full rounded border border-slate-200 px-3" />
          </label>
          {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
          <Button type="submit" disabled={busy}>
            <KeyRound size={16} aria-hidden="true" />
            {busy ? 'Đang đổi mật khẩu...' : 'Đổi mật khẩu'}
          </Button>
        </fieldset>
      </form>
    </>
  )
}
