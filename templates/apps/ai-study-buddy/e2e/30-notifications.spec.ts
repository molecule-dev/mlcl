/**
 * /notifications — authenticated notification feed. Verifies the page
 * renders, the GET /api/notifications call is made, the empty state
 * appears for fresh users, and the page is auth-gated.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, captureNetwork, signup } from './_helpers.js'

test('/notifications renders page-notifications container after auth', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/notifications')
  await expect(page.locator('[data-mol-id="page-notifications"]')).toBeVisible()
})

test('/notifications fetches /api/notifications on mount', async ({ page }) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/notifications')
    await expect(page.locator('[data-mol-id="page-notifications"]')).toBeVisible()
  })
  expect(reqs.find((r) => /\/api\/notifications/.test(r.url) && r.method === 'GET')?.status).toBe(
    200,
  )
})

test('/notifications fresh user sees the empty state', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/notifications')
  // either rows render OR the empty-state placeholder. For a brand-new
  // user there are no notifications, so the empty-state must show up.
  await expect(page.locator('[data-mol-id="notifications-empty"]')).toBeVisible({ timeout: 10_000 })
})

test('/notifications all/unread filter buttons render', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/notifications')
  await expect(page.locator('[data-mol-id="notifications-filter-all"]').first()).toBeVisible()
  await expect(page.locator('[data-mol-id="notifications-filter-unread"]').first()).toBeVisible()
})

test('/notifications is auth-gated (anon redirects to /login)', async ({ page }) => {
  await page.goto(APP_BASE + '/notifications')
  await page.waitForURL(/\/login/, { timeout: 8_000 })
})

test('/notifications mark-all and per-item buttons render once seeded', async ({ page }) => {
  const { accessToken } = await signup(page)
  await page.request.post(`${API_BASE}/notifications`, {
    headers: apiHeaders(accessToken),
    data: { title: 'Per-item read', body: 'unread', type: 'reminder' },
    failOnStatusCode: false,
  })
  await page.goto(APP_BASE + '/notifications')
  await expect(page.locator('[data-mol-id="notifications-item"]').first()).toBeVisible({
    timeout: 10_000,
  })
  await expect(page.locator('[data-mol-id="notifications-mark-all"]').first()).toBeVisible()
  await expect(page.locator('[data-mol-id="notifications-mark-read"]').first()).toBeVisible()
})

test('/notifications unread filter button toggles ?filter=unread', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/notifications')
  await page.locator('[data-mol-id="notifications-filter-unread"]').first().click()
  await expect.poll(() => page.url(), { timeout: 5_000 }).toMatch(/filter=unread/)
})
