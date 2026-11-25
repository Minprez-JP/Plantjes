// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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

    expect(screen.queryByRole('navigation', { name: /main navigation/i })).toBeNull()
    expect(screen.getByText('THE COLLECTION')).toBeTruthy()
    expect(screen.getByText('Watering list')).toBeTruthy()
    expect(screen.getByText('Saved on this device')).toBeTruthy()
  })

  it('shows the native navigation and only water-due plants on the water screen', () => {
    vi.mocked(isNativeMobilePlatform).mockReturnValue(true)
    render(<App />)

    expect(screen.queryByText('Watering list')).toBeNull()
    expect(screen.queryByRole('button', { name: /water all/i })).toBeNull()

    const nav = screen.getByRole('navigation', { name: /main navigation/i })
    fireEvent.click(within(nav).getByRole('button', { name: /water/i }))

    expect(screen.getByRole('heading', { name: /water list/i })).toBeTruthy()
    expect(screen.getByText('Monstera')).toBeTruthy()
    expect(screen.queryByText('Ficus')).toBeNull()
  })

  it('shows only feeding-due plants on the feed screen', () => {
    vi.mocked(isNativeMobilePlatform).mockReturnValue(true)
    render(<App />)

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

  it('shows compact mobile browse rows, scrolls them into view, hides Add plant while expanded, and collapses after watering', async () => {
    vi.mocked(isNativeMobilePlatform).mockReturnValue(true)
    const scrollTo = vi.fn()
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
      configurable: true,
      value: scrollTo,
    })
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0)
      return 0
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})

    render(<App />)

    const monsteraToggle = screen.getByRole('button', { name: /monstera\s*water today/i })
    expect(monsteraToggle.getAttribute('aria-expanded')).toBe('false')
    expect(screen.getByText('Water today')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /edit monstera/i })).toBeNull()

    fireEvent.click(monsteraToggle)

    const expandedToggle = screen.getByRole('button', { name: /monstera\s*water today/i })
    expect(expandedToggle.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByRole('button', { name: /edit monstera/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /add note for monstera/i })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /add plant/i })).toBeNull()
    await waitFor(() => expect(scrollTo).toHaveBeenCalled())

    const waterButtons = screen.getAllByRole('button', { name: /^water$/i })
    const cardWaterButton = waterButtons.find((button) => button.classList.contains('water-button'))
    expect(cardWaterButton).toBeTruthy()
    fireEvent.click(cardWaterButton!)
    expect(screen.getByRole('button', { name: /monstera/i }).getAttribute('aria-expanded')).toBe('false')
    expect(screen.getByRole('button', { name: /add plant/i })).toBeTruthy()
    vi.restoreAllMocks()
  })

  it('keeps the compact collection toolbar free of bulk watering controls', () => {
    vi.mocked(isNativeMobilePlatform).mockReturnValue(true)
    render(<App />)

    expect(screen.getByText('2 of 2 plants · 1 needs water')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /water due/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /water all/i })).toBeNull()
    expect(screen.getByRole('button', { name: /open plant filters/i })).toBeTruthy()
  })

  it('applies secondary filters from the mobile filter sheet', () => {
    vi.mocked(isNativeMobilePlatform).mockReturnValue(true)
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /open plant filters/i }))
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText(/filter by care/i), {
      target: { value: 'Needs water' },
    })

    expect(screen.getByText('Monstera')).toBeTruthy()
    expect(screen.queryByText('Ficus')).toBeNull()

    fireEvent.click(within(dialog).getByRole('button', { name: /show 1 plant/i }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('exposes import and export on the account screen', () => {
    vi.mocked(isNativeMobilePlatform).mockReturnValue(true)
    render(<App />)

    const nav = screen.getByRole('navigation', { name: /main navigation/i })
    fireEvent.click(within(nav).getByRole('button', { name: /account/i }))

    expect(screen.getByText(/does not use an online account/i)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /import backup/i }))
    fireEvent.click(screen.getByRole('button', { name: /export backup/i }))

    expect(journal.openImport).toHaveBeenCalledTimes(1)
    expect(journal.openExport).toHaveBeenCalledTimes(1)
  })

  it('restores the selected screen from the hash', () => {
    vi.mocked(isNativeMobilePlatform).mockReturnValue(true)
    window.location.hash = '#/feed'
    render(<App />)

    expect(screen.getByRole('heading', { name: /feed list/i })).toBeTruthy()
    const nav = screen.getByRole('navigation', { name: /main navigation/i })
    expect(within(nav).getByRole('button', { name: /feed/i }).getAttribute('aria-current')).toBe('page')
  })

  it('consumes the Android back event to return from a care screen', () => {
    vi.mocked(isNativeMobilePlatform).mockReturnValue(true)
    render(<App />)

    const nav = screen.getByRole('navigation', { name: /main navigation/i })
    fireEvent.click(within(nav).getByRole('button', { name: /water/i }))
    expect(screen.getByRole('heading', { name: /water list/i })).toBeTruthy()

    const backEvent = new CustomEvent('plantjes:back', { cancelable: true })
    fireEvent(window, backEvent)

    expect(backEvent.defaultPrevented).toBe(true)
    expect(window.location.hash).toBe('#/collection')
    expect(screen.queryByRole('heading', { name: /water list/i })).toBeNull()
    expect(within(nav).getByRole('button', { name: /collection/i }).getAttribute('aria-current')).toBe('page')
  })

  it('leaves the Android back event unhandled on the root screen', () => {
    vi.mocked(isNativeMobilePlatform).mockReturnValue(true)
    render(<App />)

    const backEvent = new CustomEvent('plantjes:back', { cancelable: true })
    fireEvent(window, backEvent)

    expect(backEvent.defaultPrevented).toBe(false)
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

  it('consumes the Android back event to close the mobile filter sheet', () => {
    vi.mocked(isNativeMobilePlatform).mockReturnValue(true)
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /open plant filters/i }))
    expect(screen.getByRole('dialog')).toBeTruthy()

    const backEvent = new CustomEvent('plantjes:back', { cancelable: true })
    fireEvent(window, backEvent)

    expect(backEvent.defaultPrevented).toBe(true)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('closes a dialog before leaving a care screen on Android back', () => {
    journal.importOpen = true
    vi.mocked(isNativeMobilePlatform).mockReturnValue(true)
    window.location.hash = '#/water'
    render(<App />)

    const backEvent = new CustomEvent('plantjes:back', { cancelable: true })
    fireEvent(window, backEvent)

    expect(journal.closeImport).toHaveBeenCalledTimes(1)
    expect(window.location.hash).toBe('#/water')
    expect(screen.getByRole('heading', { name: /water list/i })).toBeTruthy()
  })
})
