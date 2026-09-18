/**
 * Profile page: shows the signed-in user; PUT /api/profile/me persists name
 * across reload.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, authHeaders, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('/profile', () => {
  test('renders the profile page after signup', async ({ page }) => {
    await signup(page, uniqueEmail('prof-render'))
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/profile')
      await page.waitForLoadState('networkidle')
    })
    await expect(page.locator('[data-mol-id="page-profile"]').first()).toBeVisible()
    expect(reqs.some((r) => /\/api\/(profile|onboardings)/.test(r.url))).toBe(true)
  })

  test('PUT /api/profile/me persists name across reload', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('prof-persist'))
    const newName = 'Renamed-' + Date.now()
    const put = await page.request.put(`${API_BASE}/profile/me`, {
      headers: authHeaders(accessToken),
      data: { name: newName },
      failOnStatusCode: false,
    })
    expect(put.status()).toBeLessThan(400)
    const get = await page.request.get(`${API_BASE}/profile/me`, {
      headers: authHeaders(accessToken),
    })
    const body = (await get.json()) as { user?: { name?: string }; name?: string }
    const persisted = body?.user?.name ?? body?.name ?? ''
    expect(persisted).toBe(newName)
  })

  test('back-to-dashboard link works', async ({ page }) => {
    await signup(page, uniqueEmail('prof-nav'))
    await page.goto(APP_BASE + '/profile')
    await page.waitForLoadState('networkidle')
    const back = page.locator('a[href="/dashboard"]').first()
    if (await back.count()) {
      await back.click()
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 })
    }
  })
})
