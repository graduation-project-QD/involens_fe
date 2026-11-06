/** Displays the page title, supporting information and available actions above its content. */
export default function PageHeader({ title, description, action }) {
  console.debug('[PageHeader] Rendering workspace title', { title })
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="break-words text-lg font-bold tracking-tight sm:text-xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 break-words text-xs text-slate-500">
            {description}
          </p>
        )}
      </div>
      {action && (
        <div className="flex flex-wrap items-center justify-end gap-4">
          {action}
        </div>
      )}
    </div>
  )
}
