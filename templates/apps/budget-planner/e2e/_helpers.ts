// Shared test helpers for the budget-planner Playwright suite. Every spec
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
 * Sign up a fresh user via the Signup form. The Coffer signup form has
 * id-anchored fields (name, email, password, confirm). After submit the
 * app navigates to /dashboard via the AuthGuard.
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
  await page.locator('input#name').fill('Test User')
  await page.locator('input#email').fill(email)
  await page.locator('input#password').fill(password)
  await page.locator('input#confirm').fill(password)
  const submit = page.getByRole('button', { name: /create\s*account/i }).first()
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
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
}

export async function logout(page: Page) {
  // Click the user menu, then the sign-out button.
  const menuTriggers = [
    page.getByRole('button', { name: /user|account|menu|profile/i }).first(),
    page.locator('[aria-label*="user" i]').first(),
  ]
  for (const t of menuTriggers) {
    if (await t.count().catch(() => 0)) {
      await t.click().catch(() => {})
      break
    }
  }
  const out = page.getByRole('button', { name: /sign\s*out|log\s*out/i }).first()
  if (await out.count().catch(() => 0)) await out.click()
}

/** Capture all network responses during a block; useful for asserting the
 *  app actually called the API (and that it returned 2xx). */
export async function captureNetwork(page: Page, fn: () => Promise<void>) {
  const reqs: { method: string; url: string; status: number; postData?: string | null }[] = []
  const onResp = async (resp: any) => {
    let postData: string | null = null
    try {
      postData = resp.request().postData()
    } catch {}
    reqs.push({
      method: resp.request().method(),
      url: resp.url(),
      status: resp.status(),
      postData,
    })
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

/** Decode the userId out of the JWT from the auth cookie. */
export async function getMyUserId(page: Page): Promise<string> {
  const token = await getAccessToken(page)
  if (!token) throw new Error('No accessToken cookie — call signup() first')
  const segments = token.split('.')
  if (segments.length < 2) throw new Error('Token is not a JWT')
  const payload = JSON.parse(Buffer.from(segments[1], 'base64').toString('utf8'))
  const userId = payload.userId ?? payload.sub ?? payload.user_id
  if (!userId) throw new Error('JWT missing userId: ' + JSON.stringify(payload))
  return userId as string
}

/** Read the access token from the httpOnly cookie set by the auth bond.
 *  [M1-1]: token is in memory; persistent credential is the httpOnly cookie. */
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
 * Issue an authenticated request through the page's session. Returns the
 * parsed JSON body. Use this to seed fixtures (an account, a category)
 * before navigating to a page under test, OR to read-after-write to verify
 * an invariant.
 */
export async function api<T = unknown>(
  page: Page,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  data?: unknown,
): Promise<T> {
  const token = await getAccessToken(page)
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (data !== undefined) headers['Content-Type'] = 'application/json'
  const url = path.startsWith('http')
    ? path
    : `${API_BASE.replace(/\/$/, '')}/${path.replace(/^\/?(api\/)?/, '')}`
  const resp = await page.request.fetch(url, {
    method,
    headers,
    data: data === undefined ? undefined : JSON.stringify(data),
  })
  expect(resp.status(), `${method} ${path} → ${resp.status()}`).toBeLessThan(400)
  if (resp.status() === 204) return undefined as T
  const text = await resp.text()
  try {
    return JSON.parse(text) as T
  } catch {
    return text as T
  }
}
