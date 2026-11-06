import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff, KeyRound } from 'lucide-react'
import { changePassword } from '../api/auth'
import { useAuth } from '../context/AuthContext'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'

/** Displays a password field with independent visibility while preserving form validation and its value. */
function PasswordField({ name, label, autoComplete, minLength, describedBy }) {
  console.debug('[ChangePassword] Rendering password field', { field: name })
  const [visible, setVisible] = useState(false)

  /** Toggles only this field's visibility without submitting the form or logging its password. */
  function toggleVisibility() {
    console.debug('[ChangePassword] Toggling password visibility', { field: name, visible: !visible })
    setVisible(!visible)
  }

  return (
    <div>
      <label htmlFor={name} className="block text-sm font-semibold">{label}</label>
      <div className="relative mt-2">
        <input
          id={name}
          name={name}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          required
          minLength={minLength}
          aria-describedby={describedBy}
          className="h-10 w-full rounded border border-slate-200 pl-3 pr-11"
        />
        <button
          type="button"
          onClick={toggleVisibility}
          aria-label={`${visible ? 'Ẩn' : 'Hiện'} ${label.toLocaleLowerCase('vi-VN')}`}
          aria-pressed={visible}
          aria-controls={name}
          className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded text-slate-500 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
        >
          {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </div>
    </div>
  )
}

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
          <PasswordField name="currentPassword" label="Mật khẩu hiện tại" autoComplete="current-password" />
          <PasswordField name="newPassword" label="Mật khẩu mới" autoComplete="new-password" minLength={8} describedBy="new-password-rules" />
          <p id="new-password-rules" className="text-xs text-slate-500">Ít nhất 8 ký tự, có chữ hoa, ký tự đặc biệt và không có khoảng trắng.</p>
          <PasswordField name="confirmPassword" label="Xác nhận mật khẩu mới" autoComplete="new-password" />
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
