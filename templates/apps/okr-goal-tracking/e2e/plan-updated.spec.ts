/**
 * /plan-updated — confirmation page after Stripe-checkout return.
 *
 * The Billing flow redirects users back here after a successful subscription
 * change. We assert the auth-gated thank-you renders, the Return-home button
 * navigates to /, and signed-out access redirects to /login.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/plan-updated', () => {
  test('renders thank-you copy and Return-home action when authenticated', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/plan-updated')
      await expect(page.locator('h2').first()).toBeVisible()
    })
    // The page mounts under the authenticated layout — the layout fetches
    // notifications/objectives/key-results to render the shell. At minimum
    // the page navigation itself fired so we got a 200 HTML response.
    expect(reqs.find((r) => r.url.endsWith('/plan-updated') || /\/api\//.test(r.url))).toBeTruthy()
    await expect(page.getByRole('button', { name: /return home/i })).toBeVisible()
  })

  test('Return-home button navigates back to / (landing)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await page.getByRole('link', { name: /return home/i }).click()
    await page.waitForURL(new RegExp(`^${APP_BASE}/?$`), { timeout: 10000 })
  })

  test('access while signed-out redirects to /login (auth gate)', async ({ page }) => {
    await page.goto(APP_BASE + '/plan-updated')
    await page.waitForURL(/\/login/, { timeout: 10000 })
  })

  test('reload preserves the auth-gated render', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.locator('h2').first()).toBeVisible()
    await page.reload()
    await expect(page.locator('h2').first()).toBeVisible()
    await expect(page.getByRole('link', { name: /return home/i })).toBeVisible()
  })
})
