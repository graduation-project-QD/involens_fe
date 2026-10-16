import { useState } from 'react'

/** Hiển thị danh sách tài liệu xử lý lỗi và cho phép gửi yêu cầu thử lại trên giao diện tĩnh. */
export default function ErrorDocumentsTable({ documents }) {
  const [retryingDocumentId, setRetryingDocumentId] = useState('')
  const [notice, setNotice] = useState('')

  /** Ghi nhận thao tác thử lại cho tài liệu lỗi mà không gọi dịch vụ xử lý phía máy chủ. */
  function handleRetry(document) {
    console.info('[ErrorDocumentsTable] Static retry requested', {
      documentId: document.documentId,
    })
    setRetryingDocumentId(document.documentId)
    setNotice(`Đã ghi nhận yêu cầu thử lại cho ${document.name}.`)
  }

  console.debug('[ErrorDocumentsTable] Rendering failed documents', {
    count: documents.length,
  })
  return (
    <section className="min-w-0 rounded-md border border-slate-200/70 bg-white p-4 sm:p-6">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] border-collapse text-left text-xs">
          <thead className="bg-[#f7f9fc] text-[11px] text-slate-500">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Tên tài liệu</th>
              <th scope="col" className="px-4 py-3 font-medium">Lý do lỗi</th>
              <th scope="col" className="px-4 py-3 text-center font-medium">Số lần thử lại</th>
              <th scope="col" className="px-4 py-3 font-medium">Lần xử lý gần nhất</th>
              <th scope="col" className="px-4 py-3 text-center font-medium">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((document) => (
              <tr key={document.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                <td className="w-[27%] px-4 py-3.5">
                  <p className="font-medium text-slate-800">{document.name}</p>
                  <p className="mt-0.5 text-[10px] text-slate-400">{document.documentId}</p>
                </td>
                <td className="w-[35%] px-4 py-3.5 text-red-500">{document.reason}</td>
                <td className="px-4 py-3.5 text-center text-slate-600">{document.retryCount}</td>
                <td className="px-4 py-3.5">
                  <p className="text-[11px] text-slate-500">{document.lastProcessedDate}</p>
                  <p className="mt-0.5 text-[10px] text-slate-400">{document.lastProcessedTime}</p>
                </td>
                <td className="px-4 py-3.5 text-center">
                  <button
                    type="button"
                    onClick={() => handleRetry(document)}
                    className="inline-flex min-h-7 items-center justify-center rounded-md border border-emerald-200 bg-white px-3 py-1 text-[10px] font-semibold text-brand transition-colors hover:bg-emerald-50"
                  >
                    {retryingDocumentId === document.documentId ? 'Đã thử lại' : 'Thử lại'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {notice && (
        <p role="status" className="mt-4 text-xs text-slate-500">
          {notice} Chức năng xử lý lại sẽ được kết nối sau.
        </p>
      )}
    </section>
  )
}
