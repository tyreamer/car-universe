import { mkdirSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { getSourceIds, loadCatalog, summarizeCatalog } from './catalog'

export function writeCatalog(output: string, catalog = loadCatalog()) {
  const { vehicles, sources } = catalog
  const report = summarizeCatalog(catalog)
  mkdirSync(output, { recursive: true })
  const summary = vehicles.map(car => ({
    id: car.id, make: car.make, model: car.model, generation: car.generation, variant: car.variant,
    years: car.years, market: car.market, bodyStyle: car.bodyStyle, category: car.category,
    identity: car.identity.status, aestheticsTags: car.aestheticsTags,
    transmission: car.specs.transmission, hasClutchPedal: car.specs.hasClutchPedal,
    engineCode: car.specs.engineCode, drivetrain: car.specs.drivetrain,
    engineLocation: car.specs.engineLocation, cylinderLayout: car.specs.cylinderLayout,
    scores: Object.fromEntries(Object.entries(car.scores).map(([dimension, score]) => [
      dimension, { value: score.value, confidence: score.confidence, assessmentType: score.assessmentType, reviewStatus: score.reviewStatus }
    ]))
  }))
  const directory = join(output, 'vehicles')
  mkdirSync(directory, { recursive: true })
  const activeFiles = new Set(vehicles.map(car => car.id + '.json'))
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.json') && !activeFiles.has(entry.name)) unlinkSync(join(directory, entry.name))
  }
  for (const car of vehicles) {
    const ids = new Set(getSourceIds(car))
    writeFileSync(join(directory, car.id + '.json'), JSON.stringify({
      vehicle: car, sources: sources.filter(source => ids.has(source.id)),
      epa: catalog.epa.filter(row => car.identity.epaIds.includes(row.id))
    }))
  }
  writeFileSync(join(output, 'index.json'), JSON.stringify({
    vehicles: summary,
    coverage: { total: report.total, chartReady: report.chartReady, sources: report.sources, identity: report.identity }
  }))
  return vehicles.length
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const count = writeCatalog('src/generated')
  console.log('Built searchable index and ' + count + ' individual static profiles.')
}
