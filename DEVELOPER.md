# Developer guide

This guide describes how **Plantjes.** is put together and where to make changes.
Contribution requirements and the account-approval policy are in
[CONTRIBUTING.md](./CONTRIBUTING.md).

## Project layout

- `src/main.tsx` mounts the React application, imports the global stylesheet, and renders `App` inside `ErrorBoundary` and `React.StrictMode`.
- `src/App.tsx` is the page composition: it calls `usePlantJournal` and lays out the header, overview, collection, sidebar, footer, and dialogs.
- `src/components/` holds one presentational component per UI concern:
  - `TopBar.tsx` — brand, local-storage badge with hover/focus import-export actions, primary add action.
  - `OverviewStrip.tsx` — the three care counters and the next-feeding summary.
  - `CollectionSection.tsx` — collection heading, filter/search controls, bulk-watering bar, and the loading, empty, no-results, and grid states.
  - `FilterTabs.tsx` — the environment filter group.
  - `FilterSelect.tsx` — the compact native selects for the location and care filters.
  - `PlantCard.tsx` — a single memoized plant card, including its local photo object URL and care action buttons.
  - `CareSidebar.tsx` — watering list, feeding list, and privacy note.
  - `EmptyState.tsx` — first-run prompt.
  - `PlantDialog.tsx` — the four-tab add/edit form, local field state, keyboard tab handling, and validation feedback.
  - `CareDialog.tsx` — the read-only pruning details dialog (with edit mode) opened from a plant card.
  - `ExportDialog.tsx` — backup file-name entry, validation, and download action.
  - `ImportDialog.tsx` — `.plantjes` file picker, parse feedback, replacement preview, and confirmation.
  - `SiteFooter.tsx` — page footer.
  - `ErrorBoundary.tsx` — last-resort render-error fallback with a reload action.
- `src/hooks/` holds stateful React logic:
  - `usePlantJournal.ts` — owns the plant collection, loading, persistence, derived watering rows, feeding rows, and the plant/pruning/note/backup dialog state and actions.
  - `useStoredPhotoBackfill.ts` — the one-time stored-photo recompression pass.
  - `useObjectUrl.ts` — creates and revokes a blob object URL.
- `src/lib/` holds framework-free domain logic:
  - `dates.ts` — watering and feeding countdowns plus date labels.
  - `plants.ts` — winter hardiness, temperature/humidity/soil formatting, row derivation, combined filtering, location derivation, and due selection for watering and feeding.
  - `backup.ts` — the versioned `.plantjes` document format, export serialization, file-name rules, and defensive import parsing/validation.
  - `locations.ts` — location name normalization, validation, duplicate matching, and alphabetical sorting.
  - `plantForm.ts` — default form values plus `FormData` parsing and validation for the plant form and the care shortcut.
  - `plantRecord.ts` — pure record assembly, including the feeding save/timestamp rules.
  - `constants.ts` — shared text/height limits, option allowlists (including soil), and the fallback image.
  - `__tests__/` — Vitest coverage for date, row, form, location, record, backup, and plant-dialog tab behavior.
- `src/types.ts` holds app-level types (`Filter`, `CareFilter`, `PlantFilters`, `PlantFormValues`, `CareDetails`, `PlantRow`, `PlantFormSubmission`, `AddLocationResult`). `CareDetails` covers the optional soil and pruning fields; the care shortcut dialog saves pruning fields only.
- `src/db.ts` defines the `Plant` and `PlantLocation` data types and the Dexie IndexedDB database, including the reusable location table, storage of uploaded photo blobs, and optional soil and pruning details on plant records.
- `src/image.ts` downscales and re-encodes photos before storage, and checks whether an existing stored photo should be recompressed.
- `src/styles.css` contains the design tokens, page styling, responsive layout, and component styles, including the self-hosted `@font-face` declarations.
- `index.html` supplies the HTML entry point, page title, metadata, font preloads, referrer policy, and favicon.
- `vite.config.ts` configures Vite with the React plugin and injects the production security meta tag.
- `vitest.config.ts` configures the Node-based unit test runner.
- `.github/workflows/ci.yml` installs from the lockfile, audits dependencies, runs the tests, and builds on push and pull request.

Keep components presentational and side-effect free, put React state in hooks, and keep pure calculations in `src/lib` so they stay easy to reason about and test.

## Runtime and data flow

1. `main.tsx` mounts `App` into the `#root` element.
2. `App` calls `usePlantJournal`, which starts with an empty plant list and location list, a loading state, and a mount effect that reads all plant records and saved locations from `plantDatabase` (guarded against unmount).
3. The resulting lists are held in hook state. Once per load, photos larger than 256 KB are recompressed sequentially and written back so older records do not keep multi-megapixel originals. Watering rows, watering due rows, feeding due rows, the tracked-feeding count, and the next-feeding label are memoized in the hook and only recalculated when the plant list changes; the combined filter/search pass and the location option list are memoized in `CollectionSection`.
4. Create, edit, water, and delete actions write directly to the Dexie tables and then update the matching item in hook state, so the app does not re-read every plant and photo after each action. The initial load is the only table read. Adding a location writes one `locations` row and appends it to hook state. Bulk watering writes every selected plant inside one Dexie transaction, then updates hook state once; a failed transaction leaves all records unchanged and sets the shared action error.
5. Export builds the versioned document from the current hook state, serializes embedded photos, and triggers a browser download; import parses and validates the chosen file before `usePlantJournal.importJournal` clears and rewrites both Dexie tables in one transaction, then replaces hook state. A failed import rolls back and leaves the current collection in place.
6. `CollectionSection` owns the environment, location, care, and search filters because no other part of the page uses them; the visible rows also define the bulk-watering group. All other page state (plants, dialog, loading, errors) lives in `usePlantJournal`.

There is no API server or shared application state outside the browser database. Different browsers and devices do not sync records, and feeding metadata is stored alongside each plant record on the same device.

## Data model and persistence

`src/db.ts` exports:

- `PlantEnvironment`, restricted to `'Indoor' | 'Outdoor'`.
- `Plant`, the stored plant record shape.
- `PlantLocation`, a saved location with its display name and comparison key.
- `plantDatabase`, an instance of `PlantDatabase` extending Dexie.

The database name is `tend-plant-journal`, a pre-release identifier retained so existing journals keep loading; it is not the product name. Renaming it requires a migration that copies records from the old database. The `plants` table uses schema `++id, name, environment, location`; `id` is the auto-increment primary key, and `name`, `environment`, and `location` are indexed. The other plant fields are stored on each record but are not indexed. The optional soil, feeding, and pruning fields were added without a schema version bump for the same reason. The `locations` table uses schema `++id, &normalizedName`; the unique index is the final duplicate guard, and `name` holds the display spelling.

Plant fields are:

| Field | Purpose |
| --- | --- |
| `id` | IndexedDB-generated record ID; optional before insertion. |
| `name`, `species` | Plant's display name and species/variety. |
| `environment`, `location` | Indoor/outdoor classification and the display name of a saved location. `location` is stored as a plain string so plant records do not need a migration; an empty string means no location. |
| `light`, `minTemperature`, `maxTemperature`, `minHumidity`, `maxHumidity` | Recorded care preferences; temperatures are optional whole-number Celsius values and humidity is an optional whole-number percentage range. Neither is measured automatically. |
| `winterHardy` | Derived boolean: `true` when `minTemperature` is set and `<= -10`, otherwise `false`. It is stored with every plant but is only displayed on outdoor plant cards that have a minimum temperature; it is not an editable form field. |
| `draftSensitive` | Boolean set from the indoor-only "Not resistant to drafts" checkbox. It is always `false` for outdoor plants and is only displayed on indoor cards when `true`. |
| `waterEveryDays` | Positive integer interval used for due calculations. |
| `lastWateredAt` | ISO timestamp of the most recent watering action. |
| `fertilizerType` | Optional allowlisted fertilizer type, or `undefined` when feeding is disabled. |
| `fertilizeEveryDays` | Optional positive integer interval used for due calculations only while a plant is being tracked for feeding. |
| `lastFertilizedAt` | ISO timestamp of the most recent fertilizing action; cleared when feeding is disabled. |
| `createdAt` | ISO timestamp set when the record is first created. |
| `notes` | User-entered free text managed by the note dialog; line breaks are preserved and the stored value is trimmed. Empty or whitespace-only notes count as missing. |
| `edibility`, `toxicity` | Edible yes/no selection and toxic-for-pets selection. |
| `soilDrainage`, `soilComposition`, `soilPh` | Optional soil details stored as allowlisted string unions. Unset values are omitted; none of these fields is indexed. |
| `pruningTime`, `pruningNotes` | Optional free text for when to prune and how to prune. Values are trimmed; a blank entry clears the field when the pruning dialog or form saves. |
| `expectedHeightCm`, `heightAfterPruningCm` | Optional positive whole-number heights in centimetres, capped at `MAX_PLANT_HEIGHT_CM`. Blank entries stay `undefined`. |
| `imageBlob` | Optional uploaded image stored as a `Blob` inside the same IndexedDB plant record. Older records without this property continue to work. |
| `imageOptimized` | Optional flag set after a photo has been compressed or checked, so the startup pass does not re-encode it on every load. |

When adding a plant, `createdAt`, `lastWateredAt`, and the feeding timestamp are initialized to the current time when the schedule is enabled. Editing uses `put` with the existing ID and preserves the existing watering and feeding timestamps for active schedules. Soil and pruning details are part of `PlantFormValues`, so the Soil and Care tabs write the same record as the other fields; the pre-filled controls mean an edit keeps existing values unless the user changes them. Notes are deliberately not part of `PlantFormValues`: `buildPlantRecord` carries `previous.notes` forward when the add/edit form saves, and the note dialog updates only `notes`. Watering updates only `lastWateredAt`; fertilizing updates only `lastFertilizedAt`. Saving the pruning shortcut dialog updates only the pruning fields. Deletion removes the record after browser confirmation.

The photo upload is read from the form as a `File`, downscaled to at most 1600 px on its longest side, and re-encoded (WebP where supported, otherwise JPEG) before being written with the plant record. Re-encoding is skipped when the source is already small or cannot be decoded, and the smaller of the original and optimized blob is kept. New uploads are marked with `imageOptimized`; the startup pass marks older photos after checking them once. IndexedDB structured-clones the blob, so it remains stored across page reloads. Since `imageBlob` and `imageOptimized` are not indexed fields, adding them does not require changing the current Dexie object-store schema version; pre-existing records simply have no blob until a photo is uploaded. Removing a stored photo clears `imageBlob` and resets `imageOptimized` on the updated record.

When rendering a card, the `useObjectUrl` hook creates a temporary object URL from `imageBlob` with `URL.createObjectURL`. Its effect cleanup revokes the URL when the component unmounts or its blob changes. The URL is only a display handle; it is not persisted. `PlantCard` displays the photo through an `<img loading="lazy" decoding="async">`, which lets the browser decode off-screen cards on demand instead of holding every full bitmap in memory. The uploaded blob is shown when present; otherwise, the app uses the decorative fallback image. `PlantCard` is memoized and receives stable callbacks, so typing in search or changing filters does not re-render unchanged cards. The edit form preserves an existing blob unless a replacement is selected or the remove-photo checkbox is checked.

Older version-1 records may contain an unused `imageUrl` property from the former URL-based photo field. The current app does not read or display that property, and it is dropped naturally when such a plant is saved again. Since it was not an IndexedDB index, no schema-version change is needed.

The database is currently at Dexie schema version 3. Version 3 adds the `locations` table and its unique `normalizedName` index; the `plants` object store is unchanged, and there is no data migration. Location names are trimmed, whitespace-collapsed, NFKC-normalized, and lowercased before they are compared, and `src/lib/locations.ts` owns those rules. Existing free-text plant locations are deliberately not seeded into the new list during this beta: a plant with a legacy value keeps it on its card, but editing that plant shows `No location` until a saved location is chosen. Reset the browser's plant journal or recreate records against the new location list if testing old beta data.

If indexed fields or the object-store key path need to change, increment the Dexie schema version in `src/db.ts` and provide an appropriate migration for existing users.

### Backup format

`src/lib/backup.ts` owns the portable `.plantjes` format. It is JSON with `format: "plantjes"`, an integer `version` (`1`), `exportedAt`, a deduplicated location-name list, and a plant array. Plant records are exported without local database IDs; photos are embedded as MIME-typed base64 data URLs so one file is a complete restore source. `imageOptimized` is preserved, and `imageBlob` is reconstructed on import.

Export names are trimmed, stripped of a typed extension, checked against unsafe/reserved file-name rules, length-capped, and always returned with `.plantjes`. Import checks the extension and the 100 MB file cap in the dialog, then `parsePlantjes` rejects invalid JSON, wrong formats, newer or unsupported versions, missing plant lists, malformed records, invalid dates/intervals/ranges, invalid pruning heights, unsupported select values, unsafe image MIME types, and oversized embedded photos. Text limits, location normalization, and winter-hardiness derivation are reused from the same helpers as the forms. Invalid locations or a location missing from the saved list are added to the imported location list.

Import is a replace operation, not a merge. The confirmation dialog shows plant, location, and photo counts plus the number of current records that will be lost. `usePlantJournal.importJournal` clears both tables and uses `bulkAdd` inside one read-write transaction; only after the commit does it replace hook state. The current filters remain in `CollectionSection`, which automatically resets a location filter that no longer exists.

## Watering and collection logic

The date helpers live in `src/lib/dates.ts`; row derivation, filtering, and range formatting live in `src/lib/plants.ts`.

- `daysUntilWatered(plant)` calculates `waterEveryDays - floor((now - lastWateredAt) / 24 hours)`.
- `daysUntilFertilized(plant)` calculates `fertilizeEveryDays - floor((now - lastFertilizedAt) / 24 hours)` when feeding is enabled. It returns `null` when feeding is not tracked and `0` when an interval exists but `lastFertilizedAt` is missing, so such records are due immediately instead of being permanently scheduled but never due.
- `nextFertilizedAt(plant)` returns the next feed date, or `null` when feeding is not tracked; a missing timestamp is treated as due now.
- A result of zero or less means the plant is due. Due plants are sorted by most overdue first.
- `formatDue` and `formatLastWatered` turn watering day counts into short labels. Feeding uses the overview date formatter instead of a separate due-label helper.
- `toPlantRows` precomputes both `daysLeft` and `fertilizerDaysLeft` per plant. `selectDueRows` and `selectFertilizerDueRows` derive due plants from all plants, independent of the current collection search/filter. `countTrackedFeeding` counts plants with an interval, and `formatNextFeeding` returns `Due now`, the earliest upcoming date, or `Not scheduled`. The watering list and feeding list each display at most five entries and report any additional count.
- `wateredCount` is `plants.length - dueRows.length`; it means plants not currently due, not the number watered today.
- `filterPlantRows` combines four filters with AND: environment, location, care state, and search. Location matching reuses `normalizeLocationName`, so case and surrounding whitespace do not split a group. The care filter uses `isWateringDue` (`daysLeft <= 0`) or `isFeedingDue` (tracked feeding with `fertilizerDaysLeft <= 0`). Search is case-insensitive and checks only name, species, and location. Visible plants are sorted by soonest watering date.
- `listPlantLocations` derives the location-filter options from the plants themselves, omits empty locations, deduplicates case-insensitively, and sorts alphabetically. A location that disappears from the collection resets the filter to `Any location`.
- Bulk watering uses the visible rows as its group. `Water due` selects visible rows with `isWateringDue`; `Water all shown` selects every visible row after confirmation. `waterPlants` writes the whole batch in one Dexie transaction with a shared `lastWateredAt`, then updates hook state once and returns whether the batch committed.
- `formatTemperatureRange` displays the normalized values as `minimum–maximum°C`, using a typographic minus sign for negative values (for example, `−10–30°C`).
- Winter hardiness uses the shared `WINTER_HARDY_THRESHOLD` constant (`-10`): values at the threshold are hardy. Saving recomputes the stored boolean from the minimum temperature; an unset minimum makes it `false`, and the badge is hidden until a minimum is provided.
- `PlantCard` displays the winter-hardiness badge only when `environment` is `Outdoor`; the value remains stored for indoor plants but is not shown. The draft-sensitivity badge is the indoor counterpart: it appears only for indoor plants whose `draftSensitive` value is `true`.
- `formatSoilSummary` joins the set soil values in the fixed order **composition · pH · drainage** and returns `null` when none are set, so the summary line is omitted entirely. Pruning details are not formatted onto the card; the scissors action opens `CareDialog` instead.

The interval is measured in elapsed 24-hour periods, not calendar days, and due status is computed when React renders or refreshes data. There is no timer, browser notification, or background reminder.

## UI components and forms

`App` composes the page and passes hook state down; it holds no state of its own. `usePlantJournal` owns the loaded plants, dialog visibility, the plant being edited, loading, and database/save error text. `CollectionSection` owns the environment, location, care, and search filters, the derived location options, the bulk-care bar, and its success notice because they only affect that section.

- `PlantCard` presents a plant and dispatches callbacks for edit, delete, watering, fertilizing, and notes. It reads both countdowns from the `PlantRow` instead of recalculating them. When `fertilizeEveryDays` is set, a full-width feeding row appears with the interval and optional fertilizer type, a `Fertilize` button is shown on the left of the footer, and the feed button uses the gold accent plus the coral due style when due. The footer keeps the care actions on one row with the compact, icon-led last-watered date centered between them, even when feeding is enabled. Pruning details are available through the scissors action rather than repeated in the card text.
- `EmptyState` offers the first-add action when the database has no records.
- `PlantDialog` supplies the add/edit form. Both create and edit use the same five tabs: **Main** (name, species, growing setting, origin, location, watering and feeding, toxicity, edibility), **Environment** (light, draft sensitivity, temperature, humidity), **Soil** (composition, pH, drainage), **Care** (when to prune, expected mature height, height after pruning, pruning notes), and **Picture** (photo preview, upload, and removal). The **Growing in** select stays on Main because indoor/outdoor is treated as core plant information; the Environment tab still reacts to it by showing draft sensitivity only for indoor plants. Every panel stays mounted and is hidden with the `hidden` attribute, so uncontrolled controls keep their values when the user switches tabs. The tablist uses roving `tabIndex`, Left/Right/Home/End keys, `aria-selected`, `aria-controls`, and labelled `tabpanel`s. The form uses `noValidate` so required controls on a hidden panel cannot trigger the browser's unfocusable-control error; `parsePlantForm` in `src/lib/plantForm.ts` returns the failing tab and field name, and the dialog switches to that panel before focusing and scrolling to the control. The same error is announced with `role="alert"`, identifies the tab, and marks the tab and control as invalid. `PlantDialog` uses native form controls and `FormData`; the name and watering interval are required. Feeding is optional: when the `Feed every` field is blank, the fertilizer type is disabled and the schedule, type, and timestamp are cleared; when it is filled, the plant begins tracking fertilizer due dates. The interval is validated as a whole number from 1–365 days instead of being silently clamped, and a hint explains that a blank interval disables feeding. Temperature and humidity bounds are optional and use whole numbers; negative temperatures are allowed. Validation rejects a minimum above the maximum and humidity outside 0–100, then maps the form to `PlantFormValues`; persistence errors come from `usePlantJournal` via the `error` prop. On cards, one-sided ranges render as `≤ max` or `≥ min`, and an unset range is omitted. Winter hardiness is deliberately derived rather than edited. The "Growing in" select on Main is controlled so the "Not resistant to drafts" checkbox on Environment can appear only while `environment` is `Indoor`; switching a plant to `Outdoor` saves `draftSensitive` as `false`. Room or spot is a controlled select backed by the `locations` table, with `No location` as the optional empty value. **Add location** opens an inline row instead of a nested dialog: Enter adds, Escape cancels, focus moves to the input and back to the select, and a duplicate name reuses the existing entry. `usePlantJournal.addLocation` validates and persists the name before updating hook state; `parsePlantForm` receives the saved list and rejects any location outside it, so tampered form data cannot store an arbitrary room name.
- `NoteDialog` owns note reading and editing. With no saved note it shows an empty state and an **Add note** action; with a saved note it shows the text with line breaks preserved (`white-space: pre-wrap`) and **Edit note**, **Clear note**, and **Close** actions. Edit mode validates through `parseNote` in `src/lib/notes.ts`, normalizes line endings, trims outer whitespace, and enforces the 2,000-character limit. `saveNote` writes only the `notes` field; a storage failure keeps the dialog open with an inline error. The dialog shares `useDialogFocus`, which focuses the marked control, closes on Escape, and restores focus to the card button.
- `CareDialog` is the pruning shortcut dialog opened from the plant card. It shows saved pruning details in a read-only view (like `NoteDialog`) with **Edit**, **Clear**, and **Close** actions; edit mode validates through pruning-only `parseCareForm` in `src/lib/plantForm.ts` (200-character pruning time, 2,000-character pruning notes, positive whole-number heights). Soil information is intentionally omitted because it is already shown on the card and edited via the Soil tab/form. Saving calls `saveCare`, which writes only the pruning fields; clearing writes empty/undefined pruning fields without touching soil. The dialog uses `useDialogFocus` for Escape handling and focus restoration.
- `TopBar` keeps the **Saved on this device** badge as the backup entry point. Import and Export live beside it, are visually revealed on hover or keyboard focus, and become always visible on touch devices (`@media (hover: none)`) and small screens. Both are real buttons with accessible names, so keyboard and screen-reader users do not need hover.
- `ExportDialog` prefills a date-based file name, validates it with `normalizeBackupName`, and calls `usePlantJournal.exportJournal`. Export failures stay in the dialog; a successful download closes it.
- `ImportDialog` accepts only `.plantjes`, checks the file size and extension, and parses before offering confirmation. It shows the selected file name, plant/location/photo counts, and an explicit replacement warning. Nothing is written until **Replace collection** is pressed; parse and storage errors both render inline. A successful import closes the dialog and refreshes the collection, locations, and derived overview/sidebar data.
- On cards, the note action sits at the bottom-left of the photo and opens `NoteDialog`. It is always visible so notes are discoverable without hover. An empty or whitespace-only note uses a neutral grey-on-white treatment; a saved note uses the filled green treatment plus a small dot, so the state is not conveyed by color alone. Accessible names are `Add note for {name}` and `View note for {name}`.
- The care action sits at the bottom-right of the photo, uses the pruning-scissors icon, and opens `CareDialog`. It is shown only when *when to prune* has been filled, so the dialog presents a stated/read-only view of saved pruning details. It is hidden until card hover or keyboard focus and is always visible on touch devices (`@media (hover: none)` and the small-screen rules). The accessible name is `View pruning details for {name}`.
- `EMPTY_PLANT_FORM` in `src/lib/plantForm.ts` sets defaults for new records. If adding a field, update the `Plant` type, `PlantFormValues` (`src/types.ts`), `EMPTY_PLANT_FORM`, `parsePlantForm`, the correct tab in `PlantDialog`, dialog prefill (`toFormValues`), and card display as applicable. Fields that the add/edit dialog can change belong in `PlantFormValues`; `buildPlantRecord` in `src/lib/plantRecord.ts` maps those values onto the persisted record and preserves metadata that is not in the form. Fertilizer metadata is intentionally optional: it does not add a separate due boolean, and its due date is derived from `fertilizeEveryDays` and `lastFertilizedAt` instead of a stored boolean flag. The feeding timestamp rules live in `resolveFeedingFields`: a blank interval clears the schedule, a new schedule starts now, an active schedule keeps its timestamp, and a tracked record with no timestamp is healed to now.

For behavior changes, keep the add and edit paths aligned: editing should retain record metadata that is not part of the form, and newly created records need valid timestamps and a watering interval.

## Styling and design tokens

`src/styles.css` is organized as a token-driven system, in this order: design tokens, base/reset, shared type patterns, shell and header, buttons, page frame, overview, layout, plant grid and cards, care sidebar, footer, empty and status states, dialog and form, motion, responsive rules.

Use the custom properties on `:root` instead of hard-coded values:

- `--font-sans` (`DM Sans`) for UI and body copy; `--font-display` (`Fraunces`) for headings.
- `--weight-regular`, `--weight-medium`, `--weight-semibold`, `--weight-bold` for every `font-weight`.
- `--text-2xs` through `--text-7xl` for every `font-size`; `--leading-*` and `--tracking-caps` for line height and uppercase tracking.
- `--canvas`, `--surface`, `--ink*`, `--text-muted`, `--text-subtle`, `--line*`, and the accent groups (`--green*`, `--coral*`, `--blue*`, `--gold*`) for color.
- `--space-1` … `--space-8`, `--radius-*`, `--shadow-*`, and `--transition` for spacing, radii, shadows, and animation timing.

Typography is intentionally limited to five roles: Fraunces 500 display headings, Fraunces 400 italic editorial accents (species, origin, quote lines), DM Sans 700 uppercase labels, DM Sans 600 for emphasis and controls, and DM Sans 400 for body copy. Add new sizes or colors as tokens rather than one-off values, and keep new rules inside the matching section so the file stays scannable.

## Errors, assets, and security

### Error handling

Failures are handled at the layer that can recover, so no user action ends in an
unhandled rejection or a blank page:

- **Initial load** — `usePlantJournal` catches IndexedDB access errors and shows
  `LOAD_ERROR` in the collection. The effect is cancellation-guarded so a
  StrictMode remount cannot write stale data.
- **Save** — failures are shown inside the dialog and the form stays open, which
  matters when browser storage is full. Editing state is preserved.
- **Add location** — validation errors render beside the input; a storage failure
  keeps the inline row open and leaves the rest of the plant form untouched. A
  concurrent duplicate is recovered through the unique index and reuses the row.
- **Water and delete** — both are wrapped in `try`/`catch`; failures set
  `actionError`, which `App` merges into the collection banner. A later success
  clears it. Bulk watering uses one transaction: a failure rolls back the batch,
  changes no hook state, and sets the same banner with a no-changes message.
- **Export** — document building, blob creation, and download dispatch are
  wrapped together. A failure keeps the export dialog open with `exportError`;
  the success path closes it.
- **Import** — the dialog reports extension, size, JSON, format, version, record,
  and image validation errors before any write. The database replacement is one
  transaction; a storage failure rolls back, keeps the dialog open, and states
  that the existing plants were not changed.
- **Stored-photo pass** — `useStoredPhotoBackfill` catches per record, so one bad
  photo cannot abort the pass or surface as an unhandled rejection.
- **Blob display** — `useObjectUrl` falls back to the decorative image if
  `URL.createObjectURL` throws.
- **Render errors** — `ErrorBoundary` in `src/main.tsx` logs the error and
  component stack only, then offers a reload. Never include plant data in logs.

### Self-hosted assets

The app makes no third-party runtime requests. Fonts are latin subsets in
`public/fonts` declared with `@font-face` in `src/styles.css`; decorative photos
are in `public/images`. Their licences are committed alongside them
(`public/fonts/OFL-*.txt`), and the full asset inventory is in
[THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md). Do not reintroduce Google
Fonts, Unsplash URLs, or any other remote asset: it would break the CSP and the
privacy guarantee.

### Content Security Policy

`vite.config.ts` defines `securityMeta()`, a `apply: 'build'` plugin that injects
a same-origin CSP meta tag into the production `index.html`. Because it only runs
for builds, Vite's dev server and HMR are unaffected.

- `default-src`, `script-src`, `style-src`, `font-src`, `connect-src`, `base-uri`,
  and `form-action` are limited to `'self'`.
- `img-src` additionally allows `data:` and `blob:` for local photo rendering.
- `object-src 'none'` and `upgrade-insecure-requests` are set.
- `frame-ancestors` is deliberately absent: browsers ignore it in a meta tag, so
  it must be sent as a response header by the host.
- `build.sourcemap` is `false` so production source is not published.

`index.html` also sets `<meta name="referrer" content="no-referrer">` and
preloads the two primary font files. Recommended host headers — including
`frame-ancestors 'none'`, `X-Content-Type-Options`, `Referrer-Policy`,
`Permissions-Policy`, and HSTS — are listed in [SECURITY.md](./SECURITY.md).

### Input limits and uploads

Limits live in `src/lib/constants.ts` and are enforced both by `maxLength`/`min`/
`max` attributes and by `parsePlantForm`:

- Text caps: name 80, species 120, location 80, origin 80, notes 2,000,
  pruning time 200, pruning notes 2,000.
- Photos: 15 MB maximum and a raster MIME allowlist (JPEG, PNG, WebP, AVIF, BMP,
  GIF). SVG is excluded. Accepted images are downscaled and re-encoded before
  storage.
- Watering interval is clamped to 1–365 days. The feeding interval is validated
  as a whole number from 1–365 days, or left blank to disable feeding. Humidity
  is limited to 0–100; temperature and humidity ranges must not be inverted.
- Pruning heights are optional whole numbers from 1 to `MAX_PLANT_HEIGHT_CM` cm;
  blank values stay unset and decimals or zero are rejected.
- Select values (environment, light, edibility, toxicity, and the soil fields)
  are normalized against the allowlists in `constants.ts`, so tampered form data
  cannot persist arbitrary strings. Soil values are optional; an unset select
  maps to `undefined` rather than an empty string.
- Location is validated twice: `src/lib/locations.ts` enforces trim, whitespace
  collapsing, control-character rejection, and the 80-character cap when a
  location is created, while `parsePlantForm` only accepts a value already in
  the saved list and stores its canonical spelling. The unique `normalizedName`
  index prevents duplicate rows if two writes race.
- Backups: `.plantjes` only, at most 100 MB per file, 5,000 plants, 2,000
  locations, and 15 MB per embedded photo. Export names are at most 80
  characters before the extension and reject path separators, control
  characters, and reserved operating-system names.

When adding a field, add its limit to `TEXT_LIMITS`/`constants.ts`, validate it
in `parsePlantForm`, and mirror it as a form attribute.

### Dependencies and CI

`package-lock.json` is committed and CI uses `npm ci` so reviewed versions are
what get audited, tested, and built. `.github/workflows/ci.yml` runs
`npm audit --audit-level=high`, `npm test`, and `npm run build` on every push and
pull request with `contents: read` permissions. Keep runtime dependencies
minimal and do not add remote scripts, fonts, or CDNs.

## Development commands

For a clean checkout, use Node.js 22 and install from the committed lockfile with
`npm ci` before running the checks.

- `npm ci` installs the exact dependency graph from `package-lock.json`, matching
  CI.
- `npm run dev` starts the Vite development server. The production CSP is not
  injected in dev, so HMR works normally.
- `npm run build` runs the TypeScript project build (`tsc -b`) and creates the
  production bundle with Vite, including the CSP meta tag.
- `npm test` runs the Vitest suite once. The tests cover the framework-free
  date, row, form, location, record, and backup helpers under
  `src/lib/__tests__`.
- `npm run preview` serves the production bundle locally. Use it to verify the
  built CSP.
- CI runs `npm ci`, `npm audit --audit-level=high`, `npm test`, and
  `npm run build` on push and pull request. See `.github/workflows/ci.yml`.
