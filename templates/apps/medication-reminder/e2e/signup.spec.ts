import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail, getAccessToken } from './_helpers.js'

test.describe('/signup (Signup)', () => {
  test('email input accepts a typed value', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const emailField = page.locator('input[type="email"]').first()
    await emailField.fill('typed@example.com')
    await expect(emailField).toHaveValue('typed@example.com')
  })

  test('password input is masked', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const pwField = page.locator('input[type="password"]').first()
    await expect(pwField).toHaveAttribute('type', 'password')
  })

  test('submit POSTs /api/users/signup and navigates off /signup', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await signup(page, uniqueEmail('signup-spec'))
    })
    expect(page.url()).not.toMatch(/\/signup/)
    const signupCall = reqs.find((r) => /\/api\/users(?!\/)/.test(r.url) && r.method === 'POST')
    expect(signupCall, 'POST /api/users must be issued').toBeTruthy()
    expect(signupCall!.status, 'signup must succeed').toBeLessThan(400)
    const token = await getAccessToken(page)
    expect(token, 'access token present after signup').toBeTruthy()
  })

  test('Back arrow navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    // Auth pages use an icon-only secondary button labelled by aria-label.
    await page
      .getByRole('button', { name: /go back/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })
})
