# Scoring methodology

Version 2.0.0. Each identity keeps four independent 0–100 dimensions, with higher always more favorable. These are **evidence-informed editorial** judgments except **Editorial aesthetics**, which expresses assessor taste. They are not measured population statistics, percentiles, safety ratings or predictions. Numeric spacing is a display convention for ordered editorial tiers, not a measured interval between cars.

The reference population is the existing 200-configuration catalog, including ordinary mainstream references as well as sports cars. It is not a representative sample of all vehicles. Initial calibration includes the Honda Fit GE manual, Mazda3 BM 2.0 automatic, Corolla E170 CVT and Camry XV50 2.5 automatic so the scale is not defined only by sports cars. Every comparison names its reference cars and scope.

Use the broad anchors in [scoring-rubric.json](../data/scoring-rubric.json). A finer adjustment requires its own cited reason and a reviewed comparison with comparable coverage on both sides. In the initial cohort no adjustments were justified. Scores may tie. **Null is acceptable** and never becomes zero, a midpoint, a brand default or an average. There is no aggregate ranking.

## Evidence versus assessment

Inspected factual claims have source IDs, page/section or a brief note, affected configuration/years, supported and unsupported conclusions, and applicability limitations. Assessments separately identify assessor/type, date, review status, rubric version, selected anchor, individual adjustments, final value and comparison rationale. Uncertainty and conflict are explicit. A derivation makes a judgment auditable; it does not make it objectively true.

Legacy claims, source references and full earlier score explanations remain available. Migration does not claim that their sources were reinspected. Only the 20-car calibration cohort has received this new AI source review. **AI-reviewed is not human-reviewed.** There is no independent human approval in this release. See [SCHEMA_V2.md](SCHEMA_V2.md).

A mechanism does not establish its incidence. A bulletin does not establish failure in every covered car. A road test does not establish lifetime durability. Manufacturer specifications do not establish repair costs. Absence of negative evidence does not establish exceptional reliability.

## Longevity

Reference: the catalog's actual configurations under appropriate scheduled maintenance, assessed as platforms rather than unidentified used examples. Cover engine, transmission, cooling, electrical systems and structural corrosion with the same checklist. A whole-platform tier requires support across all five, including explicit limitations.

For each material risk distinguish mechanism, affected years, known/unknown incidence, severity, prevention, residual risk and evidence strength. Separate age, storage and corrosion exposure from intrinsic durability. Do not infer remaining life from an unknown car's odometer. Do not assign numerical failure probabilities without a relevant source population and exposure. This revision records unknown incidence rather than permitting unsupported probabilities.

No current cohort record has enough comparable whole-platform coverage to restore an active longevity score. This is not a claim that all cars have equal durability, and not a requirement for a statistical study before any future editorial tier: sufficiently broad, comparable qualitative evidence can support a clearly provisional tier.

## Low upkeep

The storage key remains `ownershipCost`; the public number is **Low upkeep**, higher better. Reference: U.S. weekend use, 3,000 miles/year, appropriate scheduled maintenance and an independent shop or marque specialist. Good used condition is the acquisition assumption, not a claim about a particular listing.

Separate scheduled work, consumables, repairs, age-related renewal and major-failure exposure. Record acquisition catch-up independently. Fuel, insurance, depreciation, financing, purchase price, taxes and registration are excluded. This is not total ownership cost.

Quote dollars only from documented inputs with date, applicability and scope. A recommended reserve is not observed average expenditure. Leave unknown failure probabilities unknown. Use named scenarios or editorial judgment bands; do not fabricate statistical confidence intervals. The current review contains an unpriced ND2 scheduled-service scenario and a dated S2000 parts-only basket, with no annual dollar estimates. An isolated parts basket does not support a whole-car upkeep score. Existing mechanical cost tiers were withdrawn with the unsupported numeric assessments.

Submitted research is preserved separately from accepted catalog evidence. Record claim-level acceptance, narrowing, rejection or unresolved applicability; independently inspect passages before promoting a claim. Supplier observations and manufacturer remedies retain their specific limitations. Warranty reimbursement hours are not retail labor quotes; a source that fails to open remains a lead. Each new review records the prior commit, before/after values, actual assessor, comparison revisions and unresolved work, even when every numeric result is unchanged.

## Driving enjoyment

Reference: involvement in ordinary public-road driving across the catalog, not lap times or an engine-power ranking. Use applicable firsthand evaluations and distinguish steering, chassis, shift quality, powertrain, braking and ordinary-speed enjoyment. Different drivers value different traits; a tier does not describe everyone's preference.

Record exact test equipment and years. A broad, low-confidence inference within a configuration must disclose its limitation. A different engine, transmission or materially revised configuration cannot silently supply a missing evaluation. Thus the late U.S. five-speed Spyder and LFX manual remain unrated after review. Comparisons use broad ties where a small difference cannot be defended.

## Editorial aesthetics and My taste

Reference: a consistent assessor's taste across the catalog's design forms, not community preference. Factual design descriptions or photographs establish appearance; they do not establish that a beauty score is correct. The anchor reason is explicitly editorial. No votes, measured consensus or human approval are invented.

**My taste** is a separate personal aesthetics override saved in localStorage. It appears in the profile and comparison without modifying shared data, editorial map coordinates or global rankings. It can be cleared. The Camry identity spans a material restyle; its single shared design score remains null pending broader review.

## Review status and confidence

`not-reviewed` means substantive reassessment is pending. `ai-reviewed` identifies the actual AI assessor and leaves human review pending. `human-reviewed` requires an identified human reviewer and actual review; automated checks cannot establish that it occurred.

High/medium/low confidence describes evidence support and applicability; unrated accompanies null. Confidence does not establish truth, objective beauty, or a statistical interval. Current numeric cohort judgments are low-confidence broad tiers. An unknown pair is not a tie. Large and small gaps both require reasoned support.

## Visual encoding

The primary map has a square plotting region on desktop and mobile. Default axes are longevity rightward and enjoyment upward on fixed 0–100 scales. Both split at 50, a display convention rather than a measured reliability/safety boundary. Four region names describe higher/lower values relative to that split. Values exactly 50 lie on the boundary. Filters never recenter the scales.

Any two dimensions can be selected as independent axes. A car is plotted when those two scores exist. Other missing dimensions use explicit unknown symbols. The list retains cars missing axes and explains why they are not plotted. Counts and the provisional-data notice remain visible.

Circle area represents mechanical burden, using `100 - Low upkeep` internally with a minimum area; **larger means more burden**. All numeric surfaces retain the higher-is-better upkeep number. Color represents Editorial aesthetics, accompanied by exact values. A diamond means unknown upkeep; hatching means unknown aesthetics. Shared positions use numbered rings and an overlap list, with no averaged supplementary values and no coordinate displacement.

Four dimensions cannot all be independent positional quadrants in one two-axis map. The selected panel shows all four values, types, confidence and review status. The current default map is empty because longevity remains unsupported; the explicit driving/design choice exposes 17 two-axis-complete cars. No alternate geometry or invented scores hide that limitation.

## Release gates

The calibration file records reviewed scores, decisions, revisions, reasons and evidence fingerprints. Changes require explicit re-review and a before/after report; tests do not encode a preferred automotive hierarchy. Run `npm run check` and the documented browser checks, then perform the separate [substantive review checklist](SUBSTANTIVE_REVIEW.md). Builds and schema validation do not establish automotive accuracy. Do not merge or redeploy this correction without owner instruction.
