/**
 * Shared helpers for habit-tracker e2e specs. Drive a real browser
 * against the dev server (vite=3100, api=4100) hitting a real Postgres.
 */

import { ConsoleMessage, Page, Response, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3100')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4100') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'streak') {
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

/** An achievement row as GET /api/achievements returns it. */
export interface AchievementRow {
  code: string
  name: string
  tier: string
  threshold_days: number
  unlocked: boolean
}

/**
 * The achievement catalog as the app serves it. Specs read the catalog here
 * rather than naming a milestone, so they still hold once the catalog rows
 * are replaced with the app's own.
 */
export async function getAchievements(page: Page, accessToken: string): Promise<AchievementRow[]> {
  const res = await page.request.get(`${API_BASE}/achievements`, {
    headers: apiHeaders(accessToken),
  })
  expect(res.status(), await res.text()).toBe(200)
  const rows = (await res.json()) as AchievementRow[]
  expect(rows.length, 'the achievement catalog must not be empty').toBeGreaterThan(0)
  return rows
}

/** The achievements a single check-in (a 1-day streak) must unlock. */
export async function achievementsReachableInOneDay(
  page: Page,
  accessToken: string,
): Promise<AchievementRow[]> {
  const catalog = await getAchievements(page, accessToken)
  const reachable = catalog.filter((a) => a.threshold_days <= 1)
  expect(
    reachable.length,
    'the catalog must define an achievement reachable with a 1-day streak',
  ).toBeGreaterThan(0)
  return reachable
}

/** Create a habit via the API for fast seeding. */
export async function seedHabit(page: Page, accessToken: string, name = `Habit ${Date.now()}`) {
  const res = await page.request.post(`${API_BASE}/habits`, {
    headers: apiHeaders(accessToken),
    data: { name, emoji: '🎯', category: 'health', cadence: 'daily' },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBe(201)
  const body = (await res.json()) as { id: string }
  return { id: body.id, name }
}
