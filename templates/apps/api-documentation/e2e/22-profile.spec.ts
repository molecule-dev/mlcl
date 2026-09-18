import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers'

// /profile — read-only profile snapshot. Fetches /api/profile and shows
// PROFILE eyebrow + heading + API_USAGE_30D card. Editing happens on
// /settings (Account section).

test.describe('/profile', () => {
  test('GET /api/profile fires + heading visible', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/profile')
      await page.getByRole('heading', { name: /Developer profile/i }).waitFor({ timeout: 15_000 })
    })
    const call = reqs.find((r) => /\/api\/profile(\?|$)/.test(r.url) && r.method === 'GET')
    expect(call, 'GET /api/profile should fire').toBeTruthy()
    expect(call!.status).toBe(200)
  })

  test('PROFILE eyebrow visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    await expect(page.getByText(/^PROFILE$/).first()).toBeVisible({ timeout: 15_000 })
  })

  test('API_USAGE_30D card visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    await expect(page.getByText(/API_USAGE_30D/i)).toBeVisible({ timeout: 15_000 })
  })
})
