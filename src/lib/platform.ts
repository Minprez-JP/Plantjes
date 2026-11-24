import { Capacitor } from '@capacitor/core'

/** True only when the app is running inside a native Capacitor WebView. */
export function isNativeMobilePlatform(): boolean {
  return Capacitor.isNativePlatform()
}
