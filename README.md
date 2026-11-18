# Plantjes.

**Plantjes.** is a local-first plant care tracker for houseplants and garden plants. Keep each plant's care details and watering history together in one dashboard.

## What you can do

- Add plants with a name, species or variety, indoor/outdoor setting, location, light preference, watering interval, optional feeding schedule, temperature range, humidity, edibility, and an optional photo upload.
- Choose a room or spot from a reusable location list. Add a new location inline from the plant form; newly added locations are saved on this device and matched case-insensitively so duplicates are not created.
- Record preferred minimum and maximum temperatures in °C as whole numbers, including negative values. Outdoor plants are marked winter-hardy when their minimum is -10°C or lower.
- Read and edit each plant's note from the information button at the bottom-left of its photo. The note dialog keeps line breaks, warns when a note is empty, and saves up to 2,000 characters.
- Add optional pruning details — when to prune, expected mature height, height after pruning, and pruning notes — on the Care tab of the plant form. When *when to prune* is filled, a scissors button on the plant photo opens a read-only pruning details dialog with an option to edit; pruning details are not repeated in the card text. Add soil details — composition, pH, and drainage — on the Soil tab. The card shows a compact composition · pH · drainage summary when those values are set.
- View each plant's next watering status, feeding schedule, care conditions, and location.
- Mark a plant as watered or fertilized from its card or from the care lists. This resets the relevant schedule. Bulk watering works on the filtered collection: **Water due** waters every visible plant that needs water, and **Water all shown** waters the whole visible group after confirmation.
- Edit a plant's details without losing its watering or feeding history, notes, soil details, or pruning details, or remove it after confirming.
- Search by plant name, species, or location, and combine that with environment tabs, a location filter derived from your plants, and a care filter for **Needs water** or **Needs feeding**. All filters combine, and **Clear filters** resets them together.
- Back up or move the whole journal from the **Saved on this device** badge. Hover or focus it to reveal **Import** and **Export**. Export downloads a single named `.plantjes` file containing plants, locations, care history, notes, and photos. Import accepts only `.plantjes` files, validates the contents, shows what will be replaced, and swaps the collection in one step.
- See collection totals and plants currently due for watering or feeding. The care lists show up to five due plants at a time.

The add and edit forms use five tabs — **Main**, **Environment**, **Soil**, **Care**, and **Picture**. Switching tabs keeps everything you have typed, and a failed save opens the tab with the first problem and focuses that field.

Watering and feeding reminders are calculated from each interval and the last time the plant was marked as watered or fertilized. A plant is due when its interval has elapsed; a plant with a feeding interval but no recorded feeding is due immediately. The app does not send notifications.

## Limitations

- The journal lives in one browser on one device. There is no account, cloud sync, or automatic backup.
- Clearing this browser's site data deletes the journal unless you exported it first.
- Reminders are calculated when the page loads; the app does not send notifications.
- Import replaces the current journal instead of merging two collections.
- `.plantjes` backups are unencrypted JSON. Store them somewhere you trust, and do not attach them to public issues.

## Run locally

Use Node.js 26, the version CI runs, with npm. Install the exact dependencies from the committed lockfile and start the development server:

```sh
npm ci
npm run dev
```

Create a production build with:

```sh
npm run build
```

Run the test suite with:

```sh
npm test
```

To serve a production build locally, run `npm run preview` after building. The same `npm ci`, `npm test`, and `npm run build` sequence works from a clean checkout.

## Data and privacy

Plant records, your reusable location list, and uploaded photo files are stored in this browser's IndexedDB database using Dexie. No account or app server is needed. The records stay in this browser on this device; they are not synchronized to other devices, and clearing this browser's site data will remove them.

The app makes no third-party runtime requests. Web fonts, decorative photography, and icons are bundled and served from the same origin, so plant data, browsing context, and device details are not shared with external services. Uploaded photos are stored locally as image blobs; if a plant has no uploaded photo, the app displays a bundled fallback image.

A `.plantjes` backup is ordinary, unencrypted JSON with photos embedded as data URLs. Anyone who can read the file can read the journal, so store it somewhere you trust. Importing replaces the journal saved in this browser; export a current backup before importing an older one.

Serve a production build over HTTPS. Because the app is static, response headers such as `frame-ancestors`, `X-Content-Type-Options`, and HSTS are set by the host; recommended values are in [SECURITY.md](./SECURITY.md).

## Security

Input is validated and length-bounded, uploads are restricted to raster images within a size cap, and production builds run under a strict same-origin Content Security Policy. Unexpected failures surface in the UI instead of leaving a blank page. See [SECURITY.md](./SECURITY.md) for the threat model, the OWASP Top 10:2025 mapping, recommended response headers, and how to report a vulnerability.

## Contributing and support

Code contributions are considered from accounts vetted and approved by the maintainer. Read [CONTRIBUTING.md](./CONTRIBUTING.md) and get approval before starting work intended for inclusion. Bug reports and feature requests are welcome, but general issues are reviewed as time allows and have no guaranteed response or delivery timeline. Do not include credentials, real plant-journal data, or private photos in public issues or pull requests. Report security vulnerabilities privately using the process in [SECURITY.md](./SECURITY.md).

## Developer documentation

See [DEVELOPER.md](./DEVELOPER.md) for the application structure, data flow, security controls, and guidance for extending the code. Repository settings and release steps are in [MAINTAINING.md](./MAINTAINING.md).

## License and third-party assets

**Plantjes.** is released under the [MIT+Beer License](./LICENSE). Bundled fonts, photography, and runtime dependencies keep their own terms; their sources and licenses are recorded in [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).
