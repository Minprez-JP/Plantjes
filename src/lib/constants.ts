import type { FertilizerType, SoilComposition, SoilDrainage, SoilPh } from '../db'
import type { CareFilter, Filter } from '../types'

/** Decorative photo used when a plant has no stored image. */
export const FALLBACK_PLANT_IMAGE = '/images/fallback-plant.jpg'

/** Uploads above this size are rejected before decoding, to bound memory use. */
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024

/** Raster formats accepted for uploads. SVG is deliberately excluded. */
export const ACCEPTED_IMAGE_TYPES: ReadonlySet<string> = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/bmp',
  'image/gif',
])

/** Maximum length for free-text fields, in characters. */
export const TEXT_LIMITS = {
  name: 80,
  species: 120,
  location: 80,
  origin: 80,
  notes: 2000,
  pruningTime: 200,
  pruningNotes: 2000,
} as const

/** Upper bound for manually entered pruning heights, in centimetres. */
export const MAX_PLANT_HEIGHT_CM = 100_000

export const MAX_WATERING_DAYS = 365
export const MAX_FEEDING_DAYS = 365
export const DEFAULT_FEEDING_DAYS = 30

/** Plausible stored temperature bounds in °C. */
export const MIN_TEMPERATURE_C = -100
export const MAX_TEMPERATURE_C = 100

/** Stored photos at or above this size are re-encoded once on startup. */
export const STORED_IMAGE_OPTIMIZE_BYTES = 256 * 1024

/** Maximum number of plants listed in the watering sidebar. */
export const DUE_LIST_LIMIT = 5

export const FILTERS: readonly Filter[] = ['All plants', 'Indoors', 'Outdoors']

export const CARE_FILTERS: readonly CareFilter[] = ['Any care', 'Needs water', 'Needs feeding']

/** Persisted option allowlists. Form values outside these sets are normalized. */
export const ENVIRONMENTS = ['Indoor', 'Outdoor'] as const

export const EDIBILITY_OPTIONS = ['No', 'Yes'] as const

export const TOXICITY_OPTIONS = ['Yes', 'No'] as const

export const FERTILIZER_TYPE_OPTIONS = [
  'Liquid feed',
  'Water-soluble powder',
  'Slow-release granules',
  'Fertilizer spikes',
  'Organic feed',
] as const satisfies readonly FertilizerType[]

export const LIGHT_OPTIONS = [
  'Bright indirect',
  'Direct sun',
  'Partial shade',
  'Low light',
  'Full sun',
  'Full shade',
] as const

/** Optional soil details. Each select also offers an empty "Not set" value. */
export const SOIL_DRAINAGE_OPTIONS = [
  'Well-draining',
  'Moisture-retentive',
  'Slow-draining',
] as const satisfies readonly SoilDrainage[]

export const SOIL_COMPOSITION_OPTIONS = [
  'Universal potting mix',
  'Soil-based mix',
  'Peat-free mix',
  'Coco coir',
  'Orchid bark mix',
  'Cactus & succulent mix',
  'Loam',
  'Sand',
] as const satisfies readonly SoilComposition[]

export const SOIL_PH_OPTIONS = ['Acidic', 'Neutral', 'Alkaline'] as const satisfies readonly SoilPh[]
