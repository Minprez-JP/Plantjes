import { TEXT_LIMITS } from './constants'

const NOTE_LIMIT_ERROR = `Notes must be ${TEXT_LIMITS.notes} characters or fewer.`

/** Normalizes line endings and trims outer whitespace while keeping inner breaks. */
export function normalizeNote(raw: string): string {
  return raw.replace(/\r\n?/g, '\n').trim()
}

/** True when a stored note has visible content. */
export function hasStoredNote(note: string | null | undefined): boolean {
  return Boolean(note?.trim())
}

export type ParsedNote =
  | { ok: true; note: string }
  | { ok: false; error: string }

/** Validates and normalizes a note submitted from the note dialog. */
export function parseNote(raw: string): ParsedNote {
  const note = normalizeNote(raw)
  if (note.length > TEXT_LIMITS.notes) {
    return { ok: false, error: NOTE_LIMIT_ERROR }
  }
  return { ok: true, note }
}
