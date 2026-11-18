# Mobile APK scope

## Goal

Prove and, if viable, deliver a locally installable Android APK for Plantjes that preserves the existing local-first, no-account, no-server behaviour. The React/Vite/TypeScript application and Dexie data model stay the source of truth; Android is a packaging and runtime target, not a separate product.

## Target

- Android APK for sideload installation (unknown sources), not a Play Store listing in this initiative.
- Offline-first: the packaged bundle, fonts, icons and fallback photography are local assets.
- On-device IndexedDB/Dexie storage and `.plantjes` import/export remain the only persistence model.
- Reference packaging approach: Capacitor with an Android WebView. Alternatives are compared at the M1 gate.

## In scope

1. Protected `Mobile` branch based on the latest desktop `main` and a documented sync process.
2. Canonical documents: scope, requirements, process, tasks, timeline, risk log and sync log.
3. Feasibility spike for Capacitor, with fallback notes for Tauri Mobile and PWA/Bubblewrap.
4. Android platform scaffold, pinned dependencies and repeatable `npm` build scripts.
5. WebView compatibility for asset loading, CSP, IndexedDB/Dexie, object URLs and file inputs.
6. Phone UX checks: viewport, safe areas, touch targets, keyboard and Android back button.
7. Minimal Android permissions, cleartext denial and a no-egress network check.
8. Debug APK and signed release APK with versioning and local install documentation.
9. Device/emulator acceptance matrix, security regression gate, release notes and rollback/support process.

## Out of scope

- Play Store publishing, store listings, app bundles and Play signing service.
- Accounts, cloud sync, server APIs, push notifications, telemetry or analytics.
- Native rewrites of the React UI or Dexie storage layer.
- Background watering notifications; the desktop app does not send them and the APK will not add them.
- Encrypted `.plantjes` backups; existing backups remain unencrypted JSON with the same user warning.
- Automated release distribution, auto-update mechanisms or remote configuration.

## Assumptions

- Node.js 26 and the committed lockfile are used for all web builds.
- A supported Android SDK, JDK and emulator image are available before M1 ends.
- One maintainer performs implementation and review; branch protection therefore requires a PR and passing CI but zero approvals.
- The existing CSP and no-third-party-request property are non-negotiable and may not be relaxed for packaging convenience.

## Constraints

- `Mobile` is protected: all changes arrive by PR from a topic branch with the `Audit, test, and build` check passing.
- Any `main` change touching `src/**`, `vite.config.ts`, `package.json`, CI, CSP, Dexie schema, import/export, image handling or security controls must be assessed for mobile impact.
- Signing material stays outside the repository. No keystore, password or signing secret is committed.
- If WebView cannot support IndexedDB/Dexie or safe local file input, the M1 gate is a no-go and the fallback plan is required before further build work.

## Deliverables

- `MOBILE_RELEASE.md` and the six documents under `docs/mobile-apk/`.
- Epic #30 with child issues #31–#45 on project board #3.
- Capacitor/Android scaffold and npm scripts on `Mobile` after the M1 go decision.
- Debug and signed release build instructions, device evidence and a tagged release commit.
- Updated risk and sync logs with owners and review dates.

## Success criteria

The initiative succeeds when a clean checkout of `Mobile` can produce a signed APK that installs offline, keeps plant data across restarts, preserves backup/restore and photo workflows, passes the existing security checks, makes no third-party network requests, and can be maintained through a repeatable `main` → `Mobile` sync.

Owner: maintainer. Review date: 2026-11-25 (M0 exit).
