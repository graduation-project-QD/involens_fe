export default function ActivityChart({ data }) {
  const max = Math.max(...data.map((item) => item.value), 1)
  return (
    <section
      className="rounded-md border border-slate-200/70 bg-white p-6"
      aria-labelledby="chart-title"
    >
      <h2 id="chart-title" className="text-sm font-semibold">
        Số tài liệu xử lý theo ngày
      </h2>
      <p className="mt-1 text-[11px] text-slate-500">7 ngày gần nhất</p>
      <div className="mt-7 flex h-36 items-end gap-2 sm:gap-4">
        {data.map((item) => (
          <div
            key={item.day}
            className="group flex h-full min-w-0 flex-1 flex-col justify-end"
          >
            <div
              tabIndex={0}
              aria-label={`${item.day}: ${item.value} tài liệu`}
              className="relative border-t-2 border-brand bg-[#e1eeea] transition-colors hover:bg-[#c9e1d8] focus:bg-[#c9e1d8]"
              style={{ height: `${(item.value / max) * 75}%` }}
            >
              <span className="absolute -top-7 left-1/2 -translate-x-1/2 rounded bg-sidebar px-2 py-1 text-[10px] text-white opacity-0 group-hover:opacity-100 group-focus-within:opacity-100">
                {item.value}
              </span>
            </div>
            <span className="mt-3 text-center text-[11px] text-slate-500">
              {item.day}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
