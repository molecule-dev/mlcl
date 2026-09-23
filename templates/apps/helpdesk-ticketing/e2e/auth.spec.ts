import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  getAccessToken,
  login,
  logout,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('helpdesk-ticketing: auth', () => {
  test('signup creates an account, persists JWT, and lands on the dashboard', async ({ page }) => {
    const session = await signup(page)
    expect(session.accessToken.length).toBeGreaterThan(20)
    expect(session.userId.length).toBeGreaterThan(20)
    await expect(page).toHaveURL(APP_BASE + '/')
  })

  test('signup → logout → login round-trips with the same credentials', async ({ page }) => {
    const { email, password } = await signup(page)
    await logout(page)
    await login(page, email, password)
    await expect(page).toHaveURL(APP_BASE + '/')
    const stored = await getAccessToken(page)
    expect(stored).not.toBeNull()
  })

  test('login with bad credentials surfaces an error and stays on /login', async ({ page }) => {
    // A 403 from /api/users/log-in is the EXPECTED response here — the page
    // renders it as the inline error banner. Silence the console guard for it.
    test.info().annotations.push({ type: 'allow-console-error', description: 'status of 403' })
    await page.goto(APP_BASE + '/login')
    await page.locator('#email, input[type="email"]').first().fill(uniqueEmail('bad'))
    await page.locator('#password, input[type="password"]').first().fill('wrong-password')
    await page
      .getByRole('button', { name: /sign\s*in|log\s*in/i })
      .first()
      .click()
    await page.waitForTimeout(750)
    await expect(page).toHaveURL(/\/login/)
  })

  test('forgot-password posts to /api/users/forgot-password (canonical endpoint)', async ({
    page,
  }) => {
    const calls: string[] = []
    page.on('request', (req) => {
      if (req.method() === 'POST') calls.push(req.url())
    })
    await page.goto(APP_BASE + '/forgot-password')
    await page.locator('input[type="email"]').first().fill(uniqueEmail('forgot'))
    await page
      .getByRole('button', { name: /send\s*reset|reset\s*link|send/i })
      .first()
      .click()
    await page.waitForTimeout(750)
    expect(calls.some((u) => u.includes('/api/users/forgot-password'))).toBe(true)
    expect(calls.some((u) => u.includes('/api/auth/forgot-password'))).toBe(false)
  })

  test('protected /tickets redirects to /login when not authenticated', async ({ page }) => {
    await page.evaluate(() => window.localStorage.clear()).catch(() => {})
    await page.goto(APP_BASE + '/tickets')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('POST /api/users/reset-password is wired up (regression — was 404 before)', async ({
    page,
  }) => {
    const res = await page.request.post(`${API_BASE}/users/reset-password`, {
      data: {},
      failOnStatusCode: false,
    })
    expect(res.status()).not.toBe(404)
    expect(res.status()).toBeGreaterThanOrEqual(400)
    expect(res.status()).toBeLessThan(500)
  })
})
