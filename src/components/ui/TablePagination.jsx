import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'

const pageSizes = [8, 10, 20]

/** Displays the server result range and lets users request a page or an approved number of rows. */
export default function TablePagination({
  page,
  pageSize,
  total,
  loading,
  onPageChange,
  onPageSizeChange,
}) {
  console.debug('[TablePagination] Rendering table navigation', {
    page,
    pageSize,
    total,
  })
  const [menuOpen, setMenuOpen] = useState(false)
  const pickerRef = useRef(null)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  const menuId = useId()
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)
  const buttonClass =
    'inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors enabled:hover:border-emerald-200 enabled:hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40'

  /** Focuses the current row count and dismisses its choices on outside clicks or while results load. */
  useEffect(() => {
    if (!menuOpen) return
    if (loading) {
      console.debug('[TablePagination] Closing row choices while loading')
      setMenuOpen(false)
      return
    }
    console.debug('[TablePagination] Opening row choices', { pageSize })
    menuRef.current?.querySelector('[aria-selected="true"]')?.focus()
    /** Dismisses row choices when the user interacts outside the pagination picker. */
    function handleOutsidePointer(event) {
      if (pickerRef.current?.contains(event.target)) return
      console.debug('[TablePagination] Closing row choices from outside click')
      setMenuOpen(false)
    }
    document.addEventListener('pointerdown', handleOutsidePointer)
    return () => {
      console.debug('[TablePagination] Removing row choice listener')
      document.removeEventListener('pointerdown', handleOutsidePointer)
    }
  }, [menuOpen, loading, pageSize])

  /** Opens or closes the available row counts without changing the active pagination. */
  function togglePageSizes() {
    if (loading) return
    console.debug('[TablePagination] Toggling row choices', { open: !menuOpen })
    setMenuOpen(!menuOpen)
  }

  /** Opens the row picker from its trigger using standard select arrow keys. */
  function handleTriggerKeyDown(event) {
    if (loading || !['ArrowDown', 'ArrowUp'].includes(event.key)) return
    event.preventDefault()
    console.debug('[TablePagination] Opening row choices from keyboard')
    setMenuOpen(true)
  }

  /** Navigates row choices with arrows, Home and End, and dismisses them with Escape or Tab. */
  function handleMenuKeyDown(event) {
    if (event.key === 'Escape' || event.key === 'Tab') {
      if (event.key === 'Escape') event.preventDefault()
      console.debug('[TablePagination] Dismissing row choices', {
        key: event.key,
      })
      setMenuOpen(false)
      triggerRef.current?.focus()
      return
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const options = Array.from(
      menuRef.current.querySelectorAll('[role="option"]'),
    )
    const currentIndex = options.indexOf(document.activeElement)
    let nextIndex
    if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = options.length - 1
    else
      nextIndex =
        (currentIndex + (event.key === 'ArrowDown' ? 1 : -1) + options.length) %
        options.length
    console.debug('[TablePagination] Focusing row choice', { nextIndex })
    options[nextIndex]?.focus()
  }

  /** Requests the preceding server page while respecting loading and the first-page boundary. */
  function goPrevious() {
    if (loading || page <= 1) return
    console.info('[TablePagination] Requesting previous page', {
      page: page - 1,
    })
    onPageChange(page - 1)
  }

  /** Requests the following server page while respecting loading and the last-page boundary. */
  function goNext() {
    if (loading || page >= totalPages) return
    console.info('[TablePagination] Requesting next page', { page: page + 1 })
    onPageChange(page + 1)
  }

  /** Applies only an approved row count and delegates reloading to the owning list. */
  function changePageSize(event) {
    const nextSize = Number(event.currentTarget.value)
    if (loading) return
    if (!pageSizes.includes(nextSize)) {
      console.warn('[TablePagination] Unsupported page size', {
        pageSize: nextSize,
      })
      return
    }
    setMenuOpen(false)
    triggerRef.current?.focus()
    if (nextSize === pageSize) {
      console.debug('[TablePagination] Keeping current page size', { pageSize })
      return
    }
    console.info('[TablePagination] Requesting page size', {
      pageSize: nextSize,
    })
    onPageSizeChange(nextSize)
  }

  return (
    <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-[11px] text-slate-500">
      <span>
        Hiển thị {start}–{end} trong {total} kết quả
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <div ref={pickerRef} className="relative">
          <button
            ref={triggerRef}
            type="button"
            aria-label={`Số dòng mỗi trang: ${pageSize}`}
            aria-haspopup="listbox"
            aria-expanded={menuOpen && !loading}
            aria-controls={menuOpen && !loading ? menuId : undefined}
            onClick={togglePageSizes}
            onKeyDown={handleTriggerKeyDown}
            disabled={loading}
            className={
              'inline-flex h-8 min-w-36 items-center justify-between gap-3 rounded-lg border bg-white px-3 text-xs font-medium text-brand transition-colors enabled:hover:border-brand/50 enabled:hover:bg-emerald-50/50 disabled:cursor-not-allowed disabled:opacity-50 ' +
              (menuOpen && !loading
                ? 'border-brand ring-2 ring-brand/10'
                : 'border-slate-200')
            }
          >
            <span>{pageSize} dòng / trang</span>
            <ChevronDown
              size={14}
              aria-hidden="true"
              className={
                'transition-transform ' +
                (menuOpen && !loading ? 'rotate-180' : '')
              }
            />
          </button>
          {menuOpen && !loading && (
            <div
              ref={menuRef}
              id={menuId}
              role="listbox"
              aria-label="Số dòng mỗi trang"
              onKeyDown={handleMenuKeyDown}
              className="absolute bottom-full right-0 z-50 mb-2 w-full min-w-40 space-y-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg shadow-slate-200/60"
            >
              {pageSizes.map((size) => (
                <button
                  key={size}
                  type="button"
                  role="option"
                  aria-selected={pageSize === size}
                  tabIndex={-1}
                  value={size}
                  onClick={changePageSize}
                  className={
                    'flex min-h-9 w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors hover:bg-emerald-50 focus-visible:outline-offset-0 ' +
                    (pageSize === size
                      ? 'bg-emerald-50 font-semibold text-brand'
                      : 'font-medium text-slate-600')
                  }
                >
                  <span>{size} dòng / trang</span>
                  {pageSize === size && <Check size={14} aria-hidden="true" />}
                </button>
              ))}
            </div>
          )}
        </div>
        <nav aria-label="Phân trang bảng" className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Trang trước"
            title="Trang trước"
            disabled={loading || page <= 1}
            onClick={goPrevious}
            className={buttonClass}
          >
            <ChevronLeft size={14} aria-hidden="true" />
          </button>
          <span
            aria-live="polite"
            aria-atomic="true"
            className="min-w-10 text-center tabular-nums"
          >
            <span className="font-medium text-brand">{page}</span> /{' '}
            {totalPages}
          </span>
          <button
            type="button"
            aria-label="Trang sau"
            title="Trang sau"
            disabled={loading || page >= totalPages}
            onClick={goNext}
            className={buttonClass}
          >
            <ChevronRight size={14} aria-hidden="true" />
          </button>
        </nav>
      </div>
    </footer>
  )
}
