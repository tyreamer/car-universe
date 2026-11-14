import raw from './generated/index.json'
import type { Dimension, EpaRow, Score, Source, Vehicle } from './schema'
export type Summary = Omit<(typeof raw.vehicles)[number], 'scores' | 'aestheticsTags'> & {
  aestheticsTags: string[]
  scores: Record<Dimension, Pick<Score, 'value' | 'confidence' | 'assessmentType' | 'reviewStatus'>>
}
export type Profile = { vehicle: Vehicle; sources: Source[]; epa: EpaRow[] }
export const catalog = raw.vehicles as unknown as Summary[]
export const coverage = raw.coverage
export const byId = new Map(catalog.map(car => [car.id, car]))
export const dimensions = ['longevity', 'ownershipCost', 'drivingEnjoyment', 'aesthetics'] as const
export const confidence = ['unrated', 'low', 'medium', 'high'] as const
export { labels } from './scoring'
const files = import.meta.glob<string>('./generated/vehicles/*.json', { query: '?url', import: 'default', eager: true })
export async function loadProfile(id: string, signal: AbortSignal): Promise<Profile> {
  const url = files['./generated/vehicles/' + id + '.json']
  if (!url) throw new Error('Vehicle profile unavailable.')
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error('Vehicle profile could not be loaded.')
  return response.json()
}
export const years = (car: { years: { from: number; to: number } }) =>
  car.years.from === car.years.to ? String(car.years.from) : car.years.from + '–' + car.years.to
export const name = (car: { make: string; model: string }) => car.make + ' ' + car.model
export const marketName = (market: string) => market === 'US' ? 'United States' : market === 'UK' ? 'United Kingdom' : market
export const carPath = (id: string) => '/vehicle/' + id
