import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, KeyRound, Mail, UserRound } from 'lucide-react'
import { getMe } from '../api/auth'
import PageHeader from '../components/ui/PageHeader'

/** Displays the account creation date through whole seconds while preserving the API's time. */
function formatCreatedAt(createdAt) {
  console.debug('[Profile] Formatting account creation date', {
    hasCreatedAt: Boolean(createdAt),
  })
  if (!createdAt) return '—'
  return createdAt
    .replace(/^(\d{4})-(\d{2})-(\d{2})T/, '$3/$2/$1 ')
    .replace(/(\d{2}:\d{2}:\d{2})\.\d+/, '$1')
}

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
        title="Thông tin tài khoản"
        description="Xem thông tin cá nhân hoặc đổi mật khẩu"
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
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        {profile && (
          <section aria-label="Thông tin cá nhân" className="min-w-0 rounded-2xl border border-slate-200 bg-white px-6 py-8 text-center">
            <div aria-hidden="true" className="mx-auto flex h-[90px] w-[90px] items-center justify-center rounded-full bg-brand text-4xl font-semibold text-white">
              {profile.fullName?.trim().charAt(0).toLocaleUpperCase('vi-VN')}
            </div>
            <h2 className="mt-4 break-words text-lg font-semibold">{profile.fullName}</h2>
            <p className="mt-1 break-all text-sm text-slate-500">{profile.email}</p>
          </section>
        )}
        <div className="min-w-0 space-y-5 lg:col-start-2">
          {profile && (
            <section className="rounded-2xl border border-slate-200 bg-white px-6 pb-2 pt-6">
              <h2 className="border-b border-slate-200 pb-3 text-base font-semibold">Thông tin tài khoản</h2>
              <dl className="text-sm">
                <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-3 border-b border-slate-200 py-4 sm:grid-cols-[128px_minmax(0,1fr)]">
                  <dt className="flex items-center gap-3 text-slate-500"><Mail size={20} className="shrink-0" aria-hidden="true" />Email</dt>
                  <dd className="break-all font-medium">{profile.email}</dd>
                </div>
                <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-3 border-b border-slate-200 py-4 sm:grid-cols-[128px_minmax(0,1fr)]">
                  <dt className="flex items-center gap-3 text-slate-500"><UserRound size={20} className="shrink-0" aria-hidden="true" />Họ tên</dt>
                  <dd className="break-words font-medium">{profile.fullName}</dd>
                </div>
                <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-3 py-4 sm:grid-cols-[128px_minmax(0,1fr)]">
                  <dt className="flex items-center gap-3 text-slate-500"><CalendarDays size={20} className="shrink-0" aria-hidden="true" />Ngày tạo</dt>
                  <dd className="break-words font-medium">{formatCreatedAt(profile.createdAt)}</dd>
                </div>
              </dl>
            </section>
          )}
          <div className="flex justify-end">
            <Link to="/change-password" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-brand bg-white px-5 py-2 text-sm font-semibold text-brand transition-colors hover:bg-emerald-50">
              <KeyRound size={18} aria-hidden="true" />
              Đổi mật khẩu
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
