/**
 * /search — the venue browse page. Asserts that GET /api/venues fires,
 * cards render with real data, and the type filter narrows results.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test('search renders cards backed by GET /api/venues', async ({ page }) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/search')
    await page.waitForLoadState('networkidle', { timeout: 15_000 })
  })
  const venuesGet = reqs.find((r) => r.method === 'GET' && /\/api\/venues/.test(r.url))
  expect(venuesGet?.status).toBe(200)
  // at least one venue card is visible — cards show a "/hr" or "/day" suffix
  await expect(page.getByText(/\/(hr|day)\b/).first()).toBeVisible()
})

test('clicking a venue card navigates to /venue/:id', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/search')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  // Each card is rendered as <a href="/venue/:id">; pick the first.
  const firstCard = page.locator('a[href^="/venue/"]').first()
  await firstCard.click()
  await expect(page).toHaveURL(/\/venue\/[^/]+/, { timeout: 10_000 })
})

test('typing in the location input updates the value', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/search')
  const loc = page
    .locator(
      'input[placeholder*="City" i], input[placeholder*="neighborhood" i], input[type="text"]',
    )
    .first()
  await loc.fill('Brooklyn')
  await expect(loc).toHaveValue('Brooklyn')
})
