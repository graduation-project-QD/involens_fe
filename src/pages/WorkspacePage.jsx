import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  ListFilter,
  RotateCcw,
  Search,
} from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'
import DocumentsTable from '../components/documents/DocumentsTable'
import { getDocumentsByStates } from '../api/documents'
import { getInvoicesByStates } from '../api/invoices'
import { getReviewTasks } from '../api/reviewTasks'
import UploadPage from './UploadPage'
import { useDocumentStatusRefresh } from '../context/DocumentStatusContext'

const titles = {
  documents: 'Danh sách tài liệu',
  approvals: 'Hàng đợi duyệt',
  errors: 'Tài liệu lỗi',
  invoices: 'Hóa đơn đã trích xuất',
  activity: 'Nhật ký thao tác',
}
const documentStates = {
  UPLOADED: 'Đã tải lên',
  PROCESSING: 'Đang xử lý',
  EXTRACT_SUCCESS: 'Thành công',
  REVIEW_REQUIRED: 'Chờ duyệt',
  EXTRACT_FAILED: 'Lỗi xử lý',
  UPLOADED_FAILED: 'Tải lên thất bại',
  PENDING_FAILURE: 'Lỗi chờ xử lý',
}
const reviewStatuses = {
  PENDING: {
    label: 'Chờ duyệt',
    style: 'bg-amber-50 text-amber-700',
    text: 'text-amber-700',
  },
  COMPLETED: {
    label: 'Đã hoàn tất',
    style: 'bg-emerald-50 text-emerald-700',
    text: 'text-emerald-700',
  },
  CANCELLED: {
    label: 'Đã hủy',
    style: 'bg-slate-100 text-slate-600',
    text: 'text-slate-600',
  },
}

/** Presents the review queue's single-status filter using the document tables' menu styling. */
function ReviewStatusFilter({ value, onChange }) {
  console.debug('[ReviewStatusFilter] Rendering review filter', { value })
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  const menuId = useId()
  const label = reviewStatuses[value]?.label || 'Tất cả trạng thái'

  /** Aligns the status menu with its trigger outside the table's horizontal scroll container. */
  function positionMenu() {
    console.debug('[ReviewStatusFilter] Positioning status menu')
    const bounds = triggerRef.current.getBoundingClientRect()
    const width = Math.min(224, window.innerWidth - 24)
    setPosition({
      top: Math.min(bounds.bottom + 6, Math.max(12, window.innerHeight - 280)),
      left: Math.max(12, Math.min(bounds.left, window.innerWidth - width - 12)),
    })
  }

  /** Opens or closes the review status choices from the table header. */
  function toggleMenu() {
    console.debug('[ReviewStatusFilter] Toggling menu', { open: !open })
    positionMenu()
    setOpen(!open)
  }

  /** Applies one backend status selection and returns focus to the closed filter trigger. */
  function selectStatus(event) {
    const status = event.currentTarget.value
    console.info('[ReviewStatusFilter] Selecting review status', { status })
    onChange(status)
    setOpen(false)
    triggerRef.current?.focus()
  }

  /** Keeps the open menu aligned and dismisses it on outside clicks or Escape. */
  useEffect(() => {
    if (!open) return
    console.debug('[ReviewStatusFilter] Observing open menu')
    /** Closes the filter when a pointer action occurs outside the trigger and status choices. */
    function handleOutsidePointer(event) {
      if (
        triggerRef.current?.contains(event.target) ||
        menuRef.current?.contains(event.target)
      )
        return
      console.debug('[ReviewStatusFilter] Closing menu from outside click')
      setOpen(false)
    }
    /** Lets the user dismiss status choices from the keyboard without changing the filter. */
    function handleKeyDown(event) {
      if (event.key !== 'Escape') return
      console.debug('[ReviewStatusFilter] Closing menu from Escape')
      setOpen(false)
      triggerRef.current?.focus()
    }
    document.addEventListener('pointerdown', handleOutsidePointer)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', positionMenu)
    window.addEventListener('scroll', positionMenu, true)
    return () => {
      console.debug('[ReviewStatusFilter] Removing menu listeners')
      document.removeEventListener('pointerdown', handleOutsidePointer)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', positionMenu)
      window.removeEventListener('scroll', positionMenu, true)
    }
  }, [open])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleMenu}
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={'Lọc trạng thái duyệt: ' + label}
        className={
          'inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md border bg-white px-2 text-[11px] font-medium transition-colors hover:border-brand/50 ' +
          (reviewStatuses[value]?.text || 'text-brand') +
          ' ' +
          (open ? 'border-brand ring-1 ring-brand/20' : 'border-slate-200')
        }
      >
        <Filter size={13} aria-hidden="true" />
        <span>{label}</span>
        <ChevronDown
          size={13}
          className={'transition-transform ' + (open ? 'rotate-180' : '')}
          aria-hidden="true"
        />
      </button>
      {open &&
        createPortal(
          <div
            id={menuId}
            ref={menuRef}
            role="group"
            aria-label="Chọn trạng thái duyệt"
            style={position}
            className="fixed z-50 max-h-[min(260px,calc(100vh-24px))] w-56 max-w-[calc(100vw-24px)] overflow-y-auto rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg"
          >
            {['', ...Object.keys(reviewStatuses)].map((status) => {
              const checked = value === status
              const item = reviewStatuses[status] || {
                label: 'Tất cả trạng thái',
                text: 'text-brand',
                style: 'bg-emerald-50 text-brand',
              }
              return (
                <button
                  key={status}
                  type="button"
                  aria-pressed={checked}
                  value={status}
                  onClick={selectStatus}
                  className={
                    'flex min-h-8 w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors ' +
                    (checked
                      ? item.style + ' font-semibold'
                      : item.text + ' hover:bg-slate-50')
                  }
                >
                  {status === '' && <ListFilter size={14} aria-hidden="true" />}
                  <span className="flex-1">{item.label}</span>
                  {checked && <Check size={14} aria-hidden="true" />}
                </button>
              )
            })}
          </div>,
          document.body,
        )}
    </>
  )
}

/** Hosts server document filters and the review queue within the shared dashboard layout. */
export default function WorkspacePage({ kind }) {
  console.debug('[Workspace] Rendering workspace', { kind })
  if (kind === 'upload') return <UploadPage />
  if (kind === 'activity')
    return (
      <>
        <PageHeader title={titles[kind]} />
        <p className="rounded border border-slate-200 bg-white p-6 text-sm text-slate-500">
          BE chưa cung cấp API nhật ký thao tác.
        </p>
      </>
    )
  return <ServerWorkspace key={kind} kind={kind} />
}

/** Fetches paginated lists using only filters supported by the documented backend. */
function ServerWorkspace({ kind }) {
  console.debug('[Workspace] Rendering server list', { kind })
  const review = kind === 'approvals'
  const states =
    kind === 'errors'
      ? ['EXTRACT_FAILED', 'UPLOADED_FAILED', 'PENDING_FAILURE']
      : kind === 'invoices'
        ? ['EXTRACT_SUCCESS', 'REVIEW_REQUIRED', 'EXTRACT_FAILED']
        : Object.keys(documentStates)
  const [query, setQuery] = useState({
    page: 1,
    page_size: review ? 20 : 8,
    selected_states: [],
    status: review ? 'PENDING' : '',
  })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)
  /** Reloads the active document list after a batched status notification. */
  function refreshDocumentStatus() {
    console.info('[Workspace] Refreshing live document list')
    setVersion((current) => current + 1)
  }
  useDocumentStatusRefresh(refreshDocumentStatus, kind === 'documents')
  /** Loads one backend page and prevents obsolete responses from replacing a newer filter result. */
  useEffect(() => {
    console.info('[Workspace] Loading page', { kind, page: query.page })
    const controller = new AbortController()
    setLoading(true)
    if (review) setResult(null)
    setError('')
    let operation
    if (review) {
      operation = getReviewTasks(
        {
          status: query.status,
          page: query.page,
          page_size: query.page_size,
        },
        controller.signal,
      )
    } else if (kind === 'invoices') {
      operation = getInvoicesByStates(
        {
          page: query.page,
          page_size: query.page_size,
          q: query.q,
          date_from: query.date_from,
          date_to: query.date_to,
        },
        query.selected_states,
        controller.signal,
      )
    } else {
      operation = getDocumentsByStates(
        Object.fromEntries(
          Object.entries(query).filter(([key]) => key !== 'selected_states'),
        ),
        query.selected_states.length
          ? query.selected_states
          : kind === 'errors'
            ? ['EXTRACT_FAILED', 'UPLOADED_FAILED', 'PENDING_FAILURE']
            : [],
        controller.signal,
      )
    }
    operation
      .then((data) => {
        if (!controller.signal.aborted) {
          const lastPage = Math.max(1, Math.ceil(data.total / query.page_size))
          if (kind === 'documents' && query.page > lastPage) {
            console.info('[Workspace] Returning to last available page', {
              lastPage,
            })
            setQuery((current) => ({ ...current, page: lastPage }))
            return
          }
          setResult(data)
          console.info('[Workspace] Page loaded', { total: data.total })
        }
      })
      .catch((failure) => {
        if (!controller.signal.aborted) setError(failure.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [query, version, kind, review])
  /** Applies the supported server filters after validating the requested upload-date range. */
  function applyFilters(event) {
    event.preventDefault()
    console.info('[Workspace] Applying list filters')
    const values = new FormData(event.currentTarget)
    const filters = Object.fromEntries(values)
    if (
      filters.date_from &&
      filters.date_to &&
      filters.date_from > filters.date_to
    ) {
      console.warn('[Workspace] Invalid date range')
      setError('Từ ngày không được sau đến ngày.')
      return
    }
    setQuery((current) => ({ ...current, ...filters, page: 1 }))
  }
  /** Changes the server page without filtering only the rows already loaded. */
  function changePage(page) {
    console.debug('[Workspace] Changing page', { page })
    setQuery((current) => ({ ...current, page }))
  }
  /** Refreshes the filtered list after deletion, returning to the previous page when its last row was removed. */
  function handleDocumentDeleted() {
    console.info('[Workspace] Refreshing documents after deletion', {
      kind,
      page: query.page,
    })
    if (result?.items.length === 1 && query.page > 1) {
      setQuery((current) => ({ ...current, page: current.page - 1 }))
    } else {
      setVersion((current) => current + 1)
    }
  }
  /** Reloads retry results, stepping back if the last document leaves the current filtered page. */
  function handleDocumentRetried(updatedDocument) {
    console.info('[Workspace] Refreshing after extraction retry', {
      kind,
      documentId: updatedDocument.id,
    })
    const filteredStates = query.selected_states.length
      ? query.selected_states
      : kind === 'errors'
        ? states
        : []
    const leavesFilter =
      filteredStates.length > 0 &&
      !filteredStates.includes(updatedDocument.current_state)
    if (leavesFilter && result?.items.length === 1 && query.page > 1) {
      setQuery((current) => ({ ...current, page: current.page - 1 }))
    } else {
      setVersion((current) => current + 1)
    }
  }
  /** Applies a table-header status filter immediately while preserving the submitted search and dates. */
  function changeDocumentState(selectedStates) {
    console.info('[Workspace] Applying document status filter', {
      kind,
      selectedStates,
    })
    setQuery((current) => ({
      ...current,
      selected_states: selectedStates,
      page: 1,
    }))
  }
  /** Applies the review queue's single-status filter and returns to its first server page. */
  function changeReviewStatus(status) {
    console.info('[Workspace] Applying review status filter', { status })
    setQuery((current) => ({ ...current, status, page: 1 }))
  }
  const fieldClass =
    'h-10 rounded border border-slate-200 bg-white px-3 text-xs'
  return (
    <>
      <PageHeader title={titles[kind]} />
      <form
        onSubmit={applyFilters}
        className="mb-5 flex flex-wrap items-end gap-3"
      >
        {!review && (
          <>
            <input
              name="q"
              type="search"
              aria-label="Tìm tên tài liệu"
              placeholder="Tìm tên tài liệu..."
              className={fieldClass + ' min-w-[240px] flex-1'}
            />
            <label className="text-xs">
              Từ ngày
              <input
                name="date_from"
                type="date"
                className={'ml-2 ' + fieldClass}
              />
            </label>
            <label className="text-xs">
              Đến ngày
              <input
                name="date_to"
                type="date"
                className={'ml-2 ' + fieldClass}
              />
            </label>
          </>
        )}
        {!review && (
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-brand bg-brand px-5 text-xs font-semibold text-white transition-[background-color,border-color,box-shadow] duration-200 hover:border-[#074d39] hover:bg-[#074d39] hover:shadow-md"
          >
            <Search size={17} aria-hidden="true" />
            Tìm kiếm
          </button>
        )}
        <button
          type="button"
          disabled={loading}
          onClick={() => setVersion((current) => current + 1)}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-brand bg-white px-5 text-xs font-semibold text-brand transition-[background-color,box-shadow] duration-200 enabled:hover:bg-emerald-50 enabled:hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RotateCcw size={17} aria-hidden="true" />
          Làm mới
        </button>
      </form>
      {error && (
        <p role="alert" className="mb-4 text-sm text-red-600">
          {error}
        </p>
      )}
      {loading && (
        <p role="status" className="py-6 text-sm text-slate-500">
          Đang tải dữ liệu...
        </p>
      )}
      {review ? (
        <section className="min-w-0 rounded-md border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold">{titles[kind]}</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="p-3">Tài liệu</th>
                  <th className="p-3">Nhà cung cấp</th>
                  <th className="p-3">Lý do</th>
                  <th className="p-3">Ưu tiên</th>
                  <th className="p-3">
                    <div className="flex items-center gap-2">
                      <span>Trạng thái</span>
                      <ReviewStatusFilter
                        value={query.status}
                        onChange={changeReviewStatus}
                      />
                    </div>
                  </th>
                  <th className="p-3">Thời gian</th>
                  <th className="p-3">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {(result?.items || []).map((task) => (
                  <tr
                    key={task.id}
                    className="border-b border-slate-100 transition-colors hover:bg-emerald-50/60 focus-within:bg-emerald-50/60"
                  >
                    <td className="p-3">
                      {task.document_id ? (
                        <Link
                          to={'/approvals/' + task.document_id}
                          className="font-medium text-brand hover:underline"
                        >
                          {task.document_filename}
                        </Link>
                      ) : (
                        task.document_filename
                      )}
                    </td>
                    <td className="p-3">{task.vendor_name || '—'}</td>
                    <td className="p-3">{task.reason || '—'}</td>
                    <td className="p-3">{task.priority}</td>
                    <td className="p-3">
                      <span
                        className={
                          'inline-flex items-center gap-1.5 whitespace-nowrap rounded px-2 py-1 text-[10px] font-semibold ' +
                          (reviewStatuses[task.status]?.style ||
                            'bg-slate-100 text-slate-600')
                        }
                      >
                        <span className="size-1.5 rounded-full bg-current" />
                        {reviewStatuses[task.status]?.label || task.status}
                      </span>
                    </td>
                    <td className="p-3">
                      {task.created_at
                        ? new Date(task.created_at).toLocaleString('vi-VN', {
                            timeZone: 'Asia/Ho_Chi_Minh',
                          })
                        : '—'}
                    </td>
                    <td className="p-3">
                      {task.document_id ? (
                        <Link
                          to={'/approvals/' + task.document_id}
                          title="Duyệt tài liệu"
                          aria-label={
                            'Duyệt tài liệu: ' + task.document_filename
                          }
                          className="inline-flex size-8 items-center justify-center rounded-md border border-emerald-300 bg-emerald-50 text-brand transition-colors hover:border-emerald-400 hover:bg-emerald-100"
                        >
                          <Eye size={16} aria-hidden="true" />
                        </Link>
                      ) : (
                        <button
                          disabled
                          type="button"
                          title="Chưa có mã tài liệu để mở chi tiết"
                          aria-label={
                            'Chưa thể duyệt tài liệu: ' + task.document_filename
                          }
                          className="inline-flex size-8 cursor-not-allowed items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-400 opacity-50"
                        >
                          <Eye size={16} aria-hidden="true" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && !error && !result?.items.length && (
            <p className="py-8 text-center text-sm text-slate-500">
              Không có tác vụ phù hợp.
            </p>
          )}
        </section>
      ) : (
        <DocumentsTable
          documents={
            kind === 'documents'
              ? result?.items || []
              : loading || error
                ? []
                : result?.items || []
          }
          title={titles[kind]}
          invoices={kind === 'invoices'}
          loading={loading}
          onDeleted={handleDocumentDeleted}
          allowRetry={kind === 'documents' || kind === 'errors'}
          onRetried={handleDocumentRetried}
          statusFilter={{
            options: states.map((state) => ({
              value: state,
              label: documentStates[state],
            })),
            selected: query.selected_states,
            allLabel: kind === 'errors' ? 'Tất cả lỗi' : 'Tất cả trạng thái',
            onChange: changeDocumentState,
          }}
        />
      )}
      {kind === 'errors' && (
        <p className="mt-3 text-xs text-slate-500">
          Xem chi tiết tài liệu để đọc lỗi.
        </p>
      )}
      {result && (
        <footer className="mt-4 flex items-center justify-between text-xs text-slate-500">
          <span>
            {result.total} kết quả · Trang {result.page} /{' '}
            {Math.max(1, Math.ceil(result.total / result.page_size))}
          </span>
          <div className="flex gap-2">
            <Button
              aria-label="Trang trước"
              title="Trang trước"
              disabled={loading || result.page <= 1}
              onClick={() => changePage(result.page - 1)}
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </Button>
            <Button
              aria-label="Trang sau"
              title="Trang sau"
              disabled={
                loading || result.page * result.page_size >= result.total
              }
              onClick={() => changePage(result.page + 1)}
            >
              <ChevronRight size={18} aria-hidden="true" />
            </Button>
          </div>
        </footer>
      )}
    </>
  )
}
