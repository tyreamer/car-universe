import { useId, useState } from 'react'
import { carPath, dimensions, labels, name, years } from './data'
import type { Summary } from './data'
import type { Dimension } from './schema'
import { groupPositions, markerRadius, plot } from './chart'
import { reviewLabels, scoreText } from './scoring'

const color = (value: number) => value >= 80 ? '#912720' : value >= 65 ? '#a57569' : value >= 50 ? '#a9a59c' : '#dedbd2'
const regionLabel = { longevity: 'longevity', drivingEnjoyment: 'enjoyment', ownershipCost: 'upkeep score', aesthetics: 'aesthetics' }

export function Scatter({ cars, selected, onOpen, xAxis, yAxis }: {
  cars: Summary[]; selected: string[]; onOpen: (id: string) => void; xAxis: Dimension; yAxis: Dimension
}) {
  const unknownId = useId()
  const [activeIds, setActiveIds] = useState<string[]>([])
  const [inspected, setInspected] = useState<string>()
  const groups = groupPositions(cars, xAxis, yAxis)
  const active = cars.filter(car => activeIds.includes(car.id))
  const readout = active.find(car => car.id === inspected) ?? active[0]
  const middleX = plot.left + plot.size / 2
  const middleY = plot.top + plot.size / 2
  const openGroup = (group: Summary[]) => { setActiveIds(group.map(car => car.id)); setInspected(group[0].id) }
  return <div className="chart-frame">
    <p className="chart-convention">Fixed 0–100 axes · Split at 50 on each axis. The midpoint is a display convention, not a reliability or safety threshold. Higher scores increase rightward and upward.</p>
    <div className="quadrant-body">
      <div className="quadrant-stage">
        <svg className="quadrant-svg" viewBox={`0 0 ${plot.viewSize} ${plot.viewSize}`} aria-label={`${labels[xAxis]} and ${labels[yAxis]} four-quadrant map`} role="group">
          <defs><pattern id={unknownId} width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0 6L6 0" stroke="#77736b" strokeWidth="1" /></pattern></defs>
          <rect data-testid="plot-region" x={plot.left} y={plot.top} width={plot.size} height={plot.size} fill="#faf9f4" stroke="currentColor" />
          {[0, 25, 50, 75, 100].map(value => <g key={value} className="chart-tick">
            {value !== 50 && <><line x1={plot.left + value * 5} x2={plot.left + value * 5} y1={plot.top} y2={plot.top + plot.size} className="quadrant-grid" /><line y1={plot.top + value * 5} y2={plot.top + value * 5} x1={plot.left} x2={plot.left + plot.size} className="quadrant-grid" /></>}
            <text x={plot.left + value * 5} y={plot.top + plot.size + 25} textAnchor="middle">{value}</text>
            <text x={plot.left - 12} y={plot.top + (100 - value) * 5 + 5} textAnchor="end">{value}</text>
          </g>)}
          <g data-testid="quadrant-crosshair" className="quadrant-crosshair">
            <line x1={middleX} x2={middleX} y1={plot.top} y2={plot.top + plot.size} />
            <line y1={middleY} y2={middleY} x1={plot.left} x2={plot.left + plot.size} />
          </g>
          {[['Lower', 'Higher', plot.left + 14, middleY - 46], ['Higher', 'Higher', middleX + 14, middleY - 46], ['Lower', 'Lower', plot.left + 14, plot.top + plot.size - 46], ['Higher', 'Lower', middleX + 14, plot.top + plot.size - 46]].map(([x, y, left, top]) => <text className="quadrant-name" key={String(x) + y} x={Number(left)} y={Number(top)}>
            <tspan x={Number(left)}>{y} {regionLabel[yAxis]}</tspan><tspan x={Number(left)} dy="28">{x} {regionLabel[xAxis]}</tspan>
          </text>)}
          <text x={middleX} y={plot.top + plot.size + 60} textAnchor="middle" className="quadrant-axis">{labels[xAxis]} →</text>
          <text transform={`translate(18 ${middleY}) rotate(-90)`} textAnchor="middle" className="quadrant-axis">{labels[yAxis]} →</text>
          {groups.map(group => {
            const car = group.cars[0], grouped = group.cars.length > 1
            const radius = markerRadius(car.scores.ownershipCost.value)
            const aesthetic = car.scores.aesthetics.value
            const label = grouped ? `${group.cars.length} cars at ${labels[xAxis]} ${car.scores[xAxis].value}, ${labels[yAxis]} ${car.scores[yAxis].value}. Select to list.` : `${name(car)} ${years(car)}, ${labels[xAxis]} ${car.scores[xAxis].value}, ${labels[yAxis]} ${car.scores[yAxis].value}. Select to inspect.`
            return <g key={group.x + ':' + group.y} className="quadrant-marker" role="button" tabIndex={0} aria-label={label} aria-pressed={group.cars.some(c => activeIds.includes(c.id))}
              data-car-ids={group.cars.map(c => c.id).join(',')} data-x={car.scores[xAxis].value} data-y={car.scores[yAxis].value}
              onClick={() => openGroup(group.cars)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openGroup(group.cars) } }}>
              <title>{label}</title>
              <circle cx={group.x} cy={group.y} r={22} fill="transparent" />
              {grouped ? <><circle className="group-circle" cx={group.x} cy={group.y} r="17" fill="#faf9f4" /><text x={group.x} y={group.y + 5} textAnchor="middle" className="group-count">{group.cars.length}</text></>
                : radius === null ? <path className="unknown-size" d={`M ${group.x} ${group.y - 11} l 11 11 l -11 11 l -11 -11 Z`} fill={aesthetic === null ? `url(#${unknownId})` : color(aesthetic)} />
                  : <circle cx={group.x} cy={group.y} r={radius} fill={aesthetic === null ? `url(#${unknownId})` : color(aesthetic)} />}
              {group.cars.some(c => selected.includes(c.id)) && <circle className="comparison-ring" cx={group.x} cy={group.y} r="21" fill="none" />}
            </g>
          })}
        </svg>
        {!cars.length && <p className="empty-map">No matching cars have both selected axis assessments. Unknown is not a low rating.</p>}
      </div>
      <aside className="quadrant-inspect" aria-label="Selected car details" aria-live="polite">
        <h3>{active.length > 1 ? `${active.length} cars at this position` : 'Inspect a car'}</h3>
        {active.length > 1 && <ul className="overlap-list">{active.map(car => <li key={car.id}><button className="text-button" aria-pressed={readout?.id === car.id} onClick={() => setInspected(car.id)}>{name(car)} · {years(car)} · {car.variant}</button></li>)}</ul>}
        {readout ? <div className="car-readout">
          <a href={carPath(readout.id)} onClick={event => { if (!(event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)) { event.preventDefault(); onOpen(readout.id) } }}>{name(readout)} ↗</a>
          <p>{years(readout)} · {readout.variant}</p>
          <dl>{dimensions.map(key => <div key={key}><dt>{labels[key]}</dt><dd><strong>{scoreText(readout.scores[key].value)}</strong><small>{readout.scores[key].assessmentType}<br />{readout.scores[key].confidence} confidence<br />{reviewLabels[readout.scores[key].reviewStatus]}</small></dd></div>)}</dl>
        </div> : <p>Click a marker, or focus it with Tab and press Enter. Numbers inside rings open an overlap list; every car keeps its actual coordinates.</p>}
        <div className="map-legend"><h3>Two axes, four dimensions</h3>
          <p>Circle size: mechanical burden. <strong>Larger means more burden.</strong> All numeric readouts show Low upkeep, where higher is better.</p>
          <p>Diamond: upkeep unknown. Hatched fill: editorial aesthetics unknown. Numbered ring: shared coordinates; size and color are not aggregated.</p>
          <p>Fill: Editorial aesthetics. <span className="color-key"><i style={{ background: color(30) }} />0–49 <i style={{ background: color(50) }} />50–64 <i style={{ background: color(65) }} />65–79 <i style={{ background: color(80) }} />80–100</span></p>
          <p>On the crosshair means exactly 50. Region names describe the axes relative to that split, not the whole car.</p>
        </div>
      </aside>
    </div>
  </div>
}
