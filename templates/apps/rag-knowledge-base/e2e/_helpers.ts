/**
 * Shared helpers for the rag-knowledge-base flagship (Engram) e2e specs.
 * Drives a real browser against the dev server hitting real Postgres,
 * real Anthropic + OpenAI providers (env-configured), real Mailgun
 * sandbox, real Stripe sandbox. No mocks: every assertion is "user
 * clicked → backend actually changed".
 */
import { Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3090')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4090') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'engram') {
  return `${prefix}+${Date.now()}-${++counter}@flagship.test`
}

export interface Session {
  email: string
  password: string
  accessToken: string
  userId: string
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
 * Sign up a fresh user via the real /signup form. Returns the captured
 * accessToken + user id so specs can issue authenticated API calls
 * directly. After signup the app redirects to /ask.
 *
 * Hardened against the auth-race: arm POST /api/users response listener
 * BEFORE clicking submit so a fast response can't be missed, gate on
 * status < 400, then wait for navigation and poll until the JWT cookie
 * actually lands. Eliminates the API-only flake where a spec fired an
 * authed request before the auth-state hook had set the token.
 */
export async function signup(
  page: Page,
  email = uniqueEmail(),
  password = 'TestPass123!',
  firstName = 'Ada',
  lastName = 'Lovelace',
): Promise<Session> {
  await page.goto(APP_BASE + '/signup')
  await page.locator('input#firstName').fill(firstName)
  await page.locator('input#lastName').fill(lastName)
  await page.locator('input#email').fill(email)
  await page.locator('input#password').fill(password)
  await page.locator('input#confirm').fill(password)
  const submit = page.getByRole('button', { name: /create\s+account/i })
  await expect(submit).toBeEnabled({ timeout: 10_000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30_000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await page.waitForURL(/\/ask/, { timeout: 30_000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
  const accessToken = await getAccessToken(page)
  if (!accessToken) throw new Error('signup did not persist an access token')
  const meResp = await page.request.get(API_BASE + '/users/me')
  const meBody = meResp.ok()
    ? ((await meResp.json()) as { props?: { id?: string }; id?: string })
    : null
  const userId = meBody?.props?.id ?? meBody?.id ?? null
  if (!userId) throw new Error('signup did not persist a user id')
  return { email, password, accessToken, userId }
}

export async function login(page: Page, email: string, password: string) {
  await page.goto(APP_BASE + '/login')
  await page.locator('input#email').fill(email)
  await page.locator('input#password').fill(password)
  const submit = page.getByRole('button', { name: /sign\s*in|log\s*in/i })
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
  await page.waitForURL(/\/ask/, { timeout: 20_000 })
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

/**
 * Capture every HTTP response during a block. Used by specs that must
 * assert a real backend call happened (gate 12 in verify-app-coverage).
 */
export async function captureNetwork(
  page: Page,
  fn: () => Promise<void>,
): Promise<{ method: string; url: string; status: number }[]> {
  const reqs: { method: string; url: string; status: number }[] = []
  const onResp = (resp: import('@playwright/test').Response) => {
    reqs.push({
      method: resp.request().method(),
      url: resp.url(),
      status: resp.status(),
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

export async function expectNoConsoleErrors(page: Page, fn: () => Promise<void>) {
  const errs: string[] = []
  const handler = (msg: import('@playwright/test').ConsoleMessage) => {
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

// ---- API helpers ----

export interface ApiDocument {
  id: string
  user_id: string
  title: string
  body_md: string | null
  ingest_status: string
  chunk_count: number
  source_id?: string | null
  collection_id?: string | null
  source_url?: string | null
  mime?: string | null
  size_bytes?: number | string | null
  page_count?: number | null
  created_at: string
}

export async function createDocument(
  page: Page,
  accessToken: string,
  overrides: Partial<{ title: string; body_md: string; mime: string; collection_id: string }> = {},
): Promise<ApiDocument> {
  const data: Record<string, unknown> = {
    title: overrides.title ?? `Doc ${Date.now()}`,
    body_md:
      overrides.body_md ??
      'Annual subscribers are eligible for a prorated refund within 30 days of renewal. Monthly subscribers can cancel any time.',
    mime: overrides.mime ?? 'text/markdown',
  }
  if (overrides.collection_id) data.collection_id = overrides.collection_id
  const res = await page.request.post(`${API_BASE}/documents`, {
    headers: apiHeaders(accessToken),
    data,
  })
  expect(res.status(), await res.text()).toBe(201)
  return (await res.json()) as ApiDocument
}

export async function listDocuments(page: Page, accessToken: string): Promise<ApiDocument[]> {
  const res = await page.request.get(`${API_BASE}/documents`, { headers: apiHeaders(accessToken) })
  expect(res.status()).toBe(200)
  const body = (await res.json()) as ApiDocument[] | { data?: ApiDocument[] }
  return Array.isArray(body) ? body : (body.data ?? [])
}

export interface ApiSource {
  id: string
  user_id: string
  kind: string
  label: string
  sync_status: string
  doc_count: number
  last_sync_at: string | null
  created_at: string
}

export async function createSource(
  page: Page,
  accessToken: string,
  overrides: Partial<{ label: string; kind: string }> = {},
): Promise<ApiSource> {
  const res = await page.request.post(`${API_BASE}/sources`, {
    headers: apiHeaders(accessToken),
    data: { label: overrides.label ?? `Source ${Date.now()}`, kind: overrides.kind ?? 'upload' },
  })
  expect(res.status(), await res.text()).toBe(201)
  return (await res.json()) as ApiSource
}

export interface ApiQaEntry {
  id: string
  user_id: string
  question: string
  answer_md?: string
  answer?: string
  citations?: Array<{ id: string; title: string; document_id: string; relevance: number }>
  citations_json?: unknown
  conversation_id?: string | null
  confidence?: number | string
  response_ms?: number | null
  response_time_ms?: number | null
  created_at: string
}

export async function ask(page: Page, accessToken: string, question: string): Promise<ApiQaEntry> {
  const res = await page.request.post(`${API_BASE}/qa/ask`, {
    headers: apiHeaders(accessToken),
    data: { question },
  })
  expect(res.status(), await res.text()).toBe(201)
  return (await res.json()) as ApiQaEntry
}

export async function listHistory(page: Page, accessToken: string): Promise<ApiQaEntry[]> {
  const res = await page.request.get(`${API_BASE}/qa/history`, { headers: apiHeaders(accessToken) })
  expect(res.status()).toBe(200)
  const body = (await res.json()) as ApiQaEntry[] | { data?: ApiQaEntry[] }
  return Array.isArray(body) ? body : (body.data ?? [])
}

export interface ApiNotification {
  id: string
  user_id: string
  kind: string
  title: string
  body: string | null
  link?: string | null
  read_at: string | null
  created_at: string
}

export async function createNotification(
  page: Page,
  accessToken: string,
  overrides: Partial<{ kind: string; title: string; body: string }> = {},
): Promise<ApiNotification> {
  const res = await page.request.post(`${API_BASE}/notifications`, {
    headers: apiHeaders(accessToken),
    data: {
      kind: overrides.kind ?? 'index',
      title: overrides.title ?? 'Test notification',
      body: overrides.body ?? 'A new event happened in your knowledge base.',
    },
  })
  expect(res.status(), await res.text()).toBe(201)
  return (await res.json()) as ApiNotification
}

export async function listNotifications(
  page: Page,
  accessToken: string,
): Promise<ApiNotification[]> {
  const res = await page.request.get(`${API_BASE}/notifications`, {
    headers: apiHeaders(accessToken),
  })
  expect(res.status()).toBe(200)
  const body = (await res.json()) as ApiNotification[] | { data?: ApiNotification[] }
  return Array.isArray(body) ? body : (body.data ?? [])
}
