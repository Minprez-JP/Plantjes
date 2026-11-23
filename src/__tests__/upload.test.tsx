// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useObjectUrl } from '../hooks/useObjectUrl'
import { optimizeImageBlob } from '../image'
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES } from '../lib/constants'
import { parsePlantForm } from '../lib/plantForm'

const originalCreateObjectURL = Object.getOwnPropertyDescriptor(URL, 'createObjectURL')
const originalRevokeObjectURL = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL')

function imageFile(type: string, name = 'plant.img') {
  return new File(['image bytes'], name, { type })
}

function oversizedImageFile() {
  const file = imageFile('image/jpeg', 'huge.jpg')
  Object.defineProperty(file, 'size', { value: MAX_IMAGE_BYTES + 1 })
  return file
}

function validFormData() {
  const data = new FormData()
  data.set('name', 'Test plant')
  data.set('environment', 'Indoor')
  data.set('waterEveryDays', '7')
  data.set('light', 'Bright indirect')
  return data
}

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,')
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  if (originalCreateObjectURL) {
    Object.defineProperty(URL, 'createObjectURL', originalCreateObjectURL)
  } else {
    Reflect.deleteProperty(URL, 'createObjectURL')
  }
  if (originalRevokeObjectURL) {
    Object.defineProperty(URL, 'revokeObjectURL', originalRevokeObjectURL)
  } else {
    Reflect.deleteProperty(URL, 'revokeObjectURL')
  }
})

describe('upload MIME and size gate', () => {
  it.each([...ACCEPTED_IMAGE_TYPES])('accepts raster type %s', (type) => {
    const data = validFormData()
    data.set('imageFile', imageFile(type))

    const result = parsePlantForm(data)

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.submission.imageFile?.type).toBe(type)
  })

  it.each([
    ['SVG', 'image/svg+xml', 'plant.svg'],
    ['HTML', 'text/html', 'plant.html'],
    ['script', 'application/javascript', 'plant.js'],
    ['unknown', 'application/octet-stream', 'plant.bin'],
  ])('rejects %s masquerading as a photo', (_label, type, name) => {
    const createBitmap = vi.fn()
    vi.stubGlobal('createImageBitmap', createBitmap)
    const data = validFormData()
    data.set('imageFile', imageFile(type, name))

    const result = parsePlantForm(data)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.tab).toBe('picture')
      expect(result.field).toBe('imageFile')
    }
    expect(createBitmap).not.toHaveBeenCalled()
  })

  it('rejects files over 15 MB before any decoding attempt', () => {
    const createBitmap = vi.fn()
    vi.stubGlobal('createImageBitmap', createBitmap)
    const data = validFormData()
    data.set('imageFile', oversizedImageFile())

    const result = parsePlantForm(data)

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/15 MB or smaller/)
    expect(createBitmap).not.toHaveBeenCalled()
  })
})

describe('image downscale and corrupt-blob handling', () => {
  it('downscales the longest side to at most 1600 px', async () => {
    const recorded: Array<{ width: number; height: number }> = []
    const convertToBlob = vi.fn(async function convert(this: { width: number; height: number }) {
      recorded.push({ width: this.width, height: this.height })
      return new Blob(['optimized'], { type: 'image/jpeg' })
    })

    class FakeImageBitmap {
      constructor(
        public width: number,
        public height: number,
      ) {}
      close = vi.fn()
    }
    class FakeOffscreenCanvas {
      width: number
      height: number
      constructor(width: number, height: number) {
        this.width = width
        this.height = height
      }
      getContext() {
        return { drawImage: vi.fn() }
      }
      convertToBlob = convertToBlob
    }

    vi.stubGlobal('ImageBitmap', FakeImageBitmap)
    vi.stubGlobal('OffscreenCanvas', FakeOffscreenCanvas)
    const source = new FakeImageBitmap(3200, 1600)
    const createBitmap = vi.fn().mockResolvedValue(source)
    vi.stubGlobal('createImageBitmap', createBitmap)

    const original = new Blob([new Uint8Array(600 * 1024)], { type: 'image/jpeg' })
    const optimized = await optimizeImageBlob(original)

    expect(createBitmap).toHaveBeenCalledWith(original, { imageOrientation: 'from-image' })
    expect(recorded).toEqual([{ width: 1600, height: 800 }])
    expect(convertToBlob).toHaveBeenCalledWith({ type: expect.any(String), quality: 0.82 })
    expect(source.close).toHaveBeenCalledOnce()
    expect(optimized).not.toBe(original)
  })

  it('returns the original blob when decoding fails', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('truncated JPEG')))
    const blob = new Blob(['truncated'], { type: 'image/jpeg' })

    await expect(optimizeImageBlob(blob)).resolves.toBe(blob)
  })

  it('returns the original blob when no object URL can be created', async () => {
    vi.stubGlobal('createImageBitmap', undefined)
    const createObjectURL = vi.fn(() => { throw new Error('no object URL') })
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true })
    const blob = new Blob(['truncated'], { type: 'image/png' })

    await expect(optimizeImageBlob(blob, { minBytes: 1 })).resolves.toBe(blob)
    expect(createObjectURL).toHaveBeenCalled()
  })
})

describe('object URL fallback', () => {
  let createObjectURL: ReturnType<typeof vi.fn>
  let revokeObjectURL: ReturnType<typeof vi.fn>

  beforeEach(() => {
    createObjectURL = vi.fn(() => 'blob:plant-photo')
    revokeObjectURL = vi.fn()
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true })
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true })
  })

  it('leaves the URL empty when no blob is present', () => {
    const { result } = renderHook(() => useObjectUrl(undefined))

    expect(result.current).toBe('')
    expect(createObjectURL).not.toHaveBeenCalled()
  })

  it('falls back silently when object URL creation throws', () => {
    createObjectURL.mockImplementation(() => { throw new Error('malformed blob') })
    const { result } = renderHook(() => useObjectUrl(new Blob(['bad'])))

    expect(result.current).toBe('')
  })

  it('rejects and revokes a non-blob URL', () => {
    createObjectURL.mockReturnValue('javascript:alert(1)')
    const { result } = renderHook(() => useObjectUrl(new Blob(['bad'])))

    expect(result.current).toBe('')
    expect(revokeObjectURL).toHaveBeenCalledWith('javascript:alert(1)')
  })

  it('revokes a valid blob URL on unmount', () => {
    const { result, unmount } = renderHook(() => useObjectUrl(new Blob(['ok'])))

    expect(result.current).toBe('blob:plant-photo')
    unmount()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:plant-photo')
  })
})
