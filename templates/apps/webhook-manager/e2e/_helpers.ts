// e2e helpers for webhook-manager (Pylon).
//
// Auth via the public signup form (POST /api/users) so each test gets
// a fresh isolated user. New users start with EMPTY workspaces — no
// demo seed — so most assertions either drive the UI to create state
// first, then read it back.

import { Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3050')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4050') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'pylon'): string {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

export interface Credentials {
  email: string
  password: string
}

/**
 * Sign up via the UI; lands on /dashboard. Returns the credentials.
 *
 * Hardened against an auth-race: arm POST /api/users response listener
 * BEFORE clicking submit, assert 2xx, wait for navigation off /signup,
 * then poll localStorage until the access token actually lands. Without
 * these gates the auth-state hook (which persists the JWT) could still
 * be pending when a follow-up `getAccessToken(page)` call ran → returned
 * '' and downstream API calls 401'd.
 */
export async function signup(page: Page, opts: Partial<Credentials> = {}): Promise<Credentials> {
  const email = opts.email ?? uniqueEmail()
  const password = opts.password ?? 'TestPass1234!'
  await page.goto(APP_BASE + '/signup')
  // Wait for the form to mount before the optional-field probes below.
  // count() is a one-shot read with no auto-waiting, so after a goto it can
  // run against a still-empty React root, return 0, and SILENTLY SKIP the
  // fill — the form then won't submit and every spec in the app dies on a
  // signup timeout. That is exactly how restaurant-ordering lost all 78.
  await page.locator('input').first().waitFor({ state: 'visible', timeout: 15000 })
  await page.locator('input[type="email"]').fill(email)
  const pwInputs = page.locator('input[type="password"]')
  await pwInputs.first().fill(password)
  if ((await pwInputs.count()) > 1) {
    await pwInputs.nth(1).fill(password)
  }
  // Optional T&C checkbox
  const tc = page.getByRole('checkbox').first()
  if (await tc.count().catch(() => 0)) {
    if (!(await tc.isChecked())) await tc.check()
  }
  const submit = page
    .getByRole('button', { name: /create.*account|sign.*up|get.*started/i })
    .first()
  await expect(submit).toBeEnabled({ timeout: 10000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 15_000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
  return { email, password }
}

/**
 * Login an existing user via the UI. Same hardening as signup().
 */
export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto(APP_BASE + '/login')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  const submit = page.getByRole('button', { name: /sign in|log in/i }).first()
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
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
}

/**
 * Capture network responses during a block.
 */
export async function captureNetwork(
  page: Page,
  fn: () => Promise<void>,
): Promise<Array<{ method: string; url: string; status: number }>> {
  const reqs: Array<{ method: string; url: string; status: number }> = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onResp = (resp: any) => {
    reqs.push({
      method: resp.request().method(),
      url: resp.url(),
      status: resp.status(),
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

/**
 * Pull the persisted access token from the httpOnly cookie post-signup so
 * tests can call the API directly with a known JWT.
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

/**
 * The access token, or a failed test. Every helper here needs a real JWT; a
 * missing cookie means signup/login did not land, which is a failure to
 * surface rather than a null to thread through every call site.
 */
export async function requireAccessToken(page: Page): Promise<string> {
  const token = await getAccessToken(page)
  if (!token) throw new Error('no access token — signup or log-in did not persist the cookie')
  return token
}

/**
 * Create a webhook via the API directly; returns the created row.
 *
 * The handler requires `name` (used as the friendly description in the UI).
 * We default it from the URL.
 */
export async function createWebhookViaApi(
  page: Page,
  token: string,
  overrides: Record<string, unknown> = {},
): Promise<{
  id: string
  url: string
  name: string
  description: string | null
  is_active: boolean
}> {
  const url = (overrides.url as string | undefined) ?? 'https://example.com/hooks/' + Date.now()
  const body: Record<string, unknown> = {
    name: 'Test endpoint ' + Date.now(),
    url,
    description: 'Spec order events',
    events: ['order.completed'],
    is_active: true,
    ...overrides,
  }
  const r = await page.request.post(API_BASE + '/webhooks', {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data: body,
  })
  if (!r.ok()) throw new Error(`createWebhookViaApi: ${r.status()} ${await r.text()}`)
  const json = await r.json()
  return json
}
