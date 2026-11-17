// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { makePlant } from '../../lib/__tests__/helpers'
import { NoteDialog } from '../NoteDialog'

afterEach(cleanup)

function renderNote(notes = '', onSave = vi.fn().mockResolvedValue(undefined)) {
  const onClose = vi.fn()
  const view = render(
    <NoteDialog
      plant={makePlant({ notes })}
      error=""
      onClose={onClose}
      onSave={onSave}
    />,
  )

  return { ...view, onClose, onSave }
}

describe('NoteDialog', () => {
  it('shows an empty state and adds a new note', async () => {
    const { onSave } = renderNote()

    expect(screen.getByText(/no note saved for test plant/i)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /add note/i }))

    const textarea = screen.getByRole('textbox', { name: /note/i }) as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: '  New note  ' } })
    fireEvent.click(screen.getByRole('button', { name: /save note/i }))

    await waitFor(() => expect(onSave).toHaveBeenCalledWith('New note'))
  })

  it('shows a saved note with its line breaks and edits it', async () => {
    const { onSave } = renderNote('First line\nSecond line')

    const content = screen.getByText(/first line/i)
    expect(content.textContent).toBe('First line\nSecond line')

    fireEvent.click(screen.getByRole('button', { name: /edit note/i }))
    const textarea = screen.getByRole('textbox', { name: /note/i }) as HTMLTextAreaElement
    expect(textarea.value).toBe('First line\nSecond line')

    fireEvent.change(textarea, { target: { value: 'Changed' } })
    fireEvent.click(screen.getByRole('button', { name: /save note/i }))

    await waitFor(() => expect(onSave).toHaveBeenCalledWith('Changed'))
  })

  it('cancels an edit without saving', () => {
    const { onSave } = renderNote('Keep pinched')

    fireEvent.click(screen.getByRole('button', { name: /edit note/i }))
    const textarea = screen.getByRole('textbox', { name: /note/i })
    fireEvent.change(textarea, { target: { value: 'Changed' } })
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))

    expect(onSave).not.toHaveBeenCalled()
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.getByText('Keep pinched')).toBeTruthy()
  })

  it('clears a saved note', async () => {
    const { onSave } = renderNote('Keep pinched')

    fireEvent.click(screen.getByRole('button', { name: /clear note for test plant/i }))

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(''))
  })

  it('closes on Escape', () => {
    const { onClose } = renderNote('Keep pinched')

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('restores focus to the trigger when it closes', () => {
    const trigger = document.createElement('button')
    document.body.append(trigger)
    trigger.focus()

    const { unmount } = renderNote()
    expect(document.activeElement).not.toBe(trigger)

    unmount()

    expect(document.activeElement).toBe(trigger)
    trigger.remove()
  })
})
