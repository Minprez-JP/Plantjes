# Mobile APK task register

Source of truth for live status: [project board #3](https://github.com/users/Minprez-JP/projects/3). This table is the version-controlled snapshot created with epic #30 on 2026-11-18.

| Issue | Task | Phase | Milestone | Start | Target | Size | Priority | Dependencies | Board status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [#30](https://github.com/Minprez-JP/Plantjes/issues/30) | Publish a local-run Android APK for Plantjes (epic) | M0–M4 | Mobile M0 | 2026-11-18 | 2027-01-13 | — | High | all child issues | Backlog |
| [#31](https://github.com/Minprez-JP/Plantjes/issues/31) | Create protected `Mobile` branch and synced baseline | M0 | Mobile M0 | 2026-11-18 | 2026-11-20 | S | High | none | In progress |
| [#32](https://github.com/Minprez-JP/Plantjes/issues/32) | Publish mobile scope, requirements, process, tasks and timeline | M0 | Mobile M0 | 2026-11-18 | 2026-11-25 | M | High | #31 | In progress |
| [#33](https://github.com/Minprez-JP/Plantjes/issues/33) | Run packaging feasibility gate and record the decision | M1 | Mobile M1 | 2026-11-26 | 2026-12-02 | L | High | #32 | Backlog |
| [#34](https://github.com/Minprez-JP/Plantjes/issues/34) | Add Capacitor runtime and Android platform scaffold | M1 | Mobile M1 | 2026-11-26 | 2026-12-02 | L | High | #33 go decision | Backlog |
| [#35](https://github.com/Minprez-JP/Plantjes/issues/35) | Adapt Vite, CSP and asset loading for Android WebView | M2 | Mobile M2 | 2026-12-03 | 2026-12-10 | M | High | #34 | Backlog |
| [#36](https://github.com/Minprez-JP/Plantjes/issues/36) | Verify Dexie persistence and backup import/export on device | M2 | Mobile M2 | 2026-12-03 | 2026-12-14 | L | High | #34 | Backlog |
| [#37](https://github.com/Minprez-JP/Plantjes/issues/37) | Verify photo input and object-URL pipeline on Android | M2 | Mobile M2 | 2026-12-03 | 2026-12-14 | L | High | #34 | Backlog |
| [#38](https://github.com/Minprez-JP/Plantjes/issues/38) | Mobile UX pass for viewport, safe areas and Android back button | M2 | Mobile M2 | 2026-12-07 | 2026-12-16 | M | Medium | #34 | Backlog |
| [#39](https://github.com/Minprez-JP/Plantjes/issues/39) | Harden Android permissions and network policy | M2 | Mobile M2 | 2026-12-07 | 2026-12-16 | M | High | #34 | Backlog |
| [#40](https://github.com/Minprez-JP/Plantjes/issues/40) | Produce debug APK and local install runbook | M3 | Mobile M3 | 2026-12-17 | 2026-12-23 | M | High | #35–#39 | Backlog |
| [#41](https://github.com/Minprez-JP/Plantjes/issues/41) | Implement release signing, versioning and reproducible release build | M3 | Mobile M3 | 2026-12-21 | 2026-12-30 | L | High | #40 | Backlog |
| [#42](https://github.com/Minprez-JP/Plantjes/issues/42) | Execute device/emulator test matrix and acceptance suite | M4 | Mobile M4 | 2026-12-31 | 2027-01-08 | L | High | #40, #41 | Backlog |
| [#43](https://github.com/Minprez-JP/Plantjes/issues/43) | Run security and no-egress regression gate on `Mobile` | M4 | Mobile M4 | 2027-01-04 | 2027-01-10 | M | High | #34 | Backlog |
| [#44](https://github.com/Minprez-JP/Plantjes/issues/44) | Publish release notes, install, support and rollback process | M4 | Mobile M4 | 2027-01-08 | 2027-01-13 | M | Medium | #42, #43 | Backlog |
| [#45](https://github.com/Minprez-JP/Plantjes/issues/45) | Establish recurring `main` → `Mobile` sync and change-impact review | M4 | Mobile M4 | 2026-12-17 | 2027-01-13 | M | High | #31 | Backlog |

## Work breakdown by phase

### M0 — Discovery and protected branch

- Create and protect `Mobile` from current `main` (#31).
- Publish the canonical plan documents and link them from the repo, epic and board (#32).
- Record the synced baseline and legacy branch decision in the sync log.

### M1 — Packaging feasibility and scaffold

- Compare Capacitor, Tauri Mobile and PWA/Bubblewrap against no-egress/local-first constraints (#33).
- Run a throwaway offline bundle spike and record go/no-go evidence.
- On go, add pinned Capacitor dependencies, config, Android platform and npm scripts (#34).

### M2 — WebView compatibility and UX

- Adapt asset loading and CSP (#35).
- Verify Dexie and backups (#36), photos/object URLs (#37), permissions/network (#39).
- Complete phone UX and Android back-button pass (#38).

### M3 — Build signing and local release

- Document prerequisites and debug APK/install path (#40).
- Add release signing, version alignment and signed APK verification (#41).

### M4 — Verification and handover

- Execute device matrix and acceptance suite (#42).
- Run security/no-egress gate (#43).
- Publish notes, install, support and rollback (#44).
- Formalise recurring sync and exercise it (#45).

Owner for all tasks: maintainer. Status changes belong on project board #3 and are mirrored here at each phase gate.

Generated: 2026-11-18.
