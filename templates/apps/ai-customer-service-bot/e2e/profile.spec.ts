import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiGet, captureNetwork, signup } from './_helpers.js'

interface SettingsRow {
  signature: string
  notify_escalations: boolean
  notify_mentions: boolean
  notify_digest: boolean
}

test.describe('/profile', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
  })

  test('profile page fires the analytics fetch', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/profile')
      await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
    })
    const analytics = reqs.find((r) => /\/api\/analytics(?:\?|$)/.test(r.url) && r.method === 'GET')
    expect(analytics, 'profile should call /api/analytics for performance metrics').toBeTruthy()
  })

  test('renders the profile hero', async ({ page }) => {
    await page.goto(APP_BASE + '/profile')
    await expect(page.locator('[data-mol-id="page-profile"]')).toBeVisible({ timeout: 10_000 })
  })

  test('renders the profile name', async ({ page }) => {
    await page.goto(APP_BASE + '/profile')
    await expect(page.locator('[data-mol-id="profile-name"]')).toBeVisible({ timeout: 10_000 })
  })

  test('renders the profile email', async ({ page }) => {
    await page.goto(APP_BASE + '/profile')
    await expect(page.locator('[data-mol-id="profile-email"]')).toBeVisible({ timeout: 10_000 })
  })

  test('renders the threads-handled KPI card', async ({ page }) => {
    await page.goto(APP_BASE + '/profile')
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
    await expect(page.locator('[data-mol-id="profile-kpi-handled"]')).toBeVisible({
      timeout: 15_000,
    })
  })

  test('signature textbox accepts text', async ({ page }) => {
    await page.goto(APP_BASE + '/profile')
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
    const sig = page.locator('[data-mol-id="profile-signature"]')
    await sig.fill('— Walker, Support')
    await expect(sig).toHaveValue('— Walker, Support')
  })

  test('toggling escalation-notify and saving persists to backend', async ({ page }) => {
    await page.goto(APP_BASE + '/profile')
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
    const cb = page.locator('[data-mol-id="profile-notify-escalations"]')
    const before = await cb.isChecked()
    if (before) await cb.uncheck()
    else await cb.check()
    const newSig = 'Persisted ' + Date.now()
    await page.locator('[data-mol-id="profile-signature"]').fill(newSig)
    await page.locator('[data-mol-id="profile-save"]').click()
    await expect(page.locator('[data-mol-id="profile-saved"]')).toBeVisible({ timeout: 10_000 })
    const settings = await apiGet<SettingsRow>(page, '/settings')
    expect(settings.notify_escalations).toBe(!before)
    expect(settings.signature).toBe(newSig)
  })
})
