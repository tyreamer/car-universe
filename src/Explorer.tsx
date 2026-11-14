import { useId, useMemo, useState } from 'react'
import { catalog, confidence, dimensions, labels, name, years, carPath } from './data'
import type { Summary } from './data'
import { Scatter } from './Scatter'
import type { Dimension } from './schema'
import { missingAxes } from './chart'
import { reviewLabels } from './scoring'

const initial = {
  query: '', make: '', model: '', from: '', to: '', transmission: '', pedal: '', engineLocation: '',
  cylinderLayout: '', drivetrain: '', category: '', tag: '', longevity: '', ownershipCost: '',
  drivingEnjoyment: '', aesthetics: '', confidence: '', unknown: true
}
type Filters = typeof initial
const options = (values: (string | null)[]) => [...new Set(values.filter((value): value is string => Boolean(value)))].sort()
const choices = {
  make: options(catalog.map(car => car.make)),
  transmission: options(catalog.map(car => car.transmission)),
  engineLocation: options(catalog.map(car => car.engineLocation)),
  cylinderLayout: options(catalog.map(car => car.cylinderLayout)),
  drivetrain: options(catalog.map(car => car.drivetrain)),
  category: options(catalog.map(car => car.category)),
  tag: options(catalog.flatMap(car => car.aestheticsTags))
}

export function Explorer({ mainId, selected, toggle, navigate }: {
  mainId?: string; selected: string[]; toggle: (id: string) => void; navigate: (path: string) => void
}) {
  const [filters, setFilters] = useState<Filters>(initial)
  const [view, setView] = useState<'map' | 'list'>('map')
  const [xAxis, setXAxis] = useState<Dimension>('longevity')
  const [yAxis, setYAxis] = useState<Dimension>('drivingEnjoyment')
  const [expanded, setExpanded] = useState(false)
  const [page, setPage] = useState(0)
  const advancedId = useId()
  const [sort, setSort] = useState('name')
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters(previous => ({ ...previous, [key]: value, ...(key === 'make' ? { model: '' } : {}) }))
    setPage(0)
  }
  const models = options(catalog.filter(car => !filters.make || car.make === filters.make).map(car => car.model))
  const matches = useMemo(() => catalog.filter(car => {
    const query = [car.make, car.model, car.generation, car.variant, car.engineCode, years(car), car.id].join(' ').toLowerCase()
    if (!filters.query.toLowerCase().trim().split(/\s+/).every(word => query.includes(word) || /^\d{4}$/.test(word) && Number(word) >= car.years.from && Number(word) <= car.years.to)) return false
    if (filters.from && car.years.to < Number(filters.from) || filters.to && car.years.from > Number(filters.to)) return false
    if (filters.pedal && (car.hasClutchPedal === null ? 'Unknown' : car.hasClutchPedal ? 'Yes' : 'No') !== filters.pedal) return false
    if (filters.tag && !car.aestheticsTags.includes(filters.tag)) return false
    for (const field of ['make', 'model', 'transmission', 'engineLocation', 'cylinderLayout', 'drivetrain', 'category'] as const) {
      if (filters[field] && (car[field] ?? 'Unknown') !== filters[field]) return false
    }
    return dimensions.every(key => {
      const score = car.scores[key]
      if (score.value === null) return filters.unknown || (!filters[key] && !filters.confidence)
      if (filters.confidence && confidence.indexOf(score.confidence) < confidence.indexOf(filters.confidence as typeof confidence[number])) return false
      if (!filters[key]) return true
      return score.value >= Number(filters[key])
    })
  }).sort((a, b) => {
    if (sort === 'year') return b.years.from - a.years.from || name(a).localeCompare(name(b))
    if (sort !== 'name') {
      const key = sort as keyof Summary['scores']
      return (b.scores[key].value ?? -1) - (a.scores[key].value ?? -1) || name(a).localeCompare(name(b))
    }
    return name(a).localeCompare(name(b), 'en', { numeric: true }) || a.years.from - b.years.from
  }), [filters, sort])
  const plotted = matches.filter(car => !missingAxes(car, xAxis, yAxis).length)
  const compactCount = Number(Boolean(filters.model)) + Number(Boolean(filters.category))
  const moreCount = Object.entries(filters).filter(([key, value]) => !['query', 'make', 'model', 'transmission', 'category', 'unknown'].includes(key) && value).length + Number(!filters.unknown)
  const select = (key: keyof Omit<Filters, 'unknown'>, label: string, values: string[], empty = 'Any', className = '') => <label className={'field ' + className} key={key}>
    <span>{label}</span><select value={filters[key]} onChange={event => set(key, event.target.value)}>
      <option value="">{empty}</option>{values.map(value => <option key={value}>{value}</option>)}
    </select>
  </label>
  const number = (key: keyof Omit<Filters, 'unknown'>, label: string, year = false) => <label className="field" key={key}>
    <span>{label}</span><input type="number" min={year ? 1886 : 0} max={year ? 2100 : 100} placeholder={year ? 'Any year' : 'Any score'} value={filters[key]} onChange={event => set(key, event.target.value)} />
  </label>
  const visible = matches.slice(page * 16, page * 16 + 16)
  const profile = (event: React.MouseEvent, id: string) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    navigate(carPath(id))
  }
  return <main id={mainId} className="shell explorer">
    <section className="intro">
      <div className="intro-copy">
        <h1><span><b>Car</b></span>{' '}<span><b>Explorer</b></span></h1>
        <p>Discover {catalog.length} vehicle configurations by how they drive, age, look and cost to keep.</p>
        <a className="explore-link" href="#explore">Explore the catalog <span aria-hidden="true">↓</span></a>
      </div>
      <figure className="intro-photo">
        <a className="feature-image" href={carPath('toy-mr2-aw-na1')} aria-label="Explore the Toyota MR2 AW11" onClick={event => profile(event, 'toy-mr2-aw-na1')}>
          <img src="/images/aw11-red.webp" width="1480" height="821" fetchPriority="high" alt="Red 1987 Toyota MR2 T-Bar viewed from above and in front" />
        </a>
        <figcaption>
          <a className="feature-name" href={carPath('toy-mr2-aw-na1')} onClick={event => profile(event, 'toy-mr2-aw-na1')}>1987 Toyota MR2 <span>AW11 ↗</span></a>
          <span className="photo-credit"><a href="https://commons.wikimedia.org/wiki/File:1987_Toyota_MR2_T-Bar_AW11_red.jpg">Mr.choppers</a> / <a href="https://creativecommons.org/licenses/by-sa/3.0/">CC BY-SA 3.0</a> / resized, framed</span>
        </figcaption>
      </figure>
    </section>
    <section className="filters" id="explore" aria-label="Catalog filters">
      <label className="field search"><span>Search vehicles</span><input type="search" placeholder="Try MR2, S54 or 1993" value={filters.query} onChange={event => set('query', event.target.value)} /></label>
      {select('make', 'Manufacturer', choices.make, 'All manufacturers')}
      {select('model', 'Model', models, 'All models', 'wide-filter')}
      {select('transmission', 'Transmission', choices.transmission)}
      {select('category', 'Category', choices.category, 'Any', 'wide-filter')}
      <div className="filter-actions">
        <button className="button" type="button" aria-expanded={expanded} aria-controls={advancedId} onClick={() => setExpanded(!expanded)}>More filters{moreCount > 0 && <span className="wide-filter">{' (' + moreCount + ')'}</span>}{moreCount + compactCount > 0 && <span className="compact-count">{' (' + (moreCount + compactCount) + ')'}</span>} <span className="filter-sign" aria-hidden="true">+</span></button>
        <button className="text-button" onClick={() => { setFilters(initial); setPage(0) }}>Reset</button>
      </div>
      <div className="advanced-panel" id={advancedId} data-expanded={expanded} inert={!expanded}>
        <div className="advanced-clip"><div className="advanced">
        {select('model', 'Model', models, 'All models', 'compact-filter')}
        {select('category', 'Category', choices.category, 'Any', 'compact-filter')}
        {number('from', 'From year', true)}{number('to', 'To year', true)}
        {select('pedal', 'Clutch pedal', ['Yes', 'No', 'Unknown'])}
        {select('engineLocation', 'Engine location', [...choices.engineLocation, 'Unknown'])}
        {select('cylinderLayout', 'Cylinder layout', [...choices.cylinderLayout, 'Unknown'])}
        {select('drivetrain', 'Drivetrain', [...choices.drivetrain, 'Unknown'])}
        {select('tag', 'Aesthetic tag', choices.tag)}
        {number('longevity', 'Minimum longevity')}{number('ownershipCost', 'Minimum low upkeep')}
        {number('drivingEnjoyment', 'Minimum driving enjoyment')}{number('aesthetics', 'Minimum editorial aesthetics')}
        {select('confidence', 'Minimum score confidence', ['low', 'medium', 'high'])}
        <label className="check"><input type="checkbox" checked={filters.unknown} onChange={event => set('unknown', event.target.checked)} /> Keep unrated scores when using score filters</label>
        </div></div>
      </div>
    </section>
    <section aria-label="Vehicle results">
      <div className="result-heading">
        <div><h2>{view === 'map' ? 'Vehicle map' : 'Vehicle catalog'}</h2><p role="status"><strong>{plotted.length} plotted / {matches.length} listed</strong> · {labels[xAxis]} × {labels[yAxis]}</p></div>
        <div className="segmented" aria-label="Result view">
          <button aria-pressed={view === 'map'} onClick={() => setView('map')}>Map</button>
          <button aria-pressed={view === 'list'} onClick={() => setView('list')}>List</button>
        </div>
      </div>
      <p className="provisional-notice"><strong>Provisional research.</strong> Ratings are editorial assessments, not measured population statistics. Unrated means evidence is insufficient or reassessment is pending. AI review is identified separately from human review. Low upkeep excludes fuel, insurance, purchase, financing, depreciation and taxes.</p>
      {view === 'map' && <>
        <div className="axis-controls">
          <label className="field"><span>Horizontal axis · higher to the right</span><select aria-label="Horizontal axis" value={xAxis} onChange={event => { const key = event.target.value as Dimension; if (key === yAxis) setYAxis(xAxis); setXAxis(key) }}>{dimensions.map(key => <option value={key} key={key}>{labels[key]}</option>)}</select></label>
          <label className="field"><span>Vertical axis · higher upward</span><select aria-label="Vertical axis" value={yAxis} onChange={event => { const key = event.target.value as Dimension; if (key === xAxis) setXAxis(yAxis); setYAxis(key) }}>{dimensions.map(key => <option value={key} key={key}>{labels[key]}</option>)}</select></label>
          {!plotted.length && <button className="text-button" onClick={() => { setXAxis('aesthetics'); setYAxis('drivingEnjoyment') }}>Explore assessed driving and design</button>}
        </div>
        <Scatter cars={plotted} selected={selected} xAxis={xAxis} yAxis={yAxis} onOpen={id => navigate(carPath(id))} />
        {matches.length > plotted.length && <p className="chart-note">{matches.length - plotted.length} matching vehicles lack a selected axis assessment. <a href="#catalog-results">See reasons in the list.</a></p>}
      </>}
      <div className="table-heading" id="catalog-results">
        {view === 'map' && <h2>Matching vehicles</h2>}
        <label className="field sort"><span>Sort by</span><select value={sort} onChange={event => { setSort(event.target.value); setPage(0) }}>
          <option value="name">Manufacturer and model</option><option value="year">Newest model year</option>
          {dimensions.map(key => <option value={key} key={key}>{labels[key]}</option>)}
        </select></label>
      </div>
      {visible.length ? <div className="table-wrap" role="region" aria-label="Scrollable vehicle results" tabIndex={0}><table className="results-table">
        <thead><tr><th scope="col">Vehicle configuration</th>{dimensions.map(key => <th scope="col" key={key}>{labels[key]}</th>)}<th scope="col">Compare</th></tr></thead>
        <tbody>{visible.map(car => <tr key={car.id}>
          <th scope="row"><a href={carPath(car.id)} onClick={event => profile(event, car.id)}>{name(car)}</a>
            <span>{years(car)} · {car.generation} · {car.variant} · {car.market}</span>
            <span>{car.transmission}{car.identity === 'needs review' ? ' · Identity review pending' : ''}</span>
            <span>{missingAxes(car, xAxis, yAxis).length ? 'Not plotted: ' + missingAxes(car, xAxis, yAxis).map(key => labels[key]).join(' and ') + ' unrated' : 'Plotted on selected axes'}</span>
          </th>
          {dimensions.map(key => <td key={key} data-label={labels[key]}>
            <strong className={car.scores[key].value === null ? 'unrated' : undefined}>{car.scores[key].value ?? 'Unrated'}</strong><span>{reviewLabels[car.scores[key].reviewStatus]}</span>
          </td>)}
          <td data-label="Compare"><label className="check"><input type="checkbox" aria-label={'Compare ' + name(car) + ' ' + car.variant} checked={selected.includes(car.id)} disabled={selected.length >= 4 && !selected.includes(car.id)} onChange={() => toggle(car.id)} /></label></td>
        </tr>)}</tbody>
      </table></div> : <p className="empty">No configurations match these filters.</p>}
      {matches.length > 16 && <div className="pagination">
        <button className="button" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
        <span>{page * 16 + 1}–{Math.min((page + 1) * 16, matches.length)} of {matches.length}</span>
        <button className="button" disabled={(page + 1) * 16 >= matches.length} onClick={() => setPage(page + 1)}>Next</button>
      </div>}
    </section>
  </main>
}
