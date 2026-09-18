// Shared test helpers for the sports-league Playwright suite. Every spec
// file imports from this module rather than rewriting auth / network /
// fixture plumbing per-test.

import { APIRequestContext, Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3000')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'test') {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

/**
 * Sign up a fresh user via the Signup form. Pennant signup form has
 * id-anchored fields (name, email, password). After submit the app
 * navigates to /dashboard via AuthGuard.
 */
export async function signup(
  page: Page,
  email = uniqueEmail('sports-league'),
  password = 'TestPass123456!',
) {
  await page.goto(APP_BASE + '/signup')
  await page.locator('input#name').fill('Test Fan')
  await page.locator('input#email').fill(email)
  await page.locator('input#password').fill(password)
  const submit = page.getByRole('button', { name: /create\s*account/i }).first()
  await expect(submit).toBeEnabled({ timeout: 10_000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30_000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10_000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
  return { email, password }
}

export async function login(page: Page, email: string, password: string) {
  await page.goto(APP_BASE + '/login')
  await page.locator('input#email').fill(email)
  await page.locator('input#password').fill(password)
  const submit = page.getByRole('button', { name: /sign\s*in/i }).first()
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
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10_000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
}

/**
 * Become the league operator for the current (already-authed) session.
 *
 * The shared-league catalog writes (schedule/games, players, scores) are gated
 * behind `requireAdmin`, and the owner-OR-admin team routes behind the
 * `isAdmin` predicate — both read `users.role`, which defaults to the
 * non-operator 'user' on a fresh signup. This calls the dev-only
 * `POST /api/_test/promote-admin` endpoint (404 in production; served only when
 * `ENABLE_E2E_TEST_ENDPOINTS=true`, which the harness sets) to elevate the
 * caller's OWN row to `role = 'admin'`. So an operator e2e flow signs up a
 * fresh user and then becomes the league administrator — exercising the real
 * operator surfaces without weakening the gate for ordinary users.
 */
export async function promoteToAdmin(page: Page, accessToken?: string | null): Promise<void> {
  const token = accessToken ?? (await getAccessToken(page))
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await page.request.post(`${API_BASE}/_test/promote-admin`, {
    headers,
    failOnStatusCode: false,
  })
  expect(res.status(), `POST /api/_test/promote-admin → ${res.status()}`).toBeLessThan(400)
}

/** Capture all network responses during a block; useful for asserting the
 *  app actually called the API (and that it returned 2xx). */
export async function captureNetwork(page: Page, fn: () => Promise<void>) {
  const reqs: { method: string; url: string; status: number; postData?: string | null }[] = []
  const onResp = async (resp: import('@playwright/test').Response) => {
    let postData: string | null = null
    try {
      postData = resp.request().postData()
    } catch {
      /* noop */
    }
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
 * parsed JSON body. Use this to seed fixtures before navigating, OR to
 * read-after-write to verify a backend invariant.
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

// ---------- league catalog readers ----------
//
// Specs read the team / player / leader they assert on out of the API instead
// of naming one: the demo league is the first thing an app's owner replaces,
// and a spec that names a seeded row fails on a correct app. Every reader takes
// an `APIRequestContext`, so a spec can pass the `request` fixture (these
// catalog endpoints are public) or `page.request` for an authed session.

export interface LeagueTeam {
  id: string
  name: string
  abbreviation: string
  city?: string | null
}

export interface StandingsRow {
  rank: number
  name: string
  wins: number
  points: number
}

export interface LeaderRow {
  rank: number
  name: string
  value: number
  unit?: string
}

export interface LeaguePlayer {
  id: string
  name: string
  position?: string | null
  team_id?: string | null
}

export interface FavoriteTeam {
  id: string
  team?: { id?: string; name?: string; abbreviation?: string } | null
}

async function getListed<T>(request: APIRequestContext, path: string, what: string): Promise<T[]> {
  const resp = await request.get(`${API_BASE}${path}`)
  expect(resp.status(), `GET ${path} → ${resp.status()}`).toBe(200)
  const body = (await resp.json()) as { data?: T[] } | T[]
  const rows = Array.isArray(body) ? body : (body.data ?? [])
  expect(rows.length, `the league has at least one ${what}`).toBeGreaterThan(0)
  return rows
}

export async function getTeams(request: APIRequestContext): Promise<LeagueTeam[]> {
  return getListed<LeagueTeam>(request, '/teams?limit=50', 'team')
}

export async function getStandings(request: APIRequestContext): Promise<StandingsRow[]> {
  return getListed<StandingsRow>(request, '/standings', 'standings row')
}

export async function getLeaders(
  request: APIRequestContext,
  stat: 'scoring' | 'assists' | 'saves' | 'shots',
  limit = 5,
): Promise<LeaderRow[]> {
  return getListed<LeaderRow>(request, `/stats/leaders/${stat}?limit=${limit}`, `${stat} leader`)
}

export async function getPlayers(request: APIRequestContext, limit = 20): Promise<LeaguePlayer[]> {
  return getListed<LeaguePlayer>(request, `/players?limit=${limit}`, 'player')
}

export async function getFavoriteTeams(request: APIRequestContext): Promise<FavoriteTeam[]> {
  const resp = await request.get(`${API_BASE}/favorite-teams`)
  expect(resp.status(), `GET /favorite-teams → ${resp.status()}`).toBe(200)
  const body = (await resp.json()) as { data?: FavoriteTeam[] }
  return body.data ?? []
}

/** The last word of a person's name — the form a compact UI abbreviates to
 *  ("D. Lastname"), so a spec can match either rendering. */
export function surnameOf(name: string): string {
  const parts = name.trim().split(/\s+/)
  return parts[parts.length - 1] ?? name
}

/**
 * Same as `api` but returns the raw response so the test can assert on
 * a non-2xx status. The default helper aborts the test on >=400.
 */
export async function apiRaw(
  page: Page,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  data?: unknown,
) {
  const token = await getAccessToken(page)
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (data !== undefined) headers['Content-Type'] = 'application/json'
  const url = path.startsWith('http')
    ? path
    : `${API_BASE.replace(/\/$/, '')}/${path.replace(/^\/?(api\/)?/, '')}`
  return await page.request.fetch(url, {
    method,
    headers,
    data: data === undefined ? undefined : JSON.stringify(data),
  })
}
