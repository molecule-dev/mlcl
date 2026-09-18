// e2e test helpers for api-documentation. Imported by every spec.
//
// Auth via the public signup form so each test gets a fresh isolated
// user (Stripe price IDs, plan flips, profile fields, integration
// toggles all bind to userId server-side; sharing a user across tests
// cross-contaminates state).

import { Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3000')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'test') {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

export interface Credentials {
  email: string
  password: string
  name: string
}

/** Sign up a fresh user via the UI; returns the credentials.
 *
 *  Hardened against the auth-race: arm POST /api/users response listener
 *  BEFORE clicking submit so a fast response can't be missed, gate on
 *  status < 400, then wait for navigation off /signup. Eliminates the
 *  API-only flake where a spec read the persisted JWT from localStorage
 *  before the auth-state hook had a chance to write it. */
export async function signup(page: Page, opts: Partial<Credentials> = {}): Promise<Credentials> {
  const email = opts.email ?? uniqueEmail()
  const password = opts.password ?? 'TestPass123!'
  const name = opts.name ?? 'Smoke Tester'

  await page.goto(APP_BASE + '/signup')
  await page.getByRole('textbox', { name: /name/i }).fill(name)
  await page.getByRole('textbox', { name: /email/i }).fill(email)
  await page.getByRole('textbox', { name: /^password$/i }).fill(password)
  const submit = page.getByRole('button', { name: /create account|sign\s*up|get\s*started/i })
  await expect(submit).toBeEnabled({ timeout: 10000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 30000 })
  return { email, password, name }
}

export async function login(page: Page, email: string, password: string) {
  await page.goto(APP_BASE + '/login')
  await page.getByRole('textbox', { name: /email/i }).fill(email)
  await page.getByRole('textbox', { name: /password/i }).fill(password)
  const submit = page.getByRole('button', { name: /sign\s*in|log\s*in/i })
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

/** Capture all network responses during a block. */
export async function captureNetwork(
  page: Page,
  fn: () => Promise<void>,
): Promise<Array<{ method: string; url: string; status: number }>> {
  const reqs: Array<{ method: string; url: string; status: number }> = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

/** Sign up via the UI and return the access token by intercepting the
 *  registration response. We must arm the listener BEFORE submitting the
 *  form. The auth bond writes to localStorage but only after a couple of
 *  React effect ticks, so reading the response directly is more reliable. */
export async function signupAndGetToken(
  page: Page,
  opts: Partial<Credentials> = {},
): Promise<{ creds: Credentials; token: string }> {
  const email = opts.email ?? uniqueEmail()
  const password = opts.password ?? 'TestPass123!'
  const name = opts.name ?? 'Smoke Tester'

  await page.goto(APP_BASE + '/signup')
  await page.getByRole('textbox', { name: /name/i }).fill(name)
  await page.getByRole('textbox', { name: /email/i }).fill(email)
  await page.getByRole('textbox', { name: /^password$/i }).fill(password)

  // Wait for the registration response while clicking submit.
  const [resp] = await Promise.all([
    page.waitForResponse(
      (r) => /\/api\/users(\b|\?|$)/.test(r.url()) && r.request().method() === 'POST',
      { timeout: 15_000 },
    ),
    page.getByRole('button', { name: /create account|sign\s*up|get\s*started/i }).click(),
  ])
  let token = ''
  if (resp.status() < 400) {
    const body = (await resp.json().catch(() => null)) as { accessToken?: string } | null
    token = body?.accessToken ?? ''
  }
  // Fallback: the auth bond writes to localStorage shortly after the
  // response resolves; give it a beat and read the persisted token.
  if (!token) {
    await expect(page).not.toHaveURL(/\/signup/, { timeout: 15_000 })
    token = await getAccessTokenAfterSignup(page)
  } else {
    await expect(page).not.toHaveURL(/\/signup/, { timeout: 15_000 })
  }
  return { creds: { email, password, name }, token }
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

/** Read the access token from the httpOnly cookie. Returns '' if unavailable.
 *  [M1-1]: kept as a named alias used by signupAndGetToken fallback. */
export async function getAccessTokenAfterSignup(page: Page): Promise<string> {
  return (await getAccessToken(page)) ?? ''
}
