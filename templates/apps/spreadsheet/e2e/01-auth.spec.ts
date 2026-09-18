import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, login, signup, uniqueEmail } from './_helpers.js'

test.describe('auth', () => {
  test('signup creates a session and lands on workbooks', async ({ page }) => {
    const email = uniqueEmail('sheet-signup')
    const { password } = await signup(page, email, 'TestPass123!')

    // After signup we should be on an authenticated page (workbooks).
    await expect(page).toHaveURL(/\/workbooks|\/$/, { timeout: 15000 })
    expect(password).toBeTruthy()

    // Reload preserves the session — should not bounce to /login.
    await page.reload()
    await expect(page).not.toHaveURL(/\/login|\/signup/, { timeout: 10000 })
  })

  test('logout clears the session and protected routes redirect to /login', async ({ page }) => {
    await signup(page, uniqueEmail('sheet-logout'), 'TestPass123!')

    // Sidebar has a dedicated Sign out button.
    await page
      .getByRole('button', { name: /sign\s*out|log\s*out/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login|\/$/, { timeout: 10000 })

    await page.goto(APP_BASE + '/workbooks')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('login with wrong password keeps user on /login', async ({ page }) => {
    const email = uniqueEmail('sheet-wrong-pw')
    await signup(page, email, 'TestPass123!')

    await page
      .getByRole('button', { name: /sign\s*out|log\s*out/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login|\/$/, { timeout: 10000 })

    await page.goto(APP_BASE + '/login')
    await page.getByLabel(/email/i).first().fill(email)
    await page
      .getByLabel(/password/i)
      .first()
      .fill('WrongPassword!!')
    await page
      .getByRole('button', { name: /sign\s*in|log\s*in/i })
      .first()
      .click()

    await expect(page).toHaveURL(/\/login/, { timeout: 5000 })
  })

  test('login with correct password from a prior signup works', async ({ page }) => {
    const email = uniqueEmail('sheet-relog')
    const { password } = await signup(page, email, 'TestPass123!')
    await page
      .getByRole('button', { name: /sign\s*out|log\s*out/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login|\/$/, { timeout: 10000 })

    await login(page, email, password)
    await expect(page).not.toHaveURL(/\/login|\/signup/, { timeout: 10000 })
  })
})
