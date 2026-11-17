import { CalendarDays, Check, Droplets, Leaf } from 'lucide-react'

interface OverviewStripProps {
  plantCount: number
  dueCount: number
  wateredCount: number
  nextFeedingLabel: string
}

export function OverviewStrip({ plantCount, dueCount, wateredCount, nextFeedingLabel }: OverviewStripProps) {
  return (
    <section className="overview" aria-label="Plant care overview">
      <div className="overview-item">
        <span className="overview-icon overview-icon-green"><Leaf size={18} /></span>
        <div><span className="overview-label">IN YOUR CARE</span><strong>{plantCount}<small> plants</small></strong></div>
      </div>
      <div className="overview-item">
        <span className="overview-icon overview-icon-orange"><Droplets size={18} /></span>
        <div><span className="overview-label">READY FOR A DRINK</span><strong>{dueCount}<small> plants</small></strong></div>
      </div>
      <div className="overview-item">
        <span className="overview-icon overview-icon-blue"><Check size={18} /></span>
        <div><span className="overview-label">ON THEIR RHYTHM</span><strong>{wateredCount}<small> plants</small></strong></div>
      </div>
      <div className="overview-item overview-item-feed">
        <span className="overview-icon overview-icon-gold"><CalendarDays size={18} /></span>
        <div>
          <span className="overview-label">NEXT FEEDING</span>
          <strong className="overview-feeding-value">{nextFeedingLabel}</strong>
        </div>
      </div>
    </section>
  )
}
