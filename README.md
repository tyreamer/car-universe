# Car Universe

A static React and TypeScript catalog of 200 vehicle configurations. Search the catalog, open evidence-backed profiles, explore the four-dimensional map and compare up to four cars. Comparison selections are saved locally in the browser.

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
- `npm run validate:data` regenerates the [coverage report](docs/DATA_COVERAGE.md) and per-record [follow-up report](docs/data-quality.json). `npm run audit:scores` regenerates [calibration comparisons](docs/scoring-audit.json).
- `npm run build` validates the data, compiles a lightweight index and emits one same-origin static profile asset per vehicle. The app has no runtime API dependency.

See [methodology](docs/METHODOLOGY.md), [research standards](docs/RESEARCH_STANDARDS.md), [source policy](docs/SOURCE_POLICY.md) and [roadmap](docs/ROADMAP.md).

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
