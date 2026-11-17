import { describe, expect, it } from 'vitest'
import { formatOverviewDate, nextFertilizedAt } from '../dates'
import {
  countTrackedFeeding,
  filterPlantRows,
  formatNextFeeding,
  listPlantLocations,
  selectFertilizerDueRows,
  toPlantRows,
} from '../plants'
import type { PlantFilters } from '../../types'
import { NOW, NOW_ISO, makePlant } from './helpers'

const dueFeed = makePlant({
  id: 1,
  name: 'Due feed',
  fertilizeEveryDays: 30,
  lastFertilizedAt: '2025-12-01T12:00:00.000Z',
})
const upcoming = makePlant({
  id: 2,
  name: 'Upcoming',
  fertilizeEveryDays: 30,
  lastFertilizedAt: '2026-01-10T12:00:00.000Z',
})
const untracked = makePlant({ id: 3, name: 'Untracked' })
const missingTimestamp = makePlant({ id: 4, name: 'Missing timestamp', fertilizeEveryDays: 14 })

describe('toPlantRows', () => {
  it('precomputes both countdowns', () => {
    const rows = toPlantRows([dueFeed, upcoming, untracked, missingTimestamp], NOW)

    expect(rows.map((row) => row.fertilizerDaysLeft)).toEqual([-11, 29, null, 0])
  })
})

describe('selectFertilizerDueRows', () => {
  it('includes overdue and missing-timestamp plants, most overdue first', () => {
    const rows = toPlantRows([upcoming, missingTimestamp, untracked, dueFeed], NOW)

    expect(selectFertilizerDueRows(rows).map(({ plant }) => plant.name)).toEqual([
      'Due feed',
      'Missing timestamp',
    ])
  })
})

describe('countTrackedFeeding', () => {
  it('counts every plant with a feeding interval', () => {
    const rows = toPlantRows([dueFeed, upcoming, untracked, missingTimestamp], NOW)
    expect(countTrackedFeeding(rows)).toBe(3)
  })
})

describe('formatNextFeeding', () => {
  it('reports due now when any tracked plant is due', () => {
    const rows = toPlantRows([dueFeed, upcoming], NOW)
    expect(formatNextFeeding(rows, NOW)).toBe('Due now')
  })

  it('reports the earliest upcoming feeding date', () => {
    const rows = toPlantRows([upcoming], NOW)
    const expected = formatOverviewDate(nextFertilizedAt(upcoming, NOW)!)
    expect(formatNextFeeding(rows, NOW)).toBe(expected)
  })

  it('reports no schedule when nothing is tracked', () => {
    const rows = toPlantRows([untracked], NOW)
    expect(formatNextFeeding(rows, NOW)).toBe('Not scheduled')
  })
})

const basil = makePlant({
  id: 1,
  name: 'Basil',
  species: 'Ocimum basilicum',
  environment: 'Indoor',
  location: 'Kitchen',
  waterEveryDays: 7,
  lastWateredAt: '2026-01-01T12:00:00.000Z',
  fertilizeEveryDays: 30,
  lastFertilizedAt: '2025-12-01T12:00:00.000Z',
})
const fern = makePlant({
  id: 2,
  name: 'Fern',
  species: 'Nephrolepis',
  environment: 'Indoor',
  location: 'Bathroom',
  waterEveryDays: 10,
  lastWateredAt: NOW_ISO,
})
const rose = makePlant({
  id: 3,
  name: 'Rose',
  species: 'Rosa',
  environment: 'Outdoor',
  location: 'Garden',
  waterEveryDays: 5,
  lastWateredAt: '2026-01-09T12:00:00.000Z',
  fertilizeEveryDays: 30,
  lastFertilizedAt: '2026-01-10T12:00:00.000Z',
})
const mint = makePlant({
  id: 4,
  name: 'Mint',
  species: 'Mentha',
  environment: 'Indoor',
  location: ' kitchen ',
  waterEveryDays: 7,
  lastWateredAt: '2026-01-08T12:00:00.000Z',
  fertilizeEveryDays: 14,
  lastFertilizedAt: '2025-12-28T12:00:00.000Z',
})
const orchid = makePlant({
  id: 5,
  name: 'Orchid',
  species: 'Phalaenopsis',
  environment: 'Indoor',
  location: '',
  waterEveryDays: 7,
  lastWateredAt: '2025-12-20T12:00:00.000Z',
})

const filterRows = toPlantRows([basil, fern, rose, mint, orchid], NOW)

function names(filters: Partial<PlantFilters>) {
  return filterPlantRows(filterRows, {
    environment: 'All plants',
    location: '',
    care: 'Any care',
    query: '',
    ...filters,
  }).map(({ plant }) => plant.name)
}

describe('listPlantLocations', () => {
  it('deduplicates case-insensitively, omits empty locations, and sorts', () => {
    expect(listPlantLocations([basil, fern, rose, mint, orchid])).toEqual([
      'Bathroom',
      'Garden',
      'Kitchen',
    ])
  })
})

describe('filterPlantRows', () => {
  it('keeps all plants sorted by soonest watering by default', () => {
    expect(names({})).toEqual(['Orchid', 'Basil', 'Rose', 'Mint', 'Fern'])
  })

  it('combines the environment and location filters', () => {
    expect(names({ environment: 'Indoors', location: 'Kitchen' })).toEqual([
      'Basil',
      'Mint',
    ])
  })

  it('matches locations case-insensitively and ignores surrounding whitespace', () => {
    expect(names({ location: '  KITCHEN ' })).toEqual(['Basil', 'Mint'])
  })

  it('filters plants whose watering is due', () => {
    expect(names({ care: 'Needs water' })).toEqual(['Orchid', 'Basil'])
  })

  it('filters tracked plants whose feeding is due', () => {
    expect(names({ care: 'Needs feeding' })).toEqual(['Basil', 'Mint'])
  })

  it('combines care, environment, location, and search filters', () => {
    expect(names({
      environment: 'Indoors',
      location: 'Kitchen',
      care: 'Needs water',
      query: 'ocimum',
    })).toEqual(['Basil'])
  })

  it('searches name, species, and location', () => {
    expect(names({ query: 'garden' })).toEqual(['Rose'])
    expect(names({ query: 'mentha' })).toEqual(['Mint'])
    expect(names({ query: 'orchid' })).toEqual(['Orchid'])
  })
})

