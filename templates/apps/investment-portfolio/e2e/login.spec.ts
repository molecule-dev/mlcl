import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, login, signup } from './_helpers.js'

test.describe('/login', () => {
  test('valid credentials redirect away from /login', async ({ page, context }) => {
    const { email, password } = await signup(page)
    await context.clearCookies()
    await page.evaluate(() => window.localStorage.clear())
    await login(page, email, password)
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 })
  })

  test('invalid credentials keep user on /login (no auto-redirect)', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.locator('input[type="email"]').first().fill('nobody@nowhere.example')
    await page.locator('input[type="password"]').first().fill('WrongPass!1234')
    await page
      .getByRole('button', { name: /sign\s*in|log\s*in/i })
      .first()
      .click()
    await page.waitForTimeout(1500)
    expect(page.url()).toMatch(/\/login/)
  })

  test('"Forgot password" link goes to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const link = page.getByRole('link', { name: /forgot/i }).first()
    if ((await link.count()) > 0) {
      await link.click()
      await expect(page).toHaveURL(/\/forgot-password/)
    }
  })
})
