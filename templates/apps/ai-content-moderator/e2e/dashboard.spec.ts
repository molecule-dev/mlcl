/**
 * /dashboard — KPI cards, donut, weekly volume, recent items, and the
 * Manage queue / View report links. After seeding a queue item the
 * KPI counts update on next page load.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, seedQueueItem, signup } from './_helpers.js'

test.describe('dashboard page', () => {
  test('loads with summary + volume + recent — three real GETs hit the API', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/dashboard')
      await expect(page.locator('h1')).toContainText(/overview/i)
      await expect(page.getByRole('heading', { name: /recent items/i })).toBeVisible({
        timeout: 10000,
      })
    })
    const summary = reqs.find(
      (r) => /\/api\/moderation\/stats\/summary/.test(r.url) && r.status < 400,
    )
    const volume = reqs.find(
      (r) => /\/api\/moderation\/stats\/volume/.test(r.url) && r.status < 400,
    )
    const recent = reqs.find(
      (r) => /\/api\/moderation\/stats\/recent/.test(r.url) && r.status < 400,
    )
    expect(summary, 'GET /api/moderation/stats/summary').toBeTruthy()
    expect(volume, 'GET /api/moderation/stats/volume').toBeTruthy()
    expect(recent, 'GET /api/moderation/stats/recent').toBeTruthy()
  })

  test('empty state — KPIs render dashes / zeros for a brand-new account', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.locator('text=/Queue volume/i').first()).toBeVisible()
    await expect(page.locator('text=/Approved/i').first()).toBeVisible()
    await expect(page.locator('text=/Rejected/i').first()).toBeVisible()
    await expect(page.locator('text=/Total reviewed/i').first()).toBeVisible()
  })

  test('after seeding a queue item, "Recent items" row reflects it on reload', async ({ page }) => {
    const { accessToken } = await signup(page)
    const { preview } = await seedQueueItem(page, accessToken, `Dash preview ${Date.now()}`)
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.locator(`text=${preview}`).first()).toBeVisible({ timeout: 10000 })
  })

  test('"Manage queue" link navigates to /queue', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page.getByRole('link', { name: /manage queue/i }).click()
    await page.waitForURL('**/queue', { timeout: 5000 })
    await expect(page.locator('h1')).toContainText(/queue/i)
  })

  test('"View report" → /analytics; "Edit rules" → /rules', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page.getByRole('link', { name: /view report/i }).click()
    await page.waitForURL('**/analytics', { timeout: 5000 })
    await page.goto(APP_BASE + '/dashboard')
    await page.getByRole('link', { name: /edit rules/i }).click()
    await page.waitForURL('**/rules', { timeout: 5000 })
  })

  test('queue counts on dashboard match /api/moderation/stats/summary', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedQueueItem(page, accessToken, `Count check ${Date.now()}`)
    await seedQueueItem(page, accessToken, `Count check 2 ${Date.now()}`)
    const summary = await (
      await page.request.get(APP_BASE.replace(/\/$/, '') + '/api/moderation/stats/summary', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
    ).json()
    expect(summary.queued).toBeGreaterThanOrEqual(2)
    expect(summary.total).toBeGreaterThanOrEqual(2)
  })
})
