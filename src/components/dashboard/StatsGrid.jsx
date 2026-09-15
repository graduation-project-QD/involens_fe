/** Hiển thị các chỉ số tổng quan từ items thành từng ô thống kê riêng biệt. */
export default function StatsGrid({ items }) {
  return (
    <section
      aria-label="Thống kê tài liệu"
      className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-6"
    >
      {items.map((item) => (
        <div
          key={item.label}
          className="min-w-0 rounded border border-slate-200 bg-white px-5 py-6"
        >
          <p
            className={`text-4xl font-semibold leading-none tracking-tight ${item.color}`}
          >
            {item.value}
          </p>
          <p className="mt-3 text-sm text-slate-500">{item.label}</p>
        </div>
      ))}
    </section>
  )
}
