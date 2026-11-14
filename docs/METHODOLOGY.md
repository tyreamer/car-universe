# Scoring methodology

Version 1.0.0. Each model-year and mechanical configuration has four independent assessments on a 0–100 scale. Higher is more desirable. Numeric editorial assessments use five-point increments. The machine-readable anchors and scenario are in [data/scoring-rubric.json](../data/scoring-rubric.json).

Select the closest anchor using configuration-specific observations, then move in five-point steps only when a written factor supports the adjustment. Scores require a review date and cited evidence. A null represents insufficient evidence. Scores can tie. There is no aggregate ranking.

## Longevity

Judge engine, transmission, cooling, electronics and structure as a system. Consider documented failure mechanisms, their severity and how practical they are to prevent. Qualitative material can support a provisional score when it has meaningful coverage. Individual service history, modifications, corrosion and inspections matter when buying a used example. A platform score cannot predict its remaining life.

## Ownership cost

The reference is a U.S. weekend car driven 3,000 miles per year, bought in good used condition and maintained by independent shops or specialists. Consider parts, labor, consumables, scheduled work, unexpected repairs and catastrophic exposure. Higher scores mean lower burden. Fuel, insurance, acquisition, financing, depreciation, registration and tax are outside this score. Use qualitative tiers when a defensible dollar range is unavailable. Scores of 90 and above are very low burden, 70–85 low, 55–65 moderate, 35–50 high, and 0–30 very high. The data model can carry separate scenarios when evidence is available.

## Driving enjoyment

Use first-hand road tests of the relevant mechanical setup. Evaluate steering, braking, chassis balance, powertrain response, gearshift and involvement at road speeds. Editorial reasons should identify both the strongest quality and a limitation. Evaluate the actual transmission in context.

## Aesthetics

Evaluate proportions, visual identity, coherence and presence against the published anchors. Design references establish what the car looks like. The judgment is editorial and taste-dependent. Tags describe visible traits. No community or audience votes enter this release.

## Confidence

High requires multiple directly relevant credible sources. Medium denotes applicable evidence with limits. Low denotes a provisional or narrowly supported assessment. Unrated indicates a null. Confidence stays separate from the score. For aesthetics it concerns the quality and applicability of the design reference and rationale.

## Visual encoding

Longevity is horizontal and driving enjoyment is vertical. Mechanical burden is 100 minus the ownership-cost score. The chart uses bubble area proportional to burden with a minimum marker area. The plot starts with a fitted scale and offers a full 0–100 view. Markers with identical coordinates are offset for selection. Color encodes aesthetics, with exact values in the tooltip and table. The chart requires four numeric scores and the catalog retains incomplete records for browsing and comparison.
