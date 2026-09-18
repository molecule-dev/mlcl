// Shared helpers for document-collaboration e2e specs. Every spec file
// imports from this module rather than rewriting auth/network plumbing
// per-test.

import { ConsoleMessage, Page, Response, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3170')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4170') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'dc-test'): string {
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

interface SignedUpUser {
  email: string
  password: string
  name: string
  accessToken: string | null
  userId: string | null
}

/**
 * Sign up a fresh user via the UI. Returns credentials + the JWT bearer
 * persisted into localStorage by the auth bond. Callers can reuse the
 * token via `page.request.*` to drive backend invariant checks.
 */
export async function signup(
  page: Page,
  email = uniqueEmail(),
  password = 'TestPass123!',
  name = 'Test User',
): Promise<SignedUpUser> {
  await page.goto(APP_BASE + '/signup')
  // Wait for the form to mount before the optional-field probes below.
  // count() is a one-shot read with no auto-waiting, so after a goto it can
  // run against a still-empty React root, return 0, and SILENTLY SKIP the
  // fill — the form then won't submit and every spec in the app dies on a
  // signup timeout. That is exactly how restaurant-ordering lost all 78.
  await page.locator('input').first().waitFor({ state: 'visible', timeout: 15000 })
  // The signup page splits "first name" + "last name" — fill both with
  // halves of the supplied display name so the user lands on a non-empty
  // identity.
  const [first, ...rest] = name.split(' ')
  const last = rest.join(' ') || 'User'
  const textInputs = page.locator('input[type="text"]')
  if ((await textInputs.count()) >= 2) {
    await textInputs.nth(0).fill(first ?? 'Test')
    await textInputs.nth(1).fill(last)
  } else if ((await textInputs.count()) === 1) {
    await textInputs.first().fill(name)
  }
  await page.locator('input[type="email"]').first().fill(email)
  const pwInputs = page.locator('input[type="password"]')
  const pwCount = await pwInputs.count()
  for (let i = 0; i < pwCount; i++) {
    await pwInputs.nth(i).fill(password)
  }
  const submit = page.getByRole('button', { name: /create\s*account|sign\s*up/i }).first()
  await expect(submit).toBeEnabled({ timeout: 10000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 30000 })
  const accessToken = await getAccessToken(page)
  let userId: string | null = null
  const meRes = await page.request.get(API_BASE + '/users/me', { failOnStatusCode: false })
  if (meRes.ok()) {
    const meBody = (await meRes.json()) as { props?: { id?: string }; id?: string }
    userId = meBody?.props?.id ?? meBody?.id ?? null
  }
  return { email, password, name, accessToken, userId }
}

/** Sign up by hitting the API directly and prime localStorage. Used for tests
 *  that don't need to exercise the signup UI. */
export async function apiSignupAndPrime(
  page: Page,
  email = uniqueEmail(),
  password = 'TestPass123!',
  name = 'Test User',
): Promise<SignedUpUser> {
  await page.goto(APP_BASE + '/login')
  const res = await page.request.post(`${API_BASE}/users`, {
    headers: { 'Content-Type': 'application/json' },
    data: { email, password, name },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBe(201)
  const body = (await res.json()) as {
    accessToken: string
    refreshToken?: string
    user: { id: string; name?: string; email?: string }
  }
  return {
    email,
    password,
    name,
    accessToken: body.accessToken,
    userId: body.user?.id ?? null,
  }
}

export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto(APP_BASE + '/login')
  await page.locator('input[type="email"]').first().fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  const submit = page.getByRole('button', { name: /sign\s*in|log\s*in/i }).first()
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
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20000 })
}

export async function logout(page: Page): Promise<void> {
  await page.evaluate(() => window.localStorage.clear())
}

export interface CapturedRequest {
  method: string
  url: string
  status: number
}

/** Capture all network responses during a block. */
export async function captureNetwork(
  page: Page,
  fn: () => Promise<void>,
): Promise<CapturedRequest[]> {
  const reqs: CapturedRequest[] = []
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

export function authHeaders(accessToken: string | null): Record<string, string> {
  return accessToken
    ? { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' }
}

export interface TemplateRow {
  id: string
  name: string
  category: string
  is_system: boolean
}

/**
 * The template library as the Templates page reads it.
 *
 * The system templates come from the demo seed (`api/src/handlers/_seed.ts`)
 * and are the first thing an app's owner replaces, so specs drive whatever the
 * API actually returns rather than naming a seeded template or its count.
 */
export async function listTemplates(
  page: Page,
  accessToken: string | null,
): Promise<TemplateRow[]> {
  const res = await page.request.get(`${API_BASE}/templates`, {
    headers: authHeaders(accessToken),
  })
  expect(res.status(), await res.text().catch(() => '')).toBe(200)
  return (await res.json()) as TemplateRow[]
}

export interface DocumentRow {
  id: string
  title: string
  status?: string
}

/** The signed-in user's documents, read from the endpoint the Dashboard reads. */
export async function listDocuments(
  page: Page,
  accessToken: string | null,
): Promise<DocumentRow[]> {
  const res = await page.request.get(`${API_BASE}/documents`, {
    headers: authHeaders(accessToken),
  })
  expect(res.status(), await res.text().catch(() => '')).toBe(200)
  return (await res.json()) as DocumentRow[]
}

export interface SeededDocument {
  id: string
  owner_id: string
  title: string
  content: { blocks?: Array<{ type: string; text?: string }> } | null
}

/** Create a document via the API and return the row. */
export async function seedDocument(
  page: Page,
  accessToken: string | null,
  overrides: Partial<{ title: string; content: Record<string, unknown> }> = {},
): Promise<SeededDocument> {
  const title = overrides.title ?? `Manuscript ${Date.now()}-${++counter}`
  const res = await page.request.post(`${API_BASE}/documents`, {
    headers: authHeaders(accessToken),
    data: {
      title,
      content: overrides.content ?? {
        blocks: [
          { type: 'heading', text: title },
          { type: 'paragraph', text: 'Body of ' + title },
        ],
      },
    },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBe(201)
  return (await res.json()) as SeededDocument
}

export interface SeededComment {
  id: string
  document_id: string
  body: string
  is_resolved: boolean
}

/** Post a comment on a document. */
export async function seedComment(
  page: Page,
  accessToken: string | null,
  documentId: string,
  body = `Comment ${Date.now()}-${++counter}`,
): Promise<SeededComment> {
  const res = await page.request.post(`${API_BASE}/comments/${documentId}`, {
    headers: authHeaders(accessToken),
    data: { body },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text().catch(() => '')).toBe(201)
  return (await res.json()) as SeededComment
}

/** Fail the test if any console.error fires during fn (allowing favicon noise). */
export async function expectNoConsoleErrors(page: Page, fn: () => Promise<void>): Promise<void> {
  const errs: string[] = []
  const handler = (msg: ConsoleMessage): void => {
    if (msg.type() === 'error') errs.push(msg.text())
  }
  page.on('console', handler)
  try {
    await fn()
  } finally {
    page.off('console', handler)
  }
  const fatal = errs.filter(
    (e) => !/favicon|net::ERR_|Failed to load resource|preview-bridge/.test(e),
  )
  expect(fatal, 'console errors during interaction').toEqual([])
}
