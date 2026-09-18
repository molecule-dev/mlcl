import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('/login', () => {
  test('email input accepts a value', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const email = page.getByLabel(/email/i).first()
    await email.fill('test@example.com')
    await expect(email).toHaveValue('test@example.com')
  })

  test('password input accepts a value', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const pw = page.getByLabel(/password/i).first()
    await pw.fill('TestPass123!')
    await expect(pw).toHaveValue('TestPass123!')
  })

  test('Sign in with valid creds navigates to /dashboard and fires auth POST', async ({ page }) => {
    // Sign up a fresh user, log out (or just navigate to /login again with the
    // captured creds), then drive the login form to prove it round-trips.
    const email = uniqueEmail('login')
    const password = 'TestPass123!'
    await signup(page, email, password)
    // Land somewhere authed; navigate to /login fresh and use the form.
    await page.context().clearCookies()
    await page.goto(APP_BASE + '/login')
    await page.getByLabel(/email/i).first().fill(email)
    await page
      .getByLabel(/password/i)
      .first()
      .fill(password)
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Sign in/i }).click()
      await page.waitForURL(/\/dashboard/, { timeout: 15000 })
    })
    await expect(page).toHaveURL(/\/dashboard/)
    const authCall = reqs.find(
      (r) =>
        /\/api\/(?:auth|sessions|login|users\/(?:login|log-in|sessions))/.test(r.url) &&
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

  test('Footer Start studying free link goes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByRole('link', { name: /Start studying free/i }).click()
    await expect(page).toHaveURL(/\/signup/)
  })
})
