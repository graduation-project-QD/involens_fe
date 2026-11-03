import { useEffect, useRef, useState } from 'react'
import Button from '../components/ui/Button'
import PageHeader from '../components/ui/PageHeader'
import { exportExcel, previewExport } from '../api/exportJobs'

const datePresets = [
  { value: 'all', label: 'Tất cả' },
  { value: 'last7Days', label: '7 ngày qua' },
  { value: 'thisMonth', label: 'Tháng này' },
  { value: 'lastMonth', label: 'Tháng trước' },
  { value: 'thisQuarter', label: 'Quý này' },
]

/** Resolves export date shortcuts using today's calendar date in Vietnam, regardless of browser timezone. */
function getPresetDates(preset) {
  console.debug('[Export] Resolving date shortcut', { preset })
  if (preset === 'all') return { dateFrom: '', dateTo: '' }
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const calendar = Object.fromEntries(
    parts.map(({ type, value }) => [type, value]),
  )
  const year = Number(calendar.year)
  const month = Number(calendar.month) - 1
  const day = Number(calendar.day)
  let start = new Date(Date.UTC(year, month, day))
  let end = new Date(Date.UTC(year, month, day))
  if (preset === 'last7Days') start.setUTCDate(start.getUTCDate() - 6)
  if (preset === 'thisMonth') start = new Date(Date.UTC(year, month, 1))
  if (preset === 'lastMonth') {
    start = new Date(Date.UTC(year, month - 1, 1))
    end = new Date(Date.UTC(year, month, 0))
  }
  if (preset === 'thisQuarter')
    start = new Date(Date.UTC(year, Math.floor(month / 3) * 3, 1))
  const dates = {
    dateFrom: start.toISOString().slice(0, 10),
    dateTo: end.toISOString().slice(0, 10),
  }
  console.debug('[Export] Date shortcut resolved', dates)
  return dates
}

/** Previews invoice filters and downloads Excel only when the matching preview contains invoices. */
export default function ExportPage() {
  console.debug('[Export] Rendering preview form')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')
  const [datePreset, setDatePreset] = useState('all')
  const exportControllerRef = useRef(null)
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    status: 'ALL',
  })
  /** Applies export criteria and clears stale preview and download messages before loading matching invoices. */
  function updateFilters(changes) {
    console.debug('[Export] Updating export criteria', changes)
    setFilters((current) => ({ ...current, ...changes }))
    setResult(null)
    setError('')
    setExportError('')
    setBusy(false)
  }
  /** Applies a manual filter and clears the date shortcut selection when dates are edited. */
  function handleFilterChange(event) {
    const { name, value } = event.target
    console.debug('[Export] Updating filter', { field: name })
    if (name === 'dateFrom' || name === 'dateTo') setDatePreset('')
    updateFilters({ [name]: value })
  }
  /** Fills both date inputs from the selected shortcut and refreshes the export preview. */
  function handleDatePreset(event) {
    const preset = event.currentTarget.value
    console.info('[Export] Selecting date shortcut', { preset })
    setDatePreset(preset)
    updateFilters(getPresetDates(preset))
  }
  /** Previews valid filters and ignores obsolete responses when criteria change or the page closes. */
  useEffect(() => {
    let active = true
    console.debug('[Export] Checking preview criteria')
    setError('')
    setResult(null)
    const query = { ...filters }
    if (
      filters.dateFrom &&
      filters.dateTo &&
      filters.dateFrom > filters.dateTo
    ) {
      console.warn('[Export] Invalid date range')
      setError('Từ ngày không được sau đến ngày.')
      setBusy(false)
      return
    }
    console.info('[Export] Starting preview', query)
    setBusy(true)
    previewExport(query)
      .then((data) => {
        if (!active) return
        setResult({ data, query })
        console.info('[Export] Preview completed')
      })
      .catch((failure) => {
        if (active) {
          console.error('[Export] Preview failed', { message: failure.message })
          setError(failure.message)
        }
      })
      .finally(() => {
        if (active) setBusy(false)
      })
    return () => {
      active = false
    }
  }, [filters])
  /** Cancels an unfinished export when the user leaves the export page. */
  useEffect(() => {
    console.debug('[Export] Registering export cancellation on page exit')
    return () => {
      console.debug('[Export] Cancelling any unfinished Excel export')
      exportControllerRef.current?.abort()
    }
  }, [])
  /** Downloads the exact previewed invoice selection and releases temporary browser download resources. */
  async function handleExport() {
    console.info('[Export] Starting Excel download')
    if (
      exportControllerRef.current ||
      busy ||
      !result ||
      !(result.data.total_invoices > 0)
    ) {
      console.warn(
        '[Export] Download skipped because it is pending or has no eligible preview',
      )
      return
    }
    const controller = new AbortController()
    exportControllerRef.current = controller
    setExporting(true)
    setExportError('')
    try {
      const { blob, filename } = await exportExcel(
        result.query,
        controller.signal,
      )
      if (controller.signal.aborted) return
      const link = document.createElement('a')
      const objectUrl = URL.createObjectURL(blob)
      try {
        link.href = objectUrl
        link.download = filename
        document.body.appendChild(link)
        link.click()
        console.info('[Export] Excel download started', { filename })
      } finally {
        link.remove()
        URL.revokeObjectURL(objectUrl)
      }
    } catch (failure) {
      if (!controller.signal.aborted) {
        console.error('[Export] Excel download failed', {
          message: failure.message,
        })
        setExportError(failure.message)
      }
    } finally {
      exportControllerRef.current = null
      if (!controller.signal.aborted) setExporting(false)
    }
  }
  const fieldClass =
    'mt-2 h-10 w-full rounded border border-slate-200 bg-white px-3'
  return (
    <>
      <PageHeader
        title="Xuất Excel"
        description="Thống kê hóa đơn phù hợp trước khi xuất"
      />
      <div className="grid items-start gap-5 lg:grid-cols-3">
        <section className="min-w-0 space-y-4 rounded-2xl border border-slate-200/70 bg-white p-5 sm:p-6">
          <h2 className="text-xl font-bold">Bộ lọc</h2>
          <fieldset disabled={exporting}>
            <legend className="mb-3 text-xs font-medium">
              Khoảng thời gian
            </legend>
            <div className="flex flex-wrap gap-2">
              {datePresets.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  value={preset.value}
                  onClick={handleDatePreset}
                  aria-pressed={datePreset === preset.value}
                  className={
                    'rounded-full border px-3 py-2 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50 ' +
                    (datePreset === preset.value
                      ? 'border-brand bg-brand/5 font-semibold text-brand'
                      : 'border-slate-200 text-slate-600 hover:border-brand/50 hover:bg-slate-50')
                  }
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="block text-xs">
            Từ ngày hóa đơn
            <input
              name="dateFrom"
              type="date"
              value={filters.dateFrom}
              onChange={handleFilterChange}
              disabled={exporting}
              className={fieldClass}
            />
          </label>
          <label className="block text-xs">
            Đến ngày hóa đơn
            <input
              name="dateTo"
              type="date"
              value={filters.dateTo}
              onChange={handleFilterChange}
              disabled={exporting}
              className={fieldClass}
            />
          </label>
          <label className="block text-xs">
            Trạng thái
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              disabled={exporting}
              className={fieldClass}
            >
              <option value="ALL">Tất cả</option>
              <option value="APPROVED">Đã duyệt</option>
              <option value="PENDING_REVIEW">Chờ duyệt</option>
            </select>
          </label>
          <Button
            onClick={handleExport}
            disabled={exporting || busy || !(result?.data.total_invoices > 0)}
            className="w-full"
          >
            {exporting ? 'Đang xuất Excel...' : 'Xuất Excel'}
          </Button>
          {exportError && (
            <p role="alert" className="text-xs text-red-600">
              {exportError}
            </p>
          )}
          {result?.data.total_invoices === 0 && (
            <p role="status" className="text-xs text-slate-500">
              Không có hóa đơn phù hợp để xuất.
            </p>
          )}
        </section>
        <aside className="min-w-0 rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_4px_16px_-8px_rgba(15,23,42,0.12)] sm:p-6 lg:col-span-2">
          <h2 className="text-xl font-bold">Tổng hóa đơn xuất</h2>
          {busy ? (
            <p role="status" className="mt-5 text-xs text-slate-500">
              Đang xem trước...
            </p>
          ) : error ? (
            <p role="alert" className="mt-5 text-xs text-red-600">
              {error}
            </p>
          ) : result ? (
            <>
              <dl className="mt-5 grid grid-cols-3 gap-2 text-sm sm:gap-3">
                <div className="min-w-0 rounded-xl border border-brand/15 bg-brand/5 p-2 sm:p-5">
                  <dt className="font-semibold text-brand">Tổng hóa đơn</dt>
                  <dd className="mt-3 break-words text-[40px] font-bold leading-none tracking-tight text-brand tabular-nums">
                    {result.data.total_invoices}
                  </dd>
                </div>
                <div className="min-w-0 rounded-xl border border-emerald-200/70 bg-emerald-50 p-2 text-emerald-700 sm:p-4">
                  <dt className="font-semibold">Thành công</dt>
                  <dd
                    className={
                      'mt-3 break-words font-semibold leading-tight tabular-nums ' +
                      (result.data.approved == null ? 'text-sm' : 'text-[28px]')
                    }
                  >
                    {result.data.approved ?? 'Không áp dụng'}
                  </dd>
                </div>
                <div className="min-w-0 rounded-xl border border-amber-200/70 bg-amber-50 p-2 text-amber-700 sm:p-4">
                  <dt className="font-semibold">Chờ duyệt</dt>
                  <dd
                    className={
                      'mt-3 break-words font-semibold leading-tight tabular-nums ' +
                      (result.data.pending_review == null
                        ? 'text-sm'
                        : 'text-[28px]')
                    }
                  >
                    {result.data.pending_review ?? 'Không áp dụng'}
                  </dd>
                </div>
              </dl>
              <section
                className="mt-6"
                aria-labelledby="export-preview-list-title"
              >
                <h3
                  id="export-preview-list-title"
                  className="text-lg font-bold"
                >
                  Danh sách hóa đơn sẽ xuất
                </h3>
                <p
                  id="export-preview-note"
                  className="mt-2 text-xs leading-5 text-slate-500"
                >
                  Danh sách chỉ hiển thị các thông tin xem trước. File Excel
                  xuất ra sẽ có thêm các trường dữ liệu.
                </p>
                {result.data.items?.length > 0 ? (
                  <div
                    role="region"
                    aria-label="Danh sách hóa đơn sẽ xuất, cuộn để xem thêm"
                    aria-describedby="export-preview-note"
                    tabIndex={0}
                    className="mt-4 max-h-80 overflow-auto rounded-lg border border-slate-200"
                  >
                    <table className="w-full min-w-[700px] table-fixed text-left text-xs">
                      <thead className="sticky top-0 z-10 bg-slate-50 text-slate-700 uppercase">
                        <tr className="h-10">
                          <th
                            scope="col"
                            className="w-[16%] px-3 font-bold"
                          >
                            Mã hóa đơn
                          </th>
                          <th
                            scope="col"
                            className="w-[32%] px-3 font-bold"
                          >
                            Nhà cung cấp
                          </th>
                          <th
                            scope="col"
                            className="w-[18%] px-3 text-center font-bold"
                          >
                            Ngày hóa đơn
                          </th>
                          <th
                            scope="col"
                            className="w-[18%] px-3 text-right font-bold"
                          >
                            Số tiền
                          </th>
                          <th
                            scope="col"
                            className="w-[16%] px-3 text-center font-bold"
                          >
                            Trạng thái
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm font-normal text-[#202735]">
                        {result.data.items.map((invoice, index) => (
                          <tr
                            key={`${invoice.invoice_number}-${index}`}
                            className="h-14 hover:bg-slate-50"
                          >
                            <td className="px-3">
                              <span
                                className="block truncate"
                                title={invoice.invoice_number}
                              >
                                {invoice.invoice_number}
                              </span>
                            </td>
                            <td className="px-3">
                              <span
                                className="block truncate"
                                title={invoice.seller_name}
                              >
                                {invoice.seller_name}
                              </span>
                            </td>
                            <td title={invoice.invoice_date?.split('-').reverse().join('/') ?? '—'} className="truncate px-3 text-center tabular-nums">
                              {invoice.invoice_date
                                ?.split('-')
                                .reverse()
                                .join('/')}
                            </td>
                            <td title={invoice.total_amount?.toLocaleString('vi-VN') ?? '—'} className="truncate px-3 text-right tabular-nums">
                              {invoice.total_amount?.toLocaleString('vi-VN') ??
                                '—'}
                            </td>
                            <td className="px-3 text-center">
                              <span
                                className={
                                  'inline-flex whitespace-nowrap rounded-full px-2.5 py-1 font-semibold ' +
                                  (invoice.status === 'APPROVED'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : invoice.status === 'PENDING_REVIEW'
                                      ? 'bg-amber-50 text-amber-700'
                                      : 'bg-slate-100 text-slate-600')
                                }
                              >
                                {invoice.status === 'APPROVED'
                                  ? 'Đã duyệt'
                                  : invoice.status === 'PENDING_REVIEW'
                                    ? 'Chờ duyệt'
                                    : invoice.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p role="status" className="mt-4 text-xs text-slate-500">
                    {result.data.total_invoices === 0
                      ? 'Không có hóa đơn phù hợp để xuất.'
                      : 'Chưa có danh sách hóa đơn xem trước.'}
                  </p>
                )}
              </section>
            </>
          ) : (
            <p className="mt-5 text-xs text-slate-500">
              Thay đổi bộ lọc để tự động xem trước kết quả.
            </p>
          )}
        </aside>
      </div>
    </>
  )
}
