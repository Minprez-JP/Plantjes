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
2. `npm test` — unit, component and security regression tests.
3. `npm run build` — type-check and production bundle.

To report development-only advisories without failing the command:

```bash
npm audit --audit-level=high
```

## CI and enabled GitHub security features

| Control | Implementation | Blocking? |
| --- | --- | --- |
| Runtime dependency audit | `ci.yml`: `npm audit --audit-level=high --omit=dev` | Yes |
| Dev dependency advisories | `ci.yml`: `npm audit --audit-level=high \|\| true` | No (reported) |
| Tests and build | `npm test`, `npm run build` | Yes |
| SAST | CodeQL default setup (`dynamic/github-code-scanning/codeql`), JavaScript/TypeScript + Actions | Findings triaged via Security tab |
| Dependency updates | Dependabot: npm (minor/patch grouped), GitHub Actions (weekly) | PR-based review |
| Secret scanning | Enabled with push protection (provider patterns); alerts endpoint reachable. Non-provider patterns and validity checks remained disabled via API for this public repository. CI gitleaks check still tracked in [#16](https://github.com/Minprez-JP/Plantjes/issues/16) | — |

## Requirement traceability

| Requirement | Issue | Current check |
| --- | --- | --- |
| FR-01 SAST | [#13](https://github.com/Minprez-JP/Plantjes/issues/13), [#24](https://github.com/Minprez-JP/Plantjes/issues/24) | CodeQL default setup + alert triage |
| FR-02 Security lint rules | [#14](https://github.com/Minprez-JP/Plantjes/issues/14) | Planned |
| FR-03 SCA/SBOM/licences | [#15](https://github.com/Minprez-JP/Plantjes/issues/15) | `npm audit` gate active; SBOM/licences planned |
| FR-04 Secret scanning | [#16](https://github.com/Minprez-JP/Plantjes/issues/16) | GitHub secret scanning + push protection enabled; CI gitleaks still open |
| FR-05 CSP/asset integrity | [#17](https://github.com/Minprez-JP/Plantjes/issues/17) | Planned |
| FR-06 Fuzz/import tests | [#18](https://github.com/Minprez-JP/Plantjes/issues/18) | Planned |
| FR-07 Upload regression | [#19](https://github.com/Minprez-JP/Plantjes/issues/19) | Planned |
| FR-08 ZAP baseline | [#21](https://github.com/Minprez-JP/Plantjes/issues/21) | Planned |
| FR-09 No-egress test | [#20](https://github.com/Minprez-JP/Plantjes/issues/20) | Planned |
| FR-10 CI gates | [#22](https://github.com/Minprez-JP/Plantjes/issues/22) | Planned |
| FR-11 Board/metrics | [#11](https://github.com/Minprez-JP/Plantjes/issues/11), [#12](https://github.com/Minprez-JP/Plantjes/issues/12), [#25](https://github.com/Minprez-JP/Plantjes/issues/25) | Board configured; triage workflow tracked |
| FR-12 Documentation | [#10](https://github.com/Minprez-JP/Plantjes/issues/10), [#23](https://github.com/Minprez-JP/Plantjes/issues/23) | This guide + linked documents |

## Security alert triage workflow

This is the process tracked by [#25](https://github.com/Minprez-JP/Plantjes/issues/25).

1. **Sources to review:** Dependabot alerts, code-scanning alerts, secret-scanning alerts (once enabled), and the non-blocking `npm audit` report.
2. **Cadence:** weekly triage; monthly check that Dependabot, CodeQL and secret scanning are enabled and producing results; quarterly threat-model and allowlist review.
3. **SLA:** High/Critical triaged within 7 days, Medium within 30 days, Low backlogged (from [#12](https://github.com/Minprez-JP/Plantjes/issues/12)).
4. **Every alert gets a linked `devSecops` project item** with the `security` label, an owner and the correct phase milestone. Move Status to `In Progress` while fixing and `Done` on closure.
5. **Decisions:** fix, risk-accept, or dismiss as false positive. A fix requires a regression test. A dismissal requires a written rationale, the rule/alert ID, an owner and an expiry/review date.
6. **Suppression log:** all suppressions and accepted risks are recorded below. In-source CodeQL suppressions must use `codeql[<rule-id>]` on the line immediately before the flagged line and include the same rationale and review date.
7. **No unmitigated High/Critical finding remains open** when closing the related issue.

## Current suppressions and accepted risks

| Finding | Decision | Rationale | Owner / review |
| --- | --- | --- | --- |
| [Code scanning alert #1](https://github.com/Minprez-JP/Plantjes/security/code-scanning/1) — `js/xss-through-dom`, `PlantCard.tsx` | False positive | React escapes JSX attributes; `useObjectUrl` only returns opaque same-origin `blob:` URLs; `<img src>` cannot execute script. Suppressed in source with a dated comment. | Maintainer / review by 2027-02-18 ([#24](https://github.com/Minprez-JP/Plantjes/issues/24)) |
| [Code scanning alert #2](https://github.com/Minprez-JP/Plantjes/security/code-scanning/2) — `js/xss-through-dom`, `PlantDialog.tsx` | False positive | Same path and rationale as above; guard added in `useObjectUrl` and regression test added. | Maintainer / review by 2027-02-18 ([#24](https://github.com/Minprez-JP/Plantjes/issues/24)) |
| [GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf) — `picomatch` ReDoS | Accepted risk (dev-only) | Affects test tooling only; no patched version exists as of 2026-11-18. Runtime dependency audit is clean and blocking; full audit is reported non-blocking. | Maintainer / review monthly until patched ([#15](https://github.com/Minprez-JP/Plantjes/issues/15), [#25](https://github.com/Minprez-JP/Plantjes/issues/25)) |

## Adding a new security check

- [ ] Add the FR/NFR ID to [requirements.md](./docs/security-testing/requirements.md).
- [ ] Create or update the linked issue on the `devSecops` board.
- [ ] Wire the check into `npm run security:check` and/or `ci.yml`.
- [ ] Add a deterministic fixture or test that proves the check fails on a known-bad input.
- [ ] Update this guide, the traceability table and the issue register.
