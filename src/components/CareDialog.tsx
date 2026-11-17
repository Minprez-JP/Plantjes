import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  AlertCircle,
  Check,
  Info,
  Pencil,
  RotateCcw,
  X,
} from 'lucide-react'
import type { Plant } from '../db'
import { useDialogFocus } from '../hooks/useDialogFocus'
import { MAX_PLANT_HEIGHT_CM, TEXT_LIMITS } from '../lib/constants'
import { parseCareForm } from '../lib/plantForm'
import type { CareDetails } from '../types'

interface CareDialogProps {
  plant: Plant
  error: string
  onClose: () => void
  onSave: (details: CareDetails) => Promise<void>
}

interface CareIssue {
  error: string
  field: string
}

const CLEARED_PRUNING: CareDetails = {
  pruningTime: '',
  expectedHeightCm: undefined,
  heightAfterPruningCm: undefined,
  pruningNotes: '',
}

export function CareDialog({ plant, error, onClose, onSave }: CareDialogProps) {
  const hasPruning = Boolean(
    plant.pruningTime?.trim()
    || plant.pruningNotes?.trim()
    || plant.expectedHeightCm !== undefined
    || plant.heightAfterPruningCm !== undefined,
  )
  const [editing, setEditing] = useState(false)
  const [validationError, setValidationError] = useState<CareIssue | null>(null)
  const [saving, setSaving] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const dialogRef = useDialogFocus<HTMLElement>(onClose)
  const message = validationError?.error || error

  useEffect(() => {
    if (!editing || !validationError) return
    const control = formRef.current?.elements.namedItem(validationError.field)
    if (control instanceof HTMLElement) control.focus()
  }, [editing, validationError])

  function invalidProps(field: string) {
    if (validationError?.field !== field) return {}
    return {
      'aria-invalid': true,
      'aria-describedby': 'care-dialog-error',
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = parseCareForm(new FormData(event.currentTarget))
    if (!result.ok) {
      setValidationError({ error: result.error, field: result.field })
      return
    }

    setValidationError(null)
    setSaving(true)
    try {
      await onSave(result.details)
    } finally {
      setSaving(false)
    }
  }

  async function clearPruning() {
    setValidationError(null)
    setSaving(true)
    try {
      await onSave(CLEARED_PRUNING)
    } finally {
      setSaving(false)
    }
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
        className="plant-dialog care-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="care-dialog-title"
        tabIndex={-1}
      >
        <div className="dialog-header">
          <div>
            <p className="eyebrow">PLANT CARE</p>
            <h2 id="care-dialog-title">Pruning details</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={19} /></button>
        </div>

        {editing ? (
          <form ref={formRef} onSubmit={handleSubmit} noValidate>
            <p className="dialog-intro">
              Optional pruning details for {plant.name}. Leave anything you do not know blank.
            </p>

            <div className="form-grid">
              <label className="field field-wide">
                <span>When to prune <small>Optional</small></span>
                <input
                  name="pruningTime"
                  data-autofocus
                  defaultValue={plant.pruningTime ?? ''}
                  placeholder="e.g. Late winter, after flowering"
                  maxLength={TEXT_LIMITS.pruningTime}
                  {...invalidProps('pruningTime')}
                />
              </label>
              <label className="field">
                <span>Expected mature height <small>Optional</small></span>
                <span className="input-suffix">
                  <input
                    name="expectedHeightCm"
                    type="number"
                    min="1"
                    max={MAX_PLANT_HEIGHT_CM}
                    step="1"
                    defaultValue={plant.expectedHeightCm}
                    {...invalidProps('expectedHeightCm')}
                  />
                  <span>cm</span>
                </span>
              </label>
              <label className="field">
                <span>Height after pruning <small>Optional</small></span>
                <span className="input-suffix">
                  <input
                    name="heightAfterPruningCm"
                    type="number"
                    min="1"
                    max={MAX_PLANT_HEIGHT_CM}
                    step="1"
                    defaultValue={plant.heightAfterPruningCm}
                    {...invalidProps('heightAfterPruningCm')}
                  />
                  <span>cm</span>
                </span>
              </label>
              <label className="field field-wide">
                <span>Pruning notes <small>Optional</small></span>
                <textarea
                  name="pruningNotes"
                  defaultValue={plant.pruningNotes ?? ''}
                  placeholder="How and where to cut, or anything else to remember..."
                  rows={4}
                  maxLength={TEXT_LIMITS.pruningNotes}
                  {...invalidProps('pruningNotes')}
                />
              </label>
            </div>

            {message && (
              <p className="form-error" id="care-dialog-error" role="alert">
                <AlertCircle size={14} aria-hidden />
                <span>{message}</span>
              </p>
            )}

            <div className="dialog-footer">
              <span><Info size={14} /> Saved to this device</span>
              <div>
                <button type="button" className="button button-quiet" onClick={() => { setValidationError(null); setEditing(false) }}>
                  Cancel
                </button>
                <button type="submit" className="button button-primary" disabled={saving}>
                  <Check size={16} /> Save pruning
                </button>
              </div>
            </div>
          </form>
        ) : (
          <>
            <div className="care-view">
              {plant.pruningTime?.trim() && (
                <div className="care-view-item">
                  <span className="care-view-label">When to prune</span>
                  <p className="care-view-value">{plant.pruningTime}</p>
                </div>
              )}
              {plant.expectedHeightCm !== undefined && (
                <div className="care-view-item">
                  <span className="care-view-label">Expected mature height</span>
                  <p className="care-view-value">{plant.expectedHeightCm} cm</p>
                </div>
              )}
              {plant.heightAfterPruningCm !== undefined && (
                <div className="care-view-item">
                  <span className="care-view-label">Height after pruning</span>
                  <p className="care-view-value">{plant.heightAfterPruningCm} cm</p>
                </div>
              )}
              {plant.pruningNotes?.trim() && (
                <div className="care-view-item care-view-item-notes">
                  <span className="care-view-label">Pruning notes</span>
                  <p className="care-view-notes">{plant.pruningNotes}</p>
                </div>
              )}
              {!hasPruning && (
                <p className="care-view-value">No pruning details saved.</p>
              )}
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
                {hasPruning && (
                  <button
                    type="button"
                    className="button button-quiet"
                    aria-label={`Clear pruning details for ${plant.name}`}
                    onClick={() => void clearPruning()}
                    disabled={saving}
                  >
                    <RotateCcw size={15} /> Clear
                  </button>
                )}
                <button type="button" className="button button-quiet" onClick={onClose}>
                  Close
                </button>
                <button
                  type="button"
                  className="button button-primary"
                  data-autofocus
                  onClick={() => { setValidationError(null); setEditing(true) }}
                >
                  <Pencil size={15} /> Edit
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
