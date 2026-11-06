import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { RotateCcw, Search } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import TablePagination from '../components/ui/TablePagination'
import DocumentsTable from '../components/documents/DocumentsTable'
import DocumentThumbnail from '../components/documents/DocumentThumbnail'
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

/** Translates known AI warnings in queue reasons while preserving unrecognized backend text. */
function formatReviewReason(reason) {
  console.debug('[Workspace] Formatting review reason')
  if (!reason) return '—'
  const messages = {
    FIELD_ABSENT: 'Trích xuất thiếu trường dữ liệu',
    QUANTITY_INFERRED: 'Kiểm tra lại số lượng của mặt hàng',
  }
  const parts = []
  for (const part of reason.split(';')) {
    const value = part.trim()
    let code = value
    if (value.startsWith('{')) {
      try {
        code = JSON.parse(value)?.code
      } catch {
        console.warn('[Workspace] Preserving unparseable review reason')
      }
    }
    parts.push(Object.hasOwn(messages, code) ? messages[code] : value)
  }
  console.debug('[Workspace] Review reason formatted', { count: parts.length })
  return parts.join('; ')
}

/** Hosts server document filters and the review queue within the shared dashboard layout. */
export default function WorkspacePage({ kind }) {
  const location = useLocation()
  console.debug('[Workspace] Rendering workspace', { kind })
  if (kind === 'upload') return <UploadPage />
  return <ServerWorkspace key={kind + ':' + location.key} kind={kind} />
}

/** Fetches paginated lists using only filters supported by the documented backend. */
function ServerWorkspace({ kind }) {
  console.debug('[Workspace] Rendering server list', { kind })
  const navigate = useNavigate()
  const review = kind === 'approvals'
  const states =
    kind === 'errors'
      ? ['EXTRACT_FAILED', 'UPLOADED_FAILED', 'PENDING_FAILURE']
      : kind === 'invoices'
        ? ['EXTRACT_SUCCESS', 'REVIEW_REQUIRED', 'EXTRACT_FAILED']
        : Object.keys(documentStates)
  const persistQuery = ['documents', 'errors', 'invoices'].includes(kind)
  const queryStorageKey = 'involens:workspace-query:' + kind
  /** Restores this document list's page and submitted filters when returning from details. */
  const [query, setQuery] = useState(() => {
    const defaults = {
      page: 1,
      page_size: ['documents', 'invoices', 'approvals'].includes(kind) ? 8 : 10,
      selected_states: [],
      status: review ? 'PENDING' : '',
    }
    if (!persistQuery) return defaults
    console.debug('[Workspace] Restoring saved list query', { kind })
    try {
      const saved = JSON.parse(
        sessionStorage.getItem(queryStorageKey) || 'null',
      )
      if (!saved || typeof saved !== 'object' || Array.isArray(saved))
        return defaults
      const restored = {
        ...defaults,
        page:
          Number.isInteger(saved.page) && saved.page > 0
            ? saved.page
            : defaults.page,
        page_size:
          Number.isInteger(saved.page_size) && saved.page_size > 0
            ? saved.page_size
            : defaults.page_size,
        selected_states: Array.isArray(saved.selected_states)
          ? saved.selected_states.filter((state) => states.includes(state))
          : [],
        q: typeof saved.q === 'string' ? saved.q : '',
        date_from: typeof saved.date_from === 'string' ? saved.date_from : '',
        date_to: typeof saved.date_to === 'string' ? saved.date_to : '',
      }
      console.info('[Workspace] Saved list query restored', {
        kind,
        page: restored.page,
      })
      return restored
    } catch (failure) {
      console.warn('[Workspace] Could not restore list query', {
        kind,
        message: failure.message,
      })
      return defaults
    }
  })
  /** Keeps each document list's pagination and applied filters available within the current tab. */
  useEffect(() => {
    if (!persistQuery) return
    console.debug('[Workspace] Saving list query', { kind, page: query.page })
    try {
      sessionStorage.setItem(queryStorageKey, JSON.stringify(query))
    } catch (failure) {
      console.warn('[Workspace] Could not save list query', {
        kind,
        message: failure.message,
      })
    }
  }, [kind, persistQuery, queryStorageKey, query])
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
          q: query.q,
          date_from: query.date_from,
          date_to: query.date_to,
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
          if (!review && query.page > lastPage) {
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
  /** Reloads the first page with the chosen row count while preserving the active filters. */
  function changePageSize(pageSize) {
    console.info('[Workspace] Changing rows per page', { kind, pageSize })
    setQuery((current) => ({ ...current, page: 1, page_size: pageSize }))
  }
  /** Reloads the active filter after deletion; the response determines the last valid page. */
  function handleDocumentDeleted() {
    console.info('[Workspace] Refreshing documents after deletion', {
      kind,
      page: query.page,
    })
    setVersion((current) => current + 1)
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
  /** Opens the review document from a queue row while preserving its links and action buttons. */
  function openReviewRow(event) {
    if (event.target.closest('a, button')) return
    const destination = event.currentTarget.dataset.destination
    if (!destination) {
      console.debug('[Workspace] Review row has no document to open')
      return
    }
    console.info('[Workspace] Opening review document from row', {
      destination,
    })
    navigate(destination)
    console.debug('[Workspace] Review document navigation requested', {
      destination,
    })
  }
  const fieldClass =
    'h-10 rounded border border-slate-200 bg-white px-3 text-xs'
  const pagination = result && (
    <TablePagination
      page={result.page}
      pageSize={result.page_size}
      total={result.total}
      loading={loading}
      onPageChange={changePage}
      onPageSizeChange={changePageSize}
    />
  )
  return (
    <>
      <PageHeader title={titles[kind]} />
      <form
        onSubmit={applyFilters}
        className="mb-5 flex flex-wrap items-end gap-3"
      >
        <input
          name="q"
          defaultValue={query.q || ''}
          type="search"
          aria-label="Tìm tên tài liệu"
          placeholder={
            kind === 'documents' || review
              ? 'Tìm theo tên file hoặc họ tên người tải...'
              : kind === 'invoices'
                ? 'Tìm theo tên file, họ tên người tải hoặc tên nhà cung cấp...'
                : 'Tìm tên tài liệu...'
          }
          className={fieldClass + ' min-w-[240px] flex-1'}
        />
        <label className="text-xs">
          Từ ngày
          <input
            name="date_from"
            defaultValue={query.date_from || ''}
            type="date"
            className={'ml-2 ' + fieldClass}
          />
        </label>
        <label className="text-xs">
          Đến ngày
          <input
            name="date_to"
            defaultValue={query.date_to || ''}
            type="date"
            className={'ml-2 ' + fieldClass}
          />
        </label>
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-brand bg-brand px-5 text-xs font-semibold text-white transition-[background-color,border-color,box-shadow] duration-200 hover:border-[#074d39] hover:bg-[#074d39] hover:shadow-md"
        >
          <Search size={17} aria-hidden="true" />
          Tìm kiếm
        </button>
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
            <table className="w-full min-w-[700px] table-fixed text-left text-xs">
              <colgroup>
                <col style={{ width: '28%' }} />
                <col style={{ width: '22%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '12%' }} />
              </colgroup>
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="p-3">Tài liệu</th>
                  <th className="p-3">Nhà cung cấp</th>
                  <th className="p-3">Lý do</th>
                  <th className="p-3">Thời gian</th>
                  <th className="p-3">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {(result?.items || []).map((task) => (
                  <tr
                    key={task.id}
                    data-destination={
                      task.document_id
                        ? '/approvals/' + task.document_id
                        : undefined
                    }
                    onClick={openReviewRow}
                    className={
                      'border-b border-slate-100 transition-colors hover:bg-emerald-50/60 focus-within:bg-emerald-50/60' +
                      (task.document_id ? ' cursor-pointer' : '')
                    }
                  >
                    <td className="truncate p-3" title={task.document_filename}>
                      <div className="flex items-center gap-2">
                        <DocumentThumbnail
                          key={task.thumbnail_url || 'no-thumbnail'}
                          thumbnailUrl={task.thumbnail_url}
                        />
                        {task.document_id ? (
                          <Link
                            to={'/approvals/' + task.document_id}
                            className="min-w-0 truncate font-medium text-brand hover:underline"
                          >
                            {task.document_filename}
                          </Link>
                        ) : (
                          <span className="min-w-0 truncate">
                            {task.document_filename}
                          </span>
                        )}
                      </div>
                    </td>
                    <td
                      className="truncate p-3"
                      title={task.vendor_name || '—'}
                    >
                      {task.vendor_name || '—'}
                    </td>
                    <td className="p-3">
                      <span
                        title={formatReviewReason(task.reason)}
                        className="inline-block max-w-full truncate rounded bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700"
                      >
                        {formatReviewReason(task.reason)}
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
                          className="inline-flex h-8 items-center justify-center rounded-md border border-brand bg-brand px-3 font-semibold text-white transition-[background-color,border-color,box-shadow] duration-200 hover:border-[#074d39] hover:bg-[#074d39] hover:shadow-md"
                        >
                          Duyệt
                        </Link>
                      ) : (
                        <button
                          disabled
                          type="button"
                          title="Chưa có mã tài liệu để mở chi tiết"
                          aria-label={
                            'Chưa thể duyệt tài liệu: ' + task.document_filename
                          }
                          className="inline-flex h-8 cursor-not-allowed items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-3 font-semibold text-slate-400 opacity-50"
                        >
                          Duyệt
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
          {pagination}
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
          allowSelection={['documents', 'errors', 'invoices'].includes(kind)}
          loading={loading}
          footer={pagination}
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
    </>
  )
}
