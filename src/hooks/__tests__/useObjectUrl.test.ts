// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import { useObjectUrl } from '../useObjectUrl'

const originalCreate = Object.getOwnPropertyDescriptor(URL, 'createObjectURL')
const originalRevoke = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL')

function mockObjectUrls(createValue: string) {
  const create = vi.fn(() => createValue)
  const revoke = vi.fn()
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: create })
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revoke })
  return { create, revoke }
}

afterEach(() => {
  cleanup()
  if (originalCreate) Object.defineProperty(URL, 'createObjectURL', originalCreate)
  else Reflect.deleteProperty(URL, 'createObjectURL')
  if (originalRevoke) Object.defineProperty(URL, 'revokeObjectURL', originalRevoke)
  else Reflect.deleteProperty(URL, 'revokeObjectURL')
})

describe('useObjectUrl', () => {
  it('uses and revokes an opaque blob: URL', async () => {
    const { create, revoke } = mockObjectUrls('blob:plant-photo')
    const blob = new Blob(['x'], { type: 'image/png' })

    const { result, unmount } = renderHook(() => useObjectUrl(blob))
    await waitFor(() => expect(result.current).toBe('blob:plant-photo'))

    expect(create).toHaveBeenCalledWith(blob)
    unmount()
    expect(revoke).toHaveBeenCalledWith('blob:plant-photo')
  })

  it('rejects a URL that is not a blob: URL', async () => {
    const { revoke } = mockObjectUrls('javascript:alert(1)')
    const blob = new Blob(['x'], { type: 'image/png' })

    const { result } = renderHook(() => useObjectUrl(blob))
    await waitFor(() => expect(result.current).toBe(''))

    expect(revoke).toHaveBeenCalledWith('javascript:alert(1)')
  })

  it('clears the URL when the blob is removed', async () => {
    mockObjectUrls('blob:plant-photo')
    const blob = new Blob(['x'], { type: 'image/png' })

    const { result, rerender } = renderHook(({ value }) => useObjectUrl(value), {
      initialProps: { value: blob as Blob | undefined },
    })
    await waitFor(() => expect(result.current).toBe('blob:plant-photo'))

    rerender({ value: undefined })
    await waitFor(() => expect(result.current).toBe(''))
  })
})
