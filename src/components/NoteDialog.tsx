import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  AlertCircle,
  Check,
  Info,
  Pencil,
  Plus,
  RotateCcw,
  X,
} from 'lucide-react'
import type { Plant } from '../db'
import { useDialogFocus } from '../hooks/useDialogFocus'
import { TEXT_LIMITS } from '../lib/constants'
import { hasStoredNote, parseNote } from '../lib/notes'

interface NoteDialogProps {
  plant: Plant
  error: string
  onClose: () => void
  onSave: (note: string) => Promise<void>
}

export function NoteDialog({ plant, error, onClose, onSave }: NoteDialogProps) {
  const savedNote = plant.notes ?? ''
  const hasNote = hasStoredNote(savedNote)
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(savedNote)
  const [validationError, setValidationError] = useState('')
  const [saving, setSaving] = useState(false)
  const dialogRef = useDialogFocus<HTMLElement>(onClose)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const message = validationError || error

  useEffect(() => {
    if (editing) textareaRef.current?.focus()
  }, [editing])

  async function saveNote(raw: string) {
    const parsed = parseNote(raw)
    if (!parsed.ok) {
      setValidationError(parsed.error)
      return
    }

    setValidationError('')
    setSaving(true)
    try {
      await onSave(parsed.note)
    } finally {
      setSaving(false)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void saveNote(value)
  }

  function cancelEditing() {
    setValue(savedNote)
    setValidationError('')
    setEditing(false)
  }

  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        ref={dialogRef}
        className="plant-dialog note-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="note-dialog-title"
        tabIndex={-1}
      >
        <div className="dialog-header">
          <div>
            <p className="eyebrow">PLANT NOTE</p>
            <h2 id="note-dialog-title">Note for {plant.name}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={19} /></button>
        </div>

        {editing ? (
          <form onSubmit={handleSubmit} noValidate>
            <label className="field note-field">
              <span>Note <small>Optional</small></span>
              <textarea
                ref={textareaRef}
                name="note"
                value={value}
                onChange={(event) => {
                  setValue(event.target.value)
                  if (validationError) setValidationError('')
                }}
                placeholder="Anything you want to remember about this plant..."
                rows={6}
                maxLength={TEXT_LIMITS.notes}
                aria-invalid={Boolean(message)}
                aria-describedby={message ? 'note-dialog-error' : 'note-dialog-hint'}
              />
              <small className="field-hint" id="note-dialog-hint">
                Line breaks are kept. Up to {TEXT_LIMITS.notes} characters.
              </small>
            </label>

            {message && (
              <p className="form-error" id="note-dialog-error" role="alert">
                <AlertCircle size={14} aria-hidden />
                <span>{message}</span>
              </p>
            )}

            <div className="dialog-footer">
              <span><Info size={14} /> Saved to this device</span>
              <div>
                {value.trim() && (
                  <button
                    type="button"
                    className="button button-quiet"
                    onClick={() => {
                      setValue('')
                      setValidationError('')
                      textareaRef.current?.focus()
                    }}
                  >
                    <RotateCcw size={15} /> Clear
                  </button>
                )}
                <button type="button" className="button button-quiet" onClick={cancelEditing}>
                  Cancel
                </button>
                <button type="submit" className="button button-primary" disabled={saving}>
                  <Check size={16} /> Save note
                </button>
              </div>
            </div>
          </form>
        ) : hasNote ? (
          <>
            <div className="note-body">
              <p className="note-content">{savedNote}</p>
            </div>

            {message && (
              <p className="form-error" role="alert">
                <AlertCircle size={14} aria-hidden />
                <span>{message}</span>
              </p>
            )}

            <div className="dialog-footer">
              <span><Info size={14} /> Saved to this device</span>
              <div>
                <button
                  type="button"
                  className="button button-quiet"
                  aria-label={`Clear note for ${plant.name}`}
                  onClick={() => void saveNote('')}
                  disabled={saving}
                >
                  <RotateCcw size={15} /> Clear note
                </button>
                <button type="button" className="button button-quiet" onClick={onClose}>
                  Close
                </button>
                <button
                  type="button"
                  className="button button-primary"
                  data-autofocus
                  onClick={() => {
                    setValidationError('')
                    setEditing(true)
                  }}
                >
                  <Pencil size={15} /> Edit note
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="note-body">
              <div className="note-empty">
                <Info size={28} aria-hidden />
                <p>No note saved for {plant.name} yet.</p>
                <small>Add observations, care reminders, or anything else worth remembering.</small>
              </div>
            </div>

            {message && (
              <p className="form-error" role="alert">
                <AlertCircle size={14} aria-hidden />
                <span>{message}</span>
              </p>
            )}

            <div className="dialog-footer">
              <span><Info size={14} /> Saved to this device</span>
              <div>
                <button type="button" className="button button-quiet" onClick={onClose}>
                  Close
                </button>
                <button
                  type="button"
                  className="button button-primary"
                  data-autofocus
                  onClick={() => {
                    setValidationError('')
                    setEditing(true)
                  }}
                >
                  <Plus size={16} /> Add note
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
