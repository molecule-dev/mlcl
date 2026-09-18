import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers'

/**
 * /signup, /login, /forgot-password, /reset-password — proves the auth
 * shell actually drives the molecule auth bonds and that real backend
 * endpoints respond, not just that the form rendered. Past failure mode
 * (per flagship-production-ready.md): a forgot-password handler that
 * logs the error and returns 200 anyway. We assert the POST happens AND
 * the user sees feedback.
 */

test.describe('/signup', () => {
  test('renders the signup form with name + email + password inputs', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.locator('input[autocomplete="name"]')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[autocomplete="new-password"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible()
  })

  test('successful signup creates a user row, stores a session, lands on /dashboard', async ({
    page,
  }) => {
    const { email } = await signup(page)
    await expect(page).toHaveURL(/\/dashboard/)
    // Backend invariant: GET /api/profiles/me returns the new user
    const me = await page.evaluate(async () => {
      const r = await fetch('/api/profiles/me')
      return r.json()
    })
    expect(me.email).toBe(email)
    expect(me.id).toMatch(/^[0-9a-f-]+$/)
  })

  test('duplicate signup rejects with a real error response', async ({ page }) => {
    const { email, password } = await signup(page)
    // Open a fresh context-less page and try to sign up the same email
    await page.context().clearCookies()
    await page.goto(APP_BASE + '/signup')
    await page.locator('input[autocomplete="name"]').fill('Other')
    await page.locator('input[type="email"]').fill(email)
    await page.locator('input[autocomplete="new-password"]').fill(password)
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /create account/i }).click()
      // Either an inline error appears OR the URL stays on /signup
      await page.waitForTimeout(2000)
    })
    const signupCall = reqs.find(
      (r) => /\/api\/users(\/sign-up|\/?$)/.test(r.url) && r.method === 'POST',
    )
    expect(signupCall, 'signup must POST to /api/users').toBeTruthy()
    expect(signupCall!.status, 'second signup must reject').toBeGreaterThanOrEqual(400)
    await expect(page).toHaveURL(/\/signup/)
  })
})

test.describe('/login', () => {
  test('renders the email + password form', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /enter|sign in|log in/i }).first()).toBeVisible()
  })

  test('rejects bad credentials with a 4xx and stays on /login', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page
      .locator('input[type="email"]')
      .fill('definitely-not-real-' + Date.now() + '@example.com')
    await page.locator('input[type="password"]').fill('definitely-wrong')
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /enter|sign in|log in/i })
        .first()
        .click()
      await expect(
        page.locator('text=/invalid|incorrect|wrong|not found|error|unauthorized/i').first(),
      ).toBeVisible({ timeout: 10_000 })
    })
    const loginCall = reqs.find((r) => /\/api\/users\/log-in/.test(r.url) && r.method === 'POST')
    expect(loginCall, 'login form must POST to /api/users/log-in').toBeTruthy()
    expect(loginCall!.status).toBeGreaterThanOrEqual(400)
    await expect(page).toHaveURL(/\/login/)
  })

  test('valid credentials sign back in after sign-out (round-trip)', async ({ page }) => {
    const { email, password } = await signup(page)
    await page.context().clearCookies()
    await page.goto(APP_BASE + '/login')
    await page.locator('input[type="email"]').fill(email)
    await page.locator('input[type="password"]').fill(password)
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /enter|sign in|log in/i })
        .first()
        .click()
      await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 })
    })
    const okLogin = reqs.find(
      (r) => /\/api\/users\/log-in/.test(r.url) && r.method === 'POST' && r.status < 400,
    )
    expect(okLogin, 'second login must succeed at backend').toBeTruthy()
  })
})

test.describe('/forgot-password', () => {
  test('renders the email form and submits to a real backend endpoint', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10_000 })
    await page.locator('input[type="email"]').fill(uniqueEmail('fp'))
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /send.*reset|sending/i }).click()
      // Either success OR error visible — never silent
      const ok = page.getByText(/wired|sent|check your email|reset link/i).first()
      const err = page.getByText(/invalid|error|failed|unable/i).first()
      await expect(ok.or(err)).toBeVisible({ timeout: 15_000 })
    })
    const fp = reqs.find((r) => /\/api\/users\/forgot-password/.test(r.url) && r.method === 'POST')
    expect(fp, 'forgot form must POST to /api/users/forgot-password').toBeTruthy()
  })
})

test.describe('/reset-password', () => {
  test('without a token, renders a "missing token" error (does not crash)', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await expect(page.getByText(/missing|invalid|request.*new/i).first()).toBeVisible({
      timeout: 10_000,
    })
  })
})

test.describe('AuthGuard', () => {
  test('unauthenticated /dashboard is redirected to /login', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto(APP_BASE + '/dashboard')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('unauthenticated /campaign/new is redirected to /login', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto(APP_BASE + '/campaign/new')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })
})
