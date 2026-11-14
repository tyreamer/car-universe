import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { writeCatalog } from './build-catalog'
import { getSourceIds, readJson } from './catalog'
import { dimensions, scoreSchema, vehicleSchema } from '../src/schema'
import { loadCatalog, summarizeCatalog } from './catalog'

const catalog = loadCatalog()
const assessed = catalog.vehicles.find(car => car.id === 'maz-mx5-na16')!
test('initial manifest compiles to 200 unique configurations', () => {
  assert.equal(catalog.vehicles.length, 200)
  assert.equal(new Set(catalog.vehicles.map(car => car.id)).size, 200)
  assert.equal(summarizeCatalog(catalog).chartReady, catalog.vehicles.filter(c => c.scores.longevity.value !== null && c.scores.drivingEnjoyment.value !== null).length)
})
test('a score requires supporting evidence and five-point increments', () => {
  const score = assessed.scores.drivingEnjoyment
  assert.ok(scoreSchema.safeParse(score).success)
  for (const patch of [{ value: 83 }, { value: 105 }, { reviewedAt: null }, { evidence: [] }, { confidence: 'unrated' }, { rationale: '' }]) {
    assert.equal(scoreSchema.safeParse({ ...score, ...patch }).success, false)
  }
})
test('an unrated assessment preserves null and cannot claim numeric confidence', () => {
  const car = catalog.vehicles.find(vehicle => vehicle.scores.longevity.value === null)!
  const score = car.scores.longevity
  assert.ok(scoreSchema.safeParse(score).success)
  assert.equal(scoreSchema.safeParse({ ...score, confidence: 'low' }).success, false)
})
test('manual clutch, gearbox and specification provenance stay coherent', () => {
  assert.equal(vehicleSchema.safeParse({ ...assessed, specs: { ...assessed.specs, hasClutchPedal: false } }).success, false)
  assert.equal(vehicleSchema.safeParse({ ...assessed, specEvidence: {} }).success, false)
  const smg = catalog.vehicles.find(car => car.id === 'bmw-m3-e46-smg')!
  assert.equal(smg.specs.hasClutchPedal, false)
  assert.equal(smg.specs.transmission, 'Automated manual')
})
test('each available dimension contributes to the coverage report', () => {
  const report = summarizeCatalog(catalog)
  for (const dimension of dimensions) assert.equal(Object.values(report.scores[dimension]).reduce((sum, count) => sum + count, 0), 200)
})

test('build writes one static profile per vehicle and removes stale profiles', () => {
  const directory = mkdtempSync(join(tmpdir(), 'car-universe-build-'))
  try {
    assert.equal(writeCatalog(directory, catalog), 200)
    const profiles = join(directory, 'vehicles')
    writeFileSync(join(profiles, 'retired.json'), '{}')
    writeCatalog(directory, catalog)
    assert.equal(readdirSync(profiles).length, 200)
    const index = readJson(join(directory, 'index.json')) as { vehicles: { id: string }[] }
    assert.deepEqual(index.vehicles.map(car => car.id), catalog.vehicles.map(car => car.id))
    const profile = readJson(join(profiles, assessed.id + '.json')) as { vehicle: unknown; sources: { id: string }[] }
    assert.deepEqual(profile.vehicle, assessed)
    assert.deepEqual(new Set(profile.sources.map(source => source.id)), new Set(getSourceIds(assessed)))
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
