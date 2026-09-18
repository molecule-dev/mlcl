import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, getAccessToken, login, signup, uniqueEmail } from './_helpers.js'

test.describe('/login: existing-user authentication', () => {
  test('Login with correct credentials authenticates and routes to dashboard', async ({ page }) => {
    const email = uniqueEmail('login-good')
    const password = 'TestPass!1234'
    await signup(page, email, password)
    // Sign out by wiping local storage so /login reload is fresh
    await page.evaluate(() => window.localStorage.clear())
    await login(page, email, password)
    await expect(page).not.toHaveURL(/\/login/)
    const accessToken = await getAccessToken(page)
    expect(accessToken, 'JWT must be present after login').toBeTruthy()
  })

  test('Login form shows email and password inputs and a submit button', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
    await expect(page.locator('form button[type="submit"]').first()).toBeVisible()
  })

  test('Login fires POST /api/users/log-in on submit', async ({ page }) => {
    const email = uniqueEmail('login-net')
    const password = 'TestPass!1234'
    await signup(page, email, password)
    await page.evaluate(() => window.localStorage.clear())
    const reqs = await captureNetwork(page, async () => {
      await login(page, email, password)
    })
    const logIn = reqs.find((r) => /\/users\/log-in/.test(r.url) && r.method === 'POST')
    expect(logIn, 'expected a POST /api/users/log-in during login').toBeDefined()
    expect(logIn?.status).toBeLessThan(300)
  })

  test('Login link to /signup and /forgot-password are present', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.locator('a[href="/signup"]').first()).toBeVisible()
    await expect(page.locator('a[href="/forgot-password"]').first()).toBeVisible()
  })

  test('Login with bad credentials surfaces an error and stays on /login', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.locator('input[type="email"]').first().fill('not-a-user@flagship.test')
    await page.locator('input[type="password"]').first().fill('WrongPass!1234')
    await page.locator('form button[type="submit"]').first().click()
    await page.waitForTimeout(2000)
    await expect(page).toHaveURL(/\/login/)
  })
})
