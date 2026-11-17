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

    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [blob])

  return url
}
