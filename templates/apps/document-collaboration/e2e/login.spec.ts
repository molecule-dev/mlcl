/**
 * /login — sign-in form, valid + invalid paths.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, getAccessToken, login, signup, uniqueEmail } from './_helpers.js'

test.describe('login page', () => {
  test('login form renders the expected inputs', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
  })

  test('valid login lands on /dashboard with a JWT', async ({ page }) => {
    const email = uniqueEmail('login-ok')
    const password = 'TestPass123!'
    await signup(page, email, password)
    await page.context().clearCookies()
    await login(page, email, password)
    await expect(page).toHaveURL(/\/dashboard/)
    const token = await getAccessToken(page)
    expect(token).toBeTruthy()
  })

  test('wrong password keeps the user on /login', async ({ page }) => {
    const email = uniqueEmail('login-bad')
    await signup(page, email, 'TestPass123!')
    await page.evaluate(() => window.localStorage.clear())
    await page.goto(APP_BASE + '/login')
    await page.locator('input[type="email"]').first().fill(email)
    await page.locator('input[type="password"]').first().fill('WrongPass!9')
    await page
      .getByRole('button', { name: /sign\s*in|log\s*in/i })
      .first()
      .click()
    await page.waitForTimeout(1500)
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('login — network', () => {
  test('submit triggers POST /api/users/log-in', async ({ page }) => {
    const email = uniqueEmail('login-net')
    await signup(page, email, 'TestPass123!')
    await page.evaluate(() => window.localStorage.clear())
    await page.goto(APP_BASE + '/login')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('input[type="email"]').first().fill(email)
      await page.locator('input[type="password"]').first().fill('TestPass123!')
      await page
        .getByRole('button', { name: /sign in|log in/i })
        .first()
        .click()
      await page.waitForTimeout(1500)
    })
    expect(reqs.some((r) => r.method === 'POST' && /log-in|login|users/.test(r.url))).toBe(true)
  })
})
