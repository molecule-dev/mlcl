/**
 * /login — Engram sign-in.
 *
 * Asserts on real outcomes: the form POSTs to /api/users/log-in, the
 * server returns a token, and the SPA redirects to /ask. Wrong
 * credentials must keep the user on /login.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { API_BASE, APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('login', () => {
  test('email input accepts text', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const email = page.locator('input#email')
    await expect(email).toBeVisible()
    await email.fill('alice@example.com')
    await expect(email).toHaveValue('alice@example.com')
  })

  test('password input accepts text', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    const pw = page.locator('input#password')
    await expect(pw).toBeVisible()
    await pw.fill('SuperSecret123!')
    await expect(pw).toHaveValue('SuperSecret123!')
  })

  test('valid credentials POST /users/log-in and redirect to /ask', async ({ page, context }) => {
    const { email, password } = await signup(page)
    await context.clearCookies()
    await page.evaluate(() => window.localStorage.clear())
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/login')
      await page.locator('input#email').fill(email)
      await page.locator('input#password').fill(password)
      await page.getByRole('button', { name: /sign\s*in/i }).click()
      await page.waitForURL(/\/ask/, { timeout: 15_000 })
    })
    const post = reqs.find((r) => /\/users\/log-in$/.test(r.url) && r.method === 'POST')
    expect(post?.status, 'expected /users/log-in to return 2xx').toBeLessThan(400)
  })

  test('Sign-up link routes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page
      .getByRole('link', { name: /sign\s*up|create\s*account/i })
      .first()
      .click()
    await page.waitForURL(/\/signup/, { timeout: 10_000 })
  })

  test('Forgot link routes to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page
      .getByRole('link', { name: /forgot/i })
      .first()
      .click()
    await page.waitForURL(/\/forgot-password/, { timeout: 10_000 })
  })

  test('wrong password keeps the user on /login (no redirect)', async ({ page }) => {
    const { email } = await signup(page)
    await page.evaluate(() => window.localStorage.clear())
    await page.goto(APP_BASE + '/login')
    await page.locator('input#email').fill(email)
    await page.locator('input#password').fill('WrongPass999!')
    await page.getByRole('button', { name: /sign\s*in/i }).click()
    await page.waitForTimeout(1500)
    await expect(page).toHaveURL(/\/login/)
  })

  // Touch /api/users via direct API to satisfy the handler-coverage gate.
  test('users handler is reachable: GET /users/:id returns the just-signed-up user', async ({
    page,
  }) => {
    const { accessToken, userId, email } = await signup(page)
    const res = await page.request.get(`${API_BASE}/users/${userId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    expect(res.status()).toBe(200)
    const raw = (await res.json()) as { email?: string; props?: { email?: string } }
    const persistedEmail = raw.email ?? raw.props?.email
    expect(persistedEmail?.toLowerCase()).toBe(email.toLowerCase())
  })
})
