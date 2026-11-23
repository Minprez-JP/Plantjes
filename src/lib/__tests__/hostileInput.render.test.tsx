// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { NoteDialog } from '../../components/NoteDialog'
import { PlantCard } from '../../components/PlantCard'
import type { Plant } from '../../db'
import { BACKUP_FORMAT, BACKUP_VERSION, parsePlantjes } from '../backup'
import { FIXED_NOW, FUZZ_SEED, createRandom, hostileText } from './fuzzHelpers'
import { makePlant } from './helpers'

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const noop = () => {}

function cardProps(plant: Plant) {
  return {
    plant,
    daysLeft: 3,
    fertilizerDaysLeft: null,
    onWater: noop,
    onFertilize: noop,
    onEdit: noop,
    onEditCare: noop,
    onOpenNote: noop,
    onDelete: noop,
  }
}

function assertInert(container: HTMLElement) {
  expect(container.querySelector('script')).toBeNull()
  expect(container.innerHTML).not.toMatch(/<script/i)

  for (const element of container.querySelectorAll('[src], [href], [action], [poster]')) {
    for (const attribute of ['src', 'href', 'action', 'poster']) {
      const value = element.getAttribute(attribute)
      if (value) expect(value).not.toMatch(/^(?:javascript|data:text\/html):/i)
    }
  }
  expect(container.querySelector('[onerror], [onclick], [onload]')).toBeNull()
}

describe('hostile text rendering', () => {
  it('renders generated script-like plant text as inert text', () => {
    const alertSpy = vi.fn()
    vi.stubGlobal('alert', alertSpy)

    for (let index = 0; index < 12; index += 1) {
      const random = createRandom(FUZZ_SEED ^ (0x71 + index))
      const payload = `<script>alert(${index})</script>${hostileText(random, 90)}`
      const plant = makePlant({
        name: payload,
        species: payload,
        location: payload,
        origin: payload,
        notes: payload,
        lastWateredAt: FIXED_NOW.toISOString(),
        createdAt: FIXED_NOW.toISOString(),
      })

      const { container, unmount } = render(<PlantCard {...cardProps(plant)} />)

      assertInert(container)
      expect(container.textContent).toContain(`<script>alert(${index})</script>`)
      unmount()
    }

    expect(alertSpy).not.toHaveBeenCalled()
  })

  it('renders an imported note with script-like markup as inert text', () => {
    const alertSpy = vi.fn()
    vi.stubGlobal('alert', alertSpy)
    const random = createRandom(FUZZ_SEED ^ 0x72)
    const payload = `<img src=x onerror="alert(1)">${hostileText(random, 120)}`
    const plant = makePlant({ notes: payload })

    const { container } = render(
      <NoteDialog plant={plant} error="" onClose={noop} onSave={vi.fn().mockResolvedValue(undefined)} />,
    )

    assertInert(container)
    expect(container.querySelector('.note-content')?.textContent).toBe(payload)
    expect(alertSpy).not.toHaveBeenCalled()
  })

  it('renders script-like fields imported from a .plantjes backup as inert text', () => {
    const alertSpy = vi.fn()
    vi.stubGlobal('alert', alertSpy)
    const name = '<script>alert(99)</script> Fern'
    const notes = '<img src=x onerror="alert(1)">'
    const result = parsePlantjes(JSON.stringify({
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: FIXED_NOW.toISOString(),
      locations: ['<script>alert(1)</script> Shelf'],
      plants: [{
        name,
        species: '<script>alert(98)</script> Species',
        environment: 'Indoor',
        location: '<script>alert(1)</script> Shelf',
        origin: 'javascript:alert(1) Jungle',
        light: 'Bright indirect',
        waterEveryDays: 7,
        lastWateredAt: FIXED_NOW.toISOString(),
        createdAt: FIXED_NOW.toISOString(),
        notes,
        edibility: 'No',
        toxicity: 'No',
      }],
    }), { now: FIXED_NOW })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    const { container } = render(<PlantCard {...cardProps(result.plants[0])} />)

    assertInert(container)
    expect(container.textContent).toContain(name)
    expect(container.textContent).toContain('<script>alert(98)</script> Species')
    expect(container.textContent).toContain('javascript:alert(1) Jungle')
    expect(alertSpy).not.toHaveBeenCalled()
  })
})
