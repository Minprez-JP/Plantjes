import { Flower2, Leaf, Plus } from 'lucide-react'

interface EmptyStateProps {
  onAdd: () => void
}

export function EmptyState({ onAdd }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-photo">
        <span className="empty-photo-label"><Leaf size={13} /> A fresh start</span>
      </div>
      <div className="empty-copy">
        <span className="empty-flower"><Flower2 size={23} /></span>
        <p className="eyebrow">ROOM TO GROW</p>
        <h3>Your plant story<br />starts right here.</h3>
        <p>Add a plant to keep its watering rhythm and favorite conditions close at hand.</p>
        <button className="button button-primary" onClick={onAdd}><Plus size={17} /> Add your first plant</button>
      </div>
    </div>
  )
}
