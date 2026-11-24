// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import App from '../App'
import type { Plant } from '../db'
import { usePlantJournal, type PlantJournal } from '../hooks/usePlantJournal'
import { isNativeMobilePlatform } from '../lib/platform'
import type { PlantRow } from '../types'

vi.mock('../lib/platform', () => ({ isNativeMobilePlatform: vi.fn() }))
vi.mock('../hooks/usePlantJournal', () => ({ usePlantJournal: vi.fn() }))

function makePlant(overrides: Partial<Plant> = {}): Plant {
  return {
    id: 1,
    name: 'Monstera',
    species: 'Monstera deliciosa',
    environment: 'Indoor',
    location: 'Living room',
    light: 'Bright indirect',
    waterEveryDays: 7,
    lastWateredAt: '2026-11-01T00:00:00.000Z',
    winterHardy: false,
    draftSensitive: false,
    notes: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    edibility: 'No',
    toxicity: 'No',
    origin: 'Mexico',
    ...overrides,
  }
}

const waterRow: PlantRow = {
  plant: makePlant(),
  daysLeft: -2,
  fertilizerDaysLeft: null,
}

const feedRow: PlantRow = {
  plant: makePlant({
    id: 2,
    name: 'Ficus',
    species: 'Ficus elastica',
    fertilizeEveryDays: 30,
    lastFertilizedAt: '2026-10-01T00:00:00.000Z',
  }),
  daysLeft: 3,
  fertilizerDaysLeft: -1,
}

function makeJournal(overrides: Partial<PlantJournal> = {}): PlantJournal {
  return {
    rows: [waterRow, feedRow],
    dueRows: [waterRow],
    dueFeedRows: [feedRow],
    wateredCount: 0,
    feedingTrackedCount: 1,
    nextFeedingLabel: 'Overdue',
    loading: false,
    loadError: '',
    actionError: '',
    locations: [],
    formOpen: false,
    editingPlant: null,
    saveError: '',
    carePlant: null,
    careError: '',
    notePlant: null,
    noteError: '',
    exportOpen: false,
    exportError: '',
    importOpen: false,
    importError: '',
    openNewPlant: vi.fn(),
    openEditPlant: vi.fn(),
    closeForm: vi.fn(),
    savePlant: vi.fn().mockResolvedValue(undefined),
    addLocation: vi.fn().mockResolvedValue({
      ok: true,
      location: { name: 'Living room', normalizedName: 'living room' },
    }),
    openCareDetails: vi.fn(),
    closeCareDetails: vi.fn(),
    saveCare: vi.fn().mockResolvedValue(undefined),
    openNote: vi.fn(),
    closeNote: vi.fn(),
    saveNote: vi.fn().mockResolvedValue(undefined),
    openExport: vi.fn(),
    closeExport: vi.fn(),
    exportJournal: vi.fn().mockResolvedValue(true),
    openImport: vi.fn(),
    closeImport: vi.fn(),
    importJournal: vi.fn().mockResolvedValue(true),
    waterPlant: vi.fn().mockResolvedValue(undefined),
    waterPlants: vi.fn().mockResolvedValue(true),
    fertilizePlant: vi.fn().mockResolvedValue(undefined),
    removePlant: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

let journal: PlantJournal

beforeEach(() => {
  journal = makeJournal()
  vi.mocked(usePlantJournal).mockReturnValue(journal)
  vi.mocked(isNativeMobilePlatform).mockReturnValue(false)
  window.history.replaceState(null, '', '/')
})

afterEach(() => {
  cleanup()
  window.history.replaceState(null, '', '/')
})

describe('App platform shell', () => {
  it('keeps the existing desktop layout on the web platform', () => {
    render(<App />)

    expect(screen.queryByRole('button', { name: /open navigation/i })).toBeNull()
    expect(screen.getByText('THE COLLECTION')).toBeTruthy()
    expect(screen.getByText('Watering list')).toBeTruthy()
    expect(screen.getByText('Saved on this device')).toBeTruthy()
  })

  it('opens the mobile menu and shows only the water-due plants', () => {
    vi.mocked(isNativeMobilePlatform).mockReturnValue(true)
    render(<App />)

    expect(screen.queryByText('Watering list')).toBeNull()
    expect(screen.getByText('THE COLLECTION')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /open navigation/i }))
    const nav = screen.getByRole('navigation', { name: /main navigation/i })
    fireEvent.click(within(nav).getByRole('button', { name: /water/i }))

    expect(screen.getByRole('heading', { name: /water list/i })).toBeTruthy()
    expect(screen.getByText('Monstera')).toBeTruthy()
    expect(screen.queryByText('Ficus')).toBeNull()
  })

  it('shows only feeding-due plants on the feed screen', () => {
    vi.mocked(isNativeMobilePlatform).mockReturnValue(true)
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /open navigation/i }))
    const nav = screen.getByRole('navigation', { name: /main navigation/i })
    fireEvent.click(within(nav).getByRole('button', { name: /feed/i }))

    expect(screen.getByRole('heading', { name: /feed list/i })).toBeTruthy()
    expect(screen.getByText('Ficus')).toBeTruthy()
    expect(screen.queryByText('Monstera')).toBeNull()
  })

  it('keeps catalogue filtering on the mobile collection screen', () => {
    vi.mocked(isNativeMobilePlatform).mockReturnValue(true)
    render(<App />)

    fireEvent.change(screen.getByLabelText(/find a plant/i), { target: { value: 'Ficus' } })

    expect(screen.getByText('Ficus')).toBeTruthy()
    expect(screen.queryByText('Monstera')).toBeNull()
  })

  it('exposes import and export on the account placeholder', () => {
    vi.mocked(isNativeMobilePlatform).mockReturnValue(true)
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /open navigation/i }))
    const nav = screen.getByRole('navigation', { name: /main navigation/i })
    fireEvent.click(within(nav).getByRole('button', { name: /account/i }))

    expect(screen.getByText(/does not use an online account/i)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /import backup/i }))
    fireEvent.click(screen.getByRole('button', { name: /export backup/i }))

    expect(journal.openImport).toHaveBeenCalledTimes(1)
    expect(journal.openExport).toHaveBeenCalledTimes(1)
  })

  it('closes the menu when Android back navigation restores the previous hash', () => {
    vi.mocked(isNativeMobilePlatform).mockReturnValue(true)
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /open navigation/i }))
    expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeTruthy()
    expect(window.location.hash).toBe('#/collection/menu')

    window.location.hash = '#/collection'
    fireEvent(window, new Event('hashchange'))

    expect(screen.queryByRole('navigation', { name: /main navigation/i })).toBeNull()
  })

  it('consumes the Android back event to close the mobile menu', () => {
    vi.mocked(isNativeMobilePlatform).mockReturnValue(true)
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /open navigation/i }))
    const backEvent = new CustomEvent('plantjes:back', { cancelable: true })
    fireEvent(window, backEvent)

    expect(backEvent.defaultPrevented).toBe(true)
    expect(screen.queryByRole('navigation', { name: /main navigation/i })).toBeNull()
  })

  it('consumes the Android back event to return from a care screen', () => {
    vi.mocked(isNativeMobilePlatform).mockReturnValue(true)
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /open navigation/i }))
    const nav = screen.getByRole('navigation', { name: /main navigation/i })
    fireEvent.click(within(nav).getByRole('button', { name: /water/i }))
    expect(screen.getByRole('heading', { name: /water list/i })).toBeTruthy()

    const backEvent = new CustomEvent('plantjes:back', { cancelable: true })
    fireEvent(window, backEvent)

    expect(backEvent.defaultPrevented).toBe(true)
    expect(screen.getByText('THE COLLECTION')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: /water list/i })).toBeNull()
  })

  it('consumes the Android back event to close an open dialog', () => {
    journal.importOpen = true
    vi.mocked(isNativeMobilePlatform).mockReturnValue(true)
    render(<App />)

    expect(screen.getByRole('dialog')).toBeTruthy()
    const backEvent = new CustomEvent('plantjes:back', { cancelable: true })
    fireEvent(window, backEvent)

    expect(backEvent.defaultPrevented).toBe(true)
    expect(journal.closeImport).toHaveBeenCalledTimes(1)
  })
})
