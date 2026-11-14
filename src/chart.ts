import type { Dimension } from './schema'
import { mechanicalBurden } from './scoring'

export const plot = { left: 62, top: 36, size: 500, viewSize: 620, split: 50 } as const
export type Plottable = { id: string; scores: Record<Dimension, { value: number | null }> }
export function missingAxes(car: Plottable, x: Dimension, y: Dimension) {
  return [x, y].filter(key => car.scores[key].value === null)
}
export function coordinates(car: Plottable, x: Dimension, y: Dimension) {
  if (missingAxes(car, x, y).length) return null
  return { x: plot.left + car.scores[x].value! * plot.size / 100, y: plot.top + (100 - car.scores[y].value!) * plot.size / 100 }
}
export function groupPositions<T extends Plottable>(cars: T[], x: Dimension, y: Dimension) {
  const groups = new Map<string, { x: number; y: number; cars: T[] }>()
  for (const car of cars) {
    const position = coordinates(car, x, y)
    if (!position) continue
    const key = position.x + ':' + position.y
    const group = groups.get(key) ?? { ...position, cars: [] }
    group.cars.push(car)
    groups.set(key, group)
  }
  return [...groups.values()]
}
export function markerRadius(upkeep: number | null) {
  const burden = mechanicalBurden(upkeep)
  return burden === null ? null : Math.sqrt(25 + burden * 2)
}
