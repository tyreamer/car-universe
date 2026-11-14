# Research update validation — 2026-11-14

This release reviews the owner-supplied report against the existing 20-configuration cohort. It adds bounded evidence and records rejected/unresolved assertions; it does not restore unsupported numbers. The owner explicitly requested commit, merge and deployment after supplying the research.

## Coverage snapshot

- 200 identities retained; 217 registry sources and 797 original EPA rows.
- 20 AI-reviewed configurations, 180 without a substantive review, zero independently human-reviewed configurations.
- Longevity: 200 unrated. Low upkeep: 200 unrated. Driving enjoyment: 18 rated / 182 unrated. Editorial aesthetics: 18 rated / 182 unrated.
- Zero cars have all four scores. Default longevity/enjoyment map: 0 plotted / 200 listed. Explicit driving/design axes: 17 plotted / 200 listed.
- Ownership research remains partial for 37 records and pending for 163; none meet all completion criteria. These are computed snapshots, not quotas.
- All 80 cohort before/after scores are unchanged. All 14 comparison decisions advance to revision 2 with explicit reasons.

## Executed checks

`npm run check` passed: catalog validation, current report/receipt checks, 23 tests, TypeScript checking and Vite production build. It validates all 200 vehicle records and the full 800-row original-baseline change report. New tests cover the submitted-file checksum, receipt completeness, stale values, source references, comparison revisions, exclusion of inapplicable evidence and scoped cost-input arithmetic/provenance.

`scripts/browser-checks.js` passed 39 assertions against the production preview and isolated development fixtures: desktop/mobile square plotting region, named crosshair quadrants, fixed coordinates, true overlaps, unknown supplementary encodings, two-axis inclusion, score direction, selected panel, compare, deep links and local My taste persistence. Synthetic fixtures never enter the catalog.

`scripts/research-browser-checks.js` passed 18 assertions against the production preview: S2000 price inputs/exclusions and unrated upkeep, working source link, unknown incidence, mobile overflow, Camaro wrong-model applicability, Camry limited years/warranty labor, Fit salt-belt scope, ND2 VIN-specific recall status and profile deep links. No uncaught browser errors occurred.

Desktop and mobile screenshots were visually inspected, including the S2000 parts-only scenario and the square driving/design map. Local screenshots/logs are under ignored `output/playwright/`; repeatable browser scripts are committed. The release uses the existing static build and Pages project; no dependency or infrastructure was added.

The submitted text is archived with its original bytes. A narrow Git attribute disables newline conversion for these archives so the recorded SHA-256 survives checkout. Original baseline data, identities, specifications and retained legacy research remain preserved.

## Limits

Automated checks do not establish source truth. No physical inspection, population reliability study, independent-shop cost survey or independent human approval occurred. No full 200-car re-research was performed. BMW originals, Spyder production cutoffs, stock ND2 gearbox evidence, and other listed leads remain unresolved. Supplier prices are dated parts-only observations, not installed quotes, observed annual expenditure or failure probabilities.

Browser checks used Chromium desktop and mobile viewport emulation; other browser engines and physical mobile hardware were not tested. The production deployment and live verification result are reported in the delivery message. See the [claim decisions and before/after report](RESEARCH_UPDATE_2026-11-14.md), [current coverage](DATA_COVERAGE.md) and [research queue](RESEARCH_QUEUE.md).
