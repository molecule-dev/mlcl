import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, expectNoConsoleErrors, signup, uniqueEmail } from './_helpers.js'

test.describe('signup page', () => {
  test('renders email + password fields and a submit button', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.getByLabel(/email/i).first()).toBeVisible()
    await expect(page.getByLabel(/^password$/i).first()).toBeVisible()
    await expect(
      page
        .getByRole('button', { name: /sign\s*up|create.*account|get\s*started|register/i })
        .first(),
    ).toBeVisible()
  })

  test('Sign-in link routes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const link = page.getByRole('link', { name: /sign\s*in|log\s*in/i }).first()
    await link.click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('valid signup creates a user (POST /api/users returns 2xx)', async ({ page }) => {
    const email = uniqueEmail('signup')
    const requests = await captureNetwork(page, async () => {
      await signup(page, email)
    })
    // The User resource exposes signup at POST /api/users (not /sign-up).
    const signupCall = requests.find(
      (r) => r.method === 'POST' && /\/api\/users(?:\?|$|\/?$)/.test(r.url),
    )
    expect(signupCall, 'POST /api/users not observed').toBeTruthy()
    expect(signupCall!.status).toBeGreaterThanOrEqual(200)
    expect(signupCall!.status).toBeLessThan(300)
    await expect(page).not.toHaveURL(/\/signup$/)
  })

  test('renders without console errors', async ({ page }) => {
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + '/signup')
      await expect(page.getByLabel(/email/i).first()).toBeVisible()
    })
  })
})
