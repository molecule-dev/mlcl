// e2e helpers for customer-support-chat. JWT bearer auth via httpOnly cookie.
// Every spec should import from this module.

import { expect, Page } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3000')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'csc'): string {
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

/** Sign up a fresh user via the UI; returns the credentials.
 *  Uses input type/autocomplete selectors rather than getByLabel because
 *  the label markup wraps the input via a layout div + icon span and the
 *  accessible-name graph isn't reliable across all themes. */
export async function signup(
  page: Page,
  email = uniqueEmail(),
  password = 'TestPass123!',
): Promise<{ email: string; password: string }> {
  await page.goto(APP_BASE + '/signup')
  // Wait for the form to mount before the optional-field probes below.
  // count() is a one-shot read with no auto-waiting, so after a goto it can
  // run against a still-empty React root, return 0, and SILENTLY SKIP the
  // fill — the form then won't submit and every spec in the app dies on a
  // signup timeout. That is exactly how restaurant-ordering lost all 78.
  await page.locator('input').first().waitFor({ state: 'visible', timeout: 15000 })
  // Optional first/last name (only present on flagships that include them).
  const firstName = page.locator('input[autocomplete="given-name"]').first()
  if (await firstName.count().catch(() => 0)) await firstName.fill('Test')
  const lastName = page.locator('input[autocomplete="family-name"]').first()
  if (await lastName.count().catch(() => 0)) await lastName.fill('User')
  await page.locator('input[type="email"]').first().fill(email)
  // Two password fields (Password + Confirm password).
  const passwordInputs = page.locator('input[type="password"]')
  const passwordCount = await passwordInputs.count()
  await passwordInputs.first().fill(password)
  if (passwordCount > 1) await passwordInputs.nth(1).fill(password)
  const terms = page.getByRole('checkbox', { name: /terms|agree/i }).first()
  if (await terms.count().catch(() => 0)) await terms.check()
  const submit = page
    .getByRole('button', { name: /sign\s*up|create.*account|register|get\s*started/i })
    .first()
  await expect(submit).toBeEnabled({ timeout: 10_000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30_000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 20_000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10_000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
  return { email, password }
}

export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto(APP_BASE + '/login')
  await page.locator('input[type="email"]').first().fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  const submit = page.getByRole('button', { name: /sign\s*in|log\s*in/i }).first()
  await expect(submit).toBeEnabled({ timeout: 10_000 })
  const loginResponse = page.waitForResponse(
    (r) =>
      /\/api\/users\/log-in(\?|$)|\/api\/auth\/login(\?|$)|\/api\/login(\?|$)/.test(r.url()) &&
      r.request().method() === 'POST',
    { timeout: 20_000 },
  )
  await submit.click()
  const resp = await loginResponse
  expect(resp.status(), `POST login → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10_000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
}

export interface NetReq {
  method: string
  url: string
  status: number
}

/** Capture network responses during a block. Use this to assert the app
 *  actually called the API instead of showing fake/hard-coded data. */
export async function captureNetwork(page: Page, fn: () => Promise<void>): Promise<NetReq[]> {
  const reqs: NetReq[] = []
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

async function authHeaders(page: Page): Promise<Record<string, string>> {
  const token = await getAccessToken(page)
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

export async function apiPost<T = unknown>(page: Page, path: string, body: unknown): Promise<T> {
  const res = await page.request.post(API_BASE + path, {
    headers: await authHeaders(page),
    data: body as any,
  })
  expect(res.status(), `POST ${path} failed: ${await res.text()}`).toBeLessThan(400)
  return (await res.json()) as T
}

export async function apiPut<T = unknown>(page: Page, path: string, body: unknown): Promise<T> {
  const res = await page.request.put(API_BASE + path, {
    headers: await authHeaders(page),
    data: body as any,
  })
  expect(res.status(), `PUT ${path} failed: ${await res.text()}`).toBeLessThan(400)
  return (await res.json()) as T
}

export async function apiPatch<T = unknown>(page: Page, path: string, body: unknown): Promise<T> {
  const res = await page.request.patch(API_BASE + path, {
    headers: await authHeaders(page),
    data: body as any,
  })
  expect(res.status(), `PATCH ${path} failed: ${await res.text()}`).toBeLessThan(400)
  return (await res.json()) as T
}

export async function apiGet<T = unknown>(page: Page, path: string): Promise<T> {
  const res = await page.request.get(API_BASE + path, {
    headers: await authHeaders(page),
  })
  expect(res.status(), `GET ${path} failed: ${await res.text()}`).toBeLessThan(400)
  return (await res.json()) as T
}

export async function apiDelete(page: Page, path: string): Promise<void> {
  const res = await page.request.delete(API_BASE + path, {
    headers: await authHeaders(page),
  })
  expect(res.status(), `DELETE ${path} failed: ${await res.text()}`).toBeLessThan(400)
}

/** Returns raw response (no auto-throw) so callers can assert on
 *  expected error statuses. */
export async function apiRaw(
  page: Page,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<{ status: number; bodyText: string; bodyJson: any | null }> {
  const headers = await authHeaders(page)
  const lowerMethod = method.toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete'
  const res = await page.request[lowerMethod](API_BASE + path, {
    headers,
    ...(body !== undefined ? { data: body as any } : {}),
  })
  const bodyText = await res.text()
  let bodyJson: any | null = null
  try {
    bodyJson = JSON.parse(bodyText)
  } catch {
    bodyJson = null
  }
  return { status: res.status(), bodyText, bodyJson }
}
