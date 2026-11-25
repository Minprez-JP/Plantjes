import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, Droplets, Plus, Search, SlidersHorizontal, X } from 'lucide-react'
import { CARE_FILTERS, FALLBACK_PLANT_IMAGE } from '../lib/constants'
import { formatDue } from '../lib/dates'
import { useObjectUrl } from '../hooks/useObjectUrl'
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
  /** The mobile shell uses a denser, bottom-sheet based toolbar. */
  mobile?: boolean
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
  mobile = false,
}: CollectionSectionProps) {
  const [filter, setFilter] = useState<Filter>('All plants')
  const [location, setLocation] = useState('')
  const [care, setCare] = useState<CareFilter>('Any care')
  const [query, setQuery] = useState('')
  const [careNotice, setCareNotice] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<number | undefined>()

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

  useEffect(() => {
    if (expandedId === undefined) return
    if (visibleRows.some(({ plant }) => plant.id === expandedId)) return
    setExpandedId(undefined)
  }, [expandedId, visibleRows])

  const activeFilterCount = [
    filter !== 'All plants',
    location !== '',
    care !== 'Any care',
    query !== '',
  ].filter(Boolean).length

  useEffect(() => {
    if (!mobile || !filtersOpen) return

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFiltersOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [filtersOpen, mobile])

  const clearFilters = useCallback(() => {
    setQuery('')
    setFilter('All plants')
    setLocation('')
    setCare('Any care')
    setCareNotice('')
    setFiltersOpen(false)
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
    <section className={mobile ? 'plant-section mobile-collection' : 'plant-section'}>
      {!mobile && (
        <div className="section-heading">
          <div>
            <p className="eyebrow">THE COLLECTION</p>
            <h2>Your plants <span>{rows.length.toString().padStart(2, '0')}</span></h2>
          </div>
          <button className="button button-outline desktop-add" onClick={onAdd}>
            <Plus size={16} /> Add plant
          </button>
        </div>
      )}

      {mobile ? (
        <>
          <div className="mobile-collection-tools">
            <label className="search-box">
              <Search size={18} aria-hidden="true" />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setCareNotice('')
                }}
                placeholder="Search plants"
                aria-label="Find a plant"
              />
            </label>
            <div className="mobile-filter-row">
              <FilterTabs
                value={filter}
                onChange={(value) => {
                  setFilter(value)
                  setCareNotice('')
                }}
              />
              <button
                type="button"
                className={activeFilterCount > 0 ? 'mobile-filter-button is-active' : 'mobile-filter-button'}
                aria-label="Open plant filters"
                aria-haspopup="dialog"
                onClick={() => setFiltersOpen(true)}
              >
                <SlidersHorizontal size={19} aria-hidden="true" />
                {activeFilterCount > 0 && (
                  <span className="mobile-filter-count" aria-hidden="true">{activeFilterCount}</span>
                )}
              </button>
            </div>
          </div>

          <p className="mobile-collection-summary">
            {loading
              ? 'Opening your plant journal…'
              : rows.length === 0
                ? 'No plants yet'
                : `${visibleRows.length} of ${rows.length} ${rows.length === 1 ? 'plant' : 'plants'}${dueWaterCount > 0 ? ` · ${dueWaterCount} ${dueWaterCount === 1 ? 'needs' : 'need'} water` : ''}`}
          </p>
        </>
      ) : (
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
      )}

      {error && <div className="error-banner" role="alert">{error}</div>}

      {!loading && visibleRows.length > 0 && !mobile && (
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

      {!mobile && careNotice && <p className="bulk-care-notice" role="status">{careNotice}</p>}

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
        <div className={mobile ? 'plant-grid mobile-plant-browse' : 'plant-grid'}>
          {visibleRows.map(({ plant, daysLeft, fertilizerDaysLeft }) =>
            mobile ? (
              <MobilePlantBrowseRow
                key={plant.id}
                plant={plant}
                daysLeft={daysLeft}
                fertilizerDaysLeft={fertilizerDaysLeft}
                expanded={expandedId === plant.id}
                onToggle={() =>
                  setExpandedId((current) => (current === plant.id ? undefined : plant.id))
                }
                onWater={onWater}
                onFertilize={onFertilize}
                onEdit={onEdit}
                onEditCare={onEditCare}
                onOpenNote={onOpenNote}
                onDelete={onDelete}
              />
            ) : (
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
            ),
          )}
        </div>
      )}

      {mobile && filtersOpen && (
        <div
          className="dialog-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setFiltersOpen(false)
          }}
        >
          <section
            className="plant-dialog mobile-filter-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-filter-title"
            tabIndex={-1}
          >
            <div className="dialog-header">
              <div>
                <p className="eyebrow">COLLECTION</p>
                <h2 id="mobile-filter-title">Filter plants</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="Close dialog"
                autoFocus
                onClick={() => setFiltersOpen(false)}
              >
                <X size={19} />
              </button>
            </div>

            <p className="dialog-intro">
              Showing <strong>{visibleRows.length}</strong> of {rows.length} plants.
            </p>

            <div className="mobile-filter-fields">
              <label className="mobile-filter-field">
                <span>Location</span>
                <FilterSelect
                  label="Filter by location"
                  value={location}
                  options={locationOptions}
                  onChange={(value) => {
                    setLocation(value)
                    setCareNotice('')
                  }}
                />
              </label>
              <label className="mobile-filter-field">
                <span>Care</span>
                <FilterSelect
                  label="Filter by care"
                  value={care}
                  options={CARE_OPTIONS}
                  onChange={(value) => {
                    setCare(value)
                    setCareNotice('')
                  }}
                />
              </label>
            </div>

            <footer className="dialog-footer">
              <div>
                <button type="button" className="button button-outline" onClick={clearFilters}>
                  Clear filters
                </button>
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => setFiltersOpen(false)}
                >
                  Show {visibleRows.length} {visibleRows.length === 1 ? 'plant' : 'plants'}
                </button>
              </div>
            </footer>
          </section>
        </div>
      )}
    </section>
  )
}

interface MobilePlantBrowseRowProps {
  plant: Plant
  daysLeft: number
  fertilizerDaysLeft: number | null
  expanded: boolean
  onToggle: () => void
  onWater: (plant: Plant) => void
  onFertilize: (plant: Plant) => void
  onEdit: (plant: Plant) => void
  onEditCare: (plant: Plant) => void
  onOpenNote: (plant: Plant) => void
  onDelete: (plant: Plant) => void
}

function MobilePlantBrowseRow({
  plant,
  daysLeft,
  fertilizerDaysLeft,
  expanded,
  onToggle,
  onWater,
  onFertilize,
  onEdit,
  onEditCare,
  onOpenNote,
  onDelete,
}: MobilePlantBrowseRowProps) {
  const photoUrl = useObjectUrl(plant.imageBlob)
  const due = daysLeft <= 0
  const detailId = `mobile-plant-detail-${plant.id ?? plant.name}`

  return (
    <article className={expanded ? 'mobile-plant-row is-expanded' : 'mobile-plant-row'}>
      <button
        type="button"
        className="mobile-plant-row-toggle"
        aria-expanded={expanded}
        aria-controls={detailId}
        onClick={onToggle}
      >
        <img
          className="mobile-plant-row-photo"
          src={photoUrl || FALLBACK_PLANT_IMAGE}
          alt=""
          aria-hidden="true"
        />
        <span className="mobile-plant-row-copy">
          <span className="mobile-plant-row-name">{plant.name}</span>
          <span className={due ? 'mobile-plant-row-due is-due' : 'mobile-plant-row-due'}>
            <Droplets size={14} aria-hidden="true" />
            <span>{formatDue(daysLeft)}</span>
          </span>
        </span>
        <ChevronDown
          size={20}
          className={expanded ? 'mobile-plant-row-chevron is-expanded' : 'mobile-plant-row-chevron'}
          aria-hidden="true"
        />
      </button>

      <div
        id={detailId}
        className="mobile-plant-row-detail"
        hidden={!expanded}
        aria-hidden={!expanded}
      >
        {expanded && (
          <PlantCard
            plant={plant}
            daysLeft={daysLeft}
            fertilizerDaysLeft={fertilizerDaysLeft}
            onWater={onWater}
            onFertilize={onFertilize}
            onEdit={onEdit}
            onEditCare={onEditCare}
            onOpenNote={onOpenNote}
            onDelete={onDelete}
            showPhoto={false}
          />
        )}
      </div>
    </article>
  )
}
