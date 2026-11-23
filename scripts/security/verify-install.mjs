import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  npmArgs,
  outputDirectory,
  root,
  run,
  sha256,
  writeJson,
} from './common.mjs'

const lockPath = resolve(root, 'package-lock.json')
const hiddenLockPath = resolve(root, 'node_modules/.package-lock.json')
const baselinePath = resolve(root, 'security-baselines/install.json')

const lockRaw = readFileSync(lockPath)
const lock = JSON.parse(lockRaw.toString('utf8'))
const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'))

const packageList = Object.entries(lock.packages ?? {})
  .filter(([path]) => path !== '')
  .map(([path, value]) => `${path}@${value.version}`)
  .sort()

const actual = {
  // Git stores LF on every platform; normalise Windows checkouts before hashing.
  lockfileSha256: sha256(lockRaw.toString('utf8').replace(/\r\n/g, '\n')),
  packageListSha256: sha256(`${packageList.join('\n')}\n`),
  packageCount: packageList.length,
}

const hiddenLock = existsSync(hiddenLockPath)
  ? JSON.parse(readFileSync(hiddenLockPath, 'utf8'))
  : null
const hiddenLockIssues = []
if (!hiddenLock) {
  hiddenLockIssues.push('node_modules/.package-lock.json is missing; run npm ci')
} else {
  if (hiddenLock.name !== lock.name || hiddenLock.version !== lock.version) {
    hiddenLockIssues.push('hidden lockfile root name/version does not match package-lock.json')
  }
  for (const [path, meta] of Object.entries(lock.packages ?? {})) {
    if (!path) continue
    const installed = hiddenLock.packages?.[path]
    if (!installed) {
      if (!meta.optional && !meta.peer && !meta.dev) hiddenLockIssues.push(`missing installed package ${path}`)
      continue
    }
    if (installed.version !== meta.version) hiddenLockIssues.push(`version mismatch for ${path}`)
    if (installed.integrity && meta.integrity && installed.integrity !== meta.integrity) {
      hiddenLockIssues.push(`integrity mismatch for ${path}`)
    }
  }
}

const diff = run('git', ['diff', '--quiet', '--', 'package-lock.json'])
const lockfileUnchanged = diff.status === 0
if (diff.status > 1) hiddenLockIssues.push(`git diff failed: ${diff.stderr.trim()}`)

const npmVersion = run(...npmArgs(['--version'])).stdout.trim()
const toolchain = { node: process.version, npm: npmVersion }

const failures = []
if (!lockfileUnchanged) failures.push('package-lock.json changed after install')
if (actual.lockfileSha256 !== baseline.lockfileSha256) failures.push('lockfile SHA-256 does not match the reviewed baseline')
if (actual.packageListSha256 !== baseline.packageListSha256) failures.push('sorted package-list SHA-256 does not match the reviewed baseline')
for (const issue of hiddenLockIssues) failures.push(issue)

const report = {
  generatedAt: new Date().toISOString(),
  baseline: 'security-baselines/install.json',
  canonicalization: 'package-lock.json CRLF sequences are normalized to LF before hashing',
  expected: {
    lockfileSha256: baseline.lockfileSha256,
    packageListSha256: baseline.packageListSha256,
    packageCount: baseline.packageCount,
  },
  actual,
  toolchain,
  hiddenLockfilePresent: Boolean(hiddenLock),
  lockfileUnchanged,
  failures,
}
writeJson('install-integrity.json', report)

if (failures.length) {
  throw new Error(`Reproducible install check failed:\n${failures.join('\n')}`)
}
console.log(
  `Install verified with node ${toolchain.node} / npm ${toolchain.npm}; lockfile ${actual.lockfileSha256}`,
)
