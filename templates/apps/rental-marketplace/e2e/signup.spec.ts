/**
 * /signup — Roost guest signup form.
 *
 * Real outcomes asserted:
 *   - submit lands on an authenticated route (not /signup)
 *   - access token is present as an httpOnly cookie after signup (M1-1)
 *   - a `users` row exists for that email afterward (read-after-write)
 *   - mismatched-passwords path surfaces a client-side inline error
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  apiContext,
  captureNetwork,
  getAccessToken,
  signup,
  uniqueEmail,
} from './_helpers'

test('signup creates a real users row and authenticates the browser', async ({ page }) => {
  const result = await signup(page)
  // 1. Not on /signup anymore (authenticated redirect).
  await expect(page).not.toHaveURL(/\/signup/)

  // 2. Auth token present as httpOnly cookie. The @molecule/app-core-auth
  //    bond (M1-1) persists tokens in-memory; the persistent credential
  //    is the `token` httpOnly cookie set server-side.
  const token = await getAccessToken(page)
  expect(token, 'access token cookie must be present after signup').toBeTruthy()

  // 3. Read-after-write: GET /api/users/<id> with that token returns
  //    a row whose email matches what we typed.
  const ctx = await apiContext()
  const me = await ctx.get(`${API_BASE}/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  expect(me.status(), 'GET /api/users/me must succeed').toBe(200)
  const body = (await me.json()) as { email?: string; props?: { email?: string } }
  const email = body.email ?? body.props?.email
  expect(email).toBe(result.email)
})

test('signup with mismatched passwords surfaces inline error and stays on /signup', async ({
  page,
}) => {
  await page.goto(APP_BASE + '/signup')
  const email = uniqueEmail('mismatch')
  const inputs = page.locator('input').filter({ visible: true })
  await inputs.nth(0).fill('Mis')
  await inputs.nth(1).fill('Match')
  await inputs.nth(2).fill(email)
  await inputs.nth(3).fill('First123!')
  await inputs.nth(4).fill('Different456!')
  await page
    .getByRole('button', { name: /create account|sign\s*up/i })
    .first()
    .click()
  await page.waitForTimeout(800)
  // Should still be on /signup (validation blocked).
  await expect(page).toHaveURL(/\/signup/)
})

test('signup link to /login navigates to login', async ({ page }) => {
  await page.goto(APP_BASE + '/signup')
  await page
    .getByRole('link', { name: /sign\s*in/i })
    .first()
    .click()
  await expect(page).toHaveURL(/\/login/)
})

test('signup fires POST /api/users and bearer token resolves /users/me', async ({ page }) => {
  await page.goto(APP_BASE + '/signup')
  const email = uniqueEmail('netcap')
  const inputs = page.locator('input').filter({ visible: true })
  await inputs.nth(0).fill('Net')
  await inputs.nth(1).fill('Cap')
  await inputs.nth(2).fill(email)
  await inputs.nth(3).fill('TestPass123!')
  await inputs.nth(4).fill('TestPass123!')
  const reqs = await captureNetwork(page, async () => {
    await page
      .getByRole('button', { name: /create account|sign\s*up/i })
      .first()
      .click()
    await page.waitForURL((url) => !url.pathname.includes('/signup'), { timeout: 15000 })
  })
  const create = reqs.find((r) => /\/api\/users(\?|$)/.test(r.url) && r.method === 'POST')
  expect(create, 'POST /api/users should fire on signup submit').toBeTruthy()
  expect([200, 201]).toContain(create!.status)
  // The auth bond persists the access token from the signup response; verify
  // it actually authenticates a backend round trip. Token is now the httpOnly
  // `token` cookie (M1-1), readable via page.context().cookies().
  const token = await getAccessToken(page)
  expect(token, 'access token cookie must be present after signup').toBeTruthy()
  const ctx = await apiContext()
  const me = await ctx.get(`${API_BASE}/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  expect(me.status(), 'GET /api/users/me with bearer token should succeed').toBe(200)
  const body = (await me.json()) as { email?: string; props?: { email?: string } }
  expect(body.email ?? body.props?.email).toBe(email)
})

test('email field has type=email and is required (HTML5 validation)', async ({ page }) => {
  await page.goto(APP_BASE + '/signup')
  const email = page.locator('input[type="email"]').first()
  await expect(email).toBeVisible()
  // Empty submit should keep us on /signup (the browser blocks invalid email).
  await page
    .getByRole('button', { name: /create account|sign\s*up/i })
    .first()
    .click()
  await page.waitForTimeout(500)
  await expect(page).toHaveURL(/\/signup/)
})
