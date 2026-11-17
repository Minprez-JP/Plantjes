import type { Plant, FertilizerType } from '../db'
import type { PlantFormValues } from '../types'
import { isWinterHardy } from './plants'

type FeedingSource = Pick<PlantFormValues, 'fertilizeEveryDays' | 'fertilizerType'>

/**
 * Applies the four save rules for feeding:
 * - a blank interval disables tracking and clears the type and timestamp;
 * - a new schedule starts from now;
 * - an active schedule keeps its existing timestamp;
 * - an active schedule with a missing timestamp is healed to now.
 */
export function resolveFeedingFields(
  values: FeedingSource,
  previous: Pick<Plant, 'fertilizeEveryDays' | 'lastFertilizedAt'> | undefined,
  now: string,
): {
  fertilizerType: FertilizerType | undefined
  fertilizeEveryDays: number | undefined
  lastFertilizedAt: string | undefined
} {
  if (values.fertilizeEveryDays === undefined) {
    return {
      fertilizerType: undefined,
      fertilizeEveryDays: undefined,
      lastFertilizedAt: undefined,
    }
  }

  const scheduleWasActive = previous?.fertilizeEveryDays !== undefined
  return {
    fertilizerType: values.fertilizerType,
    fertilizeEveryDays: values.fertilizeEveryDays,
    lastFertilizedAt: scheduleWasActive && previous?.lastFertilizedAt
      ? previous.lastFertilizedAt
      : now,
  }
}

export interface BuildPlantRecordInput {
  values: PlantFormValues
  previous?: Plant
  now: string
  imageBlob?: Blob
  imageOptimized?: boolean
}

/** Builds the persisted record from form values plus preserved metadata. */
export function buildPlantRecord({
  values,
  previous,
  now,
  imageBlob,
  imageOptimized,
}: BuildPlantRecordInput): Plant {
  return {
    ...values,
    // Notes live in their own dialog, so the plant form no longer carries them.
    notes: previous?.notes ?? '',
    ...resolveFeedingFields(values, previous, now),
    imageBlob,
    imageOptimized: imageBlob ? imageOptimized : false,
    winterHardy: isWinterHardy(values.minTemperature),
    id: previous?.id,
    lastWateredAt: previous?.lastWateredAt ?? now,
    createdAt: previous?.createdAt ?? now,
  }
}
