import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, login, signup, uniqueEmail } from './_helpers.js'

test.describe('Login', () => {
  test('valid creds → dashboard, persists across reload', async ({ page }) => {
    const email = uniqueEmail('login')
    const { password } = await signup(page, email)
    await page.evaluate(() => window.localStorage.clear())
    await page.context().clearCookies()
    await login(page, email, password)
    await expect(page).toHaveURL(/\/(dashboard|maps|home)/)
    await page.reload()
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('rejects bad password', async ({ page }) => {
    const email = uniqueEmail('badpw')
    await signup(page, email)
    await page.evaluate(() => window.localStorage.clear())
    await page.context().clearCookies()
    await page.goto(APP_BASE + '/login')
    await page.locator('input#login-email').fill(email)
    await page.locator('input#login-password').fill('NotTheRealPassword!1234')
    await page.locator('form button[type="submit"]').click()
    await page.waitForTimeout(800)
    await expect(page).toHaveURL(/\/login/)
  })
})
