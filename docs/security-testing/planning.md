# Security Testing Delivery Plan — Plantjes / `devSecops`

## 1. Delivery overview

| Phase | Milestone | Issues | Outcome |
| --- | --- | --- | --- |
| 0 — Foundation | Phase 0 - Foundation | #9 (epic), #10, #11, #12 | Documented scope, configured board, metrics/SLA and review cadence |
| 1 — Static & Supply Chain | Phase 1 - Static and Supply Chain | #13, #14, #15, #16, #24 | Automated SAST, security lint, SBOM/licences, secret scanning and CodeQL alert triage |
| 2 — Dynamic & Input Testing | Phase 2 - Dynamic and Input Testing | #17, #18, #19, #20, #21 | CSP/asset integrity, fuzz, upload, no-egress and ZAP evidence |
| 3 — Governance & Handover | Phase 3 - Governance and Handover | #22, #23, #25 | Non-bypassable CI gates, maintainer runbook and recurring alert triage |

Board: https://github.com/users/Minprez-JP/projects/2 — all 17 items are attached with **Status: Todo**.
Repository: https://github.com/Minprez-JP/Plantjes

## 2. Sequencing and dependencies

1. **#11 board setup** should be closed first; every other issue already references the board, label and milestones.
2. **#10 scope doc** and **#12 metrics/SLA** define the vocabulary used by the reporting and runbook issues.
3. **#13 SAST** establishes the SARIF upload pattern that **#22 CI gates** will make mandatory.
4. **#15 SBOM/licences** and **#16 secrets** are independent of SAST and can run in parallel with #13/#14.
5. **#17 CSP test**, **#18 fuzz**, **#19 uploads**, **#20 no-egress** and **#21 ZAP** depend only on the existing production build; they can be parallelised after Phase 1 baselines are triaged.
6. **#22 CI gates** comes after the security workflows exist so it can require their exact check names.
7. **#23 runbook** is last so it documents the final tool set and commands.

## 3. Estimated effort

| Issue | Estimate | Priority | Notes |
| --- | --- | --- | --- |
| #9 epic | — | P0 | Tracking only |
| #10 | 0.5 day | P1 | Documentation |
| #11 | 0.5 day | P1 | Mostly already satisfied by creation step |
| #12 | 0.5 day | P2 | Policy definition |
| #13 | 1–2 days | P0 | CodeQL/Semgrep workflow + triage |
| #14 | 0.5–1 day | P1 | Lint config + negative fixture |
| #15 | 1 day | P0 | CycloneDX + licence allowlist |
| #16 | 0.5 day | P1 | Repo settings + gitleaks CI |
| #17 | 1 day | P0 | Build-output assertions |
| #18 | 1.5–2 days | P0 | Property/fuzz harness |
| #19 | 1 day | P1 | Upload edge cases |
| #20 | 1 day | P1 | Browser-level network capture |
| #21 | 1 day | P2 | ZAP baseline + risk acceptance |
| #22 | 0.5 day | P0 | Ruleset + action pin audit |
| #23 | 0.5 day | P2 | Runbook and docs links |

Total: roughly **11–14 working days**, with Phase 1 and Phase 2 parallelisable.

## 4. Quality gates

- Every issue must include acceptance criteria evidence (report, screenshot, workflow file, or test output) in its PR or closing comment.
- No High/Critical finding may be closed without a linked fix or a risk acceptance containing an owner and expiry date.
- All new tooling stays in `devDependencies`/CI; no new runtime dependency may be added to the shipped bundle.
- CI security jobs must remain within the existing 15-minute per-job timeout and use least-privilege permissions.
- The `security` label and correct milestone must remain on every item.

## 5. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Alert fatigue from SAST/ZAP false positives | Suppression log with reason/owner/expiry, reviewed quarterly (#12, #23) |
| Tooling breaks strict CSP or adds remote assets | Asset-integrity and no-egress tests (#17, #20) are mandatory gates |
| CI time grows beyond budget | Cache tool binaries, limit ZAP baseline scope, keep jobs parallel (#21, NFR-01) |
| Personal project loses momentum | Small phases, each independently valuable; board Status tracks progress |
| ZAP/Node tooling drifts | Dependabot groups updates; pinned action SHAs; quarterly tool review (#12) |

## 6. Review cadence

- **Per PR:** security checklist from `SECURITY.md` plus required security status checks.
- **Per release:** attach SBOM, licence report and security scan summary to release notes.
- **Quarterly:** revisit threat model, suppression/allowlist expiry, tool versions and metrics (#12).

## 7. Security alert review (2026-11-18)

- **Dependabot:** security updates enabled; 0 open and 0 historical Dependabot alerts.
- **Code scanning:** CodeQL default setup active (`dynamic/github-code-scanning/codeql`) for JavaScript/TypeScript and Actions. Two open `js/xss-through-dom` alerts (#1, #2), both traced from `event.target.files?.[0]` through `URL.createObjectURL` into React `<img src>`. Likely a CodeQL false positive given React escaping and opaque `blob:` URLs, but it requires documented triage — tracked in #24.
- **Secret scanning:** disabled. The alerts endpoint returns HTTP 404 and `security_and_analysis` shows secret scanning, push protection, non-provider patterns and validity checks all disabled. Confirmed in #16.
- **New tasks:** #24 (triage/resolve the two CodeQL alerts, Phase 1) and #25 (recurring security-alert triage workflow, Phase 3). Existing #13 and #16 were updated with the current state instead of duplicating them.

## 8. Current status

- Scope, requirements, planning and issue register written to `C:\Users\marck\.opencode\plan`.
- `security` label and four phase milestones created in `Minprez-JP/Plantjes`.
- Epic #9 and child issues #10–#25 created, labelled, milestoned and added to the `devSecops` board with Status **Todo**.
- No application source files were modified; implementation requires switching out of Plan mode.
