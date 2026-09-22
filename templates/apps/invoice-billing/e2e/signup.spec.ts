/**
 * /signup — account creation flow.
 *
 * Asserts on real outcomes:
 *  - new account creation lands on /dashboard, persists access token, and a
 *    real users row exists (verified by hitting GET /api/profile/me).
 *  - duplicate email yields a server error and stays on /signup.
 *  - "Sign in" footer link goes to /login.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  apiHeaders,
  captureNetwork,
  getAccessToken,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('signup page', () => {
  test('renders heading + form fields', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.getByRole('heading', { name: /Create your Remit account/i })).toBeVisible()
    await expect(page.getByLabel('First name', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Last name', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Work email', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /Create account/i })).toBeVisible()
  })

  test('successful signup creates a real user row, persists token, and lands on /dashboard', async ({
    page,
  }) => {
    const { accessToken, email } = await signup(page)
    expect(accessToken, 'access token').toBeTruthy()
    expect(page.url(), 'url after signup').toMatch(/\/dashboard/)
    // Read-after-write: profile row exists and matches the email.
    const me = await page.request.get(`${API_BASE}/profile/me`, {
      headers: apiHeaders(accessToken),
    })
    expect(me.status(), await me.text()).toBe(200)
    const body = (await me.json()) as { email?: string; id?: string }
    expect(body.id, 'user id').toBeTruthy()
    expect(body.email).toBe(email)
  })

  test('duplicate email signup does NOT create a duplicate account', async ({ page }) => {
    // The duplicate POST is intentionally rejected 403 (anti-enumeration) —
    // the browser logs it as a console error, which is expected here.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of 403',
    })
    const email = uniqueEmail('dup')
    // First signup succeeds.
    const { accessToken } = await signup(page, email)
    expect(accessToken).toBeTruthy()

    // Leave the authed Dashboard BEFORE clearing credentials so its
    // refetches can't fire 401s into the console guard.
    await page.goto(APP_BASE + '/signup')
    // Clear storage AND cookies; navigate back to /signup; submit same email
    // a second time. The persistent credential is the httpOnly `token` cookie
    // (getAccessToken reads it, not localStorage), so clearing only
    // localStorage would leave the first signup's cookie behind and the
    // duplicate-rejection assertion below would re-read that stale token.
    await page.evaluate(() => window.localStorage.clear())
    await page.context().clearCookies()
    await page.goto(APP_BASE + '/signup')
    await page.getByLabel('First name', { exact: true }).fill('Other')
    await page.getByLabel('Last name', { exact: true }).fill('User')
    await page.getByLabel('Work email', { exact: true }).fill(email)
    await page.getByLabel('Password', { exact: true }).fill('OtherPass!2345')
    await page.getByRole('button', { name: /Create account/i }).click()
    await page.waitForTimeout(2500)
    // Stays on /signup (no token written) — duplicate email is rejected.
    expect(page.url()).toMatch(/\/signup/)
    const dupToken = await getAccessToken(page)
    expect(dupToken, 'no token persisted after duplicate signup').toBeFalsy()
  })

  test('"Sign in" link routes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page
      .getByRole('link', { name: /^Sign in$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('Create account submit POSTs /api/users (success: 200/201, duplicate: 4xx) — captureNetwork', async ({
    page,
  }) => {
    // The duplicate half intentionally lands a 403 — expected console noise.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of 403',
    })
    const email = uniqueEmail('netcheck')
    await page.goto(APP_BASE + '/signup')
    const goodReqs = await captureNetwork(page, async () => {
      await page.getByLabel('First name', { exact: true }).fill('Net')
      await page.getByLabel('Last name', { exact: true }).fill('Check')
      await page.getByLabel('Work email', { exact: true }).fill(email)
      await page.getByLabel('Password', { exact: true }).fill('TestPass!1234')
      await page.getByRole('button', { name: /Create account/i }).click()
      await page.waitForURL('**/dashboard', { timeout: 15000 })
    })
    expect(
      goodReqs.some(
        (r) =>
          r.method === 'POST' && r.url.endsWith('/api/users') && r.status >= 200 && r.status < 300,
      ),
      `expected POST /api/users 2xx, got ${JSON.stringify(goodReqs.filter((r) => r.url.endsWith('/api/users')))}`,
    ).toBe(true)

    // Duplicate path.
    await page.evaluate(() => window.localStorage.clear())
    await page.goto(APP_BASE + '/signup')
    const dupReqs = await captureNetwork(page, async () => {
      await page.getByLabel('First name', { exact: true }).fill('Dup')
      await page.getByLabel('Last name', { exact: true }).fill('Check')
      await page.getByLabel('Work email', { exact: true }).fill(email)
      await page.getByLabel('Password', { exact: true }).fill('TestPass!1234')
      await page.getByRole('button', { name: /Create account/i }).click()
      await page.waitForTimeout(2500)
    })
    expect(
      dupReqs.some((r) => r.method === 'POST' && r.url.endsWith('/api/users') && r.status >= 400),
      `expected POST /api/users 4xx for duplicate, got ${JSON.stringify(dupReqs.filter((r) => r.url.endsWith('/api/users')))}`,
    ).toBe(true)
  })

  test('signup form rejects empty submit (HTML5 required validation prevents POST)', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/signup')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Create account/i }).click()
      await page.waitForTimeout(800)
    })
    // No POST should fire because required fields are empty.
    expect(
      reqs.some((r) => r.method === 'POST' && r.url.endsWith('/api/users')),
      'empty submit must NOT POST /api/users',
    ).toBe(false)
    expect(page.url()).toMatch(/\/signup/)
  })
})
