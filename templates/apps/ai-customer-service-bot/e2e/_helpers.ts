// Auto-generated boilerplate for ai-customer-service-bot e2e suite.
// Add helpers here; do not delete the existing ones — every spec file
// should import from this module rather than rewriting auth/network
// plumbing per-test.

import { Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3000')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'test') {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

/**
 * Sign up a fresh user via the UI. Returns the credentials.
 *
 * Hardened against an auth-race that surfaced as "API-only" flakes: the
 * prior implementation only waited for navigation away from /signup.
 * React routes a moment after POST /api/users resolves, but the auth-state
 * hook that persists the JWT/cookie runs in a subsequent microtask. Tests
 * that called signup() then immediately fired an authenticated request
 * sometimes raced past the token landing → 401. We now gate on:
 *   1. the submit button being enabled,
 *   2. the POST /api/users response itself (listener armed BEFORE click
 *      so a fast response can't be missed),
 *   3. URL navigating off /signup.
 * No fixed sleeps; each step is a real event.
 */
export async function signup(page: Page, email = uniqueEmail(), password = 'TestPass123!') {
  await page.goto(APP_BASE + '/signup')
  // Wait for the form to mount before the optional-field probes below.
  // count() is a one-shot read with no auto-waiting, so after a goto it can
  // run against a still-empty React root, return 0, and SILENTLY SKIP the
  // fill — the form then won't submit and every spec in the app dies on a
  // signup timeout. That is exactly how restaurant-ordering lost all 78.
  await page.locator('input').first().waitFor({ state: 'visible', timeout: 15000 })
  await page.getByLabel(/email/i).first().fill(email)
  await page
    .getByLabel(/^password$/i)
    .first()
    .fill(password)
  const confirm = page.getByLabel(/confirm.*password|password.*confirm/i).first()
  if (await confirm.count().catch(() => 0)) await confirm.fill(password)
  const terms = page.getByRole('checkbox', { name: /terms|agree/i }).first()
  if (await terms.count().catch(() => 0)) await terms.check()
  const submit = page
    .getByRole('button', { name: /sign\s*up|create.*account|register|get\s*started/i })
    .first()
  await expect(submit).toBeEnabled({ timeout: 10000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 20_000 })
  return { email, password }
}

/**
 * Log an existing user in. Same hardening as `signup()`: deterministic
 * gates on the auth POST and the navigation away from /login — no fixed
 * sleeps.
 */
export async function login(page: Page, email: string, password: string) {
  await page.goto(APP_BASE + '/login')
  await page.getByLabel(/email/i).first().fill(email)
  await page
    .getByLabel(/password/i)
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
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 })
}

export async function logout(page: Page) {
  const out = page.getByRole('button', { name: /sign\s*out|log\s*out/i }).first()
  if (await out.count().catch(() => 0)) await out.click()
}

export interface NetReq {
  method: string
  url: string
  status: number
}

/**
 * Capture network responses during a block. Use this to assert the app
 * actually called the API instead of showing fake/hard-coded data.
 */
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

/**
 * Read the auth cookie from the browser context so backend assertions
 * (request.fetch with credentials) see the same session.
 */
export async function authHeaders(page: Page): Promise<Record<string, string>> {
  const cookies = await page.context().cookies()
  const cookie = cookies.map((c) => `${c.name}=${c.value}`).join('; ')
  return { Cookie: cookie, 'Content-Type': 'application/json' }
}

/**
 * Server-side helpers — these talk directly to the API using the
 * browser's session cookie. Useful for seeding state (knowledge
 * articles, conversations) without wading through the UI.
 */
export async function apiPost<T = unknown>(page: Page, path: string, body: unknown): Promise<T> {
  const res = await page.request.post(API_BASE + path, {
    headers: await authHeaders(page),
    data: body,
  })
  expect(res.status(), `POST ${path} failed: ${await res.text()}`).toBeLessThan(400)
  return (await res.json()) as T
}

export async function apiGet<T = unknown>(page: Page, path: string): Promise<T> {
  const res = await page.request.get(API_BASE + path, { headers: await authHeaders(page) })
  expect(res.status(), `GET ${path} failed: ${await res.text()}`).toBeLessThan(400)
  return (await res.json()) as T
}
