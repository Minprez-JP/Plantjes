// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { makePlant } from '../../lib/__tests__/helpers'
import { CareDialog } from '../CareDialog'

afterEach(cleanup)

function renderCare(overrides = {}, onSave = vi.fn().mockResolvedValue(undefined)) {
  const onClose = vi.fn()
  render(
    <CareDialog
      plant={makePlant(overrides)}
      error=""
      onClose={onClose}
      onSave={onSave}
    />,
  )

  return { onClose, onSave }
}

describe('CareDialog', () => {
  it('shows pruning details read-only and omits soil information', () => {
    renderCare({
      pruningTime: 'Late winter',
      expectedHeightCm: 150,
      heightAfterPruningCm: 40,
      pruningNotes: 'Cut above a bud',
      soilComposition: 'Loam',
      soilPh: 'Neutral',
      soilDrainage: 'Well-draining',
    })

    expect(screen.getByText('Pruning details')).toBeTruthy()
    expect(screen.getByText('Late winter')).toBeTruthy()
    expect(screen.getByText('150 cm')).toBeTruthy()
    expect(screen.getByText('40 cm')).toBeTruthy()
    expect(screen.getByText('Cut above a bud')).toBeTruthy()
    expect(screen.queryByText(/soil/i)).toBeNull()
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('enters edit mode and saves pruning values only', async () => {
    const { onSave } = renderCare({ pruningTime: 'Late winter', soilComposition: 'Loam' })

    fireEvent.click(screen.getByRole('button', { name: /^edit$/i }))

    expect(screen.queryByLabelText(/soil/i)).toBeNull()
    fireEvent.change(screen.getByLabelText(/when to prune/i), { target: { value: ' After flowering ' } })
    fireEvent.change(screen.getByLabelText(/expected mature height/i), { target: { value: '90' } })
    fireEvent.change(screen.getByLabelText(/height after pruning/i), { target: { value: '30' } })
    fireEvent.change(screen.getByLabelText(/pruning notes/i), { target: { value: 'Cut back by one third' } })
    fireEvent.click(screen.getByRole('button', { name: /save pruning/i }))

    await waitFor(() => expect(onSave).toHaveBeenCalledWith({
      pruningTime: 'After flowering',
      expectedHeightCm: 90,
      heightAfterPruningCm: 30,
      pruningNotes: 'Cut back by one third',
    }))
  })

  it('rejects a decimal height and focuses the field in edit mode', async () => {
    const { onSave } = renderCare({ pruningTime: 'Late winter' })
    fireEvent.click(screen.getByRole('button', { name: /^edit$/i }))

    const height = screen.getByLabelText(/height after pruning/i) as HTMLInputElement
    fireEvent.change(height, { target: { value: '12.5' } })
    fireEvent.submit(height.closest('form')!)

    expect(onSave).not.toHaveBeenCalled()
    expect((await screen.findByRole('alert')).textContent).toMatch(/whole numbers/i)
    await waitFor(() => expect(document.activeElement).toBe(height))
    expect(height.getAttribute('aria-invalid')).toBe('true')
  })

  it('clears pruning details without touching soil', async () => {
    const { onSave } = renderCare({
      pruningTime: 'Late winter',
      expectedHeightCm: 150,
      soilComposition: 'Loam',
    })

    fireEvent.click(screen.getByRole('button', { name: /clear pruning details for test plant/i }))

    await waitFor(() => expect(onSave).toHaveBeenCalledWith({
      pruningTime: '',
      expectedHeightCm: undefined,
      heightAfterPruningCm: undefined,
      pruningNotes: '',
    }))
  })

  it('closes on Escape', () => {
    const { onClose } = renderCare({ pruningTime: 'Late winter' })

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
