import { useEffect, useRef, useState } from 'react'
import { Menu } from 'lucide-react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from '../components/navigation/Sidebar'

export default function DashboardLayout() {
  const [open, setOpen] = useState(false)
  const drawer = useRef(null)
  const { pathname } = useLocation()
  useEffect(() => {
    setOpen(false)
  }, [pathname])
  useEffect(() => {
    if (open) drawer.current?.showModal()
    else drawer.current?.close()
  }, [open])
  return (
    <div className="min-h-dvh">
      <div className="fixed inset-y-0 left-0 z-30 hidden md:block">
        <Sidebar />
      </div>
      <div className="md:ml-[228px]">
        <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-5 py-3 md:hidden">
          <button
            onClick={() => setOpen(true)}
            aria-label="Mở menu"
            className="p-1"
          >
            <Menu size={21} />
          </button>
          <span className="text-sm font-bold">Involens</span>
        </div>
        <main className="mx-auto max-w-[1600px] p-5 lg:p-8">
          <Outlet />
        </main>
      </div>
      <dialog
        ref={drawer}
        onCancel={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === drawer.current) setOpen(false)
        }}
        className="fixed inset-y-0 left-0 m-0 h-dvh max-h-none border-0 bg-transparent p-0 backdrop:bg-slate-950/50"
      >
        <Sidebar mobile onNavigate={() => setOpen(false)} />
      </dialog>
    </div>
  )
}
