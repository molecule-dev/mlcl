// Shared test helpers for the voting-polling Playwright suite. Every spec
// file imports from this module rather than rewriting auth / network /
// fixture plumbing per-test.

import { Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3000')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'test') {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

/**
 * Sign up a fresh user via the Signup form. The Quorum signup form has
 * id-anchored fields (name, organization, email, password). The
 * organization field is collected for branding but currently not sent
 * to /api/users (the Molecule signup hook only forwards email/password/
 * name). After submit the app navigates to /dashboard via AuthGuard.
 */
export async function signup(
  page: Page,
  email = uniqueEmail('voting-polling'),
  password = 'TestPass123456!',
) {
  await page.goto(APP_BASE + '/signup')
  // Wait for the form to mount before filling — under fleet load the first
  // render can lag the default fill auto-wait, surfacing as a flaky timeout
  // on the very first field. An explicit visibility gate is the auto-waiting
  // fix and pins the failure to "form never rendered" rather than a fill race.
  await expect(page.locator('input#name')).toBeVisible({ timeout: 30_000 })
  await page.locator('input#name').fill('Test User')
  await page.locator('input#organization').fill('Test Org')
  await page.locator('input#email').fill(email)
  await page.locator('input#password').fill(password)
  const submit = page.getByRole('button', { name: /create\s*organization/i }).first()
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

/** Decode the userId out of the JWT from the httpOnly cookie. */
export async function getMyUserId(page: Page): Promise<string> {
  const token = await getAccessToken(page)
  if (!token) throw new Error('No accessToken in cookie — call signup() first')
  const segments = token.split('.')
  if (segments.length < 2) throw new Error('Token is not a JWT')
  const payload = JSON.parse(Buffer.from(segments[1], 'base64').toString('utf8'))
  if (!payload.userId) throw new Error('JWT missing userId: ' + JSON.stringify(payload))
  return payload.userId as string
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

/** A poll row, in the shape `GET /api/polls` returns. */
export interface PollRow {
  id: string
  title: string
  status: string
}

/**
 * The signed-in user's polls, read from the endpoint the Dashboard reads.
 *
 * The starter ballots come from the demo seed (`api/src/handlers/_seed.ts`)
 * and are the first thing an app's owner replaces, so specs drive whatever
 * the API actually returns rather than naming a seeded poll or its count.
 */
export async function listPolls(page: Page): Promise<PollRow[]> {
  return await api<PollRow[]>(page, 'GET', '/polls')
}

/** A voter row, in the shape `GET /api/voters` returns. */
export interface VoterRow {
  id: string
  name: string
  email: string
}

/** The signed-in user's voter roll, read from the endpoint /voters reads. */
export async function listVoters(page: Page): Promise<VoterRow[]> {
  const body = await api<{ data: VoterRow[] }>(page, 'GET', '/voters')
  return body.data
}

/**
 * A RegExp matching `text` literally, case-insensitively — for accessible-name
 * lookups whose expected value was read from the API instead of hardcoded.
 */
export function literal(text: string): RegExp {
  return new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
}

/**
 * Create a poll directly via the API (faster than driving the form for
 * tests that need an existing poll as the setup). Optionally publish so
 * the poll is in 'active' state and can accept votes.
 */
export async function seedPoll(
  page: Page,
  opts: {
    title?: string
    type?: 'single-choice' | 'multiple-choice' | 'ranked' | 'open-text'
    options?: string[]
    publish?: boolean
    quorum_threshold?: number | null
  } = {},
): Promise<{ id: string; status: string; title: string }> {
  // The createPoll schema accepts an optional quorum_threshold but does NOT
  // allow null on POST (it's nullable only on PUT). Omit the field unless
  // the test explicitly passed a number.
  const body: Record<string, unknown> = {
    title: opts.title ?? `Test Poll ${Date.now()}`,
    type: opts.type ?? 'single-choice',
    options: opts.options ?? ['Option A', 'Option B'],
  }
  if (typeof opts.quorum_threshold === 'number') {
    body.quorum_threshold = opts.quorum_threshold
  }
  const created = await api<{ id: string; status: string; title: string }>(
    page,
    'POST',
    '/polls',
    body,
  )
  if (opts.publish !== false) {
    return await api<{ id: string; status: string; title: string }>(
      page,
      'POST',
      `/polls/${created.id}/publish`,
    )
  }
  return created
}
