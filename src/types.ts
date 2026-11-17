import type { Plant, PlantLocation } from './db'

export type Filter = 'All plants' | 'Indoors' | 'Outdoors'

/** Care-state narrowing applied on top of the environment tabs. */
export type CareFilter = 'Any care' | 'Needs water' | 'Needs feeding'

/** Everything the collection toolbar uses to narrow the visible plant rows. */
export interface PlantFilters {
  environment: Filter
  /** Empty means any location. */
  location: string
  care: CareFilter
  query: string
}

/** The five sections of the add/edit plant form. */
export type PlantFormTab = 'main' | 'environment' | 'soil' | 'care' | 'picture'

/**
 * Everything the add/edit form can change. Photo and record metadata are
 * handled separately.
 */
export type PlantFormValues = Omit<
  Plant,
  | 'id'
  | 'createdAt'
  | 'lastWateredAt'
  | 'lastFertilizedAt'
  | 'winterHardy'
  | 'imageBlob'
  | 'imageOptimized'
  | 'notes'
>

/** Optional pruning and soil fields, editable from the care shortcut dialog. */
export type CareDetails = Pick<
  Plant,
  | 'soilDrainage'
  | 'soilComposition'
  | 'soilPh'
  | 'pruningTime'
  | 'expectedHeightCm'
  | 'heightAfterPruningCm'
  | 'pruningNotes'
>

/**
 * A plant paired with its precomputed countdowns, so cards do not recalculate
 * them. `fertilizerDaysLeft` is `null` when feeding is not tracked.
 */
export interface PlantRow {
  plant: Plant
  daysLeft: number
  fertilizerDaysLeft: number | null
}

export interface PlantFormSubmission {
  values: PlantFormValues
  imageFile?: File
  removeImage: boolean
}

export type AddLocationResult =
  | { ok: true; location: PlantLocation }
  | { ok: false; error: string }
