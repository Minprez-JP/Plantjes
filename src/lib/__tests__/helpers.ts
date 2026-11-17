import type { Plant } from '../../db'

export const NOW = Date.parse('2026-01-11T12:00:00.000Z')
export const NOW_ISO = new Date(NOW).toISOString()

export function makePlant(overrides: Partial<Plant> = {}): Plant {
  return {
    name: 'Test plant',
    species: 'Test species',
    environment: 'Indoor',
    location: 'Shelf',
    light: 'Bright indirect',
    waterEveryDays: 7,
    lastWateredAt: NOW_ISO,
    winterHardy: false,
    draftSensitive: false,
    notes: '',
    createdAt: NOW_ISO,
    edibility: 'No',
    toxicity: 'No',
    origin: '',
    ...overrides,
  }
}
