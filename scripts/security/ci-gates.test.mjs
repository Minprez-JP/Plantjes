// @vitest-environment node
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { validateRiskAcceptance, verifyPinnedActions, verifyRuleset, verifyWorkflow } from './verify-ci-gates.mjs'

const sha = 'a'.repeat(40)
const workflow = `name: Test
permissions:
  contents: read
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@${sha}
  scan:
    permissions:
      contents: read
      security-events: write
    steps:
      - uses: github/codeql-action/analyze@${sha}
`

function readJson(relativePath) {
  return JSON.parse(readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8'))
}

const committedRuleset = () => readJson('../../.github/rulesets/main-branch.json')
const committedAcceptance = () => readJson('../../security-policies/ci-gate-risk-acceptance.json')

describe('CI gate verification', () => {
  it('accepts full-SHA actions and least-privilege permissions', () => {
    expect(verifyWorkflow(workflow, 'test.yml')).toEqual([])
  })

  it('rejects mutable action refs', () => {
    expect(verifyPinnedActions('uses: actions/checkout@v7', 'test.yml')).toEqual([
      `test.yml: action actions/checkout@v7 is not pinned to a full 40-character SHA`,
    ])
  })

  it('rejects permissions beyond contents: read and SARIF upload', () => {
    const errors = verifyWorkflow(workflow.replace('contents: read\n      security-events: write', 'contents: read\n      pull-requests: read'), 'test.yml')

    expect(errors).toContain('test.yml: job scan grants unexpected pull-requests: read')
    expect(errors).toContain('test.yml: SARIF job scan must grant security-events: write')
  })

  it('accepts the committed ruleset with its documented review risk acceptance', () => {
    expect(verifyRuleset(committedRuleset(), committedAcceptance())).toEqual([])
  })

  it('rejects missing reviews without an acceptance and missing required checks', () => {
    const ruleset = committedRuleset()
    ruleset.rules.find((rule) => rule.type === 'required_status_checks').parameters.required_status_checks = []

    const errors = verifyRuleset(ruleset, { entries: [] })

    expect(errors).toContain(
      'Pull requests must require at least one approving review or record the documented single-maintainer risk acceptance',
    )
    expect(errors).toContain('Ruleset must require the Audit, test, and build check')
    expect(errors).toContain('Ruleset must require the ZAP baseline check')
  })

  it('accepts enforced reviews when a second maintainer is added', () => {
    const ruleset = committedRuleset()
    const parameters = ruleset.rules.find((rule) => rule.type === 'pull_request').parameters
    parameters.required_approving_review_count = 1
    parameters.require_last_push_approval = true
    parameters.dismiss_stale_reviews_on_push = true

    expect(verifyRuleset(ruleset, { entries: [] })).toEqual([])
  })

  it('rejects expired or incomplete review risk acceptances', () => {
    const acceptance = committedAcceptance()
    acceptance.entries[0].owner = ''
    acceptance.entries[0].expires = '2026-11-22'

    const errors = validateRiskAcceptance(acceptance, new Date('2026-11-23T00:00:00Z'))

    expect(errors).toContain('CI gate risk acceptance entry 1 is missing owner')
    expect(errors).toContain('CI gate risk acceptance entry 1 expired on 2026-11-22 and must be reviewed')
  })
})
