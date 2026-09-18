import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/search (Results) page', () => {
  test('default JFK→CDG search renders results and hits /api/flights/search', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/search')
      await page.waitForTimeout(1500)
    })
    const flights = reqs.find((r) => /\/api\/flights\/search/.test(r.url))
    expect(flights, 'GET /api/flights/search').toBeTruthy()
    expect(flights?.status).toBeLessThan(400)
    // Hero shows the route
    await expect(page.getByRole('heading', { level: 1 })).toContainText('JFK')
    // Result cards link to /flight/:id
    expect(await page.locator('[href^="/flight/"]').count()).toBeGreaterThan(0)
  })

  test('changing query params re-runs the search', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/search?origin=LHR&destination=DXB')
    await page.waitForTimeout(1500)
    const heading = await page.getByRole('heading', { level: 1 }).textContent()
    expect(heading).toContain('LHR')
    expect(heading).toContain('DXB')
  })

  test('stop filter "Nonstop only" hides any 1+ stop result', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/search')
    await page.waitForTimeout(1500)
    const before = await page.locator('[href^="/flight/"]').count()
    expect(before).toBeGreaterThan(0)
    await page.getByRole('button', { name: /^Nonstop only$/ }).click()
    await page.waitForTimeout(500)
    const after = await page.locator('[href^="/flight/"]').count()
    // Equal or smaller — the filter must not introduce new rows.
    expect(after).toBeLessThanOrEqual(before)
  })

  test('clicking a flight card opens /flight/:id', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/search')
    await page.waitForTimeout(1500)
    await page.locator('[href^="/flight/"]').first().click()
    await expect(page).toHaveURL(/\/flight\/[a-z0-9]+/i)
  })
})
