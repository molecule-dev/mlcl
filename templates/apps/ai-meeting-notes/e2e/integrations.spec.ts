import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

/**
 * Per-page spec for /integrations. Toggling a card PATCHes
 * /api/users/:id with `oauthData.integrations[key].connected = true|false`.
 * State must survive reload (server-persisted).
 */

test.describe('integrations page', () => {
  test('integrations heading is visible', async ({ page }) => {
    await signup(page, uniqueEmail('int-h'), 'TestPass123!')
    await page.goto(APP_BASE + '/integrations')
    await expect(page.getByRole('heading', { name: /integrations/i }).first()).toBeVisible()
  })

  test('Google Calendar card is rendered', async ({ page }) => {
    await signup(page, uniqueEmail('int-gc'), 'TestPass123!')
    await page.goto(APP_BASE + '/integrations')
    await expect(
      page.locator('[data-mol-id="integration-card-google_calendar"]').first(),
    ).toBeVisible()
  })

  test('Zoom card is rendered', async ({ page }) => {
    await signup(page, uniqueEmail('int-zoom'), 'TestPass123!')
    await page.goto(APP_BASE + '/integrations')
    await expect(page.locator('[data-mol-id="integration-card-zoom"]').first()).toBeVisible()
  })

  test('Outlook card is rendered', async ({ page }) => {
    await signup(page, uniqueEmail('int-outlook'), 'TestPass123!')
    await page.goto(APP_BASE + '/integrations')
    await expect(page.locator('[data-mol-id="integration-card-outlook"]').first()).toBeVisible()
  })

  test('Teams card is rendered', async ({ page }) => {
    await signup(page, uniqueEmail('int-teams'), 'TestPass123!')
    await page.goto(APP_BASE + '/integrations')
    await expect(page.locator('[data-mol-id="integration-card-teams"]').first()).toBeVisible()
  })

  test('toggling Google Calendar persists across reload (read-after-write)', async ({ page }) => {
    await signup(page, uniqueEmail('int-toggle'), 'TestPass123!')
    await page.goto(APP_BASE + '/integrations')

    const toggle = page.locator('[data-mol-id="integration-toggle-google_calendar"]').first()
    await expect(toggle).toBeVisible()

    const reqs = await captureNetwork(page, async () => {
      await toggle.click()
      // Status badge flips to "connected"
      await expect(
        page.locator('[data-mol-id="integration-card-google_calendar"][data-status="connected"]'),
      ).toBeVisible({ timeout: 5_000 })
    })
    const patchCall = reqs.find((r) => /\/api\/users\//.test(r.url) && r.method === 'PATCH')
    expect(patchCall, 'PATCH /api/users/:id should fire on toggle').toBeTruthy()
    expect([200, 201]).toContain(patchCall!.status)

    await page.reload()
    await expect(
      page.locator('[data-mol-id="integration-card-google_calendar"][data-status="connected"]'),
    ).toBeVisible({ timeout: 5_000 })
  })

  test('GET /api/users/:id fires on page load', async ({ page }) => {
    await signup(page, uniqueEmail('int-get'), 'TestPass123!')
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/integrations')
      await page.waitForLoadState('networkidle')
    })
    const getCall = reqs.find((r) => /\/api\/users\/[^/]+$/.test(r.url) && r.method === 'GET')
    expect(getCall, 'GET /api/users/:id must fire to load oauthData').toBeTruthy()
    expect([200, 201]).toContain(getCall!.status)
  })

  test('sidebar nav-integrations chrome is rendered', async ({ page }) => {
    await signup(page, uniqueEmail('int-nav'), 'TestPass123!')
    await page.goto(APP_BASE + '/integrations')
    await expect(page.locator('[data-mol-id="nav-integrations"]').first()).toBeVisible()
  })
})
