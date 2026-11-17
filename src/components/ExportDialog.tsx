import { useState, type FormEvent } from 'react'
import { AlertCircle, Download, ShieldCheck, X } from 'lucide-react'
import {
  BACKUP_EXTENSION,
  MAX_BACKUP_NAME,
  defaultBackupName,
  normalizeBackupName,
} from '../lib/backup'

interface ExportDialogProps {
  plantCount: number
  locationCount: number
  error: string
  onClose: () => void
  onExport: (fileName: string) => Promise<boolean>
}

export function ExportDialog({
  plantCount,
  locationCount,
  error,
  onClose,
  onExport,
}: ExportDialogProps) {
  const [name, setName] = useState(() => defaultBackupName())
  const [localError, setLocalError] = useState('')
  const [saving, setSaving] = useState(false)
  const message = localError || error
  const showExtension = !name.trim().toLowerCase().endsWith(BACKUP_EXTENSION)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = normalizeBackupName(name)
    if (!result.ok) {
      setLocalError(result.error)
      return
    }

    setLocalError('')
    setSaving(true)
    await onExport(result.fileName)
    setSaving(false)
  }

  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className="plant-dialog backup-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-dialog-title"
      >
        <div className="dialog-header">
          <div>
            <p className="eyebrow">BACKUP</p>
            <h2 id="export-dialog-title">Export your plant journal</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close dialog">
            <X size={19} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <p className="dialog-intro">
            Downloads one <strong>{BACKUP_EXTENSION}</strong> file with{' '}
            <strong>{plantCount}</strong> {plantCount === 1 ? 'plant' : 'plants'},{' '}
            <strong>{locationCount}</strong> {locationCount === 1 ? 'location' : 'locations'},
            care history, notes, and photos. Keep it somewhere safe; anyone with the file can
            read the journal.
          </p>

          <div className="backup-form">
            <label className="field">
              <span>File name</span>
              <span className="backup-name-control">
                <input
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value)
                    if (localError) setLocalError('')
                  }}
                  maxLength={MAX_BACKUP_NAME + BACKUP_EXTENSION.length}
                  aria-invalid={Boolean(message)}
                  aria-describedby={message ? 'export-error' : 'export-name-hint'}
                  autoFocus
                />
                {showExtension && (
                  <span className="backup-extension">{BACKUP_EXTENSION}</span>
                )}
              </span>
              <small className="field-hint" id="export-name-hint">
                The extension is added automatically if you leave it off.
              </small>
            </label>
          </div>

          {message && (
            <p className="form-error" id="export-error" role="alert">
              <AlertCircle size={14} /><span>{message}</span>
            </p>
          )}

          <div className="dialog-footer">
            <span><ShieldCheck size={14} /> Saved only to this device</span>
            <div>
              <button type="button" className="button button-quiet" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="button button-primary" disabled={saving}>
                <Download size={16} /> {saving ? 'Preparing…' : 'Export'}
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  )
}
