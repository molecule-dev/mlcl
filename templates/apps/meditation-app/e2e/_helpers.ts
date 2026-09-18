// Shared Playwright helpers for meditation-app e2e specs.
// Every spec should import from this module rather than rewriting auth /
// network plumbing.

import { Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3110')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4110') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'med') {
  return `${prefix}+${Date.now()}-${++counter}@flagship.test`
}

interface SignupResult {
  email: string
  password: string
  accessToken: string
  userId: string | null
}

/**
 * Sign up a fresh user and land on /home. Returns the credentials AND the
 * JWT bearer token persisted to localStorage by the auth client so callers
 * can authenticate page.request.* calls.
 *
 * Hardened against the auth-race: arm POST /api/users response listener
 * BEFORE clicking submit so a fast response can't be missed, gate on
 * status < 400, then wait for navigation and poll until the JWT actually
 * lands in localStorage. Eliminates the API-only flake where a spec
 * fired an authed request before the auth-state hook had written it.
 */
export async function signup(
  page: Page,
  email = uniqueEmail(),
  password = 'TestPass!1234',
): Promise<SignupResult> {
  await page.goto(APP_BASE + '/signup')
  await page.locator('input[autocomplete="given-name"]').fill('Test')
  await page.locator('input[autocomplete="family-name"]').fill('User')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[autocomplete="new-password"]').first().fill(password)
  await page.locator('input[autocomplete="new-password"]').nth(1).fill(password)
  const submit = page.locator('button[type="submit"]')
  await expect(submit).toBeEnabled({ timeout: 10000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await page.waitForURL('**/home', { timeout: 30000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)

  const accessToken = await getAccessToken(page)
  const meResp = await page.request.get(API_BASE + '/users/me', { failOnStatusCode: false })
  const userId = meResp.ok()
    ? (((await meResp.json()) as { props?: { id?: string } }).props?.id ?? null)
    : null
  if (!accessToken) throw new Error('signup did not persist an access token')
  return { email, password, accessToken: accessToken as string, userId }
}

export async function login(page: Page, email: string, password: string) {
  await page.goto(APP_BASE + '/login')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  const submit = page.locator('button[type="submit"]')
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
  await page.waitForURL('**/home', { timeout: 20000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
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
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }
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

export async function getAnySessionId(page: Page): Promise<string> {
  const r = await page.request.get(`${API_BASE}/sessions?limit=1`)
  expect(r.status()).toBe(200)
  const list = (await r.json()) as Array<{ id: string }>
  expect(list.length, 'sessions catalog should be seeded').toBeGreaterThan(0)
  return list[0].id
}

export async function seedHistory(
  page: Page,
  accessToken: string,
  opts: { sessionId?: string; durationSeconds?: number } = {},
): Promise<{ id: string }> {
  const sessionId = opts.sessionId ?? (await getAnySessionId(page))
  const r = await page.request.post(`${API_BASE}/history`, {
    headers: apiHeaders(accessToken),
    data: {
      session_id: sessionId,
      duration_seconds: opts.durationSeconds ?? 600,
      started_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      completed_at: new Date().toISOString(),
    },
    failOnStatusCode: false,
  })
  expect(r.status(), await r.text()).toBe(201)
  const body = (await r.json()) as { id: string }
  return { id: body.id }
}

export async function seedJournal(
  page: Page,
  accessToken: string,
  body = `Reflection ${Date.now()}`,
  mood = 4,
): Promise<{ id: string; body: string }> {
  const r = await page.request.post(`${API_BASE}/journal`, {
    headers: apiHeaders(accessToken),
    data: { body, mood, written_at: new Date().toISOString() },
    failOnStatusCode: false,
  })
  expect(r.status(), await r.text()).toBe(201)
  const json = (await r.json()) as { id: string }
  return { id: json.id, body }
}

export async function seedNotification(
  page: Page,
  accessToken: string,
  title = `Alert ${Date.now()}`,
  kind = 'reminder',
): Promise<{ id: string; title: string }> {
  const r = await page.request.post(`${API_BASE}/notifications`, {
    headers: apiHeaders(accessToken),
    data: { kind, payload: { title, body: 'Auto-seeded for spec' } },
    failOnStatusCode: false,
  })
  expect(r.status(), await r.text()).toBe(201)
  const json = (await r.json()) as { id: string }
  return { id: json.id, title }
}
