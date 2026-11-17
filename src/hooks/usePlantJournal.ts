import { useCallback, useEffect, useMemo, useState } from 'react'
import { plantDatabase, type Plant, type PlantLocation } from '../db'
import { optimizeImageBlob } from '../image'
import { buildPlantjesDocument, type ParsedPlantjesSuccess } from '../lib/backup'
import { sortLocations, validateLocationName } from '../lib/locations'
import { parseNote } from '../lib/notes'
import { buildPlantRecord } from '../lib/plantRecord'
import {
  countTrackedFeeding,
  formatNextFeeding,
  selectFertilizerDueRows,
  selectDueRows,
  toPlantRows,
} from '../lib/plants'
import type { AddLocationResult, CareDetails, PlantFormSubmission, PlantRow } from '../types'
import { useStoredPhotoBackfill } from './useStoredPhotoBackfill'

const LOAD_ERROR =
  'Your browser could not open the local plant database. Try a current version of Chrome, Firefox, or Safari.'
const SAVE_ERROR =
  'The plant could not be saved. Browser storage may be full or unavailable. Your changes are still in this form.'
const WATER_ERROR =
  'The plant could not be marked as watered. Browser storage may be unavailable.'
const WATER_MANY_ERROR =
  'The plants could not be marked as watered. Browser storage may be unavailable, so no changes were made.'
const FERTILIZE_ERROR =
  'The plant could not be marked as fertilized. Browser storage may be unavailable.'
const REMOVE_ERROR =
  'The plant could not be removed. Browser storage may be unavailable.'
const CARE_ERROR =
  'The care details could not be saved. Browser storage may be full or unavailable.'
const NOTE_ERROR =
  'The note could not be saved. Browser storage may be full or unavailable.'
/** An empty update would be a no-op, so Clear writes every optional pruning field explicitly. */
const CLEARED_CARE: CareDetails = {
  pruningTime: '',
  expectedHeightCm: undefined,
  heightAfterPruningCm: undefined,
  pruningNotes: '',
}
const LOCATION_ERROR =
  'The location could not be saved. Browser storage may be full or unavailable.'
const EXPORT_ERROR =
  'The backup could not be created. Try again, or use a browser that allows local downloads.'
const IMPORT_ERROR =
  'The backup could not be imported. Browser storage may be full or unavailable, so your existing plants were not changed.'

function isConstraintError(error: unknown) {
  return error instanceof Error && error.name === 'ConstraintError'
}

export interface PlantJournal {
  rows: PlantRow[]
  dueRows: PlantRow[]
  dueFeedRows: PlantRow[]
  wateredCount: number
  feedingTrackedCount: number
  nextFeedingLabel: string
  loading: boolean
  loadError: string
  actionError: string
  locations: PlantLocation[]
  formOpen: boolean
  editingPlant: Plant | null
  saveError: string
  carePlant: Plant | null
  careError: string
  notePlant: Plant | null
  noteError: string
  exportOpen: boolean
  exportError: string
  importOpen: boolean
  importError: string
  openNewPlant: () => void
  openEditPlant: (plant: Plant) => void
  closeForm: () => void
  savePlant: (submission: PlantFormSubmission) => Promise<void>
  addLocation: (name: string) => Promise<AddLocationResult>
  openCareDetails: (plant: Plant) => void
  closeCareDetails: () => void
  saveCare: (details: CareDetails) => Promise<void>
  openNote: (plant: Plant) => void
  closeNote: () => void
  saveNote: (note: string) => Promise<void>
  openExport: () => void
  closeExport: () => void
  exportJournal: (fileName: string) => Promise<boolean>
  openImport: () => void
  closeImport: () => void
  importJournal: (backup: ParsedPlantjesSuccess) => Promise<boolean>
  waterPlant: (plant: Plant) => Promise<void>
  waterPlants: (plants: readonly Plant[]) => Promise<boolean>
  fertilizePlant: (plant: Plant) => Promise<void>
  removePlant: (plant: Plant) => Promise<void>
}

/**
 * Owns the plant collection and the add/edit dialog: loading, persistence,
 * local state updates, and derived watering data. Components stay presentational.
 */
export function usePlantJournal(): PlantJournal {
  const [plants, setPlants] = useState<Plant[]>([])
  const [locations, setLocations] = useState<PlantLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingPlant, setEditingPlant] = useState<Plant | null>(null)
  const [saveError, setSaveError] = useState('')
  const [carePlant, setCarePlant] = useState<Plant | null>(null)
  const [careError, setCareError] = useState('')
  const [notePlant, setNotePlant] = useState<Plant | null>(null)
  const [noteError, setNoteError] = useState('')
  const [exportOpen, setExportOpen] = useState(false)
  const [exportError, setExportError] = useState('')
  const [importOpen, setImportOpen] = useState(false)
  const [importError, setImportError] = useState('')

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const [storedPlants, storedLocations] = await Promise.all([
          plantDatabase.plants.toArray(),
          plantDatabase.locations.toArray(),
        ])
        if (!cancelled) {
          setPlants(storedPlants)
          setLocations(sortLocations(storedLocations))
          setLoadError('')
        }
      } catch {
        if (!cancelled) setLoadError(LOAD_ERROR)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  useStoredPhotoBackfill(plants, setPlants)

  const rows = useMemo(() => toPlantRows(plants), [plants])
  const dueRows = useMemo(() => selectDueRows(rows), [rows])
  const dueFeedRows = useMemo(() => selectFertilizerDueRows(rows), [rows])
  const feedingTrackedCount = useMemo(() => countTrackedFeeding(rows), [rows])
  const nextFeedingLabel = useMemo(() => formatNextFeeding(rows), [rows])
  const wateredCount = rows.length - dueRows.length

  const openNewPlant = useCallback(() => {
    setEditingPlant(null)
    setSaveError('')
    setFormOpen(true)
  }, [])

  const openEditPlant = useCallback((plant: Plant) => {
    setEditingPlant(plant)
    setSaveError('')
    setFormOpen(true)
  }, [])

  const closeForm = useCallback(() => {
    setFormOpen(false)
    setEditingPlant(null)
    setSaveError('')
  }, [])

  const addLocation = useCallback(async (raw: string): Promise<AddLocationResult> => {
    const validation = validateLocationName(raw)
    if (!validation.ok) return validation

    const known = locations.find((item) => item.normalizedName === validation.normalizedName)
    if (known) return { ok: true, location: known }

    const record: PlantLocation = {
      name: validation.name,
      normalizedName: validation.normalizedName,
    }

    try {
      const id = await plantDatabase.locations.add(record)
      const saved: PlantLocation = { ...record, id }
      setLocations((current) => sortLocations([...current, saved]))
      return { ok: true, location: saved }
    } catch (error) {
      if (!isConstraintError(error)) return { ok: false, error: LOCATION_ERROR }

      // A concurrent add can trip the unique index; reuse the stored row.
      try {
        const existing = await plantDatabase.locations
          .where('normalizedName')
          .equals(validation.normalizedName)
          .first()
        if (existing) {
          setLocations((current) => (
            current.some((item) => item.normalizedName === existing.normalizedName)
              ? current
              : sortLocations([...current, existing])
          ))
          return { ok: true, location: existing }
        }
      } catch {
        // Fall through to the storage error below.
      }

      return { ok: false, error: LOCATION_ERROR }
    }
  }, [locations])

  const savePlant = useCallback(async ({ values, imageFile, removeImage }: PlantFormSubmission) => {
    setSaveError('')
    const now = new Date().toISOString()

    try {
      const imageBlob = imageFile
        ? await optimizeImageBlob(imageFile)
        : removeImage ? undefined : editingPlant?.imageBlob

      const imageOptimized = imageFile ? true : editingPlant?.imageOptimized
      const savedPlant = buildPlantRecord({
        values,
        previous: editingPlant ?? undefined,
        now,
        imageBlob,
        imageOptimized,
      })

      const id = await plantDatabase.plants.put(savedPlant)
      const persistedPlant: Plant = { ...savedPlant, id }

      setPlants((current) => {
        const index = current.findIndex((plant) => plant.id === id)
        if (index === -1) return [...current, persistedPlant]
        const next = current.slice()
        next[index] = persistedPlant
        return next
      })
      setFormOpen(false)
      setEditingPlant(null)
    } catch {
      setSaveError(SAVE_ERROR)
    }
  }, [editingPlant])

  const openCareDetails = useCallback((plant: Plant) => {
    setCarePlant(plant)
    setCareError('')
  }, [])

  const closeCareDetails = useCallback(() => {
    setCarePlant(null)
    setCareError('')
  }, [])

  const saveCare = useCallback(async (details: CareDetails) => {
    if (carePlant?.id === undefined) return
    setCareError('')
    const changes = Object.keys(details).length > 0 ? details : CLEARED_CARE

    try {
      await plantDatabase.plants.update(carePlant.id, changes)
      setPlants((current) => current.map((item) => (
        item.id === carePlant.id ? { ...item, ...changes } : item
      )))
      setCarePlant(null)
    } catch {
      setCareError(CARE_ERROR)
    }
  }, [carePlant])

  const openNote = useCallback((plant: Plant) => {
    setNotePlant(plant)
    setNoteError('')
  }, [])

  const closeNote = useCallback(() => {
    setNotePlant(null)
    setNoteError('')
  }, [])

  const saveNote = useCallback(async (raw: string) => {
    if (notePlant?.id === undefined) return

    const parsed = parseNote(raw)
    if (!parsed.ok) {
      setNoteError(parsed.error)
      return
    }

    setNoteError('')
    try {
      await plantDatabase.plants.update(notePlant.id, { notes: parsed.note })
      setPlants((current) => current.map((item) => (
        item.id === notePlant.id ? { ...item, notes: parsed.note } : item
      )))
      setNotePlant(null)
    } catch {
      setNoteError(NOTE_ERROR)
    }
  }, [notePlant])

  const openExport = useCallback(() => {
    setExportError('')
    setExportOpen(true)
  }, [])

  const closeExport = useCallback(() => {
    setExportOpen(false)
    setExportError('')
  }, [])

  const exportJournal = useCallback(async (fileName: string) => {
    setExportError('')

    try {
      const backup = await buildPlantjesDocument(plants, locations)
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)

      try {
        const anchor = window.document.createElement('a')
        anchor.href = url
        anchor.download = fileName
        anchor.rel = 'noopener'
        window.document.body.append(anchor)
        anchor.click()
        anchor.remove()
      } finally {
        window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      }

      setExportOpen(false)
      return true
    } catch {
      setExportError(EXPORT_ERROR)
      return false
    }
  }, [locations, plants])

  const openImport = useCallback(() => {
    setImportError('')
    setImportOpen(true)
  }, [])

  const closeImport = useCallback(() => {
    setImportOpen(false)
    setImportError('')
  }, [])

  /**
   * Replaces the whole journal from a validated backup. Plants and locations are
   * cleared and rewritten in one transaction, so a failure leaves the current
   * collection untouched.
   */
  const importJournal = useCallback(async (backup: ParsedPlantjesSuccess) => {
    setImportError('')

    try {
      const { plantIds, locationIds } = await plantDatabase.transaction(
        'rw',
        plantDatabase.plants,
        plantDatabase.locations,
        async () => {
          await plantDatabase.plants.clear()
          await plantDatabase.locations.clear()

          const savedPlantIds = backup.plants.length
            ? await plantDatabase.plants.bulkAdd(backup.plants, { allKeys: true })
            : []
          const savedLocationIds = backup.locations.length
            ? await plantDatabase.locations.bulkAdd(backup.locations, { allKeys: true })
            : []

          return { plantIds: savedPlantIds, locationIds: savedLocationIds }
        },
      )

      setPlants(backup.plants.map((plant, index) => ({ ...plant, id: plantIds[index] })))
      setLocations(sortLocations(
        backup.locations.map((location, index) => ({ ...location, id: locationIds[index] })),
      ))
      setImportOpen(false)
      setFormOpen(false)
      setEditingPlant(null)
      setSaveError('')
      setCarePlant(null)
      setCareError('')
      setNotePlant(null)
      setNoteError('')
      setActionError('')
      return true
    } catch {
      setImportError(IMPORT_ERROR)
      return false
    }
  }, [])

  const waterPlant = useCallback(async (plant: Plant) => {
    if (plant.id === undefined) return
    const lastWateredAt = new Date().toISOString()

    try {
      await plantDatabase.plants.update(plant.id, { lastWateredAt })
      setPlants((current) => current.map((item) => (
        item.id === plant.id ? { ...item, lastWateredAt } : item
      )))
      setActionError('')
    } catch {
      setActionError(WATER_ERROR)
    }
  }, [])

  /**
   * Waters a filtered group in one transaction. Either every record is
   * updated or none are, and state is refreshed once after the commit.
   */
  const waterPlants = useCallback(async (targets: readonly Plant[]) => {
    const ids = [
      ...new Set(
        targets
          .map((plant) => plant.id)
          .filter((id): id is number => id !== undefined),
      ),
    ]
    if (ids.length === 0) return false

    const lastWateredAt = new Date().toISOString()

    try {
      await plantDatabase.transaction('rw', plantDatabase.plants, async () => {
        for (const id of ids) {
          await plantDatabase.plants.update(id, { lastWateredAt })
        }
      })

      const wateredIds = new Set(ids)
      setPlants((current) => current.map((item) => (
        item.id !== undefined && wateredIds.has(item.id)
          ? { ...item, lastWateredAt }
          : item
      )))
      setActionError('')
      return true
    } catch {
      setActionError(WATER_MANY_ERROR)
      return false
    }
  }, [])

  const fertilizePlant = useCallback(async (plant: Plant) => {
    if (plant.id === undefined || plant.fertilizeEveryDays === undefined) return
    const lastFertilizedAt = new Date().toISOString()

    try {
      await plantDatabase.plants.update(plant.id, { lastFertilizedAt })
      setPlants((current) => current.map((item) => (
        item.id === plant.id ? { ...item, lastFertilizedAt } : item
      )))
      setActionError('')
    } catch {
      setActionError(FERTILIZE_ERROR)
    }
  }, [])

  const removePlant = useCallback(async (plant: Plant) => {
    if (plant.id === undefined || !window.confirm(`Remove ${plant.name} from your plant journal?`)) {
      return
    }

    try {
      await plantDatabase.plants.delete(plant.id)
      setPlants((current) => current.filter((item) => item.id !== plant.id))
      setEditingPlant((current) => (current?.id === plant.id ? null : current))
      setCarePlant((current) => (current?.id === plant.id ? null : current))
      setNotePlant((current) => (current?.id === plant.id ? null : current))
      setActionError('')
    } catch {
      setActionError(REMOVE_ERROR)
    }
  }, [])

  return {
    rows,
    dueRows,
    dueFeedRows,
    wateredCount,
    feedingTrackedCount,
    nextFeedingLabel,
    loading,
    loadError,
    actionError,
    locations,
    formOpen,
    editingPlant,
    saveError,
    carePlant,
    careError,
    notePlant,
    noteError,
    exportOpen,
    exportError,
    importOpen,
    importError,
    openNewPlant,
    openEditPlant,
    closeForm,
    savePlant,
    addLocation,
    openCareDetails,
    closeCareDetails,
    saveCare,
    openNote,
    closeNote,
    saveNote,
    openExport,
    closeExport,
    exportJournal,
    openImport,
    closeImport,
    importJournal,
    waterPlant,
    waterPlants,
    fertilizePlant,
    removePlant,
  }
}
