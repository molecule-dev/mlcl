import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  apiSignup,
  authedApi,
  captureNetwork,
  signup,
  uniqueEmail,
  uniqueHandle,
  whereUrl,
} from './_helpers.js'

test.describe('Signup page (/signup)', () => {
  test('renders branded heading + first/last/handle/email/password fields + submit', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.getByRole('heading', { name: /^Fugue$/ })).toBeVisible()
    await expect(page.locator('#signup-first')).toBeVisible()
    await expect(page.locator('#signup-last')).toBeVisible()
    await expect(page.locator('#signup-handle')).toBeVisible()
    await expect(page.locator('#signup-email')).toBeVisible()
    await expect(page.locator('#signup-password')).toBeVisible()
    await expect(page.locator('#signup-confirm')).toBeVisible()
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible()
  })

  test('submits POST /api/users with form data and redirects to /dashboard', async ({ page }) => {
    const email = uniqueEmail('signup-flow')
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/signup')
      await page.locator('#signup-first').fill('Aria')
      await page.locator('#signup-last').fill('Vega')
      await page.locator('#signup-handle').fill(uniqueHandle('signup'))
      await page.locator('#signup-email').fill(email)
      await page.locator('#signup-password').fill('TestPass123!')
      await page.locator('#signup-confirm').fill('TestPass123!')
      await page.getByRole('button', { name: /create account/i }).click()
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
    expect(session.accessToken, 'auth token captured from auth cookie').toBeTruthy()
    expect(session.userId, 'userId captured from signup response').toBeTruthy()
    const me = await request.get(API_BASE + '/users/' + session.userId, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    })
    expect(me.status(), 'GET /api/users/:id with token must succeed').toBe(200)
    const body = await me.json()
    const user = body.props ?? body.user ?? body
    expect(user.email).toBe(session.email)
  })

  test('handle entered at signup persists into /api/preferences', async ({ page, request }) => {
    const handle = uniqueHandle('signup')
    const session = await signup(page, { handle })
    const api = authedApi(request, session.accessToken!)
    // Preference write happens after signup completes — wait briefly for the
    // background PUT to land. The dashboard load also triggers the request,
    // so the data is typically present by the time we GET.
    await page.waitForTimeout(500)
    const res = await api.get('/preferences')
    expect(res.status()).toBe(200)
    const body = (await res.json()) as { data?: Record<string, unknown> }
    expect(body.data?.handle, 'handle should be persisted to preferences').toBe(handle)
  })

  test('mismatched passwords surface a client-side alert and do NOT POST /api/users', async ({
    page,
  }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/signup')
      await page.locator('#signup-first').fill('Mis')
      await page.locator('#signup-last').fill('Match')
      await page.locator('#signup-email').fill(uniqueEmail('mismatch'))
      await page.locator('#signup-password').fill('Pass1234!')
      await page.locator('#signup-confirm').fill('OtherPass1234!')
      await page.getByRole('button', { name: /create account/i }).click()
      await expect(page.getByRole('alert')).toContainText(/don.?t match/i)
    })
    const usersPost = whereUrl(reqs, /\/api\/users(?:\?|$)/, 'POST')
    expect(usersPost.length, 'POST /api/users should NOT fire on mismatch').toBe(0)
  })

  test('Show password toggle flips type=password to type=text', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const pw = page.locator('#signup-password')
    await pw.fill('Secret123!')
    await expect(pw).toHaveAttribute('type', 'password')
    await page.getByRole('button', { name: /show password/i }).click()
    await expect(pw).toHaveAttribute('type', 'text')
  })

  test('duplicate signup is rejected by the backend', async ({ page, request }) => {
    const first = await signup(page)
    const dup = await request.post(API_BASE + '/users', {
      data: {
        email: first.email,
        password: 'TestPass123!',
        name: 'Duplicate',
      },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(dup.status(), 'duplicate signup must not succeed').not.toBe(201)
  })

  test('signup links to /login for existing users', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const link = page.getByRole('link', { name: /sign in/i })
    await expect(link).toHaveAttribute('href', /\/login/)
  })

  test('email is required and typed=email', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const email = page.locator('#signup-email')
    await expect(email).toHaveAttribute('type', 'email')
    await expect(email).toHaveAttribute('required', '')
  })

  test('apiSignup helper provisions a user with an access token (sanity check)', async ({
    request,
  }) => {
    const session = await apiSignup(request)
    expect(session.accessToken).toBeTruthy()
    expect(session.userId).toBeTruthy()
    const api = authedApi(request, session.accessToken!)
    const me = await api.get('/users/' + session.userId)
    expect(me.status()).toBe(200)
  })

  test('first/last/handle textboxes are present, accept input, and round-trip back to the user', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/signup')
    const first = page.locator('#signup-first')
    const last = page.locator('#signup-last')
    const handle = page.locator('#signup-handle')
    await expect(first).toBeVisible()
    await expect(last).toBeVisible()
    await expect(handle).toBeVisible()
    await first.fill('Aria')
    await last.fill('Vega')
    await handle.fill('aria-test')
    await expect(first).toHaveValue('Aria')
    await expect(last).toHaveValue('Vega')
    await expect(handle).toHaveValue('aria-test')
  })
})
