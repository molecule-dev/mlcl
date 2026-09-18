import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, expectNoConsoleErrors, signup } from './_helpers.js'

test.describe('settings page', () => {
  test('renders Settings heading and the four section tabs', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByRole('heading', { name: /settings/i }).first()).toBeVisible()
    for (const tab of ['team', 'email-templates', 'integrations', 'pipeline-stages']) {
      await expect(page.locator(`[data-mol-id="settings-tab-${tab}"]`)).toBeVisible()
    }
  })

  test('default tab fetches /api/settings/team', async ({ page }) => {
    await signup(page)
    const requests = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/settings')
      await page.waitForTimeout(1500)
    })
    expect(
      requests.some(
        (r) => r.method === 'GET' && /\/settings\/team\b/.test(r.url) && r.status === 200,
      ),
    ).toBeTruthy()
  })

  test('clicking Email templates tab fetches templates', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForTimeout(800)
    const requests = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="settings-tab-email-templates"]').click()
      await page.waitForTimeout(1200)
    })
    expect(
      requests.some(
        (r) =>
          r.method === 'GET' && /\/settings\/email-templates\b/.test(r.url) && r.status === 200,
      ),
    ).toBeTruthy()
  })

  test('clicking Integrations tab fetches integrations', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForTimeout(800)
    const requests = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="settings-tab-integrations"]').click()
      await page.waitForTimeout(1200)
    })
    expect(
      requests.some(
        (r) => r.method === 'GET' && /\/settings\/integrations\b/.test(r.url) && r.status === 200,
      ),
    ).toBeTruthy()
  })

  test('clicking Pipeline stages tab fetches stages', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForTimeout(800)
    const requests = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="settings-tab-pipeline-stages"]').click()
      await page.waitForTimeout(1200)
    })
    expect(
      requests.some(
        (r) =>
          r.method === 'GET' && /\/settings\/pipeline-stages\b/.test(r.url) && r.status === 200,
      ),
    ).toBeTruthy()
  })

  test('Invite teammate triggers POST /api/settings/team/invite', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForTimeout(1000)
    const requests = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="settings-team-invite"]').click()
      await page.waitForTimeout(1200)
    })
    expect(
      requests.some(
        (r) =>
          r.method === 'POST' &&
          /\/settings\/team\/invite\b/.test(r.url) &&
          r.status >= 200 &&
          r.status < 300,
      ),
    ).toBeTruthy()
  })

  test('renders without console errors', async ({ page }) => {
    await signup(page)
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + '/settings')
      await expect(page.getByRole('heading').first()).toBeVisible()
    })
  })
})
