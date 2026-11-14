# Car Universe

A static React and TypeScript catalog of 200 vehicle configurations. Search the catalog, inspect source claims and editorial assessments, explore a square four-quadrant map and compare up to four cars. Comparison selections and separate My taste ratings are saved locally in the browser.

The evidence correction is provisional: 20 configurations have a new AI source review, with no independent human approval. Unsupported legacy numbers are archived. Longevity and Low upkeep are currently null, so the default map is empty; explicitly choose driving/design to explore the 17 cars with both assessments. See [the correction report](docs/CORRECTION_REPORT.md).

The [November 14 submitted-research review](docs/RESEARCH_UPDATE_2026-11-14.md) adds scoped mechanisms, remedies and one parts-only price basket. All 14 comparisons were reconsidered; no new numerical ordering was supported. The submission, acceptance/rejection reasons and all 80 cohort before/after values are preserved. See [release checks](docs/RESEARCH_RELEASE_2026-11-14.md).

## Run locally

Use Node.js 24 LTS or a compatible version listed in `package.json`.

```sh
npm install
npm run validate:data
npm run audit:scores
npm test
npm run dev
```

Vite prints the local address. Build and serve the production bundle with `npm run build` and `npm run preview`.

## Maintain the catalog

- Each vehicle file in `data/cars/<manufacturer>/` is independently editable. Its filename is the stable ID.
- `data/catalog-manifest.json` tracks the release cohort. The initial version requires exactly 200 entries.
- `data/sources.json` holds provenance and coverage limitations. `data/epa-evidence.json` retains the selected original EPA rows and their IDs.
- `data/scoring-rubric.json` holds versioned anchors and the reference ownership scenario.
- `data/assessment-baseline.json` preserves the original assessments; do not overwrite it. `data/calibration-decisions.json` holds reviewed comparisons and fingerprints. See [schema and change control](docs/SCHEMA_V2.md).
- `data/research-reviews/` preserves incremental research receipts and archived-submission hashes. The current receipt is checked by `audit:scores`; add a new dated receipt and select it there for a future review instead of rewriting historical receipts.
- `npm run validate:data` regenerates the [coverage report](docs/DATA_COVERAGE.md) and per-record [follow-up report](docs/data-quality.json). `npm run audit:scores` regenerates [calibration comparisons](docs/scoring-audit.json).
- `npm run build` validates the data, compiles a lightweight index and emits one same-origin static profile asset per vehicle. The app has no runtime API dependency.

See [methodology](docs/METHODOLOGY.md), [research standards](docs/RESEARCH_STANDARDS.md), [source policy](docs/SOURCE_POLICY.md) and [roadmap](docs/ROADMAP.md).

## Check a correction

`npm run check` validates the catalog, requires current before/after reports, runs the data/logic tests and builds the static site. When assessments change, complete the substantive review and update the explicit calibration decisions first; `npm run audit:scores` then regenerates reports. It does not automatically approve score changes or refresh calibration fingerprints.

For browser checks, serve `npm run preview -- --host 127.0.0.1 --port 4173` after a build and `npm run dev -- --host 127.0.0.1 --port 5174` for isolated synthetic fixtures. In a separate terminal run:

```sh
npx --yes --package @playwright/cli playwright-cli -s=car-review open http://127.0.0.1:4173
npx --yes --package @playwright/cli playwright-cli -s=car-review run-code --filename scripts/browser-checks.js
npx --yes --package @playwright/cli playwright-cli -s=car-review run-code --filename scripts/research-browser-checks.js
```

Screenshots are written to `output/playwright/`. The fixture values are synthetic and never enter the catalog. The production app has no Playwright runtime dependency. Visually inspect screenshots as well as test results; then use [the substantive checklist](docs/SUBSTANTIVE_REVIEW.md). This correction branch is for owner review, not automatic deployment.

## Cloudflare Pages

In Cloudflare, create a Pages project and connect the GitHub repository. Set the build command to `npm run build` and the output directory to `dist`. Use the repository root. The site relies on the Pages SPA fallback for direct profile, compare and methodology URLs. Keep the output free of a top-level `404.html` to retain that fallback. [Cloudflare React Pages guide](https://developers.cloudflare.com/pages/framework-guides/deploy-a-react-site/)

For a direct upload to an existing Pages project, authenticate with Wrangler and run:

```sh
npm ci
npm run validate:data
npm run build
npx wrangler pages deploy dist --project-name car-universe
```

Use the actual Pages project name if it differs. The repository contains the build and static headers configuration. Publishing requires access to the destination Cloudflare project.
