/**
 * E2E helpers for the hotel-booking (Auberge) flagship.
 *
 * Every spec calls `signup()` once (or `login()` for an existing user)
 * to get an authenticated `Page`, then uses `page.request` for fast,
 * cookie-bearing API calls. UI-level navigation is reserved for
 * primary-feature flows (search → property → booking → confirmation,
 * trips listing, account section).
 */

import { type APIRequestContext, type Page, expect } from '@molecule/app-e2e-fixtures-default'

/**
 * Issue an authed API request from inside the running page. The httpOnly
 * `token` cookie (set by the auth bond after M1-1) is sent automatically
 * via `credentials: 'include'`; no explicit Authorization header needed.
 * Playwright's `page.request` shares the browser cookie jar, so authed
 * `page.request.*` calls also work without manual header injection.
 */
export async function apiRequest<T = unknown>(
  page: Page,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<{ status: number; body: T }> {
  return page.evaluate(
    async ({ method, path, body }) => {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      const resp = await fetch(path, {
        method,
        headers,
        credentials: 'include',
        body: body === undefined ? undefined : JSON.stringify(body),
      })
      let parsed: unknown = null
      try {
        parsed = await resp.json()
      } catch {
        /* 204 / non-JSON */
      }
      return { status: resp.status, body: parsed as never }
    },
    { method, path, body },
  )
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

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3010')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4010') + '/api'

let counter = 0

export function uniqueEmail(prefix = 'sojourn'): string {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

export function uniqueUsername(prefix = 'soj'): string {
  return `${prefix}${Date.now().toString(36)}${counter}`
}

export interface SignupResult {
  email: string
  password: string
  username: string
}

/**
 * Sign up a fresh user via the UI (which sets the auth cookie on the
 * browser context). Returns the credentials so subsequent specs can
 * `login()` again if they need a separate context.
 *
 * Hardened against the auth-race: arm POST /api/users response listener
 * BEFORE clicking submit so a fast response can't be missed, gate on
 * status < 400, then wait for navigation off /signup. Eliminates the
 * API-only flake where a spec fired an authed call before the auth-state
 * hook had persisted the token.
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
  // Fill optional name fields if the form requires them.
  const firstNameField = page.locator('#firstName')
  if (await firstNameField.count()) await firstNameField.fill('Auberge')
  const lastNameField = page.locator('#lastName')
  if (await lastNameField.count()) await lastNameField.fill('Tester')
  await page.locator('#email').fill(email)
  const usernameField = page.locator('#username')
  if (await usernameField.count()) {
    await usernameField.fill(username)
  }
  await page.locator('#password').fill(password)
  // Fill confirmPassword field if the form requires it.
  const confirmField = page.locator('#confirmPassword')
  if (await confirmField.count()) await confirmField.fill(password)
  const submit = page
    .getByRole('button', { name: /Initialize Session|Create account|Join|Sign up|Get started/i })
    .first()
  await expect(submit).toBeEnabled({ timeout: 10000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 30000 })
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})

  return { email, password, username }
}

/**
 * Programmatic signup. Faster than the UI variant; useful for tests
 * that don't need to assert anything about the signup screen itself.
 * Returns an authenticated APIRequestContext bound to the same cookie
 * jar that subsequent calls share.
 */
export async function signupApi(
  request: APIRequestContext,
  emailOverride?: string,
  passwordOverride?: string,
): Promise<{
  email: string
  password: string
  userId: string
  request: APIRequestContext
}> {
  const email = emailOverride ?? uniqueEmail('api')
  const password = passwordOverride ?? 'TestPass123!'
  const username = uniqueUsername('api')
  const res = await request.post(API_BASE + '/users', {
    data: { email, password, name: 'Auberge Tester', username },
  })
  if (!res.ok()) throw new Error('signupApi failed: ' + res.status() + ' ' + (await res.text()))
  const json = (await res.json()) as { user: { id: string } }
  return { email, password, userId: json.user.id, request }
}

export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto(APP_BASE + '/login', { waitUntil: 'domcontentloaded' })
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
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
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20000 })
}

export async function listProperties(
  page: Page,
): Promise<Array<{ id: string; name: string; price_per_night_cents: number }>> {
  const res = await page.request.get(API_BASE + '/properties')
  expect(res.ok(), 'GET /properties should succeed').toBeTruthy()
  const body = (await res.json()) as {
    data: Array<{ id: string; name: string; price_per_night_cents: number }>
  }
  expect(Array.isArray(body.data)).toBe(true)
  return body.data
}

export async function listRooms(
  page: Page,
  propertyId: string,
): Promise<Array<{ id: string; name: string; price_per_night_cents: number }>> {
  const res = await page.request.get(API_BASE + '/properties/' + propertyId + '/rooms')
  expect(res.ok()).toBeTruthy()
  const body = (await res.json()) as {
    data: Array<{ id: string; name: string; price_per_night_cents: number }>
  }
  return body.data
}

export function isoOffset(daysFromNow: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + daysFromNow)
  return d.toISOString().slice(0, 10)
}

export interface CapturedRequest {
  url: string
  method: string
  status: number
  responseBody: string
}

/**
 * Run an action while listening for network responses, then return
 * everything captured. Useful for asserting that a button click actually
 * fired the expected POST and got a 2xx (not just that a toast appeared).
 *
 * We also listen on `request` so that requests fired right before the
 * page navigates (and whose responses Playwright drops on context
 * teardown) still appear with `status: 0`. Specs should match on
 * `url` + `method`, treating `status` as best-effort.
 */
export async function captureNetwork(
  page: Page,
  action: () => Promise<void>,
): Promise<CapturedRequest[]> {
  const captured: CapturedRequest[] = []
  const seen = new Set<string>()
  const requestHandler = (request: import('@playwright/test').Request) => {
    const key = request.method() + ' ' + request.url()
    if (seen.has(key)) return
    seen.add(key)
    captured.push({ url: request.url(), method: request.method(), status: 0, responseBody: '' })
  }
  const responseHandler = async (response: import('@playwright/test').Response) => {
    try {
      const body = await response.text().catch(() => '')
      const key = response.request().method() + ' ' + response.url()
      const existing = captured.find(
        (c) =>
          c.url === response.url() && c.method === response.request().method() && c.status === 0,
      )
      if (existing) {
        existing.status = response.status()
        existing.responseBody = body.length > 4000 ? body.slice(0, 4000) + '…' : body
      } else {
        seen.add(key)
        captured.push({
          url: response.url(),
          method: response.request().method(),
          status: response.status(),
          responseBody: body.length > 4000 ? body.slice(0, 4000) + '…' : body,
        })
      }
    } catch {
      // ignore failed body reads (data: URIs, redirects, etc.)
    }
  }
  page.on('request', requestHandler)
  page.on('response', responseHandler)
  try {
    await action()
    // Allow late responses (post-navigation) to settle.
    await page.waitForTimeout(200)
  } finally {
    page.off('request', requestHandler)
    page.off('response', responseHandler)
  }
  return captured
}
