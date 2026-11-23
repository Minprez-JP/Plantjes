# Security Testing Requirements — Plantjes / `devSecops`

## 1. Functional requirements

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| FR-01 | Static application security testing (SAST) must run on every push and pull request. | CodeQL or Semgrep workflow is present; results upload to GitHub code scanning as SARIF; workflow is a required status check. |
| FR-02 | Security-focused lint rules must detect dangerous browser sinks. | Rules flag `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`, dynamic `import(` of user input; CI fails on new violations. |
| FR-03 | Software composition analysis must cover vulnerabilities, licences, and provenance. | `npm audit` fails on High/Critical; CycloneDX SBOM and licence report are generated from `package-lock.json` and uploaded as artifacts. |
| FR-04 | Secret scanning must be active in GitHub and locally in CI. | GitHub secret scanning + push protection enabled; gitleaks scan runs on PRs with a checked-in allowlist for known test strings. |
| FR-05 | Production CSP and asset integrity must be verified automatically. | Test builds the app and asserts the exact CSP meta value, `sourcemap: false`, no inline `<script>`, no remote `src`/`href`, and no CDN URLs. |
| FR-06 | Backup import and plant form validation must be fuzz/property tested. | With deterministic seeds, generated malformed, oversized, and hostile `.plantjes` payloads are rejected or normalised by `src/lib/backup.ts`, and generated form data is rejected or normalised by `src/lib/plantForm.ts`/`parseCareForm`; neither path crashes, executes script, or accepts out-of-range values. |
| FR-07 | Photo upload controls must be regression-tested. | Tests cover MIME allowlist (JPEG/PNG/WebP/AVIF/BMP/GIF), SVG rejection, 15 MB cap, missing/corrupt blobs, and downscale to <= 1600 px. |
| FR-08 | Dynamic security testing must run against the built app. | OWASP ZAP baseline scans `vite preview`; JSON/HTML report is uploaded; high-risk alerts fail the job or are explicitly risk-accepted with expiry. |
| FR-09 | Privacy/no-egress must be regression-tested. | Browser test records network requests and asserts zero external origins during load, import, photo handling, and export. |
| FR-10 | CI/CD security gates must be verifiable. | Workflow has `contents: read` only, all `uses:` pinned to full SHAs, branch ruleset requires the security checks, and dependency changes cannot self-merge. |
| FR-11 | Findings and metrics must be visible on the `devSecops` board. | Each issue is linked to the project, has Status, Labels, and Milestone set; security reports are attached to the related CI run; suppression log is maintained. |
| FR-12 | Security testing knowledge must be documented. | `SECURITY_TESTING.md` explains how to run each tool locally and in CI, interpret reports, handle false positives, and update baselines. |

## 2. Non-functional requirements

| ID | Requirement | Target |
| --- | --- | --- |
| NFR-01 | CI performance | Added security jobs complete within 10 minutes total; no individual job exceeds the existing 15-minute timeout. |
| NFR-02 | Determinism | Tests use checked-in fixtures and local-only services; no flaky calls to the public internet. |
| NFR-03 | False-positive control | Every suppression/allowlist entry names a reason, owner, and expiry/review date; entries are reviewed quarterly. |
| NFR-04 | Maintainability | Tooling configured as code; no new runtime dependencies; development dependencies kept to a minimum and reviewed via Dependabot. |
| NFR-05 | Evidence retention | SARIF/JSON/HTML reports uploaded as CI artifacts and referenced from the related issue or release notes. |
| NFR-06 | Least privilege | Security workflows use `permissions: contents: read` and, where needed, `security-events: write` only for SARIF upload. |
| NFR-07 | Usability | A maintainer can run the full local security suite with one documented command (for example `npm run security:check`). |

## 3. Traceability matrix

| Requirement | Planned issues |
| --- | --- |
| FR-01, NFR-06 | SAST integration, CI security gate review |
| FR-02 | Security lint rules |
| FR-03 | SBOM & licence inventory, dependency audit hardening |
| FR-04 | Secret scanning |
| FR-05 | CSP & asset integrity test |
| FR-06 | Fuzz tests for import/backup/form |
| FR-07 | Upload validation regression tests |
| FR-08 | ZAP baseline DAST |
| FR-09 | No-egress/privacy test |
| FR-10 | Branch ruleset & required checks |
| FR-11, NFR-05 | Board setup, metrics & suppression log |
| FR-12, NFR-03, NFR-07 | Security testing guide & runbook |
| NFR-01, NFR-02, NFR-04 | All implementation issues (design constraint) |

## 4. Priority model

- **P0 — Blocker:** Directly protects a documented in-scope threat or required CI gate (FR-01, FR-03, FR-05, FR-06, FR-10).
- **P1 — High:** Strong coverage with low maintenance cost (FR-02, FR-04, FR-07, FR-09).
- **P2 — Medium:** Adds evidence or depth (FR-08, FR-11, FR-12).
- **P3 — Low:** Optimisation and periodic review tasks.
