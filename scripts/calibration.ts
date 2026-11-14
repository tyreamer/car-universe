import { createHash } from 'node:crypto'
import { z } from 'zod'
import { dimensions } from '../src/schema'
import type { Vehicle } from '../src/schema'

const value = z.number().int().min(0).max(100).nullable()
const decision = z.object({ leftValue: value, rightValue: value, outcome: z.enum(['unknown', 'tie', 'left-higher', 'right-higher']), rationale: z.string().min(25) }).strict()
export const calibrationSchema = z.object({
  version: z.string(), assessedAt: z.iso.date(), assessor: z.object({ id: z.string().min(4), type: z.enum(['ai', 'human']) }),
  reviewStatus: z.enum(['ai-reviewed', 'human-reviewed']), cohortIds: z.array(z.string()).min(1),
  fingerprints: z.record(z.string(), z.string().regex(/^[a-f0-9]{64}$/)),
  pairs: z.array(z.object({
    id: z.string(), left: z.string(), right: z.string(), assessor: z.object({ id: z.string().min(4), type: z.enum(['ai', 'human']) }),
    reviewedAt: z.iso.date(), reviewStatus: z.enum(['ai-reviewed', 'human-reviewed']), rubricVersion: z.string(),
    revision: z.number().int().positive(), changeReason: z.string().min(25),
    dimensions: z.object({ longevity: decision, ownershipCost: decision, drivingEnjoyment: decision, aesthetics: decision }).strict()
  }).strict()).min(1)
}).strict()
export type Calibration = z.infer<typeof calibrationSchema>
export function assessmentFingerprint(car: Vehicle) {
  return createHash('sha256').update(JSON.stringify({ scores: car.scores, evidenceLedger: car.evidenceLedger, assessmentReview: car.assessmentReview })).digest('hex')
}
export function validateCalibration(vehicles: Vehicle[], raw: unknown) {
  const calibration = calibrationSchema.parse(raw)
  const byId = new Map(vehicles.map(car => [car.id, car]))
  const errors: string[] = []
  const expect = (ok: unknown, message: string) => { if (!ok) errors.push(message) }
  expect(new Set(calibration.cohortIds).size === calibration.cohortIds.length, 'Duplicate cohort IDs')
  expect(new Set(calibration.pairs.map(p => p.id)).size === calibration.pairs.length, 'Duplicate decision IDs')
  expect(calibration.reviewStatus !== 'human-reviewed' || calibration.assessor.type === 'human', 'Human review cannot be inferred from AI review')
  for (const id of calibration.cohortIds) {
    const car = byId.get(id)
    expect(car?.assessmentReview, 'Missing substantive review: ' + id)
    expect(car && assessmentFingerprint(car) === calibration.fingerprints[id], 'Assessment changed: explicitly re-review calibration and report the change for ' + id)
    expect(calibration.pairs.some(p => p.left === id || p.right === id), 'Cohort car needs a comparison: ' + id)
  }
  for (const p of calibration.pairs) {
    expect(p.left !== p.right && calibration.cohortIds.includes(p.left) && calibration.cohortIds.includes(p.right), 'Invalid comparison participants: ' + p.id)
    expect(p.rubricVersion === calibration.version, 'Comparison rubric mismatch: ' + p.id)
    expect(p.reviewStatus !== 'human-reviewed' || p.assessor.type === 'human', 'Comparison needs actual human assessor: ' + p.id)
    for (const d of dimensions) {
      const a = byId.get(p.left)?.scores[d].value, b = byId.get(p.right)?.scores[d].value, record = p.dimensions[d]
      expect(a === record.leftValue && b === record.rightValue, 'Reviewed scores changed: ' + p.id + ' ' + d)
      const outcome = a == null || b == null ? 'unknown' : a === b ? 'tie' : a > b ? 'left-higher' : 'right-higher'
      expect(outcome === record.outcome, 'Reviewed ordering changed: ' + p.id + ' ' + d)
    }
  }
  for (const car of vehicles) for (const d of dimensions) {
    const comparison = car.scores[d].derivation?.comparison
    if (!comparison) continue
    expect(comparison.referenceIds.every(id => byId.has(id) && id !== car.id), 'Invalid reference car: ' + car.id)
    expect(comparison.decisionIds.every(id => calibration.pairs.some(p => p.id === id && (p.left === car.id || p.right === car.id))), 'Missing reviewed comparison: ' + car.id)
    expect(comparison.referenceIds.every(id => comparison.decisionIds.some(decisionId => calibration.pairs.some(p => p.id === decisionId && [p.left, p.right].includes(id)))), 'Reference car lacks a reviewed decision: ' + car.id)
  }
  if (errors.length) throw new Error(errors.join('\n'))
  return calibration
}
