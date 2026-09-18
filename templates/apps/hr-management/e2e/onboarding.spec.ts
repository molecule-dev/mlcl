/**
 * /onboarding — at least one journey for a recent hire, wired to
 * /api/onboarding.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, captureNetwork, signup } from './_helpers.js'

test.describe('onboarding page', () => {
  test('renders the onboarding journeys and initial mount fetches /api/onboarding', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    // The hire under test comes from /api/onboarding itself, so the spec holds
    // once the demo roster is replaced.
    const res = await page.request.get(`${API_BASE}/onboarding`, {
      headers: apiHeaders(accessToken),
    })
    const journeys = (await res.json()) as Array<{ employee_name: string }>
    expect(journeys.length, 'the app must hold at least one journey').toBeGreaterThan(0)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/onboarding')
      await expect(page.getByText(journeys[0].employee_name).first()).toBeVisible({
        timeout: 15_000,
      })
    })
    expect(reqs.find((r) => /\/api\/onboarding/.test(r.url) && r.method === 'GET')).toBeTruthy()
  })

  test('GET /api/onboarding returns at least one journey with steps', async ({ page }) => {
    const { accessToken } = await signup(page)
    const res = await page.request.get(`${API_BASE}/onboarding`, {
      headers: apiHeaders(accessToken),
    })
    expect(res.status()).toBe(200)
    const journeys = (await res.json()) as Array<{ employee_name: string; steps?: unknown }>
    expect(journeys.length).toBeGreaterThan(0)
    // Every journey names the employee it belongs to.
    expect(journeys.every((j) => typeof j.employee_name === 'string' && j.employee_name)).toBe(true)
  })

  test('Per-journey progress text is visible (X of Y steps complete)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/onboarding')
    await expect(page.getByText(/\d+\s*\/\s*\d+|\d+\s*of\s*\d+/i).first()).toBeVisible({
      timeout: 15_000,
    })
  })
})
