import { LogOut, X } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { navigation } from '../../config/navigation'

export default function Sidebar({ onNavigate, mobile = false }) {
  return (
    <aside className="flex h-full w-[228px] flex-col overflow-y-auto bg-sidebar px-3.5 pb-4 pt-6 text-[#98a5b5]">
      <div className="mb-8 flex items-start justify-between px-3">
        <Link to="/dashboard" onClick={onNavigate}>
          <p className="text-base font-bold tracking-tight text-white">
            Involens
          </p>
          <p className="mt-1 text-[10px] tracking-wide text-[#748092]">
            Hệ thống trích xuất hóa đơn
          </p>
        </Link>
        {mobile && (
          <button
            aria-label="Đóng menu"
            onClick={onNavigate}
            className="p-1 text-white"
          >
            <X size={18} />
          </button>
        )}
      </div>
      <nav aria-label="Điều hướng chính" className="flex-1 space-y-6">
        {navigation.map((group) => (
          <div key={group.label}>
            <p className="mb-2 px-3 text-[10px] font-medium uppercase tracking-wider text-[#657184]">
              {group.label}
            </p>
            <ul className="space-y-1">
              {group.items.map(({ label, to, icon: Icon, badge }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      `flex min-h-9 items-center gap-2.5 rounded px-3 py-2 text-xs transition-colors ${isActive ? 'bg-[#404f5d] font-semibold text-white' : 'hover:bg-white/5 hover:text-white'}`
                    }
                  >
                    <Icon size={15} strokeWidth={1.7} />
                    <span className="flex-1">{label}</span>
                    {badge && <span className="text-[10px]">{badge}</span>}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="mt-10">
        <div className="mb-4 flex items-center gap-2.5 px-3">
          <span className="flex size-8 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
            NH
          </span>
          <div>
            <p className="text-xs font-medium text-white">Nguyễn Hoàng</p>
            <p className="mt-0.5 text-[10px]">Manager</p>
          </div>
        </div>
        <Link
          to="/login"
          onClick={onNavigate}
          className="flex items-center gap-2 rounded border border-[#354051] px-3 py-2 text-xs transition-colors hover:bg-white/5 hover:text-white"
        >
          <LogOut size={14} />
          Đăng xuất
        </Link>
      </div>
    </aside>
  )
}
