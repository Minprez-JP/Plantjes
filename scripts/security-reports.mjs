import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ESLint } from 'eslint'
import {
  npmArgs,
  outputDirectory,
  root,
  run,
  writeJson,
} from './security/common.mjs'

function script(name) {
  return resolve(root, 'scripts/security', name)
}

function runScript(name) {
  const result = run(process.execPath, [script(name)])
  if (result.status !== 0) {
    if (result.stderr) process.stderr.write(result.stderr)
    throw new Error(`${name} failed with exit code ${result.status}`)
  }
  return result
}

function auditJson(args) {
  const [command, commandArgs] = npmArgs(args)
  const result = run(command, commandArgs)
  if (!result.stdout) {
    throw new Error(`npm audit produced no JSON output: ${result.stderr || result.error}`)
  }
  return { result, report: JSON.parse(result.stdout) }
}

runScript('verify-install.mjs')
runScript('verify-ci-gates.mjs')

const prodAudit = auditJson(['audit', '--json', '--omit=dev'])
writeJson('npm-audit.json', prodAudit.report)

const allAudit = auditJson(['audit', '--json'])
writeJson('npm-audit-all.json', allAudit.report)

const eslint = new ESLint({
  cwd: root,
  overrideConfigFile: resolve(root, 'eslint.config.mjs'),
})
const results = await eslint.lintFiles(['src/**/*.{ts,tsx,js,jsx}'])
const jsonFormatter = await eslint.loadFormatter('json')
const sarifFormatter = await eslint.loadFormatter('@microsoft/eslint-formatter-sarif')

writeJson('security-lint.json', JSON.parse(await jsonFormatter.format(results)))
writeFileSync(
  resolve(outputDirectory, 'security-lint.sarif'),
  await sarifFormatter.format(results),
)

runScript('generate-sbom.mjs')
runScript('generate-licences.mjs')
runScript('verify-audit-policy.mjs')

const errors = results.reduce((total, result) => total + result.errorCount, 0)
const warnings = results.reduce((total, result) => total + result.warningCount, 0)
const versions = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).devDependencies

const summary = {
  generatedAt: new Date().toISOString(),
  auditVulnerabilities: prodAudit.report.metadata?.vulnerabilities ?? null,
  allAuditVulnerabilities: allAudit.report.metadata?.vulnerabilities ?? null,
  filesLinted: results.length,
  lintErrors: errors,
  lintWarnings: warnings,
  generators: {
    cyclonedxNpm: '@cyclonedx/cyclonedx-npm@' + versions['@cyclonedx/cyclonedx-npm'],
    eslint: 'eslint@' + versions.eslint,
    eslintSarifFormatter: '@microsoft/eslint-formatter-sarif@' + versions['@microsoft/eslint-formatter-sarif'],
  },
  artifacts: [
    'install-integrity.json',
    'ci-gates.json',
    'npm-audit.json',
    'npm-audit-all.json',
    'audit-policy.json',
    'security-lint.json',
    'security-lint.sarif',
    'sbom-index.json',
    'licence-inventory.json',
    'licence-inventory.md',
    'THIRD_PARTY_NOTICES.generated.md',
  ],
}
writeJson('summary.json', summary)

console.log(`Security reports written to ${outputDirectory}`)
if (prodAudit.result.status !== 0 || errors > 0 || warnings > 0) process.exitCode = 1
