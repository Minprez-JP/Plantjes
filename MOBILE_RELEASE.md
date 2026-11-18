# Plantjes mobile APK release

Status: **planning / feasibility** (last updated 2026-11-18)

This is the canonical entry point for the local-run Android APK work. The desktop `main` branch remains the source of truth for the React/Vite application; this protected `Mobile` branch is where Android packaging, WebView compatibility and mobile release work lands.

- Active branch: [`Mobile`](https://github.com/Minprez-JP/Plantjes/tree/Mobile) (protected)
- Desktop source: [`main`](https://github.com/Minprez-JP/Plantjes/tree/main)
- Baseline: `main` commit `7d36868cded09e0aa4f5fbf3863ca34d0b573b6d`, copied to `Mobile` on 2026-11-18
- Epic: [#30 — Publish a local-run Android APK for Plantjes](https://github.com/Minprez-JP/Plantjes/issues/30)
- Board: [Plantjes mobile development #3](https://github.com/users/Minprez-JP/projects/3)
- Legacy branch: `v2/mobile` is retained for history but is **not** the active mobile baseline

> No APK is published yet. This branch currently contains the scope, requirements, process, task register, timeline and risk record needed to make the go/no-go decision.

## Canonical documents

| Document | Purpose |
| --- | --- |
| [Scope](./docs/mobile-apk/scope.md) | What the APK release will and will not deliver |
| [Requirements](./docs/mobile-apk/requirements.md) | Functional and non-functional acceptance criteria with issue traceability |
| [Process](./docs/mobile-apk/process.md) | Branch protection, `main` → `Mobile` sync, build, test and release workflow |
| [Tasks](./docs/mobile-apk/tasks.md) | Issue register, owners, phases, dates, sizes and dependencies |
| [Timeline](./docs/mobile-apk/timeline.md) | Milestones, checkpoints, gates and slip rules |
| [Risk log](./docs/mobile-apk/risk-log.md) | Technical, privacy, security and schedule risks with mitigations |
| [Sync log](./docs/mobile-apk/sync-log.md) | Record of functional changes inherited from desktop `main` |

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
- [ ] `npm test`, `npm run build` and `npm run security:check` pass on `Mobile`.
- [ ] A signed APK is produced from a tagged commit with documented versioning.
- [ ] The APK installs and runs offline on the agreed device matrix.
- [ ] No third-party runtime network request is observed on device.
- [ ] The `main` → `Mobile` sync process has been exercised with a real functional change.
- [ ] Release notes, install instructions, backup/uninstall guidance and rollback steps are published.

## Branch rule

Do **not** commit directly to `Mobile`. Create a topic branch from `Mobile`, open a pull request with base `Mobile`, and make sure `Audit, test, and build` passes before merging. Functional changes made on `main` are reviewed for mobile impact and brought across through the PR process in [Process](./docs/mobile-apk/process.md).
