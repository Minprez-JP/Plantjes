import type { FertilizerType, Plant, PlantLocation } from '../db'
import {
  ACCEPTED_IMAGE_TYPES,
  EDIBILITY_OPTIONS,
  FERTILIZER_TYPE_OPTIONS,
  LIGHT_OPTIONS,
  MAX_FEEDING_DAYS,
  MAX_IMAGE_BYTES,
  MAX_PLANT_HEIGHT_CM,
  MAX_TEMPERATURE_C,
  MAX_WATERING_DAYS,
  MIN_TEMPERATURE_C,
  SOIL_COMPOSITION_OPTIONS,
  SOIL_DRAINAGE_OPTIONS,
  SOIL_PH_OPTIONS,
  TEXT_LIMITS,
  TOXICITY_OPTIONS,
} from './constants'
import { normalizeLocationName, sortLocations, validateLocationName } from './locations'
import { normalizeNote } from './notes'
import { isWinterHardy } from './plants'

export const BACKUP_FORMAT = 'plantjes'
export const BACKUP_VERSION = 1
export const BACKUP_EXTENSION = '.plantjes'
export const MAX_BACKUP_BYTES = 100 * 1024 * 1024
export const MAX_BACKUP_NAME = 80
export const MAX_BACKUP_PLANTS = 5000
export const MAX_BACKUP_LOCATIONS = 2000

/** A plant record as stored in a `.plantjes` file: no local ID, image as data URL. */
export type PlantjesPlant = Omit<Plant, 'id' | 'imageBlob'> & { image?: string }

export interface PlantjesDocument {
  format: typeof BACKUP_FORMAT
  version: typeof BACKUP_VERSION
  exportedAt: string
  locations: string[]
  plants: PlantjesPlant[]
}

export interface ParsedPlantjesSuccess {
  ok: true
  plants: Plant[]
  locations: PlantLocation[]
  imageCount: number
  exportedAt?: string
}

export type ParsedPlantjes = ParsedPlantjesSuccess | { ok: false; error: string }

class BackupError extends Error {}

function fail(message: string): never {
  throw new BackupError(message)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function compareNames(first: string, second: string) {
  return first.localeCompare(second, 'en', { sensitivity: 'base', numeric: true })
    || first.localeCompare(second, 'en')
}

/** Location names that will be written to a backup, deduplicated and sorted. */
export function listBackupLocations(
  plants: readonly Plant[],
  locations: readonly PlantLocation[],
): string[] {
  const names = new Map<string, string>()

  const add = (raw: string) => {
    const { name, normalizedName } = normalizeLocationName(raw)
    if (normalizedName && !names.has(normalizedName)) names.set(normalizedName, name)
  }

  for (const location of locations) add(location.name)
  for (const plant of plants) add(plant.location)

  return [...names.values()].sort(compareNames)
}

async function blobToDataUrl(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  const chunkSize = 0x8000

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize))
  }

  return `data:${blob.type || 'application/octet-stream'};base64,${btoa(binary)}`
}

async function toExportPlant(plant: Plant): Promise<PlantjesPlant> {
  const copy: Plant = { ...plant }
  delete copy.id
  delete copy.imageBlob
  const exported: PlantjesPlant = copy

  if (plant.imageBlob) exported.image = await blobToDataUrl(plant.imageBlob)

  return exported
}

/** Builds the complete, portable JSON document, including embedded photos. */
export async function buildPlantjesDocument(
  plants: readonly Plant[],
  locations: readonly PlantLocation[],
  exportedAt = new Date(),
): Promise<PlantjesDocument> {
  if (plants.length > MAX_BACKUP_PLANTS) {
    fail(`A backup cannot contain more than ${MAX_BACKUP_PLANTS} plants.`)
  }

  const exportedLocations = listBackupLocations(plants, locations)
  if (exportedLocations.length > MAX_BACKUP_LOCATIONS) {
    fail(`A backup cannot contain more than ${MAX_BACKUP_LOCATIONS} locations.`)
  }

  // Convert sequentially so a large journal never holds every base64 copy in
  // memory at once, and stop before the document exceeds the import cap.
  const exportedPlants: PlantjesPlant[] = []
  let totalImageBytes = 0
  for (const plant of plants) {
    const exported = await toExportPlant(plant)
    if (exported.image) totalImageBytes += exported.image.length
    if (totalImageBytes > MAX_BACKUP_BYTES) {
      fail(`The embedded photos exceed the ${Math.round(MAX_BACKUP_BYTES / (1024 * 1024))} MB backup limit.`)
    }
    exportedPlants.push(exported)
  }

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: exportedAt.toISOString(),
    locations: exportedLocations,
    plants: exportedPlants,
  }
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

/** Date-based default shown in the export dialog. */
export function defaultBackupName(date = new Date()) {
  return `plantjes-backup-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const UNSAFE_FILENAME = /[\\/:*?"<>|\u0000-\u001f\u007f]/
const RESERVED_FILENAME = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i

export type BackupNameResult =
  | { ok: true; fileName: string }
  | { ok: false; error: string }

/** Trims a requested name, removes a typed extension, and returns `<name>.plantjes`. */
export function normalizeBackupName(raw: string): BackupNameResult {
  const trimmed = raw.trim()
  const withoutExtension = trimmed.toLowerCase().endsWith(BACKUP_EXTENSION)
    ? trimmed.slice(0, -BACKUP_EXTENSION.length)
    : trimmed
  const name = withoutExtension.replace(/\.+$/, '').trim()

  if (!name) return { ok: false, error: 'Enter a file name.' }
  if (name.length > MAX_BACKUP_NAME) {
    return { ok: false, error: `File name must be ${MAX_BACKUP_NAME} characters or fewer.` }
  }
  if (UNSAFE_FILENAME.test(name)) {
    return {
      ok: false,
      error: 'File names cannot contain / \\ : * ? " < > | or control characters.',
    }
  }
  if (RESERVED_FILENAME.test(name)) {
    return { ok: false, error: 'That file name is reserved by the operating system.' }
  }

  return { ok: true, fileName: `${name}${BACKUP_EXTENSION}` }
}

export function hasPlantjesExtension(fileName: string) {
  return fileName.trim().toLowerCase().endsWith(BACKUP_EXTENSION)
}

export type BackupFileCheck = { ok: true } | { ok: false; error: string }

/** Pure extension/size check shared by the import dialog and fuzz tests. */
export function validateBackupFileInfo(fileName: string, size: number): BackupFileCheck {
  if (!hasPlantjesExtension(fileName)) {
    return { ok: false, error: `Choose a file that ends in ${BACKUP_EXTENSION}.` }
  }
  if (!Number.isFinite(size) || size < 0) {
    return { ok: false, error: 'The file size could not be read.' }
  }
  if (size > MAX_BACKUP_BYTES) {
    return { ok: false, error: `Backups must be ${Math.round(MAX_BACKUP_BYTES / (1024 * 1024))} MB or smaller.` }
  }
  return { ok: true }
}

function readText(
  record: Record<string, unknown>,
  key: string,
  label: string,
  limit: number,
): string {
  const value = record[key]
  if (value === undefined || value === null) return ''
  if (typeof value !== 'string') fail(`${label} must be text.`)

  const text = value.trim()
  if (text.length > limit) fail(`${label} must be ${limit} characters or fewer.`)
  return text
}

function readOption<T extends string>(
  value: unknown,
  options: readonly T[],
  fallback: T,
  label: string,
): T {
  if (value === undefined || value === null || value === '') return fallback
  if (typeof value !== 'string' || !options.includes(value as T)) {
    fail(`${label} has an invalid value.`)
  }
  return value as T
}

function readOptionalOption<T extends string>(
  value: unknown,
  options: readonly T[],
  label: string,
): T | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string' || !options.includes(value as T)) {
    fail(`${label} has an invalid value.`)
  }
  return value as T
}

function readBoolean(value: unknown, label: string, fallback = false) {
  if (value === undefined || value === null) return fallback
  if (typeof value !== 'boolean') fail(`${label} must be true or false.`)
  return value
}

function readOptionalInteger(value: unknown, label: string) {
  if (value === undefined || value === null) return undefined
  if (typeof value === 'number' && Number.isInteger(value)) return value
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) {
    return Number(value.trim())
  }
  fail(`${label} must be a whole number.`)
}

const ISO_UTC_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

function readDate(value: unknown, label: string, fallback?: string) {
  if (value === undefined || value === null || value === '') {
    if (fallback !== undefined) return fallback
    fail(`${label} is missing.`)
  }
  if (
    typeof value !== 'string'
    || !ISO_UTC_DATE.test(value)
    || Number.isNaN(Date.parse(value))
  ) {
    fail(`${label} is not a valid ISO UTC date.`)
  }
  return value
}

function addLocation(locations: Map<string, string>, raw: string) {
  const validation = validateLocationName(raw)
  if (!validation.ok) fail(`The backup contains an invalid location: ${validation.error}`)

  const existing = locations.get(validation.normalizedName)
  if (existing !== undefined) return existing

  locations.set(validation.normalizedName, validation.name)
  return validation.name
}

function readLocations(value: unknown) {
  const locations = new Map<string, string>()
  if (value === undefined || value === null) return locations
  if (!Array.isArray(value)) fail('The backup location list is not valid.')
  if (value.length > MAX_BACKUP_LOCATIONS) {
    fail(`The backup has more than ${MAX_BACKUP_LOCATIONS} locations.`)
  }

  for (const raw of value) {
    if (typeof raw !== 'string') fail('The backup contains an invalid location.')
    addLocation(locations, raw)
  }

  return locations
}

const IMAGE_DATA_URL = /^data:([^;,]+);base64,([A-Za-z0-9+/]+={0,2})$/

function readImage(
  value: unknown,
  label: string,
  optimizedValue: unknown,
): { blob: Blob; optimized: boolean } | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string') fail(`${label} is not a valid embedded image.`)

  const match = IMAGE_DATA_URL.exec(value)
  if (!match) fail(`${label} is not a valid embedded image.`)

  const type = match[1].toLowerCase()
  if (!ACCEPTED_IMAGE_TYPES.has(type)) {
    fail(`${label} must be a JPEG, PNG, WebP, AVIF, BMP, or GIF image.`)
  }

  const base64 = match[2]
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
  const size = Math.floor((base64.length * 3) / 4) - padding
  if (size > MAX_IMAGE_BYTES) {
    fail(`${label} is larger than ${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))} MB.`)
  }

  let binary: string
  try {
    binary = atob(base64)
  } catch {
    fail(`${label} is not valid base64.`)
  }

  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return {
    blob: new Blob([bytes], { type }),
    optimized: readBoolean(optimizedValue, `${label} optimization flag`, true),
  }
}

function readPlant(
  value: unknown,
  index: number,
  locations: Map<string, string>,
  now: string,
): Plant {
  const label = `Plant ${index + 1}`
  if (!isRecord(value)) fail(`${label} is not a valid plant record.`)

  const name = readText(value, 'name', `${label} name`, TEXT_LIMITS.name)
  if (!name) fail(`${label} needs a name.`)

  const environment = value.environment
  if (environment !== 'Indoor' && environment !== 'Outdoor') {
    fail(`${label} has an invalid growing environment.`)
  }

  const rawLocation = readText(value, 'location', `${label} location`, TEXT_LIMITS.location)
  const location = rawLocation ? addLocation(locations, rawLocation) : ''

  const waterEveryDays = readOptionalInteger(value.waterEveryDays, `${label} watering interval`)
  if (
    waterEveryDays === undefined
    || waterEveryDays < 1
    || waterEveryDays > MAX_WATERING_DAYS
  ) {
    fail(`${label} has an invalid watering interval.`)
  }

  const fertilizeEveryDays = readOptionalInteger(
    value.fertilizeEveryDays,
    `${label} feeding interval`,
  )
  if (
    fertilizeEveryDays !== undefined
    && (fertilizeEveryDays < 1 || fertilizeEveryDays > MAX_FEEDING_DAYS)
  ) {
    fail(`${label} has an invalid feeding interval.`)
  }

  const minTemperature = readOptionalInteger(value.minTemperature, `${label} minimum temperature`)
  const maxTemperature = readOptionalInteger(value.maxTemperature, `${label} maximum temperature`)
  if (
    (minTemperature !== undefined
      && (minTemperature < MIN_TEMPERATURE_C || minTemperature > MAX_TEMPERATURE_C))
    || (maxTemperature !== undefined
      && (maxTemperature < MIN_TEMPERATURE_C || maxTemperature > MAX_TEMPERATURE_C))
  ) {
    fail(`${label} has a temperature outside the supported range.`)
  }
  if (minTemperature !== undefined && maxTemperature !== undefined && minTemperature > maxTemperature) {
    fail(`${label} has a minimum temperature above its maximum.`)
  }

  const minHumidity = readOptionalInteger(value.minHumidity, `${label} minimum humidity`)
  const maxHumidity = readOptionalInteger(value.maxHumidity, `${label} maximum humidity`)
  if (
    (minHumidity !== undefined && (minHumidity < 0 || minHumidity > 100))
    || (maxHumidity !== undefined && (maxHumidity < 0 || maxHumidity > 100))
    || (minHumidity !== undefined && maxHumidity !== undefined && minHumidity > maxHumidity)
  ) {
    fail(`${label} has an invalid humidity range.`)
  }

  const expectedHeightCm = readOptionalInteger(value.expectedHeightCm, `${label} expected height`)
  const heightAfterPruningCm = readOptionalInteger(
    value.heightAfterPruningCm,
    `${label} height after pruning`,
  )
  if (
    (expectedHeightCm !== undefined
      && (expectedHeightCm < 1 || expectedHeightCm > MAX_PLANT_HEIGHT_CM))
    || (heightAfterPruningCm !== undefined
      && (heightAfterPruningCm < 1 || heightAfterPruningCm > MAX_PLANT_HEIGHT_CM))
  ) {
    fail(`${label} has an invalid pruning height.`)
  }

  const image = readImage(value.image, `${label} photo`, value.imageOptimized)
  const fertilizerType: FertilizerType | undefined = fertilizeEveryDays === undefined
    ? undefined
    : readOptionalOption(value.fertilizerType, FERTILIZER_TYPE_OPTIONS, `${label} fertilizer type`)

  return {
    name,
    species: readText(value, 'species', `${label} species`, TEXT_LIMITS.species),
    environment,
    location,
    light: readOption(value.light, LIGHT_OPTIONS, LIGHT_OPTIONS[0], `${label} light preference`),
    waterEveryDays,
    lastWateredAt: readDate(value.lastWateredAt, `${label} last-watered date`),
    fertilizerType,
    fertilizeEveryDays,
    lastFertilizedAt: fertilizeEveryDays === undefined
      ? undefined
      : readDate(value.lastFertilizedAt, `${label} last-fed date`, now),
    minTemperature,
    maxTemperature,
    winterHardy: isWinterHardy(minTemperature),
    draftSensitive: environment === 'Indoor'
      && readBoolean(value.draftSensitive, `${label} draft-sensitivity flag`),
    minHumidity,
    maxHumidity,
    notes: normalizeNote(readText(value, 'notes', `${label} notes`, TEXT_LIMITS.notes)),
    imageBlob: image?.blob,
    imageOptimized: image?.optimized ?? false,
    createdAt: readDate(value.createdAt, `${label} created date`),
    edibility: readOption(value.edibility, EDIBILITY_OPTIONS, 'No', `${label} edibility`),
    toxicity: readOption(value.toxicity, TOXICITY_OPTIONS, 'No', `${label} toxicity`),
    origin: readText(value, 'origin', `${label} origin`, TEXT_LIMITS.origin),
    soilDrainage: readOptionalOption(value.soilDrainage, SOIL_DRAINAGE_OPTIONS, `${label} soil drainage`),
    soilComposition: readOptionalOption(
      value.soilComposition,
      SOIL_COMPOSITION_OPTIONS,
      `${label} soil composition`,
    ),
    soilPh: readOptionalOption(value.soilPh, SOIL_PH_OPTIONS, `${label} soil pH`),
    pruningTime: readText(value, 'pruningTime', `${label} pruning time`, TEXT_LIMITS.pruningTime),
    expectedHeightCm,
    heightAfterPruningCm,
    pruningNotes: readText(value, 'pruningNotes', `${label} pruning notes`, TEXT_LIMITS.pruningNotes),
  }
}

export interface ParsePlantjesOptions {
  /** Injectable clock for deterministic tests. */
  now?: Date
  /** Exact byte length supplied by callers that already read the file. */
  byteLength?: number
}

/** Parses and defensively validates a `.plantjes` JSON payload. */
export function parsePlantjes(text: string, options: ParsePlantjesOptions = {}): ParsedPlantjes {
  // UTF-8 bytes are always at least the UTF-16 code-unit count, so this cheap
  // check rejects definitely oversized payloads before allocating a copy.
  if (text.length > MAX_BACKUP_BYTES) {
    return { ok: false, error: `Backups must be ${Math.round(MAX_BACKUP_BYTES / (1024 * 1024))} MB or smaller.` }
  }

  const byteLength = options.byteLength ?? new TextEncoder().encode(text).length
  if (byteLength > MAX_BACKUP_BYTES) {
    return { ok: false, error: `Backups must be ${Math.round(MAX_BACKUP_BYTES / (1024 * 1024))} MB or smaller.` }
  }

  let data: unknown

  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: 'This file is not valid JSON.' }
  }

  try {
    if (!isRecord(data) || data.format !== BACKUP_FORMAT) {
      fail('This file is not a Plantjes backup.')
    }
    if (data.version !== BACKUP_VERSION) {
      if (typeof data.version === 'number' && data.version > BACKUP_VERSION) {
        fail('This backup was created by a newer version of Plantjes.')
      }
      fail('This backup version is not supported.')
    }
    if (!Array.isArray(data.plants)) fail('The backup does not include a plant list.')
    if (data.plants.length > MAX_BACKUP_PLANTS) {
      fail(`The backup has more than ${MAX_BACKUP_PLANTS} plants.`)
    }

    const locations = readLocations(data.locations)
    const now = (options.now ?? new Date()).toISOString()
    let imageCount = 0

    const plants = data.plants.map((value, index) => {
      const plant = readPlant(value, index, locations, now)
      if (plant.imageBlob) imageCount += 1
      return plant
    })

    return {
      ok: true,
      plants,
      locations: sortLocations(
        [...locations].map(([normalizedName, name]) => ({ name, normalizedName })),
      ),
      imageCount,
      exportedAt: typeof data.exportedAt === 'string' && !Number.isNaN(Date.parse(data.exportedAt))
        ? data.exportedAt
        : undefined,
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof BackupError
        ? error.message
        : 'This backup could not be read.',
    }
  }
}
