import { useCallback, useEffect, useMemo, useState } from 'react'
import { Droplets, Plus, Search } from 'lucide-react'
import { CARE_FILTERS } from '../lib/constants'
import { filterPlantRows, isWateringDue, listPlantLocations } from '../lib/plants'
import type { CareFilter, Filter, PlantFilters, PlantRow } from '../types'
import type { Plant } from '../db'
import { EmptyState } from './EmptyState'
import { FilterSelect, type FilterSelectOption } from './FilterSelect'
import { FilterTabs } from './FilterTabs'
import { PlantCard } from './PlantCard'

const ANY_LOCATION: FilterSelectOption = { value: '', label: 'Any location' }
const CARE_OPTIONS: readonly FilterSelectOption<CareFilter>[] = CARE_FILTERS.map((care) => ({
  value: care,
  label: care,
}))

interface CollectionSectionProps {
  rows: PlantRow[]
  loading: boolean
  error: string
  onAdd: () => void
  onEdit: (plant: Plant) => void
  onEditCare: (plant: Plant) => void
  onOpenNote: (plant: Plant) => void
  onWater: (plant: Plant) => void
  onWaterMany: (plants: readonly Plant[]) => Promise<boolean>
  onFertilize: (plant: Plant) => void
  onDelete: (plant: Plant) => void
}

export function CollectionSection({
  rows,
  loading,
  error,
  onAdd,
  onEdit,
  onEditCare,
  onOpenNote,
  onWater,
  onWaterMany,
  onFertilize,
  onDelete,
}: CollectionSectionProps) {
  const [filter, setFilter] = useState<Filter>('All plants')
  const [location, setLocation] = useState('')
  const [care, setCare] = useState<CareFilter>('Any care')
  const [query, setQuery] = useState('')
  const [careNotice, setCareNotice] = useState('')

  const locationOptions = useMemo<FilterSelectOption[]>(() => [
    ANY_LOCATION,
    ...listPlantLocations(rows.map(({ plant }) => plant)).map((name) => ({
      value: name,
      label: name,
    })),
  ], [rows])

  // Deleting a location's last plant should not leave the toolbar stuck on a
  // now-impossible choice.
  useEffect(() => {
    if (!location) return
    if (!locationOptions.some((option) => option.value === location)) setLocation('')
  }, [location, locationOptions])

  const filters = useMemo<PlantFilters>(
    () => ({ environment: filter, location, care, query }),
    [filter, location, care, query],
  )

  const visibleRows = useMemo(() => filterPlantRows(rows, filters), [rows, filters])
  const dueWaterCount = useMemo(
    () => visibleRows.filter(isWateringDue).length,
    [visibleRows],
  )

  const clearFilters = useCallback(() => {
    setQuery('')
    setFilter('All plants')
    setLocation('')
    setCare('Any care')
    setCareNotice('')
  }, [])

  const waterDue = useCallback(async () => {
    const targets = visibleRows.filter(isWateringDue).map(({ plant }) => plant)
    if (targets.length === 0) return

    setCareNotice('')
    if (await onWaterMany(targets)) {
      setCareNotice(`Watered ${targets.length} ${targets.length === 1 ? 'plant' : 'plants'}.`)
    }
  }, [onWaterMany, visibleRows])

  const waterAll = useCallback(async () => {
    if (visibleRows.length === 0) return

    const count = visibleRows.length
    const noun = count === 1 ? 'plant' : 'plants'
    if (!window.confirm(
      `Water all ${count} shown ${noun}? This resets their watering schedules, including plants that are not due yet.`,
    )) {
      return
    }

    setCareNotice('')
    if (await onWaterMany(visibleRows.map(({ plant }) => plant))) {
      setCareNotice(`Watered all ${count} shown ${noun}.`)
    }
  }, [onWaterMany, visibleRows])

  return (
    <section className="plant-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">THE COLLECTION</p>
          <h2>Your plants <span>{rows.length.toString().padStart(2, '0')}</span></h2>
        </div>
        <button className="button button-outline desktop-add" onClick={onAdd}>
          <Plus size={16} /> Add plant
        </button>
      </div>

      <div className="collection-tools">
        <div className="collection-filters">
          <FilterTabs
            value={filter}
            onChange={(value) => {
              setFilter(value)
              setCareNotice('')
            }}
          />
          <FilterSelect
            label="Filter by location"
            value={location}
            options={locationOptions}
            onChange={(value) => {
              setLocation(value)
              setCareNotice('')
            }}
          />
          <FilterSelect
            label="Filter by care"
            value={care}
            options={CARE_OPTIONS}
            onChange={(value) => {
              setCare(value)
              setCareNotice('')
            }}
          />
        </div>
        <label className="search-box">
          <Search size={16} />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setCareNotice('')
            }}
            placeholder="Find a plant"
            aria-label="Find a plant"
          />
        </label>
      </div>

      {error && <div className="error-banner" role="alert">{error}</div>}

      {!loading && visibleRows.length > 0 && (
        <section className="bulk-care" aria-label="Water the visible plants">
          <p className="bulk-care-summary">
            <strong>{visibleRows.length}</strong> {visibleRows.length === 1 ? 'plant' : 'plants'} shown{' '}
            <span className={dueWaterCount > 0 ? 'bulk-care-due' : 'bulk-care-clear'}>
              {dueWaterCount > 0
                ? `${dueWaterCount} ${dueWaterCount === 1 ? 'needs' : 'need'} water`
                : 'none need water'}
            </span>
          </p>
          <div className="bulk-care-actions">
            <button
              className="button button-outline"
              disabled={dueWaterCount === 0}
              aria-label={`Water ${dueWaterCount} due ${dueWaterCount === 1 ? 'plant' : 'plants'} shown`}
              onClick={() => void waterDue()}
            >
              <Droplets size={15} /> Water due ({dueWaterCount})
            </button>
            <button
              className="button button-outline"
              aria-label={`Water all ${visibleRows.length} shown ${visibleRows.length === 1 ? 'plant' : 'plants'}`}
              onClick={() => void waterAll()}
            >
              <Droplets size={15} /> Water all shown ({visibleRows.length})
            </button>
          </div>
        </section>
      )}

      {careNotice && <p className="bulk-care-notice" role="status">{careNotice}</p>}

      {loading ? (
        <div className="loading-state">Opening your plant journal...</div>
      ) : visibleRows.length === 0 ? (
        rows.length === 0 ? (
          <EmptyState onAdd={onAdd} />
        ) : (
          <div className="no-results">
            <Search size={22} />
            <p>No plants match these filters.</p>
            <button className="text-button" onClick={clearFilters}>Clear filters</button>
          </div>
        )
      ) : (
        <div className="plant-grid">
          {visibleRows.map(({ plant, daysLeft, fertilizerDaysLeft }) => (
            <PlantCard
              key={plant.id}
              plant={plant}
              daysLeft={daysLeft}
              fertilizerDaysLeft={fertilizerDaysLeft}
              onWater={onWater}
              onFertilize={onFertilize}
              onEdit={onEdit}
              onEditCare={onEditCare}
              onOpenNote={onOpenNote}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </section>
  )
}
