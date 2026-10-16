import { request } from './client'

/** Counts matching invoices without creating an export job or downloadable file. */
export function previewExport(query) {
  console.debug('[Export] Preview requested')
  return request('/export-jobs/preview', { method: 'POST', query })
}

/** Resolves the server's Excel download name, falling back when the header is unavailable or invalid. */
function getExportFilename(contentDisposition = '') {
  console.debug('[Export] Resolving Excel filename')
  const encodedFilename = contentDisposition.match(
    /\bfilename\*\s*=\s*UTF-8''([^;]+)/i,
  )
  if (encodedFilename) {
    try {
      const filename = decodeURIComponent(encodedFilename[1].trim())
      if (filename) return filename
    } catch {
      console.warn(
        '[Export] Invalid encoded filename; checking the standard filename',
      )
    }
  }
  const filename = contentDisposition.match(
    /\bfilename\s*=\s*(?:"([^"]+)"|([^;]+))/i,
  )
  return filename?.[1] || filename?.[2]?.trim() || 'invoices.xlsx'
}

/** Requests the Excel file for the previewed invoice filters using the current authenticated session. */
export async function exportExcel(query, signal) {
  console.info('[Export] Requesting Excel file', query)
  const { blob, contentDisposition } = await request('/export-jobs/excel', {
    method: 'POST',
    query,
    signal,
    responseType: 'blob',
  })
  const filename = getExportFilename(contentDisposition)
  console.info('[Export] Excel file received', { filename, bytes: blob.size })
  return { blob, filename }
}
