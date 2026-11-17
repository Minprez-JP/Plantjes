import { describe, expect, it } from 'vitest'
import {
  daysUntilFertilized,
  daysUntilWatered,
  formatLastWatered,
  nextFertilizedAt,
} from '../dates'
import { NOW, NOW_ISO, makePlant } from './helpers'

describe('daysUntilWatered', () => {
  it('counts the days left before the next watering', () => {
    const plant = makePlant({ waterEveryDays: 7, lastWateredAt: '2026-01-08T12:00:00.000Z' })
    expect(daysUntilWatered(plant, NOW)).toBe(4)
  })

  it('returns zero or less when watering is due', () => {
    const plant = makePlant({ waterEveryDays: 3, lastWateredAt: '2026-01-01T12:00:00.000Z' })
    expect(daysUntilWatered(plant, NOW)).toBeLessThanOrEqual(0)
  })
})

describe('daysUntilFertilized', () => {
  it('returns null when feeding is not tracked', () => {
    expect(daysUntilFertilized(makePlant(), NOW)).toBeNull()
  })

  it('treats a tracked plant without a timestamp as due now', () => {
    expect(daysUntilFertilized(makePlant({ fertilizeEveryDays: 30 }), NOW)).toBe(0)
  })

  it('counts whole days since the last feeding', () => {
    const plant = makePlant({
      fertilizeEveryDays: 30,
      lastFertilizedAt: '2026-01-01T12:00:00.000Z',
    })
    expect(daysUntilFertilized(plant, NOW)).toBe(20)
  })

  it('returns zero or less when the feeding interval has elapsed', () => {
    const plant = makePlant({
      fertilizeEveryDays: 5,
      lastFertilizedAt: '2026-01-01T12:00:00.000Z',
    })
    expect(daysUntilFertilized(plant, NOW)).toBeLessThanOrEqual(0)
  })
})

describe('nextFertilizedAt', () => {
  it('returns null when feeding is not tracked', () => {
    expect(nextFertilizedAt(makePlant(), NOW)).toBeNull()
  })

  it('treats a missing timestamp as due now', () => {
    const next = nextFertilizedAt(makePlant({ fertilizeEveryDays: 30 }), NOW)
    expect(next?.toISOString()).toBe(NOW_ISO)
  })

  it('adds the interval to the last feeding timestamp', () => {
    const next = nextFertilizedAt(
      makePlant({ fertilizeEveryDays: 30, lastFertilizedAt: '2026-01-01T12:00:00.000Z' }),
      NOW,
    )
    expect(next?.toISOString()).toBe('2026-01-31T12:00:00.000Z')
  })
})

describe('formatLastWatered', () => {
  it('uses friendly day labels without repeating the water label', () => {
    expect(formatLastWatered(NOW_ISO, NOW)).toBe('today')
    expect(formatLastWatered('2026-01-10T12:00:00.000Z', NOW)).toBe('yesterday')
    expect(formatLastWatered('2026-01-01T12:00:00.000Z', NOW)).toBe('10 days ago')
  })
})
