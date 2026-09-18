// Shared helpers for the language-learning (Parlance) e2e suite.
//
// All specs import from this file rather than re-rolling auth + network
// plumbing. Auth is real (POST /api/users + Bearer token), backend is the
// real Express + Postgres stack on $API_PORT, and the frontend at
// $VITE_PORT proxies /api → $API_PORT via vite.config.ts. No mocks.

import { type APIRequestContext, type Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3000')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'parlance'): string {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

export interface SignupResult {
  email: string
  password: string
  name: string
  userId?: string
  accessToken?: string
}

/**
 * Read the bearer JWT from the auth cookie. [M1-1] The token is held in
 * memory + an httpOnly `token` cookie (prod: `__Host-token`); it is no
 * longer persisted to localStorage (that copy was XSS-exfiltratable). The
 * cookie value IS the JWT and is readable in tests via the Playwright
 * context.
 */
export async function getAccessToken(page: Page): Promise<string | null> {
  const cookies = await page.context().cookies()
  const tok = cookies.find((c) => /(^|[-_])token$/i.test(c.name) && c.value)
  return tok?.value ?? null
}

/**
 * Sign up a fresh user via the UI form. Drives the real /signup page so
 * the test exercises the same flow a human user takes. Lands on
 * /dashboard after a successful signup.
 */
export async function signup(
  page: Page,
  email = uniqueEmail(),
  password = 'TestPass123!',
  name = 'Riley Test',
): Promise<SignupResult> {
  await page.goto(APP_BASE + '/signup')
  await page.getByLabel(/^Name$/i).fill(name)
  await page.getByLabel(/^Email( address)?$/i).fill(email)
  await page.getByLabel(/^Password$/i).fill(password)
  const submit = page.getByRole('button', { name: /Create account/i })
  await expect(submit).toBeEnabled({ timeout: 10000 })
  // Arm POST listener BEFORE click so a fast response can't be missed.
  // Mirrors virtual-classroom hardening (b296e327d).
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  // [M1-1] The JWT is no longer in localStorage. Capture it from the
  // create+logIn response body — the @molecule/api-resource-user create
  // handler returns `{ props, accessToken, user }` — falling back to the
  // httpOnly `token` cookie.
  let accessToken: string | undefined
  let userId: string | undefined
  try {
    const body = await resp.json()
    accessToken = body?.accessToken
    userId = body?.user?.id ?? body?.props?.id ?? body?.id
  } catch {
    /* non-JSON body — fall through to the cookie */
  }
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 15000 })
  // Wait for any seeded-data fetches to settle so subsequent navigations
  // see populated lists (lessons / vocabulary / leaderboard).
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
  // Poll until the httpOnly `token` cookie lands.
  await expect
    .poll(async () => await getAccessToken(page), {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .not.toBeNull()
  if (!accessToken) accessToken = (await getAccessToken(page)) ?? undefined
  return { email, password, name, accessToken, userId }
}

/**
 * Direct-to-API signup (no browser). Used when a test needs a fresh
 * user but doesn't want to navigate the UI.
 */
export async function apiSignup(request: APIRequestContext): Promise<SignupResult> {
  const email = uniqueEmail('apionly')
  const password = 'TestPass123!'
  const name = 'API Tester'
  const res = await request.post(API_BASE + '/users', {
    data: { email, password, name },
    headers: { 'Content-Type': 'application/json' },
  })
  expect(res.status(), 'apiSignup failed').toBe(201)
  const body = await res.json()
  return {
    email,
    password,
    name,
    userId: body?.id ?? body?.user?.id,
    accessToken: body?.accessToken,
  }
}

/** Log in via the UI. */
export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto(APP_BASE + '/login')
  await page.getByLabel(/^Email( address)?$/i).fill(email)
  await page.getByLabel(/^Password$/i).fill(password)
  const submit = page.getByRole('button', { name: /^Sign in$/i })
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
  // [M1-1] Poll the httpOnly `token` cookie rather than localStorage.
  await expect
    .poll(async () => await getAccessToken(page), {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .not.toBeNull()
}

/**
 * Capture all responses fired during fn() — used to assert which network
 * calls actually happened (and their statuses).
 */
export async function captureNetwork(
  page: Page,
  fn: () => Promise<void>,
): Promise<Array<{ method: string; url: string; status: number }>> {
  const reqs: Array<{ method: string; url: string; status: number }> = []
  const onResp = (resp: { request(): { method(): string }; url(): string; status(): number }) => {
    reqs.push({ method: resp.request().method(), url: resp.url(), status: resp.status() })
  }
  page.on('response', onResp as never)
  try {
    await fn()
  } finally {
    page.off('response', onResp as never)
  }
  return reqs
}

/** Filter captured requests to those that hit /api/<path> (any verb). */
export function whereUrl(
  reqs: ReadonlyArray<{ method: string; url: string; status: number }>,
  pathRegex: RegExp,
  method?: string,
): Array<{ method: string; url: string; status: number }> {
  return reqs.filter(
    (r) =>
      pathRegex.test(r.url) && (method ? r.method.toUpperCase() === method.toUpperCase() : true),
  )
}

/** Make an authenticated direct-to-API request with a Bearer token. */
export function authedApi(request: APIRequestContext, token: string) {
  const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  return {
    get: (path: string) => request.get(API_BASE + path, { headers: auth }),
    post: (path: string, body?: unknown) =>
      request.post(API_BASE + path, { headers: auth, data: body ?? {} }),
    put: (path: string, body?: unknown) =>
      request.put(API_BASE + path, { headers: auth, data: body ?? {} }),
    patch: (path: string, body?: unknown) =>
      request.patch(API_BASE + path, { headers: auth, data: body ?? {} }),
    delete: (path: string) => request.delete(API_BASE + path, { headers: auth }),
  }
}

/** Get the first lesson id from the lessons list page. */
export async function getFirstLessonId(page: Page): Promise<string> {
  await page.goto(APP_BASE + '/lessons')
  const link = page.locator('a[href^="/lessons/"]').first()
  await link.waitFor({ timeout: 15000 })
  const href = await link.getAttribute('href')
  return href!.replace(/^.*\/lessons\//, '')
}

/** The authenticated API surface `authedApi()` returns. */
export type AuthedApi = ReturnType<typeof authedApi>

export interface LessonRow {
  id: string
  title?: string
}

export interface ExerciseRow {
  id: string
  correct_answer: string
}

/**
 * The first lesson the catalog actually serves. Specs read the lesson they
 * drive out of /api/lessons instead of naming a seeded id — the demo course is
 * the first thing an app's owner replaces.
 */
export async function getFirstLessonIdViaApi(api: AuthedApi): Promise<string> {
  const res = await api.get('/lessons')
  expect(res.status(), 'GET /lessons').toBe(200)
  const lessons = (await res.json()) as LessonRow[]
  const first = lessons[0]
  if (!first) throw new Error('lesson catalog is empty')
  return first.id
}

/**
 * The first lesson that actually carries exercises, together with them — what
 * the answer-submission specs need. Reads the catalog rather than naming a
 * seeded lesson.
 */
export async function getFirstLessonWithExercises(
  api: AuthedApi,
): Promise<{ lessonId: string; exercises: ExerciseRow[] }> {
  const res = await api.get('/lessons')
  expect(res.status(), 'GET /lessons').toBe(200)
  const lessons = (await res.json()) as LessonRow[]
  for (const lesson of lessons) {
    const exRes = await api.get(`/lessons/${lesson.id}/exercises`)
    expect(exRes.status(), `GET /lessons/${lesson.id}/exercises`).toBe(200)
    const exercises = (await exRes.json()) as ExerciseRow[]
    if (exercises.length > 0) return { lessonId: lesson.id, exercises }
  }
  throw new Error('no lesson in the catalog has exercises')
}
