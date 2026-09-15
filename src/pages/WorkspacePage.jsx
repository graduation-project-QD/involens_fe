import PageHeader from '../components/ui/PageHeader'
import DocumentsTable from '../components/documents/DocumentsTable'
import { recentDocuments } from '../data/dashboard'
import UploadPage from './UploadPage'

const titles = {
  documents: 'Danh sách tài liệu',
  approvals: 'Hàng đợi duyệt',
  errors: 'Tài liệu lỗi',
  invoices: 'Hóa đơn đã trích xuất',
  activity: 'Nhật ký thao tác',
}
const filters = { approvals: 'pending', errors: 'error', invoices: 'success' }

/** Hiển thị nội dung trang tài liệu bên trong layout dùng chung. */
export default function WorkspacePage({ kind }) {
  if (kind === 'upload') return <UploadPage />
  return (
    <>
      <PageHeader title={titles[kind]} />
      {kind === 'activity' ? (
        <div className="rounded-md border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Chưa có nhật ký thao tác.
        </div>
      ) : (
        <DocumentsTable
          title={titles[kind]}
          documents={
            filters[kind]
              ? recentDocuments.filter((item) => item.status === filters[kind])
              : recentDocuments
          }
        />
      )}
    </>
  )
}
