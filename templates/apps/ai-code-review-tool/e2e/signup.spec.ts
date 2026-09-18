import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, captureNetwork, signup, uniqueEmail, whereUrl } from './_helpers.js'

test.describe('Signup page', () => {
  test('renders branded heading + email/password fields + submit button', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
    await expect(page.locator('[data-mol-id="signup-submit"]')).toBeVisible()
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible()
  })

  test('Show/Hide password button toggles password input type', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const pw = page.locator('#password')
    await pw.fill('Secret123!')
    await expect(pw).toHaveAttribute('type', 'password')
    await page.getByRole('button', { name: /show password/i }).click()
    await expect(pw).toHaveAttribute('type', 'text')
    await page.getByRole('button', { name: /hide password/i }).click()
    await expect(pw).toHaveAttribute('type', 'password')
  })

  test('submits POST /api/users with form data and lands on /dashboard', async ({ page }) => {
    const email = uniqueEmail('signup')
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/signup')
      await page.locator('#name').fill('Refract Tester')
      await page.locator('#email').fill(email)
      await page.locator('#password').fill('TestPass123!')
      await page.locator('[data-mol-id="signup-submit"]').click()
      await page.waitForURL(/\/dashboard/, { timeout: 15000 })
    })
    const usersPost = whereUrl(reqs, /\/api\/users(?:\?|$)/, 'POST')
    expect(usersPost.length, 'POST /api/users should fire').toBeGreaterThan(0)
    expect(usersPost[0].status, 'signup endpoint must succeed').toBe(201)
  })

  test('signup creates a user that can be confirmed via /api/users/:id', async ({
    page,
    request,
  }) => {
    const session = await signup(page)
    expect(session.accessToken, 'auth token captured from localStorage').toBeTruthy()
    expect(session.userId, 'userId captured from localStorage').toBeTruthy()
    const me = await request.get(API_BASE + '/users/' + session.userId, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    })
    expect(me.status(), 'GET /api/users/:id with token must succeed').toBe(200)
    const body = await me.json()
    const user = body.props ?? body.user ?? body
    expect(user.email).toBe(session.email)
  })

  test('duplicate signup is rejected by the backend', async ({ page, request }) => {
    const first = await signup(page)
    const dup = await request.post(API_BASE + '/users', {
      data: { email: first.email, password: 'TestPass123!', name: 'dup' },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(dup.status(), 'duplicate signup must not succeed').not.toBe(201)
  })

  test('signup links to /login for existing users', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const link = page.getByRole('link', { name: /sign in/i })
    await expect(link).toHaveAttribute('href', /\/login/)
  })

  test('email and password fields have correct types and required attributes', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const email = page.locator('#email')
    const pw = page.locator('#password')
    await expect(email).toHaveAttribute('type', 'email')
    await expect(email).toHaveAttribute('required', '')
    await expect(pw).toHaveAttribute('type', 'password')
    await expect(pw).toHaveAttribute('required', '')
  })

  test('Refract brand heading is visible (no placeholder app name)', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.getByRole('heading', { name: /^Refract$/ })).toBeVisible()
  })

  test('signup persists user immediately — read-after-write succeeds', async ({
    page,
    request,
  }) => {
    const session = await signup(page)
    expect(session.accessToken).toBeTruthy()
    expect(session.userId).toBeTruthy()
    const list = await request.get(API_BASE + '/users/' + session.userId, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    })
    expect(list.status()).toBe(200)
    const body = await list.json()
    const user = body.props ?? body.user ?? body
    expect(user.id).toBe(session.userId)
    expect(user.email).toBe(session.email)
  })
})
