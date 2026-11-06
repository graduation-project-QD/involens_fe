import { useEffect, useState } from 'react'
import {
  CircleCheck,
  Clock3,
  FileText,
  FileWarning,
  ScanText,
  Upload,
} from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import StatsGrid from '../components/dashboard/StatsGrid'
import ActivityChart from '../components/dashboard/ActivityChart'
import DocumentsTable from '../components/documents/DocumentsTable'
import { getDocuments, getSummary } from '../api/documents'
import { useDocumentStatusRefresh } from '../context/DocumentStatusContext'

/** Loads the current user's document summary and most recent server document page. */
export default function DashboardPage() {
  console.debug('[Dashboard] Rendering overview')
  const [summary, setSummary] = useState(null)
  const [documents, setDocuments] = useState(null)
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)
  /** Refreshes dashboard statistics and recent documents after server status changes. */
  function refreshDocumentStatus() {
    console.info('[Dashboard] Refreshing live document overview')
    setVersion((current) => current + 1)
  }
  useDocumentStatusRefresh(refreshDocumentStatus)
  /** Refreshes independent dashboard sections while cancelling requests after navigation. */
  useEffect(() => {
    console.info('[Dashboard] Loading overview')
    const controller = new AbortController()
    setError('')
    Promise.allSettled([
      getSummary(controller.signal),
      getDocuments({ page: 1, page_size: 5 }, controller.signal),
    ]).then((results) => {
      if (controller.signal.aborted) return
      if (results[0].status === 'fulfilled') setSummary(results[0].value)
      if (results[1].status === 'fulfilled')
        setDocuments(results[1].value.items.slice(0, 5))
      const failures = results.filter((result) => result.status === 'rejected')
      if (failures.length)
        setError(failures.map((result) => result.reason.message).join(' '))
      console.info('[Dashboard] Overview load completed', {
        failures: failures.length,
      })
    })
    return () => controller.abort()
  }, [version])
  /** Reloads recent documents and dashboard statistics after a document has been deleted. */
  function handleDocumentDeleted() {
    console.info('[Dashboard] Refreshing overview after document deletion')
    setVersion((current) => current + 1)
  }
  const items = summary
    ? [
        ['Tổng tài liệu', summary.total, 'text-brand', FileText, 'bg-brand/10'],
        [
          'Đang xử lý',
          summary.processing,
          'text-blue-600',
          Clock3,
          'bg-blue-50',
        ],
        [
          'Chờ duyệt',
          summary.review_required,
          'text-amber-700',
          ScanText,
          'bg-amber-50',
        ],
        [
          'Thành công',
          summary.success,
          'text-emerald-700',
          CircleCheck,
          'bg-emerald-50',
        ],
        [
          'Tải lên thất bại',
          summary.rejected,
          'text-red-600',
          Upload,
          'bg-red-50',
        ],
        ['Lỗi xử lý', summary.failed, 'text-red-600', FileWarning, 'bg-red-50'],
      ].map(([label, value, color, icon, iconBackground]) => ({
        label,
        value,
        color,
        icon,
        iconBackground,
      }))
    : []
  return (
    <div className="-m-5 min-h-dvh bg-[#f3f7f6] p-5 lg:-m-8 lg:p-8">
      <PageHeader
        title="Dashboard"
        description="Tổng quan hoạt động xử lý hóa đơn"
      />
      {error && (
        <p
          role="alert"
          className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      <div className="space-y-5 lg:space-y-6">
        {summary ? (
          <>
            <StatsGrid items={items} />
            <ActivityChart
              data={summary.daily_uploads.map((item) => ({
                day: item.date,
                value: item.count,
              }))}
            />
          </>
        ) : (
          !error && (
            <p
              role="status"
              className="rounded-2xl border border-slate-200/70 bg-white p-6 text-sm text-slate-500"
            >
              Đang tải thống kê...
            </p>
          )
        )}
        {documents ? (
          <DocumentsTable
            documents={documents}
            onDeleted={handleDocumentDeleted}
            showAllDocumentsLink
            dashboard
          />
        ) : (
          !error && (
            <p
              role="status"
              className="rounded-2xl border border-slate-200/70 bg-white p-6 text-sm text-slate-500"
            >
              Đang tải tài liệu...
            </p>
          )
        )}
      </div>
    </div>
  )
}
