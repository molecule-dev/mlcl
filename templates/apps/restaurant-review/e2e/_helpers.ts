/**
 * E2E helpers for the restaurant-review (Morsel) flagship.
 *
 * Specs use `signup()` (or `login()`) once to get an authenticated `Page`,
 * then use `apiRequest()` for fast cookie-bearing API calls. UI-level
 * navigation is reserved for verifying primary feature flows (discover →
 * restaurant detail → write review → confirm read-after-write,
 * favorites toggle, lists creation, notifications mark-all-read,
 * settings update).
 */

import { type APIRequestContext, type Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3000')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'

let counter = 0

export function uniqueEmail(prefix = 'morsel'): string {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

export function uniqueUsername(prefix = 'mors'): string {
  return `${prefix}${Date.now().toString(36)}${counter}`
}

export async function getAccessToken(page: Page): Promise<string | null> {
  // [M1-1] The bearer token is held in memory (a localStorage copy is
  // XSS-exfiltratable); the persistent credential is the httpOnly `token`
  // cookie (prod: `__Host-token`), readable in tests via the Playwright
  // context. Its value IS the JWT.
  const cookies = await page.context().cookies()
  const tok = cookies.find((c) => /(^|[-_])token$/i.test(c.name) && c.value)
  return tok?.value ?? null
}

/**
 * Issue an authed API request via page.request so the httpOnly auth cookie
 * is attached automatically (page.request shares the browser context's
 * cookie jar). An explicit Bearer header is also set for compatibility.
 */
export async function apiRequest<T = unknown>(
  page: Page,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<{ status: number; body: T }> {
  const token = await getAccessToken(page)
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const url = path.startsWith('http') ? path : APP_BASE + path
  const resp = await page.request.fetch(url, {
    method,
    headers,
    data: body === undefined ? undefined : body,
    failOnStatusCode: false,
  })
  let parsed: unknown = null
  try {
    parsed = await resp.json()
  } catch {
    /* 204 / non-JSON */
  }
  return { status: resp.status(), body: parsed as never as T }
}

export interface SignupResult {
  email: string
  password: string
  username: string
}

/**
 * Sign up a fresh user via the UI. Returns the credentials so subsequent
 * specs can `login()` again if they need a separate context.
 */
export async function signup(page: Page): Promise<SignupResult> {
  const email = uniqueEmail()
  const password = 'TestPass123!'
  const username = uniqueUsername()

  await page.goto(APP_BASE + '/signup', { waitUntil: 'domcontentloaded' })
  // Wait for the form to mount before the optional-field probes below.
  // count() is a one-shot read with no auto-waiting, so after a goto it can
  // run against a still-empty React root, return 0, and SILENTLY SKIP the
  // fill — the form then won't submit and every spec in the app dies on a
  // signup timeout. That is exactly how restaurant-ordering lost all 78.
  await page.locator('input').first().waitFor({ state: 'visible', timeout: 15000 })
  // Morsel uses autoComplete tokens rather than ids on its form fields.
  const firstNameField = page.locator('input[autocomplete="given-name"]')
  if (await firstNameField.count()) await firstNameField.fill('Morsel')
  const lastNameField = page.locator('input[autocomplete="family-name"]')
  if (await lastNameField.count()) await lastNameField.fill('Tester')
  const usernameField = page.locator('input[autocomplete="username"]')
  if (await usernameField.count()) await usernameField.fill(username)
  await page.locator('input[type="email"]').fill(email)
  const passwordFields = page.locator('input[type="password"]')
  await passwordFields.nth(0).fill(password)
  if ((await passwordFields.count()) > 1) await passwordFields.nth(1).fill(password)
  const submit = page
    .getByRole('button', { name: /Initialize Session|Create account|Join|Sign up|Get started/i })
    .first()
  await expect(submit).toBeEnabled({ timeout: 10000 })
  // Arm POST listener BEFORE click so a fast response can't be missed.
  // Mirrors virtual-classroom hardening (b296e327d).
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 15000 })
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
  // Poll until the auth cookie lands.
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)

  return { email, password, username }
}

/**
 * Programmatic signup via the API. Faster than the UI variant and good
 * for tests that don't care about the signup screen itself.
 */
export async function signupApi(
  request: APIRequestContext,
  emailOverride?: string,
  passwordOverride?: string,
): Promise<{ email: string; password: string; userId: string; request: APIRequestContext }> {
  const email = emailOverride ?? uniqueEmail('api')
  const password = passwordOverride ?? 'TestPass123!'
  const username = uniqueUsername('api')
  const res = await request.post(API_BASE + '/users', {
    data: { email, password, name: 'Morsel Tester', username },
  })
  if (!res.ok()) throw new Error('signupApi failed: ' + res.status() + ' ' + (await res.text()))
  const json = (await res.json()) as { props?: { id: string }; user?: { id: string } }
  const userId = json.props?.id ?? json.user?.id
  if (!userId) throw new Error('signupApi: no user id in response')
  return { email, password, userId, request }
}

export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto(APP_BASE + '/login', { waitUntil: 'domcontentloaded' })
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  const submit = page.getByRole('button', { name: /Initialize Session|Sign in|Log in/i }).first()
  await expect(submit).toBeEnabled({ timeout: 10000 })
  const loginResponse = page.waitForResponse(
    (r) =>
      /\/api\/users\/log-in(\?|$)|\/api\/auth\/login(\?|$)|\/api\/login(\?|$)/.test(r.url()) &&
      r.request().method() === 'POST',
    { timeout: 20000 },
  )
  await submit.click()
  const resp = await loginResponse
  expect(resp.status(), `POST login → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
}

/**
 * Record every response that fires while `fn` runs. Used by spec gate
 * 12 of `verify-app-coverage.mjs` to assert that pages with documented
 * backend calls actually issue those calls during their primary flow.
 */
export async function captureNetwork(
  page: Page,
  fn: () => Promise<void>,
): Promise<Array<{ method: string; url: string; status: number; postData: string | null }>> {
  const reqs: Array<{ method: string; url: string; status: number; postData: string | null }> = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onResp = (resp: any) => {
    try {
      reqs.push({
        method: resp.request().method(),
        url: resp.url(),
        status: resp.status(),
        postData: resp.request().postData() ?? null,
      })
    } catch {
      /* ignore */
    }
  }
  page.on('response', onResp)
  try {
    await fn()
  } finally {
    page.off('response', onResp)
  }
  return reqs
}

export interface ApiRestaurant {
  id: string
  name: string
  cuisine: string
  city: string
  rating: number | string
  review_count: number
  price_level: number
}

export async function listRestaurants(page: Page): Promise<ApiRestaurant[]> {
  const res = await apiRequest<{ data: ApiRestaurant[] }>(page, 'GET', '/api/restaurants?limit=20')
  expect(res.status, 'GET /restaurants should succeed').toBe(200)
  return res.body.data
}

/**
 * One restaurant from the live catalog. `index` wraps, so a spec never
 * depends on how many rows the demo seed happens to create — the moment the
 * catalog is replaced with the owner's own, a bare `restaurants[4]!` is
 * `undefined` on a perfectly correct app.
 */
export async function pickRestaurant(page: Page, index = 0): Promise<ApiRestaurant> {
  const restaurants = await listRestaurants(page)
  const target = restaurants[index % (restaurants.length || 1)]
  if (!target) throw new Error('the restaurant catalog is empty')
  return target
}

/** `n` distinct restaurants from the live catalog. */
export async function pickRestaurants(page: Page, n: number): Promise<ApiRestaurant[]> {
  const restaurants = await listRestaurants(page)
  if (restaurants.length < n) {
    throw new Error(`the catalog needs ${n} restaurants, it holds ${restaurants.length}`)
  }
  return restaurants.slice(0, n)
}

/**
 * A catalog restaurant that publishes menu items — the detail page only
 * renders its "Menu highlights" section when there are any.
 */
export async function pickRestaurantWithMenu(page: Page): Promise<ApiRestaurant> {
  for (const restaurant of await listRestaurants(page)) {
    const res = await apiRequest<{ data: unknown[] }>(
      page,
      'GET',
      `/api/restaurants/${restaurant.id}/menu`,
    )
    if (res.status === 200 && (res.body?.data?.length ?? 0) > 0) return restaurant
  }
  throw new Error('no restaurant in the catalog has menu items')
}
