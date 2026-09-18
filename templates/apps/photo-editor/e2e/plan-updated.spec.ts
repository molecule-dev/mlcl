/**
 * /plan-updated — Stripe-checkout success bounce page.
 *
 * Asserts the headings render and the "Return home" Button (wrapped
 * in a Link to "/") navigates back to the landing page. captureNetwork()
 * is used to record the auth-init request that fires on mount.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/plan-updated', () => {
  test('renders the message + thank-you headings', async ({ page }) => {
    await signup(page)
    const calls = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/plan-updated')
      // Wait for either heading to appear so we know the auth init resolved.
      await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible({ timeout: 10_000 })
    })
    // Two h2 headings expected: "Your plan has been updated" + "Thank you".
    const headings = page.getByRole('heading', { level: 2 })
    await expect(headings).toHaveCount(2)
    // captureNetwork should at least observe the page load itself (or auth init).
    expect(calls.length).toBeGreaterThan(0)
  })

  test('the "Return home" link navigates to /', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible({ timeout: 10_000 })
    await page
      .getByRole('link')
      .filter({ hasText: /home|return/i })
      .click()
    await page.waitForURL(/\/$|\/$/, { timeout: 10_000 })
    expect(new URL(page.url()).pathname).toBe('/')
  })

  test('the "Return home" Button activates the surrounding link', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible({ timeout: 10_000 })
    await page.getByRole('button', { name: /home|return/i }).click()
    await page.waitForURL(/\/$|\/$/, { timeout: 10_000 })
    expect(new URL(page.url()).pathname).toBe('/')
  })
})
