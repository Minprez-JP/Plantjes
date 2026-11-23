# Issue Register — `devSecops` board (Minprez-JP/Plantjes)

Board: https://github.com/users/Minprez-JP/projects/2  
Epic: [#9](https://github.com/Minprez-JP/Plantjes/issues/9) — label `security`, child of #9 unless marked epic. Board Status is updated as work lands; see notes for current implementation links.

| Issue | Title | Milestone / Phase | Requirements | Notes |
| --- | --- | --- | --- | --- |
| [#9](https://github.com/Minprez-JP/Plantjes/issues/9) | [SECURITY] Establish automated security testing for Plantjes (epic) | Phase 0 - Foundation | FR-01..FR-12 | Parent for all items below |
| [#10](https://github.com/Minprez-JP/Plantjes/issues/10) | SEC-01: Publish security testing scope, threat alignment and acceptance criteria | Phase 0 - Foundation | FR-11, FR-12, NFR-03 | Publishing via PR #27 |
| [#11](https://github.com/Minprez-JP/Plantjes/issues/11) | SEC-02: Configure devSecops board, security label and milestones | Phase 0 - Foundation | FR-11 | Verified 2026-11-22: `security` label on all 16 epic issues, four phase milestones assigned, all 17 board items have Status, and Labels/Milestone/Repository fields are populated; closed |
| [#12](https://github.com/Minprez-JP/Plantjes/issues/12) | SEC-03: Define security metrics, SLA and quarterly review cadence | Phase 0 - Foundation | FR-11, NFR-03, NFR-05 | Metrics/SLA documented in `SECURITY_TESTING.md`; reports uploaded as `security-reports`; quarterly review in #70 |
| [#13](https://github.com/Minprez-JP/Plantjes/issues/13) | SEC-04: Integrate CodeQL SAST with SARIF upload | Phase 1 - Static and Supply Chain | FR-01, NFR-06 | Committed `codeql.yml` with pinned SHAs replaces default setup; required checks remain #22 |
| [#14](https://github.com/Minprez-JP/Plantjes/issues/14) | SEC-05: Add security lint rules for dangerous browser sinks | Phase 1 - Static and Supply Chain | FR-02 | Pinned flat config, four custom rules, negative/positive fixtures, JSON + SARIF evidence uploaded to code scanning |
| [#15](https://github.com/Minprez-JP/Plantjes/issues/15) | SEC-06: Generate SBOM, licence report and harden dependency audit | Phase 1 - Static and Supply Chain | FR-03, NFR-04, NFR-05 | Pinned CycloneDX SBOMs, licence policy, install baseline, audit policy and no-egress evidence; Android SBOMs are documented placeholders until a Capacitor scaffold exists |
| [#16](https://github.com/Minprez-JP/Plantjes/issues/16) | SEC-07: Enable GitHub secret scanning and CI gitleaks check | Phase 1 - Static and Supply Chain | FR-04 | GitHub secret scanning + push protection enabled 2026-11-18; CI gitleaks pinned action and Docker-reproducible local scan |
| [#17](https://github.com/Minprez-JP/Plantjes/issues/17) | SEC-08: Add CSP and asset-integrity regression test on production build | Phase 2 - Dynamic and Input Testing | FR-05 | Exact CSP meta, no sourcemaps/remote assets |
| [#18](https://github.com/Minprez-JP/Plantjes/issues/18) | SEC-09: Fuzz and property-test backup import and plant form validation | Phase 2 - Dynamic and Input Testing | FR-06, NFR-02 | Seeded generators for malformed/oversized `.plantjes`, field limits, numeric ranges, allowlists and inert rendering |
| [#19](https://github.com/Minprez-JP/Plantjes/issues/19) | SEC-10: Add upload validation regression tests | Phase 2 - Dynamic and Input Testing | FR-07 | `src/__tests__/upload.test.tsx`: MIME allowlist, 15 MB pre-decode rejection, corrupt blobs, 1600 px downscale, object-URL fallbacks |
| [#20](https://github.com/Minprez-JP/Plantjes/issues/20) | SEC-11: Add no-egress/privacy browser regression test | Phase 2 - Dynamic and Input Testing | FR-09, NFR-02 | Zero external requests |
| [#21](https://github.com/Minprez-JP/Plantjes/issues/21) | SEC-12: Run OWASP ZAP baseline against the preview build | Phase 2 - Dynamic and Input Testing | FR-08, NFR-05 | Local `vite preview` scan |
| [#22](https://github.com/Minprez-JP/Plantjes/issues/22) | SEC-13: Harden CI security gates and branch ruleset | Phase 3 - Governance and Handover | FR-10, NFR-06 | Required checks, pinned SHAs |
| [#23](https://github.com/Minprez-JP/Plantjes/issues/23) | SEC-14: Publish SECURITY_TESTING.md and update the review checklist | Phase 3 - Governance and Handover | FR-12, NFR-03, NFR-07 | Publishing via PR #27; `npm run security:check` added |
| [#24](https://github.com/Minprez-JP/Plantjes/issues/24) | SEC-15: Triage and resolve open CodeQL XSS alerts (#1, #2) | Phase 1 - Static and Supply Chain | FR-01, FR-02, FR-11, NFR-03 | Resolved by PRs #26/#28: blob guard, tests, sink rationale; CodeQL alerts fixed, 0 open |
| [#25](https://github.com/Minprez-JP/Plantjes/issues/25) | SEC-16: Establish recurring security-alert triage workflow | Phase 3 - Governance and Handover | FR-11, NFR-03, NFR-05 | Workflow documented via PR #27; monthly enablement check still to exercise |
| [#70](https://github.com/Minprez-JP/Plantjes/issues/70) | SEC-17: Quarterly security review | Phase 3 - Governance and Handover | FR-11, NFR-03, NFR-05 | First review due 2027-02-22; owner is the maintainer |

## Security alert sources reviewed (2026-11-18)

| Source | Status | Related task |
| --- | --- | --- |
| Dependabot alerts | Enabled; 0 open, 0 historical | #15, #25 |
| Code scanning (committed CodeQL workflow) | Active; 2 original `js/xss-through-dom` alerts triaged as false positives and marked `fixed` after PRs #26/#28; PR-only alerts #3-#5 dismissed with the same rationale | #13, #24 |
| Secret scanning | Enabled with push protection; alerts endpoint reachable; non-provider patterns/validity checks remained disabled via API | #16, #25 |
| CI gitleaks | Pinned action v3.0.0 with gitleaks 8.30.1 and structured allowlist; no findings in baseline scan | #16, #25 |
