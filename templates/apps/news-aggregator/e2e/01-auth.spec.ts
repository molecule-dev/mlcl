import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, login, signup, uniqueEmail } from './_helpers.js'

test.describe('auth', () => {
  test('signup creates a session and lands on /home', async ({ page }) => {
    const email = uniqueEmail('na-signup')
    const { password } = await signup(page, email, 'TestPass123!')

    await expect(page).toHaveURL(/\/home/, { timeout: 15_000 })
    expect(password).toBeTruthy()

    // Reload preserves the session — token persists, no kick to login.
    await page.reload()
    await expect(page).not.toHaveURL(/\/login|\/signup/, { timeout: 10_000 })
    await expect(page).toHaveURL(/\/home/)
  })

  test('logout clears the session — protected route bounces to /login', async ({ page }) => {
    const email = uniqueEmail('na-logout')
    await signup(page, email, 'TestPass123!')

    await page.goto(APP_BASE + '/settings')
    await page
      .getByRole('button', { name: /sign\s*out|log\s*out/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })

    await page.goto(APP_BASE + '/settings')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('login with wrong password fails and stays on /login', async ({ page }) => {
    const email = uniqueEmail('na-wrong-pw')
    await signup(page, email, 'TestPass123!')

    await page.goto(APP_BASE + '/settings')
    await page
      .getByRole('button', { name: /sign\s*out|log\s*out/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })

    await page.getByLabel(/email/i).first().fill(email)
    await page
      .getByLabel(/password/i)
      .first()
      .fill('WrongPassword!')
    await page
      .getByRole('button', { name: /sign\s*in|log\s*in/i })
      .first()
      .click()

    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 })
  })

  test('login with correct password works after sign-out', async ({ page }) => {
    const email = uniqueEmail('na-relog')
    const { password } = await signup(page, email, 'TestPass123!')
    await page.goto(APP_BASE + '/settings')
    await page
      .getByRole('button', { name: /sign\s*out|log\s*out/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })

    await login(page, email, password)
    await expect(page).toHaveURL(/\/home/, { timeout: 10_000 })
  })
})
