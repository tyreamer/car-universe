import { writeFileSync } from 'node:fs'
import { dimensions } from '../src/schema'
import { loadCatalog } from './catalog'

const pairs = [
  ['toy-mr2-sw-t1', 'toy-mr2-sw-t2', 'The suspension revision changes the handling rationale. The evidence does not resolve a score difference.'],
  ['toy-mr2-sw-na1', 'toy-mr2-sw-na2', 'Both identities are documented. The later suspension is noted, with direct naturally aspirated road tests still needed.'],
  ['toy-mr2-sw-t1', 'toy-mr2-w30-early', 'Turbo thrust and roadster agility are distinct. The SW20 lacks an ownership comparison.'],
  ['toy-mr2-aw-na1', 'por-944-early', 'The 944 has recurring specialist belt work and a documented consequence for missing it.'],
  ['por-944-late', 'por-944-t', 'Turbo packaging adds cost and complexity while the base belt service remains.'],
  ['che-cam-f5-lfx', 'che-cam-f5-ls3', 'Both outputs and gearboxes are documented. GM documents 2012 LFX timing-chain repair exposure. Direct LFX driving and matched SS cost evidence remain open.'],
  ['che-cam-f6-lgx', 'che-cam-f6-lt1', 'The V6 feels lighter at the nose. The SS has more powertrain character and documented performance-consumable burden.'],
  ['maz-mx5-na16', 'maz-mx5-nc2', 'The heavier NC has a more substantial feel and a revised high-rpm engine. The NC assessment is provisional and incorporates the documented coolant reservoir concern.'],
  ['maz-mx5-na16', 'maz-mx5-nd2', 'Both are benchmarks for driver involvement. ND2 ownership research remains open.'],
  ['hon-s2k-ap1', 'por-box-986-25', 'The period test supports the Honda shift and rev character and the Porsche steering and predictable balance.'],
  ['bmw-z3m-e36-s54', 'bmw-z4m-e85', 'Shared engine family with different chassis behavior. Cost evidence is incomplete for the Z3.'],
  ['bmw-m3-e36-s50', 'bmw-m3-e46-m', 'The E36 favors compliance and feedback. The E46 adds S54 character and documented inspection dependencies.'],
  ['bmw-m3-e46-m', 'bmw-m3-e46-smg', 'The shared S54 and structure tie in longevity. SMG adds service complexity and low-speed shift tradeoffs.'],
  ['toy-gr86-zn8', 'sub-brz-zd8', 'Distinct tuning supports different notes and a tied enjoyment rating. Long-term durability stays unrated. Only Toyota has a provisional cost assessment backed by the factory schedule in this catalog.']
] as const

const { vehicles } = loadCatalog()
const byId = new Map(vehicles.map(car => [car.id, car]))
const report = pairs.map(([left, right, explanation]) => {
  const a = byId.get(left)!
  const b = byId.get(right)!
  const scores = Object.fromEntries(dimensions.map(dimension => {
    const first = a.scores[dimension].value
    const second = b.scores[dimension].value
    return [dimension, { first, second, delta: first === null || second === null ? null : second - first }]
  }))
  return { left, right, scores, explanation }
})
const flags = report.flatMap(pair => Object.entries(pair.scores).flatMap(([dimension, score]) => {
  if (score.delta === null) return [{ pair: pair.left + ' / ' + pair.right, dimension, status: 'incomplete evidence' }]
  return Math.abs(score.delta) >= 20 ? [{ pair: pair.left + ' / ' + pair.right, dimension, status: 'review large difference' }] : []
}))
writeFileSync('docs/scoring-audit.json', JSON.stringify({ pairs: report, flags }, null, 2) + '\n')
console.log('Audited ' + report.length + ' calibration pairs. ' + flags.length + ' incomplete or large-difference dimension flags.')
