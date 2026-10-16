const statuses = {
  UPLOADED: { label: 'Đã tải lên', style: 'bg-slate-100 text-slate-600' },
  PROCESSING: { label: 'Đang xử lý', style: 'bg-blue-50 text-blue-600' },
  EXTRACT_SUCCESS: {
    label: 'Thành công',
    style: 'bg-emerald-50 text-emerald-700',
  },
  REVIEW_REQUIRED: { label: 'Chờ duyệt', style: 'bg-amber-50 text-amber-700' },
  EXTRACT_FAILED: { label: 'Lỗi xử lý', style: 'bg-red-50 text-red-600' },
  PENDING_FAILURE: { label: 'Lỗi chờ xử lý', style: 'bg-orange-50 text-orange-600' },
  UPLOADED_FAILED: {
    label: 'Tải lên thất bại',
    style: 'bg-red-50 text-red-600',
  },
  success: { label: 'Thành công', style: 'bg-[#e6f4ea] text-[#19833c]' },
  pending: { label: 'Chờ duyệt', style: 'bg-[#fff4db] text-[#b87909]' },
  processing: { label: 'Đang xử lý', style: 'bg-[#eaf2ff] text-[#3478db]' },
  error: { label: 'Lỗi xử lý', style: 'bg-[#ffebeb] text-[#dc3030]' },
  rejected: { label: 'Từ chối', style: 'bg-[#ffebeb] text-[#dc3030]' },
}
/** Displays the document business state returned by the backend. */
export default function StatusBadge({ status }) {
  console.debug('[StatusBadge] Rendering document state', { status })
  const item = statuses[status] ?? {
    label: status,
    style: 'bg-slate-100 text-slate-600',
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded px-2 py-1 text-[10px] font-semibold ${item.style}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {item.label}
    </span>
  )
}
