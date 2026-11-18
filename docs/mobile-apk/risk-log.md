# Mobile APK risk log

Owner for every item: maintainer unless stated otherwise. Status is reviewed weekly and at each phase gate. Accepted risks need a dated review, never an open-ended waiver.

| ID | Risk | L / I | Mitigation | Trigger / decision | Review | Issue |
| --- | --- | --- | --- | --- | --- | --- |
| R-01 | Android WebView IndexedDB/Dexie behaviour differs from desktop browsers, causing data loss or schema errors | M / H | M1 spike on target WebView; on-device restart and lifecycle tests; keep `.plantjes` export instruction prominent | If persistence fails in spike, M1 is no-go | 2026-12-02 | #33, #36 |
| R-02 | Removing `INTERNET` permission breaks WebView loading or Capacitor internals | M / H | Test local bundle with permission removed; document any required permission with evidence; deny cleartext via network security config | First debug APK build | 2026-12-16 | #39, #40 |
| R-03 | `<input type=file>` maps inconsistently to gallery/camera on Android; camera permission may be unexpectedly required | M / H | Device-test gallery selection, MIME/size checks, downscale and object URLs; prefer gallery-only flow; add CAMERA only with written justification | M2 photo test | 2026-12-14 | #37 |
| R-04 | Packaging change introduces a remote runtime asset, font or CDN call and breaks the no-egress promise | L / H | Keep CSP unchanged unless strictly required; regression test for remote runtime assets; network capture on device | Every mobile PR and M4 gate | 2027-01-10 | #35, #39, #43 |
| R-05 | Signing keystore is lost or committed | M / H | Generate outside repo, store in maintainer-controlled secret store, never commit passwords; document rotation/loss impact | Before first release build | 2026-12-30 | #41 |
| R-06 | Desktop and Android platform configuration drift on `main` | H / H | Single protected `main`; shared changes and platform folders reviewed in the same PR; desktop + Android build from the same commit; pre-release build check | Every relevant PR and release build | Weekly | #45 |
| R-07 | Limited device coverage hides API-level or OEM-specific failures | M / M | Minimum matrix: current emulator, one older supported API, one physical device; record accepted gaps with owner/date | M4 planning | 2027-01-08 | #42 |
| R-08 | Backup import/export or data-clearing causes user-perceived data loss | M / H | Verify round trip on device; document export before clear/uninstall/rollback; reject malformed files visibly | M2 and M4 | 2027-01-13 | #36, #44 |
| R-09 | Capacitor or Android tooling upgrades break the pinned build | M / M | Pin dependencies and tooling, commit platform project, test from clean clone before release | Dependency update PR | 2026-12-30 | #34, #40, #41 |
| R-10 | Part-time schedule slips past 2027-01-13 | H / M | Apply timeline slip rules; reduce UX polish first; never ship before security/data gates | Weekly board review | Weekly | #32, #42, #43 |
| R-11 | Legacy `archive/v2-mobile` or `archive/mobile-branch` is mistaken for the active branch | M / M | State `main` as canonical in `MOBILE_RELEASE.md`, docs and board; keep both archived branches read-only and delete-protected | Branch setup and docs review | 2026-11-25 | #31, #32 |

## Decision record template

Use this block when a gate is decided or a risk is accepted:

```
Date:
Decision / risk ID:
Evidence (issue, commit, device, command output):
Decision (go / no-go / accepted):
Rationale:
Owner:
Review / expiry date:
Linked issue:
```

Owner: maintainer. Generated: 2026-11-18.
