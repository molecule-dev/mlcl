/**
 * Shared helpers for subscription-box e2e specs. Drives a real browser
 * against the dev server (vite=3090, api=4090 by default) hitting a
 * real Postgres + Stripe (test mode) + Mailgun (sandbox). No mocks —
 * outcomes assert on backend state, real Stripe checkout URLs, etc.
 */
import { type Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3090')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4090') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'curator'): string {
  // Include process.pid so parallel Playwright workers (each is its own
  // process) cannot collide even on the same millisecond.
  const rand = Math.random().toString(36).slice(2, 8)
  return `${prefix}+${Date.now()}-${process.pid}-${++counter}-${rand}@flagship.test`
}

export interface Credentials {
  email: string
  password: string
  firstName: string
  lastName: string
  accessToken: string
  userId: string | null
}

export async function signup(
  page: Page,
  opts: Partial<Pick<Credentials, 'email' | 'password' | 'firstName' | 'lastName'>> = {},
): Promise<Credentials> {
  const email = opts.email ?? uniqueEmail()
  const password = opts.password ?? 'TestPass123!'
  const firstName = opts.firstName ?? 'Test'
  const lastName = opts.lastName ?? 'Curator'
  await page.goto(APP_BASE + '/signup')
  await page.locator('input[autocomplete="given-name"]').fill(firstName)
  await page.locator('input[autocomplete="family-name"]').fill(lastName)
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[autocomplete="new-password"]').first().fill(password)
  await page.locator('input[autocomplete="new-password"]').nth(1).fill(password)
  const submit = page
    .getByRole('button', { name: /start your box|sign\s*up|create.*account/i })
    .first()
  await expect(submit).toBeEnabled({ timeout: 10_000 })
  // Hardening: arm POST listener BEFORE click + poll for token AFTER nav.
  // See virtual-classroom/_helpers.ts for the auth-race rationale.
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30_000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await page.waitForURL(/\/dashboard/, { timeout: 20_000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10_000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)

  const accessToken = (await getAccessToken(page)) ?? ''
  const userRes = await page.request.get(API_BASE + '/users/me')
  const userJson = (await userRes.json()) as { props?: { id?: string }; id?: string }
  const userId = userJson?.props?.id ?? userJson?.id ?? null
  if (!accessToken) throw new Error('signup did not persist an access token')
  return { email, password, firstName, lastName, accessToken, userId }
}

/**
 * Become the store merchant for the current (already-authed) session.
 *
 * The shared `subscription_plans` catalog writes (plan create/update) and the
 * shipment fulfillment writes (create a shipment, advance its status) are gated
 * behind `requireAdmin`, and the order lifecycle ops are gated through the order
 * merchant authorizer — all read `users.role`, which defaults to the
 * non-operator 'customer' on a fresh signup. This calls the dev-only
 * `POST /api/_test/promote-admin` endpoint (404 in production; served only when
 * `ENABLE_E2E_TEST_ENDPOINTS=true`, which the harness sets) to elevate the
 * caller's OWN row to `role = 'admin'`. So an operator e2e flow signs up a fresh
 * user and then becomes the merchant — exercising the real operator surfaces
 * without weakening the gate for ordinary customers.
 */
export async function promoteToAdmin(page: Page, accessToken?: string | null): Promise<void> {
  const token = accessToken ?? (await getAccessToken(page))
  const res = await page.request.post(`${API_BASE}/_test/promote-admin`, {
    headers: token
      ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      : { 'Content-Type': 'application/json' },
    failOnStatusCode: false,
  })
  expect(res.status(), `POST /api/_test/promote-admin → ${res.status()}`).toBeLessThan(400)
}

export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto(APP_BASE + '/login')
  await page.locator('input[type="email"]').first().fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  const submit = page.getByRole('button', { name: /sign\s*in|log\s*in|submit|continue/i }).first()
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
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10_000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
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

export function apiHeaders(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
}

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
    // After fn returns, briefly wait for the network to go idle so any
    // useEffect-triggered requests that fired right as fn() resolved get
    // recorded.
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
  } finally {
    page.off('response', onResp)
  }
  return reqs
}

export interface ApiPlan {
  id: string
  slug: string
  name: string
  description: string
  price: number
  currency: string
  interval: string
  interval_count: number
  features: string[]
  included_items: string[]
  popular: boolean
  stripe_price_id: string | null
  active: boolean
}

export async function fetchPlans(page: Page, accessToken: string): Promise<ApiPlan[]> {
  const res = await page.request.get(`${API_BASE}/plans`, {
    headers: apiHeaders(accessToken),
  })
  expect(res.status(), await res.text()).toBe(200)
  const json = (await res.json()) as { data?: ApiPlan[] } | ApiPlan[]
  return Array.isArray(json) ? json : (json.data ?? [])
}

/** Subscribe locally (skips Stripe). Returns the active subscription. */
export async function subscribeLocal(
  page: Page,
  accessToken: string,
  planId: string,
): Promise<{ subscription: { id: string; status: string; plan_id: string } }> {
  const res = await page.request.post(`${API_BASE}/subscriptions`, {
    headers: apiHeaders(accessToken),
    data: { plan_id: planId },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBe(201)
  return (await res.json()) as { subscription: { id: string; status: string; plan_id: string } }
}

export async function fetchMineSubscription(
  page: Page,
  accessToken: string,
): Promise<{
  id: string
  status: string
  plan_id: string
  preferences: Record<string, unknown>
} | null> {
  const res = await page.request.get(`${API_BASE}/subscriptions/mine`, {
    headers: apiHeaders(accessToken),
  })
  if (res.status() === 404) return null
  expect(res.status(), await res.text()).toBe(200)
  const body = await res.json()
  return body?.data ?? body ?? null
}

export async function fetchUpcomingBox(
  page: Page,
  accessToken: string,
): Promise<{ id: string; status: string; items: unknown[] } | null> {
  const res = await page.request.get(`${API_BASE}/boxes/mine/upcoming`, {
    headers: apiHeaders(accessToken),
  })
  if (res.status() === 404) return null
  expect(res.status(), await res.text()).toBe(200)
  const body = await res.json()
  return body?.data ?? body ?? null
}
