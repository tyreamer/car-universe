// Run with a production preview on 4173 and Vite on 5174:
// playwright-cli -s=car-review run-code --filename scripts/browser-checks.js
// Fixture values below are synthetic test data, never written to the catalog.
async (page) => {
  const results = []
  const check = (condition, label) => { if (!condition) throw new Error(label); results.push(label) }
  const errors = []
  const { vehicles } = await (await page.request.get('http://127.0.0.1:5174/src/generated/index.json')).json()
  const count = (x, y) => vehicles.filter(car => car.scores[x].value !== null && car.scores[y].value !== null).length
  const na = vehicles.find(car => car.id === 'maz-mx5-na16')
  const textValue = value => value === null ? 'Unrated' : String(value)
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('http://127.0.0.1:4173')
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.getByRole('heading', { name: 'Vehicle map', exact: true }).waitFor()
  check(await page.getByRole('combobox', { name: 'Horizontal axis', exact: true }).inputValue() === 'longevity', 'default horizontal axis is longevity')
  check(await page.getByRole('combobox', { name: 'Vertical axis', exact: true }).inputValue() === 'drivingEnjoyment', 'default vertical axis is enjoyment')
  async function geometry(target, label) {
    const rect = await target.locator('[data-testid="plot-region"]').boundingBox()
    check(rect && Math.abs(rect.width - rect.height) < 0.75 && rect.width > 200, label + ' plotting region is square')
    check(await target.locator('[data-testid="quadrant-crosshair"] line').count() === 2, label + ' has two crosshair lines')
    const stroke = await target.locator('[data-testid="quadrant-crosshair"]').evaluate(el => getComputedStyle(el).strokeWidth)
    check(parseFloat(stroke) >= 2, label + ' crosshair is prominent')
    check(await target.locator('.quadrant-name').count() === 4, label + ' has four named regions')
  }
  await geometry(page, 'desktop')
  await page.locator('.chart-frame').screenshot({ path: 'output/playwright/quadrant-default-desktop.png' })
  check((await page.locator('.result-heading').innerText()).includes(`${count('longevity', 'drivingEnjoyment')} plotted / ${vehicles.length} listed`), 'default count matches current catalog coverage')
  if (await page.getByRole('button', { name: 'Explore assessed driving and design' }).isVisible()) await page.getByRole('button', { name: 'Explore assessed driving and design' }).click()
  else await page.getByRole('combobox', { name: 'Horizontal axis', exact: true }).selectOption('aesthetics')
  check((await page.locator('.result-heading').innerText()).includes(`${count('aesthetics', 'drivingEnjoyment')} plotted / ${vehicles.length} listed`), 'two-axis count matches catalog without requiring supplementary scores')
  const original = await page.locator('[data-car-ids*="maz-mx5-na16"]').evaluate(el => ({ x: el.getAttribute('data-x'), y: el.getAttribute('data-y') }))
  await page.getByRole('searchbox', { name: 'Search vehicles' }).fill('Miata')
  await page.getByRole('checkbox', { name: 'Compare Mazda MX-5 Miata 1.6 five-speed', exact: true }).check()
  await page.getByRole('checkbox', { name: 'Compare Mazda MX-5 Miata Revised 2.0 six-speed', exact: true }).check()
  await page.getByRole('searchbox', { name: 'Search vehicles' }).fill('maz-mx5-na16')
  const current = await page.locator('[data-car-ids="maz-mx5-na16"]').evaluate(el => ({ x: el.getAttribute('data-x'), y: el.getAttribute('data-y') }))
  check(JSON.stringify(original) === JSON.stringify(current), 'filtering preserves original coordinates')
  const marker = page.locator('[data-car-ids="maz-mx5-na16"]')
  await marker.focus(); await page.keyboard.press('Enter')
  check((await page.locator('.car-readout').innerText()).includes('Low upkeep\n' + textValue(na.scores.ownershipCost.value)), 'selected readout preserves the stored upkeep value or null')
  const reviewLabels = { 'ai-reviewed': 'AI reviewed', 'human-reviewed': 'Human reviewed', 'not-reviewed': 'Not reviewed' }
  check((await page.locator('.car-readout').innerText()).includes(reviewLabels[na.scores.drivingEnjoyment.reviewStatus]), 'selected panel exposes review status')
  check(await page.locator('.car-readout dl > div').count() === 4, 'selected panel exposes four dimensions')
  await page.getByRole('searchbox', { name: 'Search vehicles' }).fill('')
  await page.locator('[data-car-ids*="maz-mx5-na16"]').click()
  const overlapping = vehicles.filter(car => car.scores.aesthetics.value === na.scores.aesthetics.value && car.scores.drivingEnjoyment.value === na.scores.drivingEnjoyment.value).length
  check(await page.locator('.overlap-list button').count() === (overlapping > 1 ? overlapping : 0), 'shared-position list matches actual catalog coordinates')
  await page.locator('.chart-frame').screenshot({ path: 'output/playwright/quadrant-driving-design-desktop.png' })
  await page.setViewportSize({ width: 390, height: 844 })
  await geometry(page, 'mobile')
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'mobile has no page-width overflow')
  await page.locator('.chart-frame').screenshot({ path: 'output/playwright/quadrant-driving-design-mobile.png' })
  await page.getByRole('combobox', { name: 'Horizontal axis', exact: true }).selectOption('ownershipCost')
  check((await page.locator('.quadrant-name').first().textContent()).includes('upkeep score'), 'upkeep regions refer to the higher-is-better score')
  await page.getByRole('combobox', { name: 'Vertical axis', exact: true }).selectOption('ownershipCost')
  check(await page.getByRole('combobox', { name: 'Horizontal axis', exact: true }).inputValue() === 'drivingEnjoyment', 'axis controls swap duplicate dimensions to keep independent coordinates')
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('http://127.0.0.1:4173/vehicle/maz-mx5-na16')
  await page.getByRole('heading', { name: 'Four dimensions' }).waitFor()
  check((await page.locator('.score-grid').innerText()).includes('Low upkeep'), 'profile uses Low upkeep label')
  check((await page.locator('.score-grid').innerText()).includes('Editorial aesthetics'), 'profile labels editorial taste')
  await page.getByRole('spinbutton', { name: 'My taste', exact: true }).fill('12')
  await page.reload()
  check(await page.getByRole('spinbutton', { name: 'My taste', exact: true }).inputValue() === '12', 'My taste persists locally across reload')
  check((await page.locator('.score-grid article').filter({ has: page.getByRole('heading', { name: 'Editorial aesthetics', exact: true }) }).innerText()).includes(textValue(na.scores.aesthetics.value)), 'My taste leaves shared aesthetics unchanged')
  await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: /Compare/ }).click()
  check((await page.locator('.compare-table').innerText()).includes('Low upkeep'), 'comparison uses same upkeep direction label')
  check((await page.locator('.compare-table').innerText()).includes('My taste'), 'comparison separates personal taste')
  await page.reload()
  check(await page.locator('.compare-table thead th').count() === 3, 'comparison selection survives reload')
  await page.goto('http://127.0.0.1:4173/vehicle/toy-mr2-sw-na1')
  await page.getByRole('heading', { name: 'Inspected evidence', exact: true }).waitFor()
  const mr2 = vehicles.find(car => car.id === 'toy-mr2-sw-na1')
  check((await page.locator('.score-grid article').filter({ has: page.getByRole('heading', { name: 'Driving enjoyment', exact: true }) }).innerText()).includes(textValue(mr2.scores.drivingEnjoyment.value)), 'deep-linked naturally aspirated MR2 exposes its current assessment')
  check(errors.length === 0, 'production navigation has no uncaught errors')

  const fixture = await page.context().newPage()
  await fixture.goto('http://127.0.0.1:5174')
  await fixture.evaluate(async () => {
    const reactModule = await import('/node_modules/.vite/deps/react.js')
    const React = reactModule.default ?? reactModule
    const domModule = await import('/node_modules/.vite/deps/react-dom_client.js')
    const { createRoot } = domModule.default ?? domModule
    const { Scatter } = await import('/src/Scatter.tsx')
    document.getElementById('root').style.display = 'none'
    const container = document.createElement('div'); container.className = 'shell'; container.id = 'fixture'; document.body.append(container)
    const make = (id, longevity, drivingEnjoyment, ownershipCost, aesthetics) => ({
      id, make: 'Synthetic', model: id, variant: 'Browser test only', years: { from: 2000, to: 2000 },
      scores: Object.fromEntries(Object.entries({ longevity, drivingEnjoyment, ownershipCost, aesthetics }).map(([key, value]) => [key, { value, confidence: value === null ? 'unrated' : 'low', assessmentType: 'evidence-informed editorial', reviewStatus: 'ai-reviewed' }]))
    })
    createRoot(container).render(React.createElement(Scatter, { cars: [make('unknown-supplement', 0, 80, null, null), make('first-overlap', 50, 50, 80, 20), make('second-overlap', 50, 50, 20, 90), make('burden-high', 100, 0, 0, null)], selected: [], onOpen: () => {}, xAxis: 'longevity', yAxis: 'drivingEnjoyment' }))
  })
  await fixture.locator('#fixture .quadrant-marker').first().waitFor()
  check(await fixture.locator('#fixture .quadrant-marker').count() === 3, 'synthetic overlap is one marker at true coordinates')
  const unknown = fixture.locator('[data-car-ids="unknown-supplement"]')
  check(await unknown.locator('.unknown-size').count() === 1, 'unknown upkeep uses diamond')
  check((await unknown.locator('.unknown-size').getAttribute('fill')).includes('url('), 'unknown aesthetics uses hatching')
  const group = fixture.locator('[data-car-ids="first-overlap,second-overlap"]')
  check(await group.locator('.group-circle').getAttribute('cx') === '312' && await group.locator('.group-circle').getAttribute('cy') === '286', 'group center equals raw 50/50 coordinates')
  await group.focus(); await fixture.keyboard.press('Space')
  check((await fixture.locator('.car-readout dl > div').filter({ hasText: 'Low upkeep' }).innerText()).includes('80'), 'chart readout shows upkeep 80, not burden 20')
  await fixture.locator('.overlap-list button').nth(1).click()
  check((await fixture.locator('.car-readout dl > div').filter({ hasText: 'Low upkeep' }).innerText()).includes('20'), 'overlap list shows each car without averaging')
  await fixture.setViewportSize({ width: 320, height: 800 })
  await geometry(fixture.locator('#fixture'), '320px fixture')
  await fixture.close()
  return { passed: results.length, results, errors }
}
