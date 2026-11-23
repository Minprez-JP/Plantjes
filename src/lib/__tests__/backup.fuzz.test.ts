import { describe, expect, it } from 'vitest'
import type { Plant } from '../../db'
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  MAX_BACKUP_BYTES,
  parsePlantjes,
  validateBackupFileInfo,
} from '../backup'
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
import {
  FIXED_NOW,
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

const ISO_UTC_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
const LOCATIONS = ['Kitchen', 'Balcony', 'Shelf', '<script>alert(1)</script> Shelf']

function validPlantRecord(random: () => number): Record<string, unknown> {
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

  return {
    name: readableText(random, TEXT_LIMITS.name, 'Plant'),
    species: readableText(random, TEXT_LIMITS.species, 'Fern'),
    environment,
    location: randomPick(random, LOCATIONS),
    origin: readableText(random, TEXT_LIMITS.origin, 'Room'),
    light: randomPick(random, LIGHT_OPTIONS),
    waterEveryDays: randomInt(random, 1, MAX_WATERING_DAYS),
    fertilizeEveryDays,
    fertilizerType: fertilizeEveryDays === undefined
      ? undefined
      : randomPick(random, FERTILIZER_TYPE_OPTIONS),
    minTemperature,
    maxTemperature,
    minHumidity,
    maxHumidity,
    edibility: randomPick(random, EDIBILITY_OPTIONS),
    toxicity: randomPick(random, TOXICITY_OPTIONS),
    draftSensitive: environment === 'Indoor' && random() < 0.5,
    notes: readableText(random, TEXT_LIMITS.notes, ''),
    pruningTime: readableText(random, TEXT_LIMITS.pruningTime, ''),
    pruningNotes: readableText(random, TEXT_LIMITS.pruningNotes, ''),
    expectedHeightCm: random() < 0.5
      ? randomInt(random, 1, MAX_PLANT_HEIGHT_CM)
      : undefined,
    heightAfterPruningCm: random() < 0.5
      ? randomInt(random, 1, MAX_PLANT_HEIGHT_CM)
      : undefined,
    soilDrainage: random() < 0.6 ? randomPick(random, SOIL_DRAINAGE_OPTIONS) : undefined,
    soilComposition: random() < 0.6 ? randomPick(random, SOIL_COMPOSITION_OPTIONS) : undefined,
    soilPh: random() < 0.6 ? randomPick(random, SOIL_PH_OPTIONS) : undefined,
    lastWateredAt: FIXED_NOW.toISOString(),
    createdAt: FIXED_NOW.toISOString(),
    lastFertilizedAt: FIXED_NOW.toISOString(),
    image: random() < 0.05 ? 'data:image/png;base64,AAAA' : undefined,
    imageOptimized: random() < 0.5,
    onclick: 'alert(1)',
  }
}

function corruptPlantRecord(
  random: () => number,
  plant: Record<string, unknown>,
): Record<string, unknown> {
  const corruptions = [
    () => { plant.name = hostileText(random, TEXT_LIMITS.name + 20) },
    () => { plant.species = hostileText(random, TEXT_LIMITS.species + 20) },
    () => { plant.location = hostileText(random, TEXT_LIMITS.location + 20) },
    () => { plant.notes = hostileText(random, TEXT_LIMITS.notes + 20) },
    () => { plant.waterEveryDays = numericToken(random) },
    () => { plant.fertilizeEveryDays = numericToken(random) },
    () => { plant.minTemperature = numericToken(random) },
    () => { plant.maxTemperature = numericToken(random) },
    () => { plant.minHumidity = numericToken(random) },
    () => { plant.maxHumidity = numericToken(random) },
    () => { plant.expectedHeightCm = numericToken(random) },
    () => { plant.light = randomPick(random, FUZZ_SELECTS.light) },
    () => { plant.environment = randomPick(random, FUZZ_SELECTS.environment) },
    () => { plant.edibility = randomPick(random, FUZZ_SELECTS.edibility) },
    () => { plant.toxicity = randomPick(random, FUZZ_SELECTS.toxicity) },
    () => { plant.soilPh = randomPick(random, FUZZ_SELECTS.soilPh) },
    () => { plant.draftSensitive = 'yes' },
    () => { plant.lastWateredAt = hostileText(random, 30) },
    () => { plant.createdAt = hostileText(random, 30) },
    () => { plant.image = 'data:text/html,<script>alert(1)</script>' },
  ]
  randomPick(random, corruptions)()
  return plant
}

function expectValidPlant(plant: Plant) {
  expect(plant.name.length).toBeGreaterThan(0)
  expect(plant.name.length).toBeLessThanOrEqual(TEXT_LIMITS.name)
  expect(plant.species.length).toBeLessThanOrEqual(TEXT_LIMITS.species)
  expect(plant.location.length).toBeLessThanOrEqual(TEXT_LIMITS.location)
  expect(plant.origin.length).toBeLessThanOrEqual(TEXT_LIMITS.origin)
  expect(plant.notes.length).toBeLessThanOrEqual(TEXT_LIMITS.notes)
  expect(plant.pruningTime?.length ?? 0).toBeLessThanOrEqual(TEXT_LIMITS.pruningTime)
  expect(plant.pruningNotes?.length ?? 0).toBeLessThanOrEqual(TEXT_LIMITS.pruningNotes)

  expect(ENVIRONMENTS).toContain(plant.environment)
  expect(LIGHT_OPTIONS).toContain(plant.light)
  expect(EDIBILITY_OPTIONS).toContain(plant.edibility)
  expect(TOXICITY_OPTIONS).toContain(plant.toxicity)

  expect(plant.waterEveryDays).toBeGreaterThanOrEqual(1)
  expect(plant.waterEveryDays).toBeLessThanOrEqual(MAX_WATERING_DAYS)
  if (plant.fertilizeEveryDays !== undefined) {
    expect(plant.fertilizeEveryDays).toBeGreaterThanOrEqual(1)
    expect(plant.fertilizeEveryDays).toBeLessThanOrEqual(MAX_FEEDING_DAYS)
    if (plant.fertilizerType !== undefined) {
      expect(FERTILIZER_TYPE_OPTIONS).toContain(plant.fertilizerType)
    }
  }

  for (const [minimum, maximum] of [
    [plant.minHumidity, plant.maxHumidity],
    [plant.minTemperature, plant.maxTemperature],
  ]) {
    if (minimum !== undefined && maximum !== undefined) expect(minimum).toBeLessThanOrEqual(maximum)
  }
  for (const value of [plant.minTemperature, plant.maxTemperature]) {
    if (value !== undefined) {
      expect(value).toBeGreaterThanOrEqual(MIN_TEMPERATURE_C)
      expect(value).toBeLessThanOrEqual(MAX_TEMPERATURE_C)
    }
  }
  for (const value of [plant.minHumidity, plant.maxHumidity]) {
    if (value !== undefined) {
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(100)
    }
  }
  expect(plant.winterHardy).toBe(
    plant.minTemperature !== undefined && plant.minTemperature <= -10,
  )
  expect(plant.draftSensitive).toBe(plant.environment === 'Indoor' && plant.draftSensitive)

  for (const [value, allowed] of [
    [plant.soilDrainage, SOIL_DRAINAGE_OPTIONS],
    [plant.soilComposition, SOIL_COMPOSITION_OPTIONS],
    [plant.soilPh, SOIL_PH_OPTIONS],
  ] as const) {
    if (value !== undefined) expect(allowed).toContain(value)
  }
  for (const value of [plant.expectedHeightCm, plant.heightAfterPruningCm]) {
    if (value !== undefined) {
      expect(value).toBeGreaterThanOrEqual(1)
      expect(value).toBeLessThanOrEqual(MAX_PLANT_HEIGHT_CM)
    }
  }
  for (const value of [plant.createdAt, plant.lastWateredAt, plant.lastFertilizedAt]) {
    if (value !== undefined) expect(ISO_UTC_DATE.test(value)).toBe(true)
  }
}

describe('backup import fuzz properties', () => {
  it('rejects malformed hostile byte streams without throwing', () => {
    const random = createRandom(FUZZ_SEED ^ 0x51)
    let rejected = 0

    for (let index = 0; index < FUZZ_ITERATIONS; index += 1) {
      const result = parsePlantjes(hostileText(random, 600), { now: FIXED_NOW })

      expect(typeof result.ok).toBe('boolean')
      if (!result.ok) {
        rejected += 1
        expect(result.error.length).toBeGreaterThan(0)
      }
    }

    expect(rejected).toBe(FUZZ_ITERATIONS)
  })

  it('rejects declared oversized backups and unsafe file info', () => {
    const random = createRandom(FUZZ_SEED ^ 0x52)

    for (let index = 0; index < 20; index += 1) {
      const text = JSON.stringify({
        format: BACKUP_FORMAT,
        version: BACKUP_VERSION,
        plants: [validPlantRecord(random)],
      })
      const result = parsePlantjes(text, {
        now: FIXED_NOW,
        byteLength: MAX_BACKUP_BYTES + randomInt(random, 1, 4096),
      })

      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error).toMatch(/100 MB or smaller/)

      expect(validateBackupFileInfo('backup.plantjes', MAX_BACKUP_BYTES + 1).ok).toBe(false)
      expect(validateBackupFileInfo(hostileText(random, 30), 1).ok).toBe(false)
      expect(validateBackupFileInfo('backup.plantjes', Number.NaN).ok).toBe(false)
    }

    expect(validateBackupFileInfo('backup.plantjes', MAX_BACKUP_BYTES).ok).toBe(true)
  })

  it('enforces validation invariants for generated backup records', () => {
    const random = createRandom(FUZZ_SEED ^ 0x53)
    let accepted = 0
    let rejected = 0

    for (let index = 0; index < FUZZ_ITERATIONS; index += 1) {
      const plant = validPlantRecord(random)
      if (random() < 0.55) corruptPlantRecord(random, plant)
      const document = {
        format: BACKUP_FORMAT,
        version: BACKUP_VERSION,
        exportedAt: FIXED_NOW.toISOString(),
        locations: [randomPick(random, LOCATIONS)],
        plants: [plant],
      }
      const result = parsePlantjes(JSON.stringify(document), { now: FIXED_NOW })

      if (result.ok) {
        accepted += 1
        expect(result.plants).toHaveLength(1)
        expectValidPlant(result.plants[0])
        expect(result.locations.every((location) => location.name.length <= TEXT_LIMITS.location)).toBe(true)
      } else {
        rejected += 1
        expect(result.error.length).toBeGreaterThan(0)
      }
    }

    expect(accepted).toBeGreaterThan(0)
    expect(rejected).toBeGreaterThan(0)
  })
})
