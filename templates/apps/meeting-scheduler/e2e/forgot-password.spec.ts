import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiSignup } from './_helpers.js'

test.describe('Forgot password', () => {
  test('renders form fields', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.getByRole('button', { name: /send|reset|submit/i }).first()).toBeVisible({
      timeout: 10000,
    })
  })

  test('submitting fires POST /api/users/forgot-password', async ({ page, request }) => {
    const session = await apiSignup(request)
    await page.goto(APP_BASE + '/forgot-password')
    const emailField = page.locator('input[type="email"], input#email').first()
    await emailField.fill(session.email)
    const [response] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/api/users/forgot-password') && r.request().method() === 'POST',
        { timeout: 10000 },
      ),
      page
        .getByRole('button', { name: /send|reset|submit/i })
        .first()
        .click(),
    ])
    expect([200, 201, 204]).toContain(response.status())
  })

  test('forgot-password page exposes a back-to-sign-in link', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const back = page.getByRole('link', { name: /back to sign in|sign in|log in/i }).first()
    await expect(back).toBeVisible({ timeout: 10000 })
    await expect(back).toHaveAttribute('href', /\/login/)
  })
})
