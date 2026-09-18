import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  apiHeaders,
  API_BASE,
  captureNetwork,
  getAccessToken,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('auth: /signup → /dashboard', () => {
  test('happy path creates a user and lands on /dashboard', async ({ page }) => {
    const email = uniqueEmail('signup-ok')
    const reqs = await captureNetwork(page, async () => {
      await signup(page, email, 'TestPass!1234')
    })
    await expect(page).toHaveURL(/\/dashboard/)
    const reg = reqs.find((r) => r.method === 'POST' && /\/api\/users(?!\/log-in)/.test(r.url))
    expect(reg, 'POST /api/users registration request').toBeTruthy()
    expect(reg?.status).toBeLessThan(400)
  })

  test('email is required (HTML5 validity)', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const email = page.locator('input[type="email"]').first()
    expect(await email.evaluate((el: HTMLInputElement) => el.required)).toBe(true)
  })

  test('the persisted user matches /api/users/:id (read-after-write)', async ({ page }) => {
    const { accessToken, userId, email } = await signup(page)
    expect(userId).toBeTruthy()
    const res = await page.request.get(`${API_BASE}/users/${userId}`, {
      headers: apiHeaders(accessToken),
      failOnStatusCode: false,
    })
    expect(res.status(), await res.text()).toBeLessThan(300)
    const body = (await res.json()) as {
      props?: { id?: string; email?: string }
      id?: string
      email?: string
    }
    const got = body.props ?? body
    expect(got.id).toBe(userId)
    expect(String(got.email ?? '').toLowerCase()).toBe(email.toLowerCase())
  })
})

test.describe('auth: /login', () => {
  test('login of an existing user lands on /dashboard with a fresh token', async ({ page }) => {
    const { email, password } = await signup(page)
    await page.context().clearCookies()
    await page.evaluate(() => window.localStorage.clear())
    await page.goto(APP_BASE + '/login')
    await page.locator('input[type="email"]').first().fill(email)
    await page.locator('input[type="password"]').first().fill(password)
    await page.locator('form button[type="submit"]').first().click()
    await page.waitForURL('**/dashboard', { timeout: 15_000 })
    const tok = await getAccessToken(page)
    expect(tok).toBeTruthy()
  })
})
