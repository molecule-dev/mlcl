/**
 * E2E helpers for the restaurant-ordering (Hearth) flagship.
 *
 * Specs sign up once via `signup()` to get an authenticated `Page`, then
 * use `apiRequest()` for fast cookie+bearer-bearing API calls. UI-level
 * navigation is reserved for primary feature flows (signup, menu CRUD,
 * order/payment lifecycle, billing checkout, settings/theme persistence,
 * guest QR cart).
 */

import { type APIRequestContext, type Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3000')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'

let counter = 0

export function uniqueEmail(prefix = 'hearth'): string {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
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
 * is attached automatically. The token cookie is sent because page.request
 * shares the browser context's cookie jar.
 *
 * If the page is still at about:blank, navigate to APP_BASE first so
 * the browser has a real origin and the cookie domain matches.
 */
export async function apiRequest<T = unknown>(
  page: Page,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<{ status: number; body: T }> {
  if (!/^https?:/.test(page.url())) {
    await page.goto(APP_BASE + '/', { waitUntil: 'domcontentloaded' })
  }
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
  userId: string
}

/**
 * Sign up a fresh user via the UI. Returns the credentials so subsequent
 * specs can `login()` again if they need a separate context.
 *
 * Deterministic gating: arm POST /api/users BEFORE the click (so a fast
 * response can't be missed), assert < 400, wait for nav off /signup,
 * then poll the httpOnly cookie until the token lands. Without this,
 * specs that fire apiRequest() immediately after signup() sometimes get
 * a 401 because the auth-state hook sets the cookie in a subsequent
 * microtask → "flaky".
 */
export async function signup(page: Page): Promise<SignupResult> {
  const email = uniqueEmail()
  const password = 'OwnerPass123!'

  await page.goto(APP_BASE + '/signup', { waitUntil: 'domcontentloaded' })
  // Wait for the form to actually mount before the optional-field probes below.
  // count() is a one-shot read with no auto-waiting, so after a
  // domcontentloaded goto it ran against a still-empty React root, returned 0
  // for every field, and silently skipped filling first/last/restaurant. The
  // form then refused to submit, POST /api/users never fired, and signup timed
  // out — taking all 78 of this app's tests with it. (.fill() on email/password
  // auto-waits, which is why only the guarded fields were affected.)
  await page.locator('input[type="email"]').first().waitFor({ state: 'visible', timeout: 15000 })
  // The Signup page uses placeholder/label text rather than name attributes.
  const firstNameField = page.getByRole('textbox', { name: /first name/i }).first()
  if (await firstNameField.count().catch(() => 0)) await firstNameField.fill('Mira')
  const lastNameField = page.getByRole('textbox', { name: /last name/i }).first()
  if (await lastNameField.count().catch(() => 0)) await lastNameField.fill('Tanaka')
  const restaurantField = page
    .getByRole('textbox', { name: /restaurant name|business name/i })
    .first()
  if (await restaurantField.count().catch(() => 0)) await restaurantField.fill('Hearth Cafe')

  await page.locator('input[type="email"]').first().fill(email)
  const passwordFields = page.locator('input[type="password"]')
  await passwordFields.nth(0).fill(password)
  if ((await passwordFields.count()) > 1) await passwordFields.nth(1).fill(password)

  const submit = page
    .getByRole('button', { name: /Create account|Sign up|Get started|Open your kitchen/i })
    .first()
  await expect(submit).toBeEnabled({ timeout: 10000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 15000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)

  const token = await getAccessToken(page)
  let userId = ''
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      userId = String(payload.userId || payload.id || '')
    } catch {
      /* ignore decode failure */
    }
  }

  return { email, password, userId }
}

/**
 * Programmatic signup via the API. Faster than the UI variant — useful
 * for specs that don't actually need to verify the signup form itself.
 */
export async function signupApi(
  request: APIRequestContext,
  emailOverride?: string,
  passwordOverride?: string,
): Promise<{ email: string; password: string; userId: string; token: string }> {
  const email = emailOverride ?? uniqueEmail('api')
  const password = passwordOverride ?? 'OwnerPass123!'
  const res = await request.post(API_BASE + '/users', {
    data: { email, password, name: 'Hearth Owner' },
  })
  if (!res.ok()) throw new Error('signupApi failed: ' + res.status() + ' ' + (await res.text()))
  const json = (await res.json()) as {
    props?: { id: string }
    user?: { id: string }
    accessToken?: string
  }
  const userId = json.props?.id ?? json.user?.id
  const token = json.accessToken ?? ''
  if (!userId) throw new Error('signupApi: no user id in response')
  return { email, password, userId, token }
}

export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto(APP_BASE + '/login', { waitUntil: 'domcontentloaded' })
  await page.locator('input[type="email"]').first().fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  const submit = page.getByRole('button', { name: /Sign in|Log in/i }).first()
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

export interface ApiMenuItem {
  id: string
  name: string
  description: string
  price: string | number
  category: string
  available: boolean
  dietary_tags: string[]
}

export interface ApiTable {
  id: string
  table_number: number
  seats: number
  section: string
  status: 'available' | 'occupied' | 'reserved' | 'cleaning'
}

export interface ApiOrder {
  id: string
  table_id?: string | null
  table_number?: number | null
  status: 'pending' | 'preparing' | 'ready' | 'served' | 'paid' | 'cancelled'
  subtotal: string | number
  total: string | number
  tip: string | number
}

export async function createMenuItem(
  page: Page,
  overrides: Partial<{
    name: string
    description: string
    price: number
    category: string
    dietary_tags: string[]
  }> = {},
): Promise<ApiMenuItem> {
  const name = overrides.name ?? `Item ${Date.now()}-${counter++}`
  const res = await apiRequest<ApiMenuItem>(page, 'POST', '/api/menu', {
    name,
    description: overrides.description ?? 'A menu item.',
    price: overrides.price ?? 12.5,
    category: overrides.category ?? 'mains',
    dietary_tags: overrides.dietary_tags ?? [],
  })
  expect(res.status, `POST /api/menu (${name}) should succeed`).toBeGreaterThanOrEqual(200)
  expect(res.status, `POST /api/menu (${name}) should succeed`).toBeLessThan(300)
  return res.body
}

export async function createTable(
  page: Page,
  overrides: Partial<{ table_number: number; seats: number; section: string }> = {},
): Promise<ApiTable> {
  const table_number = overrides.table_number ?? Math.floor(Math.random() * 9000) + 1000
  const res = await apiRequest<ApiTable>(page, 'POST', '/api/tables', {
    table_number,
    seats: overrides.seats ?? 4,
    section: overrides.section ?? 'main',
  })
  expect(res.status, `POST /api/tables (${table_number}) should succeed`).toBe(201)
  return res.body
}
