/**
 * /plan-updated — landing page after a Stripe checkout/portal redirect.
 *
 * Confirms the user lands on a real "Thanks!" view with a Return-home button
 * that navigates back to the app shell.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test.describe('Plan updated', () => {
  test('renders the thank-you message after auth', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.locator('h2').first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('button', { name: /return home/i })).toBeVisible()
  })

  test('return-home button navigates to /', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await page.getByRole('button', { name: /return home/i }).click()
    await page.waitForURL((u) => u.pathname === '/' || u.pathname === '/dashboard', {
      timeout: 5000,
    })
  })

  test('shows two stacked headlines (message + thank-you)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    const headings = page.locator('h2')
    expect(await headings.count(), 'should render at least two h2s').toBeGreaterThanOrEqual(2)
  })
})
