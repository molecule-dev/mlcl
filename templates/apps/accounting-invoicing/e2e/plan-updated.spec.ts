/**
 * /plan-updated — confirmation screen after Stripe-checkout return.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test.describe('plan updated page', () => {
  test('renders the thank-you message and a "Return home" button', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.locator('h2').first()).toBeVisible()
    await expect(page.getByRole('link', { name: /return|home/i })).toBeVisible()
  })

  test('"Return home" link navigates to /', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await page.getByRole('link', { name: /return|home/i }).click()
    await page.waitForURL(new RegExp(`^${APP_BASE}/?$`), { timeout: 5000 })
  })

  test('access while signed-out redirects to /login (auth gate)', async ({ page }) => {
    await page.goto(APP_BASE + '/plan-updated')
    await page.waitForURL(/\/login/, { timeout: 10000 })
  })
})
