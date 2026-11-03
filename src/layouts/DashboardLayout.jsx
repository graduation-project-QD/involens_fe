import { useEffect, useRef, useState } from 'react'
import { Check, Menu, X } from 'lucide-react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from '../components/navigation/Sidebar'
import { DocumentStatusProvider } from '../context/DocumentStatusContext'

/** Hosts authenticated navigation and live updates only on the approved document routes. */
export default function DashboardLayout() {
  console.debug('[DashboardLayout] Rendering authenticated workspace')
  const [open, setOpen] = useState(false)
  const [deletionNotice, setDeletionNotice] = useState(null)
  const deletionDismissalTimer = useRef(null)
  const drawer = useRef(null)
  const { pathname } = useLocation()
  const liveDocuments =
    pathname === '/dashboard' ||
    pathname === '/documents' ||
    /^\/documents\/[^/]+$/.test(pathname)
  /** Keeps successful document deletion feedback visible across navigation for three seconds. */
  useEffect(() => {
    console.debug('[DashboardLayout] Listening for successful document deletions')

    /** Shows the deleted file name and restarts the notice duration after each successful deletion. */
    function handleDocumentDeleted(event) {
      console.info('[DashboardLayout] Showing document deletion confirmation')
      window.clearTimeout(deletionDismissalTimer.current)
      setDeletionNotice({ filename: event.detail.filename })
      /** Hides the deletion confirmation after its full three-second display period. */
      deletionDismissalTimer.current = window.setTimeout(() => {
        console.debug('[DashboardLayout] Document deletion confirmation dismissed')
        deletionDismissalTimer.current = null
        setDeletionNotice(null)
      }, 3000)
    }

    window.addEventListener('involens:document-deleted', handleDocumentDeleted)
    /** Releases deletion notifications and their pending timer when leaving the dashboard layout. */
    return () => {
      console.debug('[DashboardLayout] Stopping document deletion notifications')
      window.removeEventListener('involens:document-deleted', handleDocumentDeleted)
      window.clearTimeout(deletionDismissalTimer.current)
      deletionDismissalTimer.current = null
    }
  }, [])
  /** Closes the deletion confirmation immediately and cancels its scheduled dismissal. */
  function dismissDeletionNotice() {
    console.debug('[DashboardLayout] Closing document deletion confirmation manually')
    window.clearTimeout(deletionDismissalTimer.current)
    deletionDismissalTimer.current = null
    setDeletionNotice(null)
  }
  useEffect(() => {
    setOpen(false)
  }, [pathname])
  useEffect(() => {
    if (open) drawer.current?.showModal()
    else drawer.current?.close()
  }, [open])
  return (
    <div className="min-h-dvh">
      {deletionNotice && (
        <div
          role="status"
          className="fixed right-4 top-4 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-lg"
        >
          <Check size={20} className="shrink-0" aria-hidden="true" />
          <p className="min-w-0 break-words">
            Đã xóa thành công “{deletionNotice.filename}”
          </p>
          <button
            type="button"
            onClick={dismissDeletionNotice}
            aria-label="Đóng thông báo xóa tài liệu"
            className="shrink-0 rounded-md p-1 text-emerald-700 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      )}
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
          {liveDocuments ? (
            <DocumentStatusProvider>
              <Outlet />
            </DocumentStatusProvider>
          ) : (
            <Outlet />
          )}
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
