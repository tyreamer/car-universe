import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { z } from 'zod'
import { dimensions } from '../src/schema'
import type { Vehicle, Source } from '../src/schema'
import { labels } from '../src/scoring'
import { assessmentFingerprint, calibrationSchema } from './calibration'
import type { Calibration } from './calibration'

const digest = z.string().regex(/^[a-f0-9]{64}$/)
const score = z.number().int().min(0).max(100).nullable()
export const researchReviewSchema = z.object({
  id: z.string(), baselineCommit: z.string().regex(/^[a-f0-9]{40}$/), assessedAt: z.iso.date(),
  assessor: z.object({ id: z.string().min(4), type: z.literal('ai') }).strict(),
  reviewStatus: z.literal('ai-reviewed'), rubricVersion: z.string(),
  submission: z.object({
    path: z.string().regex(/^docs\/research\/[a-z0-9-]+\.txt$/), sha256: digest,
    claimedAssessor: z.string(), claimedAssessmentDate: z.iso.date(), identityType: z.literal('unknown'), note: z.string().min(25)
  }).strict(),
  cohortIds: z.array(z.string()).min(1),
  claims: z.array(z.object({
    id: z.string(), vehicleIds: z.array(z.string()).min(1), disposition: z.enum(['accepted', 'narrowed', 'rejected', 'unresolved']),
    submittedClaim: z.string().min(10), decision: z.string().min(25), sourceIds: z.array(z.string()),
    ledgerReferences: z.array(z.object({ vehicleId: z.string(), evidenceId: z.string() }).strict()),
    unresolvedUrls: z.array(z.url({ protocol: /^https$/ }))
  }).strict()).min(1),
  vehicles: z.array(z.object({
    id: z.string(), beforeFingerprint: digest, afterFingerprint: digest,
    changes: z.array(z.object({
      dimension: z.enum(dimensions), before: score, after: score,
      assessmentType: z.enum(['evidence-informed editorial', 'editorial taste', 'unassessed']),
      reviewStatus: z.enum(['not-reviewed', 'ai-reviewed', 'human-reviewed']), reason: z.string().min(25)
    }).strict()), newEvidenceIds: z.array(z.string())
  }).strict()),
  comparisons: z.array(calibrationSchema.shape.pairs.element.pick({ id: true, revision: true, changeReason: true, dimensions: true }).extend({ previousRevision: z.number().int().positive() }).strict()),
  limitations: z.array(z.string().min(10)).min(1)
}).strict()
export type ResearchReview = z.infer<typeof researchReviewSchema>

// Validate only the current receipt against the current catalog. Historical receipts
// are immutable records of their own revisions, not expectations for future scores.
export function validateResearchReview(raw: unknown, vehicles: Vehicle[], sources: Source[], calibration: Calibration) {
  const review = researchReviewSchema.parse(raw)
  const errors: string[] = []
  const expect = (ok: unknown, message: string) => { if (!ok) errors.push(message) }
  const sameIds = (a: string[], b: string[]) => a.length === b.length && new Set(a).size === a.length && a.every(id => b.includes(id))
  const byId = new Map(vehicles.map(car => [car.id, car]))
  const sourceIds = new Set(sources.map(source => source.id))
  expect(createHash('sha256').update(readFileSync(review.submission.path)).digest('hex') === review.submission.sha256, 'Submission archive checksum mismatch')
  expect(review.assessedAt === calibration.assessedAt && review.rubricVersion === calibration.version, 'Receipt date/rubric does not match calibration')
  expect(sameIds(review.cohortIds, calibration.cohortIds) && sameIds(review.vehicles.map(v => v.id), review.cohortIds), 'Receipt must account for every reviewed configuration exactly once')
  expect(new Set(review.claims.map(c => c.id)).size === review.claims.length, 'Duplicate submitted claim decisions')
  for (const claim of review.claims) {
    expect(claim.vehicleIds.every(id => review.cohortIds.includes(id)), 'Unknown claim configuration: ' + claim.id)
    expect(claim.sourceIds.every(id => sourceIds.has(id)), 'Unknown inspected source: ' + claim.id)
    for (const ref of claim.ledgerReferences) {
      const evidence = byId.get(ref.vehicleId)?.evidenceLedger.find(e => e.id === ref.evidenceId)
      expect(claim.vehicleIds.includes(ref.vehicleId) && evidence, 'Missing claim ledger reference: ' + claim.id)
      expect(evidence?.sourceIds.every(id => claim.sourceIds.includes(id)), 'Claim decision omits its inspected source: ' + claim.id)
    }
  }
  for (const record of review.vehicles) {
    const car = byId.get(record.id)
    if (!car) { errors.push('Missing reviewed vehicle: ' + record.id); continue }
    expect(record.afterFingerprint === assessmentFingerprint(car), 'Receipt assessment changed: ' + record.id)
    expect(sameIds(record.changes.map(row => row.dimension), [...dimensions]), 'Receipt must include all four dimensions: ' + record.id)
    expect(record.newEvidenceIds.every(id => car.evidenceLedger.some(e => e.id === id)), 'Receipt new evidence is missing: ' + record.id)
    for (const row of record.changes) {
      const current = car.scores[row.dimension]
      expect(row.after === current.value && row.assessmentType === current.assessmentType && row.reviewStatus === current.reviewStatus, 'Receipt score/status mismatch: ' + record.id + ' ' + row.dimension)
    }
  }
  expect(sameIds(review.comparisons.map(p => p.id), calibration.pairs.map(p => p.id)), 'Receipt must include all calibration comparisons')
  for (const p of review.comparisons) {
    const current = calibration.pairs.find(pair => pair.id === p.id)
    expect(p.revision > p.previousRevision && p.revision === current?.revision, 'Explicit comparison revision required: ' + p.id)
    expect(JSON.stringify(p.dimensions) === JSON.stringify(current?.dimensions) && p.changeReason === current?.changeReason, 'Receipt comparison/report mismatch: ' + p.id)
  }
  if (errors.length) throw new Error(errors.join('\n'))
  return review
}

export function researchReviewMarkdown(review: ResearchReview) {
  const rows = review.vehicles.flatMap(v => v.changes.map(c => ({ id: v.id, ...c })))
  const cell = (text: string) => text.replaceAll('|', '/').replaceAll('\n', ' ')
  return [
    '# Submitted research review — ' + review.assessedAt, '',
    'Reviewed ' + review.cohortIds.length + ' configurations and ' + review.comparisons.length + ' comparisons. ' + rows.filter(r => r.before !== r.after).length + ' numeric ratings changed. Unsupported fields remain null; existing broad driving and editorial-taste tiers remain low-confidence judgments. This review does not establish a whole-car longevity or upkeep ordering.', '',
    'Incremental baseline: `' + review.baselineCommit + '`. Assessor: ' + review.assessor.id + ' (AI). Rubric ' + review.rubricVersion + '. No independent human approval.', '',
    'The [submitted text](research/2026-11-14-submitted-review.txt) is preserved verbatim, including its unsupported claims. It is **not** an approved evidence source. The [structured review receipt](../data/research-reviews/2026-11-14.json) contains its SHA-256, all 80 before/after values, evidence references, limitations and comparison revisions. Claimed researcher identity is unconfirmed. Original legacy values remain separately preserved in [assessment-baseline.json](../data/assessment-baseline.json).', '',
    '## Evidence decisions', '',
    ...review.claims.flatMap(c => ['### ' + c.id + ' — ' + c.disposition, '', '**Submitted:** ' + c.submittedClaim, '', '**Review:** ' + c.decision, '', 'Configurations: ' + c.vehicleIds.join(', ') + '.', '', ...(c.sourceIds.length ? ['Inspected registry sources: ' + c.sourceIds.map(id => '`' + id + '`').join(', ') + '.', ''] : []), ...(c.unresolvedUrls.length ? ['Unresolved leads (not accepted supporting evidence): ' + c.unresolvedUrls.map((url, i) => '[lead ' + (i + 1) + '](' + url + ')').join(', ') + '.', ''] : [])]),
    '## Before and after', '', 'Null means insufficient support, not a low score or a demonstrated tie. Higher Low upkeep always means less expensive mechanical upkeep; source facts do not directly measure editorial taste.', '',
    '| Vehicle | Dimension | Before | After | Assessment type | Review |', '| --- | --- | ---: | ---: | --- | --- |',
    ...rows.map(row => '| ' + row.id + ' | ' + labels[row.dimension] + ' | ' + (row.before ?? 'null') + ' | ' + (row.after ?? 'null') + ' | ' + row.assessmentType + ' | ' + row.reviewStatus + ' |'), '',
    '## Reviewed comparisons', '',
    ...review.comparisons.flatMap(p => ['### ' + p.id + ' — revision ' + p.previousRevision + ' → ' + p.revision, '', ...dimensions.map(d => '- **' + labels[d] + '** (' + p.dimensions[d].outcome + '): ' + cell(p.dimensions[d].rationale)), '']),
    '## Limits and next work', '', ...review.limitations.map(note => '- ' + note), '',
    'The new S2000 $330.75 basket is two documented supplier options only: $157.50 retainers plus $173.25 keepers, checked on the review date. Labor, gaskets/other service parts, shipping and taxes are excluded. No installed, annual or probability-weighted cost was derived. It is not a recommendation to replace parts on every AP1.', '',
    'See the regenerated [coverage snapshot](DATA_COVERAGE.md), [unresolved research queue](RESEARCH_QUEUE.md), [substantive review checklist](SUBSTANTIVE_REVIEW.md) and [release validation record](RESEARCH_RELEASE_2026-11-14.md). Automated checks validate records and behavior; they do not certify automotive truth.', ''
  ].join('\n')
}
