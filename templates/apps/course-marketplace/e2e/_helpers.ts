/**
 * Shared helpers for course-marketplace flagship e2e specs. Every spec
 * imports from here rather than rewriting auth/network plumbing.
 *
 * The signup form has name + email + password + a "I agree to the terms"
 * checkbox; `signup()` drives all of them and returns the resulting JWT
 * + userId so callers can drive `page.request.*` with bearer auth.
 */

import { Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3000')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'cm') {
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

/** Sign up a fresh user via the UI and return the credentials AND the
 *  JWT bearer token persisted to localStorage.
 *
 *  Deterministic: gates on `POST /api/users` returning <400 before we
 *  await the URL change, so we don't race the in-flight register call. */
export async function signup(
  page: Page,
  email = uniqueEmail(),
  password = 'TestPass123!',
  name = 'Test Learner',
) {
  await page.goto(APP_BASE + '/signup')
  // Wait for the form to be interactive before touching it.
  await expect(page.locator('[data-mol-id="btn-signup"]')).toBeEnabled({ timeout: 10_000 })
  await page.locator('#name').fill(name)
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  // Tick the agree-to-terms checkbox (only checkbox in the form).
  await page.locator('input[type="checkbox"]').first().check()
  // Gate on the register POST so we don't race the SPA navigation.
  const registerResponse = page.waitForResponse(
    (res) => /\/api\/users(\?|$|\/)/.test(res.url()) && res.request().method() === 'POST',
    { timeout: 20_000 },
  )
  await page.locator('[data-mol-id="btn-signup"]').click()
  const res = await registerResponse
  expect(res.status(), `register POST returned ${res.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 15_000 })
  // Token poll: auth-state hook persists JWT in a microtask after React
  // routes; without this, an immediate api() call can read stale storage
  // and 401. See virtual-classroom/_helpers.ts.
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10_000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
  const accessToken = await getAccessToken(page)
  const userRes = await page.request.get(API_BASE + '/users/me')
  const userBody = (await userRes.json()) as { props?: { id?: string }; id?: string }
  const userId = userBody.props?.id ?? userBody.id ?? null
  return { email, password, name, accessToken, userId }
}

/** Sign up a fresh user via the API only — does NOT visit /my-learning,
 *  so `seedDemoForUser` (which fires on the first GET /enrollments) is
 *  NOT triggered. Use this when you need a "clean" account without the
 *  3 starter enrollments seeded into every demo learner. */
export async function signupApiOnly(
  page: Page,
  email = uniqueEmail(),
  password = 'TestPass123!',
  name = 'Test Learner',
): Promise<{
  email: string
  password: string
  name: string
  accessToken: string
  userId: string
}> {
  const res = await page.request.post(`${API_BASE}/users`, {
    data: { name, email, password },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBeLessThan(400)
  const body = (await res.json()) as { accessToken: string; user: { id: string } }
  return { email, password, name, accessToken: body.accessToken, userId: body.user.id }
}

export async function login(page: Page, email: string, password: string) {
  await page.goto(APP_BASE + '/login')
  await page.locator('#email, input[type="email"]').first().fill(email)
  await page.locator('#password, input[type="password"]').first().fill(password)
  const submit = page.locator('[data-mol-id="btn-login"]').first()
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
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10_000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
}

export async function logout(page: Page) {
  await page.evaluate(() => window.localStorage.clear())
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

export function authHeaders(accessToken: string | null): Record<string, string> {
  return accessToken
    ? { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' }
}

/** Promote the signed-in user to instructor (idempotent). */
export async function becomeInstructor(
  page: Page,
  accessToken: string | null,
  bio = 'Test instructor bio.',
): Promise<{ id: string; is_instructor: boolean }> {
  const res = await page.request.post(`${API_BASE}/instructors/me/become`, {
    headers: authHeaders(accessToken),
    data: { bio },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBeLessThan(400)
  return (await res.json()) as { id: string; is_instructor: boolean }
}

/** Create a draft course owned by the signed-in user. Returns id + slug. */
export async function seedCourse(
  page: Page,
  accessToken: string | null,
  overrides: Partial<{
    title: string
    description: string
    category: string
    price_cents: number
  }> = {},
): Promise<{ id: string; title: string }> {
  const title = overrides.title ?? `Spec Course ${Date.now()}-${++counter}`
  const res = await page.request.post(`${API_BASE}/courses`, {
    headers: authHeaders(accessToken),
    data: {
      title,
      description: overrides.description ?? 'A spec course used for e2e testing.',
      category: overrides.category ?? 'general',
      price_cents: overrides.price_cents ?? 0,
    },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBeLessThan(400)
  const body = (await res.json()) as { id: string }
  return { id: body.id, title }
}

/** Publish a course (PATCH status='published'). */
export async function publishCourse(
  page: Page,
  accessToken: string | null,
  courseId: string,
): Promise<void> {
  const res = await page.request.patch(`${API_BASE}/courses/${courseId}`, {
    headers: authHeaders(accessToken),
    data: { status: 'published' },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBeLessThan(400)
}

/** Read enrollments for the signed-in user. */
export async function readEnrollments(
  page: Page,
  accessToken: string | null,
): Promise<Array<{ course_id: string; enrollment_id: string }>> {
  const res = await page.request.get(`${API_BASE}/enrollments`, {
    headers: authHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBeLessThan(400)
  return (await res.json()) as Array<{ course_id: string; enrollment_id: string }>
}
