import { writeFileSync } from 'node:fs'
import { loadCatalog, summarizeCatalog } from './catalog'

const report = summarizeCatalog(loadCatalog())
writeFileSync('docs/data-quality.json', JSON.stringify(report, null, 2) + '\n')
const table = (title: string, values: Record<string, number>) => [
  '## ' + title, '', '| Item | Records |', '| --- | ---: |',
  ...Object.entries(values).map(([key, value]) => '| ' + key + ' | ' + value + ' |'), ''
]
const coverage = [
  '# Data coverage', '',
  report.total + ' vehicle records. ' + report.allFourRated + ' have four numeric assessments. ' + report.chartReady + ' can be plotted on the default longevity/enjoyment axes. ' + report.fullyCurated + ' meet all research and independent human-review completion criteria.', '',
  'Generated from the current catalog; counts are a snapshot, not acceptance quotas. Null is missing support, never a zero rating. The original snapshot is preserved in [BASELINE_COVERAGE.md](BASELINE_COVERAGE.md).', '',
  ...table('Substantive review status', report.reviewStatus), ...table('Cars available by axis pair', report.axisPairs),
  report.epaFullYearCoverage + ' records have a selected EPA row for every model year in the stated range. ' + report.sourceRows + ' unique original EPA rows are retained as evidence. EPA labels can group trims.', '',
  'Confirmed identifies records with additional archival evidence for the catalog identity. The evidence varies in granularity. Research is editorial and has received no independent human approval.', '',
  ...table('Categories', report.categories), ...table('Manufacturers', report.makes),
  ...table('Identity status', report.identity), ...table('Identity evidence', report.identityCoverage),
  ...table('Specification fields populated', report.specifications),
  ...table('Ownership research status', report.research.ownership),
  ...table('Assessment status', report.research.scores),
  '## Confidence by dimension', '', '| Dimension | High | Medium | Low | Unrated |', '| --- | ---: | ---: | ---: | ---: |',
  ...Object.entries(report.scores).map(([key, levels]) => '| ' + key + ' | ' + [levels.high, levels.medium, levels.low, levels.unrated].join(' | ') + ' |'), '',
  ...table('Sources by category', report.sourcesByType),
  '## Follow-up', '', report.followUp.length + ' records have open research items. See [the machine-readable report](data-quality.json) for per-record tasks.', '',
  'Curb weights, annual repair estimates and several trim-specific claims have limited coverage. The catalog omits annual dollar estimates where evidence does not support a representative range.', ''
]
writeFileSync('docs/DATA_COVERAGE.md', coverage.join('\n'))
console.log('Validated ' + report.total + ' vehicles against ' + report.sources + ' sources and ' + report.sourceRows + ' EPA rows. ' + report.chartReady + ' chart-ready, ' + report.followUp.length + ' with research follow-up.')
