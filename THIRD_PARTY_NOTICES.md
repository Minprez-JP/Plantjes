# Third-party notices

**Plantjes.** itself is licensed under the MIT+Beer License in [LICENSE](./LICENSE).
This file records the bundled assets and runtime dependencies that carry their
own terms.

## Bundled assets

### Fonts

| Asset | Source | License |
| --- | --- | --- |
| `public/fonts/dm-sans-latin.woff2` | [DM Sans](https://github.com/googlefonts/dm-fonts) | SIL Open Font License 1.1 — see `public/fonts/OFL-DMSans.txt` |
| `public/fonts/fraunces-latin.woff2`, `public/fonts/fraunces-italic-latin.woff2` | [Fraunces](https://github.com/undercasetype/Fraunces) | SIL Open Font License 1.1 — see `public/fonts/OFL-Fraunces.txt` |

The font files are latin subsets served from the same origin as the app.

### Photography

Both photographs were downloaded from Unsplash and are bundled as resized,
compressed derivatives. The [Unsplash License](https://unsplash.com/license)
permits free use, including commercial use and redistribution, without required
attribution. The original source URLs are recorded here as a courtesy.

| Asset | Original source |
| --- | --- |
| `public/images/fallback-plant.jpg` | <https://images.unsplash.com/photo-1485955900006-10f4d324d411> |
| `public/images/conditions.jpg` | <https://images.unsplash.com/photo-1497250681960-ef046c08a56e> |

The committed image files contain no EXIF location data, XMP author metadata, or
other personal metadata.

### Icons and application code

The production bundle includes these npm packages. They are installed from the
committed `package-lock.json`, and full license texts are committed under
[`licenses/`](./licenses).

| Package | License | License text |
| --- | --- | --- |
| `react`, `react-dom` | MIT | [`licenses/React-MIT.txt`](./licenses/React-MIT.txt) |
| `dexie` | Apache-2.0 | [`licenses/Dexie-Apache-2.0.txt`](./licenses/Dexie-Apache-2.0.txt) |
| `lucide-react` | ISC | [`licenses/Lucide-ISC.txt`](./licenses/Lucide-ISC.txt) |
| `@capacitor/core` and generated Android runtime | MIT | [`licenses/Capacitor-MIT.txt`](./licenses/Capacitor-MIT.txt) |

`@capacitor/cli` and `@capacitor/android` are also MIT-licensed and use the same
license text; the CLI is build-time only, while the Android platform runtime is
packaged into the APK.

Build and test tooling (`vite`, `typescript`, `vitest`, `jsdom`,
`@vitejs/plugin-react`, `@testing-library/react`, and the React type packages)
is used to produce and verify the app but is not part of the runtime bundle.

### Project-owned assets

The favicon, application source, styling, documentation, and example text are
project-owned unless noted above. No separately copied third-party code snippets
were identified in the source tree.

If you believe an asset is missing from this inventory, please open an issue
using the bug report template.
