# Security Testing Project Scope — Plantjes / `devSecops`

## 1. Project context

- **Tracking board:** GitHub Project `Minprez-JP/devSecops` (#2), described as “security-related issues are posted here”.
- **Application under test:** `Minprez-JP/Plantjes` — a local-first, client-only plant care journal.
- **Stack:** TypeScript, React 19, Vite 8, Dexie 4 (IndexedDB), Vitest, npm.
- **Architecture:** No server, no accounts, no telemetry. All data stays in the browser origin; backups are unencrypted `.plantjes` JSON files.
- **Current security posture:** `SECURITY.md` defines the threat model, OWASP Top 10:2025 mapping, input limits, CSP injection, dependency policy, and a review checklist. CI runs blocking audit, tests, build, pinned ESLint security rules, CycloneDX SBOM/licence reports, install-integrity checks, no-egress evidence and gitleaks. CodeQL runs as a committed workflow; GitHub secret scanning and push protection are enabled. Dependabot maintains npm and GitHub Actions.
- **Remaining gap:** No one-off security gap remains; recurring triage (#25) and quarterly review (#70) stay open by design. CSP/asset-integrity coverage is in `scripts/security/production-build.test.mjs`; browser no-egress is in `scripts/security/browser-no-egress.test.mjs`; ZAP baseline with an expiry-tracked high-risk gate is in `ci.yml` and `scripts/security/check-zap-report.mjs`; CI gate/ruleset verification is in `scripts/security/verify-ci-gates.mjs` (single-maintainer no-self-approval is a documented accepted risk, reviewed quarterly with #70); seeded fuzz/property tests are in `src/lib/__tests__/`; upload validation coverage is in `src/__tests__/upload.test.tsx`. The `devSecops` board is populated and actively tracked.

## 2. Objectives

1. Turn the controls claimed in `SECURITY.md` into automated, repeatable tests.
2. Detect regressions in the documented in-scope threats before they reach `main`.
3. Produce machine-readable evidence (SARIF, JSON reports, build artifacts) for each release.
4. Keep the privacy and supply-chain guarantees intact: no runtime third-party requests, small pinned dependency set, strict same-origin CSP.
5. Give the maintainer a single, prioritised backlog on the `devSecops` project board.

## 3. In scope

| Area | Included work |
| --- | --- |
| Application source | `src/**`, `src/lib/**`, `index.html`, `vite.config.ts`, import/export/photo paths, form validation |
| Build & dependency graph | `package.json`, `package-lock.json`, Vite build output, npm audit, SBOM, licence inventory, Dependabot config |
| CI/CD | `.github/workflows/ci.yml`, pinned actions, least-privilege permissions, branch ruleset, required checks |
| Client runtime | Production CSP meta tag, absence of inline/remote script, no third-party network egress, IndexedDB usage |
| Security testing tooling | CodeQL/Semgrep, security lint rules, gitleaks, ZAP baseline, fuzz/property tests, report upload |
| Governance | Threat model refinement, metrics/SLAs, documentation, issue/project-board tracking |

## 4. Out of scope

- Server-side APIs, authentication, sessions, authorisation, or databases — the application has none.
- Container, Kubernetes, Helm, Terraform/IaC, and cloud-posture scanning — no such assets exist.
- Hosting-provider header configuration (documented only as recommendations in `SECURITY.md`).
- Threats explicitly excluded by `SECURITY.md`: physical access to an unlocked device, malicious browser extensions, compromised OS, availability of a browser’s IndexedDB implementation.
- Formal compliance certification, penetration test by an external party, or bug-bounty operations.
- Adding new runtime dependencies to the shipped application; testing tools must stay in development/CI only.

## 5. Threat-to-test alignment

| In-scope threat (from `SECURITY.md`) | Test stream |
| --- | --- |
| Script execution via plant text, imported records, photo uploads (stored XSS) | SAST/security lint, malicious-fixture regression tests, fuzz tests, DAST |
| DoS via oversized or malformed input | Fuzz/property tests for import, form limits, upload size/MIME/downscale |
| Compromise of third-party code or assets | Lockfile audit, SBOM, licence scan, asset-integrity/CSP test, egress test |
| Leakage of browsing context or journal contents | No-egress browser test, static scan for remote URLs/telemetry |
| Integrity failures in build or dependency graph | Pinned actions, `npm ci`, least-privilege CI, required checks, build reproducibility check |

## 6. Assumptions and constraints

- This is a personal, best-effort project; controls should be pragmatic and low-maintenance.
- CI runs on `ubuntu-latest` with Node 26; all test tooling must work there.
- The existing CSP is injected via a Vite build plugin; `frame-ancestors` remains a host-header responsibility.
- No server means DAST is performed against a locally served production build (`vite preview`), not a deployed environment.
- Security tooling must not introduce runtime third-party assets or break the strict CSP.

## 7. Definition of done

- Every push and pull request runs the security test suite with machine-readable reports.
- Baseline findings are triaged; no unmitigated High/Critical finding blocks a merge.
- The `devSecops` board contains the complete, prioritised backlog with owners/status.
- `SECURITY.md` and a new `SECURITY_TESTING.md` describe how to run, interpret, and maintain the tests.
- Evidence artifacts are attached to CI runs and retained per repository settings.
