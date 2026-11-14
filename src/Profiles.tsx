import { useEffect, useState } from 'react'
import type { Score, Source, Vehicle } from './schema'
import { byId, carPath, catalog, dimensions, labels, loadProfile, marketName, name, years } from './data'
import type { Profile, Summary } from './data'
import rubric from '../data/scoring-rubric.json'
import { reviewLabels } from './scoring'
import { MyTaste, readTaste } from './MyTaste'

const specLabels = {
  engineCode: ['Engine', ''], displacementL: ['Displacement', ' L'], cylinders: ['Cylinders', ''], cylinderLayout: ['Cylinder layout', ''],
  aspiration: ['Aspiration', ''], horsepowerHp: ['Power', ' hp'], torqueLbFt: ['Torque', ' lb-ft'], transmission: ['Transmission', ''],
  gears: ['Gears', ''], hasClutchPedal: ['Clutch pedal', ''], drivetrain: ['Drivetrain', ''], engineLocation: ['Engine location', ''],
  curbWeightLb: ['Curb weight', ' lb'], seats: ['Seats', '']
} satisfies Record<keyof Vehicle['specs'], [string, string]>

function Citations({ ids, sources }: { ids: string[]; sources: Source[] }) {
  return <span className="citations">{ids.map(id => {
    const source = sources.find(item => item.id === id)
    return source && <a key={id} href={'#source-' + id} title={source.title}>{source.publisher}</a>
  })}</span>
}

function ScoreLabel({ score }: { score: Pick<Score, 'value' | 'confidence' | 'assessmentType' | 'reviewStatus'> }) {
  return <><strong className="score-value">{score.value === null ? 'Unrated' : <>{score.value}<small> / 100</small></>}</strong>
    <span className="confidence">{score.assessmentType} · {score.confidence} confidence<br />{reviewLabels[score.reviewStatus]}</span></>
}

function Specs({ vehicle, sources }: Profile) {
  return <dl className="specs">{Object.entries(specLabels).map(([key, [label, unit]]) => {
    const field = key as keyof Vehicle['specs']
    const value = vehicle.specs[field]
    const evidence = vehicle.specEvidence[field]
    const unknown = field === 'gears' && vehicle.specs.transmission.endsWith('CVT') || field === 'cylinders' && vehicle.specs.cylinderLayout === 'Rotary' ? 'Not applicable' : 'Unknown'
    return <div key={key}><dt>{label}</dt><dd>{value === null ? unknown : typeof value === 'boolean' ? value ? 'Yes' : 'No' : value + unit}
      {evidence && <details><summary>Evidence</summary><p>{evidence.text}</p><Citations ids={evidence.sourceIds} sources={sources} /></details>}</dd></div>
  })}</dl>
}

function Claims({ claims, sources }: { claims: { text: string; sourceIds: string[] }[]; sources: Source[] }) {
  return <ul className="claims">{claims.map((claim, index) => <li key={index}>{claim.text}<Citations ids={claim.sourceIds} sources={sources} /></li>)}</ul>
}

export function VehiclePage({ id, toggle, selected, navigate }: {
  id: string; toggle: (id: string) => void; selected: string[]; navigate: (path: string) => void
}) {
  const [profile, setProfile] = useState<Profile>()
  const [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    loadProfile(id, controller.signal).then(setProfile).catch((cause: Error) => {
      if (!controller.signal.aborted) setError(cause.message)
    })
    return () => controller.abort()
  }, [id])
  if (error || !byId.has(id)) return <main className="shell inner" id="main"><h1>Vehicle unavailable</h1><p>{error || 'This ID is outside the current catalog.'}</p><a href="/" onClick={event => { event.preventDefault(); navigate('/') }}>Back to Explorer</a></main>
  if (!profile) return <main className="shell inner" id="main"><p role="status">Loading vehicle profile…</p></main>
  const { vehicle: car, sources, epa } = profile
  const related = catalog.filter(other => other.id !== id && (other.make === car.make && other.model === car.model || other.bodyStyle === car.bodyStyle && other.drivetrain === car.specs.drivetrain))
    .sort((a, b) => Number(b.make === car.make && b.model === car.model) - Number(a.make === car.make && a.model === car.model) || Math.abs(a.years.from - car.years.from) - Math.abs(b.years.from - car.years.from)).slice(0, 4)
  const ownership = car.ownership
  const notes = [
    ['Strengths', ownership.strengths], ['Limitations', ownership.weaknesses], ['Preventive maintenance', ownership.prevention],
    ['Model-year changes', ownership.yearChanges], ['Parts availability', ownership.partsAvailability ? [ownership.partsAvailability] : []],
    ['Mechanical complexity', ownership.mechanicalComplexity ? [ownership.mechanicalComplexity] : []],
    ['Maintenance access', ownership.maintenanceAccessibility ? [ownership.maintenanceAccessibility] : []]
  ] as const
  return <main className="shell inner profile" id="main">
    <a className="back" href="/" onClick={event => { event.preventDefault(); navigate('/') }}>← Explorer</a>
    <div className="profile-top">
      <div><h1>{name(car)}</h1>
        <p className="subtitle">{years(car)} · {car.generation} · {car.variant}</p>
        <p>{marketName(car.market)} · {car.bodyStyle} · {car.segment} · {car.category}</p>
        <button className="button primary" disabled={selected.length >= 4 && !selected.includes(id)} onClick={() => toggle(id)}>{selected.includes(id) ? 'Remove from comparison' : 'Add to comparison'}</button>
      </div>
      {car.photo ? <figure className="profile-photo"><img src={car.photo.path} alt={car.photo.alt} /><figcaption><a href={sources.find(source => source.id === car.photo?.sourceId)?.url}>{car.photo.credit}</a><a href={car.photo.licenseUrl}>{car.photo.license}</a></figcaption></figure>
        : <div className="photo-placeholder"><span>{car.generation}</span><small>Photo unavailable</small></div>}
    </div>
    <section><h2>Four dimensions</h2><p>Higher is better on every dimension. These are provisional editorial judgments, not population statistics. Unrated means insufficient support, not a low score.</p><div className="score-grid">{dimensions.map(key => {
      const score = car.scores[key]
      return <article key={key}><h3>{labels[key]}</h3><ScoreLabel score={score} />
        {score.value !== null && <div className="score-track" aria-hidden="true">
          <span style={{ width: score.value + '%' }} />
        </div>}
        <p>{score.rationale}</p>
        <details><summary>Derivation, evidence and uncertainty</summary>
          <p>{score.assessor.id} ({score.assessor.type}) · Rubric {score.methodologyVersion} · Assessment date {score.reviewedAt ?? 'not recorded'}</p>
          {score.derivation ? <>
            <p>Anchor {score.derivation.anchor}: {score.derivation.anchorReason}</p>
            <ul>{score.derivation.adjustments.map((adjustment, i) => <li key={i}>{adjustment.delta > 0 ? '+' : ''}{adjustment.delta}: {adjustment.reason} · Evidence {adjustment.evidenceIds.join(', ')}</li>)}</ul>
            <p>{score.derivation.adjustments.length ? 'Derived result: ' : 'No adjustments; derived result: '}{score.derivation.finalValue}.</p>
            <p>{score.derivation.comparison.rationale}</p>
            <p>Reference cars: {score.derivation.comparison.referenceIds.map((id, i) => <span key={id}>{i ? ', ' : ''}<a href={carPath(id)}>{name(byId.get(id)!)} ({id})</a></span>)}</p>
            <p>Inspected evidence: {score.derivation.evidenceIds.map((id, i) => <span key={id}>{i ? ', ' : ''}<a href={'#evidence-' + id}>{id}</a></span>)}</p>
          </> : <p>No numeric derivation is supported.</p>}
          <ul>{score.uncertainties.map(item => <li key={item}>{item}</li>)}</ul>
          {score.conflictingEvidence.length > 0 && <><h4>Conflicting evidence</h4><ul>{score.conflictingEvidence.map(item => <li key={item}>{item}</li>)}</ul></>}
          {score.evidence.length > 0 && <><h4>{score.derivation ? 'Assessment claims' : 'Retained research · applicability may still need review'}</h4><Claims claims={score.evidence} sources={sources} /></>}
        </details></article>
    })}</div></section>
    <MyTaste key={car.id} id={car.id} />
    {car.evidenceLedger.length > 0 && <section><h2>Inspected evidence</h2><p>Inspection records what a source supports. It does not certify its truth or establish the editorial score.</p><ol className="evidence-ledger">{car.evidenceLedger.map(item => <li key={item.id} id={'evidence-' + item.id}>
      <strong>{item.claim}</strong><Citations ids={item.sourceIds} sources={sources} />
      <p>Location: {item.location}. Inspected {item.inspectedAt} by {item.inspectedBy.id} ({item.inspectedBy.type}).</p>
      <p>Establishes: {item.establishes} Does not establish: {item.doesNotEstablish}</p>
      <p>Applicability: {item.applicability.status} · {item.applicability.generation} · {item.applicability.engineCode ?? 'engine code unresolved'} · {item.applicability.transmission} · {years(item.applicability)} · {item.applicability.market}. {item.applicability.limitations}</p>
    </li>)}</ol></section>}
    {car.assessmentReview && <section><h2>Comparable review coverage</h2><p>{reviewLabels[car.assessmentReview.status]} · {car.assessmentReview.assessedAt}. {car.assessmentReview.ageRisk}</p>
      {([['Systems', car.assessmentReview.systems], ['Mechanical costs', car.assessmentReview.costs], ['Driving controls', car.assessmentReview.driving]] as const).map(([label, fields]) => <details key={label}><summary>{label}</summary><dl>{Object.entries(fields).map(([key, item]) => <div key={key}><dt><strong>{key} · {item.status}</strong></dt><dd>{item.note} {item.evidenceIds.map(id => <a key={id} href={'#evidence-' + id}>{id} </a>)}</dd></div>)}</dl></details>)}
      {car.assessmentReview.risks.length > 0 && <><h3>Risk scope</h3><ul>{car.assessmentReview.risks.map((risk, i) => <li key={i}><strong>{risk.mechanism}</strong><p>{risk.affectedYears.from}–{risk.affectedYears.to} · incidence {risk.incidence} · {risk.severity} severity · {risk.evidenceStrength} · {risk.ageDependent ? 'age-dependent exposure' : 'mechanism not defined by age alone'}</p><p>Prevention: {risk.preventability} Residual risk: {risk.residualRisk}</p></li>)}</ul></>}
      {car.assessmentReview.costScenarios.map(scenario => <p key={scenario.name}><strong>{scenario.name}</strong>: {scenario.scope} {scenario.amountUsd === null ? 'No dollar estimate.' : '$' + scenario.amountUsd}</p>)}
    </section>}
    <section><h2>Specifications</h2><Specs {...profile} /></section>
    <section><h2>Ownership and maintenance</h2>
      <p>Low upkeep: higher means more affordable mechanical maintenance. U.S., 3,000 miles/year, independent-shop labor. Excludes fuel, insurance, depreciation, financing, purchase price and taxes. Acquisition catch-up is separate.</p>
      <p>Mechanical burden tier: <strong>{ownership.costTier ?? 'Unrated'}</strong>. {ownership.annualCost
        ? 'Estimated $' + ownership.annualCost.lowUsd + '–$' + ownership.annualCost.highUsd + ' for ' + ownership.annualCost.annualMiles + ' miles per year. ' + ownership.annualCost.assumptions
        : 'No representative annual dollar estimate is available.'}</p>
      <h3>Retained issue research</h3><p>These legacy notes are preserved for follow-up. Only the inspected-evidence section records this review’s applicability checks. A documented mechanism or campaign does not establish incidence.</p>
      {ownership.knownIssues.length ? <ul className="claims">{ownership.knownIssues.map(issue => <li key={issue.text}><strong>{issue.severity} severity · {issue.frequency === 'unknown' ? 'frequency unknown' : issue.frequency}</strong><br />{issue.text}<Citations ids={issue.sourceIds} sources={sources} /></li>)}</ul>
        : <p>Configuration-specific issues are still unresearched or insufficiently documented.</p>}
      {notes.map(([label, claims]) => claims.length > 0 && <div key={label}><h3>{label}</h3><Claims claims={[...claims]} sources={sources} /></div>)}
    </section>
    <section><h2>Retained driving and design notes</h2>
      <p>These earlier notes remain available for context. Current assessments and inspected coverage appear above.</p>
      <p>{car.character.driving?.text ?? 'No earlier driving note.'}</p><p>{car.character.styling?.text ?? 'No earlier styling note.'}</p>
      {car.aestheticsTags.length > 0 && <ul className="tags">{car.aestheticsTags.map(tag => <li key={tag}>{tag}</li>)}</ul>}
      {car.character.enthusiastAppeal && <p>{car.character.enthusiastAppeal}</p>}
      {car.character.idealBuyer && <p><strong>Ideal buyer</strong> {car.character.idealBuyer}</p>}
      {car.character.avoidIf && <p><strong>Consider alternatives if</strong> {car.character.avoidIf}</p>}
    </section>
    <section><h2>Research status</h2>
      <dl className="status-grid"><div><dt>Identity</dt><dd>{car.identity.status}</dd></div><div><dt>Specifications</dt><dd>{car.research.specifications}</dd></div>
        <div><dt>Ownership</dt><dd>{car.research.ownership}</dd></div><div><dt>Scores</dt><dd>{car.research.scores}</dd></div><div><dt>Production status</dt><dd>{car.productionStatus}</dd></div></dl>
      <p>{car.identity.notes}</p><Citations ids={car.identity.sourceIds} sources={sources} />
      {car.research.followUp.length > 0 && <details><summary>Open research items</summary><ul>{car.research.followUp.map(item => <li key={item}>{item}</li>)}</ul></details>}
      {epa.length > 0 && <details><summary>Original EPA configuration rows</summary><ul>{epa.map(row => <li key={row.id}>
        <a href={'https://www.fueleconomy.gov/ws/rest/vehicle/' + row.id}>{row.year} · {row.model} · {row.trany} · EPA row {row.id}</a>
      </li>)}</ul></details>}
    </section>
    <section><h2>Sources</h2><ul className="source-list">{sources.map(source => <li key={source.id} id={'source-' + source.id}>
      <a href={source.url}>{source.title}</a><span>{source.publisher} · {source.category} · accessed {source.accessedAt}{source.author ? ' · ' + source.author : ''}</span>
      <p>{source.supports.join(' ')} {source.limitations}</p>
    </li>)}</ul></section>
    {related.length > 0 && <section><h2>Similar vehicles</h2><ul className="related">{related.map(other => <li key={other.id}>
      <a href={carPath(other.id)} onClick={event => { event.preventDefault(); navigate(carPath(other.id)) }}>{name(other)}</a>
      <span>{years(other)} · {other.variant}</span></li>)}</ul></section>}
  </main>
}

export function Comparison({ selected, toggle, navigate }: { selected: string[]; toggle: (id: string) => void; navigate: (path: string) => void }) {
  const taste = readTaste()
  const cars = selected.map(id => byId.get(id)).filter((car): car is Summary => Boolean(car))
  const [candidate, setCandidate] = useState('')
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  useEffect(() => {
    const controller = new AbortController()
    for (const id of selected) {
      loadProfile(id, controller.signal).then(profile => setProfiles(previous => ({ ...previous, [id]: profile }))).catch(() => {})
    }
    return () => controller.abort()
  }, [selected])
  return <main className="shell inner" id="main">
    <h1>Compare vehicles</h1><p className="subtitle">Compare up to four configurations across the same four dimensions.</p>
    {cars.length < 4 && <div className="compare-add"><label className="field"><span>Add a vehicle</span><select value={candidate} onChange={event => setCandidate(event.target.value)}>
      <option value="">Choose a configuration</option>
      {catalog.filter(car => !selected.includes(car.id)).map(car => <option value={car.id} key={car.id}>{name(car)} · {years(car)} · {car.variant}</option>)}
    </select></label><button className="button primary" disabled={!candidate} onClick={() => { toggle(candidate); setCandidate('') }}>Add</button></div>}
    {cars.length < 2 && <p>Choose at least two vehicles to compare their tradeoffs.</p>}
    {!!cars.length && <div className="table-wrap compare-table" role="region" aria-label="Scrollable comparison table" tabIndex={0}><table>
      <thead><tr><th scope="col">Dimension</th>{cars.map(car => <th scope="col" key={car.id}>
        <a href={carPath(car.id)} onClick={event => { event.preventDefault(); navigate(carPath(car.id)) }}>{name(car)}</a>
        <span>{years(car)} · {car.generation}</span><span>{car.variant}</span><button className="text-button" onClick={() => toggle(car.id)} aria-label={'Remove ' + name(car) + ' ' + car.variant}>Remove</button>
      </th>)}</tr></thead>
      <tbody>{dimensions.map(key => <tr key={key}><th scope="row">{labels[key]}{key === 'ownershipCost' && <small>Higher means cheaper</small>}</th>
        {cars.map(car => <td key={car.id}><ScoreLabel score={car.scores[key]} />{profiles[car.id] && <p>{profiles[car.id].vehicle.scores[key].rationale}</p>}</td>)}</tr>)}
        <tr><th scope="row">My taste<small>Local aesthetics override</small></th>{cars.map(car => <td key={car.id}>{taste[car.id] ?? 'Not set'}<small>Personal · this browser only</small></td>)}</tr></tbody>
    </table></div>}
  </main>
}

export function Methodology() {
  return <main className="shell inner methodology" id="main">
    <h1>Scoring methodology</h1><p className="subtitle">Rubric {rubric.version} · Four independent assessments on a 0–100 scale</p>
    <p>Scores are evidence-informed editorial tiers, not measured population statistics or percentiles. The reference population is the catalog’s enthusiast configurations and mainstream reference cars. Use broad anchors; every adjustment must identify evidence, its reason and a reviewed comparison. Null is insufficient support, never zero or an average. No composite score is used.</p>
    <div className="method-grid">{dimensions.map(key => {
      const item = rubric.dimensions[key]
      return <section key={key}><h2>{item.label}</h2><p>{item.description}</p>
        <dl className="anchor-list">{item.anchors.map(([value, text]) => <div key={value}><dt>{value}</dt><dd>{text}</dd></div>)}</dl></section>
    })}</div>
    <section><h2>Review and confidence</h2><p>Assessor identity, date and review status are separate from confidence. AI-reviewed means an AI inspected the sources; it is not human approval. Confidence describes support and applicability, not objective beauty or a statistical probability. Broad ties are preferred to unsupported small differences.</p></section>
    <section><h2>Mechanical ownership assumptions</h2><p>We assume U.S. ownership, good used condition at purchase, about {rubric.scenario.annualMiles.toLocaleString()} miles per year and service at independent shops or appropriate specialists. Parts, labor, routine consumables and major repair exposure affect the assessment. Acquisition, financing, depreciation, tax, registration, fuel and insurance sit outside it.</p></section>
    <section><h2>Source coverage and judgment</h2><p>A failure mechanism does not establish incidence; a bulletin does not mean every covered car fails. A road test cannot establish lifetime durability, and a specification cannot establish repair cost. Missing negative evidence does not establish exceptional reliability. Profiles separate factual claims, applicability, supported conclusions, uncertainty and editorial derivations.</p><p>Driving enjoyment uses applicable firsthand evaluations of steering, chassis, shift quality, powertrain, brakes and ordinary road speeds. Power alone is not enjoyment. Design observations do not establish beauty scores. Editorial aesthetics is assessor taste; My taste is a separate local override, with no shared votes.</p></section>
    <section><h2>Using the scores on a used-car search</h2><p>Longevity describes platform potential. An individual car’s condition, corrosion, modifications and service records can change the ownership outlook substantially. Use a pre-purchase inspection to assess the car in front of you.</p></section>
    <section><h2>Reading the map</h2><p>Initially, longevity increases rightward and driving enjoyment upward on square, fixed 0–100 scales. The split at 50 is a display convention, not a measured safety or reliability threshold. Any two dimensions can be axes. Only those two ratings are required to plot; missing ratings remain unknown.</p><p>Circle area represents mechanical burden: larger means more burden. Numeric readouts always show Low upkeep, with higher better. Color represents Editorial aesthetics; hatching marks unknown color and a diamond marks unknown upkeep. Numbered rings open a list at shared true coordinates. No marker is displaced, no average is invented, and filters never recenter the axes.</p></section>
  </main>
}
