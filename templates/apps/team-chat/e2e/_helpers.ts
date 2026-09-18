// Shared helpers for team-chat e2e specs. Every spec file imports from
// this module rather than rewriting auth/network plumbing per-test.

import { Page, expect } from '@molecule/app-e2e-fixtures-default'
// pg is provided by the api workspace; npm workspaces hoists it to the
// shared node_modules at the workspace root so playwright tests can import
// it without adding a redundant per-app dependency.
import pg from 'pg'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3030')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4030') + '/api'

/**
 * Direct database URL for test-only fixture writes (e.g. promoting a freshly-
 * signed-up user to Pro so paid features can be exercised). Tests must NOT
 * use this for application data — use the API. It exists exclusively for
 * setup that the public API cannot perform safely (e.g. plan upgrades that
 * would normally require a Stripe Checkout flow).
 */
const DATABASE_URL =
  process.env.DATABASE_URL || 'postgres://molecule:molecule@127.0.0.1:5432/team_chat_test'

let counter = 0
export function uniqueEmail(prefix = 'tc-test') {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
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

/**
 * Sign up a fresh user via the UI and return the credentials plus the
 * JWT bearer that the auth bond persists into localStorage. Callers can
 * use the token to drive `page.request.*` for backend invariants.
 */
export async function signup(
  page: Page,
  email = uniqueEmail(),
  password = 'TestPass123!',
  name = 'Test User',
) {
  await page.goto(APP_BASE + '/signup')
  // Wait for the form to mount before the optional-field probes below.
  // count() is a one-shot read with no auto-waiting, so after a goto it can
  // run against a still-empty React root, return 0, and SILENTLY SKIP the
  // fill — the form then won't submit and every spec in the app dies on a
  // signup timeout. That is exactly how restaurant-ordering lost all 78.
  await page.locator('input').first().waitFor({ state: 'visible', timeout: 15000 })
  const nameInput = page.locator('input[type="text"]').first()
  if (await nameInput.count()) await nameInput.fill(name)
  await page.locator('#signup-email, input[type="email"]').first().fill(email)
  // Some signup forms have password + confirm password — fill all password inputs.
  const pwInputs = page.locator('input[type="password"]')
  const pwCount = await pwInputs.count()
  for (let i = 0; i < pwCount; i++) {
    await pwInputs.nth(i).fill(password)
  }
  const submit = page.getByRole('button', { name: /create\s*account|sign\s*up/i }).first()
  await expect(submit).toBeEnabled({ timeout: 10000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 30000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
  const accessToken = await getAccessToken(page)
  const userRes = await page.request.get(API_BASE + '/users/me')
  const userJson = (await userRes.json()) as { props?: { id?: string }; id?: string }
  const userId = userJson?.props?.id ?? userJson?.id ?? null
  return { email, password, name, accessToken, userId }
}

/** Sign up by hitting the API directly and write the resulting token back into localStorage. */
export async function apiSignupAndPrime(
  page: Page,
  email = uniqueEmail(),
  password = 'TestPass123!',
  name = 'Test User',
) {
  await page.goto(APP_BASE + '/login') // to get a tab on the team-chat origin
  const res = await page.request.post(`${API_BASE}/users`, {
    headers: { 'Content-Type': 'application/json' },
    data: { email, password, name },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBe(201)
  const body = (await res.json()) as {
    accessToken: string
    refreshToken?: string
    user: { id: string; name?: string; email?: string }
  }
  // [M1-1] The server sets the httpOnly cookie directly — no localStorage writes needed.
  return { ...body, userId: body.user?.id ?? null, email, password, name }
}

export async function login(page: Page, email: string, password: string) {
  await page.goto(APP_BASE + '/login')
  await page.locator('input#login-email, input[type="email"]').first().fill(email)
  await page.locator('input#login-password, input[type="password"]').first().fill(password)
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
  await page.context().clearCookies()
}

export async function captureNetwork(page: Page, fn: () => Promise<void>) {
  const reqs: { method: string; url: string; status: number }[] = []
  const onResp = (resp: {
    request: () => { method: () => string }
    url: () => string
    status: () => number
  }) => {
    reqs.push({ method: resp.request().method(), url: resp.url(), status: resp.status() })
  }
  page.on('response', onResp as Parameters<typeof page.on>[1])
  try {
    await fn()
  } finally {
    page.off('response', onResp as Parameters<typeof page.on>[1])
  }
  return reqs
}

export function authHeaders(accessToken: string | null): Record<string, string> {
  return accessToken
    ? { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' }
}

export async function seedChannel(
  page: Page,
  accessToken: string | null,
  overrides: Partial<{ name: string; description: string }> = {},
): Promise<{ id: string; name: string }> {
  const name = overrides.name ?? `channel-${Date.now()}-${++counter}`
  const res = await page.request.post(`${API_BASE}/channels`, {
    headers: authHeaders(accessToken),
    data: {
      name,
      description: overrides.description ?? 'Seeded for spec',
    },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBe(201)
  const body = (await res.json()) as { id: string; name: string }
  return { id: body.id, name: body.name }
}

export async function seedMessage(
  page: Page,
  accessToken: string | null,
  channelId: string,
  content = `Hello world ${Date.now()}-${++counter}`,
): Promise<{ id: string; content: string }> {
  const res = await page.request.post(`${API_BASE}/messages`, {
    headers: authHeaders(accessToken),
    data: { channel_id: channelId, content },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBe(201)
  const body = (await res.json()) as { id: string; content: string }
  return body
}

/**
 * Promote a user to a paid tier directly in the database so tests can
 * exercise paid features (threads, file uploads, custom emoji, voice/video,
 * external integrations) without going through Stripe Checkout. The Pro
 * tier (`stripeMonthly`) is sufficient for every Pro+ gated feature in
 * team-chat.
 */
export async function setUserPlan(userId: string, planKey = 'stripeMonthly'): Promise<void> {
  const client = new pg.Client({ connectionString: DATABASE_URL })
  await client.connect()
  try {
    await client.query('UPDATE users SET "planKey" = $1 WHERE id = $2', [planKey, userId])
  } finally {
    await client.end()
  }
}

/**
 * Sign up a new user via the API and immediately upgrade them to Pro so
 * paid features (threads, etc.) are accessible. Returns the same shape as
 * `apiSignupAndPrime`.
 */
export async function apiSignupProAndPrime(
  page: Page,
  email = uniqueEmail('pro'),
  password = 'TestPass123!',
  name = 'Pro Tester',
) {
  const result = await apiSignupAndPrime(page, email, password, name)
  if (result.userId) await setUserPlan(result.userId, 'stripeMonthly')
  return result
}
