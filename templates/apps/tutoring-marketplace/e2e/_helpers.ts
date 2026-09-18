// tutoring-marketplace e2e helpers. Inputs use FloatingInput (placeholder
// is the only accessible name; there is no <label>). Field lookups use
// role textbox / locator selectors.

import { Page, expect } from '@molecule/app-e2e-fixtures-default'

/**
 * The app's brand name, as rendered in the header logo, nav copy and headings.
 *
 * Kept here rather than inlined across the specs: this app was rebranded
 * (Chalk → Mentor) and twenty literal matchers were left behind, failing eleven
 * tests against a brand the UI no longer shows. Must track APP_NAME in
 * app/src/branding.ts — a rebrand is now one line here instead of twenty.
 */
export const BRAND = 'Mentor'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3270')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4270') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'test') {
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

/** Sign up a fresh user; returns the credentials, display name, and bearer token.
 *
 *  Hardened against an auth-race: arm POST /api/users response listener
 *  BEFORE clicking submit, assert 2xx, wait for navigation off /signup,
 *  then poll the httpOnly cookie until the access token actually lands. */
export async function signup(
  page: Page,
  email = uniqueEmail(),
  password = 'TestPass123!',
  name?: string,
) {
  const displayName = name ?? `T${Date.now() % 1_000_000}`
  await page.goto(APP_BASE + '/signup')
  await page
    .getByRole('textbox', { name: /name|display/i })
    .first()
    .fill(displayName)
  await page.locator('input[type="email"]').first().fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  const submit = page.locator('form button[type="submit"]').first()
  await expect(submit).toBeEnabled({ timeout: 10000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 20000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
  const token = (await getAccessToken(page)) ?? ''
  return { email, password, name: displayName, token }
}

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

export function readThemeAttr(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const html = document.documentElement
    return (
      html.getAttribute('data-mol-mode') ||
      html.getAttribute('data-mol-theme') ||
      html.getAttribute('data-theme') ||
      null
    )
  })
}

export async function flipThemeAndAssertChanged(page: Page) {
  const before = await readThemeAttr(page)
  await page
    .getByRole('button', { name: /toggle theme/i })
    .first()
    .click()
  await expect.poll(async () => readThemeAttr(page), { timeout: 8000 }).not.toBe(before)
}

export async function flipThemeAndAssertSurvivesReload(page: Page) {
  const before = await readThemeAttr(page)
  await page
    .getByRole('button', { name: /toggle theme/i })
    .first()
    .click()
  await expect.poll(async () => readThemeAttr(page), { timeout: 8000 }).not.toBe(before)
  const after = await readThemeAttr(page)
  await page.reload()
  await expect.poll(async () => readThemeAttr(page), { timeout: 8000 }).toBe(after)
}

/** Read the persisted access token from the httpOnly cookie (set by signup/login). */
export async function bearerToken(page: Page): Promise<string> {
  const t = await getAccessToken(page)
  expect(t, 'no access token in cookie').toBeTruthy()
  return t as string
}

export async function captureNetwork(page: Page, fn: () => Promise<void>) {
  const reqs: { method: string; url: string; status: number }[] = []
  const onResp = (resp: any) => {
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

export function expectReq(
  reqs: Array<{ method: string; url: string; status: number }>,
  method: string,
  pattern: RegExp,
  okStatuses: number[] = [200, 201, 204],
) {
  const match = reqs.find(
    (r) => r.method === method && pattern.test(r.url) && okStatuses.includes(r.status),
  )
  expect(
    match,
    `expected ${method} ${pattern} → ${okStatuses.join('|')}, saw: ${
      reqs
        .filter((r) => pattern.test(r.url))
        .map((r) => `${r.method} ${r.url} → ${r.status}`)
        .join(' | ') || '(none)'
    }`,
  ).toBeTruthy()
  return match
}

export async function expectNoConsoleErrors(page: Page, fn: () => Promise<void>) {
  const errs: string[] = []
  const handler = (msg: any) => {
    if (msg.type() === 'error') errs.push(msg.text())
  }
  page.on('console', handler)
  try {
    await fn()
  } finally {
    page.off('console', handler)
  }
  const fatal = errs.filter(
    (e) =>
      !/favicon|net::ERR_|Failed to load resource/i.test(e) &&
      !/Failed to fetch/i.test(e) &&
      !/TypeError: Load failed/i.test(e),
  )
  expect(fatal, 'console errors during interaction').toEqual([])
}

export async function apiFetch<T = any>(
  page: Page,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; body: T }> {
  const token = await getAccessToken(page)
  return page.evaluate(
    async ({ apiBase, method, path, body, token }) => {
      const headers: Record<string, string> = { 'content-type': 'application/json' }
      if (token) headers['authorization'] = `Bearer ${token}`
      const r = await fetch(apiBase + path, {
        method,
        headers,
        credentials: 'include',
        body: body == null ? undefined : JSON.stringify(body),
      })
      let parsed: any = null
      try {
        parsed = await r.json()
      } catch {}
      return { status: r.status, body: parsed }
    },
    { apiBase: API_BASE, method, path, body, token },
  )
}

/**
 * A tutor row, in the shape `GET /api/tutors` returns.
 *
 * The specs read the tutor they drive out of the live catalog instead of
 * naming a seeded one: the demo tutors are the first thing an app's owner
 * replaces, and a spec that hard-codes a seeded display name or uuid then
 * fails on a perfectly correct app.
 */
export interface CatalogTutor {
  id: string
  user_id?: string
  display_name: string
  headline?: string
  bio?: string
  hourly_rate?: number
  subject?: string
  subjects?: string[]
  rating_average?: number
  rating_count?: number
}

/** The live tutor catalog — the same list /search and the landing page read. */
export async function getTutors(page: Page, query = ''): Promise<CatalogTutor[]> {
  const resp = await page.request.get(API_BASE + '/tutors' + query)
  if (resp.status() !== 200) {
    throw new Error(`GET /api/tutors failed: ${resp.status()} ${await resp.text()}`)
  }
  const body = await resp.json()
  return (Array.isArray(body) ? body : (body?.data ?? [])) as CatalogTutor[]
}

/** One tutor from the live catalog — whichever one the app actually holds. */
export async function pickTutor(page: Page): Promise<CatalogTutor> {
  const first = (await getTutors(page))[0]
  if (!first) throw new Error('the tutor catalog is empty')
  return first
}

/** A review row as `GET /api/tutors/:id` inlines it. */
export interface CatalogReview {
  id: string
  rating: number
  body?: string | null
  reviewer_name?: string
}

/** The tutor-detail payload the profile page renders (tutor + inline reviews). */
export async function getTutorDetail(
  page: Page,
  tutorId: string,
): Promise<CatalogTutor & { reviews: CatalogReview[] }> {
  const resp = await page.request.get(`${API_BASE}/tutors/${tutorId}`)
  if (resp.status() !== 200) {
    throw new Error(`GET /api/tutors/${tutorId} failed: ${resp.status()} ${await resp.text()}`)
  }
  const body = await resp.json()
  return { reviews: [], ...body } as CatalogTutor & { reviews: CatalogReview[] }
}

/**
 * The search page's subject chips, with the subject strings each one keeps.
 * Mirrors SUBJECT_FILTERS + subjectKeyMap in `app/src/pages/Search.tsx` — this
 * is the app's own filter vocabulary, not demo content.
 */
export const SUBJECT_CHIPS = [
  { key: 'math', label: 'Mathematics', aliases: ['math', 'mathematics', 'calculus'] },
  { key: 'science', label: 'Science', aliases: ['science', 'physics', 'chemistry', 'biology'] },
  {
    key: 'languages',
    label: 'Languages',
    aliases: ['english', 'spanish', 'portuguese', 'languages'],
  },
  { key: 'testPrep', label: 'Test prep', aliases: ['ielts', 'toefl', 'sat', 'act'] },
  { key: 'music', label: 'Music', aliases: ['music', 'cello', 'piano'] },
  { key: 'coding', label: 'Coding', aliases: ['python', 'algorithms', 'machine learning'] },
] as const

export type SubjectChip = (typeof SUBJECT_CHIPS)[number]

/** Whether the search page's `chip` keeps `tutor` in the rendered list. */
export function tutorMatchesChip(tutor: CatalogTutor, chip: SubjectChip): boolean {
  const subjects = (tutor.subjects ?? []).map((s) => String(s).toLowerCase())
  if (subjects.includes(chip.key.toLowerCase())) return true
  return subjects.some((s) => chip.aliases.some((a) => s.includes(a)))
}

/**
 * A subject chip the live catalog can actually demonstrate: one tutor the chip
 * keeps and one it hides, so a filter spec can still assert both halves.
 */
export async function pickSubjectChip(
  page: Page,
): Promise<{ chip: SubjectChip; match: CatalogTutor; miss: CatalogTutor }> {
  const catalog = await getTutors(page)
  for (const chip of SUBJECT_CHIPS) {
    const match = catalog.find((tt) => tutorMatchesChip(tt, chip))
    const miss = catalog.find((tt) => !tutorMatchesChip(tt, chip))
    if (match && miss) return { chip, match, miss }
  }
  throw new Error('the catalog needs a subject one tutor teaches and another does not')
}

/** Catalog tutors either side of a rating threshold, read from the live rows. */
export async function splitByRating(
  page: Page,
  min: number,
): Promise<{ above?: CatalogTutor; below?: CatalogTutor }> {
  const catalog = await getTutors(page)
  return {
    above: catalog.find((tt) => Number(tt.rating_average ?? 0) >= min),
    below: catalog.find((tt) => Number(tt.rating_average ?? 0) < min),
  }
}

/** Availability slots a tutor publishes (public endpoint). */
export async function getAvailability(page: Page, tutorId: string): Promise<unknown[]> {
  const resp = await page.request.get(`${API_BASE}/tutors/${tutorId}/availability`)
  if (resp.status() !== 200) return []
  const body = await resp.json()
  return (Array.isArray(body) ? body : (body?.data ?? [])) as unknown[]
}

/**
 * A tutor the /book/:tutorId page can actually drive: the booking form
 * auto-selects the first availability slot, so it needs one that publishes any.
 */
export async function pickBookableTutor(page: Page): Promise<CatalogTutor> {
  for (const tutor of await getTutors(page)) {
    if ((await getAvailability(page, tutor.id)).length) return tutor
  }
  throw new Error('no tutor in the catalog publishes availability')
}

/** Future-dated ISO timestamp for booking scheduled_at. */
export function futureISO(daysAhead = 7): string {
  const d = new Date()
  d.setDate(d.getDate() + daysAhead)
  d.setHours(15, 0, 0, 0)
  return d.toISOString()
}

/** The subject these specs book with. Owned by the tests, not by the demo seed. */
export const SPEC_BOOKING_SUBJECT = 'Physics'

/** Create a booking via API; returns the booking id.
 *  Defaults to whichever tutor the live catalog holds. */
export async function createBookingViaApi(
  page: Page,
  tutorId?: string,
  opts?: { subject?: string; scheduled_at?: string; duration_hours?: number },
): Promise<string> {
  const id = tutorId ?? (await pickTutor(page)).id
  const r = await apiFetch<{ id: string }>(page, 'POST', '/bookings', {
    tutor_id: id,
    subject: opts?.subject ?? SPEC_BOOKING_SUBJECT,
    scheduled_at: opts?.scheduled_at ?? futureISO(7),
    duration_hours: opts?.duration_hours ?? 1,
  })
  expect(r.status, `booking create unexpected status — body: ${JSON.stringify(r.body)}`).toBe(201)
  return r.body.id
}

/** Open the user menu dropdown if it exists. */
export async function openUserMenu(page: Page) {
  const trigger = page.getByRole('button', { name: /open user menu|account|profile|user/i }).first()
  if (await trigger.count().catch(() => 0)) {
    await trigger.click().catch(() => undefined)
  }
}

/** Sign out from the user menu. */
export async function logout(page: Page) {
  await openUserMenu(page)
  const out = page.getByRole('button', { name: /sign\s*out|log\s*out/i }).first()
  if (await out.count().catch(() => 0)) await out.click().catch(() => undefined)
}
