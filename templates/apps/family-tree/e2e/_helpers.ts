/**
 * Shared helpers for the family-tree (Branches) flagship e2e specs.
 *
 * The signup form has First name + Last name + Email + Password +
 * Confirm-password fields. `signup()` drives the UI and harvests the
 * JWT bearer token from the auth cookie so callers can fire backed-up
 * `page.request.*` calls and assert outcomes against the JSON API.
 *
 * @module
 */

import { Page, Response, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || `http://localhost:${process.env.VITE_PORT || '3000'}`
export const API_BASE =
  process.env.API_BASE || `http://localhost:${process.env.API_PORT || '4000'}/api`

let counter = 0
export function uniqueEmail(prefix = 'branches'): string {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

export interface Credentials {
  email: string
  password: string
  firstName: string
  lastName: string
  accessToken: string | null
  userId: string | null
}

/**
 * Sign up a fresh user via the UI and harvest the access token from the
 * auth cookie so the test can drive `page.request.*` against the API.
 */
export async function signup(
  page: Page,
  email = uniqueEmail(),
  password = 'TestPass123!',
  firstName = 'Test',
  lastName = 'User',
): Promise<Credentials> {
  await page.goto(APP_BASE + '/signup')
  // Wait for the form to mount before the optional-field probes below.
  // count() is a one-shot read with no auto-waiting, so after a goto it can
  // run against a still-empty React root, return 0, and SILENTLY SKIP the
  // fill — the form then won't submit and every spec in the app dies on a
  // signup timeout.
  await page.locator('input').first().waitFor({ state: 'visible', timeout: 15000 })
  const textBoxes = page.locator('input[type="text"]')
  if ((await textBoxes.count()) >= 2) {
    await textBoxes.nth(0).fill(firstName)
    await textBoxes.nth(1).fill(lastName)
  }
  await page.locator('input[type="email"]').first().fill(email)
  const pwBoxes = page.locator('input[type="password"]')
  await pwBoxes.nth(0).fill(password)
  if ((await pwBoxes.count()) > 1) {
    await pwBoxes.nth(1).fill(password)
  }
  // Hardening: gate on submit-enabled, arm the POST /api/users response
  // listener BEFORE the click, then poll until the JWT lands in the
  // cookies. Eliminates a race where the inline token read below ran
  // before the molecule auth hook had persisted the token, returning null
  // and silently breaking every authed `page.request.*` call downstream.
  const submit = page.getByRole('button', { name: /create\s*account|sign\s*up|join/i }).first()
  await expect(submit).toBeEnabled({ timeout: 10_000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 45_000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 45_000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10_000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
  const accessToken = await getAccessToken(page)
  const userRes = await page.request.get(`${API_BASE}/users/me`)
  let userId: string | null = null
  if (userRes.ok()) {
    const me = (await userRes.json()) as { props?: { id?: string }; id?: string }
    userId = me?.props?.id ?? me?.id ?? null
  }
  return { email, password, firstName, lastName, accessToken, userId }
}

export async function getAccessToken(page: Page): Promise<string | null> {
  // The bearer token is held in memory (a localStorage copy is
  // XSS-exfiltratable); the persistent credential is the httpOnly `token`
  // cookie (prod: `__Host-token`), readable in tests via the Playwright
  // context. Its value IS the JWT.
  const cookies = await page.context().cookies()
  const tok = cookies.find((c) => /(^|[-_])token$/i.test(c.name) && c.value)
  return tok?.value ?? null
}

export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto(APP_BASE + '/login')
  await page.locator('input[type="email"]').first().fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  const submit = page.getByRole('button', { name: /sign\s*in|log\s*in|continue/i }).first()
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
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10_000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
}

export async function logout(page: Page): Promise<void> {
  await page.evaluate(() => window.localStorage.clear())
}

/** Capture all network responses during a block. */
export async function captureNetwork(
  page: Page,
  fn: () => Promise<void>,
): Promise<{ method: string; url: string; status: number }[]> {
  const reqs: { method: string; url: string; status: number }[] = []
  const onResp = (resp: Response) => {
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

export function authHeaders(accessToken: string | null): Record<string, string> {
  return accessToken
    ? { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' }
}

export interface PersonApi {
  id: string
  first_name: string
  last_name?: string | null
  maiden_name?: string | null
  birth_date?: string | null
  death_date?: string | null
  relatives?: {
    parents: PersonApi[]
    partners: PersonApi[]
    children: PersonApi[]
    siblings: PersonApi[]
  }
  timeline?: Array<{ date: string | null; kind: string; detail: string }>
}

export interface TreeApi {
  rootId: string | null
  nodes: Array<{ id: string; generation: number; x: number; isRoot: boolean }>
  edges: Array<{ kind: string; fromId: string; toId: string }>
  stats: { people: number; generations: number }
}

export interface PricingTierApi {
  key: string
  name: string
  prices: { period: string; price: string; stripePriceId: string | null }[]
  limits: Record<string, unknown>
}

export async function listPeople(page: Page, token: string | null): Promise<PersonApi[]> {
  const r = await page.request.get(`${API_BASE}/people`, { headers: authHeaders(token) })
  expect(r.status(), await r.text().catch(() => '')).toBeLessThan(400)
  return (await r.json()) as PersonApi[]
}

export async function getPerson(page: Page, token: string | null, id: string): Promise<PersonApi> {
  const r = await page.request.get(`${API_BASE}/people/${id}`, { headers: authHeaders(token) })
  expect(r.status(), await r.text().catch(() => '')).toBeLessThan(400)
  return (await r.json()) as PersonApi
}

export async function createPerson(
  page: Page,
  token: string | null,
  body: Record<string, unknown>,
): Promise<PersonApi> {
  const r = await page.request.post(`${API_BASE}/people`, {
    headers: authHeaders(token),
    data: body,
  })
  expect(r.status(), await r.text().catch(() => '')).toBeLessThan(400)
  return (await r.json()) as PersonApi
}

export async function getTree(page: Page, token: string | null, root?: string): Promise<TreeApi> {
  const qs = root ? `?root=${encodeURIComponent(root)}` : ''
  const r = await page.request.get(`${API_BASE}/tree${qs}`, { headers: authHeaders(token) })
  expect(r.status(), await r.text().catch(() => '')).toBeLessThan(400)
  return (await r.json()) as TreeApi
}

export async function listTiers(page: Page): Promise<PricingTierApi[]> {
  const r = await page.request.get(`${API_BASE}/billing/tiers`)
  expect(r.status(), await r.text().catch(() => '')).toBeLessThan(400)
  const body = (await r.json()) as { data: PricingTierApi[] }
  return body.data
}
