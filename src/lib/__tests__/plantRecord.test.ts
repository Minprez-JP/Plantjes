import { describe, expect, it } from 'vitest'
import { EMPTY_PLANT_FORM } from '../plantForm'
import { buildPlantRecord, resolveFeedingFields } from '../plantRecord'
import type { PlantFormValues } from '../../types'
import { NOW_ISO, makePlant } from './helpers'

const FORM: PlantFormValues = {
  ...EMPTY_PLANT_FORM,
  name: 'Monstera',
  environment: 'Outdoor',
  minTemperature: -12,
}

describe('resolveFeedingFields', () => {
  it('starts a new schedule at now', () => {
    expect(resolveFeedingFields(
      { fertilizeEveryDays: 30, fertilizerType: 'Liquid feed' },
      undefined,
      NOW_ISO,
    )).toEqual({
      fertilizeEveryDays: 30,
      fertilizerType: 'Liquid feed',
      lastFertilizedAt: NOW_ISO,
    })
  })

  it('preserves the timestamp of an active schedule', () => {
    const previous = makePlant({
      fertilizeEveryDays: 30,
      lastFertilizedAt: '2026-01-01T12:00:00.000Z',
    })

    expect(resolveFeedingFields(
      { fertilizeEveryDays: 60, fertilizerType: 'Organic feed' },
      previous,
      NOW_ISO,
    )).toEqual({
      fertilizeEveryDays: 60,
      fertilizerType: 'Organic feed',
      lastFertilizedAt: '2026-01-01T12:00:00.000Z',
    })
  })

  it('heals an active schedule that has no timestamp', () => {
    const previous = makePlant({ fertilizeEveryDays: 30 })

    expect(resolveFeedingFields(
      { fertilizeEveryDays: 30, fertilizerType: 'Liquid feed' },
      previous,
      NOW_ISO,
    ).lastFertilizedAt).toBe(NOW_ISO)
  })

  it('starts a newly enabled schedule at now', () => {
    const previous = makePlant({ fertilizeEveryDays: undefined })

    expect(resolveFeedingFields(
      { fertilizeEveryDays: 14, fertilizerType: undefined },
      previous,
      NOW_ISO,
    ).lastFertilizedAt).toBe(NOW_ISO)
  })

  it('clears the type, interval, and timestamp when feeding is disabled', () => {
    const previous = makePlant({
      fertilizeEveryDays: 30,
      fertilizerType: 'Liquid feed',
      lastFertilizedAt: '2026-01-01T12:00:00.000Z',
    })

    expect(resolveFeedingFields(
      { fertilizeEveryDays: undefined, fertilizerType: 'Liquid feed' },
      previous,
      NOW_ISO,
    )).toEqual({
      fertilizeEveryDays: undefined,
      fertilizerType: undefined,
      lastFertilizedAt: undefined,
    })
  })
})

describe('buildPlantRecord', () => {
  it('preserves metadata when editing an existing plant', () => {
    const previous = makePlant({
      id: 7,
      createdAt: '2025-06-01T12:00:00.000Z',
      lastWateredAt: '2026-01-10T12:00:00.000Z',
      soilPh: 'Neutral',
      fertilizeEveryDays: 30,
      lastFertilizedAt: '2026-01-01T12:00:00.000Z',
    })

    const record = buildPlantRecord({
      values: {
        ...FORM,
        fertilizeEveryDays: 30,
        fertilizerType: 'Liquid feed',
        soilPh: 'Neutral',
      },
      previous,
      now: NOW_ISO,
    })

    expect(record.id).toBe(7)
    expect(record.createdAt).toBe('2025-06-01T12:00:00.000Z')
    expect(record.lastWateredAt).toBe('2026-01-10T12:00:00.000Z')
    expect(record.lastFertilizedAt).toBe('2026-01-01T12:00:00.000Z')
    expect(record.soilPh).toBe('Neutral')
    expect(record.winterHardy).toBe(true)
    expect(record.imageOptimized).toBe(false)
  })

  it('preserves the note managed by the note dialog', () => {
    const previous = makePlant({ notes: 'Keep pinched\nWater less in winter' })

    const record = buildPlantRecord({
      values: FORM,
      previous,
      now: NOW_ISO,
    })

    expect(record.notes).toBe('Keep pinched\nWater less in winter')
  })

  it('starts a new plant with an empty note', () => {
    const record = buildPlantRecord({ values: FORM, now: NOW_ISO })

    expect(record.notes).toBe('')
  })

  it('writes soil values from the form and can clear them', () => {
    const previous = makePlant({
      id: 7,
      soilComposition: 'Loam',
      soilPh: 'Neutral',
      soilDrainage: 'Well-draining',
    })

    const updated = buildPlantRecord({
      values: { ...FORM, soilPh: 'Acidic' },
      previous,
      now: NOW_ISO,
    })
    const cleared = buildPlantRecord({
      values: FORM,
      previous,
      now: NOW_ISO,
    })

    expect(updated.soilPh).toBe('Acidic')
    expect(updated.soilComposition).toBeUndefined()
    expect(updated.soilDrainage).toBeUndefined()
    expect(cleared.soilPh).toBeUndefined()
    expect(cleared.soilComposition).toBeUndefined()
    expect(cleared.soilDrainage).toBeUndefined()
  })

  it('writes pruning care fields from the form and can clear them', () => {
    const previous = makePlant({
      id: 7,
      pruningTime: 'Winter',
      expectedHeightCm: 100,
      heightAfterPruningCm: 30,
      pruningNotes: 'Old instructions',
    })

    const updated = buildPlantRecord({
      values: {
        ...FORM,
        pruningTime: 'Spring',
        expectedHeightCm: 120,
        heightAfterPruningCm: 50,
        pruningNotes: 'New instructions',
      },
      previous,
      now: NOW_ISO,
    })
    const cleared = buildPlantRecord({ values: FORM, previous, now: NOW_ISO })

    expect(updated.pruningTime).toBe('Spring')
    expect(updated.expectedHeightCm).toBe(120)
    expect(updated.heightAfterPruningCm).toBe(50)
    expect(updated.pruningNotes).toBe('New instructions')
    expect(cleared.pruningTime).toBe('')
    expect(cleared.expectedHeightCm).toBeUndefined()
    expect(cleared.heightAfterPruningCm).toBeUndefined()
    expect(cleared.pruningNotes).toBe('')
  })

  it('initializes timestamps for a new plant', () => {
    const record = buildPlantRecord({
      values: { ...FORM, environment: 'Indoor', minTemperature: undefined },
      now: NOW_ISO,
    })

    expect(record.id).toBeUndefined()
    expect(record.createdAt).toBe(NOW_ISO)
    expect(record.lastWateredAt).toBe(NOW_ISO)
    expect(record.lastFertilizedAt).toBeUndefined()
    expect(record.winterHardy).toBe(false)
    expect(record.imageOptimized).toBe(false)
  })

  it('keeps the optimized flag only while an image is stored', () => {
    const blob = new Blob(['photo'])

    const withImage = buildPlantRecord({
      values: FORM,
      now: NOW_ISO,
      imageBlob: blob,
      imageOptimized: true,
    })
    const withoutImage = buildPlantRecord({
      values: FORM,
      now: NOW_ISO,
      imageOptimized: true,
    })

    expect(withImage.imageOptimized).toBe(true)
    expect(withoutImage.imageOptimized).toBe(false)
  })
})
