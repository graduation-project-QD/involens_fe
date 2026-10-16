import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CircleCheck,
  CloudUpload,
  FileSearch,
  FileText,
  LoaderCircle,
  RefreshCw,
  Settings,
  X,
  WifiOff,
} from 'lucide-react'
import {
  canRetryExtraction,
  getDocument,
  getExtraction,
  retryExtraction,
  saveExtraction,
} from '../api/documents'
import Button from '../components/ui/Button'
import StatusBadge from '../components/ui/StatusBadge'
import { useDocumentStatusRefresh } from '../context/DocumentStatusContext'

const emptyInvoice = {
  sellerName: '',
  sellerAddress: '',
  invoiceNumber: '',
  taxCode: '',
  invoiceDate: '',
  totalAmount: '',
  currency: '',
}

/** Shows document progress and marks the failed business stage from the current server state. */
function DocumentPipeline({ status, compact = false }) {
  console.debug('[DocumentPipeline] Rendering document progress', { status })
  const extractionStates = [
    'REVIEW_REQUIRED',
    'EXTRACT_SUCCESS',
    'EXTRACT_FAILED',
  ]
  const currentStage = {
    UPLOADED: 'upload',
    UPLOADED_FAILED: 'upload',
    PENDING_FAILURE: 'pending',
    PROCESSING: 'processing',
    REVIEW_REQUIRED: 'extraction',
    EXTRACT_FAILED: 'extraction',
    EXTRACT_SUCCESS: 'finished',
  }[status]
  const failed = [
    'UPLOADED_FAILED',
    'PENDING_FAILURE',
    'EXTRACT_FAILED',
  ].includes(status)
  const steps = [
    {
      id: 'upload',
      label: status === 'UPLOADED_FAILED' ? 'Tải lên thất bại' : 'Đã tải lên',
      icon: CloudUpload,
      color: 'border-slate-400 bg-slate-100 text-slate-600',
    },
    ...(status === 'PENDING_FAILURE'
      ? [
          {
            id: 'pending',
            label: 'Lỗi chờ xử lý',
            icon: X,
            color: 'border-orange-600 bg-orange-50 text-orange-600',
          },
        ]
      : []),
    {
      id: 'processing',
      label: 'Đang xử lý',
      icon: Settings,
      color: 'border-blue-600 bg-blue-50 text-blue-600',
    },
    {
      id: 'extraction',
      label: extractionStates.includes(status)
        ? {
            REVIEW_REQUIRED: 'Chờ duyệt',
            EXTRACT_SUCCESS: 'Thành công',
            EXTRACT_FAILED: 'Lỗi xử lý',
          }[status]
        : 'Trích xuất',
      icon: FileSearch,
      color:
        status === 'REVIEW_REQUIRED'
          ? 'border-amber-700 bg-amber-50 text-amber-700'
          : 'border-emerald-700 bg-emerald-50 text-emerald-700',
    },
    {
      id: 'finished',
      label: 'Hoàn tất',
      icon: Check,
      color: 'border-emerald-700 bg-emerald-50 text-emerald-700',
    },
  ]
  const currentIndex = steps.findIndex(
    /** Locates the stage represented by the document's current business state. */
    (step) => step.id === currentStage,
  )
  return (
    <section
      aria-label="Tiến trình tài liệu"
      className={
        compact
          ? 'rounded-xl border border-slate-200 bg-white p-5'
          : 'border-t border-slate-200 pt-6'
      }
    >
      <h3
        className={
          compact ? 'mb-4 text-sm font-semibold' : 'mb-6 text-sm font-semibold'
        }
      >
        Tiến trình xử lý
      </h3>
      <div className="overflow-x-auto pb-2 pt-1">
        <ol className={'flex ' + (compact ? 'min-w-[360px]' : 'min-w-[560px]')}>
          {steps.map(
            /** Renders each reached, pending, or failed stage and its outgoing connection. */
            (step, index) => {
              const reached = index <= currentIndex
              const isCurrent = index === currentIndex
              const isFailed = isCurrent && failed
              let Icon = step.icon
              if (isFailed && step.id !== 'upload') Icon = X
              else if (compact && index < currentIndex) Icon = Check
              let colors = step.color
              if (!reached)
                colors = 'border-slate-200 bg-slate-50 text-slate-400'
              else if (isFailed && step.id !== 'pending')
                colors = 'border-red-600 bg-red-50 text-red-600'
              else if (compact && index < currentIndex)
                colors = 'border-brand bg-brand text-white'
              if (!compact && step.id === 'extraction' && status === 'EXTRACT_SUCCESS')
                colors = 'border-emerald-300 bg-emerald-50 text-emerald-600'
              const completedDocument = !compact && step.id === 'finished' && reached
              if (completedDocument) Icon = CircleCheck
              const iconColors = completedDocument
                ? 'border-emerald-800 bg-emerald-800 text-white'
                : colors
              const currentRing = completedDocument
                ? ' ring-4 ring-emerald-800/10'
                : ' ring-4 ring-current/10'
              let connectionColor = 'bg-slate-200'
              if (index < currentIndex) {
                connectionColor = compact
                  ? 'bg-brand'
                  : 'bg-current ' + steps[index + 1].color.split(' ').at(-1)
                if (!compact && steps[index + 1].id === 'extraction' && status === 'EXTRACT_SUCCESS')
                  connectionColor = 'bg-emerald-600'
              }
              let compactLabelColor = reached ? 'text-brand' : 'text-slate-500'
              if (isFailed)
                compactLabelColor =
                  step.id === 'pending' ? 'text-orange-600' : 'text-red-600'
              return (
                <li
                  key={step.id}
                  aria-current={isCurrent ? 'step' : undefined}
                  className="relative flex flex-1 flex-col items-center px-2 text-center"
                >
                  {index < steps.length - 1 && (
                    <span
                      aria-hidden="true"
                      className={
                        (compact
                          ? 'absolute left-[calc(50%+24px)] top-4 h-px w-[calc(100%-48px)] '
                          : 'absolute left-[calc(50%+36px)] top-8 h-0.5 w-[calc(100%-72px)] ') +
                        connectionColor
                      }
                    />
                  )}
                  <span
                    className={
                      'relative flex items-center justify-center rounded-full ' +
                      (compact ? 'size-8 border ' : 'size-16 border-2 ') +
                      iconColors +
                      (isCurrent ? currentRing : '')
                    }
                  >
                    <Icon
                      aria-hidden="true"
                      className={compact ? 'size-4' : 'size-7'}
                    />
                    {isFailed && (
                      <>
                        <span
                          aria-hidden="true"
                          className={
                            'absolute h-0.5 -rotate-45 ' +
                            (compact ? 'w-8 ' : 'w-16 ') +
                            (step.id === 'pending'
                              ? 'bg-orange-600'
                              : 'bg-red-600')
                          }
                        />
                        {step.id === 'upload' && (
                          <span
                            aria-hidden="true"
                            className={
                              'absolute h-0.5 rotate-45 bg-red-600 ' +
                              (compact ? 'w-8' : 'w-16')
                            }
                          />
                        )}
                      </>
                    )}
                  </span>
                  <span
                    className={
                      compact
                        ? 'mt-2 text-xs font-semibold leading-5 ' + compactLabelColor
                        : 'mt-3 rounded-full px-3 py-1 ' +
                          (completedDocument ? 'text-sm font-bold ' : 'text-xs font-semibold ') +
                          colors
                    }
                  >
                    {step.label}
                  </span>
                </li>
              )
            },
          )}
        </ol>
      </div>
    </section>
  )
}

const invoiceFieldGroups = [
  {
    title: 'Người bán',
    fields: [
      {
        name: 'sellerName',
        label: 'Tên người bán',
        required: true,
        wide: true,
      },
      { name: 'sellerAddress', label: 'Địa chỉ người bán' },
      { name: 'taxCode', label: 'Mã số thuế' },
    ],
  },
  {
    title: 'Thông tin hóa đơn',
    fields: [
      { name: 'invoiceNumber', label: 'Số hóa đơn', required: true },
      {
        name: 'invoiceDate',
        label: 'Ngày hóa đơn',
        required: true,
        type: 'date',
      },
      {
        name: 'totalAmount',
        label: 'Tổng tiền',
        required: true,
        type: 'number',
      },
      { name: 'currency', label: 'Mã tiền tệ', required: true },
    ],
  },
]

/** Displays an editable invoice field and identifies required values missing from extracted data. */
function InvoiceReviewField({ field, value, onChange }) {
  const missing = field.required && !value.trim()
  console.debug('[InvoiceReviewField] Rendering invoice input', {
    field: field.name,
    missing,
  })
  const hintId = 'invoice-' + field.name + '-hint'
  return (
    <label
      className={'block min-w-0 text-xs ' + (field.wide ? 'sm:col-span-2' : '')}
    >
      {field.label}
      {field.required && <span className="text-red-600"> *</span>}
      <input
        name={field.name}
        value={value}
        onChange={onChange}
        required={field.required}
        type={field.type || 'text'}
        step={field.type === 'number' ? 'any' : undefined}
        aria-invalid={missing || undefined}
        aria-describedby={missing ? hintId : undefined}
        className={
          'mt-2 h-10 w-full min-w-0 rounded-lg border px-3 text-sm transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/10 ' +
          (missing
            ? 'border-amber-400 bg-amber-50/40'
            : 'border-slate-200 bg-white')
        }
      />
      {missing && (
        <span id={hintId} className="mt-1 block text-[11px] text-amber-700">
          Chưa có dữ liệu, vui lòng nhập.
        </span>
      )}
    </label>
  )
}

/** Arranges source files, AI results and editable invoice fields for checking and confirmation. */
function InvoiceReviewLayout({
  document,
  extraction,
  extractionError,
  invoice,
  returnTo,
  saving,
  error,
  notice,
  imageError,
  onImageError,
  onImageLoad,
  onFieldChange,
  onSave,
}) {
  console.debug('[InvoiceReview] Rendering invoice check', {
    documentId: document.id,
  })
  const missingFields = invoiceFieldGroups
    .flatMap((group) => group.fields)
    .filter((field) => field.required && !invoice[field.name].trim())
  const confidence = extraction?.overall_confidence
  const confidencePercent =
    typeof confidence === 'number' && Number.isFinite(confidence)
      ? Math.min(100, Math.max(0, confidence * 100))
      : null
  const cardClass = 'min-w-0 rounded-xl border border-slate-200 bg-white p-5'
  return (
    <div className="space-y-5">
      <header>
        <Link to={returnTo} className="text-xs text-brand hover:underline">
          ← Quay lại danh sách
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">
            Kiểm tra hóa đơn
          </h1>
          <StatusBadge status={document.current_state} />
        </div>
        <p className="mt-1 break-all text-xs text-slate-500">
          {document.original_filename}
        </p>
      </header>
      <DocumentPipeline status={document.current_state} compact />
      {document.error_message && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <AlertCircle size={18} className="shrink-0" aria-hidden="true" />
          <p className="whitespace-pre-wrap break-words">
            {document.error_message}
          </p>
        </div>
      )}
      <div className="grid items-start gap-5 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className="min-w-0 space-y-5">
          <section className={cardClass}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Hóa đơn gốc</h2>
              {document.file_url && (
                <a
                  href={document.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-brand hover:underline"
                >
                  Mở tệp gốc ↗
                </a>
              )}
            </div>
            {!document.file_url ? (
              <div
                role="status"
                className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-center text-xs text-slate-500"
              >
                <FileText
                  size={28}
                  className="text-slate-400"
                  aria-hidden="true"
                />
                <p>Tài liệu chưa có URL tệp hóa đơn.</p>
              </div>
            ) : document.mime_type === 'application/pdf' ? (
              <iframe
                src={document.file_url}
                title={'Hóa đơn PDF: ' + document.original_filename}
                className="block h-[65vh] min-h-[300px] w-full rounded-xl border border-slate-200"
              />
            ) : imageError ? (
              <p
                role="alert"
                className="rounded-xl bg-red-50 p-6 text-sm text-red-600"
              >
                Không thể tải ảnh hóa đơn.
              </p>
            ) : (
              <img
                src={document.file_url}
                alt={'Hóa đơn gốc: ' + document.original_filename}
                onLoad={onImageLoad}
                onError={onImageError}
                className="block max-h-[75vh] w-full rounded-xl border border-slate-200 bg-slate-50 object-contain"
              />
            )}
          </section>
          <section className={cardClass}>
            <h2 className="mb-4 text-sm font-semibold">Thông tin tệp</h2>
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-xs [&>dt]:text-slate-500 [&>dd]:break-words">
              <dt>Document ID</dt>
              <dd className="break-all font-mono text-[11px]">{document.id}</dd>
              <dt>Loại tệp</dt>
              <dd>{document.mime_type}</dd>
              <dt>Kích thước</dt>
              <dd>{document.file_size} bytes</dd>
              <dt>Người tải lên</dt>
              <dd>{document.uploaded_by?.full_name || '—'}</dd>
              <dt>Thời gian tải lên</dt>
              <dd>
                {new Date(document.uploaded_at).toLocaleString('vi-VN', {
                  timeZone: 'Asia/Ho_Chi_Minh',
                })}
              </dd>
            </dl>
          </section>
        </div>
        <div className="min-w-0 space-y-5">
          <section className={cardClass}>
            <h2 className="mb-4 text-sm font-semibold">Kết quả trích xuất</h2>
            {extractionError && (
              <p role="status" className="text-sm text-slate-500">
                {extractionError}
              </p>
            )}
            {extraction && (
              <>
                <dl className="mb-4 grid grid-cols-3 gap-2">
                  <div className="min-w-0 rounded-lg bg-[#f4f7f5] p-3">
                    <dt className="text-[11px] text-slate-500">Độ tin cậy</dt>
                    <dd className="mt-1 text-lg font-semibold tabular-nums">
                      {confidence ?? '—'}
                    </dd>
                    {confidencePercent !== null && (
                      <div
                        role="progressbar"
                        aria-label="Độ tin cậy trích xuất"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={confidencePercent}
                        className="mt-1 h-1 overflow-hidden rounded-full bg-slate-200"
                      >
                        <div
                          className="h-full rounded-full bg-brand"
                          style={{ width: confidencePercent + '%' }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 rounded-lg bg-[#f4f7f5] p-3">
                    <dt className="text-[11px] text-slate-500">Cần kiểm tra</dt>
                    <dd className="mt-1 text-lg font-semibold">
                      {extraction.human_review_required ? 'Có' : 'Không'}
                    </dd>
                  </div>
                  <div className="min-w-0 rounded-lg bg-[#f4f7f5] p-3">
                    <dt className="text-[11px] text-slate-500">
                      Số lần thử lại
                    </dt>
                    <dd className="mt-1 text-lg font-semibold tabular-nums">
                      {extraction.retry_count}
                    </dd>
                  </div>
                </dl>
                <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-2 text-xs [&>dt]:text-slate-500 [&>dd]:break-words">
                  <dt>Trạng thái AI</dt>
                  <dd>{extraction.ai_status}</dd>
                  <dt>Bắt đầu xử lý</dt>
                  <dd>
                    {extraction.processing_started_at
                      ? new Date(
                          extraction.processing_started_at,
                        ).toLocaleString('vi-VN', {
                          timeZone: 'Asia/Ho_Chi_Minh',
                        })
                      : '—'}
                  </dd>
                  <dt>Kết thúc xử lý</dt>
                  <dd>
                    {extraction.processing_finished_at
                      ? new Date(
                          extraction.processing_finished_at,
                        ).toLocaleString('vi-VN', {
                          timeZone: 'Asia/Ho_Chi_Minh',
                        })
                      : '—'}
                  </dd>
                </dl>
                {extraction.error_code && (
                  <p className="mt-4 break-words text-xs text-red-600">
                    {extraction.error_code}: {extraction.error_message}
                  </p>
                )}
                <details className="mt-4 text-xs">
                  <summary className="cursor-pointer font-semibold text-brand">
                    Dữ liệu AI gốc (JSON)
                  </summary>
                  <pre className="mt-3 max-h-80 overflow-auto rounded-lg bg-slate-50 p-4">
                    {JSON.stringify(extraction.raw_json, null, 2)}
                  </pre>
                </details>
              </>
            )}
          </section>
          <form onSubmit={onSave} className={cardClass + ' space-y-4'}>
            <h2 className="text-sm font-semibold">Dữ liệu hóa đơn</h2>
            <p className="text-xs leading-relaxed text-slate-500">
              Dữ liệu hóa đơn được điền từ kết quả trích xuất. Nhập mã tiền tệ
              và kiểm tra các trường bắt buộc trước khi lưu và xác nhận. Để
              trống địa chỉ/mã số thuế sẽ giữ nguyên giá trị đã có.
            </p>
            {extraction && missingFields.length > 0 && (
              <p
                role="status"
                className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800"
              >
                {missingFields.length} trường bắt buộc còn trống:{' '}
                {missingFields.map((field) => field.label).join(', ')}.
              </p>
            )}
            <fieldset disabled={saving || !extraction} className="space-y-6">
              {invoiceFieldGroups.map((group) => (
                <div key={group.title}>
                  <h3 className="mb-3 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                    {group.title}
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {group.fields.map((field) => (
                      <InvoiceReviewField
                        key={field.name}
                        field={field}
                        value={invoice[field.name]}
                        onChange={onFieldChange}
                      />
                    ))}
                  </div>
                </div>
              ))}
              <Button
                type="submit"
                disabled={saving || !extraction}
                className="w-full rounded-lg"
              >
                {saving ? 'Đang lưu...' : 'Lưu và xác nhận'}
              </Button>
            </fieldset>
            {error && (
              <p
                role="alert"
                className="rounded-lg bg-red-50 p-3 text-xs text-red-600"
              >
                {error}
              </p>
            )}
            {notice && (
              <p
                role="status"
                className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700"
              >
                {notice}
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}

/** Shows document metadata and fills the review form from persisted extraction fields. */
export default function DocumentDetailPage() {
  const { documentId } = useParams()
  const { pathname } = useLocation()
  console.debug('[DocumentDetail] Rendering details', { documentId })
  const review =
    pathname.startsWith('/approvals/') || pathname.startsWith('/invoices/')
  const [document, setDocument] = useState(null)
  const [extraction, setExtraction] = useState(null)
  const [invoice, setInvoice] = useState(emptyInvoice)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [extractionError, setExtractionError] = useState('')
  const [notice, setNotice] = useState('')
  const [version, setVersion] = useState(0)
  const [imageError, setImageError] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [retryError, setRetryError] = useState('')
  const [retryNotice, setRetryNotice] = useState(0)
  const retryPendingRef = useRef(false)
  const loadedDocumentId = useRef(null)
  /** Refreshes read-only document details without subscribing the invoice editing routes. */
  function refreshDocumentStatus() {
    console.info('[DocumentDetail] Refreshing live document details', {
      documentId,
    })
    setVersion((current) => current + 1)
  }
  useDocumentStatusRefresh(refreshDocumentStatus, !review, documentId)
  /** Clears retry feedback when opening another document without carrying over its previous request result. */
  useEffect(() => {
    console.debug('[DocumentDetail] Resetting retry feedback', { documentId })
    setRetryError('')
    setRetryNotice(0)
  }, [documentId])
  /** Keeps AI dispatch confirmation visible for three seconds, including during detail refresh. */
  useEffect(() => {
    if (!retryNotice) return
    console.debug('[DocumentDetail] Scheduling retry notice dismissal')
    const timer = window.setTimeout(() => {
      console.debug('[DocumentDetail] Retry notice dismissed')
      setRetryNotice(0)
    }, 3000)
    return () => window.clearTimeout(timer)
  }, [retryNotice])
  /** Loads metadata and extraction independently, distinguishing missing AI results from missing documents. */
  useEffect(() => {
    console.info('[DocumentDetail] Loading document and extraction', {
      documentId,
    })
    const controller = new AbortController()
    const background = !review && loadedDocumentId.current === documentId
    setLoading(!background)
    setError('')
    setExtractionError('')
    if (!background) {
      setDocument(null)
      setExtraction(null)
      setInvoice(emptyInvoice)
      setNotice('')
      setImageError(false)
    }
    Promise.allSettled([
      getDocument(documentId, controller.signal),
      getExtraction(documentId, controller.signal),
    ]).then(([metadata, ai]) => {
      if (controller.signal.aborted) return
      if (metadata.status === 'fulfilled') {
        console.log(
          '[DocumentDetail] Invoice image URL:',
          metadata.value.file_url,
        )
        setDocument(metadata.value)
        loadedDocumentId.current = documentId
      } else setError(metadata.reason.message)
      if (ai.status === 'fulfilled') {
        setExtraction(ai.value)
        setInvoice({
          sellerName: ai.value.seller_name ?? '',
          sellerAddress: ai.value.seller_address ?? '',
          invoiceNumber: ai.value.invoice_number ?? '',
          taxCode: ai.value.tax_code ?? '',
          invoiceDate: ai.value.invoice_date ?? '',
          totalAmount: String(ai.value.total_amount ?? ''),
          currency: '',
        })
        console.info('[DocumentDetail] Invoice fields loaded from extraction')
      } else
        setExtractionError(
          ai.reason.code === 'EXTRACTION_RESULT_NOT_FOUND'
            ? 'Tài liệu chưa có kết quả trích xuất.'
            : ai.reason.message,
        )
      setLoading(false)
      console.info('[DocumentDetail] Details load completed')
    })
    return () => controller.abort()
  }, [documentId, version, review])
  /** Sends an eligible document back to AI and refreshes its details and navigation totals after dispatch. */
  async function handleRetry() {
    if (
      retryPendingRef.current ||
      review ||
      !canRetryExtraction(document?.current_state)
    )
      return
    console.info('[DocumentDetail] Starting extraction retry', { documentId })
    retryPendingRef.current = true
    setRetrying(true)
    setRetryError('')
    setRetryNotice(0)
    try {
      const updatedDocument = await retryExtraction(documentId)
      console.info('[DocumentDetail] Extraction retry dispatched', {
        documentId,
        state: updatedDocument.current_state,
      })
      setDocument((current) => ({ ...current, ...updatedDocument }))
      setRetryNotice(Date.now())
      setVersion((current) => current + 1)
      window.dispatchEvent(new Event('involens:documents-changed'))
    } catch (failure) {
      console.error('[DocumentDetail] Extraction retry failed', {
        documentId,
        message: failure.message,
      })
      setRetryError(failure.message)
    } finally {
      retryPendingRef.current = false
      setRetrying(false)
    }
  }
  /** Reports an unavailable invoice image without interrupting document details or review. */
  function handleImageError() {
    console.warn('[DocumentDetail] Invoice image failed to load', {
      documentId,
    })
    setImageError(true)
  }
  /** Records successful loading of the original invoice image. */
  function handleImageLoad() {
    console.debug('[DocumentDetail] Invoice image loaded', { documentId })
  }
  /** Updates a review field before the user saves and confirms the invoice. */
  function handleFieldChange(event) {
    console.debug('[DocumentDetail] Editing invoice field', {
      field: event.target.name,
    })
    setInvoice((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }))
    setNotice('')
  }
  /** Submits complete invoice data using the documented PATCH rules and reflects the saved transaction. */
  async function handleSave(event) {
    event.preventDefault()
    if (saving || !extraction) return
    console.info('[DocumentDetail] Validating invoice review')
    setError('')
    setNotice('')
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date())
    const dateParts = Object.fromEntries(
      today.map((part) => [part.type, part.value]),
    )
    const todayDate =
      dateParts.year + '-' + dateParts.month + '-' + dateParts.day
    const amount = Number(invoice.totalAmount)
    if (
      !invoice.sellerName.trim() ||
      !invoice.invoiceNumber.trim() ||
      !invoice.currency.trim() ||
      !invoice.invoiceDate ||
      invoice.invoiceDate > todayDate ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      console.warn('[DocumentDetail] Invoice validation failed')
      setError(
        'Điền tên người bán, số hóa đơn, ngày hóa đơn không sau hôm nay, tổng tiền lớn hơn 0 và mã tiền tệ.',
      )
      return
    }
    const body = {
      sellerName: invoice.sellerName.trim(),
      invoiceNumber: invoice.invoiceNumber.trim(),
      invoiceDate: invoice.invoiceDate,
      totalAmount: amount,
      currency: invoice.currency.trim(),
    }
    // Blank optional fields preserve existing values under the current PATCH rules.
    if (invoice.sellerAddress.trim())
      body.sellerAddress = invoice.sellerAddress.trim()
    if (invoice.taxCode.trim()) body.taxCode = invoice.taxCode.trim()
    setSaving(true)
    try {
      const data = await saveExtraction(documentId, body)
      setExtraction(data.extraction_result)
      setDocument((current) => ({
        ...current,
        current_state: 'EXTRACT_SUCCESS',
      }))
      setInvoice({
        sellerName: data.invoice.seller_name || '',
        sellerAddress: data.invoice.seller_address || '',
        invoiceNumber: data.invoice.invoice_number || '',
        taxCode: data.invoice.tax_code || '',
        invoiceDate: data.invoice.invoice_date || '',
        totalAmount: String(data.invoice.total_amount ?? ''),
        currency: data.invoice.currency || '',
      })
      setNotice(
        'Đã lưu và xác nhận hóa đơn. Các tác vụ duyệt liên quan đã hoàn tất.',
      )
      window.dispatchEvent(new Event('involens:documents-changed'))
      console.info('[DocumentDetail] Invoice review completed')
    } catch (failure) {
      setError(failure.message)
    } finally {
      setSaving(false)
    }
  }
  const retryNotification = retryNotice > 0 && (
    <div
      role="status"
      className="fixed right-4 top-4 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-lg"
    >
      <Check size={20} aria-hidden="true" />
      Đã gửi trích xuất lại
    </div>
  )
  const returnTo = pathname.startsWith('/approvals/')
    ? '/approvals'
    : pathname.startsWith('/invoices/')
      ? '/invoices'
      : '/documents'
  if (loading)
    return (
      <>
        {retryNotification}
        <p role="status" className="p-6">
          Đang tải chi tiết tài liệu...
        </p>
      </>
    )
  if (!document)
    return (
      <section className="mx-auto my-8 w-full max-w-xl rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm sm:my-12 sm:px-10">
        {retryNotification}
        <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
          <WifiOff aria-hidden="true" className="size-8" />
        </div>
        <div role="alert">
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
            Không thể tải tài liệu
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Vui lòng kiểm tra kết nối và thử lại.
          </p>
        </div>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            className="min-h-11 rounded-lg px-5 text-sm"
            onClick={() => setVersion((current) => current + 1)}
          >
            <RefreshCw aria-hidden="true" className="size-4" />
            Thử lại
          </Button>
          <Link
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            to={returnTo}
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Quay lại danh sách
          </Link>
        </div>
        {error && (
          <details className="mt-7 border-t border-slate-100 pt-5 text-left">
            <summary className="cursor-pointer rounded text-xs font-medium text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
              Chi tiết lỗi
            </summary>
            <p className="mt-3 break-words rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-600">
              {error}
            </p>
          </details>
        )}
      </section>
    )
  if (review) {
    return (
      <InvoiceReviewLayout
        document={document}
        extraction={extraction}
        extractionError={extractionError}
        invoice={invoice}
        returnTo={returnTo}
        saving={saving}
        error={error}
        notice={notice}
        imageError={imageError}
        onImageError={handleImageError}
        onImageLoad={handleImageLoad}
        onFieldChange={handleFieldChange}
        onSave={handleSave}
      />
    )
  }
  return (
    <>
      {retryNotification}
      <Link to={returnTo} className="text-xs text-brand">
        ← Quay lại danh sách
      </Link>
      <header className="my-5">
        <h1 className="text-xl font-bold">
          {review ? 'Kiểm tra hóa đơn' : 'Chi tiết tài liệu'}
        </h1>
        {review && (
          <p className="mt-1 break-all text-xs text-slate-500">
            {document.original_filename}
          </p>
        )}
      </header>
      {!review && error && (
        <p role="alert" className="mb-4 text-sm text-red-600">
          {error}
        </p>
      )}
      {!review && (
        <section
          aria-label="Tổng quan tài liệu"
          className="mb-5 rounded border border-slate-200 bg-white p-4 sm:p-6"
        >
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h2 className="min-w-0 flex-1 break-all text-lg font-bold">
              {document.original_filename}
            </h2>
            <StatusBadge status={document.current_state} />
            {canRetryExtraction(document.current_state) && (
              <button
                type="button"
                onClick={handleRetry}
                disabled={retrying}
                className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-600 transition-colors hover:border-blue-300 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {retrying ? (
                  <LoaderCircle
                    size={16}
                    className="animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <RefreshCw size={16} aria-hidden="true" />
                )}
                {retrying ? 'Đang gửi…' : 'Trích xuất lại'}
              </button>
            )}
          </div>
          {retryError && (
            <p
              role="alert"
              className="mb-4 rounded bg-red-50 p-3 text-xs text-red-600"
            >
              {retryError}
            </p>
          )}
          <DocumentPipeline status={document.current_state} />
        </section>
      )}
      {document.error_message && (
        <section
          role="alert"
          aria-labelledby="document-error-title"
          className="mb-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 sm:p-5"
        >
          <AlertCircle
            size={20}
            className="mt-0.5 shrink-0 text-red-600"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <h2
              id="document-error-title"
              className="text-sm font-semibold text-red-900"
            >
              Tài liệu gặp lỗi
            </h2>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-red-800">
              {document.error_message}
            </p>
          </div>
        </section>
      )}
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <div className="min-w-0 space-y-5">
          <section className="rounded border border-slate-200 bg-white p-6">
            {(review || extraction) && (
              <div className="mb-5 flex items-center justify-between">
                {review && <StatusBadge status={document.current_state} />}
                {!review && extraction && (
                  <Link
                    className="text-xs text-brand"
                    to={'/invoices/' + documentId}
                  >
                    Kiểm tra hóa đơn →
                  </Link>
                )}
              </div>
            )}
            <dl className="grid grid-cols-[140px_minmax(0,1fr)] gap-3 text-xs">
              <dt>Document ID</dt>
              <dd className="break-all">{document.id}</dd>
              <dt>Loại tệp</dt>
              <dd>{document.mime_type}</dd>
              <dt>Kích thước</dt>
              <dd>{document.file_size} bytes</dd>
              <dt>Người tải lên</dt>
              <dd>{document.uploaded_by?.full_name || '—'}</dd>
              <dt>Thời gian tải lên</dt>
              <dd>
                {new Date(document.uploaded_at).toLocaleString('vi-VN', {
                  timeZone: 'Asia/Ho_Chi_Minh',
                })}
              </dd>
            </dl>
          </section>
          <section className="rounded border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold">Kết quả trích xuất</h2>
            {extractionError && (
              <p role="status" className="text-sm text-slate-600">
                {extractionError}
              </p>
            )}
            {extraction && (
              <>
                <dl className="grid grid-cols-[160px_minmax(0,1fr)] gap-3 text-xs">
                  <dt>Trạng thái AI</dt>
                  <dd>{extraction.ai_status}</dd>
                  <dt>Cần kiểm tra</dt>
                  <dd>{extraction.human_review_required ? 'Có' : 'Không'}</dd>
                  <dt>Độ tin cậy</dt>
                  <dd>{extraction.overall_confidence ?? '—'}</dd>
                  <dt>Số lần thử lại</dt>
                  <dd>{extraction.retry_count}</dd>
                  <dt>Bắt đầu xử lý</dt>
                  <dd>
                    {extraction.processing_started_at
                      ? new Date(
                          extraction.processing_started_at,
                        ).toLocaleString('vi-VN', {
                          timeZone: 'Asia/Ho_Chi_Minh',
                        })
                      : '—'}
                  </dd>
                  <dt>Kết thúc xử lý</dt>
                  <dd>
                    {extraction.processing_finished_at
                      ? new Date(
                          extraction.processing_finished_at,
                        ).toLocaleString('vi-VN', {
                          timeZone: 'Asia/Ho_Chi_Minh',
                        })
                      : '—'}
                  </dd>
                </dl>
                {extraction.error_code && (
                  <p className="mt-4 text-xs text-red-600">
                    {extraction.error_code}: {extraction.error_message}
                  </p>
                )}
                <details className="mt-5 text-xs">
                  <summary className="cursor-pointer">
                    Dữ liệu AI gốc (JSON)
                  </summary>
                  <pre className="mt-3 max-h-80 overflow-auto rounded bg-slate-50 p-4">
                    {JSON.stringify(extraction.raw_json, null, 2)}
                  </pre>
                </details>
              </>
            )}
          </section>
        </div>
        <section className="min-w-0 rounded border border-slate-200 bg-white p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Hóa đơn gốc</h2>
            {document.file_url && (
              <a
                href={document.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-brand hover:underline"
              >
                Mở tệp gốc ↗
              </a>
            )}
          </div>
          {!document.file_url ? (
            <p role="status" className="text-sm text-slate-500">
              Tài liệu chưa có URL tệp hóa đơn.
            </p>
          ) : document.mime_type === 'application/pdf' ? (
            <iframe
              src={document.file_url}
              title={'Hóa đơn PDF: ' + document.original_filename}
              className="block h-[75vh] min-h-[480px] w-full rounded border border-slate-200"
            />
          ) : imageError ? (
            <p role="status" className="text-sm text-red-600">
              Không thể tải ảnh hóa đơn.
            </p>
          ) : (
            <img
              src={document.file_url}
              alt={'Hóa đơn gốc: ' + document.original_filename}
              onLoad={handleImageLoad}
              onError={handleImageError}
              className="block h-auto w-full rounded object-contain"
            />
          )}
        </section>
      </div>
    </>
  )
}
