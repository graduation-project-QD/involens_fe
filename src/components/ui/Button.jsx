export default function Button({
  children,
  className = '',
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-md bg-brand px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#074d39] disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
