import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, signup } from './_helpers'

// /plan-updated — landing page Stripe redirects users to after
// successful checkout. Auth-protected; renders a Spinner until auth
// hydrates, then a "Thank you" message + "Return home" button.

test.describe('/plan-updated', () => {
  test('redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('after signup, /plan-updated renders thank-you content', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.locator('body')).toContainText(/thank|plan|success|welcome/i, {
      timeout: 10_000,
    })
  })

  test('"Return home" button navigates to /', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await page.getByRole('button', { name: /return home|home/i }).click()
    await expect(page).toHaveURL(/\/$/, { timeout: 5_000 })
  })

  test('"Return home" link wraps the button', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    const link = page.locator('a[href="/"]').last()
    await expect(link).toBeVisible()
  })
})
