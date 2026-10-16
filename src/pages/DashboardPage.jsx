import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
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
        ['Tổng tài liệu', summary.total, 'text-brand'],
        ['Đang xử lý', summary.processing, 'text-blue-600'],
        ['Chờ duyệt', summary.review_required, 'text-amber-700'],
        ['Thành công', summary.success, 'text-emerald-700'],
        ['Tải lên thất bại', summary.rejected, 'text-red-600'],
        ['Lỗi xử lý', summary.failed, 'text-red-600'],
      ].map(([label, value, color]) => ({ label, value, color }))
    : []
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Tổng quan hoạt động xử lý hóa đơn"
        action={
          <Link
            to="/upload"
            className="inline-flex items-center gap-2 rounded bg-brand px-4 py-2 text-xs text-white transition-opacity hover:opacity-80"
          >
            <Plus size={16} aria-hidden="true" />
            Tải hóa đơn mới
          </Link>
        }
      />
      <button
        onClick={() => setVersion((current) => current + 1)}
        className="mb-4 text-xs text-brand"
      >
        Làm mới
      </button>
      {error && (
        <p role="alert" className="mb-4 text-sm text-red-600">
          {error}
        </p>
      )}
      <div className="space-y-5">
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
          !error && <p role="status">Đang tải thống kê...</p>
        )}
        {documents ? (
          <DocumentsTable documents={documents} onDeleted={handleDocumentDeleted} showAllDocumentsLink />
        ) : (
          !error && <p role="status">Đang tải tài liệu...</p>
        )}
      </div>
    </>
  )
}
