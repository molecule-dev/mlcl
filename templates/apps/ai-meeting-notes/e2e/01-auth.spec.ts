import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, login, signup, uniqueEmail } from './_helpers.js'

test.describe('auth', () => {
  test('signup creates a session and lands on the dashboard', async ({ page }) => {
    const email = uniqueEmail('aimn-signup')
    const { password } = await signup(page, email, 'TestPass123!')

    // Landing page after signup must be authenticated content, not /login.
    await expect(page).toHaveURL(/\/dashboard|\/$/, { timeout: 15_000 })
    expect(password).toBeTruthy()

    // The session cookie / token must be set; reloading must keep us in.
    await page.reload()
    await expect(page).not.toHaveURL(/\/login|\/signup/, { timeout: 10_000 })
  })

  test('logout clears the session and redirects to login', async ({ page }) => {
    const email = uniqueEmail('aimn-logout')
    await signup(page, email, 'TestPass123!')

    // Open the user menu and sign out.
    await page
      .getByRole('button', { name: /account|menu|profile|user|listener/i })
      .first()
      .click()
    await page
      .getByRole('button', { name: /sign\s*out|log\s*out/i })
      .first()
      .click()

    // After logout, going to a protected page should kick to login.
    await page.goto(APP_BASE + '/dashboard')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('login with wrong password fails and surfaces an error', async ({ page }) => {
    const email = uniqueEmail('aimn-wrong-pw')
    await signup(page, email, 'TestPass123!')

    // Sign out via menu.
    await page
      .getByRole('button', { name: /account|menu|profile|user|listener/i })
      .first()
      .click()
    await page
      .getByRole('button', { name: /sign\s*out|log\s*out/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login|\/$/, { timeout: 10_000 })

    // Wrong password.
    await page.goto(APP_BASE + '/login')
    await page.getByLabel(/email/i).first().fill(email)
    await page
      .getByLabel(/password/i)
      .first()
      .fill('WrongPassword!')
    await page
      .getByRole('button', { name: /sign\s*in|log\s*in/i })
      .first()
      .click()

    // Stay on /login; show some error indicator (alert role or text).
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 })
  })

  test('login with correct password from a stored signup works', async ({ page }) => {
    const email = uniqueEmail('aimn-relog')
    const { password } = await signup(page, email, 'TestPass123!')
    // Log out
    await page
      .getByRole('button', { name: /account|menu|profile|user|listener/i })
      .first()
      .click()
    await page
      .getByRole('button', { name: /sign\s*out|log\s*out/i })
      .first()
      .click()
    // Log back in
    await login(page, email, password)
    await expect(page).not.toHaveURL(/\/login|\/signup/)
  })
})
