import { readFileSync, writeFileSync } from 'node:fs'
import { loadCatalog, readJson, summarizeCatalog } from './catalog'
import { validateCalibration } from './calibration'
import { changeMarkdown, ratingChanges, researchQueue } from './reports'
import type { Baseline } from './reports'

const catalog = loadCatalog()
const calibration = validateCalibration(catalog.vehicles, readJson('data/calibration-decisions.json'))
const baseline = readJson('data/assessment-baseline.json') as Baseline
const changes = ratingChanges(catalog.vehicles, baseline)
const queue = researchQueue(catalog.vehicles)
const json = (value: unknown) => JSON.stringify(value, null, 2) + '\n'
const files = new Map([
  ['docs/scoring-audit.json', json({ rubricVersion: calibration.version, reviewStatus: calibration.reviewStatus, pairs: calibration.pairs, note: 'Reviewed decisions and evidence fingerprints are checked. Gap size is not a credibility test. Unknown is not a tie. Source truth needs substantive review.' })],
  ['docs/rating-changes.json', json({ baselineCommit: baseline.commit, coverage: summarizeCatalog(catalog), changes })],
  ['docs/RATING_CHANGES.md', changeMarkdown(changes, baseline, calibration)],
  ['docs/research-queue.json', json(queue)],
  ['docs/RESEARCH_QUEUE.md', ['# Unresolved research queue', '', 'Priority: complete comparable system and cost coverage before restoring default-map coordinates. No failure probabilities or annual costs should be fabricated to fill the chart.', '',
    ...queue.filter(item => calibration.cohortIds.includes(item.id)).flatMap(item => ['## ' + item.id, '', 'Review: ' + item.reviewStatus + ' (human review pending). Unrated: ' + item.unratedDimensions.join(', ') + '.', '', ...item.tasks.map(task => '- ' + task), ...item.conflicts.map(task => '- Conflict: ' + task), '']),
    '## Remaining catalog', '', 'The other ' + (catalog.vehicles.length - calibration.cohortIds.length) + ' identities retain their earlier research and source registry links. They have not received a new substantive assessment. Their tasks and unrated fields are in [research-queue.json](research-queue.json); missing system lists on an unreviewed record mean no checklist was performed, not complete coverage.', ''
  ].join('\n')]
])
for (const [path, content] of files) {
  if (process.argv.includes('--check')) {
    if (readFileSync(path, 'utf8') !== content) throw new Error('Stale review report: ' + path + '. Run npm run audit:scores and review the resulting changes.')
  } else writeFileSync(path, content)
}
console.log('Checked ' + calibration.cohortIds.length + ' reviewed configurations, ' + calibration.pairs.length + ' comparison decisions and ' + changes.length + ' before/after dimension rows. No source-truth certification.')
