/**
 * Auth gating: anonymous users are redirected away from authed routes;
 * a freshly-signed-up user lands on a working dashboard.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup, uniqueEmail } from './_helpers.js'

test.describe('auth', () => {
  test('anonymous /dashboard redirects to login or landing', async ({ page }) => {
    await page.evaluate(() => window.localStorage.clear()).catch(() => {})
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/login|\/signup|\/$/, { timeout: 10000 })
  })

  test('signup → dashboard renders the welcome hero', async ({ page }) => {
    await signup(page, uniqueEmail('auth-dash'))
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('main').first()).toBeVisible()
    // The dashboard renders a "Day N of 90" hero — assert the structure.
    await expect(page.locator('[data-mol-id="page-dashboard"]').first()).toBeVisible()
  })
})
