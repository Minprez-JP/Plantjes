import { describe, expect, it } from 'vitest'
import { TEXT_LIMITS } from '../constants'
import { hasStoredNote, normalizeNote, parseNote } from '../notes'

describe('normalizeNote', () => {
  it('trims outer whitespace and keeps inner line breaks', () => {
    expect(normalizeNote('  First line\nSecond line  ')).toBe('First line\nSecond line')
  })

  it('normalizes Windows and old Mac line endings', () => {
    expect(normalizeNote('One\r\nTwo\rThree')).toBe('One\nTwo\nThree')
  })
})

describe('hasStoredNote', () => {
  it.each([undefined, null, '', '   ', '\n\t'])('treats %j as empty', (note) => {
    expect(hasStoredNote(note)).toBe(false)
  })

  it('detects visible note content', () => {
    expect(hasStoredNote('Keep pinched')).toBe(true)
  })
})

describe('parseNote', () => {
  it('accepts a note up to the character limit', () => {
    const note = 'x'.repeat(TEXT_LIMITS.notes)
    expect(parseNote(note)).toEqual({ ok: true, note })
  })

  it('rejects a note above the character limit', () => {
    const result = parseNote('x'.repeat(TEXT_LIMITS.notes + 1))

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('Expected validation to fail')
    expect(result.error).toContain(String(TEXT_LIMITS.notes))
  })

  it('normalizes a submitted note', () => {
    expect(parseNote('  Remember\r\nthis  ')).toEqual({
      ok: true,
      note: 'Remember\nthis',
    })
  })
})
