import { useEffect, useId, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Eye, Trash2, UserPlus } from 'lucide-react'
import { deleteAccount, getAccounts } from '../api/auth'
import { useAuth } from '../context/AuthContext'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'

const roleLabels = { MANAGER: 'Quản lý', EMPLOYEE: 'Nhân viên' }
const statusLabels = { ACTIVE: 'Hoạt động', LOCKED: 'Đã khóa' }
const statusColors = {
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  LOCKED: 'bg-red-50 text-red-600',
}

/** Restricts the account management screen to the authenticated manager. */
export default function AccountsPage() {
  console.debug('[Accounts] Checking account management access')
  const { user } = useAuth()
  if (user?.role !== 'MANAGER') {
    console.info('[Accounts] Account management access denied')
    return <Navigate to="/dashboard" replace />
  }
  return <AccountList />
}

/** Displays account pages and lets managers confirm deletion of eligible accounts. */
function AccountList() {
  console.debug('[Accounts] Rendering account list')
  const navigate = useNavigate()
  const { user } = useAuth()
  const [page, setPage] = useState(1)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadVersion, setReloadVersion] = useState(0)
  const [notice, setNotice] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const deletePendingRef = useRef(false)
  const deleteDialogRef = useRef(null)
  const deleteTitleId = useId()
  const deleteDescriptionId = useId()

  /** Loads the requested account page and cancels obsolete requests on navigation. */
  useEffect(() => {
    console.info('[Accounts] Loading account page', { page })
    const controller = new AbortController()
    setLoading(true)
    setResult(null)
    setError('')

    /** Stores the account page only while its request remains current. */
    function receiveAccounts(data) {
      if (controller.signal.aborted) return
      setResult(data)
      console.info('[Accounts] Account page loaded', { page: data.page, total: data.total })
    }

    /** Exposes backend or connection failures without reporting cancelled requests. */
    function reportFailure(failure) {
      if (controller.signal.aborted) return
      console.error('[Accounts] Account page load failed', { page, message: failure.message })
      setError(failure.message)
    }

    /** Completes loading feedback for the current account request. */
    function finishLoading() {
      if (controller.signal.aborted) return
      console.debug('[Accounts] Account request finished', { page })
      setLoading(false)
    }

    getAccounts({ page, page_size: 8 }, controller.signal)
      .then(receiveAccounts)
      .catch(reportFailure)
      .finally(finishLoading)

    /** Cancels account loading when the page changes or the screen is closed. */
    function cancelRequest() {
      console.debug('[Accounts] Cancelling account page request', { page })
      controller.abort()
    }
    return cancelRequest
  }, [page, reloadVersion])

  /** Shows account deletion confirmation while blocking background interaction. */
  useEffect(() => {
    console.debug('[Accounts] Synchronizing deletion confirmation', { open: Boolean(deleteTarget) })
    const dialog = deleteDialogRef.current
    if (deleteTarget && !dialog.open) dialog.showModal()
    else if (!deleteTarget && dialog.open) dialog.close()
  }, [deleteTarget])

  /** Prevents deletion of managers and the currently authenticated account. */
  function cannotDelete(account) {
    console.debug('[Accounts] Checking deletion eligibility', { accountId: account.id })
    return account.role === 'MANAGER' || String(account.id) === String(user?.id)
  }

  /** Opens confirmation only for an eligible account in the displayed list. */
  function requestDelete(event) {
    console.info('[Accounts] Requesting deletion confirmation')
    if (deletePendingRef.current || loading) return
    const account = result?.items.find((item) => String(item.id) === event.currentTarget.dataset.accountId)
    if (!account || cannotDelete(account)) {
      console.warn('[Accounts] Account deletion unavailable')
      return
    }
    setDeleteError('')
    setNotice('')
    setDeleteTarget(account)
  }

  /** Cancels confirmation before deletion starts and clears previous deletion errors. */
  function cancelDelete(event) {
    event?.preventDefault()
    console.debug('[Accounts] Cancelling deletion confirmation')
    if (deletePendingRef.current) return
    setDeleteTarget(null)
    setDeleteError('')
  }

  /** Dismisses confirmation when the user clicks outside the dialog content. */
  function handleDeleteBackdrop(event) {
    console.debug('[Accounts] Checking deletion dialog backdrop click')
    if (event.target !== event.currentTarget) return
    const bounds = event.currentTarget.getBoundingClientRect()
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) {
      cancelDelete(event)
    }
  }

  /** Deletes a confirmed eligible account and reloads a valid account page on success. */
  async function handleDelete() {
    console.info('[Accounts] Starting confirmed account deletion')
    if (deletePendingRef.current || !deleteTarget || cannotDelete(deleteTarget)) return
    const accountId = deleteTarget.id
    deletePendingRef.current = true
    setDeleting(true)
    setDeleteError('')
    try {
      await deleteAccount(accountId)
      console.info('[Accounts] Account deleted', { accountId })
      setDeleteTarget(null)
      setNotice('Đã xóa tài khoản thành công.')
      if (result?.items.length === 1 && page > 1) setPage(page - 1)
      else setReloadVersion(reloadVersion + 1)
    } catch (failure) {
      console.error('[Accounts] Account deletion failed', { accountId, message: failure.message })
      setDeleteError(failure.message)
    } finally {
      deletePendingRef.current = false
      setDeleting(false)
    }
  }

  /** Requests the adjacent backend page within the returned pagination bounds. */
  function changePage(event) {
    const nextPage = Number(event.currentTarget.dataset.page)
    if (loading || !result || nextPage < 1 || nextPage > Math.ceil(result.total / result.page_size)) {
      console.debug('[Accounts] Page change unavailable', { nextPage })
      return
    }
    console.info('[Accounts] Changing account page', { page: nextPage })
    setPage(nextPage)
  }

  /** Opens account details from a row click while preserving its separate action controls. */
  function openAccountDetails(event) {
    console.debug('[Accounts] Checking account row navigation')
    if (event.target.closest('a, button')) {
      console.debug('[Accounts] Account row action handles its own click')
      return
    }
    const accountId = event.currentTarget.dataset.accountId
    console.info('[Accounts] Opening account details', { accountId })
    navigate('/accounts/' + encodeURIComponent(accountId))
  }

  /** Presents account fields with detail navigation and eligible deletion actions. */
  function renderAccount(account) {
    console.debug('[Accounts] Rendering account row', { accountId: account.id })
    return (
      <tr key={account.id} data-account-id={account.id} onClick={openAccountDetails} className="cursor-pointer border-b border-slate-100 transition-colors hover:bg-emerald-50/60">
        <td className="p-3">{account.id}</td>
        <td className="p-3 font-medium text-brand">{account.email}</td>
        <td className="p-3">{account.fullName}</td>
        <td className="p-3">{roleLabels[account.role] || account.role}</td>
        <td className="p-3">
          <span className={'inline-flex rounded-full px-2 py-1 text-[10px] font-medium ' + (statusColors[account.status] || 'bg-slate-100 text-slate-600')}>
            {statusLabels[account.status] || account.status}
          </span>
        </td>
        <td className="p-3">
          {account.createdAt
            ? new Date(account.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
            : '—'}
        </td>
        <td className="p-3">
          <div className="flex items-center gap-2">
            <Link to={'/accounts/' + encodeURIComponent(account.id)} title="Xem tài khoản" aria-label={'Xem tài khoản: ' + account.email} className="inline-flex size-8 items-center justify-center rounded-md border border-emerald-300 bg-emerald-50 text-brand transition-colors hover:border-emerald-400 hover:bg-emerald-100">
              <Eye size={16} aria-hidden="true" />
            </Link>
            <button type="button" title={cannotDelete(account) ? 'Không thể xóa tài khoản đang đăng nhập hoặc tài khoản quản lý' : 'Xóa tài khoản'} aria-label={'Xóa tài khoản: ' + account.email} data-account-id={account.id} onClick={requestDelete} disabled={loading || deleting || cannotDelete(account)} className="inline-flex size-8 items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-600 transition-colors hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50">
              <Trash2 size={16} aria-hidden="true" />
            </button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <>
      <PageHeader
        title="Quản lý tài khoản"
        action={
          <Link
            to="/accounts/create"
            className="ml-auto inline-flex min-h-9 items-center justify-center gap-2 rounded-md bg-brand px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#074d39]"
          >
            <UserPlus size={16} aria-hidden="true" />
            Tạo tài khoản
          </Link>
        }
      />
      {error && <p role="alert" className="mb-4 text-sm text-red-600">{error}</p>}
      {notice && <p role="status" className="mb-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
      <dialog
        ref={deleteDialogRef}
        aria-labelledby={deleteTitleId}
        aria-describedby={deleteDescriptionId}
        onCancel={cancelDelete}
        onClick={handleDeleteBackdrop}
        className="m-auto w-[calc(100%_-_32px)] max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-slate-800 shadow-2xl backdrop:bg-slate-900/45 backdrop:backdrop-blur-sm"
      >
        <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-red-50 text-red-600">
          <Trash2 size={24} aria-hidden="true" />
        </div>
        <h2 id={deleteTitleId} className="text-lg font-semibold">Xóa tài khoản?</h2>
        <p id={deleteDescriptionId} className="mt-2 text-sm leading-6 text-slate-500">
          Bạn có chắc muốn xóa tài khoản <span className="break-all font-semibold text-slate-800">“{deleteTarget?.email}”</span>?
        </p>
        {deleteError && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{deleteError}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" autoFocus onClick={cancelDelete} disabled={deleting} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Hủy</button>
          <button type="button" onClick={handleDelete} disabled={deleting} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60">
            <Trash2 size={16} aria-hidden="true" />
            {deleting ? 'Đang xóa…' : 'Xóa tài khoản'}
          </button>
        </div>
      </dialog>
      {loading && <p role="status" className="py-6 text-sm text-slate-500">Đang tải dữ liệu...</p>}
      <section aria-busy={loading} className="min-w-0 rounded-md border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold">Danh sách tài khoản</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th scope="col" className="p-3">ID</th>
                <th scope="col" className="p-3">Email</th>
                <th scope="col" className="p-3">Họ tên</th>
                <th scope="col" className="p-3">Vai trò</th>
                <th scope="col" className="p-3">Trạng thái</th>
                <th scope="col" className="p-3">Ngày tạo</th>
                <th scope="col" className="p-3">Thao tác</th>
              </tr>
            </thead>
            <tbody>{result?.items.map(renderAccount)}</tbody>
          </table>
        </div>
        {!loading && !error && !result?.items.length && <p className="py-8 text-center text-sm text-slate-500">Không có tài khoản.</p>}
      </section>
      {result && (
        <footer className="mt-4 flex items-center justify-between text-xs text-slate-500">
          <span>{result.total} kết quả · Trang {result.page} / {Math.max(1, Math.ceil(result.total / result.page_size))}</span>
          <div className="flex gap-2">
            <Button aria-label="Trang trước" title="Trang trước" disabled={loading || result.page <= 1} data-page={result.page - 1} onClick={changePage}>
              <ChevronLeft size={18} aria-hidden="true" />
            </Button>
            <Button aria-label="Trang sau" title="Trang sau" disabled={loading || result.page * result.page_size >= result.total} data-page={result.page + 1} onClick={changePage}>
              <ChevronRight size={18} aria-hidden="true" />
            </Button>
          </div>
        </footer>
      )}
    </>
  )
}
