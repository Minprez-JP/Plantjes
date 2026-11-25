# Security policy

**Plantjes.** is a client-only, local-first application. It has no server,
no accounts, and no telemetry. This policy describes the security model, how to
report a problem, and the controls the project maintains.

The automated security testing programme, alert triage process and requirement
traceability are documented in [SECURITY_TESTING.md](./SECURITY_TESTING.md).

## Supported versions

This is a personal, best-effort project. No version is formally supported, and
security fixes are not guaranteed. The latest commit on `main` is the only
version likely to receive fixes.

## Reporting a vulnerability

Please report suspected vulnerabilities privately:

1. Open a **private security advisory** through the repository's **Security →
   Advisories → Report a vulnerability** form, or contact the maintainer
   directly if advisories are unavailable.
2. Include the affected version or commit, a description of the issue, and the
   smallest reproduction you can provide. Do not attach real personal data.
3. Do **not** open a public issue before a fix is available.

Reports are reviewed on a best-effort basis, and there is no guaranteed response
time. If an issue is confirmed, a fix may be published on `main` when time
allows. Credit is given in the advisory unless you prefer otherwise, and details
are disclosed only after a fix is available.

Reports about third-party dependencies should also be filed upstream, but we
still want to know so we can pin, patch, or remove the dependency.

## Threat model

In scope:

- Script execution through user-supplied plant text, imported records, or photo
  uploads (stored XSS).
- Denial of service through oversized or malformed input that exhausts memory
  or storage.
- Compromise of third-party code or assets loaded at runtime.
- Leakage of browsing context, device information, or journal contents to third
  parties.
- Integrity failures in the build or dependency graph.

Out of scope:

- An attacker with physical access to the unlocked device or an already
  compromised browser profile. IndexedDB is origin-scoped, not encrypted at
  rest; full-disk encryption and device locking are the user's responsibility.
- Malicious browser extensions or a compromised operating system.
- Hosting misconfiguration. The project ships no deploy configuration; see
  [Recommended response headers](#recommended-response-headers).
- Availability of a specific browser's IndexedDB implementation.

## Data handling

- Plant records and uploaded photos live only in the browser's IndexedDB
  database (Dexie, database `tend-plant-journal`, a pre-release identifier kept
  so existing journals keep loading). Nothing is transmitted to an application
  server.
- The app makes no third-party runtime requests. Fonts, decorative photography,
  and icons are bundled and served from the same origin.
- Clearing site data removes the journal unless it was exported first. A
  `.plantjes` backup is unencrypted JSON with embedded photos, so anyone with the
  file can read the journal. There is no sync, by design.
- The app stores no credentials, tokens, or analytics identifiers. Plant care
  notes are limited to the same local journal model as watering and feeding
  metadata; there is no separate server-side data model or telemetry stream.

## Security controls: OWASP Top 10:2025

| Category | Status | Controls |
| --- | --- | --- |
| A01 Broken Access Control | Mitigated / limited | Single-user app with no authorization surface. All data access goes through the origin-scoped IndexedDB database; there are no cross-origin reads, no server endpoints, and no user roles to bypass. React escapes rendered values by default, and the code contains no `dangerouslySetInnerHTML`. |
| A02 Security Misconfiguration | Mitigated | Production builds inject a strict same-origin Content Security Policy (`default-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `upgrade-insecure-requests`). Source maps are disabled. `index.html` sets `referrer=no-referrer` and loads only same-origin assets. No debug tooling or default credentials ship in the bundle. |
| A03 Software Supply Chain Failures | Mitigated | Small direct dependency set (`react`, `react-dom`, `dexie`, `lucide-react`). `package-lock.json` is committed and CI installs with `npm ci` and verifies the installed tree matches it. CI runs `npm audit --audit-level=high`, pinned CycloneDX SBOM and licence-policy generation, the Vitest suite, and a production build on every push and pull request. The CI workflow uses least-privilege `contents: read` permissions. |
| A04 Cryptographic Failures | Not applicable / documented | No passwords, tokens, secrets, or cryptography implemented by the app. Transport security is the host's responsibility; serve the build over HTTPS only. Do not put sensitive data in plant fields, because IndexedDB is not encrypted at rest. |
| A05 Injection | Mitigated | React text rendering for all user content; no HTML injection sinks, `eval`, or dynamic script construction. Form input is parsed and validated in `src/lib/plantForm.ts` before persistence. Photo uploads are restricted to an explicit raster MIME allowlist (SVG excluded). The CSP blocks inline and remote script. |
| A06 Insecure Design | Mitigated | Input limits are explicit constants: free-text field caps, a 15 MB upload cap, 1–365 day watering and feeding intervals, humidity bounded to 0–100, and ordered temperature/humidity ranges. Fertilizer type values are normalized against an allowlist before persistence; no separate due boolean is stored. Photos are downscaled and re-encoded before storage. Per-device storage is stated in the UI so users understand the data boundary. |
| A07 Authentication Failures | Not applicable | The app has no authentication, sessions, or remote accounts. Access control is provided by the browser origin model and the host's deployment configuration. |
| A08 Software or Data Integrity Failures | Mitigated | No CDN or runtime third-party assets, so there is no remote script or font to tamper with. Fonts and images are committed with the source; font licences are committed alongside them, and photography provenance and the Unsplash License are recorded in `THIRD_PARTY_NOTICES.md`. Dependencies are lockfile-pinned and installed with `npm ci`; CI verifies the lockfile is unchanged, publishes CycloneDX SBOMs and a licence inventory, and checks the built bundle for remote asset references. The build runs from checked-in source only. Select values are normalized against fixed allowlists before persistence. |
| A09 Security Logging & Alerting Failures | Partially applicable | The app has no server-side logging surface and intentionally ships no telemetry. Unexpected render failures are logged to the browser console with the component stack only; recoverable storage and photo errors surface in the UI. Dependency and build failures are alerted through CI. |
| A10 Mishandling of Exceptional Conditions | Mitigated | Database loads are cancellation-guarded. Save, water, fertilize, and delete failures are caught and shown to the user instead of producing unhandled rejections. The startup photo pass isolates failures per record. Blob URL creation is guarded. A top-level error boundary prevents a blank page and offers a reload. |

## Input limits

Defined in `src/lib/constants.ts` and enforced in `src/lib/plantForm.ts`:

| Input | Limit |
| --- | --- |
| Plant name | 80 characters, required |
| Species or variety | 120 characters |
| Room or spot | 80 characters |
| Plant origin | 80 characters |
| Notes | 2,000 characters |
| Photo upload | 15 MB, JPEG/PNG/WebP/AVIF/BMP/GIF only |
| Watering interval | 1–365 days |
| Feeding interval | 1–365 days when enabled; blank disables the schedule and clears the type/timestamp |
| Fertilizer type | Optional select restricted to `Liquid feed`, `Water-soluble powder`, `Slow-release granules`, `Fertilizer spikes`, and `Organic feed` with a `Not set` option |
| Humidity | Whole numbers, 0–100, minimum ≤ maximum |
| Temperature | Whole numbers from -100 to 100 °C, minimum ≤ maximum |
| Soil details | Optional selects; drainage, composition, and pH are restricted to fixed allowlists |

Stored photos are downscaled to at most 1,600 px on the longest side and
re-encoded before being written to IndexedDB.

## Recommended response headers

The production CSP is injected into `index.html` so it works on any static
host. A few protections cannot be expressed in a meta tag and should be sent by
the host:

```http
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
Cross-Origin-Opener-Policy: same-origin
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

Notes:

- `frame-ancestors` is ignored when delivered in a meta tag, so it must be a
  response header to prevent framing.
- Only send HSTS from an HTTPS host that will remain HTTPS.
- If the host rewrites asset paths, verify the CSP `script-src` and `style-src`
  still resolve to the same origin.

## Dependency policy

- Prefer the platform over a package; keep the dependency list small.
- Commit `package-lock.json` and install with `npm ci`.
- Review advisories with `npm audit` before merging dependency changes.
- Avoid adding runtime CDNs, remote fonts, or hosted scripts. Anything loaded at
  runtime must be same-origin or it breaks the CSP and the privacy guarantee.
- CI generates commit-named CycloneDX SBOMs, a production licence inventory and
  generated third-party notices; see `SECURITY_TESTING.md` for the policy and
  artifact names.
- GitHub secret scanning with push protection and a pinned CI gitleaks scan
  protect against committed credentials; there are no application credentials.
- Security fixes may be applied as patch releases without notice; major
  dependency upgrades are reviewed like code changes.

## Review checklist for changes

- [ ] New user input is validated and length-bounded in `src/lib/plantForm.ts`.
- [ ] New file uploads are type- and size-restricted; SVG stays excluded.
- [ ] No `dangerouslySetInnerHTML`, `innerHTML`, `eval`, or `new Function`.
- [ ] No new third-party runtime requests; assets are self-hosted.
- [ ] New async work catches failures and surfaces a user-visible state.
- [ ] New persistence paths cannot leave a stale or unhandled rejected promise.
- [ ] `npm audit --audit-level=high --omit=dev`, `npm test`, and `npm run build` pass in CI; dev-only advisories are reported by the non-blocking audit step.
