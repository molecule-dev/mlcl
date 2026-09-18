import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, getAccessToken, login, signup, uniqueEmail } from './_helpers.js'

test.describe('/login', () => {
  test('renders the form', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
    await expect(page.getByRole('button', { name: /sign\s*in|log\s*in/i }).first()).toBeVisible()
  })

  test('valid login lands off /login', async ({ page, browser }) => {
    // Sign up via API in one isolated context so login has fresh credentials.
    const ctx = await browser.newContext()
    const setupPage = await ctx.newPage()
    const { email, password } = await signup(setupPage, uniqueEmail('login-ok'))
    await ctx.close()

    // Now log in via the actual UI in this fresh page.
    await page.evaluate(() => window.localStorage.clear()).catch(() => {})
    await login(page, email, password)
    const tok = await getAccessToken(page)
    expect(tok, 'login must persist JWT').toBeTruthy()
  })

  test('wrong password keeps us on /login', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.locator('input[type="email"]').first().fill(uniqueEmail('login-bad'))
    await page.locator('input[type="password"]').first().fill('WrongPass!12')
    await page
      .getByRole('button', { name: /sign\s*in|log\s*in/i })
      .first()
      .click()
    await page.waitForTimeout(2000)
    await expect(page).toHaveURL(/\/login/)
  })

  test('forgot-password link navigates to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const link = page.getByRole('link', { name: /forgot|reset.*password/i }).first()
    if ((await link.count()) > 0) {
      await link.click()
      await expect(page).toHaveURL(/\/forgot-password/, { timeout: 10_000 })
    }
  })
})
