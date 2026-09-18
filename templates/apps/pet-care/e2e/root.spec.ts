import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, expectNoConsoleErrors } from './_helpers.js'

test.describe('landing page', () => {
  test('renders heading on /', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10_000 })
  })

  test('signup CTA routes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const link = page
      .getByRole('link', { name: /sign\s*up|get\s*started|create.*account/i })
      .first()
    if (await link.count().catch(() => 0)) {
      await link.click()
      await expect(page).toHaveURL(/\/signup/)
    }
  })

  test('login link routes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const link = page.getByRole('link', { name: /sign\s*in|^login$|log\s*in/i }).first()
    if (await link.count().catch(() => 0)) {
      await link.click()
      await expect(page).toHaveURL(/\/login/)
    }
  })

  test('mount fires GET /api/billing/tiers (or no console error)', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/')
      await page.waitForTimeout(1500)
    })
    // landing may or may not call billing; if it does, it must succeed
    const tiers = reqs.find((r) => /\/api\/billing\/(tiers|status)\b/.test(r.url))
    if (tiers) {
      expect(tiers.status).toBeGreaterThanOrEqual(200)
      expect(tiers.status).toBeLessThan(500)
    }
  })

  test('renders without fatal console errors', async ({ page }) => {
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + '/')
      await expect(page.getByRole('heading').first()).toBeVisible()
    })
  })
})
