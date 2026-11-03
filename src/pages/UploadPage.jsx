import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'
import UploadDropzone from '../components/upload/UploadDropzone'
import UploadFileRow from '../components/upload/UploadFileRow'
import { deleteDocument, uploadDocuments } from '../api/documents'

/** Validates local files and uploads real batches with independent per-file outcomes. */
export default function UploadPage() {
  console.debug('[Upload] Rendering upload workspace')
  const [items, setItems] = useState([])
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [deletingId, setDeletingId] = useState(null)
  const deletePendingRef = useRef(false)
  const nextFileId = useRef(0)
  const navigate = useNavigate()
  /** Adds selected files after checking the backend size, extension and MIME requirements. */
  function addFiles(files) {
    console.info('[Upload] Validating selected files', { count: files.length })
    if (busy || deletePendingRef.current) return
    const mimeTypes = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      pdf: 'application/pdf',
    }
    const added = files.map((file) => {
      const extension = file.name.split('.').pop().toLowerCase()
      const error = !file.size
        ? 'Tệp không được rỗng.'
        : file.size > 10 * 1024 * 1024
          ? 'Tệp vượt quá 10 MB.'
          : !mimeTypes[extension] || file.type !== mimeTypes[extension]
            ? 'Định dạng hoặc MIME không hợp lệ (JPG/JPEG/PNG/PDF).'
            : ''
      if (error)
        console.warn('[Upload] File validation failed', { reason: error })
      return {
        id: nextFileId.current++,
        file,
        name: file.name,
        extension: extension.toUpperCase(),
        status: error ? 'error' : 'ready',
        message: error || 'Sẵn sàng tải lên',
      }
    })
    setItems((current) => [...current, ...added])
    setNotice('')
  }
  /** Deletes a failed upload record by its returned ID, or removes a file that has no server record. */
  async function removeFile(id) {
    if (busy || deletePendingRef.current) return
    const item = items.find((candidate) => candidate.id === id)
    if (!item || !['ready', 'error'].includes(item.status)) return
    if (!item.documentId) {
      console.debug('[Upload] Removing local file selection', { id })
      setItems((current) => current.filter((candidate) => candidate.id !== id))
      return
    }
    deletePendingRef.current = true
    setDeletingId(id)
    setItems((current) => current.map((candidate) =>
      candidate.id === id ? { ...candidate, deleteError: '' } : candidate,
    ))
    console.info('[Upload] Deleting failed upload record', { documentId: item.documentId })
    try {
      await deleteDocument(item.documentId)
      setItems((current) => current.filter((candidate) => candidate.id !== id))
      window.dispatchEvent(new Event('involens:documents-changed'))
      console.info('[Upload] Failed upload record deleted', { documentId: item.documentId })
    } catch (failure) {
      console.error('[Upload] Failed to delete upload record', {
        documentId: item.documentId,
        message: failure.message,
      })
      setItems((current) => current.map((candidate) =>
        candidate.id === id ? { ...candidate, deleteError: failure.message } : candidate,
      ))
    } finally {
      deletePendingRef.current = false
      setDeletingId(null)
    }
  }
  /** Opens the uploaded document using the UUID returned by the backend. */
  function viewFile(item) {
    console.debug('[Upload] Opening uploaded document')
    navigate('/documents/' + item.documentId)
  }
  /** Sends ready files once and displays each returned upload status without claiming AI completion. */
  async function uploadFiles() {
    if (busy || deletePendingRef.current) return
    const ready = items.filter((item) => item.status === 'ready')
    if (!ready.length) return
    console.info('[Upload] Sending batch', { count: ready.length })
    setBusy(true)
    setNotice('')
    setItems((current) =>
      current.map((item) =>
        ready.some((candidate) => candidate.id === item.id)
          ? { ...item, status: 'uploading', message: 'Đang gửi tài liệu...' }
          : item,
      ),
    )
    try {
      const data = await uploadDocuments(ready.map((item) => item.file))
      if (!Array.isArray(data.items) || data.items.length !== ready.length)
        throw new Error(
          'Kết quả upload không khớp số tệp đã gửi. Kiểm tra danh sách tài liệu trước khi gửi lại.',
        )
      const remainingResults = [...data.items]
      const updates = new Map(
        ready.map((item) => {
          const index = remainingResults.findIndex(
            (result) => result.original_filename === item.name,
          )
          if (index < 0)
            throw new Error(
              'Kết quả upload không khớp tên tệp đã gửi. Kiểm tra danh sách tài liệu trước khi gửi lại.',
            )
          const [result] = remainingResults.splice(index, 1)
          const success = result.upload_status === 'UPLOADED'
          return [
            item.id,
            {
              ...item,
              status: success ? 'success' : 'error',
              documentId: result.id,
              message: success
                ? 'Đã tải lên · ' + result.id
                : (result.error_code || 'UPLOAD_FAILED') +
                  ': ' +
                  (result.error_message || 'Tải lên thất bại'),
            },
          ]
        }),
      )
      setItems((current) => current.map((item) => updates.get(item.id) || item))
      setNotice(
        'Đã nhận kết quả upload. Việc tải lên chưa bảo đảm dữ liệu AI đã có; xem trạng thái trong chi tiết tài liệu.',
      )
      window.dispatchEvent(new Event('involens:documents-changed'))
      console.info('[Upload] Batch completed')
    } catch (failure) {
      setNotice(failure.message)
      setItems((current) =>
        current.map((item) =>
          ready.some((candidate) => candidate.id === item.id)
            ? { ...item, status: 'error', message: failure.message }
            : item,
        ),
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <PageHeader
        title="Tải lên tài liệu"
        description="Tải hóa đơn / biên lai lên hệ thống"
      />
      <section className="rounded-md border border-slate-200 bg-white p-6">
        <fieldset disabled={busy || deletingId !== null}>
          <UploadDropzone onFiles={addFiles} />
          <ul
            className="mt-5 max-h-[300px] space-y-3 overflow-y-auto"
            aria-label="Danh sách tệp tải lên"
          >
            {items.map((item) => (
              <UploadFileRow
                key={item.id}
                item={item}
                deleting={deletingId === item.id}
                onRemove={removeFile}
                onView={viewFile}
              />
            ))}
          </ul>
        </fieldset>
        <Button
          disabled={busy || deletingId !== null || !items.some((item) => item.status === 'ready')}
          onClick={uploadFiles}
          className="mt-5 h-10 w-full"
        >
          {busy ? 'Đang tải lên...' : 'Upload & Xử lý'}
        </Button>
        {notice && (
          <p role="status" className="mt-3 text-xs text-slate-600">
            {notice}
          </p>
        )}
      </section>
    </>
  )
}
