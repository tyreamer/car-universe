import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { carPath, labels, name, years } from './data'
import type { Summary } from './data'

const stops = [0, 25, 50, 75, 100]
const palette = [[196, 195, 189], [162, 160, 152], [118, 108, 102], [156, 65, 54], [145, 23, 16]]
const dimensions = ['longevity', 'drivingEnjoyment', 'ownershipCost', 'aesthetics'] as const
const plot = { width: 800, height: 292, left: 64, right: 780, top: 24, bottom: 234 }
const ticks = Array.from({ length: 11 }, (_, index) => index * 10)
const home = { zoom: 1, x: 0, y: 0 }
const motionQuery = '(prefers-reduced-motion: reduce)'
type View = typeof home
type Frame = View & { minX: number; minY: number }

function aestheticsColor(score: number) {
  const start = Math.min(3, Math.floor(score / 25))
  const fraction = (score - stops[start]) / 25
  const channels = palette[start].map((channel, index) => Math.round(channel + (palette[start + 1][index] - channel) * fraction))
  return 'rgb(' + channels.join(', ') + ')'
}

function fit(values: number[], fullScale: boolean) {
  return fullScale || !values.length ? 0 : Math.max(0, Math.min(60, Math.floor(Math.min(...values) / 10) * 10 - 10))
}

function clampPan(view: View): View {
  const x = (plot.right - plot.left) * (view.zoom - 1) / 2
  const y = (plot.bottom - plot.top) * (view.zoom - 1) / 2
  return { ...view, x: Math.max(-x, Math.min(x, view.x)), y: Math.max(-y, Math.min(y, view.y)) }
}

function usePlotMotion(target: Frame, dragging: boolean) {
  const [frame, setFrame] = useState(target)
  const drawn = useRef(frame)
  const animation = useRef(0)
  const { minX, minY, zoom, x, y } = target

  useLayoutEffect(() => {
    const destination = { minX, minY, zoom, x, y }
    const start = drawn.current
    const keys = ['minX', 'minY', 'zoom', 'x', 'y'] as const
    if (keys.every(key => start[key] === destination[key])) return
    const motion = matchMedia(motionQuery)
    const render = (next: Frame) => {
      drawn.current = next
      setFrame(next)
    }
    if (dragging || motion.matches) {
      render(destination)
      return
    }
    const started = performance.now()
    const draw = (now: number) => {
      const elapsed = Math.min(1, (now - started) / 310)
      if (elapsed === 1 || motion.matches) {
        render(destination)
        return
      }
      const progress = 1 - (1 - elapsed) ** 3
      const next = { ...start }
      for (const key of keys) next[key] += (destination[key] - start[key]) * progress
      render(next)
      animation.current = requestAnimationFrame(draw)
    }
    animation.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animation.current)
  }, [minX, minY, zoom, x, y, dragging])
  return frame
}

export function Scatter({ cars, selected, onOpen }: {
  cars: Summary[]; selected: string[]; onOpen: (id: string) => void
}) {
  const [view, setView] = useState(home)
  const [dragging, setDragging] = useState(false)
  const [hovered, setHovered] = useState<string | null>(null)
  const [focused, setFocused] = useState<string | null>(null)
  const [inspected, setInspected] = useState<string | null>(null)
  const [fullScale, setFullScale] = useState(false)
  const [compact, setCompact] = useState(() => matchMedia('(max-width: 600px)').matches)
  const clip = useId()
  const drag = useRef<{ pointer: number; startX: number; startY: number; origin: View } | null>(null)

  useEffect(() => {
    const query = matchMedia('(max-width: 600px)')
    const update = () => setCompact(query.matches)
    query.addEventListener('change', update)
    update()
    return () => query.removeEventListener('change', update)
  }, [])

  const minX = fit(cars.map(car => car.scores.longevity.value!), fullScale)
  const minY = fit(cars.map(car => car.scores.drivingEnjoyment.value!), fullScale)
  const frame = usePlotMotion({ ...view, minX, minY }, dragging)
  const zoom = (factor: number) => setView(current => {
    const next = Math.min(4, Math.max(1, current.zoom * factor))
    if (next === 1) return home
    const ratio = next / current.zoom
    return clampPan({ zoom: next, x: current.x * ratio, y: current.y * ratio })
  })

  const { width, height, left, right, top, bottom } = plot
  const middleX = (left + right) / 2, middleY = (top + bottom) / 2
  const xAt = (value: number) => (left + (right - left) * (value - frame.minX) / (100 - frame.minX) - middleX) * frame.zoom + middleX + frame.x
  const yAt = (value: number) => (bottom - (bottom - top) * (value - frame.minY) / (100 - frame.minY) - middleY) * frame.zoom + middleY + frame.y
  const xTicks = ticks.filter(tick => (minX || tick % 20 === 0) && xAt(tick) >= left - .01 && xAt(tick) <= right + .01)
  const yTicks = ticks.filter(tick => (minY || tick % 20 === 0) && yAt(tick) >= top - .01 && yAt(tick) <= bottom + .01)

  const positions = new Map<string, number>()
  const points = [...cars].sort((a, b) => a.scores.ownershipCost.value! - b.scores.ownershipCost.value!).flatMap(car => {
    const l = car.scores.longevity.value!, d = car.scores.drivingEnjoyment.value!
    const key = l + '/' + d
    const overlap = positions.get(key) ?? 0
    positions.set(key, overlap + 1)
    const angle = overlap * 2.39996
    const radius = Math.sqrt(18 + 1.8 * (100 - car.scores.ownershipCost.value!))
    const offset = (compact ? 21 : 16) * Math.sqrt(overlap)
    const rawX = xAt(l), rawY = yAt(d)
    if (rawX < left - .01 || rawX > right + .01 || rawY < top - .01 || rawY > bottom + .01) return []
    const x = Math.max(left + radius, Math.min(right - radius, rawX + Math.cos(angle) * offset))
    const y = Math.max(top + radius, Math.min(bottom - radius, rawY + Math.sin(angle) * offset))
    return [{ car, l, d, x, y, rawX, rawY, radius }]
  })
  const point = points.find(item => item.car.id === (hovered ?? focused))
  const active = point?.car
  const readout = active ?? cars.find(car => car.id === inspected)

  function keyboardPan(event: KeyboardEvent<SVGSVGElement>) {
    if (event.target !== event.currentTarget || view.zoom === 1) return
    const keys: Record<string, [number, number]> = { ArrowUp: [0, 30], ArrowDown: [0, -30], ArrowLeft: [30, 0], ArrowRight: [-30, 0] }
    const offset = keys[event.key]
    if (!offset) return
    event.preventDefault()
    setView(current => clampPan({ ...current, x: current.x + offset[0], y: current.y + offset[1] }))
  }

  return <div className="scatter">
    <div className="chart-toolbar">
      <div className="legend"><span>Mechanical burden</span><span className="dot small" /> Lower <span className="dot large" /> Higher</div>
      <div className="legend color-legend"><span>Aesthetics</span><span>0</span>{stops.map(stop => <span className="swatch" style={{ backgroundColor: aestheticsColor(stop) }} title={'Aesthetics ' + stop} key={stop} />)}<span>100</span></div>
      <div className="chart-controls">
        <button className="button zoom-button" aria-label="Zoom out" disabled={view.zoom <= 1} onClick={() => zoom(.8)}>−</button>
        <button className="button zoom-button" aria-label="Zoom in" disabled={view.zoom >= 4} onClick={() => zoom(1.25)}>+</button>
        <button className="button" onClick={() => { setFullScale(!fullScale); setView(home) }}>{fullScale ? 'Fit scores' : 'Full scale'}</button>
        <button className="button" disabled={view.zoom === 1} onClick={() => setView(home)}>Reset view</button>
      </div>
    </div>
    <div className="chart-body">
      <div className="chart-stage">
        <p className="mobile-y-label" aria-hidden="true">Driving enjoyment</p>
        <svg className="plot" data-dragging={dragging} viewBox={`0 0 ${width} ${height}`}
          style={{ touchAction: view.zoom > 1 ? 'none' : 'pan-y' }} role="group" tabIndex={0}
          aria-label="Vehicle scatterplot. Tab to inspect a car. Use arrow keys to pan after zooming in."
          onKeyDown={keyboardPan}
          onPointerDown={event => {
            if (event.button !== 0 || (event.target as Element).closest('[data-point]') || view.zoom === 1) return
            event.preventDefault()
            drag.current = { pointer: event.pointerId, startX: event.clientX, startY: event.clientY, origin: frame }
            event.currentTarget.setPointerCapture(event.pointerId)
            setDragging(true)
          }}
          onPointerMove={event => {
            const start = drag.current
            if (!start || start.pointer !== event.pointerId) return
            const scale = event.currentTarget.getScreenCTM()?.a ?? 1
            setView(clampPan({ zoom: start.origin.zoom, x: start.origin.x + (event.clientX - start.startX) / scale, y: start.origin.y + (event.clientY - start.startY) / scale }))
          }}
          onLostPointerCapture={() => { drag.current = null; setDragging(false) }}>
          <defs><clipPath id={clip}><rect x={left} y={top} width={right - left} height={bottom - top} /></clipPath></defs>
          <rect className="plot-fill" x={left} y={top} width={right - left} height={bottom - top} />
          <g className="grid-lines" clipPath={`url(#${clip})`}>
            {xTicks.map(tick => <line key={tick} x1={xAt(tick)} x2={xAt(tick)} y1={top} y2={bottom} />)}
            {yTicks.map(tick => <line key={tick} x1={left} x2={right} y1={yAt(tick)} y2={yAt(tick)} />)}
          </g>
          <path className="axes" d={`M${left} ${top} V${bottom} H${right}`} />
          {xTicks.map(tick => <text key={'x' + tick} x={xAt(tick)} y={bottom + 22} textAnchor="middle">{tick}</text>)}
          {yTicks.map(tick => <text key={'y' + tick} x={left - 11} y={yAt(tick) + 4} textAnchor="end">{tick}</text>)}
          <text x={middleX} y={height - 8} textAnchor="middle" className="axis-label">Longevity</text>
          <text x="19" y={middleY} textAnchor="middle" transform={`rotate(-90 19 ${middleY})`} className="axis-label desktop-y-label">Driving enjoyment</text>
          <g clipPath={`url(#${clip})`}>
            {point && <path key={point.car.id} className="point-guides" d={`M${left} ${point.rawY} H${point.rawX} V${bottom}`} />}
            {points.map(({ car, l, d, x, y, rawX, rawY, radius }, index) => {
              const isActive = active?.id === car.id
              return <g key={car.id} data-point="" data-active={isActive} data-selected={selected.includes(car.id)} role="button" tabIndex={0}
                aria-label={name(car) + ', ' + car.variant + ', longevity ' + l + ', driving enjoyment ' + d}
                onPointerEnter={event => {
                  if (event.pointerType !== 'mouse') return
                  setHovered(car.id)
                  setInspected(car.id)
                }}
                onPointerLeave={() => setHovered(null)} onFocus={() => {
                  setHovered(null)
                  setFocused(car.id)
                  setInspected(car.id)
                }} onBlur={() => setFocused(null)}
                onClick={() => onOpen(car.id)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpen(car.id) } }}>
                {Math.hypot(x - rawX, y - rawY) > 2 && <line className="offset" x1={rawX} x2={x} y1={rawY} y2={y} />}
                <g transform={`translate(${x} ${y})`}>
                  <circle className="point-hit" r={Math.max(radius + 3, compact ? 17 : 11)} />
                  <g className="point-reveal" style={{ animationDelay: Math.min(index, 23) * 13 + 'ms' }}>
                    <circle className="point-ring" r={radius + 3} />
                    <circle className="point-bubble" r={radius} fill={aestheticsColor(car.scores.aesthetics.value!)} />
                  </g>
                </g>
              </g>
            })}
          </g>
        </svg>
        {!cars.length && <p className="plot-empty">No matching vehicles have four rated dimensions.</p>}
      </div>
      <aside className="chart-inspect" aria-label="Chart reading">
        {readout ? <div className="tooltip" key={readout.id}>
          <p className="readout-year">{years(readout)} / {readout.generation}</p>
          <a href={carPath(readout.id)} onClick={event => {
            if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
            event.preventDefault()
            onOpen(readout.id)
          }}>{name(readout)} <span aria-hidden="true">↗</span></a>
          <p>{readout.variant}</p>
          <dl>{dimensions.map(key => <div key={key}>
            <dt>{key === 'ownershipCost' ? 'Mechanical burden' : labels[key]}</dt>
            <dd>{key === 'ownershipCost' ? 100 - readout.scores[key].value! : readout.scores[key].value}</dd>
          </div>)}</dl>
        </div> : <div className="chart-guide">
          <h3>Read the map</h3>
          <p>Hover over a point or focus it with Tab to see its scores. Select a point to open the vehicle.</p>
          <p>Zoom in to pan. Nearby points with identical scores are offset for selection.</p>
        </div>}
      </aside>
    </div>
  </div>
}
