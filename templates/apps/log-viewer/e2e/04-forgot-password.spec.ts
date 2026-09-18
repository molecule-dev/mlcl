import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, uniqueEmail } from './_helpers'

// /forgot-password — POST /api/users/forgot-password.

test.describe('/forgot-password', () => {
  test('renders form without auth', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /send|reset|submit/i })).toBeVisible()
  })

  test('submitting fires POST /api/users/forgot-password and shows success', async ({ page }) => {
    const email = uniqueEmail('forgot')
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/forgot-password')
      await page.locator('input[type="email"]').fill(email)
      await page.getByRole('button', { name: /send|reset|submit/i }).click()
      await expect(
        page.getByRole('status').or(page.locator('[data-mol-id="forgot-password-success"]')),
      ).toBeVisible({ timeout: 8_000 })
    })
    const req = reqs.find((r) => r.method === 'POST' && /\/api\/users\/forgot-password/.test(r.url))
    expect(req, 'POST /api/users/forgot-password should fire').toBeDefined()
  })

  test('"Back to sign in" link goes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page
      .getByRole('link', { name: /sign in|back/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login/)
  })
})
