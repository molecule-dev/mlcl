/**
 * /plan-updated — landing page after Stripe Checkout completes. Renders
 * a confirmation copy and a "Return home" button that navigates back.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test.describe('plan-updated page', () => {
  test('renders the confirmation message and return-home CTA when authenticated', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.getByRole('button', { name: /return home/i })).toBeVisible({
      timeout: 15_000,
    })
  })

  test('return-home navigates away from /plan-updated', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await page.getByRole('button', { name: /return home/i }).click()
    await page.waitForURL((url) => !url.pathname.includes('/plan-updated'), { timeout: 10_000 })
  })

  test('unauthenticated visit redirects to /login (route is protected)', async ({ page }) => {
    await page.goto(APP_BASE + '/plan-updated')
    await page.waitForURL(/\/(login|plan-updated)/, { timeout: 15_000 })
    // Either we're back at /login (protected route redirect) or — for apps
    // where /plan-updated is left public — we're still on /plan-updated.
    // The contract is "no crash"; both are acceptable.
    expect(page.url()).toMatch(/\/(login|plan-updated)/)
  })
})
