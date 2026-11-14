import { dimensions } from '../src/schema'
import type { Vehicle } from '../src/schema'
import { labels } from '../src/scoring'
import type { Calibration } from './calibration'

export type Baseline = { commit: string; capturedAt: string; vehicles: Record<string, { scores: Record<typeof dimensions[number], { value: number | null; sourceIds: string[] }>; costTier: string | null; annualCost: unknown }> }
export function ratingChanges(vehicles: Vehicle[], baseline: Baseline) {
  return vehicles.flatMap(car => dimensions.map(dimension => {
    const old = baseline.vehicles[car.id].scores[dimension], score = car.scores[dimension]
    return {
      id: car.id, dimension, oldScore: old.value, newScore: score.value,
      change: old.value === score.value ? 'unchanged value' : score.value === null ? 'withdrawn unsupported number' : old.value === null ? 'new assessment' : 'reassessed tier',
      reason: score.rationale, assessmentType: score.assessmentType, assessor: score.assessor,
      assessmentDate: score.reviewedAt, reviewStatus: score.reviewStatus, rubricVersion: score.methodologyVersion,
      inspectedEvidence: car.evidenceLedger.map(e => ({ id: e.id, sourceIds: e.sourceIds, location: e.location, applicability: e.applicability.status })),
      newlyUsedSourceIds: [...new Set(car.evidenceLedger.flatMap(e => e.sourceIds))].filter(id => !old.sourceIds.includes(id)),
      note: 'Inspected evidence includes this review’s coverage and limitations; a newly used source is not necessarily newly published. The baseline preserves the full previous rationale and citations.'
    }
  }))
}
export function researchQueue(vehicles: Vehicle[]) {
  return vehicles.map(car => ({
    id: car.id, reviewStatus: car.assessmentReview?.status ?? 'not-reviewed',
    unratedDimensions: dimensions.filter(d => car.scores[d].value === null),
    systemsMissing: Object.entries(car.assessmentReview?.systems ?? {}).filter(([, item]) => item.status === 'unknown').map(([key]) => key),
    costInputsMissing: Object.entries(car.assessmentReview?.costs ?? {}).filter(([, item]) => item.status === 'unknown').map(([key]) => key),
    tasks: car.research.followUp, conflicts: car.assessmentReview?.conflicts ?? []
  }))
}
export function changeMarkdown(rows: ReturnType<typeof ratingChanges>, baseline: Baseline, calibration: Calibration) {
  const output = [
    '# Rating changes', '', 'Baseline: `' + baseline.commit + '`. Review date: ' + calibration.assessedAt + '. Rubric ' + calibration.version + '.', '',
    'All old scores, rationales, claims and source references are preserved in [assessment-baseline.json](../data/assessment-baseline.json). The machine-readable [rating-changes.json](rating-changes.json) accounts for all 800 dimension records, including unchanged nulls.', '',
    'The initial cohort has 20 AI-reviewed configurations and no independent human approval. Outside it, migration withdraws active numbers without claiming a substantive review. Retained research is still available. No quota was used.', '',
    rows.filter(r => r.oldScore !== null && r.newScore === null).length + ' numbers were withdrawn; ' + rows.filter(r => r.oldScore === null && r.newScore !== null).length + ' new numeric assessments were made. No longevity/upkeep values were inferred from badge, specifications or absence of negative evidence.', '',
    '## Initial cohort', '', '| Vehicle | Dimension | Old | New | Reason |', '| --- | --- | ---: | ---: | --- |',
    ...rows.filter(r => calibration.cohortIds.includes(r.id)).map(r => '| ' + r.id + ' | ' + labels[r.dimension] + ' | ' + (r.oldScore ?? 'null') + ' | ' + (r.newScore ?? 'null') + ' | ' + r.reason.replaceAll('|', '/') + ' |'), '',
    'Every numeric result uses a broad rubric anchor with zero adjustments in this review. Small unsupported differences were removed. All judgments identify the AI assessor; review status is ai-reviewed, with human review pending.', '',
    '## Comparative decisions', '',
    ...calibration.pairs.flatMap(pair => ['### ' + pair.left + ' / ' + pair.right, '', ...dimensions.map(d => '- **' + labels[d] + '** — ' + pair.dimensions[d].outcome + ': ' + pair.dimensions[d].rationale), '']),
    '## Limits and next steps', '',
    'Whole-platform longevity and comparative upkeep remain null throughout the current catalog. The default longevity/enjoyment map is consequently empty; the explicit driving/design axis option plots the supported two-axis subset. This is a data limitation, not a hidden fallback or an implementation failure.', '',
    'The LFX manual and late U.S. manual Spyder still lack applicable driving evaluations. The Camry identity spans a restyle, so its design assessment stays null. Two retained BMW technical URLs failed on reinspection (403 and 404). No source truth or human review is implied by schema validation.', '',
    'See [RESEARCH_QUEUE.md](RESEARCH_QUEUE.md) and [SUBSTANTIVE_REVIEW.md](SUBSTANTIVE_REVIEW.md).', ''
  ]
  return output.join('\n')
}
