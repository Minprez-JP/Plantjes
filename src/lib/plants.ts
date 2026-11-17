import { WINTER_HARDY_THRESHOLD, type Plant } from '../db'
import type { Filter, PlantFilters, PlantRow } from '../types'
import {
  daysUntilFertilized,
  daysUntilWatered,
  formatOverviewDate,
  nextFertilizedAt,
} from './dates'
import { normalizeLocationName } from './locations'

const FILTER_ENVIRONMENTS: Record<Exclude<Filter, 'All plants'>, Plant['environment']> = {
  Indoors: 'Indoor',
  Outdoors: 'Outdoor',
}

export function isWinterHardy(minTemperature: number | undefined) {
  return minTemperature !== undefined && minTemperature <= WINTER_HARDY_THRESHOLD
}

function formatTemperature(temperature: number) {
  return String(temperature).replace('-', '−')
}

export function formatTemperatureRange(
  minTemperature: number | undefined,
  maxTemperature: number | undefined,
) {
  if (minTemperature === undefined) {
    if (maxTemperature === undefined) return null
    return `≤ ${formatTemperature(maxTemperature)}°C`
  }
  if (maxTemperature === undefined) return `≥ ${formatTemperature(minTemperature)}°C`
  return `${formatTemperature(minTemperature)}–${formatTemperature(maxTemperature)}°C`
}

export function formatHumidity(minHumidity: number | undefined, maxHumidity: number | undefined) {
  if (minHumidity === undefined) {
    if (maxHumidity === undefined) return null
    return `≤ ${maxHumidity}%`
  }
  if (maxHumidity === undefined) return `≥ ${minHumidity}%`
  return `${minHumidity}–${maxHumidity}%`
}

/** Compact card line in the confirmed order: composition · pH · drainage. */
export function formatSoilSummary(
  plant: Pick<Plant, 'soilComposition' | 'soilPh' | 'soilDrainage'>,
) {
  const parts = [plant.soilComposition, plant.soilPh, plant.soilDrainage].filter(
    (value): value is NonNullable<typeof value> => Boolean(value),
  )
  return parts.length ? parts.join(' · ') : null
}

export function toPlantRows(plants: Plant[], now = Date.now()): PlantRow[] {
  return plants.map((plant) => ({
    plant,
    daysLeft: daysUntilWatered(plant, now),
    fertilizerDaysLeft: daysUntilFertilized(plant, now),
  }))
}

/** Zero or less means the plant's watering schedule has elapsed. */
export function isWateringDue({ daysLeft }: PlantRow) {
  return daysLeft <= 0
}

/** Due feeding; tracked plants without a timestamp count as due now. */
export function isFeedingDue({ fertilizerDaysLeft }: PlantRow) {
  return fertilizerDaysLeft !== null && fertilizerDaysLeft <= 0
}

export function selectDueRows(rows: PlantRow[]) {
  return rows
    .filter(isWateringDue)
    .sort((first, second) => first.daysLeft - second.daysLeft)
}

/** Due feeding rows; tracked plants without a timestamp count as due now. */
export function selectFertilizerDueRows(rows: PlantRow[]) {
  return rows
    .filter(isFeedingDue)
    .sort((first, second) => (
      (first.fertilizerDaysLeft ?? 0) - (second.fertilizerDaysLeft ?? 0)
    ))
}

/**
 * Location choices derived from the plants themselves, so the filter never
 * offers an empty location. Names are deduplicated case-insensitively and
 * sorted like the saved-location list.
 */
export function listPlantLocations(plants: readonly Plant[]): string[] {
  const names = new Map<string, string>()

  for (const { location } of plants) {
    const { name, normalizedName } = normalizeLocationName(location)
    if (normalizedName && !names.has(normalizedName)) names.set(normalizedName, name)
  }

  return [...names.values()].sort((a, b) => (
    a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true })
    || a.localeCompare(b)
  ))
}

/** Number of plants with a feeding schedule, regardless of due state. */
export function countTrackedFeeding(rows: PlantRow[]) {
  return rows.reduce(
    (count, { fertilizerDaysLeft }) => (fertilizerDaysLeft === null ? count : count + 1),
    0,
  )
}

/** Overview label for the next feeding: due, the earliest upcoming date, or none. */
export function formatNextFeeding(rows: PlantRow[], now = Date.now()) {
  const hasDue = rows.some(
    ({ fertilizerDaysLeft }) => fertilizerDaysLeft !== null && fertilizerDaysLeft <= 0,
  )
  if (hasDue) return 'Due now'

  let earliest: Date | null = null
  for (const { plant } of rows) {
    const next = nextFertilizedAt(plant, now)
    if (next && (earliest === null || next.getTime() < earliest.getTime())) {
      earliest = next
    }
  }

  return earliest === null ? 'Not scheduled' : formatOverviewDate(earliest)
}

export function filterPlantRows(rows: PlantRow[], filters: PlantFilters) {
  const normalizedQuery = filters.query.trim().toLowerCase()
  const normalizedLocation = normalizeLocationName(filters.location).normalizedName

  return rows
    .filter((row) => {
      const { plant } = row
      const matchesEnvironment =
        filters.environment === 'All plants'
        || plant.environment === FILTER_ENVIRONMENTS[filters.environment]
      const matchesLocation =
        !normalizedLocation
        || normalizeLocationName(plant.location).normalizedName === normalizedLocation
      const matchesCare =
        filters.care === 'Any care'
        || (filters.care === 'Needs water' && isWateringDue(row))
        || (filters.care === 'Needs feeding' && isFeedingDue(row))
      const matchesQuery = !normalizedQuery
        || [plant.name, plant.species, plant.location]
          .some((value) => value.toLowerCase().includes(normalizedQuery))

      return matchesEnvironment && matchesLocation && matchesCare && matchesQuery
    })
    .sort((first, second) => first.daysLeft - second.daysLeft)
}
