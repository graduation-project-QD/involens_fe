import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft, KeyRound, Save } from 'lucide-react'
import { getAccount, resetAccountPassword, updateAccount } from '../api/auth'
import { useAuth } from '../context/AuthContext'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'

/** Allows only managers to view and update account permissions. */
export default function AccountDetailPage() {
  console.debug('[AccountDetail] Checking manager access')
  const { user } = useAuth()
  const { accountId } = useParams()
  if (user?.role !== 'MANAGER') {
    console.info('[AccountDetail] Manager access denied')
    return <Navigate to="/dashboard" replace />
  }
  return <AccountDetails key={accountId} accountId={accountId} />
}

/** Shows account identity and lets managers update permissions or reset its password. */
function AccountDetails({ accountId }) {
  console.debug('[AccountDetail] Rendering account details', { accountId })
  const [account, setAccount] = useState(null)
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const resetPending = useRef(false)
  const [resetting, setResetting] = useState(false)
  const [resetError, setResetError] = useState('')
  const [resetNotice, setResetNotice] = useState('')

  /** Validates and replaces this account's password while retaining the manager's session. */
  async function handlePasswordReset(event) {
    event.preventDefault()
    console.info('[AccountDetail] Validating password reset', { accountId })
    if (resetPending.current || !account) return
    const form = event.currentTarget
    const values = new FormData(form)
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
    setResetError('')
    setResetNotice('')
    if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || /\s/.test(newPassword) || !hasSpecialCharacter) {
      console.warn('[AccountDetail] Password reset validation failed', { accountId })
      setResetError('Mật khẩu mới cần ít nhất 8 ký tự, có chữ hoa, ký tự đặc biệt và không chứa khoảng trắng.')
      return
    }
    if (newPassword !== confirmPassword) {
      console.warn('[AccountDetail] Password reset confirmation mismatch', { accountId })
      setResetError('Xác nhận mật khẩu mới không khớp.')
      return
    }
    resetPending.current = true
    setResetting(true)
    try {
      await resetAccountPassword(accountId, { newPassword })
      form.reset()
      setResetNotice('Đã cấp lại mật khẩu thành công.')
      console.info('[AccountDetail] Account password reset successfully', { accountId })
    } catch (failure) {
      console.error('[AccountDetail] Account password reset failed', { accountId })
      setResetError(failure.message)
    } finally {
      resetPending.current = false
      setResetting(false)
    }
  }

  /** Loads the selected account while preventing obsolete responses after navigation. */
  useEffect(() => {
    console.info('[AccountDetail] Loading account', { accountId })
    const controller = new AbortController()

    /** Displays the account fields returned by the backend without exposing a password. */
    function receiveAccount(data) {
      if (controller.signal.aborted) return
      setAccount(data)
      setRole(data.role)
      setStatus(data.status)
      console.info('[AccountDetail] Account loaded', { accountId })
    }

    /** Displays account loading errors for the current request. */
    function reportFailure(failure) {
      if (controller.signal.aborted) return
      console.error('[AccountDetail] Account load failed', { accountId, message: failure.message })
      setError(failure.message)
    }

    /** Ends the loading indicator once the active request completes. */
    function finishLoading() {
      if (controller.signal.aborted) return
      console.debug('[AccountDetail] Account request completed', { accountId })
      setLoading(false)
    }

    getAccount(accountId, controller.signal)
      .then(receiveAccount)
      .catch(reportFailure)
      .finally(finishLoading)

    /** Cancels detail loading when the selected account screen is closed. */
    function cancelRequest() {
      console.debug('[AccountDetail] Cancelling account request', { accountId })
      controller.abort()
    }
    return cancelRequest
  }, [accountId])

  /** Updates the role selection and clears feedback for the previous save. */
  function changeRole(event) {
    console.debug('[AccountDetail] Account role selection changed', { accountId })
    setRole(event.target.value)
    setNotice('')
  }

  /** Updates the status selection and clears feedback for the previous save. */
  function changeStatus(event) {
    console.debug('[AccountDetail] Account status selection changed', { accountId })
    setStatus(event.target.value)
    setNotice('')
  }

  /** Validates approved permission values and persists only role and status through PATCH. */
  async function saveAccount(event) {
    event.preventDefault()
    if (saving || !account) return
    console.info('[AccountDetail] Saving account permissions', { accountId })
    setError('')
    setNotice('')
    if (!['MANAGER', 'EMPLOYEE'].includes(role) || !['ACTIVE', 'LOCKED'].includes(status)) {
      console.warn('[AccountDetail] Invalid account permissions', { accountId })
      setError('Vui lòng chọn vai trò và trạng thái hợp lệ.')
      return
    }
    setSaving(true)
    try {
      const updated = await updateAccount(accountId, { role, status })
      setAccount(updated)
      setRole(updated.role)
      setStatus(updated.status)
      setNotice('Đã cập nhật tài khoản thành công.')
      console.info('[AccountDetail] Account permissions saved', { accountId })
    } catch (failure) {
      console.error('[AccountDetail] Account update failed', { accountId, message: failure.message })
      setError(failure.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Chi tiết tài khoản"
        action={
          <Link to="/accounts" className="ml-auto inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-brand bg-white px-4 py-2 text-xs font-semibold text-brand transition-colors hover:bg-emerald-50">
            <ArrowLeft size={16} aria-hidden="true" />
            Quay lại quản lý tài khoản
          </Link>
        }
      />
      {loading && <p role="status" className="py-6 text-sm text-slate-500">Đang tải dữ liệu...</p>}
      {error && <p role="alert" className="mb-4 text-sm text-red-600">{error}</p>}
      {notice && <p role="status" className="mb-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
      {account && (
        <form onSubmit={saveAccount} className="max-w-xl space-y-4 rounded-md border border-slate-200 bg-white p-6">
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-4 text-xs">
            <dt className="text-slate-500">ID</dt>
            <dd>{account.id}</dd>
            <dt className="text-slate-500">Email</dt>
            <dd className="break-all">{account.email}</dd>
            <dt className="text-slate-500">Họ tên</dt>
            <dd className="break-words">{account.fullName}</dd>
            <dt className="text-slate-500">Ngày tạo</dt>
            <dd>{account.createdAt ? new Date(account.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '—'}</dd>
            <dt className="text-slate-500">Ngày cập nhật</dt>
            <dd>{account.updatedAt ? new Date(account.updatedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '—'}</dd>
          </dl>
          <label className="block text-xs">
            Vai trò
            <select value={role} onChange={changeRole} disabled={saving} required className="mt-2 h-10 w-full rounded border border-slate-200 bg-white px-3 disabled:opacity-50">
              <option value="MANAGER">Quản lý</option>
              <option value="EMPLOYEE">Nhân viên</option>
            </select>
          </label>
          <label className="block text-xs">
            Trạng thái
            <select value={status} onChange={changeStatus} disabled={saving} required className="mt-2 h-10 w-full rounded border border-slate-200 bg-white px-3 disabled:opacity-50">
              <option value="ACTIVE">Hoạt động</option>
              <option value="LOCKED">Đã khóa</option>
            </select>
          </label>
          <Button type="submit" disabled={saving}>
            <Save size={16} aria-hidden="true" />
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </Button>
        </form>
      )}
      {account && (
        <form onSubmit={handlePasswordReset} className="mt-6 max-w-xl space-y-4 rounded-md border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-semibold">Cấp lại mật khẩu</h2>
          <fieldset disabled={resetting} className="space-y-4">
            <label className="block text-xs">
              Mật khẩu mới
              <input name="newPassword" type="password" autoComplete="new-password" required minLength={8} aria-describedby="reset-password-rules" className="mt-2 h-10 w-full rounded border border-slate-200 px-3" />
            </label>
            <p id="reset-password-rules" className="text-xs text-slate-500">Ít nhất 8 ký tự, có chữ hoa, ký tự đặc biệt và không có khoảng trắng.</p>
            <label className="block text-xs">
              Xác nhận mật khẩu mới
              <input name="confirmPassword" type="password" autoComplete="new-password" required className="mt-2 h-10 w-full rounded border border-slate-200 px-3" />
            </label>
            {resetError && <p role="alert" className="text-xs text-red-600">{resetError}</p>}
            {resetNotice && <p role="status" className="rounded-md bg-emerald-50 p-3 text-xs text-emerald-700">{resetNotice}</p>}
            <Button type="submit" disabled={resetting}>
              <KeyRound size={16} aria-hidden="true" />
              {resetting ? 'Đang cấp lại mật khẩu...' : 'Cấp lại mật khẩu'}
            </Button>
          </fieldset>
        </form>
      )}
    </>
  )
}
