import { useState } from 'react'
import { FileText } from 'lucide-react'

/** Displays a document preview, falling back to a file icon when its image is unavailable. */
export default function DocumentThumbnail({ thumbnailUrl }) {
  const [failedUrl, setFailedUrl] = useState(null)
  const showImage = Boolean(thumbnailUrl) && failedUrl !== thumbnailUrl

  console.debug('[DocumentThumbnail] Rendering document preview', { showImage })

  /** Replaces an unavailable preview with a file icon without affecting document navigation. */
  function handleImageError() {
    console.warn('[DocumentThumbnail] Preview failed to load; displaying file icon')
    setFailedUrl(thumbnailUrl)
  }

  return (
    <span
      aria-hidden="true"
      className="inline-flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded border border-slate-200 bg-slate-50 text-slate-400"
    >
      {showImage ? (
        <img
          src={thumbnailUrl}
          alt=""
          loading="lazy"
          onError={handleImageError}
          className="h-full w-full object-contain"
        />
      ) : (
        <FileText size={18} />
      )}
    </span>
  )
}
