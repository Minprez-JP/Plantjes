import { Download, PlantPot, Plus, Upload } from 'lucide-react'

interface TopBarProps {
  onAddPlant: () => void
  onExport: () => void
  onImport: () => void
}

export function TopBar({ onAddPlant, onExport, onImport }: TopBarProps) {
  return (
    <header className="topbar">
      <a className="brand" href="#top" aria-label="Plantjes home">
        <span className="brand-mark"><PlantPot size={24} strokeWidth={2} /></span>
        <span>Plantjes<span className="brand-period">.</span></span>
      </a>
      <div className="topbar-right">
        <div className="local-badge-group">
          <span className="local-badge">
            <span className="local-dot" />
            <span className="local-badge-text">Saved on this device</span>
          </span>
          <div className="backup-actions" role="group" aria-label="Back up your plant journal">
            <button
              type="button"
              className="backup-action"
              onClick={onImport}
              aria-label="Import a plant journal backup"
              title="Import a .plantjes backup"
            >
              <Upload size={14} /> <span>Import</span>
            </button>
            <button
              type="button"
              className="backup-action"
              onClick={onExport}
              aria-label="Export a plant journal backup"
              title="Export a .plantjes backup"
            >
              <Download size={14} /> <span>Export</span>
            </button>
          </div>
        </div>
        <button className="button button-primary top-add" onClick={onAddPlant}>
          <Plus size={17} /> <span>Add plant</span>
        </button>
      </div>
    </header>
  )
}
