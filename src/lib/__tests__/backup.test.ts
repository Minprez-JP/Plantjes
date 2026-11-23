import { describe, expect, it } from 'vitest'
import type { PlantLocation } from '../../db'
import {
  BACKUP_EXTENSION,
  BACKUP_FORMAT,
  BACKUP_VERSION,
  MAX_BACKUP_BYTES,
  MAX_BACKUP_NAME,
  buildPlantjesDocument,
  defaultBackupName,
  hasPlantjesExtension,
  normalizeBackupName,
  parsePlantjes,
  validateBackupFileInfo,
} from '../backup'
import { NOW, NOW_ISO, makePlant } from './helpers'

const locations: PlantLocation[] = [
  { id: 1, name: 'Kitchen', normalizedName: 'kitchen' },
  { id: 2, name: 'Garden', normalizedName: 'garden' },
]

describe('normalizeBackupName', () => {
  it('trims the name and adds the .plantjes extension', () => {
    expect(normalizeBackupName('  My plants  ')).toEqual({
      ok: true,
      fileName: 'My plants.plantjes',
    })
  })

  it('does not duplicate an extension typed by the user', () => {
    expect(normalizeBackupName('backup.plantjes')).toEqual({
      ok: true,
      fileName: 'backup.plantjes',
    })
    expect(normalizeBackupName('BACKUP.PLANTJES')).toEqual({
      ok: true,
      fileName: 'BACKUP.plantjes',
    })
  })

  it('removes trailing dots before adding the extension', () => {
    expect(normalizeBackupName('backup...')).toEqual({
      ok: true,
      fileName: 'backup.plantjes',
    })
  })

  it.each(['', '   ', '.plantjes'])('rejects an empty name: %j', (value) => {
    const result = normalizeBackupName(value)
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('Expected normalization to fail')
    expect(result.error).toMatch(/Enter a file name/)
  })

  it('rejects unsafe characters', () => {
    const result = normalizeBackupName('bad/name')
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('Expected normalization to fail')
    expect(result.error).toMatch(/cannot contain/)
  })

  it('rejects reserved operating-system names', () => {
    const result = normalizeBackupName('CON')
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('Expected normalization to fail')
    expect(result.error).toMatch(/reserved/)
  })

  it('accepts the length limit and rejects one character more', () => {
    expect(normalizeBackupName('a'.repeat(MAX_BACKUP_NAME)).ok).toBe(true)
    expect(normalizeBackupName('a'.repeat(MAX_BACKUP_NAME + 1)).ok).toBe(false)
  })
})

describe('hasPlantjesExtension', () => {
  it('matches the extension case-insensitively', () => {
    expect(hasPlantjesExtension('plants.plantjes')).toBe(true)
    expect(hasPlantjesExtension('plants.PLANTJES')).toBe(true)
    expect(hasPlantjesExtension('plants.json')).toBe(false)
  })
})

describe('validateBackupFileInfo', () => {
  it('accepts an in-limit .plantjes file', () => {
    expect(validateBackupFileInfo('garden.PLANTJES', 1024)).toEqual({ ok: true })
  })

  it('rejects a wrong extension, an invalid size, and an oversized file', () => {
    expect(validateBackupFileInfo('garden.json', 1)).toMatchObject({ ok: false })
    expect(validateBackupFileInfo('garden.plantjes', Number.NaN)).toMatchObject({ ok: false })
    expect(validateBackupFileInfo('garden.plantjes', -1)).toMatchObject({ ok: false })
    const oversized = validateBackupFileInfo('garden.plantjes', MAX_BACKUP_BYTES + 1)
    expect(oversized).toMatchObject({ ok: false })
    if (oversized.ok) throw new Error('Expected the size check to fail')
    expect(oversized.error).toMatch(/100 MB or smaller/)
  })
})

describe('defaultBackupName', () => {
  it('uses the local date in a file-safe format', () => {
    expect(defaultBackupName(new Date(2026, 0, 5))).toBe('plantjes-backup-2026-01-05')
  })
})

describe('buildPlantjesDocument', () => {
  it('exports plants, locations, and photos without local IDs', async () => {
    const image = new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'image/png' })
    const plant = makePlant({
      id: 9,
      name: 'Basil',
      location: 'Kitchen',
      imageBlob: image,
      imageOptimized: true,
      soilPh: 'Acidic',
      notes: 'Keep pinched',
      pruningTime: 'Late winter',
      expectedHeightCm: 150,
      heightAfterPruningCm: 40,
      pruningNotes: 'Cut above a bud',
    })

    const document = await buildPlantjesDocument([plant], locations, new Date(NOW))

    expect(document.format).toBe(BACKUP_FORMAT)
    expect(document.version).toBe(BACKUP_VERSION)
    expect(document.exportedAt).toBe(NOW_ISO)
    expect(document.locations).toEqual(['Garden', 'Kitchen'])
    expect(document.plants).toHaveLength(1)
    expect(document.plants[0]).not.toHaveProperty('id')
    expect(document.plants[0].name).toBe('Basil')
    expect(document.plants[0].soilPh).toBe('Acidic')
    expect(document.plants[0].pruningTime).toBe('Late winter')
    expect(document.plants[0].expectedHeightCm).toBe(150)
    expect(document.plants[0].heightAfterPruningCm).toBe(40)
    expect(document.plants[0].pruningNotes).toBe('Cut above a bud')
    expect(document.plants[0].imageOptimized).toBe(true)
    expect(document.plants[0].image).toMatch(/^data:image\/png;base64,/)
  })

  it('includes plant locations that are missing from the saved list', async () => {
    const document = await buildPlantjesDocument(
      [makePlant({ location: 'Balcony' })],
      locations,
      new Date(NOW),
    )

    expect(document.locations).toEqual(['Balcony', 'Garden', 'Kitchen'])
  })
})

describe('parsePlantjes', () => {
  const emptyBackup = JSON.stringify({
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    plants: [],
  })

  async function exportedText() {
    const image = new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'image/png' })
    const plant = makePlant({
      name: 'Basil',
      species: 'Ocimum basilicum',
      environment: 'Outdoor',
      location: 'Balcony',
      minTemperature: -15,
      winterHardy: false,
      fertilizeEveryDays: 30,
      lastFertilizedAt: NOW_ISO,
      fertilizerType: 'Organic feed',
      imageBlob: image,
      imageOptimized: true,
      soilComposition: 'Loam',
      notes: 'Keep pinched',
      pruningTime: 'After flowering',
      expectedHeightCm: 90,
      heightAfterPruningCm: 30,
      pruningNotes: 'Cut back by one third',
    })

    return JSON.stringify(
      await buildPlantjesDocument([plant], locations, new Date(NOW)),
    )
  }

  it('round-trips a backup including photo bytes and derived fields', async () => {
    const result = parsePlantjes(await exportedText())

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(result.error)

    expect(result.exportedAt).toBe(NOW_ISO)
    expect(result.locations.map((location) => location.name)).toEqual([
      'Balcony',
      'Garden',
      'Kitchen',
    ])
    expect(result.plants).toHaveLength(1)
    expect(result.imageCount).toBe(1)

    const plant = result.plants[0]
    expect(plant.id).toBeUndefined()
    expect(plant.name).toBe('Basil')
    expect(plant.location).toBe('Balcony')
    expect(plant.environment).toBe('Outdoor')
    expect(plant.winterHardy).toBe(true)
    expect(plant.fertilizeEveryDays).toBe(30)
    expect(plant.soilComposition).toBe('Loam')
    expect(plant.pruningTime).toBe('After flowering')
    expect(plant.expectedHeightCm).toBe(90)
    expect(plant.heightAfterPruningCm).toBe(30)
    expect(plant.pruningNotes).toBe('Cut back by one third')
    expect(plant.imageBlob?.type).toBe('image/png')
    expect(new Uint8Array(await plant.imageBlob!.arrayBuffer())).toEqual(
      new Uint8Array([1, 2, 3, 4]),
    )
  })

  it('accepts an empty but valid backup', () => {
    const result = parsePlantjes(JSON.stringify({
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      plants: [],
    }))

    expect(result).toEqual({
      ok: true,
      plants: [],
      locations: [],
      imageCount: 0,
      exportedAt: undefined,
    })
  })

  it('honours a supplied byte length before parsing', () => {
    const result = parsePlantjes(emptyBackup, { byteLength: MAX_BACKUP_BYTES + 1 })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('Expected parsing to fail')
    expect(result.error).toMatch(/100 MB or smaller/)
  })

  it('uses the injected clock for the fallback fertilization date', async () => {
    const document = JSON.parse(await exportedText()) as {
      plants: Array<Record<string, unknown>>
    }
    delete document.plants[0].lastFertilizedAt
    const fixedNow = new Date('2030-06-01T00:00:00.000Z')

    const result = parsePlantjes(JSON.stringify(document), { now: fixedNow })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(result.error)
    expect(result.plants[0].lastFertilizedAt).toBe('2030-06-01T00:00:00.000Z')
  })

  it('normalizes imported note line endings', () => {
    const result = parsePlantjes(JSON.stringify({
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      plants: [{
        name: 'Basil',
        environment: 'Indoor',
        waterEveryDays: 7,
        lastWateredAt: NOW_ISO,
        createdAt: NOW_ISO,
        notes: 'First line\r\nSecond line\r',
      }],
    }))

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(result.error)
    expect(result.plants[0].notes).toBe('First line\nSecond line')
  })

  it('rejects invalid JSON', () => {
    const result = parsePlantjes('{')
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('Expected parsing to fail')
    expect(result.error).toMatch(/valid JSON/)
  })

  it('rejects files that are not Plantjes backups', () => {
    const result = parsePlantjes(JSON.stringify({ format: 'something-else' }))
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('Expected parsing to fail')
    expect(result.error).toMatch(/not a Plantjes backup/)
  })

  it('rejects newer and unsupported versions', () => {
    const newer = parsePlantjes(JSON.stringify({
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION + 1,
      plants: [],
    }))
    expect(newer.ok).toBe(false)
    if (newer.ok) throw new Error('Expected parsing to fail')
    expect(newer.error).toMatch(/newer version/)

    const unsupported = parsePlantjes(JSON.stringify({
      format: BACKUP_FORMAT,
      version: 0,
      plants: [],
    }))
    expect(unsupported.ok).toBe(false)
    if (unsupported.ok) throw new Error('Expected parsing to fail')
    expect(unsupported.error).toMatch(/not supported/)
  })

  it('rejects a missing plant list', () => {
    const result = parsePlantjes(JSON.stringify({
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
    }))
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('Expected parsing to fail')
    expect(result.error).toMatch(/plant list/)
  })

  it('rejects malformed plant records with a useful message', () => {
    const base = {
      name: 'Basil',
      environment: 'Indoor',
      waterEveryDays: 7,
      lastWateredAt: NOW_ISO,
      createdAt: NOW_ISO,
    }
    const parsePlant = (overrides: Record<string, unknown>) => parsePlantjes(JSON.stringify({
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      plants: [{ ...base, ...overrides }],
    }))

    const cases: Array<[Record<string, unknown>, RegExp]> = [
      [{ name: '' }, /needs a name/],
      [{ environment: 'Greenhouse' }, /growing environment/],
      [{ waterEveryDays: 0 }, /watering interval/],
      [{ lastWateredAt: 'not-a-date' }, /last-watered date/],
      [{ light: 'Moonlight' }, /light preference/],
      [{ expectedHeightCm: 0 }, /pruning height/],
      [{ heightAfterPruningCm: 2.5 }, /whole number/],
      [{ minTemperature: '0x10' }, /whole number/],
      [{ minTemperature: '1e2' }, /whole number/],
      [{ minTemperature: -101 }, /temperature outside the supported range/],
      [{ maxTemperature: 101 }, /temperature outside the supported range/],
      [{ createdAt: '2026-01-11T12:00:00Z' }, /ISO UTC date/],
      [{ image: 'data:text/plain;base64,AAAA' }, /JPEG, PNG/],
    ]

    for (const [overrides, error] of cases) {
      const result = parsePlant({ ...overrides })
      expect(result.ok).toBe(false)
      if (result.ok) throw new Error('Expected parsing to fail')
      expect(result.error).toMatch(error)
    }
  })

  it('rejects invalid locations', () => {
    const result = parsePlantjes(JSON.stringify({
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      locations: ['   '],
      plants: [],
    }))

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('Expected parsing to fail')
    expect(result.error).toMatch(/invalid location/)
  })
})

describe('backup file constants', () => {
  it('uses the documented extension', () => {
    expect(BACKUP_EXTENSION).toBe('.plantjes')
  })
})
