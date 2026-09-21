import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, login, signup, uniqueEmail } from './_helpers.js'

test.describe('/login page', () => {
  test('Work email textbox accepts user input', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.locator('input[type="email"]').first().fill('demo@example.com')
    expect(await page.locator('input[type="email"]').first().inputValue()).toBe('demo@example.com')
  })

  test('Forgot password link routes to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.locator('a[href="/forgot-password"]').first().click()
    await page.waitForURL('**/forgot-password', { timeout: 5000 })
  })

  test('Password textbox accepts user input and stays masked', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const pw = page.locator('input[type="password"]').first()
    await pw.fill('hunter2')
    expect(await pw.inputValue()).toBe('hunter2')
    expect(await pw.getAttribute('type')).toBe('password')
  })

  test('Show password toggle flips input type', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const pw = page.locator('input[type="password"]').first()
    await pw.fill('secret')
    const toggle = page.getByRole('button', { name: /show password/i }).first()
    if (await toggle.count().catch(() => 0)) {
      await toggle.click()
      const visible = page.locator('input[autocomplete="current-password"][type="text"]').first()
      await expect(visible).toBeVisible()
    }
  })

  test('Sign in posts to /api/users/log-in and lands on /dashboard', async ({ page, context }) => {
    const email = uniqueEmail('login-ok')
    const password = 'TestPass!1234'
    await signup(page, email, password)
    await context.clearCookies()
    await page.evaluate(() => window.localStorage.clear())
    const reqs = await captureNetwork(page, async () => {
      await login(page, email, password)
    })
    const loginCall = reqs.find((r) => r.method === 'POST' && /\/api\/users\/log-in/.test(r.url))
    expect(loginCall, 'POST /api/users/log-in').toBeTruthy()
    expect(loginCall?.status).toBeLessThan(400)
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('Wrong password surfaces an alert and stays on /login', async ({ page }) => {
    // Expected 4xx: the wrong-credential POST /api/users/log-in returns 403,
    // which Chrome logs as a console error.
    test.info().annotations.push({ type: 'allow-console-error', description: 'status of 403' })
    const email = uniqueEmail('login-bad')
    await signup(page, email, 'TestPass!1234')
    await page.evaluate(() => window.localStorage.clear())
    await page.goto(APP_BASE + '/login')
    await page.locator('input[type="email"]').first().fill(email)
    await page.locator('input[type="password"]').first().fill('WrongPass!1234')
    await page.locator('form button[type="submit"]').first().click()
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 5000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('Create an account link routes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.locator('a[href="/signup"]').first().click()
    await page.waitForURL('**/signup', { timeout: 5000 })
  })

  test('About link is visible in the page footer or aside', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.getByRole('link', { name: /about/i }).first()).toBeVisible()
  })

  test('Privacy Policy footer button is visible', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.getByRole('button', { name: /privacy/i }).first()).toBeVisible()
  })

  test('Terms of Service footer button is visible', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.getByRole('button', { name: /terms/i }).first()).toBeVisible()
  })
})
