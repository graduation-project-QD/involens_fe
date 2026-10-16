import { useEffect, useRef, useState } from 'react'
import Button from '../components/ui/Button'
import PageHeader from '../components/ui/PageHeader'
import { exportExcel, previewExport } from '../api/exportJobs'

/** Previews invoice filters and downloads Excel only when the matching preview contains invoices. */
export default function ExportPage() {
  console.debug('[Export] Rendering preview form')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')
  const exportControllerRef = useRef(null)
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    status: 'ALL',
  })
  /** Updates export criteria and clears the previous preview before refreshing matching counts. */
  function handleFilterChange(event) {
    console.debug('[Export] Updating filter', { field: event.target.name })
    setFilters((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }))
    setResult(null)
    setError('')
    setExportError('')
    setBusy(false)
  }
  /** Previews valid filters and ignores obsolete responses when criteria change or the page closes. */
  useEffect(() => {
    let active = true
    console.debug('[Export] Checking preview criteria')
    setError('')
    setResult(null)
    const today = new Date()
    const dateTo =
      filters.dateTo ||
      `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const query = { ...filters, dateTo }
    if (filters.dateFrom && filters.dateFrom > dateTo) {
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
      <div className="grid gap-5 md:grid-cols-2">
        <section className="space-y-4 rounded border border-slate-200 bg-white p-6">
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
        <aside className="rounded border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-semibold">Xem trước kết quả</h2>
          {busy ? (
            <p role="status" className="mt-5 text-xs text-slate-500">
              Đang xem trước...
            </p>
          ) : error ? (
            <p role="alert" className="mt-5 text-xs text-red-600">
              {error}
            </p>
          ) : result ? (
            <dl className="mt-5 space-y-4 text-sm">
              <div className="flex justify-between">
                <dt>Tổng hóa đơn</dt>
                <dd>{result.data.total_invoices}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Đã duyệt</dt>
                <dd>{result.data.approved ?? 'Không áp dụng'}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Chờ duyệt</dt>
                <dd>{result.data.pending_review ?? 'Không áp dụng'}</dd>
              </div>
            </dl>
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
