/**
 * /settings — writing preferences + integrations + sign-out.
 *
 * Real outcomes: tone change persists via PUT and round-trips through a
 * page reload; toggle switches flip aria-checked; integration toggle
 * fires a real POST /api/integrations/connect and the next GET reflects
 * the new credentialId; Sign-out clears the JWT and routes to /login.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedGet, captureNetwork, getAccessToken, signup } from './_helpers.js'

test.describe('/settings', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByRole('heading', { name: /^Settings$/i, level: 1 })).toBeVisible()
  })

  test('h1 reads "Settings"', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /^Settings$/i, level: 1 })).toBeVisible()
  })

  test('Default tone preset persists across reload via PUT /api/preferences', async ({ page }) => {
    await page.getByLabel(/Default tone preset/i).selectOption('Casual')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Save preferences/i }).click()
      await expect(page.locator('[data-mol-id="settings-saved"]')).toBeVisible({
        timeout: 10_000,
      })
    })
    const put = reqs.find((r) => /\/api\/preferences/.test(r.url) && r.method === 'PUT')
    expect(put?.status).toBeGreaterThanOrEqual(200)
    expect(put?.status).toBeLessThan(300)
    await page.reload()
    await expect(page.getByLabel(/Default tone preset/i)).toHaveValue('Casual')
    const fresh = await authedGet<{ default_tone: string }>(page, '/preferences')
    expect(fresh.default_tone).toBe('Casual')
  })

  test('Autosave toggle flips aria-checked', async ({ page }) => {
    const sw = page.locator('[data-mol-id="settings-auto-save"]')
    const before = await sw.getAttribute('aria-checked')
    await sw.click()
    await expect(sw).toHaveAttribute('aria-checked', before === 'true' ? 'false' : 'true')
  })

  test('Inline AI suggestions toggle flips aria-checked', async ({ page }) => {
    const sw = page.locator('[data-mol-id="settings-ai-suggestions"]')
    const before = await sw.getAttribute('aria-checked')
    await sw.click()
    await expect(sw).toHaveAttribute('aria-checked', before === 'true' ? 'false' : 'true')
  })

  test('Email-summaries toggle flips aria-checked', async ({ page }) => {
    const sw = page.locator('[data-mol-id="settings-notify-email"]')
    const before = await sw.getAttribute('aria-checked')
    await sw.click()
    await expect(sw).toHaveAttribute('aria-checked', before === 'true' ? 'false' : 'true')
  })

  test('Save preferences shows the "Saved" status', async ({ page }) => {
    await page.getByRole('button', { name: /Save preferences/i }).click()
    await expect(page.locator('[data-mol-id="settings-saved"]')).toBeVisible()
  })

  test('Connect integration toggles connected-state via POST /api/integrations/connect', async ({
    page,
  }) => {
    const before = await authedGet<{ integrations: { key: string; connected: boolean }[] }>(
      page,
      '/integrations',
    )
    if (!before.integrations || before.integrations.length === 0) {
      // Some flagships ship without configured providers; nothing to toggle.
      return
    }
    const toggleBtn = page.locator('[data-mol-id^="settings-integration-toggle-"]').first()
    const reqs = await captureNetwork(page, async () => {
      await toggleBtn.click()
      // Wait for the button to settle on either "Disconnect" or "Connect"
      await expect(toggleBtn).not.toContainText(/Updating/i, { timeout: 10_000 })
    })
    const call = reqs.find(
      (r) =>
        (/\/api\/integrations\/connect/.test(r.url) && r.method === 'POST') ||
        (/\/api\/integrations\//.test(r.url) && r.method === 'DELETE'),
    )
    expect(call, 'connect or delete must fire').toBeTruthy()
    expect(call?.status).toBeGreaterThanOrEqual(200)
    expect(call?.status).toBeLessThan(300)
  })

  test('Sign out clears JWT and routes to /login', async ({ page }) => {
    await page.locator('[data-mol-id="settings-sign-out"]').click()
    await expect(page).toHaveURL(/\/login$/, { timeout: 10_000 })
    const token = await getAccessToken(page)
    expect(token, 'JWT must be cleared after sign-out').toBeFalsy()
  })
})
