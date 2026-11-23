import { describe, expect, it } from 'vitest'
import type { PlantLocation } from '../../db'
import type { CareDetails, PlantFormSubmission } from '../../types'
import {
  EDIBILITY_OPTIONS,
  ENVIRONMENTS,
  FERTILIZER_TYPE_OPTIONS,
  LIGHT_OPTIONS,
  MAX_FEEDING_DAYS,
  MAX_PLANT_HEIGHT_CM,
  MAX_TEMPERATURE_C,
  MAX_WATERING_DAYS,
  MIN_TEMPERATURE_C,
  SOIL_COMPOSITION_OPTIONS,
  SOIL_DRAINAGE_OPTIONS,
  SOIL_PH_OPTIONS,
  TEXT_LIMITS,
  TOXICITY_OPTIONS,
} from '../constants'
import { parseCareForm, parsePlantForm } from '../plantForm'
import {
  FUZZ_ITERATIONS,
  FUZZ_SEED,
  FUZZ_SELECTS,
  createRandom,
  hostileText,
  numericToken,
  randomInt,
  randomPick,
  readableText,
} from './fuzzHelpers'

const locations: PlantLocation[] = [
  { id: 1, name: 'Kitchen', normalizedName: 'kitchen' },
  { id: 2, name: 'Balcony', normalizedName: 'balcony' },
]
const LOCATION_TOKENS = ['Kitchen', 'Balcony', '<script>alert(1)</script> Shelf']

function generatedFormData(random: () => number, corrupt = false) {
  const data = new FormData()
  const set = (key: string, value: string | File) => data.set(key, value)
  const environment = randomPick(random, ENVIRONMENTS)
  const minTemperature = random() < 0.5
    ? randomInt(random, MIN_TEMPERATURE_C, MAX_TEMPERATURE_C)
    : undefined
  const maxTemperature = minTemperature === undefined
    ? (random() < 0.5 ? randomInt(random, MIN_TEMPERATURE_C, MAX_TEMPERATURE_C) : undefined)
    : randomInt(random, minTemperature, MAX_TEMPERATURE_C)
  const minHumidity = random() < 0.5 ? randomInt(random, 0, 100) : undefined
  const maxHumidity = minHumidity === undefined
    ? (random() < 0.5 ? randomInt(random, 0, 100) : undefined)
    : randomInt(random, minHumidity, 100)
  const fertilizeEveryDays = random() < 0.6
    ? randomInt(random, 1, MAX_FEEDING_DAYS)
    : undefined

  set('name', readableText(random, TEXT_LIMITS.name, 'Plant'))
  set('species', readableText(random, TEXT_LIMITS.species, 'Fern'))
  set('location', randomPick(random, LOCATION_TOKENS))
  set('origin', readableText(random, TEXT_LIMITS.origin, 'Room'))
  set('environment', environment)
  set('light', randomPick(random, LIGHT_OPTIONS))
  set('waterEveryDays', String(randomInt(random, 1, MAX_WATERING_DAYS)))
  set('fertilizeEveryDays', fertilizeEveryDays === undefined ? '' : String(fertilizeEveryDays))
  set('fertilizerType', fertilizeEveryDays === undefined
    ? ''
    : randomPick(random, FERTILIZER_TYPE_OPTIONS))
  set('minTemperature', minTemperature === undefined ? '' : String(minTemperature))
  set('maxTemperature', maxTemperature === undefined ? '' : String(maxTemperature))
  set('minHumidity', minHumidity === undefined ? '' : String(minHumidity))
  set('maxHumidity', maxHumidity === undefined ? '' : String(maxHumidity))
  set('edibility', randomPick(random, EDIBILITY_OPTIONS))
  set('toxicity', randomPick(random, TOXICITY_OPTIONS))
  set('pruningTime', readableText(random, TEXT_LIMITS.pruningTime, ''))
  set('pruningNotes', readableText(random, TEXT_LIMITS.pruningNotes, ''))
  set('expectedHeightCm', random() < 0.5 ? String(randomInt(random, 1, MAX_PLANT_HEIGHT_CM)) : '')
  set('heightAfterPruningCm', random() < 0.5 ? String(randomInt(random, 1, MAX_PLANT_HEIGHT_CM)) : '')
  set('soilDrainage', random() < 0.6 ? randomPick(random, SOIL_DRAINAGE_OPTIONS) : '')
  set('soilComposition', random() < 0.6 ? randomPick(random, SOIL_COMPOSITION_OPTIONS) : '')
  set('soilPh', random() < 0.6 ? randomPick(random, SOIL_PH_OPTIONS) : '')
  data.set('draftSensitive', 'on')

  if (corrupt) {
    const corruptions = [
      () => set('name', hostileText(random, TEXT_LIMITS.name + 20)),
      () => set('species', hostileText(random, TEXT_LIMITS.species + 20)),
      () => set('location', hostileText(random, TEXT_LIMITS.location + 20)),
      () => set('origin', hostileText(random, TEXT_LIMITS.origin + 20)),
      () => set('waterEveryDays', numericToken(random)),
      () => set('fertilizeEveryDays', numericToken(random)),
      () => set('minTemperature', numericToken(random)),
      () => set('maxTemperature', numericToken(random)),
      () => set('minHumidity', numericToken(random)),
      () => set('maxHumidity', numericToken(random)),
      () => set('expectedHeightCm', numericToken(random)),
      () => set('light', randomPick(random, FUZZ_SELECTS.light)),
      () => set('environment', randomPick(random, FUZZ_SELECTS.environment)),
      () => set('edibility', randomPick(random, FUZZ_SELECTS.edibility)),
      () => set('toxicity', randomPick(random, FUZZ_SELECTS.toxicity)),
      () => set('soilPh', randomPick(random, FUZZ_SELECTS.soilPh)),
      () => set('pruningNotes', hostileText(random, TEXT_LIMITS.pruningNotes + 20)),
      () => set('name', new File(['plant'], 'name.txt', { type: 'text/plain' })),
      () => set('pruningNotes', new File(['notes'], 'notes.txt', { type: 'text/plain' })),
    ]
    randomPick(random, corruptions)()
  }

  return data
}

function expectValidCare(details: CareDetails) {
  expect(details.pruningTime?.length ?? 0).toBeLessThanOrEqual(TEXT_LIMITS.pruningTime)
  expect(details.pruningNotes?.length ?? 0).toBeLessThanOrEqual(TEXT_LIMITS.pruningNotes)
  for (const value of [details.expectedHeightCm, details.heightAfterPruningCm]) {
    if (value !== undefined) {
      expect(value).toBeGreaterThanOrEqual(1)
      expect(value).toBeLessThanOrEqual(MAX_PLANT_HEIGHT_CM)
    }
  }
  for (const [value, allowed] of [
    [details.soilDrainage, SOIL_DRAINAGE_OPTIONS],
    [details.soilComposition, SOIL_COMPOSITION_OPTIONS],
    [details.soilPh, SOIL_PH_OPTIONS],
  ] as const) {
    if (value !== undefined) expect(allowed).toContain(value)
  }
}

function expectValidSubmission(submission: PlantFormSubmission) {
  const values = submission.values

  expect(values.name.length).toBeGreaterThan(0)
  expect(values.name.length).toBeLessThanOrEqual(TEXT_LIMITS.name)
  expect(values.species.length).toBeLessThanOrEqual(TEXT_LIMITS.species)
  expect(values.location.length).toBeLessThanOrEqual(TEXT_LIMITS.location)
  expect(values.origin.length).toBeLessThanOrEqual(TEXT_LIMITS.origin)
  expect(ENVIRONMENTS).toContain(values.environment)
  expect(LIGHT_OPTIONS).toContain(values.light)
  expect(EDIBILITY_OPTIONS).toContain(values.edibility)
  expect(TOXICITY_OPTIONS).toContain(values.toxicity)

  expect(values.waterEveryDays).toBeGreaterThanOrEqual(1)
  expect(values.waterEveryDays).toBeLessThanOrEqual(MAX_WATERING_DAYS)
  if (values.fertilizeEveryDays !== undefined) {
    expect(values.fertilizeEveryDays).toBeGreaterThanOrEqual(1)
    expect(values.fertilizeEveryDays).toBeLessThanOrEqual(MAX_FEEDING_DAYS)
    if (values.fertilizerType !== undefined) {
      expect(FERTILIZER_TYPE_OPTIONS).toContain(values.fertilizerType)
    }
  }

  for (const [minimum, maximum] of [
    [values.minHumidity, values.maxHumidity],
    [values.minTemperature, values.maxTemperature],
  ]) {
    if (minimum !== undefined && maximum !== undefined) expect(minimum).toBeLessThanOrEqual(maximum)
  }
  for (const value of [values.minTemperature, values.maxTemperature]) {
    if (value !== undefined) {
      expect(value).toBeGreaterThanOrEqual(MIN_TEMPERATURE_C)
      expect(value).toBeLessThanOrEqual(MAX_TEMPERATURE_C)
    }
  }
  for (const value of [values.minHumidity, values.maxHumidity]) {
    if (value !== undefined) {
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(100)
    }
  }
  if (values.environment === 'Outdoor') expect(values.draftSensitive).toBe(false)
  expectValidCare(values)
}

describe('plant form fuzz properties', () => {
  it('enforces form invariants for generated field data', () => {
    const random = createRandom(FUZZ_SEED ^ 0x61)
    let accepted = 0
    let rejected = 0

    for (let index = 0; index < FUZZ_ITERATIONS; index += 1) {
      const result = parsePlantForm(generatedFormData(random, random() < 0.55), locations)

      if (result.ok) {
        accepted += 1
        expectValidSubmission(result.submission)
      } else {
        rejected += 1
        expect(result.error.length).toBeGreaterThan(0)
        expect(['main', 'picture', 'environment', 'care', 'soil']).toContain(result.tab)
        expect(result.field.length).toBeGreaterThan(0)
      }
    }

    expect(accepted).toBeGreaterThan(0)
    expect(rejected).toBeGreaterThan(0)
  })

  it('enforces care-dialog invariants for generated pruning data', () => {
    const random = createRandom(FUZZ_SEED ^ 0x62)
    let accepted = 0
    let rejected = 0

    for (let index = 0; index < FUZZ_ITERATIONS; index += 1) {
      const result = parseCareForm(generatedFormData(random, random() < 0.4))

      if (result.ok) {
        accepted += 1
        expectValidCare(result.details)
      } else {
        rejected += 1
        expect(result.error.length).toBeGreaterThan(0)
        expect(result.field).toMatch(/^(name|species|location|origin|pruningTime|pruningNotes|expectedHeightCm|heightAfterPruningCm)$/)
      }
    }

    expect(accepted).toBeGreaterThan(0)
    expect(rejected).toBeGreaterThan(0)
  })
})
