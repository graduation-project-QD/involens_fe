import { useState } from 'react'
import { LogOut, UserRound, X } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { navigation } from '../../config/navigation'
import { useAuth } from '../../context/AuthContext'

/** Builds the account avatar initials from the first and last name words, leaving missing names for the user icon. */
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

/** Presents navigation, role-scoped account tools and session logout. */
export default function Sidebar({ onNavigate, mobile = false }) {
  console.debug('[Sidebar] Rendering navigation')
  const { user, signOut } = useAuth()
  const avatarInitials = getAvatarInitials(user?.fullName)
  const [busy, setBusy] = useState(false)
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
          className="mb-4 flex items-center gap-3 rounded px-3 py-2 transition-colors hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        >
          <span
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand text-base font-semibold text-white"
          >
            {avatarInitials || <UserRound size={20} />}
          </span>
          <div className="min-w-0">
            <p className="break-words text-xs font-medium text-white">
              {user?.fullName}
            </p>
            <p className="mt-1 text-[10px]">
              {user?.role === 'MANAGER' ? 'Quản lý' : 'Nhân viên'}
            </p>
          </div>
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
