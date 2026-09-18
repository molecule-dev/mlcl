/**
 * /signup — Engram account creation.
 *
 * Asserts on real outcomes: the form POSTs to /api/users, persists an
 * accessToken in localStorage, and redirects to /ask.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'
import {
  API_BASE,
  APP_BASE,
  captureNetwork,
  getAccessToken,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('signup', () => {
  test('first-name input accepts text', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.locator('input#firstName').fill('Ada')
    await expect(page.locator('input#firstName')).toHaveValue('Ada')
  })

  test('last-name input accepts text', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.locator('input#lastName').fill('Lovelace')
    await expect(page.locator('input#lastName')).toHaveValue('Lovelace')
  })

  test('email input accepts text', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const email = uniqueEmail('ada')
    await page.locator('input#email').fill(email)
    await expect(page.locator('input#email')).toHaveValue(email)
  })

  test('password input accepts text', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.locator('input#password').fill('TestPass123!')
    await expect(page.locator('input#password')).toHaveValue('TestPass123!')
  })

  test('confirm input accepts text', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.locator('input#confirm').fill('TestPass123!')
    await expect(page.locator('input#confirm')).toHaveValue('TestPass123!')
  })

  test('submitting POSTs /api/users, persists token, redirects to /ask', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await signup(page)
    })
    const post = reqs.find((r) => /\/users\/?$/.test(r.url) && r.method === 'POST')
    expect(post?.status, 'expected /users to return 2xx').toBeLessThan(400)
    expect(page.url()).toMatch(/\/ask/)
    const token = await getAccessToken(page)
    expect(token).toBeTruthy()
  })

  test('Sign in link routes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page
      .getByRole('link', { name: /sign\s*in/i })
      .first()
      .click()
    await page.waitForURL(/\/login/, { timeout: 10_000 })
  })

  // Read-after-write through GET /users/:id to confirm the row landed.
  test('after signup GET /users/:id returns the new row (read-after-write)', async ({ page }) => {
    const { accessToken, userId, email } = await signup(page)
    const me = await page.request.get(`${API_BASE}/users/${userId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    expect(me.status()).toBe(200)
    const raw = (await me.json()) as { email?: string; props?: { email?: string } }
    const persistedEmail = raw.email ?? raw.props?.email
    expect(persistedEmail?.toLowerCase()).toBe(email.toLowerCase())
  })
})
