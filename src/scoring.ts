import type { Dimension, Score } from './schema'

export const labels: Record<Dimension, string> = {
  longevity: 'Longevity', ownershipCost: 'Low upkeep', drivingEnjoyment: 'Driving enjoyment', aesthetics: 'Editorial aesthetics'
}
export const reviewLabels: Record<Score['reviewStatus'], string> = {
  'not-reviewed': 'Reassessment pending', 'ai-reviewed': 'AI reviewed · human review pending', 'human-reviewed': 'Human reviewed'
}
export const scoreText = (value: number | null) => value === null ? 'Unrated' : String(value)
// Compatibility: ownershipCost remains the storage key. Only bubble AREA inverts it.
export const mechanicalBurden = (upkeep: number | null) => upkeep === null ? null : 100 - upkeep
export const tasteKey = 'car-universe:my-taste:v1'
export function parseTaste(raw: string | null): Record<string, number> {
  try {
    const value: unknown = JSON.parse(raw ?? '{}')
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    return Object.fromEntries(Object.entries(value).filter(([, n]) => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 100))
  } catch { return {} }
}
