/**
 * Shared spec helpers for coupon-deals-platform.
 *
 * Hand-written: provides signup/login flows that match the real DOM
 * (Snagr auth shell uses `id="firstName"`, `id="lastName"`, `id="email"`,
 * `id="password"`, `id="confirm"` inputs and a `data-mol-id="signup-form"`
 * / `data-mol-id="auth-submit"` submit button).
 *
 * Auth uses an httpOnly `token` cookie (prod: `__Host-token`) as the
 * persistent credential; helpers read it via the Playwright context so
 * callers can authenticate page.request.* APIs against the real backend.
 */

import { Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3070')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4070') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'snagr'): string {
  return `${prefix}+${Date.now()}-${++counter}@flagship.test`
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

export interface SignupResult {
  email: string
  password: string
  firstName: string
  lastName: string
  accessToken: string
  userId: string
}

/**
 * Sign up a fresh user via the signup form. Returns credentials AND the
 * JWT access token persisted to localStorage so callers can drive
 * `page.request.*` against the real API.
 *
 * Hardened against an auth-race: arm POST /api/users response listener
 * BEFORE clicking submit, assert 2xx, wait for navigation to /dashboard,
 * then poll localStorage until the access token actually lands. Without
 * these gates the access-token read below sometimes ran before the
 * auth-state hook persisted the token → throws "did not persist an
 * access token to localStorage" intermittently.
 */
export async function signup(
  page: Page,
  email = uniqueEmail(),
  password = 'TestPass!1234',
  firstName = 'Test',
  lastName = 'User',
): Promise<SignupResult> {
  await page.goto(APP_BASE + '/signup')
  await page.locator('input#firstName').fill(firstName)
  await page.locator('input#lastName').fill(lastName)
  await page.locator('input#email').fill(email)
  await page.locator('input#password').fill(password)
  await page.locator('input#confirm').fill(password)
  const submit = page.locator('form[data-mol-id="signup-form"] button[type="submit"]')
  await expect(submit).toBeEnabled({ timeout: 10000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await page.waitForURL('**/dashboard', { timeout: 20_000 })
  await expect(page).toHaveURL(/\/dashboard/)
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
  const accessToken = await getAccessToken(page)
  if (!accessToken) throw new Error('signup did not persist an access token')
  const userRes = await page.request.get(API_BASE + '/users/me')
  const userBody = (await userRes.json()) as { props?: { id?: string }; id?: string }
  const userId = userBody.props?.id ?? userBody.id ?? ''
  if (!userId) throw new Error('signup did not return a user id')
  return { email, password, firstName, lastName, accessToken: accessToken ?? '', userId }
}

/** Log in an existing user via the login form. Same hardening as signup(). */
export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto(APP_BASE + '/login')
  // Login form re-uses AuthFormAtoms, so id="email" and id="password".
  await page.locator('input#email').fill(email)
  await page.locator('input#password').fill(password)
  const submit = page.locator('form[data-mol-id="login-form"] button[type="submit"]')
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
}

/** Capture every network response that happens during fn(). */
export async function captureNetwork(
  page: Page,
  fn: () => Promise<void>,
): Promise<{ method: string; url: string; status: number }[]> {
  const reqs: { method: string; url: string; status: number }[] = []
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

export function apiHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }
}

/** Wait until a deal id list returns from /api/deals. */
export async function fetchDealIds(page: Page, accessToken: string, n = 4): Promise<string[]> {
  const res = await page.request.get(`${API_BASE}/deals`, { headers: apiHeaders(accessToken) })
  expect(res.status()).toBe(200)
  const list = (await res.json()) as { id: string }[]
  return list.slice(0, n).map((d) => d.id)
}

export async function fetchMerchantIds(page: Page, accessToken: string, n = 4): Promise<string[]> {
  const res = await page.request.get(`${API_BASE}/merchants`, {
    headers: apiHeaders(accessToken),
  })
  expect(res.status()).toBe(200)
  const list = (await res.json()) as { id: string }[]
  return list.slice(0, n).map((m) => m.id)
}

export async function saveCoupon(
  page: Page,
  accessToken: string,
  dealId: string,
): Promise<{ id: string; code: string }> {
  const res = await page.request.post(`${API_BASE}/redemptions`, {
    headers: apiHeaders(accessToken),
    data: { deal_id: dealId },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBe(201)
  const body = (await res.json()) as { redemptions: { id: string; code: string }[] }
  return { id: body.redemptions[0].id, code: body.redemptions[0].code }
}

export async function getMyCoupons(
  page: Page,
  accessToken: string,
): Promise<{ id: string; deal_id: string; status: string }[]> {
  const res = await page.request.get(`${API_BASE}/my-coupons`, {
    headers: apiHeaders(accessToken),
  })
  expect(res.status()).toBe(200)
  return (await res.json()) as { id: string; deal_id: string; status: string }[]
}

export async function getNotifications(
  page: Page,
  accessToken: string,
): Promise<{ id: string; unread: boolean; type: string }[]> {
  const res = await page.request.get(`${API_BASE}/notifications`, {
    headers: apiHeaders(accessToken),
  })
  expect(res.status()).toBe(200)
  return (await res.json()) as { id: string; unread: boolean; type: string }[]
}
