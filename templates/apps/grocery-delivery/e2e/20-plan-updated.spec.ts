import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, signup } from './_helpers'

// /plan-updated — post-Stripe-checkout success page. Renders thank-you
// message and a button to return home.

test.describe('/plan-updated', () => {
  test('redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('shows thank-you message and a Return home CTA after auth', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('button', { name: /return home|home/i })).toBeVisible()
  })

  test('Return home navigates to /', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await page.getByRole('button', { name: /return home/i }).click()
    await expect(page).toHaveURL(/\/$|\/shop|\/cart/, { timeout: 5_000 })
  })
})
