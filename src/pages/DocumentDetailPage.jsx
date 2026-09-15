import { Check, Clock3, FileQuestion, Hourglass, Save } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import invoiceImage from '../assets/sample-invoice.jpg'
import Button from '../components/ui/Button'
import StatusBadge from '../components/ui/StatusBadge'
import { recentDocuments } from '../data/dashboard'

const progressSteps = ['Đã tải lên', 'Xếp hàng', 'Đang xử lý', 'AI trích xuất', 'Đang duyệt', 'Hoàn thành']
const activeStepByStatus = { processing: 2, pending: 4, success: 5, error: 2, rejected: 4 }
const defaultExtractedData = {
  companyName: 'thiếtbịsiêuthị',
  address: 'Thôn Đa, Di Trạch, Hoài Đức, Xã Di Trạch, Huyện Hoài Đức, Hà Nội',
  invoiceDate: '2020-08-21',
  totalAmount: '935.000đ',
}

/** Hiển thị chi tiết tài liệu hoặc biểu mẫu kiểm tra dữ liệu AI đối với tài liệu chờ duyệt. */
export default function DocumentDetailPage() {
  const { documentId } = useParams()
  const navigate = useNavigate()
  const document = recentDocuments.find((item) => item.documentId === documentId)
  const [formData, setFormData] = useState(document?.extractedData ?? defaultExtractedData)

  console.debug('[DocumentDetailPage] Rendering document details', { documentId, found: Boolean(document) })
  if (!document) return <DocumentNotFound documentId={documentId} />

  /** Cập nhật một trường dữ liệu AI trích xuất trong biểu mẫu kiểm tra cục bộ. */
  function handleFieldChange(event) {
    const { name, value } = event.target
    console.debug('[DocumentDetailPage] Updating extracted field', { field: name })
    setFormData((current) => ({ ...current, [name]: value }))
  }

  /** Lưu dữ liệu đã chỉnh sửa, đánh dấu tài liệu thành công và quay lại hàng đợi duyệt. */
  function handleSave(event) {
    event.preventDefault()
    console.info('[DocumentDetailPage] Saving reviewed document', { documentId })
    document.extractedData = { ...formData }
    document.status = 'success'
    console.info('[DocumentDetailPage] Reviewed document saved successfully', { documentId, status: document.status })
    navigate('/approvals')
  }

  if (document.status === 'pending') {
    return <ReviewDocument document={document} formData={formData} onFieldChange={handleFieldChange} onSave={handleSave} />
  }

  const fileType = document.name.split('.').pop()?.toUpperCase() ?? '—'
  const activeStep = activeStepByStatus[document.status] ?? 0
  return (
    <>
      <DocumentBreadcrumb documentId={document.documentId} />
      <header className="mb-5">
        <h1 className="text-xl font-bold tracking-tight">Chi tiết tài liệu</h1>
        <p className="mt-1 text-xs text-slate-500">Trạng thái xử lý và dữ liệu trích xuất từ hóa đơn</p>
      </header>
      <section className="rounded-md border border-slate-200/70 bg-white p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <h2 className="break-all text-base font-semibold">{document.name}</h2>
            {document.description && <p className="mt-1 text-xs text-slate-400">{document.description}</p>}
          </div>
          <StatusBadge status={document.status} />
        </div>
        <div className="border-b border-slate-100 py-7">
          <h3 className="mb-6 text-xs font-semibold">Tiến trình xử lý</h3>
          <div className="overflow-x-auto pb-2"><ProcessingProgress activeStep={activeStep} status={document.status} /></div>
        </div>
        <div className="pt-7">
          <h3 className="mb-5 text-xs font-semibold">Thông tin chung</h3>
          <dl className="grid grid-cols-[120px_minmax(0,1fr)] gap-x-5 gap-y-3 text-xs sm:grid-cols-[160px_minmax(0,1fr)]">
            <dt className="text-slate-400">Loại tệp</dt><dd className="font-semibold">{fileType}</dd>
            <dt className="text-slate-400">Kích thước</dt><dd className="font-semibold">{document.fileSize}</dd>
            <dt className="text-slate-400">Người tải lên</dt><dd className="font-semibold">{document.uploader}</dd>
            <dt className="text-slate-400">Thời gian tạo</dt><dd className="font-semibold">{document.date} {document.time}</dd>
            <dt className="text-slate-400">Document ID</dt><dd className="font-semibold">{document.documentId}</dd>
          </dl>
        </div>
      </section>
    </>
  )
}

/** Hiển thị màn hình đối chiếu ảnh hóa đơn với các trường dữ liệu AI có thể chỉnh sửa. */
function ReviewDocument({ document, formData, onFieldChange, onSave }) {
  console.debug('[ReviewDocument] Rendering extracted document review', { documentId: document.documentId })
  return (
    <>
      <DocumentBreadcrumb documentId={document.documentId} approvals />
      <header className="mb-5">
        <h1 className="text-xl font-bold tracking-tight">Kiểm tra hóa đơn</h1>
        <p className="mt-1 text-xs text-slate-500">Đối chiếu dữ liệu AI trích xuất với bản gốc của hóa đơn</p>
      </header>
      <div className="grid items-stretch gap-5 lg:h-[calc(100dvh-170px)] lg:max-h-[680px] lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,.95fr)]">
        <section className="flex min-h-0 flex-col rounded-md border border-slate-200/70 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold">Hóa đơn gốc</h2>
          <div className="flex min-h-[360px] flex-1 items-center justify-center overflow-hidden rounded-md bg-slate-100 p-3 lg:min-h-0">
            <img src={invoiceImage} alt={`Hóa đơn gốc của ${document.name}`} className="h-full max-h-full w-full rounded object-contain shadow-sm" />
          </div>
        </section>
        <section className="min-h-0 rounded-md border border-slate-200/70 bg-white p-5">
          <h2 className="mb-5 text-sm font-semibold">Dữ liệu trích xuất bởi AI</h2>
          <form onSubmit={onSave} className="space-y-4">
            <ReviewField label="Tên công ty" name="companyName" value={formData.companyName} onChange={onFieldChange} />
            <ReviewField label="Địa chỉ" name="address" value={formData.address} onChange={onFieldChange} />
            <ReviewField label="Ngày hóa đơn" name="invoiceDate" type="date" value={formData.invoiceDate} onChange={onFieldChange} />
            <ReviewField label="Tổng tiền" name="totalAmount" value={formData.totalAmount} onChange={onFieldChange} highlighted />
            <p className="rounded-md bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-800">AI đã trích xuất tổng tiền. Vui lòng kiểm tra và điều chỉnh nếu cần.</p>
            <Button type="submit" className="mt-2 w-full"><Save size={15} /> Lưu</Button>
          </form>
        </section>
      </div>
    </>
  )
}

/** Hiển thị một trường nhập liệu thuộc dữ liệu hóa đơn được AI trích xuất. */
function ReviewField({ label, name, value, onChange, type = 'text', highlighted = false }) {
  console.debug('[ReviewField] Rendering editable extracted field', { name })
  return (
    <label className="block text-[11px] font-medium text-slate-600">
      {label}
      <input required type={type} name={name} value={value} onChange={onChange} className={`mt-1.5 h-10 w-full rounded-md border px-3 text-xs text-slate-800 outline-none transition focus:border-brand focus:ring-2 focus:ring-emerald-100 ${highlighted ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50'}`} />
    </label>
  )
}

/** Hiển thị đường dẫn điều hướng phù hợp với nguồn mở trang chi tiết tài liệu. */
function DocumentBreadcrumb({ documentId, approvals = false }) {
  console.debug('[DocumentBreadcrumb] Rendering document breadcrumb', { documentId, approvals })
  return (
    <nav aria-label="Breadcrumb" className="mb-3 text-[11px]">
      <Link to={approvals ? '/approvals' : '/documents'} className="font-medium text-brand hover:underline">{approvals ? 'Hàng đợi duyệt' : 'Danh sách tài liệu'}</Link>
      <span className="mx-2 text-slate-300">/</span><span className="text-slate-500">{documentId}</span>
    </nav>
  )
}

/** Biểu diễn sáu mốc nghiệp vụ của tiến trình xử lý tài liệu. */
function ProcessingProgress({ activeStep, status }) {
  console.debug('[ProcessingProgress] Rendering processing milestones', { activeStep, status })
  return (
    <ol className="grid min-w-[620px] grid-cols-6" aria-label="Các bước xử lý tài liệu">
      {progressSteps.map((step, index) => {
        const completed = index < activeStep || status === 'success'
        const active = index === activeStep && status !== 'success'
        const failed = active && (status === 'error' || status === 'rejected')
        const color = failed ? 'text-red-600' : active ? 'text-amber-600' : completed ? 'text-brand' : 'text-slate-300'
        return (
          <li key={step} className="relative flex flex-col items-center text-center">
            {index > 0 && <span className={`absolute right-1/2 top-3 h-px w-full ${index <= activeStep ? 'bg-brand' : 'bg-slate-200'}`} aria-hidden="true" />}
            <span className={`relative z-10 flex size-6 items-center justify-center rounded-full bg-white ring-4 ring-white ${color}`}>
              {completed ? <Check size={17} strokeWidth={3} /> : active ? <Clock3 size={17} /> : <Hourglass size={14} />}
            </span>
            <span className={`mt-2 text-[10px] font-medium ${color}`}>{step}</span>
          </li>
        )
      })}
    </ol>
  )
}

/** Thông báo mã tài liệu không tồn tại và cung cấp đường quay lại danh sách. */
function DocumentNotFound({ documentId }) {
  console.warn('[DocumentDetailPage] Document not found', { documentId })
  return (
    <section className="rounded-md border border-slate-200 bg-white p-10 text-center">
      <FileQuestion className="mx-auto text-slate-300" size={38} />
      <h1 className="mt-4 text-lg font-semibold">Không tìm thấy tài liệu</h1>
      <p className="mt-2 text-sm text-slate-500">Không có tài liệu với mã {documentId} trong dữ liệu hiện tại.</p>
      <Link to="/documents" className="mt-5 inline-block text-sm font-semibold text-brand hover:underline">Quay lại danh sách tài liệu</Link>
    </section>
  )
}
