import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('civic-311: root', () => {
  test('public landing renders hero + how-it-works without a session', async ({ page }) => {
    await page.evaluate(() => window.localStorage.clear()).catch(() => {})
    await page.goto(APP_BASE + '/')
    await expect(page.getByTestId('landing-hero-title')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('landing-how-it-works')).toBeVisible()
    await expect(page.getByTestId('landing-step-1')).toBeVisible()
    await expect(page.locator('[data-mol-id="side-nav-explore"]')).toHaveCount(0)
  })

  test('landing CTA links lead to signup and explore', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.getByTestId('landing-cta-signup').click()
    await expect(page).toHaveURL(/\/signup/, { timeout: 10_000 })
    await page.goto(APP_BASE + '/')
    await page.getByTestId('landing-cta-explore').click()
    // AuthGuard bounces anonymous visitors to login.
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })
})
