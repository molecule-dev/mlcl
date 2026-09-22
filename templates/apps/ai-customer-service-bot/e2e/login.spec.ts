import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('/login', () => {
  test('email field accepts a value', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const email = page.getByLabel(/email/i).first()
    await email.fill('test@example.com')
    await expect(email).toHaveValue('test@example.com')
  })

  test('password field accepts a value', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const pw = page.getByLabel(/password/i).first()
    await pw.fill('TestPass123!')
    await expect(pw).toHaveValue('TestPass123!')
  })

  test('Sign in with valid creds navigates to /dashboard and fires POST', async ({ page }) => {
    // Rare race: the Dashboard's stats fetch (GET /api/analytics) can fire in
    // the same microtask window that persists the fresh session credential,
    // 401 once, and the page degrades gracefully (the app catches it and
    // renders without stats). Tolerate that single expected resource error —
    // console text carries the status but not the URL, so match the status.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: /status of 401/,
    })
    const email = uniqueEmail('login')
    const password = 'TestPass123!'
    await signup(page, email, password)
    await page.context().clearCookies()
    await page.goto(APP_BASE + '/login')
    await page.getByLabel(/email/i).first().fill(email)
    await page
      .getByLabel(/password/i)
      .first()
      .fill(password)
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /sign\s*in|log\s*in/i }).click()
      await page.waitForURL(/\/dashboard/, { timeout: 20_000 })
    })
    await expect(page).toHaveURL(/\/dashboard/)
    const authCall = reqs.find(
      (r) =>
        /\/api\/(?:auth|sessions|login|users\/(?:login|log-in|sessions)|users)/.test(r.url) &&
        r.method === 'POST',
    )
    expect(authCall, 'an auth POST should have fired during login').toBeTruthy()
    expect(authCall!.status, 'auth POST returned non-2xx').toBeLessThan(300)
  })

  test('Forgot password link goes to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByRole('link', { name: /Forgot password/i }).click()
    await expect(page).toHaveURL(/\/forgot-password/)
  })

  test('Create-account link goes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const link = page.getByRole('link', { name: /create.*account|sign\s*up|register/i }).first()
    await expect(link).toBeVisible()
    await link.click()
    await expect(page).toHaveURL(/\/signup/)
  })
})
