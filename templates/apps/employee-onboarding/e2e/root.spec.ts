/**
 * Anonymous landing page (Embark marketing).
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/ (landing)', () => {
  test('landing renders without auth', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/')
      await page.waitForLoadState('networkidle')
    })
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10_000 })
    expect(reqs.find((r) => r.url.endsWith('/'))?.status).toBeLessThan(500)
  })

  test('signup CTA navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.waitForLoadState('networkidle')
    const cta = page
      .getByRole('link', { name: /create.*account|get.*started|sign.*up|join/i })
      .first()
    if ((await cta.count()) > 0) {
      await cta.click()
      await expect(page).toHaveURL(/\/signup|\/login/, { timeout: 10_000 })
    }
  })

  test('login link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.waitForLoadState('networkidle')
    const link = page.getByRole('link', { name: /sign\s*in|log\s*in/i }).first()
    if ((await link.count()) > 0) {
      await link.click()
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
    }
  })
})
