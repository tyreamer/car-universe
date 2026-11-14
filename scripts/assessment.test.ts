import test from 'node:test'
import assert from 'node:assert/strict'
import { loadCatalog, readJson, summarizeCatalog } from './catalog'
import { validateCalibration } from './calibration'
import { ratingChanges } from './reports'
import type { Baseline } from './reports'
import { dimensions, scoreSchema, vehicleSchema } from '../src/schema'
import { coordinates, groupPositions, markerRadius, missingAxes, plot } from '../src/chart'
import { labels, mechanicalBurden, parseTaste, scoreText } from '../src/scoring'

const catalog = loadCatalog()
const reviewed = catalog.vehicles.find(car => car.scores.drivingEnjoyment.value !== null)!
const decisions = readJson('data/calibration-decisions.json')

test('derived score must equal a recognized anchor plus supported adjustments', () => {
  const car = structuredClone(reviewed), score = car.scores.drivingEnjoyment
  assert.ok(vehicleSchema.safeParse(car).success)
  score.derivation!.finalValue! -= 5
  assert.equal(scoreSchema.safeParse(score).success, false)
  score.value = score.derivation!.finalValue
  score.derivation!.anchor -= 5
  assert.equal(vehicleSchema.safeParse(car).success, false, 'invented anchors are invalid')
  const unsupported = structuredClone(reviewed)
  const s = unsupported.scores.drivingEnjoyment
  s.value! -= 5; s.derivation!.finalValue! -= 5
  s.derivation!.adjustments.push({ delta: -5, reason: 'A claimed adjustment with an evidence ID that does not exist.', evidenceIds: ['missing-claim'] })
  assert.equal(vehicleSchema.safeParse(unsupported).success, false)
  const absent = structuredClone(reviewed)
  absent.scores.drivingEnjoyment.derivation = null
  assert.equal(vehicleSchema.safeParse(absent).success, false, 'missing derivation returns a validation error without throwing')
})

test('null has no numeric derivation and is distinct from zero', () => {
  assert.equal(scoreText(null), 'Unrated')
  assert.equal(scoreText(0), '0')
  assert.equal(mechanicalBurden(null), null)
  assert.equal(mechanicalBurden(0), 100)
  const s = structuredClone(reviewed.scores.drivingEnjoyment)
  s.value = null; s.confidence = 'unrated'
  assert.equal(scoreSchema.safeParse(s).success, false)
  s.derivation = null
  assert.ok(scoreSchema.safeParse(s).success)
})

test('evidence must match configuration, generation, engine, transmission, market and overlapping years', () => {
  for (const patch of [{ configuration: 'another-car' }, { generation: 'Wrong generation' }, { engineCode: 'Wrong engine' }, { transmission: 'Automatic' }, { market: 'Japan' }, { years: { from: 1886, to: 1887 } }]) {
    const car = structuredClone(reviewed)
    Object.assign(car.evidenceLedger[0].applicability, patch)
    assert.equal(vehicleSchema.safeParse(car).success, false, JSON.stringify(patch))
  }
  const car = structuredClone(reviewed)
  car.evidenceLedger[0].applicability.status = 'unresolved'
  assert.equal(vehicleSchema.safeParse(car).success, false, 'unresolved evidence cannot support a numeric derivation')
})

test('review identity and dates cannot imply nonexistent human approval', () => {
  const s = structuredClone(reviewed.scores.drivingEnjoyment)
  s.reviewStatus = 'human-reviewed'
  assert.equal(scoreSchema.safeParse(s).success, false)
  s.reviewStatus = 'ai-reviewed'; s.reviewedAt = null
  assert.equal(scoreSchema.safeParse(s).success, false)
})

test('dollar estimates need documented scoped inputs, and legacy annual averages are rejected', () => {
  const car = structuredClone(reviewed)
  car.assessmentReview!.costScenarios.push({ name: 'Scheduled work', scope: 'Illustrative test scope for service only.', amountUsd: 999, inputs: [], evidenceIds: [car.evidenceLedger[0].id] })
  assert.equal(vehicleSchema.safeParse(car).success, false)
  car.assessmentReview!.costScenarios = []
  car.ownership.annualCost = { lowUsd: 100, highUsd: 200, annualMiles: 3000, sourceIds: [car.evidenceLedger[0].sourceIds[0]], assumptions: 'Unsupported average in an obsolete field.' }
  assert.equal(vehicleSchema.safeParse(car).success, false)
})

const fixture = (id: string, x: number | null, y: number | null, upkeep: number | null = null, beauty: number | null = null) => ({ id, scores: { longevity: { value: x }, drivingEnjoyment: { value: y }, ownershipCost: { value: upkeep }, aesthetics: { value: beauty } } })

test('coordinates use fixed square geometry and are stable under unrelated filtering', () => {
  const a = fixture('first', 75, 80), b = fixture('unrelated', 25, 10)
  assert.equal(plot.size, 500)
  assert.deepEqual(coordinates(a, 'longevity', 'drivingEnjoyment'), { x: 437, y: 136 })
  assert.deepEqual(groupPositions([a, b], 'longevity', 'drivingEnjoyment')[0], groupPositions([a], 'longevity', 'drivingEnjoyment')[0])
  assert.deepEqual(coordinates(fixture('origin', 0, 0), 'longevity', 'drivingEnjoyment'), { x: plot.left, y: plot.top + plot.size })
})

test('overlaps preserve raw coordinates without displaced markers or averaged supplementary scores', () => {
  const a = fixture('a', 60, 80, 10, 30), b = fixture('b', 60, 80, 90, 95)
  const groups = groupPositions([a, b], 'longevity', 'drivingEnjoyment')
  assert.equal(groups.length, 1)
  assert.deepEqual({ x: groups[0].x, y: groups[0].y }, coordinates(a, 'longevity', 'drivingEnjoyment'))
  assert.deepEqual(groups[0].cars, [a, b])
})

test('any two complete axes suffice; missing supplementary data is not imputed', () => {
  const a = fixture('a', 0, 80), missing = fixture('missing', null, 80)
  assert.equal(groupPositions([a, missing], 'longevity', 'drivingEnjoyment').length, 1)
  assert.deepEqual(missingAxes(missing, 'longevity', 'drivingEnjoyment'), ['longevity'])
  assert.equal(markerRadius(null), null)
  assert.ok(markerRadius(0)! > markerRadius(100)!)
  assert.equal(coordinates(a, 'ownershipCost', 'aesthetics'), null)
})

test('all score labels are higher-is-better; only marker burden inverts upkeep', () => {
  assert.equal(labels.ownershipCost, 'Low upkeep')
  assert.equal(labels.aesthetics, 'Editorial aesthetics')
  for (const score of [0, 25, 50, 75, 100]) assert.equal(mechanicalBurden(score), 100 - score)
})

test('reviewed decisions reject changed scores, rationales, applicability and silent ordering changes', () => {
  assert.ok(validateCalibration(catalog.vehicles, decisions))
  const cars = structuredClone(catalog.vehicles)
  const car = cars.find(car => car.id === reviewed.id)!
  car.scores.drivingEnjoyment.rationale += ' Changed judgment.'
  assert.throws(() => validateCalibration(cars, decisions), /explicitly re-review/)
  const ordering = structuredClone(decisions) as { pairs: { dimensions: { drivingEnjoyment: { outcome: string } } }[] }
  ordering.pairs[0].dimensions.drivingEnjoyment.outcome = 'left-higher'
  assert.throws(() => validateCalibration(catalog.vehicles, ordering), /ordering changed/)
})

test('coverage is recomputed from actual values and review status rather than quotas', () => {
  const r = summarizeCatalog(catalog)
  assert.equal(r.total, catalog.vehicles.length)
  assert.equal(r.allFourRated, catalog.vehicles.filter(c => dimensions.every(d => c.scores[d].value !== null)).length)
  for (const [pair, count] of Object.entries(r.axisPairs)) {
    const [x, y] = pair.split('/') as [typeof dimensions[number], typeof dimensions[number]]
    assert.equal(count, catalog.vehicles.filter(c => c.scores[x].value !== null && c.scores[y].value !== null).length)
  }
  assert.equal(r.reviewStatus['ai-reviewed'], catalog.vehicles.filter(c => c.assessmentReview?.status === 'ai-reviewed').length)
  assert.equal(r.fullyCurated, catalog.vehicles.filter(car => car.identity.status === 'confirmed' && car.research.specifications === 'researched' && car.research.ownership === 'documented' && car.research.scores === 'assessed' && car.assessmentReview?.status === 'human-reviewed' && !car.research.followUp.length).length)
})

test('every dimension including unchanged nulls has an accurate before/after record', () => {
  const baseline = readJson('data/assessment-baseline.json') as Baseline
  const rows = ratingChanges(catalog.vehicles, baseline)
  assert.equal(rows.length, catalog.vehicles.length * dimensions.length)
  for (const row of rows) {
    assert.equal(row.oldScore, baseline.vehicles[row.id].scores[row.dimension].value)
    assert.equal(row.newScore, catalog.vehicles.find(c => c.id === row.id)!.scores[row.dimension].value)
    assert.ok(row.reason && row.reviewStatus && row.assessmentType)
  }
  assert.deepEqual((readJson('docs/rating-changes.json') as { changes: unknown }).changes, rows)
})

test('My taste validates local values, preserves zero and never mutates catalog scores', () => {
  assert.deepEqual(parseTaste('{"one":0,"two":100,"bad":-1,"high":101,"string":"80"}'), { one: 0, two: 100 })
  assert.deepEqual(parseTaste('not json'), {})
  assert.deepEqual(parseTaste('[]'), {})
  const original = reviewed.scores.aesthetics.value
  const local = parseTaste(JSON.stringify({ [reviewed.id]: 12 }))
  assert.equal(local[reviewed.id], 12)
  assert.equal(reviewed.scores.aesthetics.value, original)
})
