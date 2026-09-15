import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Eye, Search, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import StatusBadge from '../ui/StatusBadge'

const PAGE_SIZE = 8
const statusLabels = {
  success: 'Thành công',
  pending: 'Chờ duyệt',
  processing: 'Đang xử lý',
  error: 'Lỗi xử lý',
  rejected: 'Từ chối',
}

/**
 * Hiển thị danh sách tài liệu; chế độ quản lý cung cấp tìm kiếm, lọc,
 * phân trang, xem thông tin và xóa tài liệu khỏi dữ liệu giao diện.
 */
export default function DocumentsTable({
  documents,
  title = 'Tài liệu gần đây',
  management = false,
  invoices = false,
  approvals = false,
}) {
  console.debug('[DocumentsTable] Rendering document list', {
    count: documents.length,
    management,
    invoices,
    approvals,
  })
  const [items, setItems] = useState(documents)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatuses, setSelectedStatuses] = useState([])
  const [selectedUploaders, setSelectedUploaders] = useState([])
  const [selectedSuppliers, setSelectedSuppliers] = useState([])
  const [selectedDate, setSelectedDate] = useState('')
  const [page, setPage] = useState(1)
  const navigate = useNavigate()

  useEffect(() => {
    console.debug('[DocumentsTable] Synchronizing source documents', {
      count: documents.length,
    })
    setItems(documents)
  }, [documents])

  const statuses = useMemo(
    () => [...new Set(items.map((document) => document.status))],
    [items],
  )
  const uploaders = useMemo(
    () => [...new Set(items.map((document) => document.uploader))],
    [items],
  )
  const suppliers = useMemo(
    () => [...new Set(items.map((document) => document.supplier).filter(Boolean))],
    [items],
  )
  const dates = useMemo(
    () => [...new Set(items.map((document) => document.date))],
    [items],
  )
  const filteredDocuments = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase('vi')
    const result = items.filter((document) => {
      const matchesSearch = document.name
        .toLocaleLowerCase('vi')
        .includes(normalizedSearch)
      const matchesStatus =
        selectedStatuses.length === 0 ||
        selectedStatuses.includes(document.status)
      const matchesUploader =
        selectedUploaders.length === 0 ||
        selectedUploaders.includes(document.uploader)
      const matchesSupplier =
        selectedSuppliers.length === 0 ||
        selectedSuppliers.includes(document.supplier)
      const matchesDate = !selectedDate || document.date === selectedDate
      return (
        matchesSearch &&
        matchesStatus &&
        matchesUploader &&
        matchesSupplier &&
        matchesDate
      )
    })
    console.debug('[DocumentsTable] Applied document filters', {
      resultCount: result.length,
    })
    return result
  }, [
    items,
    searchTerm,
    selectedStatuses,
    selectedUploaders,
    selectedSuppliers,
    selectedDate,
  ])

  const totalPages = Math.max(1, Math.ceil(filteredDocuments.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const hasTableControls = management || invoices
  const hasActions = hasTableControls || approvals
  const visibleDocuments = hasTableControls
    ? filteredDocuments.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE,
      )
    : filteredDocuments

  /** Cập nhật chuỗi tìm kiếm và trở về trang kết quả đầu tiên. */
  function handleSearchChange(event) {
    console.debug('[DocumentsTable] Updating document search')
    setSearchTerm(event.target.value)
    setPage(1)
  }

  /** Cập nhật bộ lọc thời gian và trở về trang kết quả đầu tiên. */
  function handleDateChange(event) {
    console.debug('[DocumentsTable] Updating date filter', {
      date: event.target.value || 'all',
    })
    setSelectedDate(event.target.value)
    setPage(1)
  }

  /** Thêm hoặc bỏ một giá trị trong bộ lọc nhiều lựa chọn. */
  function toggleFilter(value, selectedValues, setSelectedValues, filterName) {
    const isRemoving = selectedValues.includes(value)
    console.debug('[DocumentsTable] Updating multi-select filter', {
      filterName,
      action: isRemoving ? 'remove' : 'add',
    })
    setSelectedValues(
      isRemoving
        ? selectedValues.filter((item) => item !== value)
        : [...selectedValues, value],
    )
    setPage(1)
  }

  /** Điều hướng người dùng tới trang chi tiết của tài liệu đã chọn. */
  function viewDocument(document) {
    console.debug('[DocumentsTable] Navigating to document details', {
      documentId: document.documentId,
    })
    navigate(`/documents/${document.documentId}`)
  }

  /** Cho phép mở chi tiết bằng bàn phím khi một hàng tài liệu đang được focus. */
  function handleRowKeyDown(event, document) {
    if (event.target !== event.currentTarget) return
    if (event.key !== 'Enter' && event.key !== ' ') return
    console.debug('[DocumentsTable] Opening focused document row', {
      documentId: document.documentId,
    })
    event.preventDefault()
    viewDocument(document)
  }

  /** Xác nhận và xóa tài liệu khỏi danh sách cục bộ của giao diện tĩnh. */
  function deleteDocument(document) {
    console.debug('[DocumentsTable] Requesting local document deletion', {
      documentId: document.documentId,
    })
    if (!window.confirm(`Bạn có chắc muốn xóa “${document.name}”?`)) {
      console.debug('[DocumentsTable] Local document deletion cancelled')
      return
    }
    setItems((currentItems) =>
      currentItems.filter((item) => item.id !== document.id),
    )
    console.debug('[DocumentsTable] Document removed from local list', {
      documentId: document.documentId,
    })
  }

  /** Chuyển trang kết quả trong giới hạn phân trang hiện tại. */
  function changePage(nextPage) {
    const boundedPage = Math.min(Math.max(nextPage, 1), totalPages)
    console.debug('[DocumentsTable] Changing document page', {
      page: boundedPage,
    })
    setPage(boundedPage)
  }

  return (
    <section className="min-w-0 rounded-md border border-slate-200/70 bg-white p-4 sm:p-6">
      {!hasTableControls && <h2 className="mb-5 text-sm font-semibold">{title}</h2>}
      {hasTableControls && (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <label className="relative flex-1">
            <span className="sr-only">Tìm kiếm tài liệu</span>
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Tìm theo tên tệp..."
              className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none transition focus:border-slate-400"
            />
          </label>
          <label>
            <span className="sr-only">Lọc theo thời gian</span>
            <select
              value={selectedDate}
              onChange={handleDateChange}
              className="h-10 min-w-40 rounded-md border border-slate-200 bg-white px-3 text-xs outline-none focus:border-slate-400"
            >
              <option value="">Mọi thời gian</option>
              {dates.map((date) => <option key={date} value={date}>{date}</option>)}
            </select>
          </label>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className={`w-full border-collapse text-left text-xs ${invoices ? 'min-w-[960px]' : 'min-w-[760px]'}`}>
          <thead className="bg-[#f7f9fc] text-[11px] text-slate-500">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Tên tài liệu</th>
              {invoices && (
                <th scope="col" className="px-4 py-3 font-medium">
                  <FilterMenu
                    label="Nhà cung cấp"
                    options={suppliers.map((supplier) => ({
                      value: supplier,
                      label: supplier,
                    }))}
                    selectedValues={selectedSuppliers}
                    onToggle={(value) =>
                      toggleFilter(
                        value,
                        selectedSuppliers,
                        setSelectedSuppliers,
                        'supplier',
                      )
                    }
                  />
                </th>
              )}
              <th scope="col" className="px-4 py-3 font-medium">
                {hasTableControls ? (
                  <FilterMenu
                    label="Người tải lên"
                    options={uploaders.map((uploader) => ({ value: uploader, label: uploader }))}
                    selectedValues={selectedUploaders}
                    onToggle={(value) => toggleFilter(value, selectedUploaders, setSelectedUploaders, 'uploader')}
                  />
                ) : 'Người tải lên'}
              </th>
              <th scope="col" className="px-4 py-3 font-medium">Thời gian</th>
              <th scope="col" className="px-4 py-3 font-medium">
                {hasTableControls ? (
                  <FilterMenu
                    label="Trạng thái"
                    options={statuses.map((status) => ({ value: status, label: statusLabels[status] ?? status }))}
                    selectedValues={selectedStatuses}
                    onToggle={(value) => toggleFilter(value, selectedStatuses, setSelectedStatuses, 'status')}
                  />
                ) : 'Trạng thái'}
              </th>
              {hasActions && <th scope="col" className="px-4 py-3 text-center font-medium">Thao tác</th>}
            </tr>
          </thead>
          <tbody>
            {visibleDocuments.map((document) => (
              <tr
                key={document.id}
                tabIndex={0}
                onClick={() => viewDocument(document)}
                onKeyDown={(event) => handleRowKeyDown(event, document)}
                aria-label={`Xem chi tiết ${document.name}`}
                className="cursor-pointer border-b border-slate-100 outline-none last:border-0 hover:bg-slate-50/70 focus-visible:bg-emerald-50/60"
              >
                <td className="w-[38%] px-4 py-3.5 font-medium">
                  <p>{document.name}</p>
                  {hasTableControls && <p className="mt-0.5 text-[10px] font-normal text-slate-400">{document.documentId}</p>}
                </td>
                {invoices && (
                  <td className="px-4 py-3.5 text-slate-500">
                    {document.supplier}
                  </td>
                )}
                <td className="px-4 py-3.5 text-slate-500">{document.uploader}</td>
                <td className="px-4 py-3.5">
                  <p className="text-[11px]">{document.date}</p>
                  <p className="mt-0.5 text-[10px] text-slate-400">{document.time}</p>
                </td>
                <td className="px-4 py-3.5"><StatusBadge status={document.status} /></td>
                {hasActions && (
                  <td className="px-4 py-3.5">
                    {invoices || approvals ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          viewDocument(document)
                        }}
                        className="mx-auto flex items-center gap-1 font-semibold text-brand hover:underline"
                      >
                        {approvals ? 'Kiểm tra lại' : 'Xem'} <span aria-hidden="true">→</span>
                      </button>
                    ) : (
                      <div className="flex items-center justify-center gap-1">
                        <button type="button" onClick={(event) => { event.stopPropagation(); viewDocument(document) }} title="Xem tài liệu" aria-label={`Xem ${document.name}`} className="rounded p-2 text-emerald-700 transition hover:bg-emerald-50">
                          <Eye size={16} />
                        </button>
                        <button type="button" onClick={(event) => { event.stopPropagation(); deleteDocument(document) }} title="Xóa tài liệu" aria-label={`Xóa ${document.name}`} className="rounded p-2 text-red-600 transition hover:bg-red-50">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {visibleDocuments.length === 0 && <p className="py-10 text-center text-sm text-slate-500">Không tìm thấy tài liệu phù hợp.</p>}
      </div>

      {hasTableControls && (
        <footer className="mt-5 flex items-center justify-between gap-4 text-[11px] text-slate-400">
          <span>Hiển thị {visibleDocuments.length} / {filteredDocuments.length} tài liệu</span>
          <div className="flex gap-2">
            <button type="button" disabled={currentPage === 1} onClick={() => changePage(currentPage - 1)} className="inline-flex h-8 items-center gap-1 rounded border border-slate-200 px-3 text-slate-600 disabled:cursor-not-allowed disabled:opacity-40">
              <ChevronLeft size={13} /> Trước
            </button>
            <button type="button" disabled={currentPage === totalPages} onClick={() => changePage(currentPage + 1)} className="inline-flex h-8 items-center gap-1 rounded border border-slate-200 px-3 text-slate-600 disabled:cursor-not-allowed disabled:opacity-40">
              Sau <ChevronRight size={13} />
            </button>
          </div>
        </footer>
      )}

    </section>
  )
}

/** Hiển thị menu checkbox để chọn nhiều giá trị lọc ngay tại tiêu đề cột. */
function FilterMenu({ label, options, selectedValues, onToggle }) {
  console.debug('[DocumentsTable] Rendering column filter', {
    label,
    selectedCount: selectedValues.length,
  })
  return (
    <details className="group relative w-fit">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 select-none">
        {label}
        {selectedValues.length > 0 && <span className="rounded-full bg-slate-200 px-1.5 text-[9px] text-slate-700">{selectedValues.length}</span>}
        <span className="text-[9px] transition group-open:rotate-180">▼</span>
      </summary>
      <div className="absolute left-0 top-7 z-20 min-w-44 rounded-md border border-slate-200 bg-white p-2 shadow-lg">
        {options.map((option) => (
          <label key={option.value} className="flex cursor-pointer items-center gap-2 rounded px-2 py-2 font-normal text-slate-600 hover:bg-slate-50">
            <input type="checkbox" checked={selectedValues.includes(option.value)} onChange={() => onToggle(option.value)} className="accent-emerald-700" />
            <span className="whitespace-nowrap">{option.label}</span>
          </label>
        ))}
      </div>
    </details>
  )
}
