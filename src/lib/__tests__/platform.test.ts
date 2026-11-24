import { describe, expect, it, vi } from 'vitest'

const isNativePlatform = vi.fn()

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => isNativePlatform() },
}))

import { Capacitor } from '@capacitor/core'
import { isNativeMobilePlatform } from '../platform'

describe('isNativeMobilePlatform', () => {
  it('mirrors the Capacitor native-platform check', () => {
    isNativePlatform.mockReturnValue(true)
    expect(isNativeMobilePlatform()).toBe(true)

    isNativePlatform.mockReturnValue(false)
    expect(isNativeMobilePlatform()).toBe(false)
    expect(Capacitor.isNativePlatform).toBeTypeOf('function')
  })
})
