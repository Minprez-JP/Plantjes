import { memo } from 'react'
import {
  Droplets,
  Earth,
  FlaskConical,
  FlaskConicalOff,
  Info,
  Layers,
  Leaf,
  MapPin,
  Pencil,
  Scissors,
  Snowflake,
  Sun,
  Thermometer,
  Trash2,
  Wheat,
  WheatOff,
  Wind,
} from 'lucide-react'
import type { Plant } from '../db'
import { useObjectUrl } from '../hooks/useObjectUrl'
import { FALLBACK_PLANT_IMAGE } from '../lib/constants'
import { hasStoredNote } from '../lib/notes'
import {
  formatDue,
  formatLastWatered,
} from '../lib/dates'
import {
  formatHumidity,
  formatSoilSummary,
  formatTemperatureRange,
} from '../lib/plants'

interface PlantCardProps {
  plant: Plant
  daysLeft: number
  fertilizerDaysLeft: number | null
  onWater: (plant: Plant) => void
  onFertilize: (plant: Plant) => void
  onEdit: (plant: Plant) => void
  onEditCare: (plant: Plant) => void
  onOpenNote: (plant: Plant) => void
  onDelete: (plant: Plant) => void
}

export const PlantCard = memo(function PlantCard({
  plant,
  daysLeft,
  fertilizerDaysLeft,
  onWater,
  onFertilize,
  onEdit,
  onEditCare,
  onOpenNote,
  onDelete,
}: PlantCardProps) {
  const storedImageUrl = useObjectUrl(plant.imageBlob)
  const isDue = daysLeft <= 0
  const feedDue = fertilizerDaysLeft !== null && fertilizerDaysLeft <= 0
  const image = storedImageUrl || FALLBACK_PLANT_IMAGE
  const temperature = formatTemperatureRange(plant.minTemperature, plant.maxTemperature)
  const humidity = formatHumidity(plant.minHumidity, plant.maxHumidity)
  const soilSummary = formatSoilSummary(plant)
  const hasNote = hasStoredNote(plant.notes)
  const lastWatered = formatLastWatered(plant.lastWateredAt)

  return (
    <article className="plant-card">
      <div className="plant-photo">
        {/* codeql[js/xss-through-dom] False positive: React escapes JSX attributes, and useObjectUrl only returns opaque same-origin blob: URLs, which <img src> cannot execute. See issue #24. Review by 2027-02-18. */}
        <img className="plant-photo-image" src={image} alt="" loading="lazy" decoding="async" />
        <span className={isDue ? 'plant-status status-due' : 'plant-status'}>
          <span />{isDue ? 'Needs water' : formatDue(daysLeft)}
        </span>
        <div className="card-actions">
          <button title={`Edit ${plant.name}`} aria-label={`Edit ${plant.name}`} onClick={() => onEdit(plant)}>
            <Pencil size={14} />
          </button>
          <button title={`Remove ${plant.name}`} aria-label={`Remove ${plant.name}`} onClick={() => onDelete(plant)}>
            <Trash2 size={14} />
          </button>
        </div>
        <button
          type="button"
          className={hasNote ? 'note-action has-note' : 'note-action'}
          title={hasNote ? `View note for ${plant.name}` : `Add note for ${plant.name}`}
          aria-label={hasNote ? `View note for ${plant.name}` : `Add note for ${plant.name}`}
          aria-haspopup="dialog"
          onClick={() => onOpenNote(plant)}
        >
          <Info size={15} aria-hidden />
          {hasNote && <span className="note-action-dot" aria-hidden />}
        </button>
        {plant.pruningTime?.trim() && (
          <button
            type="button"
            className="care-action"
            title={`View pruning details for ${plant.name}`}
            aria-label={`View pruning details for ${plant.name}`}
            aria-haspopup="dialog"
            onClick={() => onEditCare(plant)}
          >
            <Scissors size={14} aria-hidden />
          </button>
        )}
      </div>

      <div className="plant-card-body">
        <div className="plant-title-row">
          <div className="plant-name">
            <h3>{plant.name}</h3>
            <p className="species-name">{plant.species || 'Plant'}</p>
          </div>
          <div className="plant-environment">
            <span className={plant.environment === 'Indoor' ? 'environment-tag indoor-tag' : 'environment-tag outdoor-tag'}>
              {plant.environment}
            </span>
            {plant.origin && <span className="plant-origin"><Earth size={13} />{plant.origin}</span>}
          </div>
        </div>

        <div className="plant-facts-top">
          <span><MapPin size={13} /><strong>{plant.location || (plant.environment === 'Indoor' ? 'Indoors' : 'Garden')}</strong></span>
          <span>
            {plant.edibility === 'Yes' ? <Wheat size={13} /> : <WheatOff size={13} />}
            <strong>{plant.edibility === 'Yes' ? 'Edible' : 'Inedible'}</strong>
          </span>
          <span>
            {plant.toxicity === 'Yes' ? <FlaskConical size={13} /> : <FlaskConicalOff size={13} />}
            <strong>{plant.toxicity === 'Yes' ? 'Toxic' : 'Non-toxic'}</strong>
          </span>
        </div>

        <div className={plant.fertilizeEveryDays === undefined ? 'plant-facts' : 'plant-facts plant-facts-with-feeding'}>
          <div><Droplets size={15} /><span><small>WATER</small><strong>Every {plant.waterEveryDays} days</strong></span></div>
          <div><Sun size={15} /><span><small>LIGHT</small><strong>{plant.light}</strong></span></div>
          {plant.fertilizeEveryDays !== undefined && (
            <div className="plant-fact-feeding">
              <Leaf size={15} />
              <span>
                <small>FEEDING</small>
                <strong>Every {plant.fertilizeEveryDays} days</strong>
                {plant.fertilizerType && (
                  <small className="plant-fact-note">{plant.fertilizerType}</small>
                )}
              </span>
            </div>
          )}
        </div>

        {(temperature || humidity) && (
          <div className="condition-line">
            {temperature && <span><Thermometer size={13} />{temperature}</span>}
            {humidity && <span><Droplets size={13} />{humidity}</span>}
          </div>
        )}

        {soilSummary && (
          <p className="soil-summary"><Layers size={13} /><span>{soilSummary}</span></p>
        )}

        {plant.environment === 'Outdoor' && plant.minTemperature !== undefined && (
          <div className={plant.winterHardy ? 'winter-hardiness is-hardy' : 'winter-hardiness is-not-hardy'}>
            <Snowflake size={13} />
            <span>Winter-hardy: <strong>{plant.winterHardy ? 'Yes' : 'No'}</strong></span>
          </div>
        )}

        {plant.environment === 'Indoor' && plant.draftSensitive && (
          <div className="draft-sensitivity"><Wind size={13} /><span>Not resistant to drafts</span></div>
        )}

        <div className="plant-card-footer">
          {plant.fertilizeEveryDays !== undefined && (
            <button
              className={feedDue ? 'water-button fertilizer-button is-due' : 'water-button fertilizer-button'}
              onClick={() => onFertilize(plant)}
            >
              <Leaf size={14} /> {feedDue ? 'Feed now' : 'Fertilize'}
            </button>
          )}
          <span className="last-watered" aria-label={`Last watered ${lastWatered}`}>
            <Droplets size={13} aria-hidden />
            {lastWatered}
          </span>
          <button className={isDue ? 'water-button is-due' : 'water-button'} onClick={() => onWater(plant)}>
            <Droplets size={14} /> Water
          </button>
        </div>
      </div>
    </article>
  )
})
