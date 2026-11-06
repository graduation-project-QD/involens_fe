import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Check,
  ChevronDown,
  Eye,
  Filter,
  ListFilter,
  LoaderCircle,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import StatusBadge from '../ui/StatusBadge'
import DocumentThumbnail from './DocumentThumbnail'
import {
  canRetryExtraction,
  deleteDocuments,
  retryExtraction,
} from '../../api/documents'

const statusColors = {
  UPLOADED: { text: 'text-slate-600', selected: 'bg-slate-100' },
  PROCESSING: { text: 'text-blue-600', selected: 'bg-blue-50' },
  EXTRACT_SUCCESS: { text: 'text-emerald-700', selected: 'bg-emerald-50' },
  REVIEW_REQUIRED: { text: 'text-amber-700', selected: 'bg-amber-50' },
  EXTRACT_FAILED: { text: 'text-red-600', selected: 'bg-red-50' },
  UPLOADED_FAILED: { text: 'text-red-600', selected: 'bg-red-50' },
  PENDING_FAILURE: { text: 'text-orange-600', selected: 'bg-orange-50' },
}

/** Presents multi-state filtering without closing the menu when document results reload. */
function TableStatusFilter({ options, selected, allLabel, onChange }) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  const allSelected = !selected.length || selected.length === options.length
  const label = allSelected
    ? allLabel
    : selected.length === 1
      ? options.find((option) => option.value === selected[0])?.label
      : selected.length + ' trạng thái'

  /** Positions the menu outside the table's scroll container, keeping it within the viewport. */
  function positionMenu() {
    const bounds = triggerRef.current.getBoundingClientRect()
    const width = Math.min(224, window.innerWidth - 24)
    setPosition({
      top: Math.min(bounds.bottom + 6, Math.max(12, window.innerHeight - 280)),
      left: Math.max(12, Math.min(bounds.left, window.innerWidth - width - 12)),
    })
  }

  /** Toggles the state menu from its filter trigger. */
  function toggleMenu() {
    console.debug('[DocumentsTable] Toggling status menu', { open: !open })
    positionMenu()
    setOpen(!open)
  }

  /** Applies one checkbox selection immediately while keeping the menu open; no selections means all. */
  function selectState(event) {
    const value = event.currentTarget.value
    const activeStates = allSelected
      ? options.map((option) => option.value)
      : selected
    const next =
      value === ''
        ? []
        : activeStates.includes(value)
          ? activeStates.filter((state) => state !== value)
          : [...activeStates, value]
    console.info('[DocumentsTable] Updating selected statuses', {
      selected: next,
    })
    onChange(next.length === options.length ? [] : next)
  }

  /** Keeps the menu aligned during scrolling and closes it only on an outside pointer action. */
  useEffect(() => {
    if (!open) return
    console.debug('[DocumentsTable] Observing open status menu')
    /** Dismisses the filter menu when the user presses outside its menu and trigger. */
    function handleOutsidePointer(event) {
      if (
        triggerRef.current?.contains(event.target) ||
        menuRef.current?.contains(event.target)
      )
        return
      console.debug('[DocumentsTable] Closing status menu from outside click')
      setOpen(false)
    }
    document.addEventListener('pointerdown', handleOutsidePointer)
    window.addEventListener('resize', positionMenu)
    window.addEventListener('scroll', positionMenu, true)
    return () => {
      document.removeEventListener('pointerdown', handleOutsidePointer)
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
        aria-label={'Lọc trạng thái: ' + label}
        className={
          'inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md border bg-white px-2 text-[11px] font-medium transition-colors hover:border-brand/50 ' +
          (selected.length === 1
            ? statusColors[selected[0]].text
            : 'text-brand') +
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
            ref={menuRef}
            role="group"
            aria-label="Chọn trạng thái tài liệu"
            style={position}
            className="fixed z-50 max-h-[min(260px,calc(100vh-24px))] w-56 max-w-[calc(100vw-24px)] overflow-y-auto rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg"
          >
            {[{ value: '', label: allLabel }, ...options].map((option) => {
              const checked =
                option.value === ''
                  ? allSelected
                  : allSelected || selected.includes(option.value)
              const colors = statusColors[option.value] || {
                text: 'text-brand',
                selected: 'bg-emerald-50',
              }
              return (
                <button
                  key={option.value}
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  value={option.value}
                  onClick={selectState}
                  className={
                    'flex min-h-8 w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors ' +
                    colors.text +
                    ' ' +
                    (checked
                      ? colors.selected + ' font-semibold'
                      : 'hover:bg-slate-50')
                  }
                >
                  {option.value === '' && (
                    <ListFilter size={14} aria-hidden="true" />
                  )}
                  <span className="flex-1">{option.label}</span>
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

/** Displays server documents with confirmed deletion and optional AI retry actions that refresh the parent list. */
export default function DocumentsTable({
  documents = [],
  title = 'Tài liệu gần đây',
  invoices = false,
  statusFilter = null,
  loading = false,
  onDeleted,
  allowRetry = false,
  onRetried,
  showAllDocumentsLink = false,
  dashboard = false,
  allowSelection = false,
  footer = null,
}) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const selectionStorageKey = 'involens:document-selection:' + pathname
  /** Restores this list's selected documents when returning from details or reloading the tab. */
  const [selectedIds, setSelectedIds] = useState(() => {
    if (!allowSelection) return []
    console.debug('[DocumentsTable] Restoring saved selection', { pathname })
    try {
      const savedIds = JSON.parse(
        sessionStorage.getItem(selectionStorageKey) || '[]',
      )
      if (
        !Array.isArray(savedIds) ||
        savedIds.some((id) => typeof id !== 'string')
      ) {
        console.warn('[DocumentsTable] Ignoring invalid saved selection', {
          pathname,
        })
        return []
      }
      console.debug('[DocumentsTable] Selection restored', {
        pathname,
        count: savedIds.length,
      })
      return [...new Set(savedIds)]
    } catch (failure) {
      console.warn('[DocumentsTable] Could not restore selection', {
        pathname,
        message: failure.message,
      })
      return []
    }
  })
  const pageIds = [
    ...new Set(
      documents.map((document) =>
        invoices ? document.document_id : document.id,
      ),
    ),
  ]
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id))
  const somePageSelected = pageIds.some((id) => selectedIds.includes(id))
  const [deletingId, setDeletingId] = useState(null)
  const [deleteError, setDeleteError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const deleteDialogRef = useRef(null)
  const deleteTitleId = useId()
  const deleteDescriptionId = useId()
  const deletePendingRef = useRef(false)
  const retryPendingRef = useRef(false)
  const [retryingId, setRetryingId] = useState(null)
  const [retryError, setRetryError] = useState('')
  const [retryNotice, setRetryNotice] = useState(0)
  const selectionDisabled =
    loading || deletingId !== null || retryingId !== null
  const selectPageRef = useRef(null)

  /** Persists selection changes, including deselection and successful deletions, for this list in the current tab. */
  useEffect(() => {
    if (!allowSelection) return
    console.debug('[DocumentsTable] Saving list selection', {
      pathname,
      count: selectedIds.length,
    })
    try {
      if (selectedIds.length)
        sessionStorage.setItem(selectionStorageKey, JSON.stringify(selectedIds))
      else sessionStorage.removeItem(selectionStorageKey)
    } catch (failure) {
      console.warn('[DocumentsTable] Could not save selection', {
        pathname,
        message: failure.message,
      })
    }
  }, [allowSelection, pathname, selectionStorageKey, selectedIds])

  /** Shows partial selection when only some documents on the visible page are selected. */
  useEffect(() => {
    console.debug('[DocumentsTable] Updating page selection indicator', {
      allPageSelected,
      somePageSelected,
    })
    if (selectPageRef.current)
      selectPageRef.current.indeterminate = somePageSelected && !allPageSelected
  }, [allPageSelected, somePageSelected, allowSelection])

  /** Updates one document selection while retaining selections from other pages and filters. */
  function toggleDocumentSelection(event) {
    if (selectionDisabled) return
    const id = event.currentTarget.value
    const checked = event.currentTarget.checked
    console.info('[DocumentsTable] Changing document selection', {
      documentId: id,
      checked,
    })
    setSelectedIds((current) =>
      checked
        ? [...new Set([...current, id])]
        : current.filter((selectedId) => selectedId !== id),
    )
  }

  /** Selects or deselects only visible documents, preserving selections outside the current page. */
  function togglePageSelection() {
    if (selectionDisabled) return
    console.info('[DocumentsTable] Changing current page selection', {
      selected: !allPageSelected,
      count: pageIds.length,
    })
    setSelectedIds((current) =>
      allPageSelected
        ? current.filter((id) => !pageIds.includes(id))
        : [...new Set([...current, ...pageIds])],
    )
  }

  /** Clears all selected documents, including those on other pages or outside the active filter. */
  function clearSelection() {
    if (selectionDisabled) return
    console.info('[DocumentsTable] Clearing document selection')
    setSelectedIds([])
  }

  /** Freezes the selected IDs for confirmation before requesting an atomic batch deletion. */
  function requestSelectedDelete() {
    if (selectionDisabled || !selectedIds.length) return
    console.info('[DocumentsTable] Requesting batch deletion confirmation', {
      count: selectedIds.length,
    })
    setDeleteError('')
    setDeleteTarget({ documentIds: [...selectedIds], bulk: true })
  }
  console.debug('[DocumentsTable] Rendering server documents', {
    count: documents.length,
  })
  /** Dismisses successful AI dispatch feedback after three seconds and clears its timer on unmount. */
  useEffect(() => {
    if (!retryNotice) return
    console.debug('[DocumentsTable] Scheduling retry notice dismissal')
    const timer = window.setTimeout(() => {
      console.debug('[DocumentsTable] Retry notice dismissed')
      setRetryNotice(0)
    }, 3000)
    return () => window.clearTimeout(timer)
  }, [retryNotice])

  /** Resubmits an eligible row once, then refreshes the parent list and navigation totals. */
  async function handleRetry(event) {
    event.stopPropagation()
    if (
      retryPendingRef.current ||
      deletePendingRef.current ||
      loading ||
      !allowRetry
    )
      return
    const { documentId, state } = event.currentTarget.dataset
    if (!canRetryExtraction(state)) return
    console.info('[DocumentsTable] Starting extraction retry', { documentId })
    retryPendingRef.current = true
    setRetryingId(documentId)
    setRetryError('')
    setRetryNotice(0)
    try {
      const updatedDocument = await retryExtraction(documentId)
      console.info('[DocumentsTable] Extraction retry dispatched', {
        documentId,
        state: updatedDocument.current_state,
      })
      setRetryNotice(Date.now())
      onRetried?.(updatedDocument)
      window.dispatchEvent(new Event('involens:documents-changed'))
    } catch (failure) {
      console.error('[DocumentsTable] Extraction retry failed', {
        documentId,
        message: failure.message,
      })
      setRetryError(failure.message)
    } finally {
      retryPendingRef.current = false
      setRetryingId(null)
    }
  }
  /** Opens the row's document or invoice details while preserving its existing links. */
  function openDocumentRow(event) {
    if (event.target.closest('a, button, input, label')) return
    const destination = event.currentTarget.dataset.destination
    console.info('[DocumentsTable] Opening document from row', { destination })
    navigate(destination)
    console.debug('[DocumentsTable] Document navigation requested', {
      destination,
    })
  }

  /** Opens a centered confirmation for the selected document without navigating its row. */
  function requestDelete(event) {
    event.stopPropagation()
    if (deletePendingRef.current || retryPendingRef.current) return
    const { documentId, filename } = event.currentTarget.dataset
    console.info('[DocumentsTable] Requesting deletion confirmation', {
      documentId,
    })
    setDeleteError('')
    setDeleteTarget({ documentIds: [documentId], filename })
  }

  /** Keeps the native modal open for confirmation and errors, with background interaction blocked. */
  useEffect(() => {
    const dialog = deleteDialogRef.current
    if (deleteTarget && !dialog.open) {
      console.debug('[DocumentsTable] Opening delete dialog')
      dialog.showModal()
    } else if (!deleteTarget && dialog.open) {
      console.debug('[DocumentsTable] Closing delete dialog')
      dialog.close()
    }
  }, [deleteTarget])

  /** Cancels deletion before the API request starts; pending deletions keep their dialog open. */
  function cancelDelete(event) {
    event?.preventDefault()
    if (deletePendingRef.current) return
    console.debug('[DocumentsTable] Document deletion cancelled')
    setDeleteTarget(null)
    setDeleteError('')
  }

  /** Dismisses confirmation when the user clicks the backdrop outside the dialog. */
  function handleDeleteBackdrop(event) {
    if (event.target !== event.currentTarget) return
    const bounds = event.currentTarget.getBoundingClientRect()
    if (
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom
    ) {
      cancelDelete(event)
    }
  }

  /** Deletes only after confirmation, preventing duplicate requests and retaining errors inside the dialog. */
  async function handleDelete() {
    if (deletePendingRef.current || !deleteTarget) return
    const { documentIds, filename, bulk } = deleteTarget
    console.info('[DocumentsTable] Starting confirmed deletion', {
      count: documentIds.length,
    })
    deletePendingRef.current = true
    setDeletingId(documentIds[0])
    setDeleteError('')
    try {
      await deleteDocuments(documentIds)
      console.info('[DocumentsTable] Documents deleted', {
        count: documentIds.length,
      })
      setSelectedIds((current) =>
        current.filter((id) => !documentIds.includes(id)),
      )
      setDeleteTarget(null)
      window.dispatchEvent(
        new CustomEvent('involens:document-deleted', {
          detail: { filename, count: bulk ? documentIds.length : undefined },
        }),
      )
      onDeleted?.(documentIds)
      window.dispatchEvent(new Event('involens:documents-changed'))
    } catch (failure) {
      console.error('[DocumentsTable] Document deletion failed', {
        documentIds,
        message: failure.message,
      })
      setDeleteError(failure.message)
    } finally {
      deletePendingRef.current = false
      setDeletingId(null)
    }
  }

  return (
    <section
      className={
        dashboard
          ? 'min-w-0 rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_4px_16px_-8px_rgba(15,23,42,0.12)] sm:p-6 [&>h2]:uppercase [&_dialog_h2]:uppercase [&_td]:py-4 [&_thead]:bg-[#f0f5f4] [&_th]:text-[10px] [&_th]:font-medium [&_th]:uppercase [&_th]:tracking-wider [&_th:first-child]:rounded-l-lg [&_th:last-child]:rounded-r-lg'
          : 'min-w-0 rounded-md border border-slate-200 bg-white p-5'
      }
    >
      <h2 className="mb-4 text-sm font-semibold">{title}</h2>
      {retryNotice > 0 && (
        <div
          role="status"
          className="fixed right-4 top-4 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-lg"
        >
          <Check size={20} aria-hidden="true" />
          Đã gửi trích xuất lại
        </div>
      )}
      {retryError && (
        <p
          role="alert"
          className="mb-4 rounded bg-red-50 p-3 text-xs text-red-600"
        >
          {retryError}
        </p>
      )}
      <dialog
        ref={deleteDialogRef}
        aria-labelledby={deleteTitleId}
        aria-describedby={deleteDescriptionId}
        onCancel={cancelDelete}
        onClick={handleDeleteBackdrop}
        className="m-auto w-[calc(100%_-_32px)] max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-slate-800 shadow-2xl backdrop:bg-slate-900/45 backdrop:backdrop-blur-sm"
      >
        <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-red-50 text-red-600">
          <Trash2 size={24} aria-hidden="true" />
        </div>
        <h2 id={deleteTitleId} className="text-lg font-semibold">
          {deleteTarget?.bulk
            ? `Xóa ${deleteTarget.documentIds.length} tài liệu?`
            : 'Xóa tài liệu?'}
        </h2>
        <p
          id={deleteDescriptionId}
          className="mt-2 text-sm leading-6 text-slate-500"
        >
          {deleteTarget?.bulk ? (
            `Bạn có chắc chắn muốn xóa ${deleteTarget.documentIds.length} tài liệu đã chọn?`
          ) : (
            <>
              Bạn có chắc muốn xóa tài liệu{' '}
              <span className="break-all font-semibold text-slate-800">
                “{deleteTarget?.filename}”
              </span>
              ?
            </>
          )}
        </p>
        {deleteError && (
          <p
            role="alert"
            className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600"
          >
            {deleteError}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            autoFocus
            onClick={cancelDelete}
            disabled={deletingId !== null}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deletingId !== null}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deletingId !== null ? (
              <LoaderCircle
                size={16}
                className="animate-spin"
                aria-hidden="true"
              />
            ) : (
              <Trash2 size={16} aria-hidden="true" />
            )}
            {deletingId !== null
              ? 'Đang xóa…'
              : deleteTarget?.bulk
                ? `Xóa ${deleteTarget.documentIds.length} tài liệu`
                : 'Xóa tài liệu'}
          </button>
        </div>
      </dialog>
      {allowSelection && selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-t-lg bg-emerald-50 px-3 py-3 text-xs text-brand">
          <span role="status" className="font-semibold">
            Đã chọn {selectedIds.length} tài liệu
          </span>
          <button
            type="button"
            onClick={togglePageSelection}
            disabled={selectionDisabled || !pageIds.length}
            className="underline disabled:opacity-50"
          >
            {allPageSelected
              ? 'Bỏ chọn trang hiện tại'
              : 'Chọn tất cả trang hiện tại'}
          </button>
          <button
            type="button"
            onClick={requestSelectedDelete}
            disabled={selectionDisabled}
            className="ml-auto inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            <Trash2 size={14} aria-hidden="true" />
            Xóa {selectedIds.length} tài liệu
          </button>
          <button
            type="button"
            onClick={clearSelection}
            disabled={selectionDisabled}
            className="font-semibold hover:underline disabled:opacity-50"
          >
            Bỏ chọn
          </button>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] table-fixed text-left text-xs">
          <colgroup>
            {allowSelection && <col style={{ width: '5%' }} />}
            <col
              style={{
                width: invoices
                  ? allowSelection
                    ? '19%'
                    : '24%'
                  : allowSelection
                    ? '29%'
                    : '34%',
              }}
            />
            {invoices && <col style={{ width: '18%' }} />}
            <col style={{ width: invoices ? '14%' : '18%' }} />
            <col style={{ width: '18%' }} />
            <col style={{ width: invoices ? '16%' : '20%' }} />
            <col style={{ width: '10%' }} />
          </colgroup>
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              {allowSelection && (
                <th className="p-3">
                  <input
                    ref={selectPageRef}
                    type="checkbox"
                    aria-label="Chọn tất cả tài liệu trang hiện tại"
                    checked={allPageSelected}
                    disabled={selectionDisabled || !pageIds.length}
                    onChange={togglePageSelection}
                    className="size-4 cursor-pointer accent-brand"
                  />
                </th>
              )}
              <th className="p-3">Tên tài liệu</th>
              {invoices && <th className="p-3">Nhà cung cấp</th>}
              <th className="p-3">Người tải lên</th>
              <th className="p-3">Thời gian tải lên</th>
              <th className="p-3">
                <div className="flex items-center gap-2">
                  <span>Trạng thái</span>
                  {statusFilter && <TableStatusFilter {...statusFilter} />}
                </div>
              </th>
              <th className="p-3">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((document) => {
              const documentId = invoices ? document.document_id : document.id
              return (
                <tr
                  key={documentId}
                  data-destination={
                    '/' +
                    (invoices ? 'invoices' : 'documents') +
                    '/' +
                    documentId
                  }
                  onClick={openDocumentRow}
                  className={
                    'cursor-pointer border-b border-slate-100 transition-colors hover:bg-emerald-50/60 focus-within:bg-emerald-50/60' +
                    (allowSelection && selectedIds.includes(documentId)
                      ? ' bg-emerald-50'
                      : '')
                  }
                >
                  {allowSelection && (
                    <td className="p-3">
                      <input
                        type="checkbox"
                        aria-label={
                          'Chọn tài liệu: ' + document.original_filename
                        }
                        value={documentId}
                        checked={selectedIds.includes(documentId)}
                        disabled={selectionDisabled}
                        onChange={toggleDocumentSelection}
                        className="size-4 cursor-pointer accent-brand"
                      />
                    </td>
                  )}
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <DocumentThumbnail
                        key={document.thumbnail_url || 'no-thumbnail'}
                        thumbnailUrl={document.thumbnail_url}
                      />
                      <div className="min-w-0 flex-1">
                        <Link
                          className="block truncate font-medium text-brand hover:underline"
                          title={document.original_filename}
                          to={
                            '/' +
                            (invoices ? 'invoices' : 'documents') +
                            '/' +
                            documentId
                          }
                        >
                          {document.original_filename}
                        </Link>
                        <p
                          className="mt-1 truncate text-[10px] text-slate-400"
                          title={documentId}
                        >
                          {documentId}
                        </p>
                      </div>
                    </div>
                  </td>
                  {invoices && (
                    <td
                      className="truncate p-3"
                      title={document.seller_name || '—'}
                    >
                      {document.seller_name || '—'}
                    </td>
                  )}
                  <td
                    className="truncate p-3"
                    title={document.uploaded_by_name || '—'}
                  >
                    {document.uploaded_by_name || '—'}
                  </td>
                  <td className="p-3">
                    {document.uploaded_at
                      ? new Date(document.uploaded_at).toLocaleString('vi-VN', {
                          timeZone: 'Asia/Ho_Chi_Minh',
                        })
                      : '—'}
                  </td>
                  <td className="p-3">
                    <StatusBadge status={document.current_state} />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Link
                        title={invoices ? 'Kiểm tra hóa đơn' : 'Xem tài liệu'}
                        aria-label={
                          (invoices ? 'Kiểm tra hóa đơn: ' : 'Xem tài liệu: ') +
                          document.original_filename
                        }
                        className="inline-flex size-8 items-center justify-center rounded-md border border-emerald-300 bg-emerald-50 text-brand transition-colors hover:border-emerald-400 hover:bg-emerald-100"
                        to={
                          '/' +
                          (invoices ? 'invoices' : 'documents') +
                          '/' +
                          documentId
                        }
                      >
                        <Eye size={16} aria-hidden="true" />
                      </Link>
                      <button
                        type="button"
                        title={
                          deletingId === documentId
                            ? 'Đang xóa...'
                            : 'Xóa tài liệu'
                        }
                        aria-label={
                          'Xóa tài liệu: ' + document.original_filename
                        }
                        data-document-id={documentId}
                        data-filename={document.original_filename}
                        disabled={
                          loading || deletingId !== null || retryingId !== null
                        }
                        onClick={requestDelete}
                        className="inline-flex size-8 items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-600 transition-colors hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deletingId === documentId ? (
                          <LoaderCircle
                            size={16}
                            className="animate-spin"
                            aria-hidden="true"
                          />
                        ) : (
                          <Trash2 size={16} aria-hidden="true" />
                        )}
                      </button>
                      {allowRetry &&
                        canRetryExtraction(document.current_state) && (
                          <button
                            type="button"
                            title={
                              retryingId === documentId
                                ? 'Đang gửi…'
                                : 'Trích xuất lại'
                            }
                            aria-label={
                              'Trích xuất lại: ' + document.original_filename
                            }
                            data-document-id={documentId}
                            data-state={document.current_state}
                            disabled={
                              loading ||
                              retryingId !== null ||
                              deletingId !== null
                            }
                            onClick={handleRetry}
                            className="inline-flex size-8 items-center justify-center rounded-md border border-blue-200 bg-blue-50 text-blue-600 transition-colors hover:border-blue-300 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {retryingId === documentId ? (
                              <LoaderCircle
                                size={16}
                                className="animate-spin"
                                aria-hidden="true"
                              />
                            ) : (
                              <RefreshCw size={16} aria-hidden="true" />
                            )}
                          </button>
                        )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {!loading && !documents.length && (
        <p className="py-8 text-center text-sm text-slate-500">
          Không có tài liệu phù hợp.
        </p>
      )}
      {footer}
      {showAllDocumentsLink && (
        <Link
          to="/documents"
          className="mt-4 flex justify-center border-t border-slate-200 pt-4 text-sm font-semibold text-brand transition-colors hover:text-emerald-700"
        >
          Xem tất cả tài liệu →
        </Link>
      )}
    </section>
  )
}
