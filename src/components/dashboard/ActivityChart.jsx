/** Visualizes daily document upload counts supplied by the backend summary. */
export default function ActivityChart({ data }) {
  console.debug('[ActivityChart] Rendering daily upload counts')
  const max = Math.max(...data.map((item) => item.value), 1)
  return (
    <section
      className="min-w-0 rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_4px_16px_-8px_rgba(15,23,42,0.12)] sm:p-6"
      aria-labelledby="chart-title"
    >
      <h2 id="chart-title" className="text-sm font-semibold uppercase">
        Số tài liệu tải lên theo ngày
      </h2>
      <p className="mt-1 text-[11px] text-slate-500">7 ngày gần nhất</p>
      <div className="mt-5 overflow-x-auto pb-1">
        <div className="relative min-w-[420px]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-40 border-b border-slate-100 bg-[linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[length:100%_25%]"
          />
          <div className="relative flex items-end gap-3">
            {data.map((item) => (
              <div
                key={item.day}
                className="flex min-w-0 flex-1 flex-col items-center"
              >
                <div className="flex h-40 w-full items-end justify-center">
                  <div
                    tabIndex={0}
                    aria-label={`${item.day}: ${item.value} tài liệu`}
                    className="group relative w-full rounded-t-sm border-t-2 border-emerald-800 bg-[#e2efea] transition-colors hover:bg-[#d4e8df] focus-visible:bg-[#d4e8df]"
                    style={{
                      height:
                        item.value === 0
                          ? '4px'
                          : `${(item.value / max) * 80}%`,
                    }}
                  >
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-emerald-900 px-2 py-1 text-[11px] font-medium leading-none tabular-nums text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                    >
                      {item.value}
                    </span>
                  </div>
                </div>
                <span className="mt-3 whitespace-nowrap text-center text-[10px] text-slate-500 sm:text-[11px]">
                  {item.day}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
