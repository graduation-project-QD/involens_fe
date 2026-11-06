import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CircleCheck,
  CloudUpload,
  FileSearch,
  FileText,
  Info,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
  Settings,
  Trash2,
  TriangleAlert,
  X,
  WifiOff,
} from 'lucide-react'
import {
  canRetryExtraction,
  deleteDocument,
  getDocument,
  getExtraction,
  retryExtraction,
  saveExtraction,
} from '../api/documents'
import Button from '../components/ui/Button'
import PageHeader from '../components/ui/PageHeader'
import StatusBadge from '../components/ui/StatusBadge'
import { useDocumentStatusRefresh } from '../context/DocumentStatusContext'

const emptyInvoice = {
  sellerName: '',
  sellerAddress: '',
  invoiceDate: '',
  totalAmount: '',
}

const itemFields = [
  { name: 'item_name', label: 'Tên mặt hàng' },
  { name: 'quantity', label: 'Số lượng', numeric: true },
  { name: 'unit_price', label: 'Đơn giá', numeric: true },
  { name: 'line_total', label: 'Thành tiền', numeric: true, required: true },
]

/** Converts reviewed items to API values and rejects missing totals or invalid, zero numbers. */
function prepareInvoiceItems(items) {
  console.debug('[DocumentDetail] Validating reviewed items', { count: items.length })
  const result = []
  for (const [index, item] of items.entries()) {
    const prepared = {}
    for (const field of itemFields) {
      const value = String(item[field.name] ?? '').trim()
      if (field.required && !value) {
        console.warn('[DocumentDetail] Missing item total', { row: index + 1 })
        throw new Error(`Mặt hàng dòng ${index + 1}: vui lòng nhập thành tiền.`)
      }
      if (field.numeric && value && (!Number.isFinite(Number(value)) || Number(value) === 0)) {
        console.warn('[DocumentDetail] Invalid item number', { row: index + 1, field: field.name })
        throw new Error(`Mặt hàng dòng ${index + 1}: ${field.label} phải là số khác 0.`)
      }
      prepared[field.name] = value ? (field.numeric ? Number(value) : value) : null
    }
    result.push(prepared)
  }
  console.debug('[DocumentDetail] Reviewed items validated', { count: result.length })
  return result
}

/** Highlights a document section title and keeps its related actions beside the heading. */
function DetailSectionHeader({ title, as: Heading = 'h2', children }) {
  console.debug('[DetailSectionHeader] Rendering document section heading', { title })
  return (
    <div className="detail-section-header -mx-5 -mt-5 mb-5 flex flex-wrap items-center justify-between gap-3 rounded-t-xl border-b border-brand/15 bg-emerald-50 px-4 py-3">
      <Heading className="flex min-w-0 items-center gap-2.5 text-base font-bold leading-6 text-brand">
        {title}
      </Heading>
      {children}
    </div>
  )
}

/** Lets reviewers inspect the original invoice image using Ctrl and the mouse wheel. */
function ZoomableInvoiceImage({ src, alt, onLoad, onError, viewportClassName }) {
  console.debug('[InvoiceImage] Rendering original invoice preview')
  const viewportRef = useRef(null)
  const zoomRef = useRef(100)
  const [zoom, setZoom] = useState(100)
  const [loaded, setLoaded] = useState(false)

  /** Captures Ctrl-wheel inside the image preview without changing the page zoom. */
  useEffect(() => {
    const viewport = viewportRef.current
    console.debug('[InvoiceImage] Enabling invoice image zoom')

    /** Changes the invoice magnification within the approved inspection range. */
    function handleWheel(event) {
      if (!event.ctrlKey) return
      event.preventDefault()
      if (!event.deltaY) return
      const nextZoom = Math.min(300, Math.max(50, zoomRef.current + (event.deltaY < 0 ? 25 : -25)))
      if (nextZoom === zoomRef.current) return
      zoomRef.current = nextZoom
      setZoom(nextZoom)
      console.debug('[InvoiceImage] Invoice magnification changed', { zoom: nextZoom })
    }

    viewport.addEventListener('wheel', handleWheel, { passive: false })
    /** Releases the preview's wheel listener when the invoice is no longer displayed. */
    return () => {
      viewport.removeEventListener('wheel', handleWheel)
      console.debug('[InvoiceImage] Disabled invoice image zoom')
    }
  }, [])

  /** Restores the invoice to its initial fitted size and returns to its top-left corner. */
  function handleReset() {
    console.debug('[InvoiceImage] Resetting invoice magnification')
    zoomRef.current = 100
    setZoom(100)
    viewportRef.current.scrollTo({ left: 0, top: 0 })
    console.debug('[InvoiceImage] Invoice magnification reset')
  }

  /** Enables inspection controls after the original invoice image loads successfully. */
  function handleLoad(event) {
    console.debug('[InvoiceImage] Original invoice image loaded')
    setLoaded(true)
    onLoad(event)
  }

  return (
    <div className="min-w-0">
      {loaded && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>Ctrl + lăn chuột để zoom · {zoom}%</span>
          <button
            type="button"
            onClick={handleReset}
            disabled={zoom === 100}
            className="rounded-md border border-slate-200 px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Đặt lại
          </button>
        </div>
      )}
      <div
        ref={viewportRef}
        role="region"
        aria-label="Ảnh hóa đơn gốc, giữ Ctrl và lăn chuột để phóng to hoặc thu nhỏ"
        tabIndex={0}
        className={'w-full overflow-auto rounded-xl border border-slate-200 bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ' + viewportClassName}
      >
        <div style={{ width: zoom + '%', height: zoom + '%' }}>
          <img
            src={src}
            alt={alt}
            onLoad={handleLoad}
            onError={onError}
            className="block h-full w-full max-w-none object-contain"
          />
        </div>
      </div>
    </div>
  )
}

/** Shows document progress and marks the failed business stage from the current server state. */
function DocumentPipeline({ status, compact = false, showTitle = true }) {
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
          ? 'detail-card rounded-xl border border-slate-200 bg-white p-5'
          : 'border-t border-slate-200 pt-6'
      }
    >
      {showTitle && (
        <DetailSectionHeader title="Tiến trình xử lý" as="h3" />
      )}
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
    title: 'Nhà cung cấp',
    fields: [
      {
        name: 'sellerName',
        warningTarget: 'fields.seller',
        label: 'Nhà cung cấp',
        wide: true,
      },
      { name: 'sellerAddress', warningTarget: 'fields.address', label: 'Địa chỉ nhà cung cấp', wide: true },
    ],
  },
  {
    title: 'Thông tin hóa đơn',
    fields: [
      {
        name: 'invoiceDate',
        warningTarget: 'fields.timestamp',
        label: 'Ngày hóa đơn',
        type: 'date',
      },
      {
        name: 'totalAmount',
        warningTarget: 'fields.total_cost',
        label: 'Tổng tiền',
        type: 'number',
      },
    ],
  },
]

/** Displays an editable invoice value and its review warning while leaving validation to the backend. */
function InvoiceReviewField({ field, value, onChange, hasWarning }) {
  console.debug('[InvoiceReviewField] Rendering invoice input', {
    field: field.name,
    hasWarning: Boolean(hasWarning),
  })
  return (
    <label className={'block min-w-0 text-xs ' + (field.wide ? 'sm:col-span-2' : '')}>
      {field.label}
      <input
        name={field.name}
        value={value}
        onChange={onChange}
        type={field.type || 'text'}
        step={field.type === 'number' ? 'any' : undefined}
        data-warning={hasWarning ? 'true' : undefined}
        className="mt-2 h-10 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/10"
      />
    </label>
  )
}

/** Arranges source files, AI results and editable invoice fields for checking and confirmation. */
function InvoiceReviewLayout({
  approval = false,
  document,
  extraction,
  extractionError,
  invoice,
  items,
  onItemChange,
  onAddItem,
  onRemoveItem,
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
    warningCount: extraction?.warnings?.length ?? 0,
    itemCount: extraction?.items?.length ?? 0,
  })
  const confidence = extraction?.overall_confidence
  const confidencePercent =
    typeof confidence === 'number' && Number.isFinite(confidence)
      ? Math.min(100, Math.max(0, confidence * 100))
      : null
  const cardClass = 'detail-card min-w-0 rounded-xl border border-slate-200 bg-white p-5'
  const generalWarnings = extraction?.warnings ?? []
  const warningTargets = new Set()
  for (const warning of extraction?.warnings ?? []) {
    if (approval && typeof warning.target === 'string') {
      warningTargets.add(warning.target)
    }
  }
  console.debug('[InvoiceReview] Mapped warning targets to review inputs', {
    targetCount: warningTargets.size,
  })
  return (
    <div className={'document-surface invoice-review-surface space-y-5' + (approval ? ' approval-review-surface' : '')}>
      <header className="detail-hero min-h-0! pr-0!">
        <Link to={returnTo} className="text-xs text-brand hover:underline">
          ← Quay lại danh sách
        </Link>
        <PageHeader
          title={approval ? 'Duyệt kết quả trích xuất' : 'Kiểm tra hóa đơn'}
          description={document.original_filename}
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <StatusBadge status={document.current_state} />
        </div>
      </header>
      {approval && document.current_state === 'REVIEW_REQUIRED' && extraction && (
        <div role="status" className="approval-ready-banner">
          <Info size={24} aria-hidden="true" />
          <div>
            <p className="font-bold">Hóa đơn đã được trích xuất và đang chờ duyệt</p>
            <p className="mt-1 text-sm">Vui lòng kiểm tra và xác nhận thông tin hóa đơn bên dưới trước khi phê duyệt.</p>
          </div>
        </div>
      )}
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
      <div className="invoice-review-grid grid items-start gap-5 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className={approval ? 'min-w-0 space-y-5' : 'contents'}>
          <section className={cardClass}>
            <DetailSectionHeader title="Hóa đơn gốc" />
            {!document.file_url ? (
              <div
                role="status"
                className="detail-file-placeholder flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-6 text-center text-xs text-slate-500"
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
                className={'block min-h-[300px] w-full rounded-xl border border-slate-200 ' + (approval ? 'h-[65vh]' : 'h-[90vh]')}
              />
            ) : imageError ? (
              <p
                role="alert"
                className="rounded-xl bg-red-50 p-6 text-sm text-red-600"
              >
                Không thể tải ảnh hóa đơn.
              </p>
            ) : (
              <ZoomableInvoiceImage
                key={document.file_url}
                src={document.file_url}
                alt={'Hóa đơn gốc: ' + document.original_filename}
                onLoad={onImageLoad}
                onError={onImageError}
                viewportClassName={approval ? 'h-[75vh]' : 'h-[90vh]'}
              />
            )}
          </section>
          {approval && (
            <section className={cardClass}>
              <DetailSectionHeader title="Thông tin tệp" />
              <dl className="review-file-metadata grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-xs [&>dt]:text-slate-500 [&>dd]:break-words">
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
          )}
        </div>
        <div className={approval ? 'min-w-0 space-y-5' : 'contents'}>
          <section className={cardClass + (approval ? '' : ' order-first md:col-span-2')}>
            <DetailSectionHeader title="Kết quả trích xuất" />
            {extractionError && (
              <p role="status" className="text-sm text-slate-500">
                {extractionError}
              </p>
            )}
            {extraction && (
              <>
                <dl className="review-extraction-metrics mb-4 grid grid-cols-3 gap-2">
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
                    <dd className={'mt-1 text-lg font-semibold' + (approval ? ' flex items-center justify-between gap-2' : '')}>
                      {extraction.human_review_required ? 'Có' : 'Không'}
                      {approval && extraction.human_review_required && <TriangleAlert size={22} className="text-amber-500" aria-hidden="true" />}
                    </dd>
                  </div>
                  <div className="min-w-0 rounded-lg bg-[#f4f7f5] p-3">
                    <dt className="text-[11px] text-slate-500">
                      Số lần thử lại
                    </dt>
                    <dd className={'mt-1 text-lg font-semibold tabular-nums' + (approval ? ' flex items-center justify-between gap-2' : '')}>
                      {extraction.retry_count}
                      {approval && <RotateCcw size={20} className="text-slate-400" aria-hidden="true" />}
                    </dd>
                  </div>
                </dl>
                <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-2 text-xs [&>dt]:text-slate-500 [&>dd]:break-words">
                  <dt>Trạng thái trích xuất</dt>
                  <dd className={approval && extraction.ai_status === 'REVIEW_REQUIRED' ? 'text-amber-600' : undefined}>
                    {extraction.ai_status === 'SUCCESS' ? (
                      <span className="inline-flex rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
                        {extraction.ai_status}
                      </span>
                    ) : approval && extraction.ai_status === 'REVIEW_REQUIRED' ? (
                      <span className="inline-flex rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 font-medium text-amber-700">
                        {extraction.ai_status}
                      </span>
                    ) : extraction.ai_status === 'FAILED' ? (
                      <span className="inline-flex rounded-md border border-red-200 bg-red-50 px-2 py-0.5 font-medium text-red-600">
                        {extraction.ai_status}
                      </span>
                    ) : extraction.ai_status}
                  </dd>
                  <dt>Thời gian hoàn thành</dt>
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
                  <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 break-words text-xs text-red-600">
                    {extraction.error_message}
                  </p>
                )}
              </>
            )}
          </section>
          <form noValidate onSubmit={onSave} className={cardClass + ' space-y-4'}>
            <DetailSectionHeader title="Dữ liệu hóa đơn">
              {approval && extraction?.human_review_required && (
                <span className="inline-flex items-center gap-2 text-xs font-semibold text-amber-600">
                  <TriangleAlert size={18} aria-hidden="true" /> Cần kiểm tra
                </span>
              )}
            </DetailSectionHeader>
            {!approval && generalWarnings.length > 0 && (
              <div role="status" className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
                <h3 className="flex items-center gap-2 font-semibold">
                  Cảnh báo
                </h3>
                <ul className="mt-1 space-y-1">
                  {generalWarnings.map(
                    /** Explains inferred quantities and preserves other backend warning details. */
                    (warning, index) => (
                      <li key={index} className="break-words">
                        {warning.code === 'QUANTITY_INFERRED'
                          ? 'Kiểm tra lại số lượng của mặt hàng'
                          : <>{warning.code} · {warning.target}</>}
                      </li>
                    ),
                  )}
                </ul>
              </div>
            )}
            <fieldset disabled={saving || !extraction} className="space-y-6">
              {invoiceFieldGroups.map((group) => (
                <div key={group.title}>
                  <h3 className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-brand before:h-3 before:w-0.5 before:rounded-full before:bg-brand after:h-px after:flex-1 after:bg-slate-200">
                    {group.title}
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {group.fields.map((field) => (
                      <InvoiceReviewField
                        key={field.name}
                        field={field}
                        value={invoice[field.name]}
                        onChange={onFieldChange}
                        hasWarning={warningTargets.has(field.warningTarget)}
                      />
                    ))}
                  </div>
                </div>
              ))}
              <section aria-labelledby="invoice-items-title" className="min-w-0">
                <h3 id="invoice-items-title" className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-brand before:h-3 before:w-0.5 before:rounded-full before:bg-brand after:h-px after:flex-1 after:bg-slate-200">Danh sách mặt hàng</h3>
                {items.length > 0 ? (
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full min-w-[580px] table-fixed text-left text-xs">
                      <colgroup>
                        <col style={{ width: '30%' }} />
                        <col style={{ width: '16%' }} />
                        <col style={{ width: '21%' }} />
                        <col style={{ width: '21%' }} />
                        <col style={{ width: '12%' }} />
                      </colgroup>
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th scope="col" className="px-3 py-2 font-medium">Tên mặt hàng</th>
                          <th scope="col" className="px-3 py-2 text-right font-medium">Số lượng</th>
                          <th scope="col" className="px-3 py-2 text-right font-medium">Đơn giá</th>
                          <th scope="col" className="px-3 py-2 text-right font-medium">Thành tiền *</th>
                          <th scope="col" className="px-2 py-2 font-medium">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {items.map(
                          /** Renders editable item values without recalculating invoice amounts. */
                          (item, index) => {
                            console.debug('[InvoiceReview] Rendering editable item', { row: index + 1 })
                            return (
                              <tr key={index}>
                                {itemFields.map(
                                  /** Labels each input with its item row for review. */
                                  (field) => {
                                    console.debug('[InvoiceReview] Rendering item field', { field: field.name })
                                    return (
                                      <td key={field.name} className="px-2 py-2">
                                        <input
                                          type="text"
                                          inputMode={field.numeric ? 'decimal' : undefined}
                                          name={field.name}
                                          data-index={index}
                                          data-warning={warningTargets.has(`line_items[${index + 1}].${field.name}`) ? 'true' : undefined}
                                          value={item[field.name] ?? ''}
                                          onChange={onItemChange}
                                          required={field.required}
                                          aria-label={`${field.label}, dòng ${index + 1}`}
                                          className={'h-10 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/10' + (field.numeric ? ' text-right tabular-nums' : '')}
                                        />
                                      </td>
                                    )
                                  },
                                )}
                                <td className="px-2 py-2 text-center">
                                  <button type="button" data-index={index} onClick={onRemoveItem}
                                    aria-label={`Xóa mặt hàng dòng ${index + 1}`}
                                    className="rounded-lg p-2 text-red-600 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                                    <Trash2 size={16} aria-hidden="true" />
                                  </button>
                                </td>
                              </tr>
                            )
                          },
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="text-xs text-slate-500">Chưa có dữ liệu mặt hàng.</p>}
                <button type="button" onClick={onAddItem}
                  className="mt-3 rounded-lg border border-brand px-3 py-2 text-xs font-semibold text-brand hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
                  Thêm mặt hàng
                </button>
              </section>
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
  const navigate = useNavigate()
  console.debug('[DocumentDetail] Rendering details', { documentId })
  const review =
    pathname.startsWith('/approvals/') || pathname.startsWith('/invoices/')
  const [document, setDocument] = useState(null)
  const [extraction, setExtraction] = useState(null)
  const [invoice, setInvoice] = useState(emptyInvoice)
  const [items, setItems] = useState([])
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
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const deleteDialogRef = useRef(null)
  const deletePendingRef = useRef(false)
  const deleteTitleId = useId()
  const deleteDescriptionId = useId()
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
    setDeleteOpen(false)
    setDeleteError('')
  }, [documentId])
  /** Keeps the document deletion confirmation modal aligned with its requested visibility. */
  useEffect(() => {
    const dialog = deleteDialogRef.current
    if (!dialog) return
    if (deleteOpen && !dialog.open) {
      console.debug('[DocumentDetail] Opening deletion confirmation', { documentId })
      dialog.showModal()
    } else if (!deleteOpen && dialog.open) {
      console.debug('[DocumentDetail] Closing deletion confirmation', { documentId })
      dialog.close()
    }
  }, [deleteOpen, documentId, document, loading])

  /** Requests confirmation before deleting the loaded document outside the invoice review routes. */
  function requestDelete() {
    if (review || !document || deletePendingRef.current || retryPendingRef.current) return
    console.info('[DocumentDetail] Requesting deletion confirmation', { documentId })
    setDeleteError('')
    setDeleteOpen(true)
  }

  /** Cancels the document deletion dialog unless its API request is already in progress. */
  function cancelDelete(event) {
    event?.preventDefault()
    if (deletePendingRef.current) return
    console.debug('[DocumentDetail] Document deletion cancelled', { documentId })
    setDeleteOpen(false)
    setDeleteError('')
  }

  /** Allows dismissal by clicking the confirmation backdrop before deletion starts. */
  function handleDeleteBackdrop(event) {
    if (event.target !== event.currentTarget) return
    const bounds = event.currentTarget.getBoundingClientRect()
    if (
      event.clientX < bounds.left || event.clientX > bounds.right ||
      event.clientY < bounds.top || event.clientY > bounds.bottom
    ) {
      console.debug('[DocumentDetail] Dismissing deletion backdrop', { documentId })
      cancelDelete(event)
    }
  }

  /** Deletes the confirmed document, refreshes shared totals and returns to the document list after success. */
  async function handleDelete() {
    if (!deleteOpen || !document || review || deletePendingRef.current || retryPendingRef.current) return
    console.info('[DocumentDetail] Starting document deletion', { documentId })
    deletePendingRef.current = true
    setDeleting(true)
    setDeleteError('')
    try {
      await deleteDocument(documentId)
      console.info('[DocumentDetail] Document deleted', { documentId })
      setDeleteOpen(false)
      window.dispatchEvent(new CustomEvent('involens:document-deleted', {
        detail: { filename: document.original_filename },
      }))
      window.dispatchEvent(new Event('involens:documents-changed'))
      navigate('/documents', { replace: true })
    } catch (failure) {
      console.error('[DocumentDetail] Document deletion failed', {
        documentId,
        message: failure.message,
      })
      setDeleteError(failure.message)
    } finally {
      deletePendingRef.current = false
      setDeleting(false)
    }
  }
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
      setItems([])
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
        setItems(ai.value.items ?? [])
        setInvoice({
          sellerName: ai.value.seller_name ?? '',
          sellerAddress: ai.value.seller_address ?? '',
          invoiceDate: ai.value.invoice_date ?? '',
          totalAmount: String(ai.value.total_amount ?? ''),
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
      deletePendingRef.current ||
      deleteOpen ||
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
  /** Updates one reviewed item field while preserving manually entered amounts. */
  function handleItemChange(event) {
    const index = Number(event.target.dataset.index)
    const { name, value } = event.target
    console.debug('[DocumentDetail] Editing invoice item', { index, field: name })
    const nextItems = [...items]
    nextItems[index] = { ...nextItems[index], [name]: value }
    setItems(nextItems)
    setError('')
    setNotice('')
  }
  /** Adds a blank invoice item for the reviewer to complete before confirmation. */
  function handleAddItem() {
    console.info('[DocumentDetail] Adding invoice item', { count: items.length + 1 })
    setItems([...items, { item_name: '', quantity: '', unit_price: '', line_total: '' }])
    setError('')
    setNotice('')
  }
  /** Removes an item from the pending review without saving immediately. */
  function handleRemoveItem(event) {
    const index = Number(event.currentTarget.dataset.index)
    console.info('[DocumentDetail] Removing invoice item', { index })
    const nextItems = [...items]
    nextItems.splice(index, 1)
    setItems(nextItems)
    setError('')
    setNotice('')
  }
  /** Submits invoice edits for backend validation and reflects the confirmed transaction. */
  async function handleSave(event) {
    event.preventDefault()
    if (saving || !extraction) return
    console.info('[DocumentDetail] Submitting invoice review for backend validation')
    setError('')
    setNotice('')
    let reviewedItems
    try {
      reviewedItems = prepareInvoiceItems(items)
    } catch (failure) {
      console.warn('[DocumentDetail] Invoice item validation failed', { message: failure.message })
      setError(failure.message)
      return
    }
    const amount = Number(invoice.totalAmount)
    const body = {
      version: extraction.version,
      items: reviewedItems,
      sellerName: invoice.sellerName.trim(),
      invoiceDate: invoice.invoiceDate,
      totalAmount: amount,
    }
    body.sellerAddress = invoice.sellerAddress.trim() || null
    setSaving(true)
    try {
      const data = await saveExtraction(documentId, body)
      setExtraction(data.extraction_result)
      setItems(data.extraction_result.items ?? [])
      setDocument((current) => ({
        ...current,
        current_state: 'EXTRACT_SUCCESS',
      }))
      setInvoice({
        sellerName: data.invoice.seller_name || '',
        sellerAddress: data.invoice.seller_address || '',
        invoiceDate: data.invoice.invoice_date || '',
        totalAmount: String(data.invoice.total_amount ?? ''),
      })
      setNotice(
        'Đã lưu',
      )
      window.dispatchEvent(new Event('involens:documents-changed'))
      console.info('[DocumentDetail] Invoice review completed')
    } catch (failure) {
      console.error('[DocumentDetail] Invoice review failed', { documentId, message: failure.message })
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
  const pageTitle = review
    ? pathname.startsWith('/approvals/')
      ? 'Duyệt kết quả trích xuất'
      : 'Kiểm tra hóa đơn'
    : 'Chi tiết tài liệu'
  if (loading)
    return (
      <>
        {retryNotification}
        <PageHeader title={pageTitle} />
        <p role="status" className="p-6">
          Đang tải chi tiết tài liệu...
        </p>
      </>
    )
  if (!document)
    return (
      <section className="mx-auto my-8 w-full max-w-xl rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm sm:my-12 sm:px-10">
        <PageHeader title={pageTitle} />
        {retryNotification}
        <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
          <WifiOff aria-hidden="true" className="size-8" />
        </div>
        <div role="alert">
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
            Không thể tải tài liệu
          </h2>
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
        approval={pathname.startsWith('/approvals/')}
        document={document}
        extraction={extraction}
        extractionError={extractionError}
        invoice={invoice}
        items={items}
        onItemChange={handleItemChange}
        onAddItem={handleAddItem}
        onRemoveItem={handleRemoveItem}
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
    <div className="document-surface document-detail-surface">
      {retryNotification}
      <Link to={returnTo} className="text-xs text-brand">
        ← Quay lại danh sách
      </Link>
      <div className="detail-hero mt-4">
        <PageHeader
          title="Chi tiết tài liệu"
          action={
            <button
              type="button"
              onClick={requestDelete}
              disabled={deleting || retrying}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-5 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 size={18} aria-hidden="true" />
              Xóa tài liệu
            </button>
          }
        />
      </div>
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
        <h2 id={deleteTitleId} className="text-lg font-semibold">Xóa tài liệu?</h2>
        <p id={deleteDescriptionId} className="mt-2 text-sm leading-6 text-slate-500">
          Bạn có chắc muốn xóa tài liệu{' '}
          <span className="break-all font-semibold text-slate-800">“{document.original_filename}”</span>?
        </p>
        {deleteError && (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{deleteError}</p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" autoFocus onClick={cancelDelete} disabled={deleting}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
            Hủy
          </button>
          <button type="button" onClick={handleDelete} disabled={deleting}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60">
            {deleting ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : <Trash2 size={16} aria-hidden="true" />}
            {deleting ? 'Đang xóa…' : 'Xóa tài liệu'}
          </button>
        </div>
      </dialog>
      <header className="my-5 flex flex-wrap items-center gap-3 pr-0!">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <FileText size={20} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="break-all text-lg font-bold">{document.original_filename}</h2>
            <StatusBadge status={document.current_state} />
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Tải lên bởi {document.uploaded_by?.full_name || '—'} · {new Date(document.uploaded_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} · {Math.round(document.file_size / 1024)} KB
          </p>
        </div>
      </header>
      {!review && error && (
        <p role="alert" className="mb-4 text-sm text-red-600">
          {error}
        </p>
      )}
      {!review && (
        <section
          aria-label="Tổng quan tài liệu"
          className="detail-card mb-5 rounded-2xl border border-slate-200 bg-white p-5 [&_section]:border-0 [&_section]:pt-0 [&_ol]:min-w-[360px] [&_li>span.relative]:size-9 [&_li>span.relative]:border [&_li>span.relative>svg]:size-4 [&_li>span.relative>span]:w-9 [&_li>span.absolute]:left-[calc(50%+24px)] [&_li>span.absolute]:top-[18px] [&_li>span.absolute]:h-px [&_li>span.absolute]:w-[calc(100%-48px)]"
        >
          <DetailSectionHeader title="Tiến trình xử lý" />
          <div className="flex flex-wrap items-center justify-end gap-3">
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
          <DocumentPipeline status={document.current_state} showTitle={false} />
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
      <div className="grid items-start gap-5 md:grid-cols-2">
        <div className="min-w-0 space-y-5">
          <section className="detail-card min-w-0 rounded-2xl border border-slate-200 bg-white p-5">
            <DetailSectionHeader title="Thông tin tệp" />
            <dl className="grid grid-cols-[100px_minmax(0,1fr)] gap-3 text-xs">
              <dt>Document ID</dt>
              <dd className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 break-all font-mono text-[10px]">{document.id}</span>
              </dd>
              <dt>Loại tệp</dt>
              <dd>{document.mime_type?.split('/').pop()?.toUpperCase() || '—'}</dd>
              <dt>Kích thước</dt>
              <dd>{Math.round(document.file_size / 1024)} KB</dd>
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
          <section className="detail-card detail-extraction-card min-w-0 rounded-2xl border border-slate-200 bg-white p-5">
            <DetailSectionHeader title="Kết quả trích xuất">
              <StatusBadge status={document.current_state} />
            </DetailSectionHeader>
            {extractionError && <p role="status" className="mb-4 text-xs leading-5 text-slate-500">{extractionError}</p>}
            <dl className="grid grid-cols-2 gap-4 text-xs">
              <div className="min-w-0"><dt className="mb-2 text-slate-500">Nhà cung cấp</dt><dd className="min-h-5 break-words rounded bg-slate-100 px-2 py-1">{extraction?.seller_name || '—'}</dd></div>
              <div className="min-w-0"><dt className="mb-2 text-slate-500">Ngày hóa đơn</dt><dd className="min-h-5 break-words rounded bg-slate-100 px-2 py-1">{extraction?.invoice_date || '—'}</dd></div>
              <div className="min-w-0"><dt className="mb-2 text-slate-500">Địa chỉ nhà cung cấp</dt><dd title={extraction?.seller_address || undefined} className="min-h-5 truncate rounded bg-slate-100 px-2 py-1">{extraction?.seller_address || '—'}</dd></div>
              <div className="min-w-0"><dt className="mb-2 text-slate-500">Tổng tiền</dt><dd className="min-h-5 break-words rounded bg-slate-100 px-2 py-1">{extraction?.total_amount ?? '—'}</dd></div>
            </dl>
            {extraction?.error_code && <p className="mt-4 text-xs text-red-600">{extraction.error_code}: {extraction.error_message}</p>}
            {extraction ? (
              <Link
                to={(document.current_state === 'REVIEW_REQUIRED' ? '/approvals/' : '/invoices/') + documentId}
                className="mt-5 inline-flex rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
              >
                {document.current_state === 'REVIEW_REQUIRED' ? 'Đi tới trang duyệt →' : 'Xem chi tiết trích xuất →'}
              </Link>
            ) : (
              <button type="button" disabled className="mt-5 cursor-not-allowed rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white opacity-50">
                {document.current_state === 'REVIEW_REQUIRED' ? 'Đi tới trang duyệt →' : 'Xem chi tiết trích xuất →'}
              </button>
            )}
          </section>
        </div>
        <section className="detail-card min-w-0 rounded-2xl border border-slate-200 bg-white p-5">
          <DetailSectionHeader title="Hóa đơn gốc" />
          {!document.file_url ? (
            <div role="status" className="detail-file-placeholder flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 p-6 text-center text-xs text-slate-500">
              <FileText size={36} className="text-slate-400" aria-hidden="true" />
              Tài liệu chưa có URL tệp hóa đơn.
            </div>
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
            <ZoomableInvoiceImage
              key={document.file_url}
              src={document.file_url}
              alt={'Hóa đơn gốc: ' + document.original_filename}
              onLoad={handleImageLoad}
              onError={handleImageError}
              viewportClassName="h-[65vh] min-h-[360px]"
            />
          )}
        </section>
      </div>
    </div>
  )
}
