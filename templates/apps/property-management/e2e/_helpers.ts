// Shared test helpers for the property-management e2e suite.
import { Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3220')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4220') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'pm-test') {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

/**
 * Sign up a fresh user via the Signup form.
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
  await page.locator('#firstName').fill('Pat')
  await page.locator('#lastName').fill('Saunders')
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page.locator('#confirmPassword').fill(password)
  const submit = page.getByRole('button', { name: /Create account/i }).first()
  await expect(submit).toBeEnabled({ timeout: 10000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 30000 })
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
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
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

export async function captureNetwork(page: Page, fn: () => Promise<void>) {
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
 * Unwrap an API response that may or may not be wrapped in a `{data: ...}`
 * envelope. Most property-management resources return the row directly;
 * billing/mock-server resources return `{data: ...}`.
 */
function unwrap<T>(body: unknown): T {
  if (body && typeof body === 'object' && 'data' in body && Object.keys(body).length === 1) {
    return (body as { data: T }).data
  }
  return body as T
}

export async function authedPost<T = unknown>(page: Page, path: string, body: unknown): Promise<T> {
  const token = await getAccessToken(page)
  const resp = await page.request.post(API_BASE + path, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data: body,
  })
  if (!resp.ok()) {
    throw new Error(`POST ${path} failed: ${resp.status()} ${await resp.text()}`)
  }
  return unwrap<T>(await resp.json())
}

export async function authedPut<T = unknown>(page: Page, path: string, body: unknown): Promise<T> {
  const token = await getAccessToken(page)
  const resp = await page.request.put(API_BASE + path, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data: body,
  })
  if (!resp.ok()) {
    throw new Error(`PUT ${path} failed: ${resp.status()} ${await resp.text()}`)
  }
  return unwrap<T>(await resp.json())
}

export async function authedGet<T = unknown>(page: Page, path: string): Promise<T> {
  const token = await getAccessToken(page)
  const resp = await page.request.get(API_BASE + path, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!resp.ok()) {
    throw new Error(`GET ${path} failed: ${resp.status()} ${await resp.text()}`)
  }
  return unwrap<T>(await resp.json())
}
