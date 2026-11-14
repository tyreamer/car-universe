import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { byId, coverage } from './data'
import { Explorer } from './Explorer'
import { Comparison, Methodology, VehiclePage } from './Profiles'
import './styles.css'

const storageKey = 'car-universe:comparison:v1'
function initialComparison(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '[]')
    if (!Array.isArray(value)) return []
    return [...new Set(value.filter((id): id is string => typeof id === 'string' && byId.has(id)))].slice(0, 4)
  } catch { return [] }
}

function App() {
  const [path, setPath] = useState(location.pathname.replace(/\/$/, '') || '/')
  const [selected, setSelected] = useState(initialComparison)
  const [navigation, setNavigation] = useState(0)
  useEffect(() => {
    const update = () => { setPath(location.pathname.replace(/\/$/, '') || '/'); setNavigation(value => value + 1) }
    window.addEventListener('popstate', update)
    return () => window.removeEventListener('popstate', update)
  }, [])
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(selected)) } catch { /* Storage can be unavailable in private contexts. */ }
  }, [selected])
  useEffect(() => {
    const vehicle = path.startsWith('/vehicle/') ? byId.get(path.slice(9)) : undefined
    document.title = (vehicle ? vehicle.make + ' ' + vehicle.model : path === '/compare' ? 'Compare vehicles' : path === '/methodology' ? 'Methodology' : 'Vehicle Explorer') + ' | Car Universe'
    if (navigation && !location.hash) {
      window.scrollTo({ top: 0, behavior: 'instant' })
      const main = document.querySelector<HTMLElement>('main#main')
      main?.setAttribute('tabindex', '-1')
      main?.focus({ preventScroll: true })
    }
  }, [path, navigation])
  function navigate(next: string) {
    if (next === path && !location.hash) return
    history.pushState(null, '', next)
    setPath(next)
    setNavigation(value => value + 1)
  }
  const toggle = (id: string) => setSelected(previous => previous.includes(id) ? previous.filter(value => value !== id) : previous.length < 4 && byId.has(id) ? [...previous, id] : previous)
  const link = (event: React.MouseEvent, url: string) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    navigate(url)
  }
  return <>
    <a className="skip" href="#main">Skip to content</a>
    <header className="masthead"><div className="shell mast-inner">
      <a className="wordmark" href="/" onClick={event => link(event, '/')}><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>Car Universe</a>
      <nav aria-label="Primary">
        <a href="/" aria-current={path === '/' ? 'page' : undefined} onClick={event => link(event, '/')}>Explorer</a>
        <a href="/compare" aria-label={selected.length ? 'Compare (' + selected.length + ')' : undefined} aria-current={path === '/compare' ? 'page' : undefined} onClick={event => link(event, '/compare')}>Compare{selected.length > 0 && <span className="compare-count" key={selected.length} aria-hidden="true">{selected.length}</span>}</a>
        <a href="/methodology" aria-current={path === '/methodology' ? 'page' : undefined} onClick={event => link(event, '/methodology')}>Methodology</a>
      </nav>
    </div></header>
    <div hidden={path !== '/'}><Explorer mainId={path === '/' ? 'main' : undefined} selected={selected} toggle={toggle} navigate={navigate} /></div>
    {path.startsWith('/vehicle/') ? <VehiclePage key={path} id={path.slice(9)} selected={selected} toggle={toggle} navigate={navigate} />
      : path === '/compare' ? <Comparison selected={selected} toggle={toggle} navigate={navigate} />
      : path === '/methodology' ? <Methodology />
      : path !== '/' && <main className="shell inner" id="main"><h1>Page unavailable</h1><p><a href="/" onClick={event => link(event, '/')}>Back to Explorer</a></p></main>}
    <footer><div className="shell footer-inner"><strong>Car Universe</strong><span>{coverage.total} configurations · {coverage.sources} sources</span><a href="/methodology" onClick={event => link(event, '/methodology')}>How the scores work</a></div></footer>
  </>
}
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
