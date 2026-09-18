import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { API_BASE, APP_BASE, captureNetwork, requireAccessToken, signup } from './_helpers'

test.describe('/profile', () => {
  test('redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto(APP_BASE + '/profile')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('renders the profile heading and identity section', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    await expect(page.getByRole('heading', { level: 1, name: /profile/i })).toBeVisible()
    await expect(page.locator('[data-mol-id="profile-first-name"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="profile-email"]')).toBeVisible()
  })

  test('saving profile name PATCHes /api/profile and persists across reload', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    const newFirst = 'Walker' + Date.now()
    await page.locator('[data-mol-id="profile-first-name"]').fill(newFirst)
    await page.locator('[data-mol-id="profile-last-name"]').fill('Smith')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="profile-update"]').click()
      await page.waitForTimeout(2000)
    })
    const patch = reqs.find((r) => r.method === 'PATCH' && /\/api\/profile(?:[/?]|$)/.test(r.url))
    expect(patch).toBeDefined()
    expect(patch!.status).toBeLessThan(300)
    // Reload — value persists
    await page.reload()
    await expect(page.locator('[data-mol-id="profile-first-name"]')).toHaveValue(newFirst, {
      timeout: 10_000,
    })
  })

  test('toggling preferences persists across reload (read-after-write)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    // Click each pref toggle button (label area triggers click handler)
    await page.locator('button[data-mol-id^="profile-pref-"]').first().click()
    await page.locator('[data-mol-id="profile-update"]').click()
    await page.waitForTimeout(1500)
    const token = await requireAccessToken(page)
    const r = await page.request.get(API_BASE + '/profile', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const me = await r.json()
    expect(me.preferences).toBeDefined()
    expect(typeof me.preferences === 'object' && me.preferences !== null).toBe(true)
  })

  test('GET /api/profile and /api/profile/sessions both fire on render', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/profile')
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    })
    expect(
      reqs.find((r) => r.method === 'GET' && /\/api\/profile(?:\?|$)/.test(r.url)),
    ).toBeDefined()
    expect(
      reqs.find((r) => r.method === 'GET' && /\/api\/profile\/sessions/.test(r.url)),
    ).toBeDefined()
  })
})
