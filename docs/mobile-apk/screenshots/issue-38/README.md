# Issue #38 acceptance evidence

Captured on emulator `emulator-5554` from the debug APK built from `main` after the compact collection follow-up.

## Viewport and touch targets

Measurements were taken from the Capacitor WebView through Chrome DevTools Protocol.

| Configuration | Evidence |
| --- | --- |
| 360 CSS px width (1080 px at 480 dpi) | App bar is 61 px tall; the search field ends at 137 px, the filter row at 197 px, and the first plant card starts at 235 px. Bottom-navigation items measure 90 × 64 CSS px, above the 48 dp minimum. |
| 600 CSS px width (1080 px at 288 dpi) | Navigation switches to an 88 px rail; rail items measure 71 × 68 CSS px and the plant grid uses two columns. The first plant card starts at 238 px. |
| Bottom sheets | The add-plant sheet is 360 × 736 CSS px with a 24 px top radius; form inputs are 50 px high and footer buttons 52 px, with bottom safe-area padding. The filter sheet is 448 px tall with 50 px selects and a touch-sized close button. |

## Collection layout follow-up

The first native pass kept too much desktop dashboard structure on the home screen. The compact collection now:

- removes the duplicated section heading and both bulk-watering buttons from mobile;
- puts a full-width search field and a single scrollable chip row directly under the app bar;
- moves secondary location/care filters into a Material-style bottom sheet opened by the 48 px filter button;
- shows a one-line summary (`N of M plants · K need water`) instead of a large bulk-care panel;
- leaves watering as task-list actions in the Water tab, which already uses the shared due-state logic.

WebView checks confirm zero `.bulk-care` panels and zero bulk-watering buttons in both compact and 600 dp layouts.

## Screenshots

- [`collection-360dp.png`](./collection-360dp.png) — compact collection with search, filter chips, floating add action and bottom navigation.
- [`filters-sheet-360dp.png`](./filters-sheet-360dp.png) — secondary location/care filters in a bottom sheet.
- [`water-360dp.png`](./water-360dp.png) — due-water task list.
- [`feed-360dp.png`](./feed-360dp.png) — due-feeding task list.
- [`account-360dp.png`](./account-360dp.png) — local-only account and backup actions.
- [`add-sheet-360dp.png`](./add-sheet-360dp.png) — Material-style add-plant bottom sheet.
- [`collection-600dp.png`](./collection-600dp.png) — small-tablet navigation rail and two-column collection.

## Behaviour checks

- Android back closes an open bottom sheet (including the filter sheet) before changing screens.
- Android back returns from Water/Feed to Collection and keeps the app resident.
- Android back on Collection is left unhandled so `MainActivity` can background the task.
- The viewport uses `viewport-fit=cover` and `interactive-widget=resizes-content`; the activity uses `adjustResize`.
- Safe-area insets are applied to the app bar, bottom navigation, dialog footer and scroll padding.
