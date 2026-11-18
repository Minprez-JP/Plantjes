# Mobile APK process

## Branch model

```
main (desktop, protected)  --functional-change-review-->  Mobile (protected, Android baseline)
                                                            |
                                                            +-- topic branches --PR--> Mobile
```

- `main` stays the desktop source of truth. Do not add Android-only runtime code to `main` during this initiative.
- `Mobile` is long-lived and protected. It was created from `main` at `7d36868cded09e0aa4f5fbf3863ca34d0b573b6d`.
- `v2/mobile` is historical only; do not use it as a merge base.
- Topic branch names should be lowercase with hyphens (for example `mobile-apk-capacitor-scaffold`), avoiding a slash after `mobile` because Windows/git ref storage treats `Mobile` and `mobile/` as the same path.

## Protection rules

Configured on `Mobile`:

- Pull requests are required before merging; direct pushes are blocked.
- Required check: `Audit, test, and build` (`security:check` runs audit, tests and build).
- Strict status checks: the topic branch must be up to date with `Mobile` before merge.
- Force pushes and branch deletion are disabled.
- administrators are subject to the rules; zero approvals are required because there is a single maintainer.

## Standard change flow

```sh
git fetch origin
git switch Mobile
git pull --ff-only origin Mobile
git switch -c mobile-apk-<change> origin/Mobile

# implement, then verify
npm ci
npm test
npm run build
npm run security:check

git add <files>
git commit -m "<type>(mobile): <description> (#<issue>)"
git push -u origin mobile-apk-<change>
# open PR with base Mobile, wait for Audit, test, and build, then squash merge
```

Every PR body must link its issue and state the mobile impact: packaging, storage, photo flow, UX, permissions, security or documentation.

## `main` → `Mobile` sync

Trigger: any merge to `main` touching `src/**`, `vite.config.ts`, `package.json`, `package-lock.json`, CI, CSP, Dexie schema, import/export, image handling or security controls.

Cadence:

- Weekly review of new `main` commits (owner: maintainer).
- Mandatory sync before every mobile release build.
- Same-day PR for High/Critical security fixes and for fixes to functionality used by the APK.

Procedure:

```sh
git fetch origin
git switch Mobile
git pull --ff-only origin Mobile
git switch -c sync/main-<short-sha> origin/Mobile
git merge origin/<short-sha>       # or cherry-pick specific commits
# resolve conflicts: keep mobile packaging changes, never weaken desktop security controls
npm ci && npm test && npm run build && npm run security:check
git push -u origin sync/main-<short-sha>
# PR base: Mobile
```

Impact checklist:

1. Does the change affect the bundled React output or `index.html` CSP?
2. Does it change Dexie schema, import/export validation or photo blob handling?
3. Does it add a dependency, runtime request, font, CDN asset or permission need?
4. Does it conflict with Capacitor config, Android manifests or local asset loading?
5. Does it change a security control or alert suppression rationale?
6. Does the sync log need a new row (source commit, mobile commit, impact, owner, verification)?

Conflict rule: mobile compatibility wins for platform-specific code, but desktop security behaviour and the no-egress guarantee never get weakened. Escalate unresolved trade-offs to issue #45 and the risk log.

## Packaging workflow (target state after MOB-04)

```sh
npm ci
npm test
npm run build
npm run mobile:sync      # wraps cap sync android after the production build
npm run mobile:open      # opens the native Android project
npm run mobile:build     # documented debug or release build entry point
```

Capacitor config requirements:

- App id and name are local and stable (exact value confirmed at M1).
- No `server.url`; the app loads `dist` from the local WebView origin.
- Android platform project is committed on `Mobile`.
- Dependency versions are pinned in `package.json` and `package-lock.json`.

## Verification gates

| Gate | Owner | Evidence |
| --- | --- | --- |
| M1 feasibility | maintainer | Risk log entry with go/no-go, evidence and fallback |
| M2 WebView compatibility | maintainer | Device screenshots, storage/photo/CSP/permission results |
| M3 build reproducibility | maintainer | Clean-clone debug and signed release build record |
| M4 acceptance | maintainer | Device matrix results, no open High/Critical defect |
| M4 security | maintainer | `security:check`, scanner state, network capture |

Security triage follows [SECURITY_TESTING.md](https://github.com/Minprez-JP/Plantjes/blob/Mobile/SECURITY_TESTING.md). Any accepted mobile risk needs a reason, owner and review date in the risk log.

## Release and rollback

1. Freeze changes on `Mobile` and complete the sync check.
2. Increment `versionCode` and align `versionName` with `package.json`.
3. Build and sign the release APK using keystore material stored outside the repository.
4. Record the commit/tag, APK hash, size and device matrix in issue #44.
5. Publish release notes and install guidance in `MOBILE_RELEASE.md`.
6. Rollback: install the previous signed APK with `adb install -r`; because Dexie data stays on device, instruct users to export a `.plantjes` backup before downgrading and never to clear app data during rollback.

Owner: maintainer. Review date: 2027-01-13.
