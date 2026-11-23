import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { Linter } from 'eslint'
import { describe, expect, it } from 'vitest'
import { securityConfig } from '../../eslint.config.mjs'

function lintFixture(name) {
  const filename = fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url))
  const code = readFileSync(filename, 'utf8')
  const linter = new Linter()
  return linter.verify(code, [{ ...securityConfig, files: ['**/*.tsx'] }], { filename })
}

describe('plantjes security lint rules', () => {
  it('detects every forbidden sink in the negative fixture', () => {
    const messages = lintFixture('negative.tsx')
    const ruleIds = new Set(messages.map((message) => message.ruleId))

    expect(ruleIds).toContain('plantjes/no-dangerous-html')
    expect(ruleIds).toContain('plantjes/no-dynamic-code')
    expect(ruleIds).toContain('plantjes/no-dynamic-import')
    expect(ruleIds).toContain('plantjes/no-unsafe-navigation')

    for (const message of messages) {
      expect(message.ruleId).toMatch(/^plantjes\//)
      expect(message.line).toBeGreaterThan(0)
      expect(message.column).toBeGreaterThan(0)
    }

    expect(messages.some((message) => message.message.includes('expired'))).toBe(true)
  }, 60_000)

  it('accepts static values and a valid suppression in the positive fixture', () => {
    const messages = lintFixture('positive.tsx')
    expect(messages).toEqual([])
  }, 60_000)
})
