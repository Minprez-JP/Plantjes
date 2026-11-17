// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { Plant } from '../../db'
import { makePlant } from '../../lib/__tests__/helpers'
import { PlantCard } from '../PlantCard'

afterEach(cleanup)

function renderCard(notes: string, overrides: Partial<Plant> = {}) {
  const onEditCare = vi.fn()
  render(
    <PlantCard
      plant={makePlant({ notes, ...overrides })}
      daysLeft={3}
      fertilizerDaysLeft={null}
      onWater={vi.fn()}
      onFertilize={vi.fn()}
      onEdit={vi.fn()}
      onEditCare={onEditCare}
      onOpenNote={vi.fn()}
      onDelete={vi.fn()}
    />,
  )
  return { onEditCare }
}

describe('PlantCard note button', () => {
  it('shows a neutral add-note button when the note is empty', () => {
    renderCard('   ')

    const button = screen.getByRole('button', { name: /add note for test plant/i })
    expect(button.className).toBe('note-action')
    expect(button.querySelector('.note-action-dot')).toBeNull()
  })

  it('shows a prominent view-note button when a note is saved', () => {
    renderCard('Keep pinched')

    const button = screen.getByRole('button', { name: /view note for test plant/i })
    expect(button.className).toContain('has-note')
    expect(button.querySelector('.note-action-dot')).not.toBeNull()
  })
})

describe('PlantCard care details', () => {
  it('opens pruning details from the scissors icon without repeating them on the card', () => {
    const { onEditCare } = renderCard('', {
      pruningTime: 'Late winter',
      expectedHeightCm: 150,
      heightAfterPruningCm: 40,
    })

    expect(screen.queryByText(/prune: late winter/i)).toBeNull()
    expect(screen.queryByText(/grows to 150 cm/i)).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /view pruning details for test plant/i }))
    expect(onEditCare).toHaveBeenCalledTimes(1)
  })

  it('omits the pruning icon when when-to-prune is not filled', () => {
    renderCard('', {
      expectedHeightCm: 150,
      heightAfterPruningCm: 40,
    })

    expect(screen.queryByRole('button', { name: /pruning details for test plant/i })).toBeNull()
    expect(screen.queryByText(/grows to 150 cm/i)).toBeNull()
  })
})
