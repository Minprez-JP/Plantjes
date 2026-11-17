import { Check, Droplets, Leaf, Sun } from 'lucide-react'
import type { Plant } from '../db'
import { DUE_LIST_LIMIT } from '../lib/constants'
import type { PlantRow } from '../types'

interface CareSidebarProps {
  dueRows: PlantRow[]
  dueFeedRows: PlantRow[]
  feedingTrackedCount: number
  onWater: (plant: Plant) => void
  onFertilize: (plant: Plant) => void
}

export function CareSidebar({
  dueRows,
  dueFeedRows,
  feedingTrackedCount,
  onWater,
  onFertilize,
}: CareSidebarProps) {
  const visibleRows = dueRows.slice(0, DUE_LIST_LIMIT)
  const remainingCount = dueRows.length - visibleRows.length
  const visibleFeedRows = dueFeedRows.slice(0, DUE_LIST_LIMIT)
  const remainingFeedCount = dueFeedRows.length - visibleFeedRows.length

  return (
    <aside className="care-aside">
      <section className="care-panel">
        <div className="aside-heading">
          <div><p className="eyebrow">A QUICK CHECK-IN</p><h2>Watering list</h2></div>
          <span className="count-pill">{dueRows.length}</span>
        </div>

        {visibleRows.length > 0 ? (
          <ul className="due-list">
            {visibleRows.map(({ plant }) => (
              <li key={plant.id}>
                <span className="due-plant-icon"><Droplets size={15} /></span>
                <span className="due-plant-name">
                  <strong>{plant.name}</strong>
                  <small>{plant.location || plant.environment}</small>
                </span>
                <button
                  className="water-mini"
                  title={`Mark ${plant.name} as watered`}
                  aria-label={`Mark ${plant.name} as watered`}
                  onClick={() => void onWater(plant)}
                >
                  <Check size={15} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="all-caught-up">
            <span className="sun-doodle"><Sun size={22} /></span>
            <p>All caught up.<br /><strong>Your plants are looking good.</strong></p>
          </div>
        )}

        {remainingCount > 0 && <p className="more-due">and {remainingCount} more plants</p>}
      </section>

      <section className="conditions-panel feeding-panel" aria-label="Feeding list">
        <div className="conditions-image" role="img" aria-label="Sunlit green leaves" />
        <div className="feeding-copy">
          <div className="feeding-surface">
            <div className="aside-heading feeding-heading">
              <div><p className="eyebrow">A QUICK CHECK-IN</p><h2>Feeding list</h2></div>
              <span className="count-pill count-pill-feed">{dueFeedRows.length}</span>
            </div>

            {visibleFeedRows.length > 0 ? (
              <ul className="due-list feeding-list">
                {visibleFeedRows.map(({ plant }) => (
                  <li key={plant.id}>
                    <span className="due-plant-icon due-feed-icon"><Leaf size={15} /></span>
                    <span className="due-plant-name">
                      <strong>{plant.name}</strong>
                      <small>{plant.location || plant.environment}</small>
                    </span>
                    <button
                      className="water-mini feed-mini"
                      title={`Mark ${plant.name} as fertilized`}
                      aria-label={`Mark ${plant.name} as fertilized`}
                      onClick={() => void onFertilize(plant)}
                    >
                      <Check size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="all-caught-up feeding-empty-state">
                <span className="sun-doodle"><Leaf size={22} /></span>
                <p>
                  {feedingTrackedCount > 0 ? 'All fed.' : 'No feeding schedule yet.'}
                  <br />
                  <strong>
                    {feedingTrackedCount > 0
                      ? 'Your plants are on schedule.'
                      : 'Add a feeding interval to track it.'}
                  </strong>
                </p>
              </div>
            )}

            {remainingFeedCount > 0 && <p className="more-due">and {remainingFeedCount} more plants</p>}
          </div>
        </div>
      </section>

      <p className="privacy-note"><span className="privacy-lock">●</span> Your plant journal stays in this browser.</p>
    </aside>
  )
}
