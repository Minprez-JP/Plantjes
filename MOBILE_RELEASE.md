# Plantjes mobile APK release

Status: **M1 go — scaffold PR in review** (last updated 2026-11-23)

This is the canonical entry point for the local-run Android APK work. The shared React/Vite application lives on the protected `main` branch. The Capacitor `android/` scaffold is implemented on `release/mobile` and proposed for `main` in PR #81 (#34). Mobile work is done on short-lived topic branches and merged into `main`.

- Active branch: [`main`](https://github.com/Minprez-JP/Plantjes/tree/main) (protected) — shared application and target branch for the Android scaffold PR
- Feasibility/integration branch: [`release/mobile`](https://github.com/Minprez-JP/Plantjes/tree/release/mobile) — short-lived branch cut from `main` for M0/M1 APK work and the go/no-go decision; now synced with `main` and carrying the proven Capacitor scaffold; source of PR #81 into `main`; retire it after merge
- Platform folders: `android/` (Capacitor, implemented on `release/mobile`, proposed for `main`); `ios/` can be added later in the same repository
- Migration: mobile plan docs moved from the protected `Mobile` branch to `main` on 2026-11-18; the old branch is retained as `archive/mobile-branch` for history and link redirects
- Epic: [#30 — Publish a local-run Android APK for Plantjes](https://github.com/Minprez-JP/Plantjes/issues/30)
- Board: [Plantjes mobile development #3](https://github.com/users/Minprez-JP/projects/3)
- Legacy branches: `archive/v2-mobile` and `archive/mobile-branch` are retained for history but are **not** active baselines. `archive/*` is read-only and delete-protected; fork the repository if you need to work on archived history.

> M1 gate decision: **GO (engineering feasibility)**, recorded in #48 on 2026-11-23. A clean-checkout debug APK was built, installed and published as the [v1.2.0 pre-release](https://github.com/Minprez-JP/Plantjes/releases/tag/v1.2.0). PR #81 proposes merging the scaffold into `main`; nothing is merged there until its required checks pass.

## Canonical documents

| Document | Purpose |
| --- | --- |
| [Scope](./docs/mobile-apk/scope.md) | What the APK release will and will not deliver |
| [Requirements](./docs/mobile-apk/requirements.md) | Functional and non-functional acceptance criteria with issue traceability |
| [Process](./docs/mobile-apk/process.md) | Single-`main` branch protection, topic-branch workflow, build, test and release process |
| [Tasks](./docs/mobile-apk/tasks.md) | Issue register, owners, phases, dates, sizes and dependencies |
| [Timeline](./docs/mobile-apk/timeline.md) | Milestones, checkpoints, gates and slip rules |
| [Risk log](./docs/mobile-apk/risk-log.md) | Technical, privacy, security and schedule risks with mitigations |
| [Sync log](./docs/mobile-apk/sync-log.md) | Record of the branch-model migration and platform-configuration changes |

## Phase summary

| Phase | Dates | Milestone | Outcome |
| --- | --- | --- | --- |
| M0 — Discovery and protected branch | 2026-11-18 → 2026-11-25 | Mobile M0 | Protected branch, synced baseline and this plan published |
| M1 — Packaging feasibility and scaffold | 2026-11-26 → 2026-12-02 | Mobile M1 | Go/no-go decision, Capacitor scaffold, build scripts |
| M2 — WebView compatibility and UX | 2026-12-03 → 2026-12-16 | Mobile M2 | Storage, photos, CSP, permissions and phone UX verified |
| M3 — Build signing and local release | 2026-12-17 → 2026-12-30 | Mobile M3 | Debug APK, signed release APK, versioning and install runbook |
| M4 — Verification and handover | 2026-12-31 → 2027-01-13 | Mobile M4 | Device matrix, security gate, release notes and support process |

## Definition of done

- [ ] All child issues of epic #30 are closed or formally risk-accepted with an owner and review date.
- [ ] The M1 feasibility gate is recorded with evidence in the risk log.
- [ ] `npm test`, `npm run build` and `npm run security:check` pass on `main`.
- [ ] A signed APK is produced from a tagged commit with documented versioning.
- [ ] The APK installs and runs offline on the agreed device matrix.
- [ ] No third-party runtime network request is observed on device.
- [ ] Desktop and Android builds are produced from the same commit on `main`.
- [ ] Release notes, install instructions, backup/uninstall guidance and rollback steps are published.

## Branch rule

Do **not** commit directly to `main`. Create a short-lived topic branch from `main` (for example `feature/mobile-capacitor-scaffold`), open a pull request with base `main`, and make sure `Audit, test, and build` passes before merging. Desktop and Android changes are reviewed together for shared-code impact through the process in [Process](./docs/mobile-apk/process.md).
