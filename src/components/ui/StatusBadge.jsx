const statuses = {
  success: { label: 'Thành công', style: 'bg-[#e6f4ea] text-[#19833c]' },
  pending: { label: 'Chờ duyệt', style: 'bg-[#fff4db] text-[#b87909]' },
  processing: { label: 'Đang xử lý', style: 'bg-[#eaf2ff] text-[#3478db]' },
  error: { label: 'Lỗi xử lý', style: 'bg-[#ffebeb] text-[#dc3030]' },
  rejected: { label: 'Từ chối', style: 'bg-[#ffebeb] text-[#dc3030]' },
}
export default function StatusBadge({ status }) {
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
