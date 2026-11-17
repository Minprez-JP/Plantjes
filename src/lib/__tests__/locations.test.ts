import { describe, expect, it } from 'vitest'
import type { PlantLocation } from '../../db'
import { TEXT_LIMITS } from '../constants'
import {
  findLocationByName,
  normalizeLocationName,
  sortLocations,
  validateLocationName,
} from '../locations'

const kitchen: PlantLocation = {
  id: 1,
  name: 'Kitchen window',
  normalizedName: 'kitchen window',
}

describe('normalizeLocationName', () => {
  it('trims the name and collapses internal whitespace', () => {
    expect(normalizeLocationName('  Kitchen   window \n').name).toBe('Kitchen window')
  })

  it('builds a case-insensitive comparison key', () => {
    expect(normalizeLocationName('KITCHEN WINDOW').normalizedName)
      .toBe(normalizeLocationName('kitchen window').normalizedName)
  })

  it('normalizes Unicode compatibility characters in the key', () => {
    expect(normalizeLocationName('Ｋitchen').normalizedName)
      .toBe(normalizeLocationName('kitchen').normalizedName)
  })
})

describe('validateLocationName', () => {
  it('returns the canonical display name for a valid value', () => {
    const result = validateLocationName('  Kitchen   window ')

    expect(result).toEqual({
      ok: true,
      name: 'Kitchen window',
      normalizedName: 'kitchen window',
    })
  })

  it.each(['', '   ', '\n\t'])('rejects an empty name: %j', (value) => {
    const result = validateLocationName(value)

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('Expected validation to fail')
    expect(result.error).toMatch(/Enter a location name/)
  })

  it('rejects control characters', () => {
    const result = validateLocationName('Kitchen\u0000window')

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('Expected validation to fail')
    expect(result.error).toMatch(/control characters/)
  })

  it('accepts the length limit and rejects one character more', () => {
    expect(validateLocationName('a'.repeat(TEXT_LIMITS.location)).ok).toBe(true)
    expect(validateLocationName('a'.repeat(TEXT_LIMITS.location + 1)).ok).toBe(false)
  })
})

describe('findLocationByName', () => {
  it('matches a stored location regardless of case or spacing', () => {
    expect(findLocationByName([kitchen], '  KITCHEN   window ')).toBe(kitchen)
  })

  it('returns undefined for an unknown or empty name', () => {
    expect(findLocationByName([kitchen], 'Garage')).toBeUndefined()
    expect(findLocationByName([kitchen], '   ')).toBeUndefined()
  })
})

describe('sortLocations', () => {
  it('sorts by display name without mutating the input', () => {
    const input: PlantLocation[] = [
      { id: 1, name: 'Shed', normalizedName: 'shed' },
      { id: 2, name: 'Balcony', normalizedName: 'balcony' },
      { id: 3, name: 'Kitchen', normalizedName: 'kitchen' },
    ]

    const sorted = sortLocations(input)

    expect(sorted.map((location) => location.name)).toEqual(['Balcony', 'Kitchen', 'Shed'])
    expect(input.map((location) => location.name)).toEqual(['Shed', 'Balcony', 'Kitchen'])
  })
})
