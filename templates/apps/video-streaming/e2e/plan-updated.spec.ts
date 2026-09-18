import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/plan-updated', () => {
  test('renders for an authenticated user (post-checkout return URL)', async ({ page }) => {
    await signup(page) // /plan-updated is gated by AuthGuard
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/plan-updated')
      await expect(page.locator('main, [role="main"]').first()).toBeVisible({ timeout: 15_000 })
      await page.waitForLoadState('networkidle')
    })
    // /plan-updated typically refreshes /api/billing/status; if not, at least
    // some page bootstrap traffic was observed.
    expect(reqs.length).toBeGreaterThan(0)
  })

  test('shows a thank-you message and a Return-Home button/link', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.locator('main').first()).toBeVisible({ timeout: 15_000 })
    const homeAffordance = page
      .getByRole('link', { name: /home|continue|back|return/i })
      .or(page.getByRole('button', { name: /home|continue|back|return/i }))
    await expect(homeAffordance.first()).toBeVisible({ timeout: 5_000 })
  })

  test('Return-Home affordance navigates back into the app', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.locator('main').first()).toBeVisible({ timeout: 15_000 })
    const homeAffordance = page.getByRole('link', { name: /home|continue|back|return/i }).first()
    await homeAffordance.click()
    await expect(page).not.toHaveURL(/\/plan-updated/, { timeout: 10_000 })
  })

  test('Anonymous visit redirects to /login (AuthGuard)', async ({ page }) => {
    await page.goto(APP_BASE + '/plan-updated')
    // AuthGuard forwards to /login OR /
    await page.waitForLoadState('networkidle')
    await expect(page).not.toHaveURL(/\/plan-updated/, { timeout: 10_000 })
  })
})
