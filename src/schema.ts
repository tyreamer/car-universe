import { z } from 'zod'
import rubric from '../data/scoring-rubric.json'

export const dimensions = ['longevity', 'ownershipCost', 'drivingEnjoyment', 'aesthetics'] as const
export const confidenceLevels = ['unrated', 'low', 'medium', 'high'] as const
export const categories = ['Japanese enthusiast', 'German enthusiast', 'American enthusiast', 'Other enthusiast', 'Mainstream reference'] as const
export const transmissions = ['Manual', 'Automatic', 'Automated manual', 'Dual-clutch', 'CVT', 'Hybrid eCVT'] as const
export type Dimension = typeof dimensions[number]

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
const year = z.number().int().min(1886).max(2100)
const date = z.iso.date()
const words = z.string().trim().min(4)
const positive = z.number().positive()
const https = z.url({ protocol: /^https$/ })
const refs = z.array(slug).min(1)

export const reviewStatuses = ['not-reviewed', 'ai-reviewed', 'human-reviewed'] as const
const assessorSchema = z.object({ id: words, type: z.enum(['ai', 'human', 'unknown']) }).strict()
export const evidenceSchema = z.object({
  id: slug, claim: words, sourceIds: refs, location: words,
  establishes: words, doesNotEstablish: words,
  applicability: z.object({
    configuration: slug, generation: z.string().min(1), engineCode: z.string().nullable(),
    transmission: z.enum(transmissions), market: z.enum(['US', 'UK', 'Japan']),
    years: z.object({ from: year, to: year }).strict(),
    status: z.enum(['direct', 'partial', 'unresolved']), limitations: words
  }).strict(),
  inspectedAt: date, inspectedBy: assessorSchema
}).strict()

const coverageItem = z.object({
  status: z.enum(['documented', 'limited', 'unknown']), note: words, evidenceIds: z.array(slug)
}).strict().superRefine((item, ctx) => {
  if (item.status !== 'unknown' && !item.evidenceIds.length) ctx.addIssue({ code: 'custom', message: 'Coverage requires evidence' })
})
export const reviewSchema = z.object({
  assessor: assessorSchema, assessedAt: date, status: z.enum(reviewStatuses),
  systems: z.object({ engine: coverageItem, transmission: coverageItem, cooling: coverageItem, electrical: coverageItem, structure: coverageItem }).strict(),
  costs: z.object({ scheduled: coverageItem, consumables: coverageItem, repairs: coverageItem, ageRelated: coverageItem, majorFailure: coverageItem, acquisitionCatchUp: coverageItem }).strict(),
  driving: z.object({ steering: coverageItem, chassis: coverageItem, shift: coverageItem, powertrain: coverageItem, braking: coverageItem, roadSpeeds: coverageItem }).strict(),
  risks: z.array(z.object({
    mechanism: words, evidenceIds: refs, affectedYears: z.object({ from: year, to: year }).strict(),
    incidence: z.literal('unknown'), severity: z.enum(['low', 'medium', 'high', 'unknown']),
    preventability: words, residualRisk: words, evidenceStrength: z.enum(['limited', 'documented mechanism']), ageDependent: z.boolean()
  }).strict()),
  ageRisk: words, costScenarios: z.array(z.object({ name: words, scope: words, evidenceIds: refs, amountUsd: positive.nullable(), inputs: z.array(z.object({ description: words, amountUsd: z.number().nonnegative(), sourceIds: refs }).strict()) }).strict()),
  unresolved: z.array(words).min(1), conflicts: z.array(words)
}).strict()

export const sourceSchema = z.object({
  id: slug, title: words, publisher: words, author: words.nullable(),
  url: https, publishedAt: date.nullable(), accessedAt: date,
  category: z.enum(['government dataset', 'manufacturer', 'road test', 'specialist', 'service bulletin', 'photograph']),
  supports: z.array(words).min(1), limitations: words
}).strict()

export const claimSchema = z.object({
  text: words, sourceIds: refs
}).strict()

export const scoreSchema = z.object({
  value: z.number().int().min(0).max(100).multipleOf(5).nullable(),
  confidence: z.enum(confidenceLevels),
  methodology: z.enum(['evidence-based', 'editorial', 'provisional']),
  rationale: words.min(25),
  evidence: z.array(claimSchema),
  sourceIds: z.array(slug),
  reviewedAt: date.nullable(),
  methodologyVersion: words.min(4),
  assessmentType: z.enum(['evidence-informed editorial', 'editorial taste', 'unassessed']),
  assessor: assessorSchema, reviewStatus: z.enum(reviewStatuses),
  derivation: z.object({
    anchor: z.number().int().min(0).max(100), anchorReason: words.min(25), evidenceIds: refs,
    adjustments: z.array(z.object({ delta: z.number().int().multipleOf(5).refine(n => n !== 0), reason: words.min(25), evidenceIds: refs }).strict()),
    finalValue: z.number().int().min(0).max(100),
    comparison: z.object({ referenceIds: refs, decisionIds: refs, rationale: words.min(25) }).strict()
  }).strict().nullable(),
  uncertainties: z.array(words), conflictingEvidence: z.array(words)
}).strict().superRefine((score, ctx) => {
  const fail = (message: string) => ctx.addIssue({ code: 'custom', message })
  if (score.value === null) {
    if (score.confidence !== 'unrated') fail('A null score must be unrated')
    if (score.derivation !== null) fail('A null score cannot have a numeric derivation')
    if (!score.uncertainties.length) fail('An unrated score must explain missing support')
  } else {
    if (score.confidence === 'unrated' || !score.reviewedAt || !score.evidence.length || !score.sourceIds.length) {
      fail('A numeric score requires confidence, review date and evidence')
    }
    if (score.confidence === 'high' && new Set(score.sourceIds).size < 2) fail('High confidence requires at least two sources')
    if (score.reviewStatus === 'not-reviewed' || score.assessmentType === 'unassessed') fail('A numeric score requires an explicit assessment')
    if (!score.derivation || score.derivation.finalValue !== score.value || score.derivation.anchor + score.derivation.adjustments.reduce((sum, item) => sum + item.delta, 0) !== score.value) fail('Stored score must equal anchor plus supported adjustments')
  }
  if (score.reviewStatus === 'human-reviewed' && score.assessor.type !== 'human') fail('Human review requires a human assessor')
  if (score.reviewStatus === 'ai-reviewed' && score.assessor.type !== 'ai') fail('AI review requires an AI assessor')
  if (score.reviewStatus !== 'not-reviewed' && !score.reviewedAt) fail('Review requires a date')
  if (score.evidence.some(claim => claim.sourceIds.some(id => !score.sourceIds.includes(id)))) {
    fail('Evidence references must appear on the assessment')
  }
})

export const specFields = [
  'engineCode', 'displacementL', 'cylinders', 'cylinderLayout', 'aspiration',
  'horsepowerHp', 'torqueLbFt', 'transmission', 'gears', 'hasClutchPedal', 'drivetrain',
  'engineLocation', 'curbWeightLb', 'seats'
] as const

export const epaRowSchema = z.object({
  id: z.number().int().positive(), year, make: z.string(), model: z.string(),
  displ: positive.nullable(), cylinders: z.number().int().positive().nullable(),
  drive: z.string(), trany: z.string(), eng_dscr: z.string(),
  VClass: z.string(), fuelType1: z.string(), atvType: z.string(), tCharger: z.string(), sCharger: z.string()
}).strict()

export const vehicleSchema = z.object({
  id: slug, make: z.string().min(2), model: z.string().min(1), generation: z.string().min(1),
  variant: words, configuration: slug, years: z.object({ from: year, to: year }).strict(),
  market: z.enum(['US', 'UK', 'Japan']), bodyStyle: words, segment: words,
  category: z.enum(categories), productionStatus: z.enum(['discontinued', 'in production', 'unknown']),
  identity: z.object({
    status: z.enum(['confirmed', 'needs review']),
    coverage: z.enum(['EPA by model year', 'EPA plus archival evidence', 'archival evidence', 'partial']),
    notes: words, epaIds: z.array(z.number().int().positive()), sourceIds: refs
  }).strict(),
  specs: z.object({
    engineCode: z.string().trim().min(2).nullable(), displacementL: positive.nullable(),
    cylinders: z.number().int().positive().nullable(),
    cylinderLayout: z.enum(['Inline', 'V', 'Flat', 'Rotary']).nullable(),
    aspiration: z.enum(['Naturally aspirated', 'Turbocharged', 'Supercharged', 'Twincharged']).nullable(),
    horsepowerHp: positive.nullable(), torqueLbFt: positive.nullable(),
    transmission: z.enum(transmissions), gears: z.number().int().positive().max(10).nullable(),
    hasClutchPedal: z.boolean().nullable(), drivetrain: z.enum(['RWD', 'FWD', 'AWD', '4WD']).nullable(),
    engineLocation: z.enum(['Front', 'Mid', 'Rear']).nullable(), curbWeightLb: positive.nullable(),
    seats: z.number().int().positive().nullable()
  }).strict(),
  specEvidence: z.partialRecord(z.enum(specFields), claimSchema),
  evidenceLedger: z.array(evidenceSchema),
  assessmentReview: reviewSchema.nullable(),
  scores: z.object({
    longevity: scoreSchema, ownershipCost: scoreSchema,
    drivingEnjoyment: scoreSchema, aesthetics: scoreSchema
  }).strict(),
  ownership: z.object({
    strengths: z.array(claimSchema), weaknesses: z.array(claimSchema),
    knownIssues: z.array(claimSchema.extend({ severity: z.enum(['low', 'medium', 'high']), frequency: z.enum(['unknown', 'documented pattern', 'documented campaign']) })),
    prevention: z.array(claimSchema), yearChanges: z.array(claimSchema),
    partsAvailability: claimSchema.nullable(), mechanicalComplexity: claimSchema.nullable(),
    maintenanceAccessibility: claimSchema.nullable(),
    costTier: z.enum(['Very low', 'Low', 'Moderate', 'High', 'Very high']).nullable(),
    annualCost: z.object({ lowUsd: positive, highUsd: positive, annualMiles: positive, sourceIds: refs, assumptions: words }).strict().nullable()
  }).strict(),
  character: z.object({
    driving: claimSchema.nullable(), styling: claimSchema.nullable(),
    enthusiastAppeal: words.nullable(), idealBuyer: words.nullable(), avoidIf: words.nullable()
  }).strict(),
  aestheticsTags: z.array(words),
  photo: z.object({ path: z.string().startsWith('/images/'), alt: words, credit: words, license: words, licenseUrl: https, sourceId: slug }).strict().nullable(),
  research: z.object({
    specifications: z.enum(['researched', 'partial']),
    ownership: z.enum(['documented', 'partial', 'pending']),
    scores: z.enum(['assessed', 'partial', 'unrated']),
    followUp: z.array(words)
  }).strict()
}).strict().superRefine((car, ctx) => {
  const fail = (message: string) => ctx.addIssue({ code: 'custom', message })
  const ledger = new Map(car.evidenceLedger.map(item => [item.id, item]))
  if (ledger.size !== car.evidenceLedger.length) fail('Duplicate evidence IDs')
  for (const item of car.evidenceLedger) {
    const a = item.applicability
    if (a.configuration !== car.configuration || a.generation !== car.generation || a.engineCode !== car.specs.engineCode || a.transmission !== car.specs.transmission || a.market !== car.market) fail('Evidence configuration applicability mismatch: ' + item.id)
    if (a.years.from > a.years.to || a.years.from > car.years.to || a.years.to < car.years.from) fail('Evidence years do not overlap this configuration: ' + item.id)
  }
  const supported = (ids: string[]) => ids.length > 0 && ids.every(id => ledger.has(id) && ledger.get(id)!.applicability.status !== 'unresolved')
  for (const dimension of dimensions) {
    const score = car.scores[dimension]
    if (score.value === null) continue
    const d = score.derivation
    if (!d) { fail('Numeric score is missing a derivation: ' + dimension); continue }
    if (!rubric.dimensions[dimension].anchors.some(([value]) => value === d.anchor)) fail('Unrecognized rubric anchor: ' + dimension)
    if (!supported(d.evidenceIds) || d.adjustments.some(item => !supported(item.evidenceIds))) fail('Derivation requires applicable inspected evidence: ' + dimension)
    if ([...d.evidenceIds, ...d.adjustments.flatMap(a => a.evidenceIds)].some(id => ledger.get(id)?.sourceIds.some(source => !score.sourceIds.includes(source)))) fail('Derivation source missing from assessment: ' + dimension)
    if (!car.assessmentReview || car.assessmentReview.status === 'not-reviewed') fail('Numeric scores require substantive review coverage')
    if (dimension === 'aesthetics' && score.assessmentType !== 'editorial taste') fail('Aesthetics must be labeled editorial taste')
    if (dimension !== 'aesthetics' && score.assessmentType !== 'evidence-informed editorial') fail('Judgment must be labeled evidence-informed editorial')
    if (dimension === 'longevity' && Object.values(car.assessmentReview?.systems ?? {}).some(item => item.status === 'unknown')) fail('Longevity requires all five systems to be considered with evidence')
    if (dimension === 'ownershipCost' && Object.values(car.assessmentReview?.costs ?? {}).some(item => item.status === 'unknown')) fail('Low upkeep requires the common cost scope')
  }
  if (car.assessmentReview) {
    const review = car.assessmentReview
    if (review.status === 'human-reviewed' && review.assessor.type !== 'human') fail('Substantive human review requires human identity')
    if (review.status === 'ai-reviewed' && review.assessor.type !== 'ai') fail('Substantive AI review requires AI identity')
    for (const item of [...Object.values(review.systems), ...Object.values(review.costs), ...Object.values(review.driving)]) {
      if (item.evidenceIds.some(id => !ledger.has(id))) fail('Review coverage uses missing evidence')
      if (item.status !== 'unknown' && !supported(item.evidenceIds)) fail('Review coverage requires applicable evidence')
    }
    for (const risk of review.risks) {
      if (!supported(risk.evidenceIds)) fail('Risk needs applicable evidence')
      if (risk.affectedYears.from > risk.affectedYears.to || risk.affectedYears.from < car.years.from || risk.affectedYears.to > car.years.to) fail('Risk years exceed configuration')
    }
    for (const scenario of review.costScenarios) {
      if (!supported(scenario.evidenceIds)) fail('Cost scenario needs applicable evidence')
      if (scenario.amountUsd !== null && (!scenario.inputs.length || Math.abs(scenario.inputs.reduce((sum, input) => sum + input.amountUsd, 0) - scenario.amountUsd) > 0.01)) fail('Dollar estimate needs documented inputs matching its scoped total')
      const inputSources = new Set(scenario.evidenceIds.flatMap(id => ledger.get(id)?.sourceIds ?? []))
      if (scenario.inputs.some(input => input.sourceIds.some(id => !inputSources.has(id)))) fail('Cost input source must be represented in the scenario evidence')
    }
  }
  if (car.ownership.annualCost !== null) fail('Legacy annualCost is retired; use documented, scoped costScenarios with inputs')
  if (car.years.from > car.years.to) fail('Invalid model-year range')
  if (car.specs.hasClutchPedal !== null && car.specs.hasClutchPedal !== (car.specs.transmission === 'Manual')) fail('Pedal and transmission disagree')
  if (['CVT', 'Hybrid eCVT'].includes(car.specs.transmission) && car.specs.gears !== null) fail('A CVT has no fixed gear count')
  if (car.specs.cylinderLayout === 'Rotary' && car.specs.cylinders !== null) fail('A rotary engine has no cylinders')
  for (const field of specFields) {
    if ((car.specs[field] !== null) !== Boolean(car.specEvidence[field])) fail('Specification provenance mismatch for ' + field)
  }
  if (car.ownership.annualCost && car.ownership.annualCost.lowUsd > car.ownership.annualCost.highUsd) fail('Invalid annual cost range')
  for (const dimension of ['drivingEnjoyment', 'aesthetics'] as const) {
    const score = car.scores[dimension]
    if (score.value !== null && score.methodology !== 'editorial') fail(dimension + ' is an editorial judgment')
  }
})

export const manifestSchema = z.object({
  version: words.min(4), target: z.number().int().positive(),
  batches: z.array(z.object({ id: slug, label: words, vehicleIds: z.array(slug).min(1) }).strict()).min(1)
}).strict()

export type Vehicle = z.infer<typeof vehicleSchema>
export type Source = z.infer<typeof sourceSchema>
export type Score = z.infer<typeof scoreSchema>
export type EpaRow = z.infer<typeof epaRowSchema>
