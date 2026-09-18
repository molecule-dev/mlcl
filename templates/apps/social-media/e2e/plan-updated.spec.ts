/**
 * /plan-updated — landing page after a successful Stripe Checkout
 * redirect. Auth-only; renders a confirmation message + a CTA back to
 * the home shell.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test.describe('plan updated page', () => {
  test('renders the thank-you copy after auth', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.locator('body')).toContainText(/thank/i, { timeout: 10_000 })
  })

  test('shows a CTA link back to "/"', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    const link = page.locator('a[href="/"]').first()
    await expect(link).toBeVisible({ timeout: 10_000 })
  })

  test('unauthenticated viewers are redirected to /login', async ({ page }) => {
    const ctx = await page.context().browser()!.newContext()
    const fresh = await ctx.newPage()
    await fresh.goto(APP_BASE + '/plan-updated')
    await fresh.waitForURL(/\/login/, { timeout: 10_000 })
    await ctx.close()
  })
})
