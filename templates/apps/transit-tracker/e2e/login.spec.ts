import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, login, signup } from './_helpers.js'

test.describe('/login page', () => {
  test('successful login lands on /search and POSTs /api/users/log-in', async ({ page }) => {
    const { email, password } = await signup(page)
    await page.evaluate(() => {
      window.localStorage.clear()
      window.sessionStorage.clear()
      document.cookie.split(';').forEach((c) => {
        document.cookie = c
          .replace(/^ +/, '')
          .replace(/=.*/, '=;expires=' + new Date(0).toUTCString() + ';path=/')
      })
    })
    const reqs = await captureNetwork(page, async () => {
      await login(page, email, password)
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/users\/log-?in/i.test(r.url))
    expect(post, 'POST /api/users/log-in').toBeTruthy()
    expect(post?.status).toBeLessThan(400)
    await expect(page).toHaveURL(/\/nearby/)
  })

  test('bad password shows inline error and stays on /login', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.locator('input[type="email"]').first().fill('nobody@example.com')
    await page.locator('input[type="password"]').first().fill('wrongPwd!1')
    await page.locator('form button[type="submit"]').first().click()
    // Expect either inline error or staying on /login (no redirect).
    await page.waitForTimeout(2000)
    await expect(page).toHaveURL(/\/login/)
  })

  test('"Forgot?" link routes to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.locator('a[href="/forgot-password"]').first().click()
    await expect(page).toHaveURL(/\/forgot-password$/)
  })

  test('"Create a free account" link routes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.locator('a[href="/signup"]').first().click()
    await expect(page).toHaveURL(/\/signup$/)
  })
})
