import { useMemo } from 'react'
import { Sun } from 'lucide-react'
import { CareDialog } from './components/CareDialog'
import { CareSidebar } from './components/CareSidebar'
import { CollectionSection } from './components/CollectionSection'
import { ExportDialog } from './components/ExportDialog'
import { ImportDialog } from './components/ImportDialog'
import { NoteDialog } from './components/NoteDialog'
import { OverviewStrip } from './components/OverviewStrip'
import { PlantDialog } from './components/PlantDialog'
import { SiteFooter } from './components/SiteFooter'
import { TopBar } from './components/TopBar'
import { usePlantJournal } from './hooks/usePlantJournal'
import { listBackupLocations } from './lib/backup'
import { formatToday } from './lib/dates'

function App() {
  const {
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
  } = usePlantJournal()

  const backupLocationCount = useMemo(
    () => listBackupLocations(rows.map(({ plant }) => plant), locations).length,
    [locations, rows],
  )

  return (
    <div className="app-shell">
      <TopBar onAddPlant={openNewPlant} onExport={openExport} onImport={openImport} />

      <main id="top" className="dashboard">
        <section className="welcome-row">
          <div className="date-note"><Sun size={16} /><span>{formatToday()}</span></div>
        </section>

        <OverviewStrip
          plantCount={rows.length}
          dueCount={dueRows.length}
          wateredCount={wateredCount}
          nextFeedingLabel={nextFeedingLabel}
        />

        <div className="content-layout">
          <CollectionSection
            rows={rows}
            loading={loading}
            error={loadError || actionError}
            onAdd={openNewPlant}
            onEdit={openEditPlant}
            onEditCare={openCareDetails}
            onOpenNote={openNote}
            onWater={waterPlant}
            onWaterMany={waterPlants}
            onFertilize={fertilizePlant}
            onDelete={removePlant}
          />
          <CareSidebar
            dueRows={dueRows}
            dueFeedRows={dueFeedRows}
            feedingTrackedCount={feedingTrackedCount}
            onWater={waterPlant}
            onFertilize={fertilizePlant}
          />
        </div>

        <SiteFooter />
      </main>

      {formOpen && (
        <PlantDialog
          key={editingPlant?.id ?? 'new-plant'}
          plant={editingPlant}
          locations={locations}
          error={saveError}
          onClose={closeForm}
          onSave={savePlant}
          onAddLocation={addLocation}
        />
      )}

      {carePlant && (
        <CareDialog
          key={carePlant.id}
          plant={carePlant}
          error={careError}
          onClose={closeCareDetails}
          onSave={saveCare}
        />
      )}

      {notePlant && (
        <NoteDialog
          key={notePlant.id}
          plant={notePlant}
          error={noteError}
          onClose={closeNote}
          onSave={saveNote}
        />
      )}

      {exportOpen && (
        <ExportDialog
          plantCount={rows.length}
          locationCount={backupLocationCount}
          error={exportError}
          onClose={closeExport}
          onExport={exportJournal}
        />
      )}

      {importOpen && (
        <ImportDialog
          currentPlantCount={rows.length}
          currentLocationCount={locations.length}
          error={importError}
          onClose={closeImport}
          onImport={importJournal}
        />
      )}
    </div>
  )
}

export default App
