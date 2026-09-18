// Shared test helpers for the 3d-model-viewer Playwright suite. Every spec
// file imports from this module rather than rewriting auth / network /
// fixture plumbing per-test.

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
 * Sign up a fresh user via the Signup form. The Tessera signup form has
 * id-anchored fields (firstName / lastName / email / password / confirmPassword)
 * which we fill directly to avoid label-matching ambiguity. After submit the
 * app navigates to /dashboard.
 *
 * Hardening: arm the POST /api/users response listener BEFORE clicking so
 * a fast response can't be missed, gate the click on the submit button
 * actually being enabled, and assert the POST succeeded before checking
 * that we navigated off /signup. Eliminates an auth-race where the test
 * read the auth cookie before the POST response had landed.
 */
export async function signup(page: Page, email = uniqueEmail(), password = 'TestPass123!') {
  await page.goto(APP_BASE + '/signup')
  await page.locator('input#firstName').fill('Test')
  await page.locator('input#lastName').fill('User')
  await page.locator('input#email').fill(email)
  await page.locator('input#password').fill(password)
  await page.locator('input#confirmPassword').fill(password)
  const submit = page.getByRole('button', { name: /create\s*account/i }).first()
  await expect(submit).toBeEnabled({ timeout: 10000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 15000 })
  return { email, password }
}

/**
 * Decode the userId out of the JWT stored in the page's `token` cookie.
 * The molecule auth bond signs JWTs with `{ userId, deviceId, ... }` payloads.
 */
export async function getMyUserId(page: Page): Promise<string> {
  const cookies = await page.context().cookies()
  const tokenCookie = cookies.find((c) => c.name === 'token' || c.name === 'accessToken')
  if (!tokenCookie) throw new Error('No auth cookie found — call signup() first')
  const segments = tokenCookie.value.split('.')
  if (segments.length < 2) throw new Error('Cookie value is not a JWT')
  const payload = JSON.parse(Buffer.from(segments[1], 'base64').toString('utf8'))
  if (!payload.userId) throw new Error('JWT has no userId field: ' + JSON.stringify(payload))
  return payload.userId as string
}

export async function login(page: Page, email: string, password: string) {
  await page.goto(APP_BASE + '/login')
  await page.locator('input#email, input[type=email]').first().fill(email)
  await page.locator('input#password, input[type=password]').first().fill(password)
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
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 })
}

/**
 * Capture all network responses during `fn`. Useful for asserting that the
 * UI actually fired the API call we expect (and that it returned 2xx).
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

/** Fail the test if any console.error fires during fn (allowing benign
 *  third-party noise like favicon 404s). */
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
  const fatal = errs.filter((e) => !/favicon|net::ERR_|Failed to load resource/.test(e))
  expect(fatal, 'console errors during interaction').toEqual([])
}

/**
 * Issue an authenticated request through the page's session cookies. Returns
 * the parsed JSON body. Use this to seed fixtures (a model, an embed) before
 * navigating to a page under test.
 */
export async function api<T = unknown>(
  page: Page,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  data?: unknown,
): Promise<T> {
  const cookies = await page.context().cookies()
  const cookieStr = cookies.map((c) => `${c.name}=${c.value}`).join('; ')
  const headers: Record<string, string> = cookieStr ? { Cookie: cookieStr } : {}
  if (data !== undefined) headers['Content-Type'] = 'application/json'
  // Allow callers to pass "/models" or "/api/models" interchangeably.
  const url = path.startsWith('http')
    ? path
    : `${API_BASE.replace(/\/$/, '')}/${path.replace(/^\/?(api\/)?/, '')}`
  const resp = await page.request.fetch(url, {
    method,
    headers,
    data: data === undefined ? undefined : JSON.stringify(data),
  })
  expect(resp.status(), `${method} ${path}`).toBeLessThan(400)
  if (resp.status() === 204) return undefined as T
  const text = await resp.text()
  try {
    return JSON.parse(text) as T
  } catch {
    return text as T
  }
}

/**
 * Convenience: sign up, then create a model. Returns model + credentials.
 */
export async function signUpWithModel(
  page: Page,
  modelName = `Test Model ${Date.now()}`,
  visibility: 'private' | 'unlisted' | 'public' = 'private',
) {
  const creds = await signup(page)
  const model = await api<Record<string, unknown>>(page, 'POST', '/models', {
    name: modelName,
    file_url: 'https://example.com/cube.glb',
    format: 'glb',
    file_size: 1024,
    polygon_count: 10,
    visibility,
  })
  return { ...creds, model }
}
