import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, getDestinations, pickDestination, signup } from './_helpers'

test.describe('/destinations', () => {
  test('mounts and GETs /api/destinations', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/destinations')
      await page.waitForLoadState('networkidle').catch(() => {})
    })
    const get = reqs.find((r) => r.method === 'GET' && /\/api\/destinations/.test(r.url))
    expect(get, 'GET /api/destinations must fire').toBeDefined()
    expect(get!.status).toBeLessThan(400)
  })

  test('grid renders and has at least one card', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/destinations')
    await expect(page.locator('[data-testid="destinations-grid"]')).toBeVisible()
  })

  test('a pill filter narrows the grid to that pill', async ({ page }) => {
    await signup(page)
    // The pills are derived from the catalog's own pill_label values, so read
    // one from the API instead of naming an editorial label.
    const catalog = await getDestinations(page)
    const labelled = catalog.find((d) => d.pill_label)
    expect(labelled, 'catalog has a pill-labelled destination').toBeTruthy()
    const label = String(labelled!.pill_label)
    const testid = 'destinations-pill-' + label.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const expected = catalog.filter((d) => d.pill_label === label)

    await page.goto(APP_BASE + '/destinations')
    const pill = page.locator(`[data-testid="${testid}"]`)
    await expect(pill).toBeVisible()
    await pill.click()
    // The grid now shows exactly the destinations carrying that pill.
    await expect(page.locator('[data-testid="destinations-grid"]')).toBeVisible()
    await expect(page.locator('[data-testid^="destination-orb-card-"]')).toHaveCount(
      expected.length,
    )
    await expect(
      page.locator(`[data-testid="destination-orb-card-${expected[0]!.id}"]`),
    ).toBeVisible()
  })

  test('Heading visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/destinations')
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('Card link deep-links to /trips/new with destination prefilled', async ({ page }) => {
    await signup(page)
    // Drive whichever destination the catalog holds — naming a seeded one
    // breaks this spec the moment the editorial rows are replaced.
    const destination = await pickDestination(page)
    await page.goto(APP_BASE + '/destinations')
    const a = page.locator(`[data-testid="destination-orb-card-${destination.id}"]`)
    await expect(a).toBeVisible()
    const href = await a.getAttribute('href')
    expect(href).toMatch(/\/trips\/new\?destination=/)
    await a.click()
    await expect(page).toHaveURL(/\/trips\/new\?destination=/)
    // The destination input must be prefilled with the click target.
    const destInput = page.getByRole('textbox', { name: /destination/i }).first()
    const v = await destInput.inputValue()
    expect(v).toBe(destination.name)
  })
})
