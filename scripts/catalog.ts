import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { basename, join } from 'node:path'
import { dimensions, epaRowSchema, manifestSchema, sourceSchema, specFields, vehicleSchema } from '../src/schema'
import type { Vehicle } from '../src/schema'

export const readJson = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'))

function jsonFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return jsonFiles(path)
    return entry.name.endsWith('.json') ? [path] : []
  }).sort()
}

export function getSourceIds(car: Vehicle) {
  const ownership = car.ownership
  return [...new Set([
    ...car.identity.sourceIds,
    ...Object.values(car.specEvidence).flatMap(claim => claim.sourceIds),
    ...dimensions.flatMap(dimension => car.scores[dimension].sourceIds),
    ...[...ownership.strengths, ...ownership.weaknesses, ...ownership.knownIssues,
      ...ownership.prevention, ...ownership.yearChanges, ownership.partsAvailability,
      ownership.mechanicalComplexity, ownership.maintenanceAccessibility,
      ownership.annualCost, car.character.driving, car.character.styling].flatMap(claim => claim?.sourceIds ?? []),
    ...(car.photo ? [car.photo.sourceId] : [])
  ])]
}

export function configurationSignature(car: Vehicle) {
  const s = car.specs
  return [car.make, car.model, car.generation, car.market, car.bodyStyle,
    s.engineCode, s.displacementL, s.aspiration, s.transmission, s.gears, s.drivetrain]
    .map(value => String(value ?? '').trim().toLowerCase()).join('|')
}

const equipmentVariants = new Map([
  ['nis-z-z34-nismo', 'nis-z-z34-base'],
  ['ford-must-s550-mach', 'ford-must-s550-gt3'],
  ['acu-int-dc2-r', 'acu-int-dc2-gsr'],
  ['por-944-s', 'por-944-late']
])
function hasDocumentedEquipmentDifference(first: Vehicle, second: Vehicle) {
  return (equipmentVariants.get(first.id) === second.id || equipmentVariants.get(second.id) === first.id)
    && first.identity.status === 'confirmed' && second.identity.status === 'confirmed'
}

export function loadCatalog() {
  const manifest = manifestSchema.parse(readJson('data/catalog-manifest.json'))
  const sources = sourceSchema.array().parse(readJson('data/sources.json'))
  const epa = epaRowSchema.array().parse(readJson('data/epa-evidence.json'))
  const sourceById = new Map(sources.map(source => [source.id, source]))
  const epaById = new Map(epa.map(row => [row.id, row]))
  const vehicles = jsonFiles('data/cars').map(path => {
    const parsed = vehicleSchema.safeParse(readJson(path))
    if (!parsed.success) throw new Error(path + '\n' + parsed.error.issues.map(issue => issue.path.join('.') + ' ' + issue.message).join('\n'))
    if (basename(path, '.json') !== parsed.data.id) throw new Error('File name must match ID in ' + path)
    return parsed.data
  })
  const rubric = JSON.parse(readFileSync('data/scoring-rubric.json', 'utf8')) as { version: string }
  const planned = manifest.batches.flatMap(batch => batch.vehicleIds)
  const vehicleById = new Map(vehicles.map(car => [car.id, car]))
  const errors: string[] = []
  const expect = (condition: unknown, message: string) => { if (!condition) errors.push(message) }
  expect(manifest.target === 200 && vehicles.length === manifest.target, 'Initial catalog must contain exactly 200 vehicles')
  expect(new Set(planned).size === vehicles.length && planned.length === vehicles.length, 'Manifest must list all vehicles exactly once')
  expect(vehicleById.size === vehicles.length, 'Duplicate vehicle IDs')
  expect(new Set(vehicles.map(car => car.configuration)).size === vehicles.length, 'Duplicate configuration IDs')
  expect(new Set(manifest.batches.map(batch => batch.id)).size === manifest.batches.length, 'Duplicate research batches')
  expect(sourceById.size === sources.length, 'Duplicate source IDs')
  expect(epaById.size === epa.length, 'Duplicate EPA row IDs')
  for (const id of planned) expect(vehicleById.has(id), 'Manifest references missing vehicle ' + id)
  for (const batch of manifest.batches) {
    for (const id of batch.vehicleIds) expect(vehicleById.get(id)?.category === batch.label, id + ' is in the wrong batch')
  }
  const configurations = new Map<string, Vehicle[]>()
  const placeholder = /\b(lorem ipsum|todo|tbd|placeholder|example\.com)\b/i
  for (const car of vehicles) {
    const signature = configurationSignature(car)
    const siblings = configurations.get(signature) ?? []
    expect(siblings.every(other => other.years.to < car.years.from || car.years.to < other.years.from || hasDocumentedEquipmentDifference(other, car)), car.id + ' overlaps the same mechanical configuration')
    configurations.set(signature, [...siblings, car])
    expect(!placeholder.test(JSON.stringify(car)), car.id + ' contains placeholder data')
    for (const id of getSourceIds(car)) expect(sourceById.has(id), car.id + ' uses unknown source ' + id)
    const rows = car.identity.epaIds.map(id => epaById.get(id))
    for (const row of rows) {
      expect(row && row.year >= car.years.from && row.year <= car.years.to && row.make.toLowerCase() === car.make.toLowerCase(), car.id + ' has an inapplicable EPA row')
      if (!row) continue
      expect(row.displ === car.specs.displacementL, car.id + ' EPA displacement mismatch')
      if (car.specs.cylinders !== null && row.cylinders !== null) expect(row.cylinders === car.specs.cylinders, car.id + ' EPA cylinder mismatch')
      if (car.specs.transmission === 'Manual') expect(row.trany === 'Manual ' + car.specs.gears + '-spd', car.id + ' EPA manual gearbox mismatch')
    }
    expect((rows.length > 0) === car.identity.sourceIds.includes('epa-vehicles'), car.id + ' EPA citations and row IDs disagree')
    if (car.identity.coverage === 'EPA by model year') {
      expect(new Set(rows.map(row => row?.year)).size === car.years.to - car.years.from + 1, car.id + ' misses an EPA model year')
    }
    if (car.identity.status === 'confirmed') {
      expect(car.identity.sourceIds.some(id => ['manufacturer', 'road test', 'specialist'].includes(sourceById.get(id)?.category ?? '')), car.id + ' requires a chassis and trim reference')
      expect(car.identity.coverage !== 'partial' && car.identity.coverage !== 'EPA by model year', car.id + ' has insufficient evidence for confirmed identity')
    }
    if (car.photo) {
      expect(sourceById.get(car.photo.sourceId)?.category === 'photograph', car.id + ' photo needs image provenance')
      expect(!car.photo.path.includes('..') && existsSync(join('public', car.photo.path)), car.id + ' photo missing from public assets')
    }
    const rated = dimensions.filter(dimension => car.scores[dimension].value !== null).length
    expect(car.research.scores === (rated === 4 ? 'assessed' : rated ? 'partial' : 'unrated'), car.id + ' assessment status mismatch')
    if (car.research.specifications === 'researched') {
      expect(specFields.every(key => car.specs[key] !== null || key === 'gears' && car.specs.transmission.endsWith('CVT') || key === 'cylinders' && car.specs.cylinderLayout === 'Rotary'), car.id + ' has incomplete specs')
    }
    for (const dimension of dimensions) {
      const score = car.scores[dimension]
      expect(score.methodologyVersion === rubric.version, car.id + ' has a mismatched rubric version')
      if (score.value === null) continue
      const categories = score.sourceIds.map(id => sourceById.get(id)?.category)
      expect(categories.some(category => category !== 'government dataset'), car.id + ' ' + dimension + ' relies on identity data alone')
      if (dimension === 'drivingEnjoyment') expect(categories.includes('road test'), car.id + ' lacks firsthand driving evidence')
      if (dimension === 'aesthetics') expect(car.aestheticsTags.length > 0, car.id + ' lacks descriptive design tags')
    }
  }
  if (errors.length) throw new Error(errors.join('\n'))
  return { vehicles, sources, manifest, epa }
}

export function summarizeCatalog(catalog: ReturnType<typeof loadCatalog>) {
  const { vehicles, sources, epa } = catalog
  const countBy = <T,>(items: T[], key: (item: T) => string) => Object.fromEntries(
    [...new Set(items.map(key))].sort().map(value => [value, items.filter(item => key(item) === value).length])
  )
  const followUp = vehicles.filter(car => car.research.followUp.length > 0 || car.identity.status === 'needs review')
  return {
    total: vehicles.length,
    makes: countBy(vehicles, car => car.make),
    categories: countBy(vehicles, car => car.category),
    identity: countBy(vehicles, car => car.identity.status),
    identityCoverage: countBy(vehicles, car => car.identity.coverage),
    epaFullYearCoverage: vehicles.filter(car => new Set(car.identity.epaIds.map(id => epa.find(row => row.id === id)?.year)).size === car.years.to - car.years.from + 1).length,
    specifications: Object.fromEntries(specFields.map(field => [field, vehicles.filter(car => car.specs[field] !== null).length])),
    research: {
      specifications: countBy(vehicles, car => car.research.specifications),
      ownership: countBy(vehicles, car => car.research.ownership),
      scores: countBy(vehicles, car => car.research.scores)
    },
    scores: Object.fromEntries(dimensions.map(dimension => [dimension, Object.fromEntries(
      ['high', 'medium', 'low', 'unrated'].map(level => [level, vehicles.filter(car => car.scores[dimension].confidence === level).length])
    )])),
    chartReady: vehicles.filter(car => dimensions.every(dimension => car.scores[dimension].value !== null)).length,
    sources: sources.length,
    sourcesByType: countBy(sources, source => source.category),
    sourceRows: epa.length,
    fullyCurated: vehicles.filter(car => car.identity.status === 'confirmed' && car.research.specifications === 'researched' && car.research.ownership === 'documented' && car.research.scores === 'assessed' && !car.research.followUp.length).length,
    followUp: followUp.map(car => ({ id: car.id, tasks: car.research.followUp }))
  }
}
