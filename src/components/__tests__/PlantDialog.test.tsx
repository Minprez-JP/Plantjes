// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { PlantDialog } from '../PlantDialog'

function renderDialog() {
  render(
    <PlantDialog
      plant={null}
      locations={[]}
      error=""
      onClose={vi.fn()}
      onSave={vi.fn().mockResolvedValue(undefined)}
      onAddLocation={vi.fn().mockResolvedValue({ ok: false, error: 'Not used' })}
    />,
  )
}

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})

afterEach(cleanup)

describe('PlantDialog tabs', () => {
  it('keeps entered values when switching tabs', () => {
    renderDialog()

    const name = screen.getByRole('textbox', { name: /plant name/i }) as HTMLInputElement
    const environment = screen.getByRole('combobox', { name: /growing in/i }) as HTMLSelectElement

    fireEvent.change(name, { target: { value: 'Monstera' } })
    fireEvent.change(environment, { target: { value: 'Outdoor' } })

    fireEvent.click(screen.getByRole('tab', { name: 'Picture' }))
    fireEvent.click(screen.getByRole('tab', { name: 'Main' }))

    expect(name.value).toBe('Monstera')
    expect(environment.value).toBe('Outdoor')
  })

  it('moves between tabs with the keyboard', () => {
    renderDialog()

    const main = screen.getByRole('tab', { name: 'Main' })
    main.focus()

    fireEvent.keyDown(main, { key: 'ArrowRight' })
    const environment = screen.getByRole('tab', { name: 'Environment' })
    expect(environment.getAttribute('aria-selected')).toBe('true')
    expect(document.activeElement).toBe(environment)

    fireEvent.keyDown(environment, { key: 'End' })
    const picture = screen.getByRole('tab', { name: 'Picture' })
    expect(picture.getAttribute('aria-selected')).toBe('true')
    expect(document.activeElement).toBe(picture)

    fireEvent.keyDown(picture, { key: 'Home' })
    expect(main.getAttribute('aria-selected')).toBe('true')
    expect(document.activeElement).toBe(main)

    fireEvent.keyDown(main, { key: 'ArrowLeft' })
    expect(picture.getAttribute('aria-selected')).toBe('true')
    expect(document.activeElement).toBe(picture)
  })

  it('keeps pruning details on the separate Care tab', () => {
    renderDialog()

    fireEvent.click(screen.getByRole('tab', { name: 'Care' }))
    const pruningTime = screen.getByRole('textbox', { name: /when to prune/i }) as HTMLInputElement
    fireEvent.change(pruningTime, { target: { value: 'Late winter' } })

    fireEvent.click(screen.getByRole('tab', { name: 'Main' }))
    fireEvent.click(screen.getByRole('tab', { name: 'Care' }))

    expect(pruningTime.value).toBe('Late winter')
  })

  it('opens the failing tab and focuses and marks the invalid field', async () => {
    renderDialog()

    const name = screen.getByRole('textbox', { name: /plant name/i })
    fireEvent.change(name, { target: { value: 'Monstera' } })

    const minTemperature = screen.getByLabelText(/Minimum \(°C\)/) as HTMLInputElement
    fireEvent.change(minTemperature, { target: { value: '2.5' } })
    fireEvent.submit(minTemperature.closest('form')!)

    const environmentTab = await screen.findByRole('tab', {
      name: /Environment tab, has errors/i,
    })
    expect(environmentTab.getAttribute('aria-selected')).toBe('true')
    await waitFor(() => expect(document.activeElement).toBe(minTemperature))
    expect(minTemperature.getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByRole('alert').textContent).toContain('Environment tab')
  })
})
