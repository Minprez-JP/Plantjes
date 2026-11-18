# Mobile APK process

## Branch model

```text
main (protected)
├── src/                 shared React/Vite application
├── android/             Capacitor Android shell
├── ios/                 added later if needed
└── .github/workflows/   desktop + Android builds from the same commit
```

- `main` is the single source of truth for shared application code **and** platform folders. There is no second long-lived mobile branch and no `main` → `Mobile` sync.
- Android-only runtime code lives in `android/` and in the Capacitor config/scripts; desktop continues to build from the same shared source.
- `archive/v2-mobile` and `archive/mobile-branch` are historical only; do not use them as a merge base.
- Topic branches are short-lived, lowercase and descriptive, using hyphens or slashes: `feature/mobile-camera`, `mobile/csp-fix`, `fix/android-permissions`.

## Protection rules

Configured on `main` via the repository ruleset **Protect main**:

- Pull requests are required before merging; direct pushes are blocked.
- Required check: `Audit, test, and build` (`security:check` runs audit, tests and build).
- Strict status checks: the topic branch must be up to date with `main` before merge.
- Force pushes and branch deletion are disabled.
- Administrators are subject to the rules; zero approvals are required because there is a single maintainer.

`archive/*` branches are locked by the repository ruleset **Lock archive branches**: pushes, force pushes and deletion are blocked for everyone with no bypass. To work on archived history, fork the repository and work in the fork.

## Standard change flow

```sh
git fetch origin
git switch main
git pull --ff-only origin main
git switch -c feature/mobile-<change> origin/main

# implement, then verify
npm ci
npm test
npm run build
npm run security:check

git add <files>
git commit -m "<type>(mobile): <description> (#<issue>)"
git push -u origin feature/mobile-<change>
# open PR with base main, wait for Audit, test, and build, then squash merge
# delete the topic branch after merge
```

Every PR body must link its issue and state the platform impact: packaging, storage, photo flow, UX, permissions, security or documentation. Desktop and Android changes belong in the same PR rather than in a later sync.

## Shared-change impact review

Trigger: any PR touching `src/**`, `vite.config.ts`, `package.json`, `package-lock.json`, CI, CSP, Dexie schema, import/export, image handling or security controls.

Cadence:

- Review each PR for mobile impact before merge (owner: maintainer).
- Re-run the Android build check before every release build.
- Treat High/Critical security fixes and fixes to functionality used by the APK as same-day work.

Impact checklist:

1. Does the change affect the bundled React output or `index.html` CSP?
2. Does it change Dexie schema, import/export validation or photo blob handling?
3. Does it add a dependency, runtime request, font, CDN asset or permission need?
4. Does it conflict with Capacitor config, Android manifests or local asset loading?
5. Does it change a security control or alert suppression rationale?
6. Does the migration/change log need a new row?

Rule: platform-specific behaviour stays in `android/`/`ios/`; shared security behaviour and the no-egress guarantee are never weakened for either platform. Escalate unresolved trade-offs to issue #45 and the risk log.

## Packaging workflow (target state after MOB-04)

```sh
npm ci
npm test
npm run build           # shared production bundle in dist/
npm run sync:android    # cap sync android after the production build
npm run open:android    # opens the native Android project
npm run build:android   # documented debug or release build entry point
```

Capacitor config requirements:

- App id and name are local and stable (exact value confirmed at M1).
- No `server.url`; the app loads `dist` from the local WebView origin.
- The Android platform project is committed on `main`.
- Dependency versions are pinned in `package.json` and `package-lock.json`.

## Verification gates

| Gate | Owner | Evidence |
| --- | --- | --- |
| M1 feasibility | maintainer | Risk log entry with go/no-go, evidence and fallback; desktop and Android build from the same commit |
| M2 WebView compatibility | maintainer | Device screenshots, storage/photo/CSP/permission results |
| M3 build reproducibility | maintainer | Clean-clone debug and signed release build record |
| M4 acceptance | maintainer | Device matrix results, no open High/Critical defect |
| M4 security | maintainer | `security:check`, scanner state, network capture |

Security triage follows [SECURITY_TESTING.md](https://github.com/Minprez-JP/Plantjes/blob/main/SECURITY_TESTING.md). Any accepted mobile risk needs a reason, owner and review date in the risk log.

## Release and rollback

1. Freeze changes on `main` and tag the release commit.
2. Increment `versionCode` and align `versionName` with `package.json`.
3. Build the desktop bundle and the Android APK from the same tag.
4. Sign the release APK using keystore material stored outside the repository.
5. Record the commit/tag, APK hash, size and device matrix in issue #44.
6. Publish release notes and install guidance in `MOBILE_RELEASE.md`.
7. Rollback: install the previous signed APK with `adb install -r`; because Dexie data stays on device, instruct users to export a `.plantjes` backup before downgrading and never to clear app data during rollback.

Owner: maintainer. Review date: 2027-01-13.
