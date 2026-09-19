/**
 * Shared helpers for book-tracker e2e specs. Drive a real browser
 * against the dev server (vite=3100, api=4100) hitting a real Postgres.
 */

import { ConsoleMessage, Page, Response, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3100')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4100') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'reads') {
  return `${prefix}+${Date.now()}-${++counter}@flagship.test`
}

export async function signup(page: Page, email = uniqueEmail(), password = 'password123') {
  await page.goto(APP_BASE + '/signup')
  await page.locator('input[placeholder="Jordan"]').fill('Test')
  await page.locator('input[placeholder="Sanchez"]').fill('User')
  await page.locator('input[placeholder="you@example.com"]').fill(email)
  await page.locator('input[placeholder="At least 8 characters"]').fill(password)
  await page.locator('input[placeholder="Repeat your password"]').fill(password)
  const submit = page.getByRole('button', { name: /create account/i })
  await expect(submit).toBeEnabled({ timeout: 10000 })
  // Hardening: arm POST listener BEFORE click + poll for token AFTER nav.
  // See virtual-classroom/_helpers.ts for the auth-race rationale.
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await page.waitForURL(/\/dashboard/, { timeout: 15000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
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
  if (!accessToken) throw new Error('signup did not persist an access token')
  return { email, password, accessToken: accessToken as string, userId }
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

export async function login(page: Page, email: string, password: string) {
  await page.goto(APP_BASE + '/login')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  const submit = page.getByRole('button', { name: /sign in/i })
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
  await page.waitForURL(/\/dashboard/, { timeout: 15000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
}

export function apiHeaders(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
}

/** Capture all network responses during a block. */
export async function captureNetwork(page: Page, fn: () => Promise<void>) {
  const reqs: { method: string; url: string; status: number }[] = []
  const onResp = (resp: Response) => {
    reqs.push({ method: resp.request().method(), url: resp.url(), status: resp.status() })
  }
  // playwright 'response' events accept any-shaped listener
  page.on('response', onResp)
  try {
    await fn()
  } finally {
    page.off('response', onResp)
  }
  return reqs
}

export async function expectNoConsoleErrors(page: Page, fn: () => Promise<void>) {
  const errs: string[] = []
  const handler = (msg: ConsoleMessage) => {
    if (msg.type() === 'error') errs.push(msg.text())
  }
  page.on('console', handler)
  try {
    await fn()
  } finally {
    page.off('console', handler)
  }
  // Filter benign noise
  const fatal = errs.filter((e) => !/favicon|net::ERR_|Failed to load resource/.test(e))
  expect(fatal, 'console errors during interaction').toEqual([])
}

/** Escape a value read from the API before using it in a locator regex. */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** A book row as GET /api/books returns it (shelf state merged under `my`). */
export interface BookRow {
  id: string
  title: string
  author: string
  page_count: number
  genres: string[]
  cover_style: string
  my: {
    id: string
    shelf: 'want_to_read' | 'reading' | 'read' | 'dnf'
    current_page: number
    percent: number
    rating: number | null
    review: string | null
  } | null
}

/** The challenge snapshot as GET /api/challenge returns it. */
export interface ChallengeSnapshot {
  year: number
  goal_books: number
  books_read: number
  percent: number
  on_pace: boolean
  pace_needed_per_week: number
}

/** Create a book via the API for fast seeding (shelved per `shelf`). */
export async function seedBook(
  page: Page,
  accessToken: string,
  title = `Test Book ${Date.now()}`,
  opts: { shelf?: 'want_to_read' | 'reading' | 'read'; pageCount?: number } = {},
) {
  const res = await page.request.post(`${API_BASE}/books`, {
    headers: apiHeaders(accessToken),
    data: {
      title,
      author: 'Test Author',
      page_count: opts.pageCount ?? 120,
      genres: ['fiction'],
      cover_style: 'teal',
      shelf: opts.shelf ?? 'want_to_read',
    },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBe(201)
  const body = (await res.json()) as BookRow
  return { id: body.id, title, my: body.my }
}

/** Read the current challenge snapshot through the API. */
export async function getChallenge(page: Page, accessToken: string): Promise<ChallengeSnapshot> {
  const res = await page.request.get(`${API_BASE}/challenge`, {
    headers: apiHeaders(accessToken),
  })
  expect(res.status(), await res.text()).toBe(200)
  return (await res.json()) as ChallengeSnapshot
}
