import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  apiHeaders,
  captureNetwork,
  getAccessToken,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('signup /signup', () => {
  test('happy path POSTs /api/users (registration) and lands on /dashboard with token', async ({
    page,
  }) => {
    const email = uniqueEmail('signup-happy')
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/signup')
      await page.locator('input[type="email"]').first().fill(email)
      await page
        .locator('input[autocomplete="new-password"], input[type="password"]')
        .first()
        .fill('TestPass!1234')
      await page.locator('form button[type="submit"]').first().click()
      await page.waitForURL('**/dashboard', { timeout: 20_000 })
    })
    const signedUp = reqs.find(
      (r) =>
        r.method === 'POST' &&
        /\/api\/users(?!\/(log-in|forgot-password|reset-password|oauth))/.test(r.url),
    )
    expect(signedUp, 'POST /api/users (registration) not observed').toBeTruthy()
    expect(signedUp!.status).toBeLessThan(300)
    const token = await getAccessToken(page)
    expect(token).toBeTruthy()
  })

  test('persisted user matches /api/users/:id (read-after-write)', async ({ page }) => {
    const { accessToken, userId, email } = await signup(page)
    expect(userId).toBeTruthy()
    const res = await page.request.get(`${API_BASE}/users/${userId}`, {
      headers: apiHeaders(accessToken),
      failOnStatusCode: false,
    })
    expect(res.status()).toBeLessThan(300)
    const body = (await res.json()) as {
      props?: { id?: string; email?: string }
      id?: string
      email?: string
    }
    const got = body.props ?? body
    expect(got.id).toBe(userId)
    expect(got.email).toBe(email)
  })

  test('email field is required (HTML5 validity)', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page
      .locator('input[autocomplete="new-password"], input[type="password"]')
      .first()
      .fill('TestPass!1234')
    await page.locator('form button[type="submit"]').first().click()
    await page.waitForTimeout(500)
    expect(page.url()).toContain('/signup')
  })

  test('Sign in link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.getByRole('link', { name: /sign in/i }).click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('Name field accepts typed text', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const name = page.locator('form input').first()
    await name.fill('Sample Name')
    await expect(name).toHaveValue('Sample Name')
  })
})
