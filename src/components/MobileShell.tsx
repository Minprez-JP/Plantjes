import { useCallback, useEffect, useState, type ReactNode } from 'react'
import {
  Check,
  Download,
  Droplets,
  LayoutGrid,
  Leaf,
  PlantPot,
  Plus,
  Upload,
  UserRound,
} from 'lucide-react'
import type { Plant } from '../db'
import type { PlantRow } from '../types'
import { CollectionSection } from './CollectionSection'

const MOBILE_SCREENS = ['collection', 'water', 'feed', 'account'] as const
export type MobileScreen = (typeof MOBILE_SCREENS)[number]

const SCREEN_TITLES: Record<MobileScreen, string> = {
  collection: 'Collection',
  water: 'Water',
  feed: 'Feed',
  account: 'Account',
}

interface MobileHashState {
  screen: MobileScreen
}

/**
 * Hash navigation is used deliberately: unlike pushState alone, a hash change
 * is a real WebView history entry, so browser and Android back gestures can
 * restore the previous screen instead of leaving the app.
 */
function readMobileHash(hash: string): MobileHashState | null {
  const raw = hash.replace(/^#\/?/, '')
  if (!raw) return null

  const [screen] = raw.split('/')
  if (!(MOBILE_SCREENS as readonly string[]).includes(screen)) return null

  return { screen: screen as MobileScreen }
}

function writeMobileHash(screen: MobileScreen, mode: 'push' | 'replace') {
  const next = `#/${screen}`
  if (window.location.hash === next) return

  if (mode === 'push') window.location.hash = next
  else window.history.replaceState(window.history.state, '', next)
}

interface MobileShellProps {
  rows: PlantRow[]
  dueRows: PlantRow[]
  dueFeedRows: PlantRow[]
  feedingTrackedCount: number
  loading: boolean
  error: string
  onAddPlant: () => void
  onEditPlant: (plant: Plant) => void
  onOpenCare: (plant: Plant) => void
  onOpenNote: (plant: Plant) => void
  onWater: (plant: Plant) => void
  onWaterMany: (plants: readonly Plant[]) => Promise<boolean>
  onFertilize: (plant: Plant) => void
  onDeletePlant: (plant: Plant) => void
  onImport: () => void
  onExport: () => void
  children: ReactNode
}

export function MobileShell({
  rows,
  dueRows,
  dueFeedRows,
  feedingTrackedCount,
  loading,
  error,
  onAddPlant,
  onEditPlant,
  onOpenCare,
  onOpenNote,
  onWater,
  onWaterMany,
  onFertilize,
  onDeletePlant,
  onImport,
  onExport,
  children,
}: MobileShellProps) {
  const [screen, setScreen] = useState<MobileScreen>('collection')

  const selectScreen = useCallback((next: MobileScreen, mode: 'push' | 'replace' = 'push') => {
    writeMobileHash(next, mode)
    setScreen(next)
  }, [])

  useEffect(() => {
    const restored = readMobileHash(window.location.hash)
    if (restored) setScreen(restored.screen)
    else writeMobileHash('collection', 'replace')

    const syncFromHash = () => {
      const next = readMobileHash(window.location.hash)
      if (next) setScreen(next.screen)
    }

    window.addEventListener('hashchange', syncFromHash)
    window.addEventListener('popstate', syncFromHash)
    return () => {
      window.removeEventListener('hashchange', syncFromHash)
      window.removeEventListener('popstate', syncFromHash)
    }
  }, [])

  // MainActivity forwards the Android hardware back button to this event so
  // the shell can close the topmost UI instead of quitting the app.
  useEffect(() => {
    const handleNativeBack = (event: Event) => {
      const closeDialogButton = document.querySelector<HTMLButtonElement>(
        '[role="dialog"] button[aria-label="Close dialog"]',
      )
      if (closeDialogButton) {
        event.preventDefault()
        closeDialogButton.click()
        return
      }

      if (screen !== 'collection') {
        event.preventDefault()
        selectScreen('collection', 'replace')
      }
    }

    window.addEventListener('plantjes:back', handleNativeBack)
    return () => window.removeEventListener('plantjes:back', handleNativeBack)
  }, [screen, selectScreen])

  const navItems = [
    { id: 'collection', label: 'Collection', icon: LayoutGrid, count: rows.length },
    { id: 'water', label: 'Water', icon: Droplets, count: dueRows.length },
    { id: 'feed', label: 'Feed', icon: Leaf, count: dueFeedRows.length },
    { id: 'account', label: 'Account', icon: UserRound, count: undefined },
  ] as const

  return (
    <div className="mobile-shell">
      <div className="mobile-content-column">
        <header className="mobile-appbar">
          <span className="mobile-appbar-mark" aria-hidden="true"><PlantPot size={21} /></span>
          <span className="mobile-appbar-copy">
            <span className="mobile-appbar-brand">Plantjes.</span>
            <span className="mobile-appbar-title">{SCREEN_TITLES[screen]}</span>
          </span>
          <span className="mobile-appbar-spacer" aria-hidden="true" />
        </header>

        {error && screen !== 'collection' && (
          <div className="mobile-error-banner" role="alert">{error}</div>
        )}

        <main className="mobile-main" key={screen} aria-label={SCREEN_TITLES[screen]}>
          {screen === 'collection' && (
            <CollectionSection
              rows={rows}
              loading={loading}
              error={error}
              onAdd={onAddPlant}
              onEdit={onEditPlant}
              onEditCare={onOpenCare}
              onOpenNote={onOpenNote}
              onWater={onWater}
              onWaterMany={onWaterMany}
              onFertilize={onFertilize}
              onDelete={onDeletePlant}
            />
          )}

          {screen === 'water' && (
            <MobileCareScreen
              variant="water"
              rows={dueRows}
              loading={loading}
              onAction={onWater}
            />
          )}

          {screen === 'feed' && (
            <MobileCareScreen
              variant="feed"
              rows={dueFeedRows}
              loading={loading}
              feedingTrackedCount={feedingTrackedCount}
              onAction={onFertilize}
            />
          )}

          {screen === 'account' && (
            <MobileAccountScreen
              plantCount={rows.length}
              onImport={onImport}
              onExport={onExport}
            />
          )}
        </main>

        {screen === 'collection' && (
          <button type="button" className="mobile-fab" onClick={onAddPlant}>
            <Plus size={22} aria-hidden="true" />
            <span>Add plant</span>
          </button>
        )}
      </div>

      <nav className="mobile-navigation" aria-label="Main navigation">
        <ul className="mobile-nav-list">
          {navItems.map(({ id, label, icon: Icon, count }) => (
            <li key={id}>
              <button
                type="button"
                className={screen === id ? 'mobile-nav-item is-active' : 'mobile-nav-item'}
                aria-current={screen === id ? 'page' : undefined}
                onClick={() => selectScreen(id)}
              >
                <span className="mobile-nav-icon">
                  <Icon size={21} aria-hidden="true" />
                  {count !== undefined && count > 0 && (
                    <span className="mobile-nav-badge" aria-hidden="true">{count}</span>
                  )}
                </span>
                <span className="mobile-nav-label">{label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {children}
    </div>
  )
}

interface MobileCareScreenProps {
  variant: 'water' | 'feed'
  rows: PlantRow[]
  loading: boolean
  feedingTrackedCount?: number
  onAction: (plant: Plant) => void
}

function MobileCareScreen({
  variant,
  rows,
  loading,
  feedingTrackedCount = 0,
  onAction,
}: MobileCareScreenProps) {
  const isWater = variant === 'water'
  const Icon = isWater ? Droplets : Leaf
  const overdueText = isWater
    ? 'Plants whose watering day has arrived.'
    : 'Plants whose feeding day has arrived.'

  return (
    <section className="mobile-care-screen">
      <header className="mobile-screen-heading">
        <div className="mobile-care-hero">
          <span className={isWater ? 'mobile-care-hero-icon water-icon' : 'mobile-care-hero-icon feed-icon'}>
            <Icon size={26} aria-hidden="true" />
          </span>
          <span className="mobile-care-hero-count">{rows.length.toString().padStart(2, '0')}</span>
        </div>
        <h1>{isWater ? 'Water list' : 'Feed list'}</h1>
        <p>{overdueText}</p>
      </header>

      {loading ? (
        <div className="mobile-loading">Opening your plant journal...</div>
      ) : rows.length === 0 ? (
        <div className="mobile-empty">
          <Icon size={30} aria-hidden="true" />
          <h2>{isWater ? 'All caught up' : feedingTrackedCount > 0 ? 'All fed' : 'No feeding schedule yet'}</h2>
          <p>
            {isWater
              ? 'None of your plants need water right now.'
              : feedingTrackedCount > 0
                ? 'Every tracked plant is on schedule.'
                : 'Add a feeding interval in care details to start tracking.'}
          </p>
        </div>
      ) : (
        <ul className="mobile-care-list">
          {rows.map(({ plant }) => (
            <li key={plant.id} className="mobile-care-row">
              <span className="mobile-care-copy">
                <strong>{plant.name}</strong>
                <small>{plant.location || plant.environment}</small>
              </span>
              <span className="mobile-care-detail">
                {isWater
                  ? `Every ${plant.waterEveryDays} days`
                  : `Every ${plant.fertilizeEveryDays} days`}
              </span>
              <button
                type="button"
                className="mobile-care-done"
                aria-label={isWater ? `Mark ${plant.name} as watered` : `Mark ${plant.name} as fed`}
                onClick={() => onAction(plant)}
              >
                <Check size={17} aria-hidden="true" />
                <span>{isWater ? 'Watered' : 'Fed'}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

interface MobileAccountScreenProps {
  plantCount: number
  onImport: () => void
  onExport: () => void
}

function MobileAccountScreen({ plantCount, onImport, onExport }: MobileAccountScreenProps) {
  return (
    <section className="mobile-account-screen">
      <header className="mobile-screen-heading">
        <p className="mobile-eyebrow">LOCAL JOURNAL</p>
        <h1>Your data stays here</h1>
        <p>Plantjes for Android does not use an online account.</p>
      </header>

      <div className="mobile-account-card">
        <span className="mobile-account-icon"><UserRound size={24} aria-hidden="true" /></span>
        <h2>Plant database</h2>
        <p>
          Your {plantCount} {plantCount === 1 ? 'plant is' : 'plants are'} saved on this device.
          Export a <code>.plantjes</code> file to keep a backup, or import one to restore a journal.
          Importing replaces the current collection.
        </p>
        <div className="mobile-account-actions">
          <button type="button" className="mobile-account-action" onClick={onImport}>
            <Upload size={18} aria-hidden="true" /> Import backup
          </button>
          <button type="button" className="mobile-account-action is-primary" onClick={onExport}>
            <Download size={18} aria-hidden="true" /> Export backup
          </button>
        </div>
      </div>

      <p className="mobile-account-footnote">
        No cloud sync, analytics or remote assets are used in this build.
      </p>
    </section>
  )
}
