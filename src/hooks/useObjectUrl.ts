import { useEffect, useState } from 'react'

/** Creates a temporary object URL for a blob and revokes it when the blob changes or unmounts. */
export function useObjectUrl(blob: Blob | undefined) {
  const [url, setUrl] = useState('')

  useEffect(() => {
    if (!blob) {
      setUrl('')
      return
    }

    let objectUrl: string
    try {
      objectUrl = URL.createObjectURL(blob)
    } catch {
      // A malformed blob should fall back to the decorative image, not crash the card.
      setUrl('')
      return
    }

    // Defense in depth: createObjectURL always returns an opaque same-origin
    // `blob:` URL. Reject anything else so a future refactor cannot feed a
    // script-capable URL into an <img src> sink.
    if (!objectUrl.startsWith('blob:')) {
      URL.revokeObjectURL(objectUrl)
      setUrl('')
      return
    }

    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [blob])

  return url
}
