const colors = {
  uploading: {
    row: 'border-slate-200 bg-white',
    badge: 'bg-slate-100 text-slate-600',
  },
  ready: {
    row: 'border-slate-200 bg-white',
    badge: 'bg-slate-100 text-slate-600',
  },
  success: {
    row: 'border-emerald-200 bg-[#effcf4]',
    badge: 'bg-[#c6f4d6] text-[#14683c]',
  },
  error: {
    row: 'border-red-200 bg-[#fff5f5]',
    badge: 'bg-[#ffd7d9] text-red-600',
  },
}

const fileTypeColors = {
  PDF: 'bg-red-50 text-red-600',
  JPG: 'bg-blue-50 text-blue-600',
  JPEG: 'bg-blue-50 text-blue-600',
  PNG: 'bg-green-50 text-green-600',
}

/** Hiển thị trạng thái một tài liệu và hành động phù hợp: hủy, xem hoặc xóa. */
export default function UploadFileRow({ item, onRemove, onView, deleting = false }) {
  console.debug('[UploadFileRow] Rendering upload outcome', {
    status: item.status,
    deleting,
  })
  const style = colors[item.status]
  const badgeColor = fileTypeColors[item.extension] || style.badge
  const success = item.status === 'success'
  const error = item.status === 'error'
  const actionLabel = deleting ? 'Đang xóa…' : success ? 'Xem' : item.status === 'uploading' ? 'Đang gửi' : 'Xóa'
  return (
    <li
      className={`flex items-center gap-3 rounded-md border px-3.5 py-3 ${style.row}`}
    >
      <span
        className={`flex h-9 w-11 shrink-0 items-center justify-center rounded text-[10px] font-bold ${badgeColor}`}
      >
        {item.extension}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={`break-all text-xs font-medium ${error ? 'text-red-600' : success ? 'text-[#14683c]' : ''}`}
        >
          {item.name}
        </p>
        <p
          className={`mt-1 text-[11px] ${error ? 'text-red-600' : success ? 'text-[#379367]' : 'text-slate-500'}`}
        >
          {item.message}
        </p>
        {item.deleteError && (
          <p role="alert" className="mt-1 text-[11px] text-red-600">
            Không thể xóa tài liệu: {item.deleteError}
          </p>
        )}
        {item.status === 'uploading' && (
          <div
            role="progressbar"
            aria-label={`Tiến trình ${item.name}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={item.progress}
            className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-100"
          >
            <div
              className="h-full bg-brand"
              style={{
                width:
                  item.progress === undefined ? '100%' : item.progress + '%',
              }}
            />
          </div>
        )}
      </div>
      <button
        type="button"
        disabled={deleting || item.status === 'uploading'}
        onClick={() => (success ? onView(item) : onRemove(item.id))}
        aria-label={`${actionLabel} ${item.name}`}
        className={`shrink-0 rounded px-3 py-1.5 text-xs ${success ? 'border border-emerald-200 bg-white text-brand hover:bg-emerald-50' : item.status === 'uploading' ? 'text-slate-500 hover:bg-slate-100' : 'border border-red-200 bg-red-50 text-red-600 hover:border-red-300 hover:bg-red-100'}`}
      >
        {actionLabel}
      </button>
    </li>
  )
}
