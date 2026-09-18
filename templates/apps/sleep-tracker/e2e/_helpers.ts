/**
 * Shared helpers for sleep-tracker e2e specs. Drives a real browser
 * against the dev server (vite=3280, api=4280 by default) hitting a real
 * Postgres instance. No mocks — the contract is "user clicks → backend
 * actually changed".
 */

import { ConsoleMessage, Page, Response, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3280')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4280') + '/api'

export async function getAccessToken(page: Page): Promise<string | null> {
  // [M1-1] The bearer token is held in memory (a localStorage copy is
  // XSS-exfiltratable); the persistent credential is the httpOnly `token`
  // cookie (prod: `__Host-token`), readable in tests via the Playwright
  // context. Its value IS the JWT.
  const cookies = await page.context().cookies()
  const tok = cookies.find((c) => /(^|[-_])token$/i.test(c.name) && c.value)
  return tok?.value ?? null
}

let counter = 0
export function uniqueEmail(prefix = 'somnia') {
  return `${prefix}+${Date.now()}-${++counter}@flagship.test`
}

/** Sign up a fresh user via the real signup form. Returns the captured
 *  access token + user id so specs can issue authenticated API calls.
 *
 *  Hardening: gate on submit-enabled, arm the POST /api/users response
 *  listener BEFORE the click, then poll until the JWT lands in
 *  localStorage. Eliminates a race where the inline `accessToken` read
 *  below ran before the molecule auth hook had persisted the token,
 *  throwing "signup did not persist an access token" on attempt 1 but
 *  passing under retries:2 (surfacing as 'flaky').
 */
export async function signup(page: Page, email = uniqueEmail(), password = 'TestPass123!') {
  await page.goto(APP_BASE + '/signup')
  await page.locator('input[placeholder="Sam"]').fill('Test')
  await page.locator('input[placeholder="Sleeper"]').fill('User')
  await page.locator('input[placeholder="you@example.com"]').fill(email)
  await page.locator('input[placeholder="At least 8 characters"]').fill(password)
  await page.locator('input[placeholder="Repeat your password"]').fill(password)
  const submit = page.getByRole('button', { name: /create account/i })
  await expect(submit).toBeEnabled({ timeout: 10_000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30_000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10_000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
  const accessToken = await getAccessToken(page)
  const userRes = await page.request.get(API_BASE + '/users/me')
  const userJson = (await userRes.json()) as { props?: { id?: string }; id?: string }
  const userId = userJson?.props?.id ?? userJson?.id ?? null
  if (!accessToken) throw new Error('signup did not persist an access token')
  return { email, password, accessToken: accessToken as string, userId }
}

export async function login(page: Page, email: string, password: string) {
  await page.goto(APP_BASE + '/login')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  const submit = page.getByRole('button', { name: /sign\s*in/i })
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

export async function logout(page: Page) {
  const menu = page.getByRole('button', { name: /account|menu|profile|user/i }).first()
  if (await menu.count().catch(() => 0)) await menu.click()
  const out = page.getByRole('button', { name: /sign\s*out|log\s*out/i }).first()
  if (await out.count().catch(() => 0)) await out.click()
}

export function apiHeaders(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
}

/** Capture all network responses during a block; useful for asserting
 *  the app actually talked to the API. */
export async function captureNetwork(page: Page, fn: () => Promise<void>) {
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
  const fatal = errs.filter((e) => !/favicon|net::ERR_|Failed to load resource/.test(e))
  expect(fatal, 'console errors during interaction').toEqual([])
}

/** Seed a sleep log via the real API. Returns the created row. */
export async function seedSleepLog(
  page: Page,
  accessToken: string,
  overrides: Partial<{
    sleep_date: string
    bedtime: string
    wake_time: string
    duration_minutes: number
    quality_score: number
    interruptions: number
    sleep_stages: { deep?: number; light?: number; rem?: number; awake?: number }
    notes: string
    factors: string[]
    source: string
  }> = {},
) {
  const today = new Date()
  const sleepDate = overrides.sleep_date ?? today.toISOString().slice(0, 10)
  const bedDate = new Date(`${sleepDate}T22:30:00.000Z`)
  const wakeDate = new Date(`${sleepDate}T06:30:00.000Z`)
  wakeDate.setUTCDate(wakeDate.getUTCDate() + 1)

  const data = {
    sleep_date: sleepDate,
    bedtime: overrides.bedtime ?? bedDate.toISOString(),
    wake_time: overrides.wake_time ?? wakeDate.toISOString(),
    duration_minutes: overrides.duration_minutes ?? 480,
    quality_score: overrides.quality_score ?? 82,
    interruptions: overrides.interruptions ?? 1,
    sleep_stages: overrides.sleep_stages ?? { deep: 100, light: 240, rem: 110, awake: 30 },
    notes: overrides.notes ?? 'seeded by test',
    factors: overrides.factors ?? ['caffeine'],
    source: overrides.source ?? 'manual',
  }

  const res = await page.request.post(`${API_BASE}/sleep`, {
    headers: apiHeaders(accessToken),
    data,
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBe(201)
  return (await res.json()) as { id: string; user_id: string; sleep_date: string }
}

/** A coaching article, in the shape `GET /api/coaching` returns. */
export interface CoachingArticle {
  id: string
  slug: string
  title: string
  category?: string
  is_premium?: boolean
}

/**
 * The coaching library as the app reads it.
 *
 * Specs drive whatever articles the API actually returns: the library ships as
 * demo content and is the first thing an app's owner replaces, so a spec that
 * names a seeded article would fail on a correct app.
 */
export async function listCoachingArticles(
  page: Page,
  accessToken: string,
): Promise<CoachingArticle[]> {
  const res = await page.request.get(`${API_BASE}/coaching`, { headers: apiHeaders(accessToken) })
  expect(res.status(), await res.text()).toBe(200)
  return (await res.json()) as CoachingArticle[]
}

/** Seed a smart alarm via the real API. */
export async function seedAlarm(
  page: Page,
  accessToken: string,
  overrides: Partial<{
    label: string
    alarm_time: string
    window_minutes: number
    days_of_week: number[]
    sound: string
    enabled: boolean
  }> = {},
) {
  const data = {
    label: overrides.label ?? 'Workday wake',
    alarm_time: overrides.alarm_time ?? '06:30',
    window_minutes: overrides.window_minutes ?? 30,
    days_of_week: overrides.days_of_week ?? [1, 2, 3, 4, 5],
    sound: overrides.sound ?? 'sunrise',
    enabled: overrides.enabled ?? true,
  }
  const res = await page.request.post(`${API_BASE}/alarms`, {
    headers: apiHeaders(accessToken),
    data,
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBe(201)
  return (await res.json()) as { id: string; alarm_time: string; label: string; enabled: boolean }
}
