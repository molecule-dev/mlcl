/**
 * Shared helpers for password-manager e2e specs. Every spec imports
 * `signup`, `login`, `addItem`, etc. instead of rewriting auth /
 * network plumbing per-test.
 */

import { Page, expect, APIRequestContext } from '@molecule/app-e2e-fixtures-default'

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
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3300')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4300') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'pm'): string {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

export const STRONG_PASSWORD = 'CorrectHorseBattery42!'

/** Sign up via the running app's /signup form; returns credentials. */
export async function signup(
  page: Page,
  email = uniqueEmail(),
  password = STRONG_PASSWORD,
): Promise<{ email: string; password: string }> {
  await page.goto(APP_BASE + '/signup')
  await page.getByPlaceholder(/first name/i).fill('Vault')
  await page.getByPlaceholder(/last name/i).fill('Owner')
  await page.getByPlaceholder(/^email$/i).fill(email)
  await page.getByPlaceholder(/^master password$/i).fill(password)
  await page.getByPlaceholder(/confirm master password/i).fill(password)
  const submit = page.getByRole('button', { name: /seal my vault|create|sign up/i })
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
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
  return { email, password }
}

/** Login via /login form. */
export async function login(page: Page, email: string, password = STRONG_PASSWORD): Promise<void> {
  await page.goto(APP_BASE + '/login')
  await page.locator('input[type="email"]').first().fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  const submit = page.getByRole('button', { name: /sign in|log in|unlock/i }).first()
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
 * Sign up a fresh user, then add a vault item via the UI form.
 * Returns the item's id (read from the URL after redirect to
 * /vault/:id) along with the credentials.
 */
export async function signupAndAddItem(
  page: Page,
  itemName = 'github.com',
  itemPassword = 'g!thubP4ss-rotation-2026!',
): Promise<{ email: string; password: string; itemId: string }> {
  const creds = await signup(page)
  await page.goto(APP_BASE + '/vault/new')
  await page.getByTestId('new-item-name').fill(itemName)
  await page.getByTestId('new-item-username').fill('alice@example.com')
  await page.getByTestId('new-item-password').fill(itemPassword)
  const respP = page.waitForResponse(
    (r) => /\/api\/items(\?|$)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 15_000 },
  )
  await page.getByTestId('new-item-save').click()
  const resp = await respP
  // wait for the redirect from /vault/new → /vault/<created-id> (or /vault if create failed)
  await page.waitForURL(
    (url) => {
      const m = url.pathname.match(/^\/vault\/([^/]+)$/)
      return Boolean(m && m[1] && m[1] !== 'new')
    },
    { timeout: 15_000 },
  )
  // Read the id from the URL OR from the response payload as a fallback
  let itemId: string | undefined
  const url = page.url()
  const m = url.match(/\/vault\/([^/?#]+)/)
  if (m && m[1] && m[1] !== 'new') itemId = m[1]
  if (!itemId) {
    try {
      const body = await resp.json()
      const id = (body && (body.id || body.data?.id)) as string | undefined
      if (id) itemId = id
    } catch {
      /* not JSON */
    }
  }
  if (!itemId) throw new Error('Could not resolve created item id from URL or response: ' + url)
  return { ...creds, itemId }
}

/**
 * Capture all network responses during fn. Useful to assert specific
 * requests fired without coupling to ordering.
 */
export async function captureNetwork(
  page: Page,
  fn: () => Promise<void>,
): Promise<{ method: string; url: string; status: number }[]> {
  const reqs: { method: string; url: string; status: number }[] = []
  const onResp = (resp: {
    request: () => { method: () => string }
    url: () => string
    status: () => number
  }) => {
    reqs.push({ method: resp.request().method(), url: resp.url(), status: resp.status() })
  }
  page.on('response', onResp as never)
  try {
    await fn()
  } finally {
    page.off('response', onResp as never)
  }
  return reqs
}

/** Get the auth headers using the cookie-held JWT. */
export async function getAuthHeaders(page: Page): Promise<{ Authorization?: string }> {
  const token = await getAccessToken(page)
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/** Direct API GET with the page's bearer token. */
export async function authedApiGet<T = unknown>(
  request: APIRequestContext,
  page: Page,
  path: string,
): Promise<{ status: number; data: T }> {
  const headers = await getAuthHeaders(page)
  const res = await request.get(API_BASE + path, { headers })
  let data: unknown = null
  try {
    data = await res.json()
  } catch {
    /* non-JSON */
  }
  return { status: res.status(), data: data as T }
}

/** Fail the test if any console.error fires during fn (filtering benign noise). */
export async function expectNoConsoleErrors(page: Page, fn: () => Promise<void>): Promise<void> {
  const errs: string[] = []
  const handler = (msg: { type: () => string; text: () => string }) => {
    if (msg.type() === 'error') errs.push(msg.text())
  }
  page.on('console', handler as never)
  try {
    await fn()
  } finally {
    page.off('console', handler as never)
  }
  const fatal = errs.filter(
    (e) => !/favicon|net::ERR_|Failed to load resource|Service[wW]orker|workbox/.test(e),
  )
  expect(fatal, 'console errors during interaction').toEqual([])
}
