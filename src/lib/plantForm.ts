import type { PlantLocation } from '../db'
import type { CareDetails, PlantFormSubmission, PlantFormTab, PlantFormValues } from '../types'
import { findLocationByName } from './locations'
import {
  ACCEPTED_IMAGE_TYPES,
  EDIBILITY_OPTIONS,
  ENVIRONMENTS,
  FERTILIZER_TYPE_OPTIONS,
  LIGHT_OPTIONS,
  MAX_FEEDING_DAYS,
  MAX_IMAGE_BYTES,
  MAX_PLANT_HEIGHT_CM,
  MAX_WATERING_DAYS,
  SOIL_COMPOSITION_OPTIONS,
  SOIL_DRAINAGE_OPTIONS,
  SOIL_PH_OPTIONS,
  TEXT_LIMITS,
  TOXICITY_OPTIONS,
} from './constants'

export const EMPTY_PLANT_FORM: PlantFormValues = {
  name: '',
  species: '',
  environment: 'Indoor',
  location: '',
  light: LIGHT_OPTIONS[0],
  waterEveryDays: 7,
  fertilizerType: undefined,
  fertilizeEveryDays: undefined,
  draftSensitive: false,
  edibility: '',
  toxicity: '',
  origin: '',
  soilDrainage: undefined,
  soilComposition: undefined,
  soilPh: undefined,
  pruningTime: '',
  expectedHeightCm: undefined,
  heightAfterPruningCm: undefined,
  pruningNotes: '',
}

const TEMPERATURE_ERROR =
  'Temperature must use whole numbers, with the minimum no higher than the maximum.'
const HUMIDITY_ERROR =
  'Humidity must be a whole number from 0 to 100, with the minimum no higher than the maximum.'
const FEEDING_INTERVAL_ERROR =
  `Feeding interval must be a whole number from 1 to ${MAX_FEEDING_DAYS} days, or left blank to disable feeding.`
const WATERING_INTERVAL_ERROR =
  `Watering interval must be a whole number from 1 to ${MAX_WATERING_DAYS} days.`
const IMAGE_SIZE_ERROR = `Photos must be ${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))} MB or smaller.`
const IMAGE_TYPE_ERROR = 'Choose a JPEG, PNG, WebP, AVIF, BMP, or GIF photo.'
const LOCATION_ERROR = 'Choose a saved location or add a new one.'
const HEIGHT_ERROR =
  `Heights must be whole numbers from 1 to ${MAX_PLANT_HEIGHT_CM} cm, or left blank.`

const TEXT_FIELDS = [
  ['name', 'Plant name', TEXT_LIMITS.name, 'main'],
  ['species', 'Species or variety', TEXT_LIMITS.species, 'main'],
  ['location', 'Room or spot', TEXT_LIMITS.location, 'main'],
  ['origin', 'Plant origin', TEXT_LIMITS.origin, 'main'],
  ['pruningTime', 'When to prune', TEXT_LIMITS.pruningTime, 'care'],
  ['pruningNotes', 'Pruning notes', TEXT_LIMITS.pruningNotes, 'care'],
] as const

/** A validation failure plus the tab and control that should receive focus. */
export interface PlantFormIssue {
  error: string
  tab: PlantFormTab
  field: string
}

export type ParsedPlantForm =
  | { ok: true; submission: PlantFormSubmission }
  | ({ ok: false } & PlantFormIssue)

function fail(error: string, tab: PlantFormTab, field: string): ParsedPlantForm {
  return { ok: false, error, tab, field }
}

function optionalNumber(value: FormDataEntryValue | null) {
  return value === null || value === '' ? undefined : Number(value)
}

function isOutOfRange(value: number | undefined, min: number, max: number) {
  return value !== undefined && (!Number.isInteger(value) || value < min || value > max)
}

function isInvertedRange(min: number | undefined, max: number | undefined) {
  return min !== undefined && max !== undefined && min > max
}

/** Normalizes a select value against its allowlist instead of trusting form data. */
function readOption<T extends string>(
  value: FormDataEntryValue | null,
  options: readonly T[],
  fallback: T,
): T {
  return options.find((option) => option === value) ?? fallback
}

/** Reads an optional select value, discarding anything outside the allowlist. */
function readOptionalOption<T extends string>(
  value: FormDataEntryValue | null,
  options: readonly T[],
): T | undefined {
  return options.find((option) => option === value)
}

/** Normalizes the optional soil selects; "Not set" maps to `undefined`. */
export function parseSoilForm(data: FormData): Pick<CareDetails, 'soilDrainage' | 'soilComposition' | 'soilPh'> {
  return {
    soilDrainage: readOptionalOption(data.get('soilDrainage'), SOIL_DRAINAGE_OPTIONS),
    soilComposition: readOptionalOption(data.get('soilComposition'), SOIL_COMPOSITION_OPTIONS),
    soilPh: readOptionalOption(data.get('soilPh'), SOIL_PH_OPTIONS),
  }
}

export type ParsedCareForm =
  | { ok: true; details: CareDetails }
  | { ok: false; error: string; field: string }

/** Validates the optional pruning fields edited by the care dialog. */
export function parseCareForm(data: FormData): ParsedCareForm {
  const pruningTime = String(data.get('pruningTime') ?? '').trim()
  const pruningNotes = String(data.get('pruningNotes') ?? '').trim()
  const expectedHeightCm = optionalNumber(data.get('expectedHeightCm'))
  const heightAfterPruningCm = optionalNumber(data.get('heightAfterPruningCm'))

  if (pruningTime.length > TEXT_LIMITS.pruningTime) {
    return {
      ok: false,
      error: `When to prune must be ${TEXT_LIMITS.pruningTime} characters or fewer.`,
      field: 'pruningTime',
    }
  }
  if (pruningNotes.length > TEXT_LIMITS.pruningNotes) {
    return {
      ok: false,
      error: `Pruning notes must be ${TEXT_LIMITS.pruningNotes} characters or fewer.`,
      field: 'pruningNotes',
    }
  }
  if (isOutOfRange(expectedHeightCm, 1, MAX_PLANT_HEIGHT_CM)) {
    return { ok: false, error: HEIGHT_ERROR, field: 'expectedHeightCm' }
  }
  if (isOutOfRange(heightAfterPruningCm, 1, MAX_PLANT_HEIGHT_CM)) {
    return { ok: false, error: HEIGHT_ERROR, field: 'heightAfterPruningCm' }
  }

  return {
    ok: true,
    details: {
      pruningTime,
      expectedHeightCm,
      heightAfterPruningCm,
      pruningNotes,
    },
  }
}

/** Accepts only non-empty raster images within the size budget. */
function readImageFile(data: FormData): { file?: File; error?: string } {
  const value = data.get('imageFile')
  if (!(value instanceof File) || value.size === 0) return {}
  if (value.size > MAX_IMAGE_BYTES) return { error: IMAGE_SIZE_ERROR }
  if (!ACCEPTED_IMAGE_TYPES.has(value.type)) return { error: IMAGE_TYPE_ERROR }
  return { file: value }
}

function validateTextLimits(values: PlantFormValues): PlantFormIssue | undefined {
  for (const [field, label, limit, tab] of TEXT_FIELDS) {
    if ((values[field] ?? '').length > limit) {
      return {
        error: `${label} must be ${limit} characters or fewer.`,
        tab,
        field,
      }
    }
  }
  return undefined
}

/** Validates raw form data and maps it onto the persisted plant shape. */
export function parsePlantForm(
  data: FormData,
  locations: readonly PlantLocation[] = [],
): ParsedPlantForm {
  const name = String(data.get('name') ?? '').trim()
  if (!name) return fail('Plant name is required.', 'main', 'name')

  const environment = readOption(data.get('environment'), ENVIRONMENTS, 'Indoor')
  const waterEveryDays = optionalNumber(data.get('waterEveryDays'))
  const minTemperature = optionalNumber(data.get('minTemperature'))
  const maxTemperature = optionalNumber(data.get('maxTemperature'))
  const minHumidity = optionalNumber(data.get('minHumidity'))
  const maxHumidity = optionalNumber(data.get('maxHumidity'))
  const fertilizeEveryDays = optionalNumber(data.get('fertilizeEveryDays'))
  const expectedHeightCm = optionalNumber(data.get('expectedHeightCm'))
  const heightAfterPruningCm = optionalNumber(data.get('heightAfterPruningCm'))

  const rawLocation = data.get('location')
  const location = typeof rawLocation === 'string' ? findLocationByName(locations, rawLocation) : undefined
  const locationName = typeof rawLocation === 'string' ? rawLocation.trim() : ''

  if (locationName && !location) {
    return fail(LOCATION_ERROR, 'main', 'location')
  }

  if (waterEveryDays === undefined || isOutOfRange(waterEveryDays, 1, MAX_WATERING_DAYS)) {
    return fail(WATERING_INTERVAL_ERROR, 'main', 'waterEveryDays')
  }

  if (isOutOfRange(fertilizeEveryDays, 1, MAX_FEEDING_DAYS)) {
    return fail(FEEDING_INTERVAL_ERROR, 'main', 'fertilizeEveryDays')
  }

  if (minTemperature !== undefined && !Number.isInteger(minTemperature)) {
    return fail(TEMPERATURE_ERROR, 'environment', 'minTemperature')
  }
  if (maxTemperature !== undefined && !Number.isInteger(maxTemperature)) {
    return fail(TEMPERATURE_ERROR, 'environment', 'maxTemperature')
  }
  if (isInvertedRange(minTemperature, maxTemperature)) {
    return fail(TEMPERATURE_ERROR, 'environment', 'minTemperature')
  }

  if (isOutOfRange(minHumidity, 0, 100)) {
    return fail(HUMIDITY_ERROR, 'environment', 'minHumidity')
  }
  if (isOutOfRange(maxHumidity, 0, 100)) {
    return fail(HUMIDITY_ERROR, 'environment', 'maxHumidity')
  }
  if (isInvertedRange(minHumidity, maxHumidity)) {
    return fail(HUMIDITY_ERROR, 'environment', 'minHumidity')
  }

  if (isOutOfRange(expectedHeightCm, 1, MAX_PLANT_HEIGHT_CM)) {
    return fail(HEIGHT_ERROR, 'care', 'expectedHeightCm')
  }
  if (isOutOfRange(heightAfterPruningCm, 1, MAX_PLANT_HEIGHT_CM)) {
    return fail(HEIGHT_ERROR, 'care', 'heightAfterPruningCm')
  }

  const values: PlantFormValues = {
    name,
    species: String(data.get('species') ?? '').trim(),
    environment,
    location: location?.name ?? '',
    light: readOption(data.get('light'), LIGHT_OPTIONS, LIGHT_OPTIONS[0]),
    waterEveryDays,
    fertilizerType: fertilizeEveryDays === undefined
      ? undefined
      : readOptionalOption(data.get('fertilizerType'), FERTILIZER_TYPE_OPTIONS),
    fertilizeEveryDays,
    minTemperature,
    maxTemperature,
    draftSensitive: environment === 'Indoor' && data.get('draftSensitive') === 'on',
    minHumidity,
    maxHumidity,
    edibility: readOption(data.get('edibility'), EDIBILITY_OPTIONS, 'No'),
    toxicity: readOption(data.get('toxicity'), TOXICITY_OPTIONS, 'No'),
    origin: String(data.get('origin') ?? '').trim(),
    pruningTime: String(data.get('pruningTime') ?? '').trim(),
    expectedHeightCm,
    heightAfterPruningCm,
    pruningNotes: String(data.get('pruningNotes') ?? '').trim(),
    ...parseSoilForm(data),
  }

  const textIssue = validateTextLimits(values)
  if (textIssue) return { ok: false, ...textIssue }

  const image = readImageFile(data)
  if (image.error) return fail(image.error, 'picture', 'imageFile')

  return {
    ok: true,
    submission: {
      values,
      imageFile: image.file,
      removeImage: data.get('removeImage') === 'on',
    },
  }
}
