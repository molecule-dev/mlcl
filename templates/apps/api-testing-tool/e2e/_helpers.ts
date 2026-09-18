// Shared test helpers for api-testing-tool e2e specs.
//
// Every spec imports from here rather than rewriting auth/network plumbing.
//
// Notes specific to this flagship:
//
// - The signup form lives at /signup with Full name + Email address +
//   Password + Confirm password fields and a "Create account" submit.
// - The login form lives at /login with Email address + Password fields
//   and a "Sign in" submit.
// - The post-signup landing route is /workspace.
// - Authentication is token-based — the @molecule/app-auth client issues
//   an httpOnly `token` cookie (M1-1); the JWT is readable in tests via
//   `getAccessToken(page)` which reads `page.context().cookies()`.
// - We use `getByLabel(...)` rather than `getByRole('textbox', ...)`
//   because password inputs don't expose a textbox role.

import { Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3000')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'test') {
  return `${prefix}+${Date.now()}-${++counter}@pylon.test`
}

/** Sign up a fresh user; returns the credentials. Lands on /workspace. */
export async function signup(
  page: Page,
  email = uniqueEmail(),
  password = 'TestPass123!',
  name = 'Test User',
) {
  await page.goto(APP_BASE + '/signup')
  await page.getByLabel(/Full name/i).fill(name)
  await page.getByLabel(/Email address/i).fill(email)
  await page.getByLabel(/^Password$/i).fill(password)
  await page.getByLabel(/Confirm password/i).fill(password)
  const submit = page.getByRole('button', { name: /Create account/i })
  await expect(submit).toBeEnabled({ timeout: 10_000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30_000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 15_000 })
  // Wait for the workspace bootstrap GETs to settle so subsequent
  // navigations see populated saved-requests / environment lists.
  await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
  return { email, password, name }
}

export async function login(page: Page, email: string, password: string) {
  await page.goto(APP_BASE + '/login')
  await page.getByLabel(/Email address/i).fill(email)
  await page.getByLabel(/^Password$/i).fill(password)
  const submit = page.getByRole('button', { name: /Sign in/i })
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
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 })
}

export async function logout(page: Page) {
  const menu = page.getByRole('button', { name: /open user menu|account|user/i }).first()
  if (await menu.count().catch(() => 0)) await menu.click()
  const out = page.getByRole('button', { name: /sign\s*out|log\s*out/i }).first()
  if (await out.count().catch(() => 0)) await out.click()
}

/** Capture every network response during a block; useful for asserting the
 *  app actually called the API (not just that the click handler fired). */
export async function captureNetwork(
  page: Page,
  fn: () => Promise<void>,
): Promise<{ method: string; url: string; status: number }[]> {
  const reqs: { method: string; url: string; status: number }[] = []
  const onResp = (resp: { request(): { method(): string }; url(): string; status(): number }) => {
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

/** Fail the test if any console.error fires during fn (allowing benign
 *  third-party noise like favicon 404s and resource load failures). */
export async function expectNoConsoleErrors(page: Page, fn: () => Promise<void>) {
  const errs: string[] = []
  const handler = (msg: { type(): string; text(): string }) => {
    if (msg.type() === 'error') errs.push(msg.text())
  }
  page.on('console', handler)
  try {
    await fn()
  } finally {
    page.off('console', handler)
  }
  const fatal = errs.filter((e) => !/favicon|net::ERR_|Failed to load resource/i.test(e))
  expect(fatal, 'console errors during interaction').toEqual([])
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

/** Issue an authed API request using the auth cookie's Bearer token.
 *  `credentials: 'include'` also sends the httpOnly cookie automatically. */
export async function apiRequest<T = unknown>(
  page: Page,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<{ status: number; body: T }> {
  const token = await getAccessToken(page)
  return page.evaluate(
    async ({ method, path, body, token }) => {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
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
        // some responses are 204 / non-JSON
      }
      return { status: resp.status, body: parsed as never }
    },
    { method, path, body, token },
  )
}
