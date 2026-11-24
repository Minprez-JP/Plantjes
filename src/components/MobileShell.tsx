import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Check,
  Download,
  Droplets,
  LayoutGrid,
  Leaf,
  Menu,
  PlantPot,
  Plus,
  Upload,
  UserRound,
  X,
} from 'lucide-react'
import type { Plant } from '../db'
import type { PlantRow } from '../types'
import { CollectionSection } from './CollectionSection'

const MOBILE_SCREENS = ['collection', 'water', 'feed', 'account'] as const
export type MobileScreen = (typeof MOBILE_SCREENS)[number]

interface MobileHashState {
  screen: MobileScreen
  menuOpen: boolean
}

/**
 * Hash navigation is used deliberately: unlike pushState alone, a hash change
 * is a real WebView history entry, so the Android back button emits
 * `hashchange`/`popstate` instead of exiting the app.
 */
function readMobileHash(hash: string): MobileHashState | null {
  const raw = hash.replace(/^#\/?/, '')
  if (!raw) return null

  const [screen, mode] = raw.split('/')
  if (!(MOBILE_SCREENS as readonly string[]).includes(screen)) return null

  return { screen: screen as MobileScreen, menuOpen: mode === 'menu' }
}

function mobileHash(screen: MobileScreen, menuOpen: boolean) {
  return `#/${screen}${menuOpen ? '/menu' : ''}`
}

function writeMobileHash(screen: MobileScreen, menuOpen: boolean, mode: 'push' | 'replace') {
  const next = mobileHash(screen, menuOpen)
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
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const navRef = useRef<HTMLElement>(null)

  const openMenu = useCallback(() => {
    setMenuOpen(true)
    writeMobileHash(screen, true, 'push')
  }, [screen])

  const closeMenu = useCallback(() => {
    if (readMobileHash(window.location.hash)?.menuOpen) {
      window.history.back()
    } else {
      writeMobileHash(screen, false, 'replace')
    }
    setMenuOpen(false)
    menuButtonRef.current?.focus()
  }, [screen])

  const selectScreen = useCallback((next: MobileScreen) => {
    const wasMenuOpen = readMobileHash(window.location.hash)?.menuOpen ?? false
    writeMobileHash(next, false, wasMenuOpen ? 'replace' : 'push')
    setScreen(next)
    setMenuOpen(false)
    menuButtonRef.current?.focus()
  }, [])

  useEffect(() => {
    const restored = readMobileHash(window.location.hash)
    if (restored) {
      setScreen(restored.screen)
      setMenuOpen(restored.menuOpen)
    } else {
      writeMobileHash('collection', false, 'replace')
    }

    const syncFromHash = () => {
      const next = readMobileHash(window.location.hash)
      if (!next) return
      setScreen(next.screen)
      setMenuOpen(next.menuOpen)
    }

    window.addEventListener('hashchange', syncFromHash)
    window.addEventListener('popstate', syncFromHash)
    return () => {
      window.removeEventListener('hashchange', syncFromHash)
      window.removeEventListener('popstate', syncFromHash)
    }
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    navRef.current?.querySelector<HTMLButtonElement>('button')?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [menuOpen, closeMenu])

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

      if (menuOpen) {
        event.preventDefault()
        closeMenu()
        return
      }

      if (screen !== 'collection') {
        event.preventDefault()
        selectScreen('collection')
      }
    }

    window.addEventListener('plantjes:back', handleNativeBack)
    return () => window.removeEventListener('plantjes:back', handleNativeBack)
  }, [closeMenu, menuOpen, screen, selectScreen])

  const navItems = [
    { id: 'collection', label: 'Collection', icon: LayoutGrid, count: rows.length },
    { id: 'water', label: 'Water', icon: Droplets, count: dueRows.length },
    { id: 'feed', label: 'Feed', icon: Leaf, count: dueFeedRows.length },
    { id: 'account', label: 'Account', icon: UserRound, count: undefined },
  ] as const

  return (
    <div className="mobile-shell">
      <header className="mobile-topbar">
        <button
          ref={menuButtonRef}
          type="button"
          className="mobile-topbar-button"
          aria-label="Open navigation"
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          onClick={menuOpen ? closeMenu : openMenu}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <span className="mobile-brand">
          <span className="mobile-brand-mark"><PlantPot size={18} strokeWidth={2} /></span>
          Plantjes<span className="mobile-brand-period">.</span>
        </span>

        <button
          type="button"
          className="mobile-add-button"
          aria-label="Add plant"
          onClick={onAddPlant}
        >
          <Plus size={17} /> <span>Add</span>
        </button>
      </header>

      {menuOpen && (
        <>
          <div className="mobile-nav-scrim" aria-hidden="true" onClick={closeMenu} />
          <nav
            ref={navRef}
            id="mobile-navigation"
            className="mobile-nav-drawer"
            aria-label="Main navigation"
          >
            <div className="mobile-nav-header">
              <div>
                <p className="eyebrow">PLANTJES</p>
                <h2>Navigate</h2>
              </div>
              <button
                type="button"
                className="mobile-nav-close"
                aria-label="Close navigation"
                onClick={closeMenu}
              >
                <X size={18} />
              </button>
            </div>

            <div className="mobile-nav-list">
              {navItems.map(({ id, label, icon: Icon, count }) => (
                <button
                  key={id}
                  type="button"
                  className={screen === id ? 'mobile-nav-item is-active' : 'mobile-nav-item'}
                  aria-current={screen === id ? 'page' : undefined}
                  onClick={() => selectScreen(id)}
                >
                  <Icon size={18} aria-hidden />
                  <span>{label}</span>
                  {count !== undefined && <span className="mobile-nav-count">{count}</span>}
                </button>
              ))}
            </div>

            <p className="mobile-nav-footnote">No online account. Everything stays on this device.</p>
          </nav>
        </>
      )}

      {error && screen !== 'collection' && (
        <div className="mobile-error-banner" role="alert">{error}</div>
      )}

      <main className="mobile-main">
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
  const heading = isWater ? 'Water list' : 'Feed list'
  const overdueText = isWater
    ? 'Plants whose watering day has arrived.'
    : 'Plants whose feeding day has arrived.'

  return (
    <section className="mobile-care-screen">
      <header className="mobile-screen-heading">
        <p className="eyebrow">{isWater ? 'TODAY’S CARE' : 'FEEDING SCHEDULE'}</p>
        <h1>{heading} <span>{rows.length.toString().padStart(2, '0')}</span></h1>
        <p>{overdueText}</p>
      </header>

      {loading ? (
        <div className="mobile-loading">Opening your plant journal...</div>
      ) : rows.length === 0 ? (
        <div className="mobile-empty">
          <Icon size={28} aria-hidden />
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
              <span className={isWater ? 'mobile-care-icon water-icon' : 'mobile-care-icon feed-icon'}>
                <Icon size={17} aria-hidden />
              </span>
              <span className="mobile-care-copy">
                <strong>{plant.name}</strong>
                <small>{plant.location || plant.environment}</small>
                <small className="mobile-care-detail">
                  {isWater
                    ? `Every ${plant.waterEveryDays} days`
                    : `Every ${plant.fertilizeEveryDays} days`}
                </small>
              </span>
              <button
                type="button"
                className="mobile-care-done"
                aria-label={isWater ? `Mark ${plant.name} as watered` : `Mark ${plant.name} as fed`}
                onClick={() => onAction(plant)}
              >
                <Check size={16} aria-hidden />
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
        <p className="eyebrow">ACCOUNT</p>
        <h1>Local journal</h1>
        <p>Plantjes for Android does not use an online account.</p>
      </header>

      <div className="mobile-account-card">
        <span className="mobile-account-icon"><UserRound size={22} aria-hidden /></span>
        <h2>Plant database</h2>
        <p>
          Your {plantCount} {plantCount === 1 ? 'plant is' : 'plants are'} saved on this device.
          Export a <code>.plantjes</code> file to keep a backup, or import one to restore a journal.
          Importing replaces the current collection.
        </p>
        <div className="mobile-account-actions">
          <button type="button" className="button button-outline" onClick={onImport}>
            <Upload size={16} /> Import backup
          </button>
          <button type="button" className="button button-primary" onClick={onExport}>
            <Download size={16} /> Export backup
          </button>
        </div>
      </div>

      <p className="mobile-account-footnote">
        No cloud sync, analytics or remote assets are used in this build.
      </p>
    </section>
  )
}
