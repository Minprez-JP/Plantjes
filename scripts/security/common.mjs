import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
export const outputDirectory = resolve(root, 'artifacts/security')

mkdirSync(outputDirectory, { recursive: true })

export function run(command, args, options = {}) {
  // Windows .cmd shims need a shell; executables with spaces in their path do not.
  const needsShell = /\.cmd$|\.bat$/i.test(command)
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    shell: options.shell ?? needsShell,
    ...options,
  })
  if (result.error) throw result.error
  return result
}

export function npmArgs(args) {
  return [process.platform === 'win32' ? 'npm.cmd' : 'npm', args]
}

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

export function writeJson(name, value) {
  writeFileSync(resolve(outputDirectory, name), `${JSON.stringify(value, null, 2)}\n`)
}

export function writeText(name, value) {
  writeFileSync(resolve(outputDirectory, name), value)
}

export function git(args) {
  return run('git', args)
}

export function commitSha() {
  const fromEnv = process.env.GITHUB_SHA
  if (fromEnv && /^[0-9a-f]{40}$/i.test(fromEnv)) return fromEnv
  const result = git(['rev-parse', 'HEAD'])
  if (result.status !== 0) throw new Error(`git rev-parse failed: ${result.stderr}`)
  return result.stdout.trim()
}

export function shortCommitSha(sha = commitSha()) {
  return sha.slice(0, 12)
}
