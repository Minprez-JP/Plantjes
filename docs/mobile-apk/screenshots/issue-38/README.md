# Issue #38 acceptance evidence

Captured on emulator `emulator-5554` from the debug APK built on the `feat/mobile-native-ux` branch.

## Viewport and touch targets

Measurements were taken from the Capacitor WebView through Chrome DevTools Protocol.

| Configuration | Evidence |
| --- | --- |
| 360 CSS px width (1080 px at 480 dpi) | Bottom-navigation items measure 90 × 64 CSS px, comfortably above the 48 dp minimum. |
| 600 CSS px width (1080 px at 288 dpi) | Navigation switches to an 88 px rail; rail items measure 71 × 68 CSS px and the plant grid uses two columns. |
| Bottom sheet | Add-plant sheet is 360 × 736 CSS px with a 24 px top radius; form inputs are 50 px high, footer buttons 52 px, and the footer includes the bottom safe-area inset. |

## Screenshots

- [`collection-360dp.png`](./collection-360dp.png) — compact collection with floating add action and bottom navigation.
- [`water-360dp.png`](./water-360dp.png) — due-water task list.
- [`feed-360dp.png`](./feed-360dp.png) — due-feeding task list.
- [`account-360dp.png`](./account-360dp.png) — local-only account and backup actions.
- [`add-sheet-360dp.png`](./add-sheet-360dp.png) — Material-style bottom-sheet dialog.
- [`collection-600dp.png`](./collection-600dp.png) — small-tablet navigation rail and two-column collection.

## Behaviour checks

- Android back closes an open bottom sheet before changing screens.
- Android back returns from Water/Feed to Collection and keeps the app resident.
- Android back on Collection is left unhandled so `MainActivity` can background the task.
- The viewport uses `viewport-fit=cover` and `interactive-widget=resizes-content`; the activity uses `adjustResize`.
- Safe-area insets are applied to the app bar, bottom navigation, dialog footer and scroll padding.
