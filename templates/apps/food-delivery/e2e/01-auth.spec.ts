import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, login, signup, uniqueEmail } from './_helpers.js'

test.describe('auth', () => {
  test('signup creates a session and lands on an authenticated page', async ({ page }) => {
    const email = uniqueEmail('fd-signup')
    const { password } = await signup(page, email, 'TestPass123!')

    // After signup, food-delivery navigates to '/' (Landing). Whatever we
    // land on must NOT be /signup or /login.
    await expect(page).not.toHaveURL(/\/signup|\/login/, { timeout: 15_000 })
    expect(password).toBeTruthy()

    // Reload preserves the session — we should not be bounced to /login.
    await page.reload()
    await expect(page).not.toHaveURL(/\/login|\/signup/, { timeout: 10_000 })
  })

  test('protected routes require auth and authed user can reach them', async ({ page }) => {
    const email = uniqueEmail('fd-protected')
    await signup(page, email, 'TestPass123!')

    // Navigate to a protected route — should land there, not /login.
    await page.goto(APP_BASE + '/restaurants')
    await expect(page).toHaveURL(/\/restaurants/, { timeout: 10_000 })
    // We should see at least one restaurant card (seeded data must hydrate).
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('logout clears the session and protected routes redirect to /login', async ({ page }) => {
    const email = uniqueEmail('fd-logout')
    await signup(page, email, 'TestPass123!')
    await page.goto(APP_BASE + '/restaurants')
    await expect(page).toHaveURL(/\/restaurants/)

    // Open user menu → Log out (food-delivery uses a Modal-based SettingsPanel).
    await page
      .getByRole('button', { name: /open\s*user\s*menu|user|profile|menu|account/i })
      .first()
      .click()
    await page
      .getByRole('button', { name: /log\s*out|sign\s*out/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })

    // After logout, hitting a protected route should bounce to /login.
    await page.goto(APP_BASE + '/restaurants')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('login with wrong password fails and stays on /login', async ({ page }) => {
    const email = uniqueEmail('fd-wrong-pw')
    await signup(page, email, 'TestPass123!')

    // Open user menu → Log out.
    await page
      .getByRole('button', { name: /open\s*user\s*menu|user|profile|menu|account/i })
      .first()
      .click()
    await page
      .getByRole('button', { name: /log\s*out|sign\s*out/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })

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
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 })
  })

  test('login with correct password from a stored signup works', async ({ page }) => {
    const email = uniqueEmail('fd-relog')
    const { password } = await signup(page, email, 'TestPass123!')
    await page
      .getByRole('button', { name: /open\s*user\s*menu|user|profile|menu|account/i })
      .first()
      .click()
    await page
      .getByRole('button', { name: /log\s*out|sign\s*out/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
    await login(page, email, password)
    await expect(page).not.toHaveURL(/\/login|\/signup/)
  })
})
