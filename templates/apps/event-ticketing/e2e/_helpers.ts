// Auto-generated boilerplate. Add helpers here as needed; do not delete
// these. Every spec file should import from this module rather than
// rewriting auth/network plumbing per-test.

import { Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3100')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4100') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'turnstile') {
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

/** Sign up a fresh user via the UI signup form. Returns email, password,
 *  the JWT bearer access token persisted to localStorage, and the user id.
 *  Tests use the access token to make authenticated API requests directly
 *  via page.request.* (which has its own cookie jar, separate from the
 *  live browser session).
 *
 *  Hardened against an auth-race: arm POST /api/users response listener
 *  BEFORE clicking submit, assert 2xx, wait for navigation to /dashboard,
 *  then poll localStorage until the access token actually lands. Without
 *  these gates the access-token read sometimes ran before the auth-state
 *  hook persisted the token → throws "did not persist an access token"
 *  intermittently. */
export async function signup(page: Page, email = uniqueEmail(), password = 'TestPass!1234') {
  await page.goto(APP_BASE + '/signup')
  await page.locator('input[type="email"]').first().fill(email)
  const passwordInputs = page.locator('input[autocomplete="new-password"]')
  await passwordInputs.nth(0).fill(password)
  await passwordInputs.nth(1).fill(password)
  const submit = page.locator('form button[type="submit"]').first()
  await expect(submit).toBeEnabled({ timeout: 10000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 15000 })
  await page.waitForURL('**/dashboard', { timeout: 15000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
  const accessToken = await getAccessToken(page)
  let userId: string | null = null
  const meRes = await page.request.get(API_BASE + '/users/me', { failOnStatusCode: false })
  if (meRes.ok()) {
    const meBody = (await meRes.json()) as { props?: { id?: string }; id?: string }
    userId = meBody?.props?.id ?? meBody?.id ?? null
  }
  if (!accessToken) throw new Error('signup did not persist an access token')
  return { email, password, accessToken: accessToken as string, userId }
}

/** Log in an existing user via the UI form. Same hardening as signup(). */
export async function login(page: Page, email: string, password: string) {
  await page.goto(APP_BASE + '/login')
  await page.locator('input[type="email"]').first().fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  const submit = page.locator('form button[type="submit"]').first()
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

/** Sign out via the user menu. */
export async function logout(page: Page) {
  const menu = page.getByRole('button', { name: /open user menu|account|profile/i }).first()
  if (await menu.count().catch(() => 0)) await menu.click()
  const out = page.getByRole('button', { name: /sign\s*out|log\s*out/i }).first()
  if (await out.count().catch(() => 0)) await out.click()
}

/** Capture all network responses during a block. */
export async function captureNetwork(page: Page, fn: () => Promise<void>) {
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
 *  third-party noise). */
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
  const fatal = errs.filter((e) => !/favicon|net::ERR_|Failed to load resource/.test(e))
  expect(fatal, 'console errors during interaction').toEqual([])
}

export function apiHeaders(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
}

// ---------- domain seed helpers (called via page.request with a JWT) ----------

export interface SeededEvent {
  id: string
  title: string
  status: string
}

export interface SeededTier {
  id: string
  name: string
  price_cents: number
  quantity_total: number
}

export async function seedEvent(
  page: Page,
  accessToken: string,
  overrides: Partial<{
    title: string
    description: string
    category: string
    venue: string
    venue_address: string
    city: string
    start_date: string
    start_time: string
    end_time: string
    status: 'draft' | 'published'
    tags: string[]
    tickets_total: number
    min_price: number
  }> = {},
): Promise<SeededEvent> {
  const title = overrides.title ?? `Test Event ${Date.now()}-${++counter}`
  const startDate = overrides.start_date ?? new Date(Date.now() + 30 * 86400 * 1000).toISOString()
  const res = await page.request.post(`${API_BASE}/events`, {
    headers: apiHeaders(accessToken),
    data: {
      title,
      description: overrides.description ?? 'An e2e seeded event.',
      category: overrides.category ?? 'Music',
      venue: overrides.venue ?? 'Test Venue',
      venue_address: overrides.venue_address ?? '123 Test St',
      city: overrides.city ?? 'Brooklyn',
      start_date: startDate,
      start_time: overrides.start_time ?? '20:00',
      end_time: overrides.end_time ?? '23:00',
      status: overrides.status ?? 'published',
      tags: overrides.tags ?? [],
      tickets_total: overrides.tickets_total ?? 100,
      min_price: overrides.min_price ?? 25,
    },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBeLessThan(300)
  const body = (await res.json()) as { id: string; title: string; status: string }
  if (overrides.status === 'published' || !overrides.status) {
    await page.request.put(`${API_BASE}/events/${body.id}/publish`, {
      headers: apiHeaders(accessToken),
      data: {},
      failOnStatusCode: false,
    })
  }
  return { id: body.id, title: body.title, status: 'published' }
}

export async function seedTier(
  page: Page,
  accessToken: string,
  eventId: string,
  overrides: Partial<{
    name: string
    description: string
    price_cents: number
    quantity_total: number
  }> = {},
): Promise<SeededTier> {
  const name = overrides.name ?? `Tier ${Date.now()}-${++counter}`
  const res = await page.request.post(`${API_BASE}/ticket-tiers`, {
    headers: apiHeaders(accessToken),
    data: {
      event_id: eventId,
      name,
      description: overrides.description ?? '',
      price_cents: overrides.price_cents ?? 2500,
      quantity_total: overrides.quantity_total ?? 50,
    },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBeLessThan(300)
  const body = (await res.json()) as {
    id: string
    name: string
    price_cents: number
    quantity_total: number
  }
  return body
}

export async function seedOrder(
  page: Page,
  accessToken: string,
  args: { eventId: string; tierId: string; quantity?: number },
): Promise<{ id: string; tickets: Array<{ id: string; ref_code: string }> }> {
  const res = await page.request.post(`${API_BASE}/orders`, {
    headers: apiHeaders(accessToken),
    data: {
      event_id: args.eventId,
      tier_id: args.tierId,
      quantity: args.quantity ?? 1,
    },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBeLessThan(300)
  const body = (await res.json()) as {
    id: string
    status?: string
    tickets?: Array<{ id: string; ref_code: string }>
    checkoutUrl?: string
  }
  // Paid path: order is created in 'pending' with a Stripe Checkout
  // session URL. Simulate the webhook locally so tests don't need
  // Stripe forwarding to fulfill.
  if (body.status === 'pending' || (body.tickets ?? []).length === 0) {
    const fulfillRes = await page.request.post(`${API_BASE}/orders/simulate`, {
      headers: apiHeaders(accessToken),
      data: { order_id: body.id },
      failOnStatusCode: false,
    })
    expect(fulfillRes.status(), await fulfillRes.text()).toBeLessThan(300)
    const fulfilled = (await fulfillRes.json()) as {
      id: string
      tickets: Array<{ id: string; ref_code: string }>
    }
    return { id: fulfilled.id, tickets: fulfilled.tickets }
  }
  return { id: body.id, tickets: body.tickets ?? [] }
}
