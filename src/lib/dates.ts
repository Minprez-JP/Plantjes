import type { Plant } from '../db'

const DAY_MS = 24 * 60 * 60 * 1000

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
})

const overviewDateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
})

export function formatToday(date = new Date()) {
  return dateFormatter.format(date)
}

/** Positive values mean the next action is still ahead; zero or less means due. */
function daysUntil(lastDoneAt: string, intervalDays: number, now: number) {
  const daysSince = Math.floor((now - new Date(lastDoneAt).getTime()) / DAY_MS)
  return intervalDays - daysSince
}

/** Positive values mean the next watering is still ahead; zero or less means due. */
export function daysUntilWatered(plant: Plant, now = Date.now()) {
  return daysUntil(plant.lastWateredAt, plant.waterEveryDays, now)
}

/**
 * `null` means feeding is not tracked. A tracked plant with no timestamp is
 * treated as due now, so imported or hand-edited records cannot stay scheduled
 * but never due.
 */
export function daysUntilFertilized(
  plant: Pick<Plant, 'fertilizeEveryDays' | 'lastFertilizedAt'>,
  now = Date.now(),
): number | null {
  if (plant.fertilizeEveryDays === undefined) return null
  if (plant.lastFertilizedAt === undefined) return 0
  return daysUntil(plant.lastFertilizedAt, plant.fertilizeEveryDays, now)
}

/** The next feed date, or `null` when feeding is not tracked. Missing timestamps are due now. */
export function nextFertilizedAt(
  plant: Pick<Plant, 'fertilizeEveryDays' | 'lastFertilizedAt'>,
  now = Date.now(),
): Date | null {
  if (plant.fertilizeEveryDays === undefined) return null
  if (plant.lastFertilizedAt === undefined) return new Date(now)
  return new Date(
    new Date(plant.lastFertilizedAt).getTime() + plant.fertilizeEveryDays * DAY_MS,
  )
}

export function formatDue(days: number) {
  if (days <= 0) return 'Water today'
  if (days === 1) return 'Water tomorrow'
  return `In ${days} days`
}

export function formatLastWatered(date: string, now = Date.now()) {
  const days = Math.floor((now - new Date(date).getTime()) / DAY_MS)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days} days ago`
}

export function formatOverviewDate(date: Date) {
  return overviewDateFormatter.format(date)
}
