// Shared test helpers for the ai-writing-studio e2e suite.
// Specs import from this module rather than rewriting auth/network plumbing.

import { Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3000')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'aiws-test') {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

/**
 * Sign up a fresh user and return the credentials. The signup form has
 * separate first/last name inputs (autocomplete given-name / family-name)
 * which the molecule auth client concatenates into the user.name.
 *
 * Hardening: gate on submit-enabled, arm the POST /api/users response
 * listener BEFORE the click, then poll until the JWT lands in
 * localStorage. Eliminates a race where the auth-state hook persisted
 * the token in a microtask AFTER React routed off /signup, so an
 * immediate `getAccessToken(page)` returned null and authed page.request
 * calls 401-ed.
 */
export async function signup(page: Page, email = uniqueEmail(), password = 'TestPass123!') {
  await page.goto(APP_BASE + '/signup')
  // Wait for the form to mount before the optional-field probes below.
  // count() is a one-shot read with no auto-waiting, so after a goto it can
  // run against a still-empty React root, return 0, and SILENTLY SKIP the
  // fill — the form then won't submit and every spec in the app dies on a
  // signup timeout. That is exactly how restaurant-ordering lost all 78.
  await page.locator('input').first().waitFor({ state: 'visible', timeout: 15000 })
  // First name + last name are required.
  const first = page.getByLabel(/first name/i).first()
  if (await first.count().catch(() => 0)) await first.fill('Plume')
  const last = page.getByLabel(/last name/i).first()
  if (await last.count().catch(() => 0)) await last.fill('Tester')
  await page.getByLabel(/email/i).first().fill(email)
  await page
    .getByLabel(/^password$/i)
    .first()
    .fill(password)
  const confirm = page.getByLabel(/confirm.*password|password.*confirm/i).first()
  if (await confirm.count().catch(() => 0)) await confirm.fill(password)
  const submit = page
    .getByRole('button', { name: /create.*account|sign\s*up|register|get\s*started/i })
    .first()
  await expect(submit).toBeEnabled({ timeout: 10000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 20000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
  return { email, password }
}

export async function login(page: Page, email: string, password: string) {
  await page.goto(APP_BASE + '/login')
  await page.getByLabel(/email/i).first().fill(email)
  await page
    .getByLabel(/^password$/i)
    .first()
    .fill(password)
  const submit = page.getByRole('button', { name: /sign\s*in|log\s*in/i }).first()
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
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
}

export async function logout(page: Page) {
  // Navigate to settings — the most reliable place to find the sign-out
  // affordance regardless of which dashboard widgets are mounted.
  await page.goto(APP_BASE + '/settings')
  const out = page.getByRole('button', { name: /sign\s*out|log\s*out/i }).first()
  if (await out.count().catch(() => 0)) await out.click()
}

/**
 * Capture all network responses during a block. Returns the raw list so
 * callers can assert on method/url/status. Mocked-only tests will return
 * empty.
 */
export async function captureNetwork(page: Page, fn: () => Promise<void>) {
  const reqs: { method: string; url: string; status: number }[] = []
  const onResp = (resp: any) => {
    reqs.push({ method: resp.request().method(), url: resp.url(), status: resp.status() })
  }
  page.on('response', onResp)
  try {
    await fn()
  } finally {
    page.off('response', onResp)
  }
  return reqs
}

/**
 * Fail the test if any console.error fires during fn. Allows benign
 * third-party noise (favicon 404s, navigation cancellations, etc.).
 */
export async function expectNoConsoleErrors(page: Page, fn: () => Promise<void>) {
  const errs: string[] = []
  const handler = (msg: any) => {
    if (msg.type() === 'error') errs.push(msg.text())
  }
  page.on('console', handler)
  try {
    await fn()
  } finally {
    page.off('console', handler)
  }
  const fatal = errs.filter(
    (e) =>
      !/favicon|net::ERR_|Failed to load resource/i.test(e) &&
      !/Failed to fetch/i.test(e) &&
      !/TypeError: Load failed/i.test(e),
  )
  expect(fatal, 'console errors during interaction').toEqual([])
}

/**
 * Read the JWT bearer token that the molecule auth client persists.
 */
export async function getAccessToken(page: Page): Promise<string | null> {
  // [M1-1] The bearer token is held in memory (a localStorage copy is
  // XSS-exfiltratable); the persistent credential is the httpOnly `token`
  // cookie (prod: `__Host-token`), readable in tests via the Playwright
  // context. Its value IS the JWT.
  const cookies = await page.context().cookies()
  const tok = cookies.find((c) => /(^|[-_])token$/i.test(c.name) && c.value)
  return tok?.value ?? null
}

/** Authenticated POST helper for seeding domain data via the API. */
export async function authedPost<T = any>(page: Page, path: string, body: unknown): Promise<T> {
  const token = await getAccessToken(page)
  const resp = await page.request.post(API_BASE + path, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data: body,
  })
  if (!resp.ok()) {
    throw new Error(`POST ${path} failed: ${resp.status()} ${await resp.text()}`)
  }
  return resp.json() as Promise<T>
}

/** Authenticated PUT helper. */
export async function authedPut<T = any>(page: Page, path: string, body: unknown): Promise<T> {
  const token = await getAccessToken(page)
  const resp = await page.request.put(API_BASE + path, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data: body,
  })
  if (!resp.ok()) {
    throw new Error(`PUT ${path} failed: ${resp.status()} ${await resp.text()}`)
  }
  return resp.json() as Promise<T>
}

/** Authenticated GET helper. */
export async function authedGet<T = any>(page: Page, path: string): Promise<T> {
  const token = await getAccessToken(page)
  const resp = await page.request.get(API_BASE + path, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!resp.ok()) {
    throw new Error(`GET ${path} failed: ${resp.status()} ${await resp.text()}`)
  }
  return resp.json() as Promise<T>
}

/** Authenticated DELETE helper. */
export async function authedDelete(page: Page, path: string): Promise<void> {
  const token = await getAccessToken(page)
  const resp = await page.request.delete(API_BASE + path, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!resp.ok() && resp.status() !== 204) {
    throw new Error(`DELETE ${path} failed: ${resp.status()} ${await resp.text()}`)
  }
}
