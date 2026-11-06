import { useEffect, useRef, useState } from 'react'
import {
  ChevronDown,
  KeyRound,
  LogOut,
  Upload,
  UserRound,
  X,
} from 'lucide-react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { navigation } from '../../config/navigation'
import { useAuth } from '../../context/AuthContext'
import NotificationBell from './NotificationBell'

/** Builds the account avatar from the first and last words of the user's name. */
function getAvatarInitials(fullName) {
  const nameParts = fullName?.trim().split(/\s+/).filter(Boolean) ?? []
  console.debug('[Sidebar] Preparing account avatar', {
    hasName: nameParts.length > 0,
  })
  if (!nameParts.length) return ''
  const firstInitial = Array.from(nameParts[0])[0]
  const lastInitial =
    nameParts.length > 1 ? Array.from(nameParts.at(-1))[0] : ''
  return (firstInitial + lastInitial).toLocaleUpperCase('vi-VN')
}

/** Presents role-scoped workspace navigation on desktop and mobile. */
export default function Sidebar({ onNavigate, mobile = false }) {
  console.debug('[Sidebar] Rendering navigation')
  const { user, signOut } = useAuth()
  const { pathname } = useLocation()
  const accountMenu = useRef(null)
  const [busy, setBusy] = useState(false)
  const avatarInitials = getAvatarInitials(user?.fullName)

  /** Starts a fresh document list from menu navigation while retaining separately saved document selections. */
  function handleWorkspaceNavigation(event) {
    const destination = event.currentTarget.getAttribute('href')
    console.info('[Sidebar] Opening workspace from menu', { destination })
    if (
      !event.ctrlKey &&
      !event.metaKey &&
      !event.shiftKey &&
      !event.altKey &&
      event.button === 0
    ) {
      const kind = destination?.slice(1)
      if (['documents', 'errors', 'invoices'].includes(kind)) {
        try {
          sessionStorage.removeItem('involens:workspace-query:' + kind)
        } catch (failure) {
          console.warn('[Sidebar] Could not reset list query', {
            kind,
            message: failure.message,
          })
        }
      }
    }
    onNavigate?.(event)
  }

  /** Closes account navigation after changing pages or closing mobile navigation. */
  useEffect(() => {
    console.debug('[Sidebar] Closing account navigation after navigation')
    accountMenu.current?.removeAttribute('open')
  }, [pathname, onNavigate])

  /** Allows dismissing account navigation from outside the menu or with the keyboard. */
  useEffect(() => {
    console.debug('[Sidebar] Listening for account navigation dismissal')
    /** Closes the account links when the user interacts elsewhere. */
    function handleOutsideClick(event) {
      if (
        !accountMenu.current?.open ||
        accountMenu.current.contains(event.target)
      )
        return
      console.debug('[Sidebar] Closing account navigation from outside click')
      accountMenu.current.removeAttribute('open')
    }
    /** Dismisses account links and returns focus to the account control. */
    function handleEscape(event) {
      if (event.key !== 'Escape' || !accountMenu.current?.open) return
      console.debug('[Sidebar] Closing account navigation with Escape')
      accountMenu.current.removeAttribute('open')
      accountMenu.current.querySelector('summary')?.focus()
    }
    document.addEventListener('pointerdown', handleOutsideClick)
    document.addEventListener('keydown', handleEscape)
    /** Releases account dismissal listeners when the sidebar unmounts. */
    return () => {
      console.debug('[Sidebar] Removing account navigation listeners')
      document.removeEventListener('pointerdown', handleOutsideClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  /** Ends the current session through the existing logout flow without repeated requests. */
  async function handleLogout() {
    if (busy) return
    console.info('[Sidebar] Logout requested')
    setBusy(true)
    await signOut()
    setBusy(false)
    console.info('[Sidebar] Logout completed')
  }
  return (
    <aside className="flex h-full w-[228px] flex-col overflow-y-auto bg-sidebar px-3.5 pb-4 pt-6 text-[#98a5b5]">
      <div className="mb-5 flex items-start justify-between gap-2 px-3">
        <Link to="/dashboard" onClick={onNavigate} className="min-w-0 flex-1">
          <p className="text-base font-bold text-white">Involens</p>
          <p className="mt-1 text-[10px]">Hệ thống trích xuất hóa đơn</p>
        </Link>
        <NotificationBell onNavigate={onNavigate} mobile={mobile} />
        {mobile && (
          <button aria-label="Đóng menu" onClick={onNavigate}>
            <X size={18} />
          </button>
        )}
      </div>
      <NavLink
        to="/upload"
        onClick={onNavigate}
        className={({ isActive }) =>
          'mb-6 flex min-h-11 shrink-0 items-center justify-center gap-2.5 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold ' +
          (isActive
            ? 'bg-[#404f5d] font-semibold text-white'
            : 'bg-brand text-white hover:bg-brand/90')
        }
      >
        <Upload size={15} />
        Tải hóa đơn lên
      </NavLink>
      <nav aria-label="Điều hướng chính" className="flex-1 space-y-6">
        {navigation
          .filter((group) => !group.managerOnly || user?.role === 'MANAGER')
          .map((group) => (
            <div key={group.label}>
              <p className="mb-2 px-3 text-[10px] uppercase">{group.label}</p>
              <ul className="space-y-1">
                {group.items
                  .filter(
                    (item) => !item.managerOnly || user?.role === 'MANAGER',
                  )
                  .map(({ label, to, icon: Icon }) => {
                    return (
                      <li key={to}>
                        <NavLink
                          to={to}
                          onClick={handleWorkspaceNavigation}
                          className={({ isActive }) =>
                            'flex min-h-11 items-center gap-2.5 rounded-lg px-3 py-2 text-xs ' +
                            (isActive
                              ? 'bg-[#404f5d] font-semibold text-white'
                              : 'hover:bg-white/5 hover:text-white')
                          }
                        >
                          <Icon size={15} />
                          <span className="flex-1">{label}</span>
                        </NavLink>
                      </li>
                    )
                  })}
              </ul>
            </div>
          ))}
      </nav>
      <details
        ref={accountMenu}
        className="group relative mt-6 shrink-0 border-t border-white/10 pt-2"
      >
        <summary
          aria-label="Menu tài khoản"
          className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-2 py-2 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand [&::-webkit-details-marker]:hidden"
        >
          <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand text-[10px] font-semibold text-white"
          >
            {avatarInitials || <UserRound size={16} />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block break-words text-[11px] font-semibold leading-4 text-white">
              {user?.fullName}
            </span>
          </span>
          <ChevronDown
            size={12}
            aria-hidden="true"
            className="shrink-0 transition-transform group-open:rotate-180"
          />
        </summary>
        <div className="absolute bottom-full left-0 mb-2 w-full overflow-hidden rounded-xl border border-white/5 bg-[#202938] text-[11px] shadow-lg">
          <nav aria-label="Tài khoản" className="space-y-1 p-2">
            <Link
              to="/profile"
              onClick={onNavigate}
              className="flex items-center gap-2.5 rounded-md px-2 py-2 font-medium text-slate-100 hover:bg-white/5"
            >
              <UserRound
                size={14}
                aria-hidden="true"
                className="shrink-0 text-slate-400"
              />{' '}
              Hồ sơ &amp; tài khoản
            </Link>
            <Link
              to="/change-password"
              onClick={onNavigate}
              className="flex items-center gap-2.5 rounded-md px-2 py-2 font-medium text-slate-100 hover:bg-white/5"
            >
              <KeyRound
                size={14}
                aria-hidden="true"
                className="shrink-0 text-slate-400"
              />{' '}
              Đổi mật khẩu
            </Link>
          </nav>
          <div className="mx-2 border-t border-white/10 py-2">
            <button
              type="button"
              disabled={busy}
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 font-medium text-red-400 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <LogOut size={14} aria-hidden="true" className="shrink-0" />
              {busy ? 'Đang đăng xuất...' : 'Đăng xuất'}
            </button>
          </div>
        </div>
      </details>
    </aside>
  )
}
