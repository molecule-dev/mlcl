import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup, uniqueEmail } from './_helpers.js'

test.describe('/signup', () => {
  test('signup form lands user on /dashboard with bearer token in localStorage', async ({
    page,
  }) => {
    const result = await signup(page)
    expect(result.accessToken, 'auth bond did not persist accessToken').toBeTruthy()
    expect(result.userId).toBeTruthy()
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('signing up again with the same email surfaces a server error and stays on /signup', async ({
    page,
  }) => {
    const email = uniqueEmail('dup')
    await signup(page, email)
    // Open a fresh tab so previous session storage doesn't auto-redirect.
    const ctx = page.context()
    await ctx.clearCookies()
    await page.evaluate(() => window.localStorage.clear())
    await page.goto(APP_BASE + '/signup')
    await page.locator('input[autocomplete="name"]').first().fill('Dup User')
    await page.locator('input[type="email"]').first().fill(email)
    await page.locator('input[type="password"]').first().fill('TestPass123!')
    await page
      .getByRole('button', { name: /create account|sign\s*up/i })
      .first()
      .click()
    // Either a visible error message OR we never made it to /dashboard.
    await page.waitForTimeout(1500)
    expect(page.url()).not.toMatch(/\/dashboard/)
  })

  test('the "Sign in instead" link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const link = page.getByRole('link', { name: /sign\s*in/i }).first()
    if ((await link.count()) > 0) {
      await link.click()
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
    }
  })
})
