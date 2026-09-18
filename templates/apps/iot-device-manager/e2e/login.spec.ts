import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, login, signup, uniqueEmail } from './_helpers.js'

test.describe('/login page', () => {
  test('Email textbox accepts user input', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.locator('input[type="email"]').first().fill('typed@example.com')
    expect(await page.locator('input[type="email"]').first().inputValue()).toBe('typed@example.com')
  })

  test('Sign In posts to /api/users/log-in and lands on /dashboard', async ({ page }) => {
    const email = uniqueEmail('login-spec')
    const password = 'TestPass!1234'
    await signup(page, email, password)
    await page.evaluate(() => window.localStorage.clear())
    const reqs = await captureNetwork(page, async () => {
      await login(page, email, password)
    })
    const sessionCall = reqs.find((r) => r.method === 'POST' && /\/api\/users\/log-in/.test(r.url))
    expect(sessionCall, 'POST /api/users/log-in').toBeTruthy()
    expect(sessionCall?.status).toBeLessThan(400)
  })

  test('Forgot password link routes to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.locator('a[href="/forgot-password"]').first().click()
    await page.waitForURL(/\/forgot-password/, { timeout: 5000 })
  })

  test('Sign Up link routes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.locator('a[href="/signup"]').first().click()
    await page.waitForURL(/\/signup/, { timeout: 5000 })
  })
})
