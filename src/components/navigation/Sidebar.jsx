import { useEffect, useState } from 'react'
import { LogOut, X } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { navigation } from '../../config/navigation'
import { useAuth } from '../../context/AuthContext'
import { getDocumentsByStates, getSummary } from '../../api/documents'

/** Presents navigation, role-scoped account tools, live document badges and session logout. */
export default function Sidebar({ onNavigate, mobile = false }) {
  console.debug('[Sidebar] Rendering navigation')
  const { user, signOut } = useAuth()
  const [summary, setSummary] = useState(null)
  const [errorDocumentCount, setErrorDocumentCount] = useState(null)
  const [busy, setBusy] = useState(false)
  /** Refreshes badges after upload or invoice approval and cancels requests on unmount. */
  useEffect(() => {
    console.debug('[Sidebar] Subscribing to document changes')
    let controller
    /** Loads review totals and counts all three document failure states for navigation badges. */
    function refreshSummary() {
      console.info('[Sidebar] Loading document badges')
      controller?.abort()
      controller = new AbortController()
      const current = controller
      getSummary(current.signal)
        .then((data) => {
          if (!current.signal.aborted) setSummary(data)
        })
        .catch((error) => {
          if (!current.signal.aborted) {
            console.warn('[Sidebar] Badge load failed')
            setSummary(null)
          }
        })
      getDocumentsByStates(
        { page: 1, page_size: 1 },
        ['EXTRACT_FAILED', 'UPLOADED_FAILED', 'PENDING_FAILURE'],
        current.signal,
      )
        .then((data) => {
          if (!current.signal.aborted) {
            setErrorDocumentCount(data.total)
            console.info('[Sidebar] Error document count loaded', { total: data.total })
          }
        })
        .catch((error) => {
          if (!current.signal.aborted) {
            console.warn('[Sidebar] Error document count load failed', { message: error.message })
            setErrorDocumentCount(null)
          }
        })
    }
    refreshSummary()
    window.addEventListener('involens:documents-changed', refreshSummary)
    return () => {
      controller?.abort()
      window.removeEventListener('involens:documents-changed', refreshSummary)
    }
  }, [])
  /** Ends the current session while preventing repeated logout requests. */
  async function handleLogout() {
    if (busy) return
    console.info('[Sidebar] Logout requested')
    setBusy(true)
    await signOut()
    setBusy(false)
    onNavigate?.()
  }
  return (
    <aside className="flex h-full w-[228px] flex-col overflow-y-auto bg-sidebar px-3.5 pb-4 pt-6 text-[#98a5b5]">
      <div className="mb-8 flex items-start justify-between px-3">
        <Link to="/dashboard" onClick={onNavigate}>
          <p className="text-base font-bold text-white">Involens</p>
          <p className="mt-1 text-[10px]">Hệ thống trích xuất hóa đơn</p>
        </Link>
        {mobile && (
          <button aria-label="Đóng menu" onClick={onNavigate}>
            <X size={18} />
          </button>
        )}
      </div>
      <nav aria-label="Điều hướng chính" className="flex-1 space-y-6">
        {navigation.map((group) => (
          <div key={group.label}>
            <p className="mb-2 px-3 text-[10px] uppercase">{group.label}</p>
            <ul className="space-y-1">
              {group.items
                .filter((item) => !item.managerOnly || user?.role === 'MANAGER')
                .map(({ label, to, icon: Icon }) => {
                  const badge =
                    to === '/approvals'
                      ? summary?.review_required
                      : to === '/errors' && errorDocumentCount !== null
                        ? errorDocumentCount
                        : undefined
                  return (
                    <li key={to}>
                      <NavLink
                        to={to}
                        onClick={onNavigate}
                        className={({ isActive }) =>
                          'flex min-h-9 items-center gap-2.5 rounded px-3 py-2 text-xs ' +
                          (isActive
                            ? 'bg-[#404f5d] font-semibold text-white'
                            : 'hover:bg-white/5 hover:text-white')
                        }
                      >
                        <Icon size={15} />
                        <span className="flex-1">{label}</span>
                        {badge !== undefined && (
                          <span className="text-[10px]">{badge}</span>
                        )}
                      </NavLink>
                    </li>
                  )
                })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="mt-10">
        <Link
          to="/profile"
          onClick={onNavigate}
          aria-label="Xem hồ sơ cá nhân"
          className="mb-4 block rounded px-3 py-2 transition-colors hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        >
          <p className="text-xs font-medium text-white">{user?.fullName}</p>
          <p className="mt-1 text-[10px]">
            {user?.role === 'MANAGER' ? 'Quản lý' : 'Nhân viên'}
          </p>
        </Link>
        <button
          disabled={busy}
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded border border-[#354051] px-3 py-2 text-xs"
        >
          <LogOut size={14} />
          {busy ? 'Đang đăng xuất...' : 'Đăng xuất'}
        </button>
      </div>
    </aside>
  )
}
