const DEFAULT_MAX_DIMENSION = 1600
const DEFAULT_QUALITY = 0.82
const SKIP_REENCODE_BYTES = 512 * 1024

const OPTIMIZABLE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/bmp'])

let preferredOutputType: string | undefined

function getPreferredOutputType() {
  if (preferredOutputType) return preferredOutputType

  try {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    preferredOutputType = canvas.toDataURL('image/webp').startsWith('data:image/webp')
      ? 'image/webp'
      : 'image/jpeg'
    canvas.width = 0
    canvas.height = 0
  } catch {
    preferredOutputType = 'image/jpeg'
  }

  return preferredOutputType
}

async function decodeImage(blob: Blob) {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(blob, { imageOrientation: 'from-image' })
  }

  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('The image could not be decoded.'))
    }
    image.src = objectUrl
  })
}

function getSourceSize(source: ImageBitmap | HTMLImageElement) {
  if ('naturalWidth' in source) {
    return { width: source.naturalWidth, height: source.naturalHeight }
  }
  return { width: source.width, height: source.height }
}

async function encodeImage(
  source: ImageBitmap | HTMLImageElement,
  width: number,
  height: number,
  type: string,
  quality: number,
) {
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height)
    const context = canvas.getContext('2d')
    if (!context) return null

    context.drawImage(source, 0, 0, width, height)
    const blob = await canvas.convertToBlob({ type, quality })
    canvas.width = 0
    canvas.height = 0
    return blob
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  try {
    const context = canvas.getContext('2d')
    if (!context) return null

    context.drawImage(source, 0, 0, width, height)
    return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality))
  } finally {
    canvas.width = 0
    canvas.height = 0
  }
}

export interface ImageOptimizationOptions {
  /** Longest side of the stored image, in pixels. */
  maxDimension?: number
  /** Encoder quality between 0 and 1. */
  quality?: number
  /** Skip images smaller than this many bytes without decoding them. */
  minBytes?: number
}

/**
 * Downscales and re-encodes a photo before it is persisted. Plant photos are
 * only shown at card size, so keeping multi-megapixel originals wastes both
 * IndexedDB space and (much more) decoded bitmap memory.
 *
 * Returns the original blob when the image cannot be decoded, is already
 * small, or re-encoding would not make it smaller.
 */
export async function optimizeImageBlob(blob: Blob, options: ImageOptimizationOptions = {}): Promise<Blob> {
  const { maxDimension = DEFAULT_MAX_DIMENSION, quality = DEFAULT_QUALITY, minBytes = 0 } = options

  if (!OPTIMIZABLE_TYPES.has(blob.type) || blob.size < minBytes) return blob

  let source: ImageBitmap | HTMLImageElement | undefined

  try {
    source = await decodeImage(blob)
    const { width, height } = getSourceSize(source)
    if (!width || !height) return blob

    const scale = Math.min(1, maxDimension / Math.max(width, height))
    const targetWidth = Math.max(1, Math.round(width * scale))
    const targetHeight = Math.max(1, Math.round(height * scale))
    const outputType = getPreferredOutputType()
    const needsResize = scale < 1
    const likelyBenefits = blob.size > SKIP_REENCODE_BYTES || blob.type !== outputType

    if (!needsResize && !likelyBenefits) return blob

    const optimized = await encodeImage(source, targetWidth, targetHeight, outputType, quality)
    if (!optimized) return blob
    if (!needsResize && optimized.size >= blob.size) return blob

    return optimized
  } catch {
    return blob
  } finally {
    if (typeof ImageBitmap !== 'undefined' && source instanceof ImageBitmap) source.close()
  }
}

/** Cheap size check used to decide whether a stored photo is worth re-encoding. */
export function shouldOptimizeStoredImage(blob: Blob, minBytes: number) {
  return blob.size >= minBytes
}
