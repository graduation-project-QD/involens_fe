/** Hiển thị chỉ số tài liệu theo thứ tự biểu tượng, tên và số liệu với màu trạng thái tương ứng. */
export default function StatsGrid({ items }) {
  console.debug('[StatsGrid] Rendering document statistics', {
    count: items.length,
  })
  return (
    <section
      aria-label="Thống kê tài liệu"
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6"
    >
      {items.map(
        /** Presents a server summary metric with its matching status icon and color. */
        (item) => {
          const Icon = item.icon
          return (
            <div
              key={item.label}
              className="min-w-0 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-[0_4px_16px_-8px_rgba(15,23,42,0.12)] sm:p-5"
            >
              <span
                className={`mb-3 inline-flex size-10 items-center justify-center rounded-xl ${item.iconBackground} ${item.color}`}
              >
                <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
              </span>
              <p className="text-xs font-medium uppercase leading-5 text-slate-600">
                {item.label}
              </p>
              <p
                className={`mt-1 text-[32px] font-semibold leading-none tracking-tight tabular-nums ${item.value === 0 ? 'text-slate-500' : item.color}`}
              >
                {item.value}
              </p>
            </div>
          )
        },
      )}
    </section>
  )
}
