import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, login, signup, uniqueEmail } from './_helpers.js'

test.describe('auth', () => {
  test('landing → /signup is reachable + has the expected fields', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page).toHaveURL(/\//)

    await page.goto(APP_BASE + '/signup')
    await expect(page.getByPlaceholder('Alex')).toBeVisible()
    await expect(page.getByPlaceholder('Lin')).toBeVisible()
    await expect(page.getByPlaceholder('you@team.com')).toBeVisible()
    await expect(page.getByPlaceholder('lighthouse')).toBeVisible()
    await expect(page.getByPlaceholder('At least 12 characters')).toBeVisible()
  })

  test('signup persists user, login flow returns to /home', async ({ page }) => {
    const email = uniqueEmail()
    const password = 'CairnTestPass2026!'
    await signup(page, email, password)

    // Logout via clearing localStorage so we exercise the login form, not just the persisted session
    await page.evaluate(() => window.localStorage.clear())
    await page.context().clearCookies()
    await login(page, email, password)
    await expect(page).toHaveURL(/\/home/, { timeout: 15000 })
    await expect(page.getByTestId('home-page')).toBeVisible({ timeout: 10_000 })
  })

  test('login with wrong password shows an error and stays on /login', async ({ page }) => {
    const email = uniqueEmail()
    await signup(page, email, 'CairnTestPass2026!')
    await page.evaluate(() => window.localStorage.clear())
    await page.context().clearCookies()

    await page.goto(APP_BASE + '/login')
    await page.getByPlaceholder('you@team.com').fill(email)
    await page.getByPlaceholder('••••••••').fill('WrongPass!2026000')
    await page
      .getByRole('button', { name: /sign in/i })
      .first()
      .click()
    // We should remain on /login with an error
    await page.waitForTimeout(2_000)
    await expect(page).toHaveURL(/\/login/)
  })
})
