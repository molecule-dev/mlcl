/**
 * Landing: the public root renders the marketing chrome and routes to
 * the auth pages.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test('landing renders hero + nav', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await expect(page.locator('h1').first()).toBeVisible({ timeout: 10_000 })
  await expect(page.getByRole('navigation')).toBeVisible()
  await expect(page.locator('[data-mol-id="landing-nav-signup"]')).toBeVisible()
})

test('landing sign-in link routes to /login', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await page.locator('[data-mol-id="landing-nav-login"]').click()
  await page.waitForURL(/\/login/, { timeout: 10_000 })
  await expect(page).toHaveURL(/\/login/)
})
