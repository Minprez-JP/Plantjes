import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ESLint } from 'eslint'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputDirectory = resolve(root, 'artifacts/security')
mkdirSync(outputDirectory, { recursive: true })

const auditCommand =
  process.platform === 'win32' ? 'npm.cmd audit --json --omit=dev' : 'npm audit --json --omit=dev'
const audit = spawnSync(auditCommand, {
  cwd: root,
  encoding: 'utf8',
  shell: true,
})
if (!audit.stdout) {
  throw new Error(`npm audit produced no JSON output: ${audit.stderr || audit.error}`)
}

const auditReport = JSON.parse(audit.stdout)
writeFileSync(
  resolve(outputDirectory, 'npm-audit.json'),
  `${JSON.stringify(auditReport, null, 2)}\n`,
)

const eslint = new ESLint({
  cwd: root,
  overrideConfigFile: resolve(root, 'eslint.config.mjs'),
})
const results = await eslint.lintFiles(['src/**/*.{ts,tsx,js,jsx}'])
const jsonFormatter = await eslint.loadFormatter('json')
const sarifFormatter = await eslint.loadFormatter('@microsoft/eslint-formatter-sarif')

writeFileSync(resolve(outputDirectory, 'security-lint.json'), await jsonFormatter.format(results))
writeFileSync(resolve(outputDirectory, 'security-lint.sarif'), await sarifFormatter.format(results))

const errors = results.reduce((total, result) => total + result.errorCount, 0)
const warnings = results.reduce((total, result) => total + result.warningCount, 0)
const summary = {
  generatedAt: new Date().toISOString(),
  auditVulnerabilities: auditReport.metadata?.vulnerabilities ?? null,
  filesLinted: results.length,
  lintErrors: errors,
  lintWarnings: warnings,
}
writeFileSync(
  resolve(outputDirectory, 'summary.json'),
  `${JSON.stringify(summary, null, 2)}\n`,
)

console.log(`Security reports written to ${outputDirectory}`)
if (audit.status !== 0 || errors > 0 || warnings > 0) process.exitCode = 1
