import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, login, signup } from './_helpers.js'

test.describe('/login', () => {
  test('renders login form', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
  })

  test('login round-trip: signup then re-login lands on home', async ({ page }) => {
    const creds = await signup(page)
    await page.context().clearCookies()
    await login(page, creds.email, creds.password)
    await expect(page).toHaveURL(/\/$/, { timeout: 15_000 })
  })

  test('bad credentials surface an error and stay on /login', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.locator('input[name="email"]').fill('definitely-not-a-user@example.com')
    await page.locator('input[name="password"]').fill('wrong-password')
    await page.locator('button[type="submit"]').click()
    await page.waitForTimeout(1500)
    await expect(page).toHaveURL(/\/login/)
  })
})
