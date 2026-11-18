import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import {
  AlertCircle,
  ArrowDown,
  Check,
  ChevronDown,
  Droplets,
  FlaskConical,
  Layers,
  Leaf,
  Plus,
  Scissors,
  Thermometer,
  Wheat,
  Wind,
  X,
} from 'lucide-react'
import type { Plant, PlantEnvironment, PlantLocation } from '../db'
import { useObjectUrl } from '../hooks/useObjectUrl'
import {
  DEFAULT_FEEDING_DAYS,
  EDIBILITY_OPTIONS,
  ENVIRONMENTS,
  FALLBACK_PLANT_IMAGE,
  FERTILIZER_TYPE_OPTIONS,
  LIGHT_OPTIONS,
  MAX_FEEDING_DAYS,
  MAX_IMAGE_BYTES,
  MAX_PLANT_HEIGHT_CM,
  MAX_WATERING_DAYS,
  SOIL_COMPOSITION_OPTIONS,
  SOIL_DRAINAGE_OPTIONS,
  SOIL_PH_OPTIONS,
  TEXT_LIMITS,
  TOXICITY_OPTIONS,
} from '../lib/constants'
import { EMPTY_PLANT_FORM, parsePlantForm, type PlantFormIssue } from '../lib/plantForm'
import type {
  AddLocationResult,
  PlantFormSubmission,
  PlantFormTab,
  PlantFormValues,
} from '../types'

interface PlantDialogProps {
  plant: Plant | null
  locations: PlantLocation[]
  error: string
  onClose: () => void
  onSave: (submission: PlantFormSubmission) => Promise<void>
  onAddLocation: (name: string) => Promise<AddLocationResult>
}

const FORM_TABS: ReadonlyArray<{ id: PlantFormTab; label: string }> = [
  { id: 'main', label: 'Main' },
  { id: 'environment', label: 'Environment' },
  { id: 'soil', label: 'Soil' },
  { id: 'care', label: 'Care' },
  { id: 'picture', label: 'Picture' },
]

function toFormValues(plant: Plant | null): PlantFormValues {
  if (!plant) return { ...EMPTY_PLANT_FORM }

  return {
    name: plant.name,
    species: plant.species,
    environment: plant.environment,
    location: plant.location,
    light: plant.light,
    waterEveryDays: plant.waterEveryDays,
    fertilizerType: plant.fertilizerType,
    fertilizeEveryDays: plant.fertilizeEveryDays,
    minTemperature: plant.minTemperature,
    maxTemperature: plant.maxTemperature,
    draftSensitive: plant.draftSensitive,
    minHumidity: plant.minHumidity,
    maxHumidity: plant.maxHumidity,
    edibility: plant.edibility,
    toxicity: plant.toxicity,
    origin: plant.origin,
    soilDrainage: plant.soilDrainage,
    soilComposition: plant.soilComposition,
    soilPh: plant.soilPh,
    pruningTime: plant.pruningTime ?? '',
    expectedHeightCm: plant.expectedHeightCm,
    heightAfterPruningCm: plant.heightAfterPruningCm,
    pruningNotes: plant.pruningNotes ?? '',
  }
}

function tabId(tab: PlantFormTab) {
  return `plant-form-tab-${tab}`
}

function panelId(tab: PlantFormTab) {
  return `plant-form-panel-${tab}`
}

export function PlantDialog({
  plant,
  locations,
  error,
  onClose,
  onSave,
  onAddLocation,
}: PlantDialogProps) {
  const values = toFormValues(plant)
  const [activeTab, setActiveTab] = useState<PlantFormTab>('main')
  const [environment, setEnvironment] = useState(values.environment)
  const [location, setLocation] = useState(
    locations.some((item) => item.name === values.location) ? values.location : '',
  )
  const [addingLocation, setAddingLocation] = useState(false)
  const [newLocationName, setNewLocationName] = useState('')
  const [locationError, setLocationError] = useState('')
  const [savingLocation, setSavingLocation] = useState(false)
  const [draftSensitive, setDraftSensitive] = useState(Boolean(values.draftSensitive))
  const [feedInterval, setFeedInterval] = useState(
    values.fertilizeEveryDays === undefined ? '' : String(values.fertilizeEveryDays),
  )
  const [imageFile, setImageFile] = useState<File | undefined>()
  const [removeImage, setRemoveImage] = useState(false)
  const [validationError, setValidationError] = useState<PlantFormIssue | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])
  const locationSelectRef = useRef<HTMLSelectElement>(null)
  const locationInputRef = useRef<HTMLInputElement>(null)
  const existingPhotoUrl = useObjectUrl(plant?.imageBlob)
  const selectedPhotoUrl = useObjectUrl(imageFile)
  const photoUrl = selectedPhotoUrl || (removeImage ? '' : existingPhotoUrl)
  const photoNote = imageFile
    ? 'New photo, saved when you save the plant.'
    : removeImage
      ? 'The saved photo will be removed when you save.'
      : photoUrl
        ? 'Saved on this device.'
        : 'No photo saved yet.'
  const feedingEnabled = feedInterval.trim() !== ''
  const message = validationError?.error || error
  const messageTab = validationError
    ? FORM_TABS.find((tab) => tab.id === validationError.tab)?.label
    : undefined
  const maxImageMb = Math.round(MAX_IMAGE_BYTES / (1024 * 1024))

  useEffect(() => {
    if (addingLocation) locationInputRef.current?.focus()
  }, [addingLocation])

  // Wait for the failing panel to become visible, then move focus to its control.
  useEffect(() => {
    if (!validationError) return
    const control = formRef.current?.elements.namedItem(validationError.field)
    if (control instanceof HTMLElement) {
      control.focus()
      control.scrollIntoView({ block: 'center' })
    }
  }, [validationError])

  function invalidProps(field: string, describedBy?: string) {
    if (validationError?.field !== field) return {}
    return {
      'aria-invalid': true,
      'aria-describedby': ['plant-form-error', describedBy].filter(Boolean).join(' '),
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = parsePlantForm(new FormData(event.currentTarget), locations)

    if (!result.ok) {
      setValidationError({
        error: result.error,
        tab: result.tab,
        field: result.field,
      })
      setActiveTab(result.tab)
      return
    }

    setValidationError(null)
    void onSave(result.submission)
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number

    switch (event.key) {
      case 'ArrowRight':
        nextIndex = (index + 1) % FORM_TABS.length
        break
      case 'ArrowLeft':
        nextIndex = (index - 1 + FORM_TABS.length) % FORM_TABS.length
        break
      case 'Home':
        nextIndex = 0
        break
      case 'End':
        nextIndex = FORM_TABS.length - 1
        break
      default:
        return
    }

    event.preventDefault()
    setActiveTab(FORM_TABS[nextIndex].id)
    tabRefs.current[nextIndex]?.focus()
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    setImageFile(file)
    if (file) setRemoveImage(false)
  }

  async function handleAddLocation() {
    if (savingLocation) return
    setSavingLocation(true)
    const result = await onAddLocation(newLocationName)
    setSavingLocation(false)

    if (!result.ok) {
      setLocationError(result.error)
      return
    }

    setLocation(result.location.name)
    setNewLocationName('')
    setLocationError('')
    setAddingLocation(false)
    locationSelectRef.current?.focus()
  }

  function cancelAddLocation() {
    setAddingLocation(false)
    setNewLocationName('')
    setLocationError('')
    locationSelectRef.current?.focus()
  }

  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section className="plant-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <div className="dialog-header">
          <div>
            <p className="eyebrow">YOUR GARDEN JOURNAL</p>
            <h2 id="dialog-title">{plant ? 'Edit plant' : 'Meet your new plant'}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={19} /></button>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} noValidate>
          <div className="form-tabs" role="tablist" aria-label="Plant form sections">
            {FORM_TABS.map((tab, index) => {
              const selected = activeTab === tab.id
              const hasError = validationError?.tab === tab.id

              return (
                <button
                  key={tab.id}
                  ref={(node) => {
                    tabRefs.current[index] = node
                  }}
                  type="button"
                  role="tab"
                  id={tabId(tab.id)}
                  aria-selected={selected}
                  aria-controls={panelId(tab.id)}
                  aria-label={hasError ? `${tab.label} tab, has errors` : undefined}
                  tabIndex={selected ? 0 : -1}
                  className={hasError ? 'form-tab has-error' : 'form-tab'}
                  onClick={() => setActiveTab(tab.id)}
                  onKeyDown={(event) => handleTabKeyDown(event, index)}
                >
                  {tab.label}
                  {hasError && <AlertCircle size={13} aria-hidden />}
                </button>
              )
            })}
          </div>

          {message && (
            <p className="form-error" id="plant-form-error" role="alert">
              <AlertCircle size={14} aria-hidden />
              <span>
                {messageTab && <><strong>{messageTab} tab:</strong> </>}
                {message}
              </span>
            </p>
          )}

          <div
            className="form-tab-panel"
            id={panelId('main')}
            role="tabpanel"
            aria-labelledby={tabId('main')}
            hidden={activeTab !== 'main'}
          >
            <div className="form-grid">
              <label className="field">
                <span>Plant name <b>*</b></span>
                <input
                  name="name"
                  defaultValue={values.name}
                  placeholder="e.g. Monstera"
                  maxLength={TEXT_LIMITS.name}
                  required
                  autoFocus
                  {...invalidProps('name')}
                />
              </label>
              <label className="field">
                <span>Species or variety</span>
                <input
                  name="species"
                  defaultValue={values.species}
                  placeholder="e.g. Monstera deliciosa"
                  maxLength={TEXT_LIMITS.species}
                  {...invalidProps('species')}
                />
              </label>
              <label className="field">
                <span>Growing in</span>
                <span className="select-wrap">
                  <select
                    name="environment"
                    value={environment}
                    onChange={(event) => setEnvironment(event.target.value as PlantEnvironment)}
                  >
                    {ENVIRONMENTS.map((option) => <option key={option}>{option}</option>)}
                  </select>
                  <ChevronDown size={16} />
                </span>
              </label>
              <label className="field">
                <span>Plant origin</span>
                <input
                  name="origin"
                  defaultValue={values.origin}
                  placeholder="where is this plant natively from?"
                  maxLength={TEXT_LIMITS.origin}
                  {...invalidProps('origin')}
                />
              </label>
              <div className="field field-wide">
                <label htmlFor="plant-location">Room or spot <small>Optional</small></label>
                <div className="location-control">
                  <span className="select-wrap">
                    <select
                      id="plant-location"
                      ref={locationSelectRef}
                      name="location"
                      value={location}
                      onChange={(event) => setLocation(event.target.value)}
                      {...invalidProps('location')}
                    >
                      <option value="">No location</option>
                      {locations.map((item) => (
                        <option key={item.id ?? item.normalizedName} value={item.name}>{item.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} />
                  </span>
                  <button
                    type="button"
                    className="button button-outline location-add-toggle"
                    onClick={() => {
                      if (addingLocation) cancelAddLocation()
                      else {
                        setLocationError('')
                        setAddingLocation(true)
                      }
                    }}
                    aria-expanded={addingLocation}
                    aria-controls="add-location-row"
                  >
                    <Plus size={14} /> Add location
                  </button>
                </div>
                {addingLocation && (
                  <div className="location-add-row" id="add-location-row">
                    <input
                      ref={locationInputRef}
                      value={newLocationName}
                      placeholder="e.g. Kitchen window"
                      maxLength={TEXT_LIMITS.location}
                      aria-label="New location name"
                      aria-invalid={Boolean(locationError)}
                      aria-describedby={locationError ? 'location-error' : undefined}
                      onChange={(event) => {
                        setNewLocationName(event.target.value)
                        if (locationError) setLocationError('')
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          void handleAddLocation()
                        }
                        if (event.key === 'Escape') {
                          event.preventDefault()
                          cancelAddLocation()
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="button button-primary"
                      onClick={() => void handleAddLocation()}
                      disabled={savingLocation}
                    >
                      <Check size={14} /> Add
                    </button>
                    <button type="button" className="button button-quiet" onClick={cancelAddLocation}>
                      Cancel
                    </button>
                  </div>
                )}
                {locationError && (
                  <small className="field-error" id="location-error" role="alert">
                    <AlertCircle size={12} /> {locationError}
                  </small>
                )}
              </div>
              <label className="field">
                <span>Water every</span>
                <span className="input-suffix">
                  <input
                    name="waterEveryDays"
                    type="number"
                    min="1"
                    max={MAX_WATERING_DAYS}
                    step="1"
                    defaultValue={values.waterEveryDays}
                    required
                    {...invalidProps('waterEveryDays')}
                  />
                  <span>days</span>
                </span>
              </label>
              <label className="field">
                <span>Feed every</span>
                <span className="input-suffix">
                  <input
                    name="fertilizeEveryDays"
                    type="number"
                    min="1"
                    max={MAX_FEEDING_DAYS}
                    step="1"
                    placeholder={String(DEFAULT_FEEDING_DAYS)}
                    value={feedInterval}
                    onChange={(event) => setFeedInterval(event.target.value)}
                    {...invalidProps('fertilizeEveryDays', 'feeding-hint')}
                  />
                  <span>days</span>
                </span>
                <small className="field-hint" id="feeding-hint">Leave blank to skip feeding.</small>
              </label>
              <label className="field">
                <span><Leaf size={14} /> Fertilizer type</span>
                <span className="select-wrap">
                  <select
                    name="fertilizerType"
                    defaultValue={values.fertilizerType ?? 'Not set'}
                    disabled={!feedingEnabled}
                  >
                    <option value="Not set">Not set</option>
                    {FERTILIZER_TYPE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                  <ChevronDown size={16} />
                </span>
              </label>
              <label className="field">
                <span><FlaskConical size={14} /> Toxic for pets</span>
                <span className="select-wrap">
                  <select name="toxicity" defaultValue={values.toxicity}>
                    {TOXICITY_OPTIONS.map((option) => <option key={option}>{option}</option>)}
                  </select>
                  <ChevronDown size={16} />
                </span>
              </label>
              <label className="field">
                <span><Wheat size={14} /> Edible</span>
                <span className="select-wrap">
                  <select name="edibility" defaultValue={values.edibility}>
                    {EDIBILITY_OPTIONS.map((option) => <option key={option}>{option}</option>)}
                  </select>
                  <ChevronDown size={16} />
                </span>
              </label>
            </div>
          </div>

          <div
            className="form-tab-panel"
            id={panelId('environment')}
            role="tabpanel"
            aria-labelledby={tabId('environment')}
            hidden={activeTab !== 'environment'}
          >
            <div className="form-grid">
              <label className="field">
                <span>Preferred light</span>
                <span className="select-wrap">
                  <select name="light" defaultValue={values.light}>
                    {LIGHT_OPTIONS.map((option) => <option key={option}>{option}</option>)}
                  </select>
                  <ChevronDown size={16} />
                </span>
              </label>
                            <div className="checkbox-field">
                {environment === 'Indoor' && (
                  <label className="checkbox-option">
                    <input
                      name="draftSensitive"
                      type="checkbox"
                      checked={draftSensitive}
                      onChange={(event) => setDraftSensitive(event.target.checked)}
                    />
                    <span><Wind size={14} /> Not resistant to drafts</span>
                  </label>
                )}
              </div>
              <div className="field">
                <span><Thermometer size={14} /> Preferred temperature range <small>Optional</small></span>
                <div className="range-inputs">
                  <label>
                    <span>Minimum (°C)</span>
                    <input
                      name="minTemperature"
                      type="number"
                      step="1"
                      defaultValue={values.minTemperature}
                      {...invalidProps('minTemperature')}
                    />
                  </label>
                  <label>
                    <span>Maximum (°C)</span>
                    <input
                      name="maxTemperature"
                      type="number"
                      step="1"
                      defaultValue={values.maxTemperature}
                      {...invalidProps('maxTemperature')}
                    />
                  </label>
                </div>
              </div>
              <div className="field">
                <span><Droplets size={14} /> Preferred humidity <small>Optional</small></span>
                <div className="range-inputs">
                  <label>
                    <span>Minimum (%)</span>
                    <input
                      name="minHumidity"
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      defaultValue={values.minHumidity}
                      {...invalidProps('minHumidity')}
                    />
                  </label>
                  <label>
                    <span>Maximum (%)</span>
                    <input
                      name="maxHumidity"
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      defaultValue={values.maxHumidity}
                      {...invalidProps('maxHumidity')}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div
            className="form-tab-panel"
            id={panelId('soil')}
            role="tabpanel"
            aria-labelledby={tabId('soil')}
            hidden={activeTab !== 'soil'}
          >
            <div className="form-grid">
              <label className="field field-wide">
                <span><Layers size={14} /> Soil composition <small>Optional</small></span>
                <span className="select-wrap">
                  <select name="soilComposition" defaultValue={values.soilComposition ?? ''}>
                    <option value="">Not set</option>
                    {SOIL_COMPOSITION_OPTIONS.map((option) => <option key={option}>{option}</option>)}
                  </select>
                  <ChevronDown size={16} />
                </span>
              </label>
              <label className="field">
                <span><FlaskConical size={14} /> Soil pH <small>Optional</small></span>
                <span className="select-wrap">
                  <select name="soilPh" defaultValue={values.soilPh ?? ''}>
                    <option value="">Not set</option>
                    {SOIL_PH_OPTIONS.map((option) => <option key={option}>{option}</option>)}
                  </select>
                  <ChevronDown size={16} />
                </span>
              </label>
              <label className="field">
                <span><Droplets size={14} /> Drainage <small>Optional</small></span>
                <span className="select-wrap">
                  <select name="soilDrainage" defaultValue={values.soilDrainage ?? ''}>
                    <option value="">Not set</option>
                    {SOIL_DRAINAGE_OPTIONS.map((option) => <option key={option}>{option}</option>)}
                  </select>
                  <ChevronDown size={16} />
                </span>
              </label>
            </div>
          </div>

          <div
            className="form-tab-panel"
            id={panelId('care')}
            role="tabpanel"
            aria-labelledby={tabId('care')}
            hidden={activeTab !== 'care'}
          >
            <div className="form-grid">
              <label className="field field-wide">
                <span><Scissors size={14} /> When to prune <small>Optional</small></span>
                <input
                  name="pruningTime"
                  defaultValue={values.pruningTime}
                  placeholder="e.g. Late winter, after flowering"
                  maxLength={TEXT_LIMITS.pruningTime}
                  {...invalidProps('pruningTime')}
                />
              </label>
              <label className="field">
                <span>Expected mature height <small>Optional</small></span>
                <span className="input-suffix">
                  <input
                    name="expectedHeightCm"
                    type="number"
                    min="1"
                    max={MAX_PLANT_HEIGHT_CM}
                    step="1"
                    defaultValue={values.expectedHeightCm}
                    {...invalidProps('expectedHeightCm')}
                  />
                  <span>cm</span>
                </span>
              </label>
              <label className="field">
                <span>Height after pruning <small>Optional</small></span>
                <span className="input-suffix">
                  <input
                    name="heightAfterPruningCm"
                    type="number"
                    min="1"
                    max={MAX_PLANT_HEIGHT_CM}
                    step="1"
                    defaultValue={values.heightAfterPruningCm}
                    {...invalidProps('heightAfterPruningCm')}
                  />
                  <span>cm</span>
                </span>
              </label>
              <label className="field field-wide">
                <span>Pruning notes <small>Optional</small></span>
                <textarea
                  name="pruningNotes"
                  defaultValue={values.pruningNotes}
                  placeholder="How and where to cut, or anything else to remember..."
                  rows={3}
                  maxLength={TEXT_LIMITS.pruningNotes}
                  {...invalidProps('pruningNotes')}
                />
              </label>
            </div>
          </div>

          <div
            className="form-tab-panel"
            id={panelId('picture')}
            role="tabpanel"
            aria-labelledby={tabId('picture')}
            hidden={activeTab !== 'picture'}
          >
            <div className="form-grid">
              <div className="photo-preview field-wide">
                {/* codeql[js/xss-through-dom] False positive: React escapes JSX attributes and useObjectUrl only returns opaque same-origin blob: URLs, which image sources cannot execute. See issue #24. Review by 2027-02-18. */}
                <img src={photoUrl || FALLBACK_PLANT_IMAGE} alt={photoUrl ? `Photo of ${values.name.trim() || 'this plant'}` : ''} />
                <span className="photo-preview-note">{photoNote}</span>
              </div>
              <label className="field field-wide">
                <span>Plant photo <small>Optional, stored on this device</small></span>
                <input
                  name="imageFile"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  {...invalidProps('imageFile')}
                />
                <small className="field-hint">
                  JPEG, PNG, WebP, AVIF, BMP, or GIF, up to {maxImageMb} MB.
                </small>
              </label>
              {plant?.imageBlob && !imageFile && (
                <label className="checkbox-option field-wide">
                  <input
                    name="removeImage"
                    type="checkbox"
                    checked={removeImage}
                    onChange={(event) => setRemoveImage(event.target.checked)}
                  />
                  <span>Remove the saved photo</span>
                </label>
              )}
            </div>
          </div>

          <div className="dialog-footer">
            <span><ArrowDown size={14} /> Saved to this device</span>
            <div>
              <button type="button" className="button button-quiet" onClick={onClose}>Cancel</button>
              <button type="submit" className="button button-primary"><Check size={16} /> {plant ? 'Save changes' : 'Add plant'}</button>
            </div>
          </div>
        </form>
      </section>
    </div>
  )
}
