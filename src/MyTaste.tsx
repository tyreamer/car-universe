import { useState } from 'react'
import { parseTaste, tasteKey } from './scoring'

export function readTaste() {
  try { return parseTaste(localStorage.getItem(tasteKey)) } catch { return {} }
}
export function MyTaste({ id }: { id: string }) {
  const [value, setValue] = useState<number | null>(() => readTaste()[id] ?? null)
  const [error, setError] = useState('')
  function save(next: string) {
    if (next !== '' && (!Number.isInteger(Number(next)) || Number(next) < 0 || Number(next) > 100)) { setError('Choose a whole number from 0 to 100.'); return }
    const rating = next === '' ? null : Number(next)
    setValue(rating)
    try {
      const values = readTaste()
      if (rating === null) delete values[id]
      else values[id] = rating
      localStorage.setItem(tasteKey, JSON.stringify(values))
      setError('')
    } catch { setError('Browser storage is unavailable; this value will not survive a reload.') }
  }
  return <div className="taste-control">
    <label>My taste · local aesthetics override <input aria-label="My taste" type="number" min="0" max="100" step="1" value={value ?? ''} placeholder="Unrated" onChange={event => save(event.target.value)} /></label>
    <button className="text-button" onClick={() => save('')}>Clear My taste</button>
    <p>{value === null ? 'No personal rating set.' : `Your aesthetics rating: ${value} / 100.`} Saved only in this browser and shown separately in comparison. Shared catalog scores and map coordinates remain editorial.</p>
    {error && <p role="status">{error}</p>}
  </div>
}
