import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { outputDirectory, root, run, writeJson } from './security/common.mjs'

const image = 'ghcr.io/gitleaks/gitleaks:v8.30.1@sha256:c00b6bd0aeb3071cbcb79009cb16a60dd9e0a7c60e2be9ab65d25e6bc8abbb7f'
const allowlist = JSON.parse(readFileSync(resolve(root, 'security-policies/secret-scan-allowlist.json'), 'utf8'))
const today = new Date()

const invalid = (allowlist.entries ?? []).filter((entry) => {
  const required = ['owner', 'reason', 'expiry', 'linkedIssue']
  if (required.some((field) => !entry[field])) return true
  const expiry = new Date(`${entry.expiry}T23:59:59Z`)
  return Number.isNaN(expiry.valueOf()) || expiry < today
})
if (invalid.length) {
  throw new Error(`Invalid gitleaks allowlist entries:\n${JSON.stringify(invalid, null, 2)}`)
}

const version = run('docker', ['--version'], { shell: false })
if (version.status !== 0) {
  throw new Error('Docker is required for npm run secret:scan. Use the pinned CI action if Docker is unavailable.')
}

const hostRoot = root.replaceAll('\\', '/')
const reportPath = 'artifacts/security/gitleaks.json'
const result = run(
  'docker',
  [
    'run',
    '--rm',
    '--init',
    '-v',
    `${hostRoot}:/repo`,
    '-w',
    '/repo',
    image,
    'git',
    '--config',
    '.gitleaks.toml',
    '--redact',
    '--no-banner',
    '--report-format',
    'json',
    '--report-path',
    reportPath,
    '.',
  ],
  { shell: false },
)

const findingsPath = resolve(outputDirectory, 'gitleaks.json')
const findings = existsSync(findingsPath) ? JSON.parse(readFileSync(findingsPath, 'utf8')) : []
writeJson('secret-scan.json', {
  generatedAt: new Date().toISOString(),
  image,
  allowlistEntries: (allowlist.entries ?? []).length,
  findings: findings.length,
  exitCode: result.status,
})

if (result.status !== 0 || findings.length) {
  if (result.stderr) process.stderr.write(result.stderr)
  throw new Error(`gitleaks found ${findings.length} finding(s); see artifacts/security/gitleaks.json`)
}
console.log(`gitleaks scan passed with ${(allowlist.entries ?? []).length} reviewed allowlist entries`)
