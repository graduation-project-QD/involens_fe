import { useRef, useState } from 'react'
import { X } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Button from '../components/ui/Button'
import UploadDropzone from '../components/upload/UploadDropzone'
import UploadFileRow from '../components/upload/UploadFileRow'

// Design fixtures only; these rows do not represent server uploads.
const exampleFiles = [
  {
    id: 'example-upload',
    name: 'circlek_nguyentrai.jpg',
    extension: 'JPG',
    status: 'uploading',
    progress: 26,
    message: '2.4 MB – đang tải lên',
  },
  {
    id: 'example-success',
    name: 'grab_bill_090926.pdf',
    extension: 'PDF',
    status: 'success',
    message: 'Tải lên thành công – Document ID: DOC-1043 – Đã tải lên',
  },
  {
    id: 'example-error',
    name: 'bao_cao_thang.docx',
    extension: 'DOCX',
    status: 'error',
    message: 'Lỗi: Định dạng .docx không được hỗ trợ (chỉ JPG/PNG/PDF)',
  },
]

/** Quản lý danh sách tài liệu cục bộ và trình bày các trạng thái tải lên mẫu. */
export default function UploadPage() {
  const [items, setItems] = useState(exampleFiles)
  const [notice, setNotice] = useState('')
  const [selected, setSelected] = useState(null)
  const preview = useRef(null)

  /** Kiểm tra định dạng và giới hạn 10 MB, sau đó thêm từng tệp vào danh sách. */
  function addFiles(files) {
    const added = files.map((file) => {
      const extension = file.name.split('.').pop().toLowerCase()
      const supported = /\.(jpg|jpeg|png|pdf)$/i.test(file.name)
      const error = !supported
        ? `Lỗi: Định dạng không được hỗ trợ (chỉ JPG/JPEG/PNG/PDF)`
        : file.size > 10 * 1024 * 1024
          ? 'Lỗi: Tệp vượt quá dung lượng tối đa 10 MB'
          : ''
      return {
        id: crypto.randomUUID(),
        name: file.name,
        extension: extension.toUpperCase().slice(0, 5),
        status: error ? 'error' : 'ready',
        message:
          error ||
          `${(file.size / (1024 * 1024)).toFixed(1)} MB – Sẵn sàng tải lên`,
      }
    })
    console.debug('[Upload] Files validated', {
      count: added.length,
      errors: added.filter((item) => item.status === 'error').length,
    })
    setItems((current) => [...current, ...added])
    setNotice('')
  }

  /** Loại bỏ tệp khỏi danh sách cục bộ khi người dùng hủy hoặc xóa. */
  function removeFile(id) {
    console.debug('[Upload] Removing file row')
    setItems((current) => current.filter((item) => item.id !== id))
  }

  /** Mở thông tin tài liệu mẫu; không giả lập nội dung tệp trên máy chủ. */
  function viewFile(item) {
    console.debug('[Upload] Opening sample document details')
    setSelected(item)
    preview.current?.showModal()
  }

  /** Thông báo trạng thái tích hợp khi người dùng yêu cầu gửi tài liệu. */
  function uploadFiles() {
    console.debug('[Upload] Upload requested; API not configured')
    setNotice(
      'Chưa kết nối API tải lên. Tài liệu chưa được gửi hoặc xử lý trên máy chủ.',
    )
  }

  return (
    <>
      <PageHeader
        title="Tải lên tài liệu"
        description="Upload hóa đơn / biên lai để hệ thống tự động xử lý và trích xuất dữ liệu."
      />
      <section className="rounded-md border border-slate-200/70 bg-white p-5 sm:p-7">
        <UploadDropzone onFiles={addFiles} />
        <ul aria-label="Danh sách tệp tải lên" className="mt-5 space-y-2.5">
          {items.map((item) => (
            <UploadFileRow
              key={item.id}
              item={item}
              onRemove={removeFile}
              onView={viewFile}
            />
          ))}
        </ul>
        <Button
          onClick={uploadFiles}
          disabled={items.length === 0}
          className="mt-5 h-10 w-full"
        >
          Upload &amp; Xử lý
        </Button>
        {notice && (
          <p role="status" className="mt-3 text-xs text-slate-500">
            {notice}
          </p>
        )}
      </section>
      <p className="mt-3 text-[11px] text-slate-400">
        Dữ liệu trạng thái minh họa · Chưa kết nối API tải lên.
      </p>
      <dialog
        ref={preview}
        aria-labelledby="document-preview-title"
        className="fixed inset-0 m-auto w-[calc(100%-40px)] max-w-md rounded-lg border border-slate-200 bg-white p-6 backdrop:bg-slate-950/40"
      >
        <div className="flex items-center justify-between gap-4">
          <h2 id="document-preview-title" className="text-sm font-semibold">
            Thông tin tài liệu mẫu
          </h2>
          <button
            type="button"
            onClick={() => preview.current?.close()}
            aria-label="Đóng thông tin tài liệu"
            className="p-1"
          >
            <X size={18} />
          </button>
        </div>
        <p className="mt-5 break-all text-sm font-medium">{selected?.name}</p>
        <p className="mt-2 text-xs text-slate-500">{selected?.message}</p>
        <p className="mt-4 text-xs text-slate-500">
          Đây là dữ liệu minh họa giao diện, chưa có tệp trên máy chủ để xem
          trước.
        </p>
      </dialog>
    </>
  )
}
