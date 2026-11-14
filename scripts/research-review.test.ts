import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { loadCatalog, readJson } from './catalog'
import { validateCalibration } from './calibration'
import { researchReviewMarkdown, researchReviewSchema, validateResearchReview } from './research-review'
import { vehicleSchema } from '../src/schema'

const catalog = loadCatalog()
const calibration = validateCalibration(catalog.vehicles, readJson('data/calibration-decisions.json'))
const receipt = researchReviewSchema.parse(readJson('data/research-reviews/2026-11-14.json'))
const validate = (value: unknown) => validateResearchReview(value, catalog.vehicles, catalog.sources, calibration)

test('submitted research has an intact archive and complete current change report', () => {
  assert.ok(validate(receipt))
  assert.equal(receipt.vehicles.flatMap(v => v.changes).length, receipt.cohortIds.length * 4)
  assert.equal(readFileSync('docs/RESEARCH_UPDATE_2026-11-14.md', 'utf8'), researchReviewMarkdown(receipt))
  assert.equal(receipt.submission.identityType, 'unknown', 'a supplied report is not proof of human authorship or approval')
})

test('receipt rejects changed source archive, omitted dimensions, stale values and silent comparison revisions', () => {
  const checksum = structuredClone(receipt); checksum.submission.sha256 = '0'.repeat(64)
  assert.throws(() => validate(checksum), /checksum/)
  const missing = structuredClone(receipt); missing.vehicles[0].changes.pop()
  assert.throws(() => validate(missing), /all four/)
  const altered = structuredClone(receipt); altered.vehicles[0].changes[0].after = altered.vehicles[0].changes[0].after === 25 ? 75 : 25
  assert.throws(() => validate(altered), /score\/status mismatch/)
  const revision = structuredClone(receipt); revision.comparisons[0].revision = revision.comparisons[0].previousRevision
  assert.throws(() => validate(revision), /revision required/)
  const source = structuredClone(receipt); source.claims[0].sourceIds = ['nonexistent-source']
  assert.throws(() => validate(source), /Unknown inspected source/)
})

test('inapplicable submitted material remains outside numeric derivations and positive system coverage', () => {
  for (const car of catalog.vehicles) {
    const unresolved = new Set(car.evidenceLedger.filter(e => e.applicability.status === 'unresolved').map(e => e.id))
    for (const s of Object.values(car.scores)) {
      const used = [...(s.derivation?.evidenceIds ?? []), ...(s.derivation?.adjustments.flatMap(a => a.evidenceIds) ?? [])]
      assert.ok(used.every(id => !unresolved.has(id)))
    }
    if (car.assessmentReview) for (const item of [...Object.values(car.assessmentReview.systems), ...Object.values(car.assessmentReview.costs)]) {
      if (item.status !== 'unknown') assert.ok(item.evidenceIds.every(id => !unresolved.has(id)))
    }
  }
})

test('priced scenarios require matching arithmetic and directly cited input evidence without implying a score', () => {
  const priced = catalog.vehicles.find(c => c.assessmentReview?.costScenarios.some(s => s.amountUsd !== null))!
  assert.ok(priced, 'this release includes a documented parts basket')
  const car = structuredClone(priced)
  const basket = car.assessmentReview!.costScenarios.find(s => s.amountUsd !== null)!
  assert.equal(basket.amountUsd, basket.inputs.reduce((sum, input) => sum + input.amountUsd, 0))
  assert.equal(car.scores.ownershipCost.value, null, 'an isolated basket does not supply the full cost scope')
  basket.inputs[0].amountUsd += 1
  assert.equal(vehicleSchema.safeParse(car).success, false)
  basket.inputs[0].amountUsd -= 1
  basket.inputs[0].sourceIds = ['epa-vehicles']
  assert.equal(vehicleSchema.safeParse(car).success, false, 'an unrelated existing registry source does not support a price')
})
