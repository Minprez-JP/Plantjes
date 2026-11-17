import { useState, type ChangeEvent } from 'react'
import { AlertCircle, Check, FileUp, X } from 'lucide-react'
import {
  BACKUP_EXTENSION,
  MAX_BACKUP_BYTES,
  hasPlantjesExtension,
  parsePlantjes,
  type ParsedPlantjesSuccess,
} from '../lib/backup'

interface ImportDialogProps {
  currentPlantCount: number
  currentLocationCount: number
  error: string
  onClose: () => void
  onImport: (backup: ParsedPlantjesSuccess) => Promise<boolean>
}

function formatSize(bytes: number) {
  const megabytes = bytes / (1024 * 1024)
  return `${Math.round(megabytes)} MB`
}

export function ImportDialog({
  currentPlantCount,
  currentLocationCount,
  error,
  onClose,
  onImport,
}: ImportDialogProps) {
  const [fileName, setFileName] = useState('')
  const [parsed, setParsed] = useState<ParsedPlantjesSuccess | null>(null)
  const [fileError, setFileError] = useState('')
  const [importing, setImporting] = useState(false)
  const message = fileError || error

  async function readFile(file: File | undefined) {
    setFileError('')
    setParsed(null)
    setFileName('')

    if (!file) return
    setFileName(file.name)

    if (!hasPlantjesExtension(file.name)) {
      setFileError(`Choose a file that ends in ${BACKUP_EXTENSION}.`)
      return
    }

    if (file.size > MAX_BACKUP_BYTES) {
      setFileError(`Backups must be ${formatSize(MAX_BACKUP_BYTES)} or smaller.`)
      return
    }

    try {
      const result = parsePlantjes(await file.text())
      if (!result.ok) {
        setFileError(result.error)
        return
      }
      setParsed(result)
    } catch {
      setFileError('The file could not be read. Try choosing it again.')
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    void readFile(file)
  }

  async function confirmImport() {
    if (!parsed) return
    setImporting(true)
    await onImport(parsed)
    setImporting(false)
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
        aria-labelledby="import-dialog-title"
      >
        <div className="dialog-header">
          <div>
            <p className="eyebrow">RESTORE</p>
            <h2 id="import-dialog-title">Import a plant journal</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close dialog">
            <X size={19} />
          </button>
        </div>

        <p className="dialog-intro">
          Choose a <strong>{BACKUP_EXTENSION}</strong> backup from this device. The file is
          checked before anything is changed.
        </p>

        <div className="backup-form">
          <label className="backup-file-picker">
            <input
              type="file"
              accept={BACKUP_EXTENSION}
              onChange={handleFileChange}
              aria-label={`Choose a ${BACKUP_EXTENSION} backup file`}
            />
            <span className="button button-outline">
              <FileUp size={16} /> {fileName ? 'Choose another file' : `Choose ${BACKUP_EXTENSION} file`}
            </span>
          </label>

          {fileName && (
            <p className="backup-file-name"><strong>{fileName}</strong></p>
          )}

          {parsed && (
            <>
              <p className="backup-valid" role="status">
                <Check size={16} aria-hidden="true" />
                <span>
                  <strong>Backup validated.</strong> This file is ready to restore.
                </span>
              </p>
              <dl className="backup-summary">
                <div>
                  <dt>Plants</dt>
                  <dd>{parsed.plants.length}</dd>
                </div>
                <div>
                  <dt>Locations</dt>
                  <dd>{parsed.locations.length}</dd>
                </div>
                <div>
                  <dt>Photos</dt>
                  <dd>{parsed.imageCount}</dd>
                </div>
              </dl>
              <p className="backup-warning">
                Importing replaces the <strong>{currentPlantCount}</strong>{' '}
                {currentPlantCount === 1 ? 'plant' : 'plants'} and{' '}
                <strong>{currentLocationCount}</strong>{' '}
                {currentLocationCount === 1 ? 'location' : 'locations'} currently saved on this
                device. This cannot be undone.
              </p>
            </>
          )}

          {message && (
            <p className="form-error" role="alert">
              <AlertCircle size={14} /><span>{message}</span>
            </p>
          )}
        </div>

        <div className="dialog-footer">
          <span><Check size={14} /> Nothing changes until you confirm</span>
          <div>
            <button type="button" className="button button-quiet" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="button button-primary"
              disabled={!parsed || importing}
              onClick={() => void confirmImport()}
            >
              <FileUp size={16} /> {importing ? 'Importing…' : 'Replace collection'}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
