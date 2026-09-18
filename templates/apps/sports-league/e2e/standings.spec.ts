import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, getStandings, signup } from './_helpers.js'

test('Standings page lists the rows the API returns (not just the FALLBACK)', async ({ page }) => {
  await signup(page)
  // Read the standings from the API first: the page has a static FALLBACK set,
  // so rendering exactly what the API returned — every row, in that count — is
  // what proves the API → state wiring, on any league.
  const rows = await getStandings(page.request)
  await page.goto(APP_BASE + '/standings')
  await expect(page.getByRole('heading', { name: /league standings/i })).toBeVisible({
    timeout: 15_000,
  })
  await expect
    .poll(async () => page.locator('tbody tr').count(), { timeout: 15_000 })
    .toBe(rows.length)
  await expect(page.getByText(rows[rows.length - 1].name).first()).toBeVisible({ timeout: 15_000 })
})

test('Standings rows are sorted by points desc (API leader on top)', async ({ page }) => {
  await signup(page)
  const rows = await getStandings(page.request)
  await page.goto(APP_BASE + '/standings')
  const firstRow = page.locator('tbody tr').first()
  await expect(firstRow).toContainText(rows[0].name, { timeout: 15_000 })
})

test('observation invariant: /standings fires GET /api/standings', async ({ page }) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/standings')
    await page.waitForLoadState('networkidle').catch(() => {})
  })
  expect(reqs.find((r) => /\/api\/standings/.test(r.url) && r.method === 'GET')).toBeTruthy()
})
