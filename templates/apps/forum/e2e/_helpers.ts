// Auto-generated boilerplate. Add helpers here as needed; do not delete
// these. Every spec file should import from this module rather than
// rewriting auth/network plumbing per-test.

import { Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3210')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4210') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'forum') {
  return `${prefix}+${Date.now()}-${++counter}@flagship.test`
}

/**
 * Sign up a fresh user via the UI signup form. Returns email, password,
 * the JWT bearer access token persisted to localStorage, and the user id.
 *
 * Tests use the access token to make authenticated API requests directly
 * via page.request.* (which has its own cookie jar separate from the
 * live browser session). The forum app sends users to /feed after signup.
 */
export async function signup(page: Page, email = uniqueEmail(), password = 'TestPass!1234') {
  await page.goto(APP_BASE + '/signup')
  // Wait for the form to mount before the optional-field probes below.
  // count() is a one-shot read with no auto-waiting, so after a goto it can
  // run against a still-empty React root, return 0, and SILENTLY SKIP the
  // fill — the form then won't submit and every spec in the app dies on a
  // signup timeout. That is exactly how restaurant-ordering lost all 78.
  await page.locator('input').first().waitFor({ state: 'visible', timeout: 15000 })
  // First / last name are required by the form. Fill them when present.
  const firstName = page.locator('input[autocomplete="given-name"]')
  if (await firstName.count().catch(() => 0)) await firstName.first().fill('Forum')
  const lastName = page.locator('input[autocomplete="family-name"]')
  if (await lastName.count().catch(() => 0)) await lastName.first().fill('Tester')
  await page.locator('input[type="email"]').first().fill(email)
  const passwordInputs = page.locator('input[autocomplete="new-password"], input[type="password"]')
  await passwordInputs.nth(0).fill(password)
  if (
    await passwordInputs
      .nth(1)
      .count()
      .catch(() => 0)
  ) {
    await passwordInputs.nth(1).fill(password)
  }
  const submit = page.locator('form button[type="submit"]').first()
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
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 15000 })
  await page.waitForURL(/\/(feed|home|categories|onboarding)/, { timeout: 15000 }).catch(() => {})
  await expect
    .poll(async () => await getAccessToken(page), {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .not.toBeNull()
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

/** Log in an existing user via the UI form. */
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
  await expect
    .poll(async () => await getAccessToken(page), {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .not.toBeNull()
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

/** Sign out via the user menu. */
export async function logout(page: Page) {
  const menu = page.getByRole('button', { name: /open user menu|account|profile/i }).first()
  if (await menu.count().catch(() => 0)) await menu.click()
  const out = page.getByRole('button', { name: /sign\s*out|log\s*out/i }).first()
  if (await out.count().catch(() => 0)) await out.click()
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

/**
 * Fail the test if any console.error fires during fn (allowing benign
 * third-party noise like favicons / blocked-network errors).
 */
export async function expectNoConsoleErrors(page: Page, fn: () => Promise<void>) {
  const errs: string[] = []
  const handler = (msg: { type(): string; text(): string }) => {
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

export function apiHeaders(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
}

// ---------- domain seed helpers ----------

export interface SeededCategory {
  id: string
  slug: string
  name: string
}

/**
 * Pick the first available auto-seeded category. The categories endpoint
 * auto-creates the default set on first request, so a fresh smoke
 * environment always returns at least one category.
 */
export async function firstCategory(page: Page): Promise<SeededCategory> {
  const res = await page.request.get(`${API_BASE}/categories`)
  expect(res.status(), await res.text()).toBeLessThan(300)
  const list = (await res.json()) as Array<{ id: string; slug: string; name: string }>
  expect(list.length).toBeGreaterThan(0)
  return { id: list[0].id, slug: list[0].slug, name: list[0].name }
}

export interface SeededThread {
  id: string
  slug: string
  title: string
  body: string
  category_id: string
}

/** Create a thread directly via the API. */
export async function seedThread(
  page: Page,
  accessToken: string,
  overrides: Partial<{ title: string; body: string; category_id: string }> = {},
): Promise<SeededThread> {
  const cat = overrides.category_id ?? (await firstCategory(page)).id
  const title = overrides.title ?? `E2E thread ${Date.now()}-${++counter}`
  const body = overrides.body ?? 'A thread body that is long enough to satisfy validation.'
  const res = await page.request.post(`${API_BASE}/threads`, {
    headers: apiHeaders(accessToken),
    data: { title, body, category_id: cat, tags: [] },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBeLessThan(300)
  const thread = (await res.json()) as { id: string; slug?: string; title?: string }
  return {
    id: thread.id,
    slug: thread.slug ?? '',
    title: thread.title ?? title,
    body,
    category_id: cat,
  }
}

/**
 * Promote the user's role directly via the database is impossible from
 * Playwright; tests that need moderator privileges promote via the user
 * record patch endpoint. The forum scaffolds users with role='member' by
 * default; certain tests use the seeded `forum_admin` smoke user instead.
 */
