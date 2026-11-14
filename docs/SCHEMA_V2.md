# Assessment schema, version 2

The catalog remains JSON files validated by Zod in `src/schema.ts`. `ownershipCost` remains the compatibility key; every public numeric label is **Low upkeep**, higher better. No runtime service is required.

## Evidence and retained research

`evidenceLedger[]` contains freshly inspected claims, independent of a score:

- `id`, `claim`, `sourceIds`, and `location` (page, section or brief paraphrased note).
- `establishes` and `doesNotEstablish`: the supported conclusion and its boundary.
- `applicability`: configuration, generation, engine code, transmission, market, affected years, direct/partial/unresolved status, and limitations. Engine codes may remain null where the original identity has not established one. The configuration and other mechanical fields still have to match.
- `inspectedAt` and `inspectedBy`: date, identity and AI/human type. Inspection is not truth certification.

The earlier `specEvidence`, `ownership` claims and `character` notes are retained. They are **legacy research**, not silently promoted to inspected claims. New numeric derivations can cite only applicable ledger entries. Old score explanations and citations are preserved verbatim in `data/assessment-baseline.json`. The source registry is retained, with four additional firsthand references and a corrected MR2 source limitation.

## Assessments

Every score has `assessmentType`, `assessor`, `reviewStatus`, `reviewedAt`, `methodologyVersion`, `rationale`, `uncertainties`, and `conflictingEvidence`. `reviewedAt` is the assessment date, not a claim of human approval. `methodology` is retained for compatibility, while the public assessment type distinguishes evidence-informed editorial judgment from editorial taste.

`derivation` is null when the score is null. Otherwise it contains:

```text
anchor: a published anchor for this dimension
anchorReason: why the broad tier fits
evidenceIds: applicable inspected ledger entries
adjustments[]: delta, individual reason, evidenceIds
finalValue: anchor + sum(adjustments.delta), also equal to score.value
comparison: referenceIds, decisionIds, comparative rationale
```

No adjustments were justified in the initial cohort. A numeric score also requires a substantive review record. Null requires an explanation and `unrated` confidence; it cannot carry a numeric derivation. High confidence cannot substitute for review. AI assessors cannot claim `human-reviewed` status.

## Common review checklist

`assessmentReview` remains null outside the re-reviewed cohort. Inside it, each of these fields records documented/limited/unknown coverage, a note and evidence references:

- Systems: engine, transmission, cooling, electrical and structure.
- Costs: scheduled, consumables, repairs, ageRelated, majorFailure and acquisitionCatchUp.
- Driving: steering, chassis, shift, powertrain, braking and roadSpeeds.

Risks separately record mechanism, affected years, incidence, severity, preventability, residual risk, evidence strength and age dependence. This revision intentionally supports only unknown incidence; a later quantitative extension must define population and exposure and require a relevant source, not merely allow an arbitrary probability.

`costScenarios` has a name, scope, evidence IDs, optional dollar total and individually sourced inputs. Numeric totals must equal their documented inputs. The old `annualCost` field is retired and null; it cannot be used to introduce an unsupported annual average. An unpriced scenario is valid.

## Calibration and change control

`data/calibration-decisions.json` records the initial 20-car cohort and 14 explicit pair decisions. Each pair includes assessor, review date/type, rubric version, revision, change reason, both scores, outcome and dimension-specific rationale. Null comparisons are **unknown**, never ties.

Evidence/review/score fingerprints require explicit calibration review when inputs or rationale change, even if the numbers do not. Tests check recorded decisions rather than preconceived automotive rankings. A changed decision must update its revision, review metadata, reason, fingerprint and before/after report as a reviewable diff. Do not regenerate fingerprints to silence a failure without doing that review. Mechanical checks can detect inconsistency; they cannot prove that the stated reviewer performed the review or that a source is true.

`docs/rating-changes.json` accounts for all 800 dimensions against the immutable release baseline, including old/new value or null, reason, assessor/type/status, inspected evidence and newly used source IDs. `npm run audit:scores -- --check` rejects stale reports. `npm run validate:data` computes coverage from the current records, not from fixed acceptance counts.
