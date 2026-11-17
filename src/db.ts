import Dexie, { type Table } from 'dexie'

export type PlantEnvironment = 'Indoor' | 'Outdoor'
export type SoilDrainage = 'Well-draining' | 'Moisture-retentive' | 'Slow-draining'
export type SoilComposition =
  | 'Universal potting mix'
  | 'Soil-based mix'
  | 'Peat-free mix'
  | 'Coco coir'
  | 'Orchid bark mix'
  | 'Cactus & succulent mix'
  | 'Loam'
  | 'Sand'
export type SoilPh = 'Acidic' | 'Neutral' | 'Alkaline'
export type FertilizerType =
  | 'Liquid feed'
  | 'Water-soluble powder'
  | 'Slow-release granules'
  | 'Fertilizer spikes'
  | 'Organic feed'
export const WINTER_HARDY_THRESHOLD = -10

export interface PlantLocation {
  id?: number
  name: string
  normalizedName: string
}

export interface Plant {
  id?: number
  name: string
  species: string
  environment: PlantEnvironment
  location: string
  light: string
  waterEveryDays: number
  lastWateredAt: string
  fertilizerType?: FertilizerType
  fertilizeEveryDays?: number
  lastFertilizedAt?: string
  minTemperature?: number
  maxTemperature?: number
  winterHardy: boolean
  draftSensitive: boolean
  minHumidity?: number
  maxHumidity?: number
  notes: string
  imageBlob?: Blob
  imageOptimized?: boolean
  createdAt: string
  edibility: string
  toxicity: string
  origin: string
  soilDrainage?: SoilDrainage
  soilComposition?: SoilComposition
  soilPh?: SoilPh
  pruningTime?: string
  expectedHeightCm?: number
  heightAfterPruningCm?: number
  pruningNotes?: string
}

// Retained from the pre-release name so existing journals keep loading.
// Changing this value requires a migration that copies the old database.
const DATABASE_NAME = 'tend-plant-journal'

class PlantDatabase extends Dexie {
  plants!: Table<Plant, number>
  locations!: Table<PlantLocation, number>

  constructor() {
    super(DATABASE_NAME)
    this.version(1).stores({
      plants: '++id, name, environment, location',
    })
    this.version(2).stores({
      plants: '++id, name, environment, location',
    })
    this.version(3).stores({
      plants: '++id, name, environment, location',
      locations: '++id, &normalizedName',
    })
  }
}

export const plantDatabase = new PlantDatabase()