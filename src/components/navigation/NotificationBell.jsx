import { useEffect, useId, useRef, useState } from 'react'
import {
  Bell,
  CheckCheck,
  CircleAlert,
  CircleCheck,
  Clock3,
  X,
} from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  getNotifications,
  markNotificationsRead,
} from '../../api/notifications'
import { useNotifications } from '../../context/DocumentStatusContext'

const groupPresentation = {
  SUCCESS: {
    label: 'Xử lý thành công',
    icon: CircleCheck,
    color: 'text-emerald-500',
    path: '/documents',
  },
  REVIEW_REQUIRED: {
    label: 'Xử lý xong, chờ duyệt',
    icon: Clock3,
    color: 'text-amber-500',
    path: '/approvals',
  },
  FAILURE: {
    label: 'Xử lý hoặc tải lên thất bại',
    icon: CircleAlert,
    color: 'text-red-500',
    path: '/errors',
  },
}

/** Describes the last group update relative to the current time for notification readers. */
function describeTime(value) {
  console.debug('[Notifications] Formatting update time')
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return ''
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000))
  if (minutes === 0) return 'Vừa xong'
  if (minutes < 60) return `${minutes} phút trước`
  if (minutes < 1440) return `${Math.floor(minutes / 60)} giờ trước`
  return `${Math.floor(minutes / 1440)} ngày trước`
}

/** Shows uploader notifications on demand and marks groups read before opening their workspace. */
export default function NotificationBell({ mobile = false, onNavigate }) {
  console.debug('[Notifications] Rendering bell', { mobile })
  const { unreadCount, notificationRevision, refreshSummary } =
    useNotifications()
  const [open, setOpen] = useState(false)
  const [pages, setPages] = useState(1)
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const root = useRef(null)
  const trigger = useRef(null)
  const operation = useRef(false)
  const panelId = useId()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  /** Loads visible pages only while open and cancels stale requests on close or newer events. */
  useEffect(() => {
    if (!open) return
    console.info('[Notifications] Loading open popup', { pages })
    const controller = new AbortController()
    /** Reloads the displayed range so websocket changes cannot leave older pages stale. */
    async function loadGroups() {
      setLoading(true)
      setError('')
      try {
        const groups = new Map()
        let latestTotal = 0
        for (let page = 1; page <= pages; page += 1) {
          const result = await getNotifications(page, controller.signal)
          if (
            !Array.isArray(result?.items) ||
            !Number.isSafeInteger(result.total) ||
            result.total < 0
          )
            throw new Error('Không thể tải thông báo. Vui lòng thử lại.')
          for (const item of result.items) {
            if (!item?.id || !Object.hasOwn(groupPresentation, item.type)) {
              console.warn('[Notifications] Ignoring unsupported group')
              continue
            }
            groups.set(item.id, item)
          }
          latestTotal = result.total
          if (page * 8 >= latestTotal) break
        }
        if (controller.signal.aborted) return
        setItems([...groups.values()])
        setTotal(latestTotal)
        console.info('[Notifications] Popup loaded', { count: groups.size })
      } catch (failure) {
        if (!controller.signal.aborted) {
          console.warn('[Notifications] Popup load failed')
          setError(failure.message)
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void loadGroups()
    /** Prevents closed or superseded lists from receiving pending responses. */
    return () => {
      console.debug('[Notifications] Cancelling popup load')
      controller.abort()
    }
  }, [open, pages, notificationRevision, retry])

  /** Closes notifications when workspace navigation changes. */
  useEffect(() => {
    console.debug('[Notifications] Closing popup after navigation')
    setOpen(false)
  }, [pathname, onNavigate])

  /** Supports dismissing the popup with an outside click or Escape. */
  useEffect(() => {
    if (!open) return
    console.debug('[Notifications] Listening for dismissal')
    /** Dismisses only interactions outside the notification controls. */
    function dismissOutside(event) {
      if (root.current?.contains(event.target)) return
      console.debug('[Notifications] Dismissing outside popup')
      setOpen(false)
    }
    /** Returns keyboard focus to the bell after Escape. */
    function dismissEscape(event) {
      if (event.key !== 'Escape') return
      console.debug('[Notifications] Dismissing with Escape')
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
      trigger.current?.focus()
    }
    document.addEventListener('pointerdown', dismissOutside)
    document.addEventListener('keydown', dismissEscape, true)
    return () => {
      console.debug('[Notifications] Removing dismissal listeners')
      document.removeEventListener('pointerdown', dismissOutside)
      document.removeEventListener('keydown', dismissEscape, true)
    }
  }, [open])

  /** Opens a fresh first page or closes the current notification popup. */
  function togglePopup() {
    console.info('[Notifications] Toggling popup', { open: !open })
    setPages(1)
    setOpen(!open)
  }

  /** Marks only the selected group, or explicitly all groups, then synchronizes unread totals. */
  async function readGroups(item) {
    if (operation.current) return
    console.info('[Notifications] Reading groups', { all: !item })
    operation.current = true
    setBusy(true)
    setError('')
    try {
      if (!item || !item.read) await markNotificationsRead(item?.id)
      void refreshSummary()
      if (item) {
        const destination = groupPresentation[item.type].path
        try {
          sessionStorage.removeItem(
            'involens:workspace-query:' + destination.slice(1),
          )
        } catch {
          console.warn(
            '[Notifications] Could not clear saved destination filters',
          )
        }
        setOpen(false)
        navigate(destination)
        onNavigate?.()
      } else {
        setRetry((value) => value + 1)
      }
      console.info('[Notifications] Read operation completed')
    } catch (failure) {
      console.warn('[Notifications] Read operation failed')
      setError(failure.message)
    } finally {
      operation.current = false
      setBusy(false)
    }
  }

  /** Requests the next eight groups without changing their read status. */
  function showMore() {
    console.debug('[Notifications] Showing more groups')
    setPages((value) => value + 1)
  }

  /** Retries notification loading after a failed request. */
  function retryLoading() {
    console.info('[Notifications] Retrying popup load')
    setRetry((value) => value + 1)
  }

  return (
    <div ref={root} className="shrink-0">
      <button
        ref={trigger}
        type="button"
        onClick={togglePopup}
        aria-label={`Thông báo, ${unreadCount} nhóm chưa đọc`}
        aria-expanded={open}
        aria-controls={panelId}
        className="relative flex size-9 items-center justify-center rounded-full border border-white/15 bg-black/20 text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <Bell size={20} aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            aria-live="polite"
            className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-4 text-white"
          >
            {unreadCount}
          </span>
        )}
      </button>
      {open && (
        <section
          id={panelId}
          aria-label="Thông báo"
          aria-busy={loading}
          className={`fixed top-[72px] z-50 w-[350px] max-w-[calc(100vw-1rem)] overflow-hidden rounded-2xl border border-white/20 bg-[#1c252c] text-white shadow-xl ${mobile ? 'left-2' : 'left-[200px]'}`}
        >
          <header className="flex items-center justify-between gap-2 border-b border-white/10 bg-[#1b1c1a] px-4 py-3">
            <h2 className="text-base font-semibold">Thông báo</h2>
            <button
              type="button"
              disabled={busy || unreadCount === 0}
              onClick={() => readGroups()}
              className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-white disabled:opacity-40"
            >
              <CheckCheck size={14} aria-hidden="true" /> Đã đọc toàn bộ
            </button>
            <button
              type="button"
              onClick={togglePopup}
              aria-label="Đóng thông báo"
            >
              <X size={16} />
            </button>
          </header>
          <div className="max-h-[min(480px,calc(100dvh-150px))] overflow-y-auto">
            {error && (
              <div role="alert" className="px-4 py-3 text-sm text-red-300">
                {error}{' '}
                <button
                  type="button"
                  onClick={retryLoading}
                  className="underline"
                >
                  Thử lại
                </button>
              </div>
            )}
            {loading && (
              <p role="status" className="px-4 py-3 text-xs text-slate-400">
                Đang tải thông báo…
              </p>
            )}
            {!loading && !error && items.length === 0 && (
              <p className="px-4 py-6 text-sm text-slate-400">
                Chưa có thông báo.
              </p>
            )}
            {items.map((item) => {
              const { label, icon: Icon, color } = groupPresentation[item.type]
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={busy || loading}
                  onClick={() => readGroups(item)}
                  className={`flex w-full items-start gap-3 border-b border-white/10 px-4 py-3 text-left hover:bg-white/5 disabled:cursor-wait ${item.read ? 'opacity-60' : ''}`}
                >
                  <Icon
                    size={20}
                    aria-hidden="true"
                    className={`mt-0.5 shrink-0 ${color}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{label}</span>
                    <span className="mt-0.5 block text-xs text-slate-400">
                      {item.count} file · {describeTime(item.updatedAt)}
                    </span>
                  </span>
                  {!item.read && (
                    <span
                      aria-label="Chưa đọc"
                      className="mt-2 size-2 shrink-0 rounded-full bg-red-500"
                    />
                  )}
                </button>
              )
            })}
            {items.length < total && (
              <button
                type="button"
                disabled={loading || busy}
                onClick={showMore}
                className="w-full px-4 py-3 text-xs text-slate-300 hover:bg-white/5 disabled:opacity-50"
              >
                Xem thêm
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
