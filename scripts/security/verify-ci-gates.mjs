import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { writeJson } from './common.mjs'

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const fullSha = /^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)+@[0-9a-f]{40}$/
const reviewRiskId = 'no-required-review'
const requiredChecks = [
  'Audit, test, and build',
  'Browser no-egress',
  'ZAP baseline',
  'gitleaks',
  'Analyze (actions)',
  'Analyze (javascript-typescript)',
]

export function verifyPinnedActions(text, label) {
  const uses = [...text.matchAll(/^\s*(?:-\s*)?uses:\s*["']?([^"'\s#]+)/gm)].map((match) => match[1])
  return uses
    .filter((value) => !value.startsWith('./') && !fullSha.test(value))
    .map((value) => `${label}: action ${value} is not pinned to a full 40-character SHA`)
}

export function parsePermissions(lines, indent) {
  const pattern = new RegExp(`^ {${indent}}permissions:\\s*(.*)$`)
  const index = lines.findIndex((line) => pattern.test(line))
  if (index < 0) return null

  const inline = lines[index].match(pattern)[1].trim()
  if (inline === '{}') return {}
  if (inline) return { __raw: inline }

  const permissions = {}
  for (let position = index + 1; position < lines.length; position += 1) {
    const line = lines[position]
    if (!line.trim()) continue
    if (line.match(/^ */)[0].length <= indent) break
    const entry = line.trim().match(/^([A-Za-z0-9_-]+):\s*(.+)$/)
    if (entry) permissions[entry[1]] = entry[2].trim()
  }
  return permissions
}

export function parseJobs(text) {
  const lines = text.split(/\r?\n/)
  const jobs = []
  let inJobs = false

  for (const line of lines) {
    if (/^jobs:\s*$/.test(line)) {
      inJobs = true
      continue
    }
    if (!inJobs) continue
    if (/^\S/.test(line)) break

    const job = line.match(/^ {2}([A-Za-z0-9_-]+):\s*$/)
    if (job) {
      jobs.push({ id: job[1], lines: [] })
      continue
    }
    if (jobs.length) jobs[jobs.length - 1].lines.push(line)
  }

  return jobs
}

export function verifyWorkflow(text, label) {
  const errors = verifyPinnedActions(text, label)
  const jobSection = text.search(/^jobs:\s*$/m)
  const header = jobSection < 0 ? text : text.slice(0, jobSection)
  const topLevel = parsePermissions(header.split(/\r?\n/), 0)

  if (!topLevel || Object.keys(topLevel).length !== 1 || topLevel.contents !== 'read') {
    errors.push(`${label}: top-level permissions must be contents: read`)
  }

  for (const job of parseJobs(text)) {
    const permissions = parsePermissions(job.lines, 4)
    if (!permissions) continue

    const uploadsSarif = job.lines.some((line) => /codeql-action\/(analyze|upload-sarif)@/.test(line))
    if (permissions.contents !== 'read') {
      errors.push(`${label}: job ${job.id} must grant contents: read`)
    }
    for (const [scope, access] of Object.entries(permissions)) {
      if (scope === 'contents') continue
      if (scope === 'security-events' && access === 'write' && uploadsSarif) continue
      errors.push(`${label}: job ${job.id} grants unexpected ${scope}: ${access}`)
    }
    if (uploadsSarif && permissions['security-events'] !== 'write') {
      errors.push(`${label}: SARIF job ${job.id} must grant security-events: write`)
    }
  }

  return errors
}

export function validateRiskAcceptance(document, now = new Date()) {
  const errors = []
  if (!document || document.version !== 1 || !Array.isArray(document.entries)) {
    return ['CI gate risk acceptance file must be an object with version 1 and an entries array']
  }

  document.entries.forEach((entry, index) => {
    const label = `CI gate risk acceptance entry ${index + 1}`
    for (const field of ['id', 'owner', 'reason', 'issue', 'expires']) {
      if (typeof entry?.[field] !== 'string' || !entry[field].trim()) {
        errors.push(`${label} is missing ${field}`)
      }
    }
    const expires = Date.parse(`${entry?.expires}T00:00:00Z`)
    if (Number.isNaN(expires)) {
      errors.push(`${label} has an invalid expires date ${entry.expires}`)
    } else if (expires < Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) {
      errors.push(`${label} expired on ${entry.expires} and must be reviewed`)
    }
  })

  return errors
}

export function verifyRuleset(ruleset, riskAcceptance = { entries: [] }) {
  const errors = []
  if (ruleset.enforcement !== 'active') errors.push('Ruleset enforcement must be active')
  if (!Array.isArray(ruleset.bypass_actors) || ruleset.bypass_actors.length) {
    errors.push('Ruleset must have no bypass actors')
  }

  const rules = Object.fromEntries((ruleset.rules ?? []).map((rule) => [rule.type, rule]))
  for (const type of ['deletion', 'non_fast_forward', 'required_linear_history', 'pull_request']) {
    if (!rules[type]) errors.push(`Ruleset must include the ${type} rule`)
  }

  const pullRequest = rules.pull_request?.parameters ?? {}
  const reviewRequired = pullRequest.required_approving_review_count >= 1
  const reviewAcceptance = riskAcceptance.entries?.some((entry) => entry.id === reviewRiskId)
  if (reviewRequired) {
    if (pullRequest.require_last_push_approval !== true) {
      errors.push('Pull requests must require approval of the last push')
    }
    if (pullRequest.dismiss_stale_reviews_on_push !== true) {
      errors.push('Pull requests must dismiss stale reviews on push')
    }
    if (reviewAcceptance) {
      errors.push('Review risk acceptance is stale because required reviews are enabled')
    }
  } else if (!reviewAcceptance) {
    errors.push(
      'Pull requests must require at least one approving review or record the documented single-maintainer risk acceptance',
    )
  }
  const mergeMethods = pullRequest.allowed_merge_methods ?? []
  if (!mergeMethods.includes('squash') || !mergeMethods.includes('rebase') || mergeMethods.includes('merge')) {
    errors.push('Pull requests must allow only squash and rebase merges')
  }

  const checks = rules.required_status_checks?.parameters ?? {}
  if (checks.do_not_enforce_on_create !== false) {
    errors.push('Required checks must also apply when the branch is created')
  }
  if (checks.strict_required_status_checks_policy !== true) {
    errors.push('Required checks must be up to date before merge')
  }
  const contexts = new Set((checks.required_status_checks ?? []).map((check) => check.context))
  for (const context of requiredChecks) {
    if (!contexts.has(context)) errors.push(`Ruleset must require the ${context} check`)
  }

  return errors
}

export function verifyRepository(rootDirectory = root) {
  const errors = []
  const workflowDirectory = resolve(rootDirectory, '.github/workflows')
  const workflowFiles = readdirSync(workflowDirectory)
    .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
    .sort()

  if (!workflowFiles.length) errors.push('No workflow files found')
  for (const name of workflowFiles) {
    const label = `.github/workflows/${name}`
    errors.push(...verifyWorkflow(readFileSync(resolve(workflowDirectory, name), 'utf8'), label))
  }

  let ruleset = { rules: [] }
  try {
    ruleset = JSON.parse(readFileSync(resolve(rootDirectory, '.github/rulesets/main-branch.json'), 'utf8'))
  } catch (error) {
    errors.push(`.github/rulesets/main-branch.json could not be read: ${error.message}`)
  }

  try {
    const riskAcceptance = JSON.parse(readFileSync(resolve(rootDirectory, 'security-policies/ci-gate-risk-acceptance.json'), 'utf8'))
    errors.push(...validateRiskAcceptance(riskAcceptance))
    errors.push(...verifyRuleset(ruleset, riskAcceptance))
  } catch (error) {
    errors.push(`security-policies/ci-gate-risk-acceptance.json could not be read: ${error.message}`)
    errors.push(...verifyRuleset(ruleset))
  }

  return { errors, workflowFiles }
}

function main() {
  const { errors, workflowFiles } = verifyRepository()
  writeJson('ci-gates.json', {
    generatedAt: new Date().toISOString(),
    workflowFiles,
    requiredChecks,
    errors,
  })
  if (errors.length) {
    for (const error of errors) console.error(`ERROR: ${error}`)
    process.exitCode = 1
    return
  }
  console.log(
    `CI gate verification passed: ${workflowFiles.length} workflow(s), full-SHA actions, ` +
    'least-privilege permissions, branch ruleset with required security checks and pull requests, ' +
    'and the documented single-maintainer review risk acceptance.',
  )
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : ''
if (invokedPath === fileURLToPath(import.meta.url)) main()
