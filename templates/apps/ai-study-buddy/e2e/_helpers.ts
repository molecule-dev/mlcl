/**
 * Shared helpers for ai-study-buddy e2e specs. Drives a real browser
 * against the dev server (vite=3160, api=4160 by default) hitting a
 * real Postgres instance. No mocks — outcomes assert on backend state,
 * AI artifacts, Stripe URLs, etc.
 */
import { type Page, expect } from '@molecule/app-e2e-fixtures-default'

export async function getAccessToken(page: Page): Promise<string | null> {
  // [M1-1] The bearer token is held in memory (a localStorage copy is
  // XSS-exfiltratable); the persistent credential is the httpOnly `token`
  // cookie (prod: `__Host-token`), readable in tests via the Playwright
  // context. Its value IS the JWT.
  const cookies = await page.context().cookies()
  const tok = cookies.find((c) => /(^|[-_])token$/i.test(c.name) && c.value)
  return tok?.value ?? null
}

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3160')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4160') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'koan'): string {
  // Include process.pid so parallel Playwright workers (each is its own
  // process) cannot collide even on the same millisecond. The counter
  // disambiguates within a single worker; the random suffix is paranoia
  // insurance against same-pid retries.
  const rand = Math.random().toString(36).slice(2, 8)
  return `${prefix}+${Date.now()}-${process.pid}-${++counter}-${rand}@flagship.test`
}

export interface Credentials {
  email: string
  password: string
  name: string
  accessToken: string
  userId: string | null
}

export async function signup(
  page: Page,
  opts: Partial<Pick<Credentials, 'email' | 'password' | 'name'>> = {},
): Promise<Credentials> {
  const email = opts.email ?? uniqueEmail()
  const password = opts.password ?? 'TestPass123!'
  const name = opts.name ?? 'Test Student'
  await page.goto(APP_BASE + '/signup')
  await page.locator('[data-mol-id="signup-name"]').fill(name)
  await page.locator('[data-mol-id="signup-email"]').fill(email)
  await page.locator('[data-mol-id="signup-password"]').fill(password)
  // Deterministic gating eliminates an auth-race: arm POST /api/users
  // BEFORE the click (so a fast response can't be missed), assert the
  // response is < 400, wait for navigation, then poll until the token
  // cookie is set. Without this, specs that immediately fire
  // page.request.*('/api/...') sometimes read a null token because the
  // auth-state hook sets the cookie in a subsequent microtask.
  const submit = page.locator('[data-mol-id="signup-submit"]')
  await expect(submit).toBeEnabled({ timeout: 10_000 })
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
  const meResp = await page.request.get(API_BASE + '/users/me')
  let userId: string | null = null
  if (meResp.ok()) {
    const me = (await meResp.json()) as { props?: { id?: string }; id?: string }
    userId = me?.props?.id ?? me?.id ?? null
  }
  if (!accessToken) throw new Error('signup did not persist an access token')
  return { email, password, name, accessToken, userId }
}

export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto(APP_BASE + '/login')
  await page.locator('input[type="email"]').first().fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  // Same hardening as signup(): arm auth POST listener BEFORE the click,
  // assert < 400, wait for nav off /login, then poll for the token cookie.
  const submit = page.getByRole('button', { name: /sign\s*in|log\s*in|submit/i }).first()
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
    // useEffect-triggered requests that fired right as fn() resolved
    // (e.g. /api/profile, /api/dashboard, /api/topics/:id, etc.) get
    // recorded. Without this wait, captureNetwork frequently misses
    // page-mount fan-out responses on parallel-worker runs because the
    // test's "is the container visible" assert resolves before the
    // useEffect fires.
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
  } finally {
    page.off('response', onResp)
  }
  return reqs
}

export interface SeededTopic {
  id: string
  title: string
}

export async function seedTopic(
  page: Page,
  accessToken: string,
  overrides: Partial<{ title: string; description: string; subject: string }> = {},
): Promise<SeededTopic> {
  const data = {
    title: overrides.title ?? `Topic ${Date.now()}`,
    description: overrides.description ?? 'Auto-seeded for e2e',
    subject: overrides.subject ?? 'general',
  }
  const res = await page.request.post(`${API_BASE}/topics`, {
    headers: apiHeaders(accessToken),
    data,
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBe(201)
  const json = (await res.json()) as { id: string; title: string }
  return { id: json.id, title: json.title }
}

export async function seedDeck(
  page: Page,
  accessToken: string,
  overrides: Partial<{ name: string; description: string; topic_id: string }> = {},
): Promise<{ id: string; name: string }> {
  const data = {
    name: overrides.name ?? `Deck ${Date.now()}`,
    description: overrides.description ?? 'Seeded',
    topic_id: overrides.topic_id,
  }
  const res = await page.request.post(`${API_BASE}/decks`, {
    headers: apiHeaders(accessToken),
    data,
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBe(201)
  const json = (await res.json()) as { id: string; name: string }
  return { id: json.id, name: json.name }
}
