// Run after browser-checks.js for local preview, or navigate to the production
// home page first to check the deployed site with the same assertions.
async (page) => {
  const base = page.url().startsWith('https://car-universe.pages.dev') ? 'https://car-universe.pages.dev' : 'http://127.0.0.1:4173'
  const assertions = [], errors = []
  const check = (ok, label) => { if (!ok) throw new Error(label); assertions.push(label) }
  page.on('pageerror', e => errors.push(e.message))
  async function profile(id) {
    const response = await page.goto(base + '/vehicle/' + id)
    check(response.status() === 200, id + ' deep link loads')
    await page.getByRole('heading', { name: 'Inspected evidence', exact: true }).waitFor()
  }
  await page.setViewportSize({ width: 1280, height: 900 })
  await profile('hon-s2k-ap1')
  const coverage = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Comparable review coverage', exact: true }) })
  const text = await coverage.innerText()
  check(text.includes('$330.75') && text.includes('$157.50') && text.includes('$173.25'), 'documented parts total and individual options render')
  check(text.includes('Excludes labor') && text.includes('Not an installed quote, annual cost'), 'parts basket exclusions remain visible')
  check(text.includes('incidence unknown'), 'mechanism does not invent incidence')
  check((await page.locator('.score-grid article').filter({ has: page.getByRole('heading', { name: 'Low upkeep', exact: true }) }).innerText()).includes('Unrated'), 'parts basket does not fill the upkeep score')
  check(await page.locator('#source-s2k-ap2-retainer-parts a').getAttribute('href') === 'https://www.scienceofspeed.com/ap2-retainer-valve-spring-set-of-16-s2000-2000-09.html', 'priced parts retain the source link')
  await coverage.screenshot({ path: 'output/playwright/research-parts-desktop.png' })
  await page.setViewportSize({ width: 390, height: 844 })
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'updated mobile profile has no horizontal overflow')
  await coverage.screenshot({ path: 'output/playwright/research-parts-mobile.png' })
  await profile('toy-cam-xv50')
  check((await page.locator('#evidence-camry-ze5-shudder').innerText()).includes('2012–2014'), 'Camry mechanism keeps its limited years')
  check((await page.locator('#evidence-camry-ze5-shudder').innerText()).includes('warranty operation lists 5.1 hours'), 'warranty labor retains its scope')
  await profile('che-cam-f5-ls3')
  check((await page.locator('#evidence-submitted-clutch-coverage-rejected').innerText()).includes('Applicability: unresolved'), 'wrong-model bulletin is visibly unresolved')
  check((await page.locator('#evidence-submitted-clutch-coverage-rejected').innerText()).includes('Corvette, not this Camaro'), 'rejected applicability is explicit')
  await profile('hon-fit-ge')
  check((await page.locator('#evidence-fit-driveshaft-corrosion').innerText()).includes('salt-belt'), 'Fit exposure retains geographic limits')
  await profile('maz-mx5-nd2')
  check((await page.locator('#evidence-nd-airbag-software').innerText()).includes('VIN-specific') || (await page.locator('#evidence-nd-airbag-software').innerText()).includes('vehicle-specific'), 'ND2 recall status is vehicle-specific')
  check(errors.length === 0, 'no uncaught errors in updated profiles')
  return { base, passed: assertions.length, assertions, errors }
}
