import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { npmArgs, root, run, writeJson } from './common.mjs'

const lockPath = resolve(root, 'package-lock.json')
const hiddenLockPath = resolve(root, 'node_modules/.package-lock.json')

const lock = JSON.parse(readFileSync(lockPath, 'utf8'))

const lockedPackages = Object.keys(lock.packages ?? {}).filter((path) => path !== '')

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
for (const issue of hiddenLockIssues) failures.push(issue)

const report = {
  generatedAt: new Date().toISOString(),
  sourceOfTruth: 'package-lock.json',
  actual: {
    lockfileVersion: lock.lockfileVersion ?? null,
    packageCount: lockedPackages.length,
  },
  toolchain,
  hiddenLockfilePresent: Boolean(hiddenLock),
  lockfileUnchanged,
  failures,
}
writeJson('install-integrity.json', report)

if (failures.length) {
  throw new Error(`Install integrity check failed:\n${failures.join('\n')}`)
}
console.log(
  `Install verified with node ${toolchain.node} / npm ${toolchain.npm}; ${lockedPackages.length} packages locked in package-lock.json`,
)
