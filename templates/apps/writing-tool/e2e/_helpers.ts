/**
 * Shared helpers for the writing-tool (Versal) e2e suite.
 *
 * Drives a real browser against the dev server hitting a real Postgres,
 * real Stripe (test mode) and real Mailgun. No mocks — every assertion
 * is "user clicked → backend actually changed".
 */
import { Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3000')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'versal'): string {
  return `${prefix}+${Date.now()}-${++counter}@flagship.test`
}

/**
 * Sign up a fresh user via the real signup form. After signup the app
 * redirects to /library. Returns the credentials so specs can re-login
 * if they want to assert persistence across sessions.
 *
 * Hardened against the auth-race: arm POST /api/users response listener
 * BEFORE clicking submit so a fast response can't be missed, gate on
 * status < 400, then wait for navigation and poll until the JWT actually
 * lands in localStorage. Eliminates the API-only flake where a spec
 * fired an authed request before the auth-state hook had written it.
 */
export async function signup(
  page: Page,
  email = uniqueEmail(),
  password = 'TestPass123!',
  name = 'Versal Writer',
): Promise<{ email: string; password: string; name: string }> {
  await page.goto(APP_BASE + '/signup')
  // Wait for the form to mount before the optional-field probes below.
  // count() is a one-shot read with no auto-waiting, so after a goto it can
  // run against a still-empty React root, return 0, and SILENTLY SKIP the
  // fill — the form then won't submit and every spec in the app dies on a
  // signup timeout. That is exactly how restaurant-ordering lost all 78.
  await page.locator('input').first().waitFor({ state: 'visible', timeout: 15000 })
  const nameInput = page.locator('input[autocomplete="name"]').first()
  if (await nameInput.count().catch(() => 0)) await nameInput.fill(name)
  await page.locator('input[type="email"]').first().fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  const submit = page.getByRole('button', { name: /create account/i }).first()
  await expect(submit).toBeEnabled({ timeout: 10_000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30_000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await page.waitForURL(/\/library/, { timeout: 30_000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
  return { email, password, name }
}

export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto(APP_BASE + '/login')
  await page.locator('input[type="email"]').first().fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  const submit = page.getByRole('button', { name: /sign\s*in|log\s*in/i }).first()
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
  await page.waitForURL(/\/library/, { timeout: 20_000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
}

export async function logout(page: Page): Promise<void> {
  await page.goto(APP_BASE + '/settings')
  const out = page.getByRole('button', { name: /sign\s*out|log\s*out/i }).first()
  if (await out.count().catch(() => 0)) await out.click()
}

/**
 * Capture all network responses during a block. Specs use this to
 * confirm a click actually fired the expected POST/PATCH/DELETE.
 */
export async function captureNetwork(
  page: Page,
  fn: () => Promise<void>,
): Promise<{ method: string; url: string; status: number }[]> {
  const reqs: { method: string; url: string; status: number }[] = []
  const onResp = (resp: {
    request: () => { method: () => string }
    url: () => string
    status: () => number
  }) => {
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

export async function getAccessToken(page: Page): Promise<string | null> {
  // [M1-1] The bearer token is held in memory (a localStorage copy is
  // XSS-exfiltratable); the persistent credential is the httpOnly `token`
  // cookie (prod: `__Host-token`), readable in tests via the Playwright
  // context. Its value IS the JWT.
  const cookies = await page.context().cookies()
  const tok = cookies.find((c) => /(^|[-_])token$/i.test(c.name) && c.value)
  return tok?.value ?? null
}

export async function authedGet<T = unknown>(page: Page, path: string): Promise<T> {
  const token = await getAccessToken(page)
  const resp = await page.request.get(API_BASE + path, {
    headers: { Authorization: `Bearer ${token ?? ''}` },
  })
  if (!resp.ok()) {
    throw new Error(`GET ${path} failed: ${resp.status()} ${await resp.text()}`)
  }
  return resp.json() as Promise<T>
}

export async function authedPost<T = unknown>(page: Page, path: string, body: unknown): Promise<T> {
  const token = await getAccessToken(page)
  const resp = await page.request.post(API_BASE + path, {
    headers: { Authorization: `Bearer ${token ?? ''}`, 'Content-Type': 'application/json' },
    data: body,
  })
  if (!resp.ok()) {
    throw new Error(`POST ${path} failed: ${resp.status()} ${await resp.text()}`)
  }
  return resp.json() as Promise<T>
}

export async function authedPatch<T = unknown>(
  page: Page,
  path: string,
  body: unknown,
): Promise<T> {
  const token = await getAccessToken(page)
  const resp = await page.request.patch(API_BASE + path, {
    headers: { Authorization: `Bearer ${token ?? ''}`, 'Content-Type': 'application/json' },
    data: body,
  })
  if (!resp.ok()) {
    throw new Error(`PATCH ${path} failed: ${resp.status()} ${await resp.text()}`)
  }
  return resp.json() as Promise<T>
}

export async function authedDelete(page: Page, path: string): Promise<void> {
  const token = await getAccessToken(page)
  const resp = await page.request.delete(API_BASE + path, {
    headers: { Authorization: `Bearer ${token ?? ''}` },
  })
  if (!resp.ok() && resp.status() !== 204) {
    throw new Error(`DELETE ${path} failed: ${resp.status()} ${await resp.text()}`)
  }
}

export interface ApiDocument {
  id: string
  owner_id: string
  folder_id: string | null
  title: string
  body_md: string
  excerpt: string | null
  word_count: number
  character_count: number
  reading_time: number
  status: 'draft' | 'published'
  pinned: boolean
  tags_json: unknown
  trashed_at: string | null
  created_at: string
  updated_at: string
}

export interface ApiFolder {
  id: string
  owner_id: string
  parent_id: string | null
  name: string
  created_at: string
  updated_at: string
}

export interface ApiVersion {
  id: string
  document_id: string
  version_number: number
  body_md: string
  snapshot_size: number
  created_at: string
}

export async function createDocument(
  page: Page,
  overrides: Partial<{ title: string; body_md: string; folder_id: string | null }> = {},
): Promise<ApiDocument> {
  return authedPost<ApiDocument>(page, '/documents', {
    title: overrides.title ?? `Doc ${Date.now()}`,
    body_md: overrides.body_md ?? '',
    folder_id: overrides.folder_id ?? null,
  })
}

export async function createFolder(page: Page, name = `Folder ${Date.now()}`): Promise<ApiFolder> {
  return authedPost<ApiFolder>(page, '/folders', { name })
}

export async function listDocuments(page: Page): Promise<ApiDocument[]> {
  return authedGet<ApiDocument[]>(page, '/documents')
}

export async function readDocument(page: Page, id: string): Promise<ApiDocument> {
  return authedGet<ApiDocument>(page, `/documents/${id}`)
}

export async function listFolders(page: Page): Promise<ApiFolder[]> {
  return authedGet<ApiFolder[]>(page, '/folders')
}

export async function listVersions(page: Page, docId: string): Promise<ApiVersion[]> {
  return authedGet<ApiVersion[]>(page, `/documents/${docId}/versions`)
}

/** Re-export expect so specs can `import { test, expect } from '@molecule/app-e2e-fixtures-default'` */
export { expect }
