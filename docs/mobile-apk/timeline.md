# Mobile APK timeline

Planning assumption: one maintainer, part-time, starting 2026-11-18. Dates are target dates, not commitments; a slip is handled by reducing scope, not by weakening security or data-integrity gates.

## Milestones

| Phase | Milestone | Window | Exit gate | Issues |
| --- | --- | --- | --- | --- |
| M0 | Mobile M0 — Discovery and Protected Branch | 2026-11-18 → 2026-11-25 | Protected baseline recorded, plan published and linked; branch model later simplified to single `main` | #31, #32 |
| M1 | Mobile M1 — Packaging Feasibility and Scaffold | 2026-11-26 → 2026-12-02 | Go/no-go recorded; on go, Capacitor scaffold and build scripts merged | #33, #34 |
| M2 | Mobile M2 — WebView Compatibility and UX | 2026-12-03 → 2026-12-16 | Storage, photos, CSP, permissions and 360dp UX verified | #35–#39 |
| M3 | Mobile M3 — Build Signing and Local Release | 2026-12-17 → 2026-12-30 | Clean-clone debug build and signed release APK verified | #40, #41 |
| M4 | Mobile M4 — Verification and Handover | 2026-12-31 → 2027-01-13 | Device matrix, security gate, docs and single-main platform checks complete | #42–#45 |

## Checkpoints

| Date | Checkpoint | Decision / evidence |
| --- | --- | --- |
| 2026-11-20 | Branch baseline | Protected mobile baseline existed through `7d36868`; migrated to single `main` on 2026-11-18 |
| 2026-11-25 | Plan complete | Scope, requirements, process, tasks, timeline, risk and sync logs linked from `MOBILE_RELEASE.md`, epic #30 and board #3 |
| 2026-12-02 | Feasibility gate | Capacitor spike result recorded; go to scaffold, or no-go with fallback plan |
| 2026-12-10 | WebView core | Local bundle, CSP and asset loading pass (#35) |
| 2026-12-14 | Data and photos | Dexie, backup/import, file input and object URL pass on device (#36, #37) |
| 2026-12-16 | M2 exit | Permissions, no-egress and phone UX pass (#38, #39) |
| 2026-12-23 | Debug APK | Clean-clone debug build and `adb install -r` verified (#40) |
| 2026-12-30 | Signed APK | Release signing, versioning and install verified (#41) |
| 2027-01-08 | Device acceptance | Matrix complete, no open High/Critical defect (#42) |
| 2027-01-10 | Security gate | `security:check`, scanner state and network capture accepted (#43) |
| 2027-01-13 | Handover | Release notes, rollback, support and recurring sync published (#44, #45) |

## Dependency chain

```
#31 protected branch ──> #32 plan ──> #33 feasibility gate
                                        |
                                   go  |
                                        v
                                  #34 scaffold
                                        |
        +-------------------+-----------+-----------+-------------------+
        v                   v                       v                   v
      #35 CSP/asset      #36 data/backup         #37 photos         #38/#39 UX/permissions
        +-------------------+-----------+-----------+-------------------+
                                        v
                                  #40 debug APK
                                        v
                                  #41 signed APK
                                        v
                          +-------------+-------------+
                          v                           v
                    #42 device matrix             #43 security gate
                          +-------------+-------------+
                                        v
                          #44 release handover  +  #45 recurring sync
```

## Slip rules

- If M1 slips, reduce comparison depth (document alternatives without full spikes) but keep the Capacitor offline spike and go/no-go record.
- If M2 slips, defer non-blocking UX polish from #38; do not defer storage, photo safety, permissions or CSP work.
- If M3 slips, keep the debug APK and signing definition; skip optional device variants in the first release matrix only if recorded as an accepted risk with an owner and review date.
- If M4 slips, publish the signed APK only after #42 and #43 pass. Release notes and sync process must be complete before handover.
- Any High/Critical security or data-loss defect stops the release regardless of schedule.

## Review cadence

- Weekly board review of Start/Target dates and blockers.
- `main` change-impact review weekly and before every release (#45).
- Formal gate reviews at 2026-12-02, 2026-12-16, 2026-12-30 and 2027-01-13.

Owner: maintainer. Generated: 2026-11-18.
