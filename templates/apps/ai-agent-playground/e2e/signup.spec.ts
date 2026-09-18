import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, captureNetwork, signup, uniqueEmail, whereUrl } from './_helpers.js'

test.describe('Signup page', () => {
  test('renders Neuron heading + email/password fields + submit button', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.getByRole('heading', { name: /^Neuron$/ })).toBeVisible()
    await expect(page.locator('[data-mol-id="signup-email"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="signup-password"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="signup-submit"]')).toBeVisible()
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible()
  })

  test('email + password fields have correct types and required attrs', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const email = page.locator('[data-mol-id="signup-email"]')
    const pw = page.locator('[data-mol-id="signup-password"]')
    await expect(email).toHaveAttribute('type', 'email')
    await expect(email).toHaveAttribute('required', '')
    await expect(pw).toHaveAttribute('type', 'password')
    await expect(pw).toHaveAttribute('required', '')
  })

  test('show/hide password toggle flips input type', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const pw = page.locator('[data-mol-id="signup-password"]')
    await pw.fill('Secret123!')
    await expect(pw).toHaveAttribute('type', 'password')
    const toggle = page.locator('[data-mol-id="signup-password"] ~ button').first()
    await toggle.click()
    await expect(pw).toHaveAttribute('type', 'text')
    await toggle.click()
    await expect(pw).toHaveAttribute('type', 'password')
  })

  test('submits POST /api/users with form data and lands on /dashboard', async ({ page }) => {
    const email = uniqueEmail('signup')
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/signup')
      await page.locator('[data-mol-id="signup-email"]').fill(email)
      await page.locator('[data-mol-id="signup-password"]').fill('TestPass123!')
      await page.locator('[data-mol-id="signup-submit"]').click()
      await page.waitForURL(/\/dashboard/, { timeout: 15000 })
    })
    const usersPost = whereUrl(reqs, /\/api\/users(?:\?|$)/, 'POST')
    expect(usersPost.length, 'POST /api/users should fire').toBeGreaterThan(0)
    expect(usersPost[0].status, 'signup endpoint must succeed').toBe(201)
  })

  test('signup persists user immediately — read-after-write succeeds', async ({
    page,
    request,
  }) => {
    const session = await signup(page)
    expect(session.accessToken, 'auth token captured from signup response').toBeTruthy()
    expect(session.userId, 'userId captured from signup response').toBeTruthy()
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
      data: { email: first.email, password: 'TestPass123!' },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(dup.status(), 'duplicate signup must not succeed').not.toBe(201)
  })

  test('signup links to /login for existing users', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const link = page.getByRole('link', { name: /sign in/i })
    await expect(link).toHaveAttribute('href', /\/login/)
  })
})
