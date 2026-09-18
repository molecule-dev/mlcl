import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, getAccessToken, login, signup, uniqueEmail } from './_helpers.js'

test.describe('auth: signup → dashboard, login round-trip', () => {
  test('signup lands on /dashboard with token + user persisted', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await signup(page)
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/users(?!\/log-?in)/.test(r.url))
    expect(post, 'POST /api/users (signup)').toBeTruthy()
    expect(post?.status).toBeLessThan(400)
    await expect(page).toHaveURL(/\/dashboard/)
    const token = await getAccessToken(page)
    expect(token, 'JWT present in auth cookie after signup').toBeTruthy()
  })

  test('login round-trip: signup, clear storage, log in again', async ({ page }) => {
    const { email, password } = await signup(page)
    await page.evaluate(() => {
      window.localStorage.clear()
      window.sessionStorage.clear()
    })
    const reqs = await captureNetwork(page, async () => {
      await login(page, email, password)
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/users\/log-?in/.test(r.url))
    expect(post, 'POST /api/users/log-in').toBeTruthy()
    expect(post?.status).toBeLessThan(400)
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('bad password stays on /login', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.locator('input[type="email"]').first().fill(uniqueEmail('nope'))
    await page.locator('input[type="password"]').first().fill('wrongPass!9')
    await page.locator('form button[type="submit"]').first().click()
    await page.waitForTimeout(1500)
    await expect(page).toHaveURL(/\/login/)
  })

  test('login page links route to forgot-password and signup', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.locator('a[href="/forgot-password"]').first().click()
    await expect(page).toHaveURL(/\/forgot-password$/)
    await page.goto(APP_BASE + '/login')
    await page.locator('a[href="/signup"]').first().click()
    await expect(page).toHaveURL(/\/signup$/)
  })
})
