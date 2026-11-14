# Evidence and quadrant correction

Prepared on 2026-11-13 on `codex/evidence-quadrant-correction`. The starting branch was clean `main` at `83d3f793111c216f76678e3c4e0ec49792a675cd`, exactly the reviewed commit. No subsequent local work was overwritten. This branch has not been merged or deployed.

## Reproduced findings

The original files reproduced the review's findings: 200 identities, 25 records with all four numbers, zero research-complete records, 175 null longevity assessments, 171 null upkeep assessments, and ownership coverage of 163 pending / 37 partial. The old audit had 14 fixed comparisons and treated nulls or an absolute gap of at least 20 as flags. Score records had prose and citations but no structured anchor/adjustment derivation. The chart used an 800-by-292 view box, fitted scales and displaced overlaps; the explorer required all four scores. Its inverse upkeep-to-burden conversion was intentional but insufficiently explained across surfaces.

The NA 1.6 / NC2 Miata mechanical numbers were 80/85 and 75/75. That difference was not justified by comparable whole-platform coverage. Both SW20 naturally aspirated audit entries had four nulls; the LS3 manual lacked both mechanical numbers. Original evidence is preserved in [BASELINE_COVERAGE.md](BASELINE_COVERAGE.md), [baseline-scoring-audit.json](baseline-scoring-audit.json) and the full [assessment baseline](../data/assessment-baseline.json).

## Current coverage

These are snapshots, not permanent acceptance targets. [DATA_COVERAGE.md](DATA_COVERAGE.md) is generated from the records.

| Measure | Before | After |
| --- | ---: | ---: |
| Vehicle identities | 200 | 200 |
| All four numeric scores | 25 | 0 |
| Numeric longevity | 25 | 0 |
| Numeric Low upkeep | 29 | 0 |
| Numeric driving enjoyment | 87 | 18 |
| Numeric Editorial aesthetics | 87 | 18 |
| New substantive AI reviews | Not recorded in this schema | 20 |
| Completed independent human reviews | 0 | 0 |
| Current default longevity/enjoyment map | — | 0 |
| Current driving/design axis pair | — | 17 |

All 200 identity/specification records, legacy ownership research and the 206 original source IDs/URLs remain. Four applicable sources were added, giving 210 sources; all 797 EPA rows remain. Existing ownership research status still reads 163 pending / 37 partial because a new assessment review is not a completed ownership dossier. All 200 records have open research work.

Unsupported legacy numbers were withdrawn rather than assigned new default values. The baseline retains all 800 old dimension records verbatim, including rationales and citations, plus old cost tiers and annual-cost fields. The change report covers every dimension, including unchanged nulls: 199 formerly numeric values were withdrawn, seven previously null fields received new editorial assessments, and 24 existing numbers changed tier. No annual dollar estimate or failure probability was invented.

## Initial cohort and substantive limits

The 20 reviewed configurations include both naturally aspirated SW20 eras, both Turbo eras, early/late U.S. manual Spyder, base 944 and 944 Turbo, Camaro LFX and LS3 manuals, NA/NC/ND Miatas, AP1 S2000, E46 M3 manual, early 2.5 Boxster, Fit GE manual, Corolla E170 CVT, Camry XV50 2.5 automatic and Mazda3 BM 2.0 automatic. The exact IDs and 14 paired decisions are in [calibration-decisions.json](../data/calibration-decisions.json).

Sources were opened and reconsidered for applicability, not merely copied into a new schema. Each reviewed record has an inspected evidence ledger, five-system durability coverage, six cost categories, six driving aspects, limitations and unresolved work. All numeric results use broad anchors with no finer adjustments. Each pair explains differences, ties or unknown outcomes. Review status is **AI reviewed; human review pending** throughout this cohort. The other 180 records were migrated without claiming a fresh substantive review.

The review does **not** resolve comparative whole-platform longevity or mechanical expenditure. Incomplete system coverage and unmatched cost inputs leave both dimensions null for every car. Missing incidence is not treated as low incidence. The NA/NC mechanical comparison remains unknown, rather than being reversed on the strength of one cooling component. Useful individual risk research is retained without pretending it supports a platform-wide number.

Specific applicability issues are recorded in the affected ledgers and queue:

- The retained MR2 Turbo test labeled 1992 describes revised suspension/wheels/brakes; that conflict prevents treating it as a clean early-configuration test. The new Consumer Guide review supports a limited broad comparison, not a precise early/late ranking.
- A grouped Camaro review's tested 2011 V6 is not the LFX manual. Its driving score stays null. The 2012 LFX bulletin is not silently extended to all later years.
- The late U.S. Spyder's brochure establishes a five-speed manual configuration; early driving observations and SMT material do not fill its missing applicable manual evaluation.
- The Camry identity spans a restyle; its one shared aesthetics number stays null. Early Boxster evidence is not assigned a later single-row IMS failure percentage.
- Two retained BMW technical URLs returned 403 and 404 during reinspection. Their old references remain available, but this review does not claim to have revalidated their contents.

These are limits of this research pass. No automotive expert, independent human reviewer, owner survey, observed cost sample or physical inspection was supplied. Further research is prioritized in [RESEARCH_QUEUE.md](RESEARCH_QUEUE.md), with all 200 records in [research-queue.json](research-queue.json).

## Implementation

[SCHEMA_V2.md](SCHEMA_V2.md) documents the evidence/assessment separation and compatibility fields. [METHODOLOGY.md](METHODOLOGY.md) defines each dimension, reference population, maintenance assumptions and the U.S. 3,000-mile/year independent-shop scenario. [RATING_CHANGES.md](RATING_CHANGES.md) gives the cohort's before/after explanations and all paired decisions; [rating-changes.json](rating-changes.json) contains the complete 800-row report.

The primary discovery map now has a square plotting region on desktop and mobile, fixed 0–100 axes, a visible midpoint crosshair and four descriptive regions. Default axes remain longevity rightward and enjoyment upward. The split is explicitly a display convention. Any two dimensions can be selected; cars need only those two values. The catalog explains missing coordinates and displays plotted/listed counts and a provisional-data notice.

Identical coordinates use numbered groups and an overlap list with no displacement or averaging. Circle size retains inverse mechanical burden; every numeric surface shows the same higher-is-better Low upkeep value. Unknown upkeep uses a diamond and unknown aesthetics uses hatching. The selected panel exposes all four values, types, confidence and review status. Personal My taste values persist locally without changing shared catalog ratings or chart coordinates.

The default map is currently empty because its longevity data is insufficient. An explicit driving/design action exposes the 17 two-axis-complete cars. This limitation is visible; no substitute score or automatic axis change hides it. Existing search, filtering, comparison, deep links, keyboard interaction and responsive layout are retained. No backend, accounts, runtime AI, paid data service, infrastructure or package dependency was added.

## Validation and release review

Executed on Node 24.12.0 / Windows:

- Initial baseline: the existing six tests passed before edits.
- `npm run check`: passed data validation, current report/calibration checks, all **19 tests**, TypeScript checking and Vite production build. The checks validated 200 records, 210 sources, 797 EPA rows, 20 reviewed configurations, 14 decisions and 800 change rows.
- Browser script: `scripts/browser-checks.js`, using a production preview at port 4173 and a local Vite server at 5174 for isolated synthetic fixtures. It checks square geometry/crosshairs at desktop, 390px and 320px widths; fixed coordinates under filtering; two-axis inclusion; unknown size/color; exact overlap centers; independent axes; numeric upkeep direction; keyboard selection; profile/compare/deep links; local My taste persistence; comparison persistence; and uncaught production errors. The final run passed **39 assertions**, with zero uncaught production errors. Coverage expectations are computed from current catalog values rather than frozen quotas.
- Direct baseline preservation check: all 200 identities, existing specifications/character/ownership claims, original design tags and all 206 original source URLs preserved; all 800 old score records and old cost fields archived exactly. New design tags were added only where missing.
- Actual desktop and mobile screenshots were inspected. The style scanner's remaining hits are intentional links, arrows, existing typography and functional chart geometry; no decorative redesign was applied.

The browser checks use Chromium, not a cross-browser/device laboratory. No Safari/Firefox or full screen-reader audit was performed. Synthetic fixture scores exercise zero, unknown and overlap behavior and never enter the catalog. Automated validation cannot establish source truth, actual human review, failure incidence or the correctness of editorial taste. The separate [SUBSTANTIVE_REVIEW.md](SUBSTANTIVE_REVIEW.md) checklist remains required for substantive approval. Do not merge or redeploy without the owner's instruction.

## Reproduce the local review

```sh
npm run check
# In separate terminals:
npm run dev -- --host 127.0.0.1 --port 5174
npm run preview -- --host 127.0.0.1 --port 4173
# With the Playwright CLI available:
playwright-cli -s=car-review open http://127.0.0.1:4173
playwright-cli -s=car-review run-code --filename scripts/browser-checks.js
git diff main...codex/evidence-quadrant-correction
```

Browser screenshots are local ignored artifacts under `output/playwright/`. Reports and reviewed evidence are committed with the code so the change can be reviewed without running the app.
