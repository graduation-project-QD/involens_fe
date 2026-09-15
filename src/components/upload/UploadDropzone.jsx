import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'

/** Nhận tài liệu từ bộ chọn tệp hoặc thao tác kéo thả và chuyển về trang quản lý. */
export default function UploadDropzone({ onFiles }) {
  const input = useRef(null)
  const [dragging, setDragging] = useState(false)

  /** Chuyển các tệp được thả vào vùng nhận cho bước kiểm tra tài liệu. */
  function handleDrop(event) {
    event.preventDefault()
    setDragging(false)
    console.debug('[Upload] Files dropped', {
      count: event.dataTransfer.files.length,
    })
    onFiles(Array.from(event.dataTransfer.files))
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setDragging(false)
      }}
      onDrop={handleDrop}
      className={`flex min-h-[270px] flex-col items-center justify-center rounded-md border border-dashed px-5 py-10 text-center transition-colors ${dragging ? 'border-brand bg-emerald-50' : 'border-slate-200 bg-white'}`}
    >
      <span className="mb-4 flex size-14 items-center justify-center rounded-full bg-[#effbf3] text-brand">
        <Upload size={30} strokeWidth={1.5} />
      </span>
      <p className="text-sm font-bold">Kéo & thả hóa đơn vào đây</p>
      <p className="my-2 text-xs text-slate-500">hoặc</p>
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="rounded border border-slate-200 bg-white px-5 py-2 text-xs font-medium hover:bg-slate-50"
      >
        Chọn tập tin từ máy
      </button>
      <input
        ref={input}
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.pdf"
        aria-label="Chọn tài liệu tải lên"
        className="hidden"
        onChange={(event) => {
          onFiles(Array.from(event.target.files ?? []))
          event.target.value = ''
        }}
      />
      <p className="mt-4 text-[11px] text-slate-500">
        Hỗ trợ JPG, JPEG, PNG, PDF – tối đa 10MB
      </p>
    </div>
  )
}
