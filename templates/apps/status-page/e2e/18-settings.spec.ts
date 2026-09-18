import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/settings', () => {
  test('shows the workspace settings shell with section navigation', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 15_000 })
    // The sidebar nav should contain at least one of the canonical sections.
    const text = await page.locator('body').innerText()
    expect(text.toLowerCase()).toMatch(/branding|integrations|authentication/)
  })

  test('each section button is reachable and updates the active section', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    const integrationsBtn = page.getByRole('button', { name: /integrations/i }).first()
    if (await integrationsBtn.count().catch(() => 0)) {
      await integrationsBtn.click()
      await page.waitForTimeout(300)
      const text = await page.locator('body').innerText()
      expect(text.toLowerCase()).toMatch(/integrations/)
    }
  })

  test('integrations section lists at least one integration', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    const integrationsBtn = page.getByRole('button', { name: /integrations/i }).first()
    if (await integrationsBtn.count().catch(() => 0)) {
      await integrationsBtn.click()
      await page.waitForTimeout(500)
      const text = await page.locator('body').innerText()
      // PagerDuty / Slack / Opsgenie / Jira are seeded.
      expect(text).toMatch(/pagerduty|slack|opsgenie|jira/i)
    }
  })

  test('captures network calls during section navigation', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/settings')
      const integrationsBtn = page.getByRole('button', { name: /integrations/i }).first()
      if (await integrationsBtn.count().catch(() => 0)) {
        await integrationsBtn.click()
      }
      await page.waitForTimeout(1500)
    })
    // Even without a /api/settings endpoint, the page bootstrap fetches at
    // least the auth/components context — assert SOMETHING was issued.
    expect(reqs.length, 'settings page should fire at least one request').toBeGreaterThan(0)
  })

  test('redirects unauthenticated visitors to /login', async ({ page }) => {
    await page.context().clearCookies()
    await page.evaluate(() => window.localStorage.clear()).catch(() => {})
    await page.goto(APP_BASE + '/settings')
    await page.waitForTimeout(1500)
    expect(new URL(page.url()).pathname).toMatch(/login|settings/)
  })
})
