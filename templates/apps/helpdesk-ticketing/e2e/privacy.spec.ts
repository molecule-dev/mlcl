import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('helpdesk-ticketing: /privacy', () => {
  test('/privacy is publicly reachable and renders prose', async ({ page }) => {
    await page.evaluate(() => window.localStorage.clear()).catch(() => {})
    await page.goto(APP_BASE + '/privacy')
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 15_000 })
    const len = await page.evaluate(() => document.body.innerText.length)
    expect(len).toBeGreaterThan(500)
  })

  test('/privacy has at least one back-link out of the page', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    const linkCount = await page.locator('a').count()
    expect(linkCount).toBeGreaterThan(0)
  })

  test('/privacy does not throw the RootErrorBoundary', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await expect(page.locator('[role=alert]')).toHaveCount(0)
  })

  test('/privacy is reachable while logged out (no AuthGuard)', async ({ page }) => {
    await page.evaluate(() => window.localStorage.clear()).catch(() => {})
    await page.goto(APP_BASE + '/privacy')
    await expect(page).toHaveURL(/\/privacy$/)
  })

  test('/privacy returns the SPA index.html (200) so the Vite SPA can hydrate', async ({
    page,
  }) => {
    const resp = await page.request.get(APP_BASE + '/privacy', { failOnStatusCode: false })
    expect(resp.status()).toBeLessThan(400)
  })
})
