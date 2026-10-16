import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { KeyRound } from 'lucide-react'
import { getMe } from '../api/auth'
import PageHeader from '../components/ui/PageHeader'

const roleLabels = { MANAGER: 'Quản lý', EMPLOYEE: 'Nhân viên' }

/** Displays the authenticated user's read-only profile retrieved from the identity API. */
export default function ProfilePage() {
  console.debug('[Profile] Rendering personal profile')
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  /** Retrieves the current user's identity and ignores responses after leaving the profile screen. */
  useEffect(() => {
    console.info('[Profile] Loading personal profile')
    let active = true

    /** Stores the returned profile for read-only display while the screen is active. */
    function receiveProfile(data) {
      if (!active) return
      setProfile(data)
      console.info('[Profile] Personal profile loaded')
    }

    /** Shows identity request failures using the shared API's error message. */
    function reportFailure(failure) {
      if (!active) return
      console.error('[Profile] Profile loading failed', { message: failure.message })
      setError(failure.message)
    }

    /** Ends loading feedback once the active identity request completes. */
    function finishLoading() {
      if (!active) return
      console.debug('[Profile] Profile request completed')
      setLoading(false)
    }

    getMe().then(receiveProfile).catch(reportFailure).finally(finishLoading)

    /** Prevents a completed request from updating a profile screen that has been closed. */
    function deactivateProfile() {
      console.debug('[Profile] Closing personal profile')
      active = false
    }
    return deactivateProfile
  }, [])

  return (
    <>
      <PageHeader
        title="Hồ sơ cá nhân"
        action={
          <Link to="/change-password" className="ml-auto inline-flex min-h-9 items-center justify-center gap-2 rounded-md bg-brand px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#074d39]">
            <KeyRound size={16} aria-hidden="true" />
            Đổi mật khẩu
          </Link>
        }
      />
      {loading && (
        <p role="status" className="py-6 text-sm text-slate-500">
          Đang tải dữ liệu...
        </p>
      )}
      {error && (
        <p role="alert" className="mb-4 text-sm text-red-600">
          {error}
        </p>
      )}
      {profile && (
        <section className="max-w-xl rounded-md border border-slate-200 bg-white p-6">
          <h2 className="mb-5 text-sm font-semibold">Thông tin tài khoản</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-4 text-xs">
            <dt className="text-slate-500">ID</dt>
            <dd>{profile.id}</dd>
            <dt className="text-slate-500">Email</dt>
            <dd className="break-all">{profile.email}</dd>
            <dt className="text-slate-500">Họ tên</dt>
            <dd className="break-words">{profile.fullName}</dd>
            <dt className="text-slate-500">Vai trò</dt>
            <dd>{roleLabels[profile.role] || profile.role}</dd>
          </dl>
        </section>
      )}
    </>
  )
}
