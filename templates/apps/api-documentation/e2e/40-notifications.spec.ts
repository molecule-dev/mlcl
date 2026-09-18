import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers'

// /notifications — fetches /api/notifications. Empty DB shows the
// "API silent" empty state; populated DB shows feed.

test.describe('/notifications', () => {
  test('GET /api/notifications fires + heading visible', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/notifications')
      await page.getByRole('heading', { name: /^Notifications$/i }).waitFor({ timeout: 15_000 })
    })
    const call = reqs.find((r) => /\/api\/notifications(\?|$)/.test(r.url) && r.method === 'GET')
    expect(call, 'GET /api/notifications should fire').toBeTruthy()
    expect(call!.status).toBe(200)
  })

  test('eyebrow API_FEED visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByText(/API_FEED/i).first()).toBeVisible({ timeout: 15_000 })
  })

  test('empty state OR feed list resolves — never hangs on spinner', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await page.getByRole('heading', { name: /^Notifications$/i }).waitFor({ timeout: 15_000 })
    await expect(page.getByText(/^loading…$/i)).not.toBeVisible({ timeout: 15_000 })
    const eitherShown = await page
      .getByText(/API silent|breaking|incident|release|rate.?limit/i)
      .first()
      .isVisible()
      .catch(() => false)
    expect(eitherShown, 'either empty state or notification rows must be visible').toBeTruthy()
  })
})
