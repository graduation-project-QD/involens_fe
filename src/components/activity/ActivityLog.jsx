const toneStyles = {
  brand: 'font-semibold text-brand',
  warning: 'font-semibold text-amber-500',
  danger: 'font-semibold text-red-500',
  success: 'font-semibold text-emerald-600',
}

/** Hiển thị lịch sử các hoạt động nghiệp vụ trên toàn hệ thống theo thứ tự thời gian. */
export default function ActivityLog({ activities }) {
  console.debug('[ActivityLog] Rendering system activity history', {
    count: activities.length,
  })
  return (
    <section className="rounded-md border border-slate-200/70 bg-white px-5 py-2 sm:px-7">
      <ol aria-label="Lịch sử thay đổi hệ thống">
        {activities.map((activity) => (
          <li
            key={activity.id}
            className="grid gap-2 border-b border-slate-100 py-4 last:border-0 sm:grid-cols-[115px_minmax(0,1fr)] sm:gap-5"
          >
            <time className="text-[11px] text-slate-400">
              {activity.date} <span className="ml-1">{activity.time}</span>
            </time>
            <p className="text-xs leading-5 text-slate-600">
              {activity.segments.map((segment, index) => (
                <span
                  key={`${activity.id}-${index}`}
                  className={segment.tone ? toneStyles[segment.tone] : segment.emphasis ? 'font-semibold text-slate-800' : ''}
                >
                  {segment.text}
                </span>
              ))}
            </p>
          </li>
        ))}
      </ol>
    </section>
  )
}
