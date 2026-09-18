/**
 * /performance — KPI tiles and the review list.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, captureNetwork, signup } from './_helpers.js'

test.describe('performance page', () => {
  test('renders the review list and initial mount fetches /api/performance', async ({ page }) => {
    const { accessToken } = await signup(page)
    // The reviewed employee is read from the API the page calls — naming a
    // demo employee breaks this once the roster is replaced.
    const res = await page.request.get(`${API_BASE}/performance`, {
      headers: apiHeaders(accessToken),
    })
    const reviews = (await res.json()) as Array<{ employee_name: string }>
    expect(reviews.length, 'the app must hold at least one review').toBeGreaterThan(0)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/performance')
      await expect(page.getByRole('heading', { name: /performance/i, level: 1 })).toBeVisible()
      await expect(page.getByText(reviews[0].employee_name).first()).toBeVisible({
        timeout: 15_000,
      })
    })
    expect(reqs.find((r) => /\/api\/performance/.test(r.url) && r.method === 'GET')).toBeTruthy()
  })

  test('GET /api/performance returns at least one review with a status', async ({ page }) => {
    const { accessToken } = await signup(page)
    const res = await page.request.get(`${API_BASE}/performance`, {
      headers: apiHeaders(accessToken),
    })
    expect(res.status()).toBe(200)
    const reviews = (await res.json()) as Array<{ employee_name: string; status: string }>
    expect(reviews.length).toBeGreaterThan(0)
    expect(reviews.every((r) => typeof r.status === 'string' && r.status.length > 0)).toBe(true)
  })

  test('Status badges are visible on the page', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/performance')
    // At least one of the canonical statuses appears.
    await expect(
      page.getByText(/^\s*(in progress|submitted|complete|closed|open|draft)\s*$/i).first(),
    ).toBeVisible({ timeout: 15_000 })
  })
})
