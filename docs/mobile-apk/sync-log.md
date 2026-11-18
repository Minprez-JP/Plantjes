# Mobile migration and platform-change log

This log records the move to a single `main` and subsequent platform-affecting changes. See [Process](./process.md) for the workflow and [Tasks](./tasks.md) for issue #45.

## Migration record

| Date | From | To | Scope | Mobile impact | Owner | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-11-18 | protected `Mobile` branch at `6b6ddae` | protected `main` at `bcca82c` | `MOBILE_RELEASE.md`, all `docs/mobile-apk/*`, README mobile section | Mobile plan docs now live on `main`; no second long-lived mobile branch; `Mobile` retained as `archive/mobile-branch` for history/redirects | maintainer | Docs PR against `main`, `Audit, test, and build` green, clean-clone verification |
| 2026-11-18 | `v2/mobile` at `433f789` | `archive/v2-mobile` at `433f789` | Branch list, `MOBILE_RELEASE.md`, `docs/mobile-apk/*` | Retired the legacy mobile baseline; the archived copy is read-only and delete-protected under the **Lock archive branches** ruleset | maintainer | Branch rename verified, archive ruleset active on both archive branches |
| 2026-11-18 | `main` at `839904c` | `release/mobile` at `839904c` | `MOBILE_RELEASE.md`, `docs/mobile-apk/process.md` | Short-lived feasibility branch for M0/M1 and the go/no-go decision; merge into `main` on a go, retire without merging on a no-go | maintainer | Branch created from `main`, `Audit, test, and build` green |

## Controls carried forward from the protected `Mobile` branch

- `src/hooks/useObjectUrl.ts` rejects non-`blob:` URLs and revokes unsafe object URLs (PR #26).
- `src/hooks/__tests__/useObjectUrl.test.ts` covers blob acceptance and non-blob rejection/revocation (PR #26).
- `src/components/PlantCard.tsx` and `PlantDialog.tsx` carry the dated false-positive rationale at image sinks (PR #28).
- `SECURITY_TESTING.md` and `docs/security-testing/*` provide the canonical security process and alert log (PR #27/#29).
- `.github/workflows/ci.yml` blocks on the runtime dependency audit and keeps dev-only advisories non-blocking (PR #26/#49).
- `package.json` exposes `npm run security:check` (PR #27).

These controls remain in force on `main` and must not be weakened by platform work.

## Change entry template

| Date | Commit / PR | Scope | Platform impact | Owner | Verification |
| --- | --- | --- | --- | --- | --- |
| YYYY-MM-DD | `<sha>` / PR # | files or feature | What changes for WebView, storage, photos, UX, permissions or security | maintainer | PR link, desktop + Android build, test/security results |

## Review triggers

- `src/**`, `index.html`, `vite.config.ts`, `package.json`, `package-lock.json`
- CI workflow, Capacitor config, `android/**` or CSP/header changes
- Dexie schema, import/export validation or image/photo pipeline changes
- Any security fix or scanner suppression change

Cadence: every relevant PR, before every mobile release, and same day for High/Critical security fixes.

Owner: maintainer. Generated: 2026-11-18.
