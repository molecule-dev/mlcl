// Auto-generated boilerplate. Add helpers here as needed; do not delete
// these. Every spec file should import from this module rather than
// rewriting auth/network plumbing per-test.

import { Page, expect } from '@molecule/app-e2e-fixtures-default'

export async function getAccessToken(page: Page): Promise<string | null> {
  // [M1-1] The bearer token is held in memory (a localStorage copy is
  // XSS-exfiltratable); the persistent credential is the httpOnly `token`
  // cookie (prod: `__Host-token`), readable in tests via the Playwright
  // context. Its value IS the JWT.
  const cookies = await page.context().cookies()
  const tok = cookies.find((c) => /(^|[-_])token$/i.test(c.name) && c.value)
  return tok?.value ?? null
}

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3170')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4170') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'cairn') {
  return `${prefix}+${Date.now()}-${++counter}@flagship.test`
}

/** Sign up a fresh user via the UI form and land on /home. Returns the
 *  credentials AND the JWT bearer token persisted to localStorage so
 *  callers can authenticate page.request.* calls.
 *
 *  Hardening: gate on submit-enabled, arm the POST /api/users response
 *  listener BEFORE the click, then poll until the JWT lands in
 *  localStorage. Eliminates a race where the inline `accessToken` read
 *  below ran before the molecule auth hook had persisted the token,
 *  throwing "signup did not persist an access token" on attempt 1 but
 *  passing under retries:2 (surfacing as 'flaky'). */
export async function signup(page: Page, email = uniqueEmail(), password = 'CairnTestPass2026!') {
  await page.goto(APP_BASE + '/signup')
  await page.getByPlaceholder('Alex').fill('Test')
  await page.getByPlaceholder('Lin').fill('User')
  await page.getByPlaceholder('you@team.com').fill(email)
  await page.getByPlaceholder('lighthouse').fill(`ws${Date.now()}`)
  await page.getByPlaceholder('At least 12 characters').fill(password)
  const submit = page.getByRole('button', { name: /create account/i })
  await expect(submit).toBeEnabled({ timeout: 10_000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30_000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).toHaveURL(/\/home/, { timeout: 20_000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10_000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
  const accessToken = await getAccessToken(page)
  if (!accessToken) throw new Error('signup did not persist an access token')
  const userResp = await page.request.get(`${API_BASE}/users/me`, { failOnStatusCode: false })
  let userId: string | null = null
  if (userResp.ok()) {
    const body = (await userResp.json()) as { props?: { id?: string }; id?: string }
    userId = body?.props?.id ?? body?.id ?? null
  }
  return { email, password, accessToken: accessToken as string, userId }
}

/** Log in an existing user via the UI form. */
export async function login(page: Page, email: string, password: string) {
  await page.goto(APP_BASE + '/login')
  await page.getByPlaceholder('you@team.com').fill(email)
  await page.getByPlaceholder('••••••••').fill(password)
  const submit = page.getByRole('button', { name: /sign in/i }).first()
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
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10_000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
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

export function apiHeaders(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
}

// ---------- domain seed helpers (called via page.request with a JWT) ----------

export async function getMe(page: Page, accessToken: string) {
  const res = await page.request.get(`${API_BASE}/me`, {
    headers: apiHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBe(200)
  return (await res.json()) as {
    id: string
    name: string | null
    email: string | null
    username: string | null
    planKey: string
    defaultSpace: { id: string; name: string; slug: string }
    stats: { pageCount: number; spaceCount: number }
  }
}

export async function listSpaces(page: Page, accessToken: string) {
  const res = await page.request.get(`${API_BASE}/spaces`, {
    headers: apiHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBe(200)
  return (await res.json()) as Array<{
    id: string
    name: string
    slug: string
    description: string | null
  }>
}

export async function createSpace(
  page: Page,
  accessToken: string,
  overrides: Partial<{ name: string; description: string; visibility: 'private' | 'public' }> = {},
) {
  const name = overrides.name ?? `Space ${Date.now()}-${++counter}`
  const res = await page.request.post(`${API_BASE}/spaces`, {
    headers: apiHeaders(accessToken),
    data: {
      name,
      description: overrides.description ?? 'Created by e2e suite',
      visibility: overrides.visibility ?? 'private',
    },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBe(201)
  return (await res.json()) as { id: string; name: string; slug: string }
}

export async function listPages(
  page: Page,
  accessToken: string,
  query: { space_id?: string; trashed?: 'true' | 'false' } = {},
) {
  const url = new URL(`${API_BASE}/pages`)
  if (query.space_id) url.searchParams.set('space_id', query.space_id)
  if (query.trashed) url.searchParams.set('trashed', query.trashed)
  const res = await page.request.get(url.toString(), {
    headers: apiHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBe(200)
  return (await res.json()) as Array<{
    id: string
    title: string
    slug: string
    content: string
    space_id: string
    summary: string | null
    version: number
    trashed_at: string | null
  }>
}

export async function createPage(
  page: Page,
  accessToken: string,
  spaceId: string,
  overrides: Partial<{ title: string; content: string }> = {},
) {
  const title = overrides.title ?? `Page ${Date.now()}-${++counter}`
  const res = await page.request.post(`${API_BASE}/pages`, {
    headers: apiHeaders(accessToken),
    data: {
      title,
      content: overrides.content ?? '# Hello\n\nA fresh page.',
      space_id: spaceId,
    },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBe(201)
  return (await res.json()) as { id: string; title: string; slug: string; version: number }
}

export async function getPage(page: Page, accessToken: string, id: string) {
  const res = await page.request.get(`${API_BASE}/pages/${id}`, {
    headers: apiHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBe(200)
  return (await res.json()) as {
    id: string
    title: string
    slug: string
    content: string
    summary: string | null
    version: number
    trashed_at: string | null
  }
}
