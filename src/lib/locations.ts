import type { PlantLocation } from '../db'
import { TEXT_LIMITS } from './constants'

/**
 * A location's display name is trimmed and its internal whitespace collapsed.
 * The comparison key is additionally NFKC-normalized and lowercased, so
 * `Kitchen`, ` kitchen `, and full-width `Ｋitchen` all resolve to one entry.
 */
export interface NormalizedLocationName {
  name: string
  normalizedName: string
}

export type LocationValidation =
  | { ok: true; name: string; normalizedName: string }
  | { ok: false; error: string }

const WHITESPACE = /\s+/g
/** Control characters that survive whitespace collapsing. */
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/

const EMPTY_ERROR = 'Enter a location name.'
const CONTROL_ERROR = 'Location names cannot contain control characters.'
const LENGTH_ERROR = `Location must be ${TEXT_LIMITS.location} characters or fewer.`

export function normalizeLocationName(raw: string): NormalizedLocationName {
  const name = raw.replace(WHITESPACE, ' ').trim()

  return {
    name,
    normalizedName: name.normalize('NFKC').toLowerCase(),
  }
}

/** Validates a user-entered location and returns its canonical stored form. */
export function validateLocationName(raw: string): LocationValidation {
  const { name, normalizedName } = normalizeLocationName(raw)

  if (!name) return { ok: false, error: EMPTY_ERROR }
  if (CONTROL_CHARACTERS.test(name)) return { ok: false, error: CONTROL_ERROR }
  if (name.length > TEXT_LIMITS.location) return { ok: false, error: LENGTH_ERROR }

  return { ok: true, name, normalizedName }
}

/** Finds a stored location by any spelling of its name. */
export function findLocationByName(
  locations: readonly PlantLocation[],
  raw: string,
): PlantLocation | undefined {
  const { normalizedName } = normalizeLocationName(raw)
  if (!normalizedName) return undefined

  return locations.find((location) => location.normalizedName === normalizedName)
}

/** Returns a new alphabetically sorted list without mutating the input. */
export function sortLocations(locations: readonly PlantLocation[]): PlantLocation[] {
  return locations.slice().sort((a, b) => (
    a.name.localeCompare(b.name, 'en', { sensitivity: 'base', numeric: true })
    || a.name.localeCompare(b.name, 'en')
  ))
}
