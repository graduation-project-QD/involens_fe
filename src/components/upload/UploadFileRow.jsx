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

/** Hiển thị trạng thái một tài liệu và hành động phù hợp: hủy, xem hoặc xóa. */
export default function UploadFileRow({ item, onRemove, onView }) {
  const style = colors[item.status]
  const success = item.status === 'success'
  const error = item.status === 'error'
  return (
    <li
      className={`flex items-center gap-3 rounded-md border px-3.5 py-3 ${style.row}`}
    >
      <span
        className={`flex h-9 w-11 shrink-0 items-center justify-center rounded text-[10px] font-bold ${style.badge}`}
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
              style={{ width: `${item.progress}%` }}
            />
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => (success ? onView(item) : onRemove(item.id))}
        aria-label={`${success ? 'Xem' : item.status === 'uploading' ? 'Hủy' : 'Xóa'} ${item.name}`}
        className={`shrink-0 rounded px-3 py-1.5 text-xs ${success ? 'border border-emerald-200 bg-white text-brand hover:bg-emerald-50' : error ? 'text-red-600 hover:bg-red-100' : 'text-slate-500 hover:bg-slate-100'}`}
      >
        {success ? 'Xem' : item.status === 'uploading' ? 'Hủy' : 'Xóa'}
      </button>
    </li>
  )
}
