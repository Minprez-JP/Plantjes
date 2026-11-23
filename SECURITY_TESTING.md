# Security testing guide

This is the entry point for the **Plantjes.** security testing programme. It is
the version-controlled companion to [SECURITY.md](./SECURITY.md); the detailed
planning artefacts live alongside it:

- [Scope](./docs/security-testing/scope.md) — in/out-of-scope assets, threat-to-test alignment, definition of done.
- [Requirements](./docs/security-testing/requirements.md) — FR-01..FR-12, NFR-01..NFR-07 and traceability.
- [Delivery plan](./docs/security-testing/planning.md) — phases, estimates, dependencies, review cadence.
- [Issue register](./docs/security-testing/issue-register.md) — every board item with milestone and requirement coverage.

Tracking: [`devSecops` project](https://github.com/users/Minprez-JP/projects/2)
and epic [#9](https://github.com/Minprez-JP/Plantjes/issues/9).

## Quick start

```bash
npm ci
npm run security:check
```

`npm run security:check` runs:

1. `npm audit --audit-level=high --omit=dev` — blocking runtime dependency gate.
2. `npm run verify:install` — `npm ci` lockfile/hash baseline check.
3. `npm run security:reports` — pinned lint rules, CycloneDX SBOMs, licence
   policy and audit policy.
4. `npm test` — unit, component and security regression tests, including the lint fixtures.
5. `npm run build` — type-check and production bundle.
6. `npm run verify:no-egress` — dependency and built-bundle remote-asset check.

To write the CI-equivalent evidence reports locally:

```bash
npm run security:reports
```

This creates audit JSON, install-integrity, lint JSON/SARIF, four CycloneDX
SBOMs, `sbom-index.json`, `licence-inventory.json`, generated third-party
notices and `summary.json` under `artifacts/security/`. To report
development-only advisories without failing the command:

```bash
npm audit --audit-level=high
```

The gitleaks scan needs Docker and is deliberately separate from the zero-egress
local check:

```bash
npm run secret:scan
```

## CI and enabled GitHub security features

| Control | Implementation | Blocking? |
| --- | --- | --- |
| Runtime dependency audit | `ci.yml`: `npm audit --audit-level=high --omit=dev` | Yes |
| Dev dependency advisories | `ci.yml`: `npm audit --audit-level=high \|\| true`; `security-policies/audit.json` requires a reviewed acceptance for any reported advisory | Yes after policy review |
| Reproducible install | `git diff --exit-code -- package-lock.json` + `npm run verify:install` against `security-baselines/install.json` | Yes |
| SBOM and licences | `npm run security:reports`: pinned `@cyclonedx/cyclonedx-npm@7.0.1`, four commit-named SBOMs, licence policy and generated notices | Yes |
| No-egress evidence | `npm run verify:no-egress` checks production dependency names and built asset references | Yes |
| Tests and build | `npm test`, `npm run build` | Yes |
| Security lint | `ci.yml`: `npm run security:reports` runs the pinned ESLint rules and fails on findings; a separate least-privilege job uploads SARIF to code scanning | Yes |
| SAST | `.github/workflows/codeql.yml`: committed CodeQL workflow for JavaScript/TypeScript + Actions, SARIF uploaded with `security-events: write` | Findings triaged via Security tab |
| Evidence retention | `ci.yml` uploads `artifacts/security/` as `security-reports-<branch>-<commit>` (90-day retention) | — |
| Dependency updates | Dependabot: npm (minor/patch grouped), GitHub Actions (all updates grouped) | PR-based review |
| Secret scanning | Enabled with push protection (provider patterns); alerts endpoint reachable. Non-provider patterns and validity checks remained disabled via API for this public repository. | Alerts triaged via Security tab |
| CI secret scan | `ci.yml`: `gitleaks/gitleaks-action` pinned to `e0c47f4f8be36e29cdc102c57e68cb5cbf0e8d1e` with `GITLEAKS_VERSION=8.30.1` and `.gitleaks.toml` | Yes |

The added `gitleaks` job has a 10-minute timeout and the SARIF upload job has a
10-minute timeout; the existing `Audit, test, and build` job stays at 15 minutes.

## DevSecOps board configuration verification (2026-11-22)

Verified against project [#2](https://github.com/users/Minprez-JP/projects/2) and epic [#9](https://github.com/Minprez-JP/Plantjes/issues/9):

- The `security` label exists and is applied to every one of the 16 child issues in the epic.
- All four phase milestones (`Phase 0 - Foundation`, `Phase 1 - Static and Supply Chain`, `Phase 2 - Dynamic and Input Testing`, `Phase 3 - Governance and Handover`) exist and are assigned to the relevant issues.
- All 17 board items (the epic plus its 16 children) are attached to the project and have a `Status` value (`Todo`, `In Progress` or `Done`).
- The `Status`, `Labels`, `Milestone` and `Repository` project fields are populated for each item.

This completes [#11](https://github.com/Minprez-JP/Plantjes/issues/11).

## Security metrics and review cadence

Every CI run writes `artifacts/security/summary.json` and the matching audit,
JSON, SARIF, SBOM and licence reports. These are uploaded as the
`security-reports-<branch>-<commit>` artifact and should be linked from the
closing comment of the related issue or release notes.

| Metric | Definition | Source |
| --- | --- | --- |
| Findings by severity | Open code-scanning and audit findings grouped as Critical/High/Medium/Low | Security tab + `npm-audit.json` |
| Time to remediation | Days from alert creation/first detection to fix, dismissal or accepted risk | Issue timeline + Security tab |
| Suppression count and age | Number of active suppressions and days since each expiry/review date | This guide + `summary.json` |
| Tool coverage | Enabled tools and the languages/builds they cover: npm audit, CycloneDX SBOM, licence policy, ESLint security rules, CodeQL (JS/TS + Actions), GitHub secret scanning, CI gitleaks | CI workflow + API checks |

SLA: **High/Critical triaged within 7 days**, **Medium within 30 days**, **Low
backlogged**. The recurring check is tracked in
[#70](https://github.com/Minprez-JP/Plantjes/issues/70) (first review due
2027-02-22) and the weekly alert triage in
[#25](https://github.com/Minprez-JP/Plantjes/issues/25). Each quarterly review
covers the threat model, allowlists/suppressions, tool versions and the metrics
above.

## Supply-chain evidence (FR-03)

`npm run security:reports` records the exact generator versions in
`summary.json`. `@cyclonedx/cyclonedx-npm@7.0.1` produces reproducible CycloneDX
1.7 JSON from the dependency tree installed by `npm ci`; the script adds
component-level integrity hashes and verifies that every component has a name,
version, purl, declared licence, hash and dependency relationship. For each
commit it writes:

- `sbom-desktop-<commit>.json` — full build SBOM.
- `sbom-desktop-production-<commit>.json` — production-only distributed bundle view.
- `sbom-android-<commit>.json` and `sbom-android-production-<commit>.json` —
  explicit placeholders. This repository has no Capacitor/Android scaffold, so
  their component set mirrors the desktop npm graph and the metadata says so;
  mobile issue #48 must regenerate them once Android dependencies exist.

`licence-inventory.json` is derived from the production SBOM and checked against
`security-policies/licences.json`. Unknown licences, GPL/AGPL/LGPL/SSPL,
source-available and `UNLICENSED` components fail unless an unexpired approval
with owner, reason, expiry and linked issue is present. `THIRD_PARTY_NOTICES.generated.md`
includes the full MIT+Beer `LICENSE` text and the dependency table; the checked-in
`THIRD_PARTY_NOTICES.md` remains the source for fonts and photography.

`security-baselines/install.json` records the SHA-256 of `package-lock.json` and
the sorted package list. CI checks `git diff --exit-code -- package-lock.json`,
confirms `node_modules/.package-lock.json` was produced by `npm ci`, and records
the Node/npm versions without comparing them to the content hashes. Node 22/26
equivalence must be re-run for mobile issue #48; any baseline update requires a
reviewed PR. `security-policies/audit.json` records accepted advisories; any new
Medium/Low advisory needs an unexpired linked acceptance, and High/Critical
findings always fail.

## Secret scanning (FR-04)

GitHub secret scanning with push protection is enabled. Non-provider patterns and
validity checks remained disabled via the API for this public repository. The
alerts endpoint returns HTTP 200 with 0 open alerts.

CI runs `gitleaks/gitleaks-action` pinned to
`e0c47f4f8be36e29cdc102c57e68cb5cbf0e8d1e` (# v3.0.0) with
`GITLEAKS_VERSION=8.30.1`, `GITLEAKS_CONFIG=.gitleaks.toml` and read-only
permissions. PR comments and SARIF uploads from the action are disabled; the
job result is the gate. `.gitleaks.toml` extends the pinned default rules, and
`security-policies/secret-scan-allowlist.json` is the structured allowlist. Every
entry must include an owner, reason, expiry date and linked issue; expired or
incomplete entries fail the local check. The current allowlist is empty.

The same scan can be reproduced locally with the pinned multi-arch image digest:

```bash
npm run secret:scan
```

This runs `ghcr.io/gitleaks/gitleaks:v8.30.1@sha256:c00b6bd0aeb3071cbcb79009cb16a60dd9e0a7c60e2be9ab65d25e6bc8abbb7f`
over all reachable commits and writes `artifacts/security/gitleaks.json`.

## Security lint rules (FR-02)

`eslint.config.mjs` is a committed flat config with no remote configs. It uses
pinned `@babel/eslint-parser`, Babel presets and ESLint from `package-lock.json`;
`typescript-eslint` cannot be used while the project is on TypeScript 7, which
is outside its supported peer range. Custom rule IDs are stable and appear in
both JSON and SARIF output with file/line locations.

| Rule ID | Blocks |
| --- | --- |
| `plantjes/no-dangerous-html` | `dangerouslySetInnerHTML`, `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `iframe.srcdoc` |
| `plantjes/no-dynamic-code` | `eval`, `new Function`, string-valued `setTimeout`/`setInterval`, user-controlled timer arguments |
| `plantjes/no-dynamic-import` | `import()` with a non-literal module specifier |
| `plantjes/no-unsafe-navigation` | `javascript:`/`http(s)` URLs, remote `src`, external navigation, `target="_blank"` without `rel="noopener noreferrer"`, wildcard `postMessage` |

Rules distinguish static literals from user-controlled sources such as props,
state, URL/search/hash, event payloads, storage, clipboard, camera/gallery file
data and Capacitor bridge results. Static safe strings in markup sinks are
allowed. Any non-static `dangerouslySetInnerHTML` must be paired with a pinned
local sanitiser and an issue-linked justification; no such sanitiser is shipped
today, so new uses must add one first.

Suppressions are narrow comments with an owner, reason and expiry:

```ts
// plantjes-suppress plantjes/no-dynamic-code owner=maintainer reason="verified static" expires=2027-02-22
```

Expired suppressions fail CI. The initial baseline is empty, so every new
finding fails. Negative and positive fixtures live in
`tools/security-lint/fixtures/` and are asserted by the Vitest test in
`tools/security-lint/rules.test.mjs`. The rule config, fixture results and
suppression register are linked from [#14](https://github.com/Minprez-JP/Plantjes/issues/14)
and the mobile gates [#37](https://github.com/Minprez-JP/Plantjes/issues/37),
[#43](https://github.com/Minprez-JP/Plantjes/issues/43) and
[#48](https://github.com/Minprez-JP/Plantjes/issues/48); review them at the M1
and M2 gates whenever sanitisation or photo-input code changes.

## Requirement traceability

| Requirement | Issue | Current check |
| --- | --- | --- |
| FR-01 SAST | [#13](https://github.com/Minprez-JP/Plantjes/issues/13), [#24](https://github.com/Minprez-JP/Plantjes/issues/24) | Committed `codeql.yml` (pinned SHAs) + alert triage |
| FR-02 Security lint rules | [#14](https://github.com/Minprez-JP/Plantjes/issues/14) | Pinned flat config + fixtures + JSON/SARIF evidence |
| FR-03 SCA/SBOM/licences | [#15](https://github.com/Minprez-JP/Plantjes/issues/15) | Blocking audit + install baseline, pinned CycloneDX SBOMs, licence policy, generated notices |
| FR-04 Secret scanning | [#16](https://github.com/Minprez-JP/Plantjes/issues/16) | GitHub secret scanning + push protection; CI gitleaks pinned action and Docker-reproducible local scan |
| FR-05 CSP/asset integrity | [#17](https://github.com/Minprez-JP/Plantjes/issues/17) | Planned |
| FR-06 Fuzz/import tests | [#18](https://github.com/Minprez-JP/Plantjes/issues/18) | Planned |
| FR-07 Upload regression | [#19](https://github.com/Minprez-JP/Plantjes/issues/19) | Planned |
| FR-08 ZAP baseline | [#21](https://github.com/Minprez-JP/Plantjes/issues/21) | Planned |
| FR-09 No-egress test | [#20](https://github.com/Minprez-JP/Plantjes/issues/20) | Planned |
| FR-10 CI gates | [#22](https://github.com/Minprez-JP/Plantjes/issues/22) | Planned |
| FR-11 Board/metrics | [#11](https://github.com/Minprez-JP/Plantjes/issues/11), [#12](https://github.com/Minprez-JP/Plantjes/issues/12), [#25](https://github.com/Minprez-JP/Plantjes/issues/25), [#70](https://github.com/Minprez-JP/Plantjes/issues/70) | Board verified; metrics/SLA documented; quarterly review #70; triage workflow #25 |
| FR-12 Documentation | [#10](https://github.com/Minprez-JP/Plantjes/issues/10), [#23](https://github.com/Minprez-JP/Plantjes/issues/23) | This guide + linked documents |

## Security alert triage workflow

This is the process tracked by [#25](https://github.com/Minprez-JP/Plantjes/issues/25).

1. **Sources to review:** Dependabot alerts, code-scanning alerts, secret-scanning alerts, gitleaks CI results and the non-blocking full `npm audit` report.
2. **Cadence:** weekly triage; monthly check that Dependabot, CodeQL and secret scanning are enabled and producing results; quarterly threat-model and allowlist review.
3. **SLA:** High/Critical triaged within 7 days, Medium within 30 days, Low backlogged (from [#12](https://github.com/Minprez-JP/Plantjes/issues/12)).
4. **Every alert gets a linked `devSecops` project item** with the `security` label, an owner and the correct phase milestone. Move Status to `In Progress` while fixing and `Done` on closure.
5. **Decisions:** fix, risk-accept, or dismiss as false positive. A fix requires a regression test. A dismissal requires a written rationale, the rule/alert ID, an owner and an expiry/review date.
6. **Suppression log:** all suppressions and accepted risks are recorded below. The GitHub alert dismissal (reason, comment, owner and review date) is the source of truth for code-scanning alerts; a dated comment at the sink points readers to this log. ESLint rule suppressions use the `plantjes-suppress` comment format above and fail CI on expiry. Do not rely on `codeql[<rule-id>]` JSX comments alone.
7. **No unmitigated High/Critical finding remains open** when closing the related issue.

## Current suppressions and accepted risks

| Finding | Decision | Rationale | Owner / review |
| --- | --- | --- | --- |
| [Code scanning alert #1](https://github.com/Minprez-JP/Plantjes/security/code-scanning/1) — `js/xss-through-dom`, `PlantCard.tsx` | False positive | React escapes JSX attributes; `useObjectUrl` only returns opaque same-origin `blob:` URLs; `<img src>` cannot execute script. Resolved by PR #28; CodeQL marked the alert `fixed` after the sink rationale was added. | Maintainer / review by 2027-02-18 ([#24](https://github.com/Minprez-JP/Plantjes/issues/24)) |
| [Code scanning alert #2](https://github.com/Minprez-JP/Plantjes/security/code-scanning/2) — `js/xss-through-dom`, `PlantDialog.tsx` | False positive | Same path and rationale as above; guard added in `useObjectUrl`, regression test added, and CodeQL marked the alert `fixed` after PR #26. | Maintainer / review by 2027-02-18 ([#24](https://github.com/Minprez-JP/Plantjes/issues/24)) |
| [PR alert #3](https://github.com/Minprez-JP/Plantjes/security/code-scanning/3), [#4](https://github.com/Minprez-JP/Plantjes/security/code-scanning/4), [#5](https://github.com/Minprez-JP/Plantjes/security/code-scanning/5) — PR-only `js/xss-through-dom` findings | False positive | Same taint path on PR commits; dismissed with the same written rationale and review date. | Maintainer / review by 2027-02-18 ([#24](https://github.com/Minprez-JP/Plantjes/issues/24)) |
| None currently open | — | `security-policies/audit.json` has `acceptedAdvisories: []` and the 2026-11-23 full audit reports 0 vulnerabilities. The former dev-only `picomatch` ReDoS acceptance is retired because the advisory is no longer reported. | Maintainer / monthly triage ([#25](https://github.com/Minprez-JP/Plantjes/issues/25)) |

Security lint baseline: **empty** as of 2026-11-22 (46 files linted, 0 errors,
0 warnings). There are no active `plantjes-suppress` entries in `src/**`.

## Adding a new security check

- [ ] Add the FR/NFR ID to [requirements.md](./docs/security-testing/requirements.md).
- [ ] Create or update the linked issue on the `devSecops` board.
- [ ] Wire the check into `npm run security:check` and/or `ci.yml`.
- [ ] Add a deterministic fixture or test that proves the check fails on a known-bad input.
- [ ] Update this guide, the traceability table and the issue register.
