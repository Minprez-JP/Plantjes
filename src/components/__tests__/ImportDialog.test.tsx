// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ImportDialog } from '../ImportDialog'

afterEach(cleanup)

const validBackup = JSON.stringify({
  format: 'plantjes',
  version: 1,
  locations: ['Kitchen'],
  plants: [],
})

function renderDialog() {
  const onImport = vi.fn().mockResolvedValue(true)
  render(
    <ImportDialog
      currentPlantCount={2}
      currentLocationCount={1}
      error=""
      onClose={vi.fn()}
      onImport={onImport}
    />,
  )
  return { onImport }
}

async function chooseFile(contents: string, name: string) {
  const input = screen.getByLabelText(/choose a .plantjes backup file/i)
  const file = new File([contents], name, { type: 'application/json' })
  fireEvent.change(input, { target: { files: [file] } })
}

describe('ImportDialog validation feedback', () => {
  it('confirms a valid backup before the collection can be replaced', async () => {
    renderDialog()

    await chooseFile(validBackup, 'garden.plantjes')

    const confirmation = await screen.findByRole('status')
    expect(confirmation.textContent).toMatch(/backup validated/i)
    expect(confirmation.textContent).toMatch(/ready to restore/i)
    expect(screen.getByText('garden.plantjes')).toBeTruthy()
    expect(screen.getByText('Locations')).toBeTruthy()
    expect((screen.getByRole('button', { name: /replace collection/i }) as HTMLButtonElement).disabled).toBe(false)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('keeps an invalid backup in an error state and disables restore', async () => {
    renderDialog()

    await chooseFile('{', 'broken.plantjes')

    expect((await screen.findByRole('alert')).textContent).toMatch(/valid JSON/i)
    expect(screen.getByText('broken.plantjes')).toBeTruthy()
    expect(screen.queryByRole('status')).toBeNull()
    expect((screen.getByRole('button', { name: /replace collection/i }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('rejects a file with the wrong extension', async () => {
    renderDialog()

    await chooseFile(validBackup, 'backup.json')

    expect((await screen.findByRole('alert')).textContent).toMatch(/ends in \.plantjes/i)
    expect(screen.queryByRole('status')).toBeNull()
    expect((screen.getByRole('button', { name: /replace collection/i }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('clears a previous confirmation when another file is invalid', async () => {
    renderDialog()

    await chooseFile(validBackup, 'garden.plantjes')
    expect(await screen.findByRole('status')).toBeTruthy()

    await chooseFile('{', 'broken.plantjes')
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.queryByRole('status')).toBeNull()
    expect((screen.getByRole('button', { name: /replace collection/i }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('only reports the selected file as ready after validation', async () => {
    const { onImport } = renderDialog()

    await chooseFile(validBackup, 'garden.plantjes')
    await screen.findByRole('status')
    fireEvent.click(screen.getByRole('button', { name: /replace collection/i }))

    expect(onImport).toHaveBeenCalledTimes(1)
    expect(onImport.mock.calls[0][0]).toMatchObject({
      ok: true,
      imageCount: 0,
    })
  })
})
