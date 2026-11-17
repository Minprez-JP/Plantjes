import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react'
import { plantDatabase, type Plant } from '../db'
import { optimizeImageBlob, shouldOptimizeStoredImage } from '../image'
import { STORED_IMAGE_OPTIMIZE_BYTES } from '../lib/constants'

/**
 * Older records may hold multi-megapixel originals. Re-encode the largest ones
 * once, sequentially, so the tab does not keep decoding huge bitmaps.
 *
 * The run flag keeps the pass to a single execution per session, including
 * under React StrictMode's double-invoked effects. A failure on one photo is
 * isolated so it cannot abort the pass or surface as an unhandled rejection.
 */
export function useStoredPhotoBackfill(
  plants: Plant[],
  setPlants: Dispatch<SetStateAction<Plant[]>>,
) {
  const hasRun = useRef(false)

  useEffect(() => {
    if (hasRun.current || plants.length === 0) return
    hasRun.current = true

    void (async () => {
      for (const plant of plants) {
        const blob = plant.imageBlob
        if (
          plant.id === undefined
          || !blob
          || plant.imageOptimized
          || !shouldOptimizeStoredImage(blob, STORED_IMAGE_OPTIMIZE_BYTES)
        ) {
          continue
        }

        try {
          const optimized = await optimizeImageBlob(blob, { minBytes: STORED_IMAGE_OPTIMIZE_BYTES })
          const shouldReplace = optimized !== blob && optimized.size < blob.size

          if (shouldReplace) {
            await plantDatabase.plants.update(plant.id, { imageBlob: optimized, imageOptimized: true })
            setPlants((current) => current.map((item) => (
              item.id === plant.id
                ? { ...item, imageBlob: optimized, imageOptimized: true }
                : item
            )))
          } else {
            // Mark the attempt so an already-compact photo is not retried on every load.
            await plantDatabase.plants.update(plant.id, { imageOptimized: true })
            setPlants((current) => current.map((item) => (
              item.id === plant.id ? { ...item, imageOptimized: true } : item
            )))
          }
        } catch {
          // Skip this photo and keep whatever is already stored.
        }

        await new Promise<void>((resolve) => window.setTimeout(resolve, 0))
      }
    })()
  }, [plants, setPlants])
}
