import StatusBadge from '../ui/StatusBadge'

export default function DocumentsTable({
  documents,
  title = 'Tài liệu gần đây',
}) {
  return (
    <section className="min-w-0 rounded-md border border-slate-200/70 bg-white p-6">
      <h2 className="mb-5 text-sm font-semibold">{title}</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] border-collapse text-left text-xs">
          <thead className="bg-[#f7f9fc] text-[11px] text-slate-500">
            <tr>
              {['Tên tài liệu', 'Người tải lên', 'Thời gian', 'Trạng thái'].map(
                (label) => (
                  <th key={label} scope="col" className="px-4 py-3 font-medium">
                    {label}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {documents.map((document) => (
              <tr
                key={document.id}
                className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
              >
                <td className="w-[43%] px-4 py-3.5 font-medium">
                  {document.name}
                </td>
                <td className="px-4 py-3.5 text-slate-500">
                  {document.uploader}
                </td>
                <td className="px-4 py-3.5">
                  <p className="text-[11px]">{document.date}</p>
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    {document.time}
                  </p>
                </td>
                <td className="px-4 py-3.5">
                  <StatusBadge status={document.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {documents.length === 0 && (
          <p className="py-10 text-center text-sm text-slate-500">
            Chưa có tài liệu.
          </p>
        )}
      </div>
    </section>
  )
}
