import { describe, expect, it } from 'vitest'
import type { PlantLocation } from '../../db'
import { MAX_FEEDING_DAYS, TEXT_LIMITS } from '../constants'
import { parseCareForm, parsePlantForm } from '../plantForm'

function form(overrides: Record<string, string> = {}) {
  const data = new FormData()
  const base = {
    name: 'Monstera',
    species: '',
    location: '',
    origin: '',
    environment: 'Indoor',
    light: 'Bright indirect',
    waterEveryDays: '7',
    edibility: 'No',
    toxicity: 'No',
  }

  for (const [key, value] of Object.entries({ ...base, ...overrides })) {
    data.set(key, value)
  }
  return data
}

describe('parsePlantForm feeding fields', () => {
  it('leaves feeding disabled when the interval is blank', () => {
    const result = parsePlantForm(form({ fertilizerType: 'Liquid feed' }))

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(result.error)
    expect(result.submission.values.fertilizeEveryDays).toBeUndefined()
    expect(result.submission.values.fertilizerType).toBeUndefined()
  })

  it('keeps an allowlisted fertilizer type when the interval is set', () => {
    const result = parsePlantForm(form({ fertilizeEveryDays: '30', fertilizerType: 'Liquid feed' }))

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(result.error)
    expect(result.submission.values.fertilizeEveryDays).toBe(30)
    expect(result.submission.values.fertilizerType).toBe('Liquid feed')
  })

  it('drops a fertilizer type outside the allowlist', () => {
    const result = parsePlantForm(form({ fertilizeEveryDays: '30', fertilizerType: 'Mystery feed' }))

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(result.error)
    expect(result.submission.values.fertilizerType).toBeUndefined()
  })

  it('accepts both interval boundaries', () => {
    for (const value of ['1', String(MAX_FEEDING_DAYS)]) {
      const result = parsePlantForm(form({ fertilizeEveryDays: value }))
      expect(result.ok).toBe(true)
    }
  })

  it.each(['0', String(MAX_FEEDING_DAYS + 1), '1.5', 'abc'])(
    'rejects an invalid interval: %s',
    (interval) => {
      const result = parsePlantForm(form({ fertilizeEveryDays: interval }))
      expect(result.ok).toBe(false)
      if (result.ok) throw new Error('Expected validation to fail')
      expect(result.error).toMatch(/Feeding interval/)
    },
  )
})

describe('parsePlantForm location allowlist', () => {
  const locations: PlantLocation[] = [
    { id: 1, name: 'Kitchen window', normalizedName: 'kitchen window' },
    { id: 2, name: 'Balcony', normalizedName: 'balcony' },
  ]

  it('keeps an empty location when none is selected', () => {
    const result = parsePlantForm(form(), locations)

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(result.error)
    expect(result.submission.values.location).toBe('')
  })

  it('canonicalizes a known location to its stored spelling', () => {
    const result = parsePlantForm(form({ location: '  KITCHEN   window ' }), locations)

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(result.error)
    expect(result.submission.values.location).toBe('Kitchen window')
  })

  it('rejects a location that is not in the saved list', () => {
    const result = parsePlantForm(form({ location: 'Garage' }), locations)

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('Expected validation to fail')
    expect(result.error).toMatch(/saved location/)
  })

  it('rejects a location when no saved list is provided', () => {
    const result = parsePlantForm(form({ location: 'Kitchen window' }))

    expect(result.ok).toBe(false)
  })
})

describe('parsePlantForm error routing', () => {
  const locations: PlantLocation[] = [
    { id: 1, name: 'Kitchen window', normalizedName: 'kitchen window' },
  ]

  it.each([
    ['name', { name: '' }, 'main', 'name'],
    ['location', { location: 'Garage' }, 'main', 'location'],
    ['watering interval', { waterEveryDays: '' }, 'main', 'waterEveryDays'],
    ['feeding interval', { fertilizeEveryDays: '0' }, 'main', 'fertilizeEveryDays'],
    ['minimum temperature', { minTemperature: '2.5' }, 'environment', 'minTemperature'],
    ['maximum temperature', { maxTemperature: '2.5' }, 'environment', 'maxTemperature'],
    ['inverted temperature', { minTemperature: '20', maxTemperature: '10' }, 'environment', 'minTemperature'],
    ['hex-like temperature', { minTemperature: '0x10' }, 'environment', 'minTemperature'],
    ['exponent temperature', { minTemperature: '1e2' }, 'environment', 'minTemperature'],
    ['out-of-range temperature', { minTemperature: '101' }, 'environment', 'minTemperature'],
    ['scientific watering interval', { waterEveryDays: '1e2' }, 'main', 'waterEveryDays'],
    ['minimum humidity', { minHumidity: '110' }, 'environment', 'minHumidity'],
    ['maximum humidity', { maxHumidity: '110' }, 'environment', 'maxHumidity'],
    ['inverted humidity', { minHumidity: '20', maxHumidity: '10' }, 'environment', 'minHumidity'],
    ['expected height', { expectedHeightCm: '0' }, 'care', 'expectedHeightCm'],
    ['pruned height', { heightAfterPruningCm: '2.5' }, 'care', 'heightAfterPruningCm'],
    ['pruning time limit', { pruningTime: 'x'.repeat(TEXT_LIMITS.pruningTime + 1) }, 'care', 'pruningTime'],
    ['pruning notes limit', { pruningNotes: 'x'.repeat(TEXT_LIMITS.pruningNotes + 1) }, 'care', 'pruningNotes'],
  ] as const)('routes a %s error to its tab and field', (_label, overrides, tab, field) => {
    const result = parsePlantForm(form(overrides), locations)

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('Expected validation to fail')
    expect(result.tab).toBe(tab)
    expect(result.field).toBe(field)
  })

  it('rejects file-valued text fields instead of stringifying them', () => {
    const data = form()
    data.set('name', new File(['Monstera'], 'name.txt', { type: 'text/plain' }))

    const result = parsePlantForm(data, locations)

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('Expected validation to fail')
    expect(result.tab).toBe('main')
    expect(result.field).toBe('name')
    expect(result.error).toMatch(/must be text/)
  })

  it('routes image errors to the Picture tab', () => {
    const data = form()
    data.set('imageFile', new File(['not an image'], 'notes.txt', { type: 'text/plain' }))

    const result = parsePlantForm(data)

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('Expected validation to fail')
    expect(result.tab).toBe('picture')
    expect(result.field).toBe('imageFile')
    expect(result.error).toMatch(/JPEG/)
  })
})

describe('parsePlantForm care fields', () => {
  it('maps pruning details and heights onto the form values', () => {
    const result = parsePlantForm(form({
      pruningTime: '  Late winter  ',
      expectedHeightCm: '150',
      heightAfterPruningCm: '40',
      pruningNotes: ' Cut above a bud ',
    }))

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(result.error)
    expect(result.submission.values.pruningTime).toBe('Late winter')
    expect(result.submission.values.expectedHeightCm).toBe(150)
    expect(result.submission.values.heightAfterPruningCm).toBe(40)
    expect(result.submission.values.pruningNotes).toBe('Cut above a bud')
  })

  it('leaves blank heights undefined', () => {
    const result = parsePlantForm(form())

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(result.error)
    expect(result.submission.values.expectedHeightCm).toBeUndefined()
    expect(result.submission.values.heightAfterPruningCm).toBeUndefined()
  })
})

describe('parseCareForm', () => {
  it('parses pruning values and ignores soil fields', () => {
    const data = new FormData()
    for (const [key, value] of Object.entries({
      pruningTime: '  After flowering  ',
      expectedHeightCm: '90',
      heightAfterPruningCm: '30',
      pruningNotes: ' Cut back by one third ',
      soilComposition: 'Loam',
      soilPh: 'Neutral',
      soilDrainage: 'Well-draining',
    })) {
      data.set(key, value)
    }

    expect(parseCareForm(data)).toEqual({
      ok: true,
      details: {
        pruningTime: 'After flowering',
        expectedHeightCm: 90,
        heightAfterPruningCm: 30,
        pruningNotes: 'Cut back by one third',
      },
    })
  })

  it.each([
    ['expected height', { expectedHeightCm: '0' }, 'expectedHeightCm'],
    ['decimal height', { heightAfterPruningCm: '12.5' }, 'heightAfterPruningCm'],
  ])('rejects an invalid %s', (_label, overrides, field) => {
    const data = new FormData()
    for (const [key, value] of Object.entries(overrides)) data.set(key, value)

    const result = parseCareForm(data)

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('Expected validation to fail')
    expect(result.field).toBe(field)
    expect(result.error).toMatch(/whole numbers/)
  })

  it('rejects file-valued pruning fields instead of stringifying them', () => {
    const data = new FormData()
    data.set('pruningNotes', new File(['notes'], 'notes.txt', { type: 'text/plain' }))

    const result = parseCareForm(data)

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('Expected validation to fail')
    expect(result.field).toBe('pruningNotes')
    expect(result.error).toMatch(/must be text/)
  })
})

describe('parsePlantForm soil fields', () => {
  it('maps allowlisted soil values onto the form values', () => {
    const result = parsePlantForm(form({
      soilComposition: 'Loam',
      soilPh: 'Acidic',
      soilDrainage: 'Well-draining',
    }))

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(result.error)
    expect(result.submission.values.soilComposition).toBe('Loam')
    expect(result.submission.values.soilPh).toBe('Acidic')
    expect(result.submission.values.soilDrainage).toBe('Well-draining')
  })

  it('maps unset and unknown soil values to undefined', () => {
    const result = parsePlantForm(form({
      soilComposition: 'Mystery mix',
      soilPh: '',
      soilDrainage: '',
    }))

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(result.error)
    expect(result.submission.values.soilComposition).toBeUndefined()
    expect(result.submission.values.soilPh).toBeUndefined()
    expect(result.submission.values.soilDrainage).toBeUndefined()
  })
})
