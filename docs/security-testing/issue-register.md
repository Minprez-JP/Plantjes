# Issue Register — `devSecops` board (Minprez-JP/Plantjes)

Board: https://github.com/users/Minprez-JP/projects/2  
Epic: [#9](https://github.com/Minprez-JP/Plantjes/issues/9) — all items currently **Status: Todo**, label `security`, child of #9 unless marked epic.

| Issue | Title | Milestone / Phase | Requirements | Notes |
| --- | --- | --- | --- | --- |
| [#9](https://github.com/Minprez-JP/Plantjes/issues/9) | [SECURITY] Establish automated security testing for Plantjes (epic) | Phase 0 - Foundation | FR-01..FR-12 | Parent for all items below |
| [#10](https://github.com/Minprez-JP/Plantjes/issues/10) | SEC-01: Publish security testing scope, threat alignment and acceptance criteria | Phase 0 - Foundation | FR-11, FR-12, NFR-03 | Will publish `SECURITY_TESTING.md` index |
| [#11](https://github.com/Minprez-JP/Plantjes/issues/11) | SEC-02: Configure devSecops board, security label and milestones | Phase 0 - Foundation | FR-11 | Label + 4 milestones + board fields |
| [#12](https://github.com/Minprez-JP/Plantjes/issues/12) | SEC-03: Define security metrics, SLA and quarterly review cadence | Phase 0 - Foundation | FR-11, NFR-03, NFR-05 | High/Critical 7d, Medium 30d |
| [#13](https://github.com/Minprez-JP/Plantjes/issues/13) | SEC-04: Integrate CodeQL SAST with SARIF upload | Phase 1 - Static and Supply Chain | FR-01, NFR-06 | Updated 2026-11-18: default CodeQL setup already active; baseline triage in #24 |
| [#14](https://github.com/Minprez-JP/Plantjes/issues/14) | SEC-05: Add security lint rules for dangerous browser sinks | Phase 1 - Static and Supply Chain | FR-02 | Blocks `innerHTML`, `eval`, etc. |
| [#15](https://github.com/Minprez-JP/Plantjes/issues/15) | SEC-06: Generate SBOM, licence report and harden dependency audit | Phase 1 - Static and Supply Chain | FR-03, NFR-04, NFR-05 | CycloneDX + licences + `npm audit` |
| [#16](https://github.com/Minprez-JP/Plantjes/issues/16) | SEC-07: Enable GitHub secret scanning and CI gitleaks check | Phase 1 - Static and Supply Chain | FR-04 | Updated 2026-11-18: secret scanning confirmed disabled (404) |
| [#17](https://github.com/Minprez-JP/Plantjes/issues/17) | SEC-08: Add CSP and asset-integrity regression test on production build | Phase 2 - Dynamic and Input Testing | FR-05 | Exact CSP meta, no sourcemaps/remote assets |
| [#18](https://github.com/Minprez-JP/Plantjes/issues/18) | SEC-09: Fuzz and property-test backup import and plant form validation | Phase 2 - Dynamic and Input Testing | FR-06, NFR-02 | Malformed `.plantjes` payloads |
| [#19](https://github.com/Minprez-JP/Plantjes/issues/19) | SEC-10: Add upload validation regression tests | Phase 2 - Dynamic and Input Testing | FR-07 | MIME allowlist, 15 MB, SVG rejection, downscale |
| [#20](https://github.com/Minprez-JP/Plantjes/issues/20) | SEC-11: Add no-egress/privacy browser regression test | Phase 2 - Dynamic and Input Testing | FR-09, NFR-02 | Zero external requests |
| [#21](https://github.com/Minprez-JP/Plantjes/issues/21) | SEC-12: Run OWASP ZAP baseline against the preview build | Phase 2 - Dynamic and Input Testing | FR-08, NFR-05 | Local `vite preview` scan |
| [#22](https://github.com/Minprez-JP/Plantjes/issues/22) | SEC-13: Harden CI security gates and branch ruleset | Phase 3 - Governance and Handover | FR-10, NFR-06 | Required checks, pinned SHAs |
| [#23](https://github.com/Minprez-JP/Plantjes/issues/23) | SEC-14: Publish SECURITY_TESTING.md and update the review checklist | Phase 3 - Governance and Handover | FR-12, NFR-03, NFR-07 | One-command local suite |
| [#24](https://github.com/Minprez-JP/Plantjes/issues/24) | SEC-15: Triage and resolve open CodeQL XSS alerts (#1, #2) | Phase 1 - Static and Supply Chain | FR-01, FR-02, FR-11, NFR-03 | Alert review 2026-11-18; likely false positive, must document decision |
| [#25](https://github.com/Minprez-JP/Plantjes/issues/25) | SEC-16: Establish recurring security-alert triage workflow | Phase 3 - Governance and Handover | FR-11, NFR-03, NFR-05 | Weekly triage, SLA, suppression log, monthly enablement check |

## Security alert sources reviewed (2026-11-18)

| Source | Status | Related task |
| --- | --- | --- |
| Dependabot alerts | Enabled; 0 open, 0 historical | #15, #25 |
| Code scanning (CodeQL default setup) | Active; 2 open `js/xss-through-dom` alerts (#1, #2) | #13, #24 |
| Secret scanning | Disabled; alerts endpoint returns 404 | #16 |
