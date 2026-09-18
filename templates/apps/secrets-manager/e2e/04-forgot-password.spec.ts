import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers'

// /forgot-password — POST /api/users/forgot-password issues a reset email.
// API responds 200 even for unknown emails (anti-enumeration).

test.describe('/forgot-password', () => {
  test('renders without auth', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.locator('input[type=email]').first()).toBeVisible()
  })

  test('submitting the form fires POST /users/forgot-password', async ({ page }) => {
    // Sign up so we exercise the real-account branch (Mailgun mock will swallow).
    const creds = await signup(page)
    await page.evaluate(() => window.localStorage.clear())
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/forgot-password')
      await page.locator('input[type=email]').first().fill(creds.email)
      await page
        .getByRole('button', { name: /send|reset/i })
        .first()
        .click()
      await page.waitForTimeout(1500)
    })
    const post = reqs.find(
      (r) => r.method === 'POST' && /\/api\/users\/forgot-password/.test(r.url),
    )
    expect(post, 'POST /api/users/forgot-password should fire').toBeDefined()
    expect(post!.status, 'forgot-password POST should be 2xx').toBeLessThan(300)
  })

  test('"Back to sign in" link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const link = page.getByRole('link', { name: /sign in|back/i }).first()
    await expect(link).toBeVisible()
    await link.click()
    await expect(page).toHaveURL(/\/login$/, { timeout: 10_000 })
  })
})
