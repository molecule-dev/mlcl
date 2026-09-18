import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { API_BASE, APP_BASE, captureNetwork, requireAccessToken, signup } from './_helpers'

test.describe('/settings', () => {
  test('redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto(APP_BASE + '/settings')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('renders the settings heading and tabs', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByRole('heading', { level: 1, name: /settings/i })).toBeVisible()
    await expect(page.locator('[data-mol-id="settings-tab-general"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="settings-tab-api-keys"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="settings-tab-team"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="settings-tab-billing"]')).toBeVisible()
  })

  test('saving workspace name PATCHes /api/profile and persists across reload', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    const newName = 'WorkspaceX-' + Date.now()
    await page.locator('[data-mol-id="settings-workspace-name"]').fill(newName)
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /save settings/i }).click()
      await page.waitForTimeout(2000)
    })
    const patch = reqs.find((r) => r.method === 'PATCH' && /\/api\/profile(?:[/?]|$)/.test(r.url))
    expect(patch).toBeDefined()
    expect(patch!.status).toBeLessThan(300)
    await page.reload()
    await expect(page.locator('[data-mol-id="settings-workspace-name"]')).toHaveValue(newName, {
      timeout: 10_000,
    })
  })

  test('region buttons toggle visibly', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-mol-id="settings-region-eu-west"]').click()
    await page.locator('[data-mol-id="settings-region-ap-southeast"]').click()
    await page.locator('[data-mol-id="settings-region-us-east"]').click()
    await expect(page.locator('[data-mol-id="settings-region-us-east"]')).toBeVisible()
  })

  test('changing retention persists across reload (read-after-write)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    // Pick the 7d retention button
    await page.getByRole('button', { name: /^7d$/i }).first().click()
    await page.getByRole('button', { name: /save settings/i }).click()
    await page.waitForTimeout(2000)
    await page.reload()
    // After reload, the 7d button should be selected.
    // We cannot easily assert "selected" visually in ClassMap; instead
    // confirm via a direct GET that workspace.retention === '7d'.
    const token = await requireAccessToken(page)
    const r = await page.request.get(API_BASE + '/profile', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const me = await r.json()
    const prefs = me.preferences ?? {}
    const ws = (typeof prefs === 'object' && prefs.workspace) || {}
    expect(ws.retention).toBe('7d')
  })

  test('clicking the API keys tab navigates there', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-mol-id="settings-tab-api-keys"]').click()
    await expect(page).toHaveURL(/\/settings\/api-keys/, { timeout: 10_000 })
  })
})
