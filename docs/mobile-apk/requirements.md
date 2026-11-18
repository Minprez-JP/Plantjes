# Mobile APK requirements

Traceability: every requirement maps to at least one issue in epic #30. Acceptance is recorded on project board #3 and evidenced in the release/verification issues.

## Functional requirements

| ID | Requirement | Acceptance evidence | Issues |
| --- | --- | --- | --- |
| FR-M01 | Produce an APK that installs locally without a store account or server | `adb install -r` succeeds on a physical device; app launches with network disabled | [#30](https://github.com/Minprez-JP/Plantjes/issues/30), [#33](https://github.com/Minprez-JP/Plantjes/issues/33), [#42](https://github.com/Minprez-JP/Plantjes/issues/42) |
| FR-M02 | Package the existing Vite production bundle into an Android WebView with no remote server URL | Production bundle loads from local assets; no `http(s)` server is configured in Capacitor | [#33](https://github.com/Minprez-JP/Plantjes/issues/33), [#34](https://github.com/Minprez-JP/Plantjes/issues/34), [#35](https://github.com/Minprez-JP/Plantjes/issues/35) |
| FR-M03 | Preserve Dexie persistence across app restarts | Create/edit/delete plants, force-stop and restart; data survives and schema is intact | [#36](https://github.com/Minprez-JP/Plantjes/issues/36) |
| FR-M04 | Preserve the photo upload, validation, downscale, preview and object-URL workflow | Gallery/camera-selection flow, MIME/size checks, 1600px downscale and blob previews work on device | [#37](https://github.com/Minprez-JP/Plantjes/issues/37) |
| FR-M05 | Preserve `.plantjes` export/import, validation and replace behaviour | Backup exported on device imports back without loss; malformed/oversized files are rejected visibly | [#36](https://github.com/Minprez-JP/Plantjes/issues/36) |
| FR-M06 | Provide a usable phone experience | 360dp and small-tablet checks for viewport, safe areas, touch targets, dialogs, keyboard and Android back button | [#38](https://github.com/Minprez-JP/Plantjes/issues/38) |
| FR-M07 | Provide repeatable debug and release build commands from a clean checkout | Documented prerequisites and one-command debug/release builds; clean-clone verification recorded | [#40](https://github.com/Minprez-JP/Plantjes/issues/40), [#41](https://github.com/Minprez-JP/Plantjes/issues/41) |
| FR-M08 | Sign the release APK and align versioning with `package.json` | Signed APK installs with unknown sources enabled; `versionName`/`versionCode` are consistent and incremented | [#41](https://github.com/Minprez-JP/Plantjes/issues/41) |
| FR-M09 | Keep all runtime assets local and enforce the existing same-origin CSP | Regression test fails on remote runtime assets; CSP has no remote hosts and no `unsafe-inline` script allowance | [#35](https://github.com/Minprez-JP/Plantjes/issues/35), [#43](https://github.com/Minprez-JP/Plantjes/issues/43) |
| FR-M10 | Keep Android permissions minimal and networking locked down | `INTERNET` removed if not required; cleartext denied; no telemetry/CDN/remote-font endpoints | [#37](https://github.com/Minprez-JP/Plantjes/issues/37), [#39](https://github.com/Minprez-JP/Plantjes/issues/39), [#43](https://github.com/Minprez-JP/Plantjes/issues/43) |
| FR-M11 | Maintain a protected `Mobile` branch and review every functional `main` change for mobile impact | Branch protection verified; sync log updated; at least one real `main` → `Mobile` sync PR exercised | [#31](https://github.com/Minprez-JP/Plantjes/issues/31), [#45](https://github.com/Minprez-JP/Plantjes/issues/45) |
| FR-M12 | Publish canonical docs and a maintainable handover | Docs linked from epic #30, project #3 README and repo README on `Mobile`; release/support/rollback notes published | [#32](https://github.com/Minprez-JP/Plantjes/issues/32), [#44](https://github.com/Minprez-JP/Plantjes/issues/44), [#45](https://github.com/Minprez-JP/Plantjes/issues/45) |

## Non-functional requirements

| ID | Requirement | Acceptance evidence | Issues |
| --- | --- | --- | --- |
| NFR-M01 | The app must start and operate with no network connectivity | Airplane-mode run on emulator and physical device; no missing assets or blocked features | [#33](https://github.com/Minprez-JP/Plantjes/issues/33), [#42](https://github.com/Minprez-JP/Plantjes/issues/42) |
| NFR-M02 | Touch interaction must remain usable on small screens | Screenshots and manual pass at 360dp, including keyboard and dialog states | [#38](https://github.com/Minprez-JP/Plantjes/issues/38), [#42](https://github.com/Minprez-JP/Plantjes/issues/42) |
| NFR-M03 | The APK must preserve the no-egress privacy guarantee | Network capture shows zero third-party requests; no analytics, telemetry or remote fonts | [#39](https://github.com/Minprez-JP/Plantjes/issues/39), [#43](https://github.com/Minprez-JP/Plantjes/issues/43) |
| NFR-M04 | The release must be stable on the agreed device matrix | No open High/Critical defect; cold-start, APK size and failures recorded | [#42](https://github.com/Minprez-JP/Plantjes/issues/42) |
| NFR-M05 | Plant data and photos must not be corrupted by mobile lifecycle events | Rotate, background/foreground, force-stop and restart tests pass with intact data | [#36](https://github.com/Minprez-JP/Plantjes/issues/36), [#37](https://github.com/Minprez-JP/Plantjes/issues/37), [#42](https://github.com/Minprez-JP/Plantjes/issues/42) |
| NFR-M06 | Builds must be reproducible from pinned tooling and committed sources | Clean checkout build with documented JDK/SDK/Node versions; keystore external to repo | [#40](https://github.com/Minprez-JP/Plantjes/issues/40), [#41](https://github.com/Minprez-JP/Plantjes/issues/41) |
| NFR-M07 | Governance must be traceable and auditable | Protected branch, this document set, board fields, risk/sync logs with owners and review dates | [#31](https://github.com/Minprez-JP/Plantjes/issues/31), [#32](https://github.com/Minprez-JP/Plantjes/issues/32), [#45](https://github.com/Minprez-JP/Plantjes/issues/45) |

## Global acceptance checklist

- [ ] M1 go/no-go decision is recorded and accepted.
- [ ] `npm test`, `npm run build` and `npm run security:check` pass on `Mobile`.
- [ ] Code and secret scanning show no unmitigated High/Critical alert.
- [ ] Blob-URL guard and image-input regression tests pass on the mobile branch.
- [ ] No third-party runtime request is observed on device.
- [ ] Debug and signed release APKs are built from documented commands.
- [ ] Device matrix evidence, release notes and rollback steps are attached to epic #30.

Owner: maintainer. Review date: 2027-01-13 (M4 exit).
