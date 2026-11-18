# Main → Mobile sync log

Every functional change from desktop `main` that affects the APK is reviewed for mobile impact and recorded here. See [Process](./process.md) for the procedure and [Tasks](./tasks.md) for issue #45.

## Active baseline

| Date | Source (`main`) | Target (`Mobile`) | Scope | Mobile impact | Owner | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-11-18 | `7d36868cded09e0aa4f5fbf3863ca34d0b573b6d` | `7d36868cded09e0aa4f5fbf3863ca34d0b573b6d` | Initial branch creation from latest `main` | Inherits desktop security docs, blob-URL guard + tests, and runtime-only blocking audit gate; no Android changes yet | maintainer | `Mobile` created from `origin/main`; branch protection applied; baseline identical |

## Inherited functional fixes in the baseline

- `src/hooks/useObjectUrl.ts` rejects non-`blob:` URLs and revokes unsafe object URLs (PR #26).
- `src/hooks/__tests__/useObjectUrl.test.ts` covers blob acceptance and non-blob rejection/revocation (PR #26).
- `src/components/PlantCard.tsx` and `PlantDialog.tsx` carry the dated false-positive rationale at image sinks (PR #28).
- `SECURITY_TESTING.md` and `docs/security-testing/*` provide the canonical security process and alert log (PR #27/#29).
- `.github/workflows/ci.yml` blocks on the runtime dependency audit and keeps dev-only advisories non-blocking (PR #26).
- `package.json` exposes `npm run security:check` (PR #27).

These changes must remain present after any future `main` → `Mobile` merge or conflict resolution.

## Sync entry template

| Date | Source (`main`) | Target (`Mobile`) | Scope | Mobile impact | Owner | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| YYYY-MM-DD | `<sha>` | `<sha>` | PR # / files | What changes for WebView, storage, photos, UX, permissions or security | maintainer | PR link, test/build/security results |

## Review triggers

- `src/**`, `index.html`, `vite.config.ts`, `package.json`, `package-lock.json`
- CI workflow or CSP/header changes
- Dexie schema, import/export validation or image/photo pipeline changes
- Any security fix or scanner suppression change

Cadence: weekly, before every mobile release, and same day for High/Critical security fixes.

Owner: maintainer. Generated: 2026-11-18.
