// Shared test helpers for the whiteboard Playwright suite.
//
// Auth: Signup form has firstName, lastName, email, password, confirmPassword.
// After signup the app lands on /boards.

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
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3160')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4160') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'wb'): string {
  return `${prefix}+${Date.now()}-${++counter}@flagship.test`
}

export interface SignupResult {
  email: string
  password: string
  firstName: string
  lastName: string
  accessToken: string
  userId: string | null
}

export async function signup(
  page: Page,
  email = uniqueEmail(),
  password = 'TestPass!1234',
  firstName = 'Wally',
  lastName = 'Board',
): Promise<SignupResult> {
  await page.goto(APP_BASE + '/signup')
  await page.locator('input[autocomplete="given-name"]').fill(firstName)
  await page.locator('input[autocomplete="family-name"]').fill(lastName)
  await page.locator('input[type="email"]').fill(email)
  const pw = page.locator('input[autocomplete="new-password"]')
  await pw.nth(0).fill(password)
  await pw.nth(1).fill(password)
  const submit = page.locator('form button[type="submit"]').first()
  await expect(submit).toBeEnabled({ timeout: 10_000 })
  // Hardening: arm POST listener BEFORE click + poll for token AFTER nav.
  // See virtual-classroom/_helpers.ts for the auth-race rationale.
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30_000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).toHaveURL(/\/boards/, { timeout: 20_000 })
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
  return { email, password, firstName, lastName, accessToken: accessToken as string, userId }
}

export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto(APP_BASE + '/login')
  await page.locator('input[type="email"]').first().fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  const submit = page.locator('form button[type="submit"]').first()
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

export async function logout(page: Page): Promise<void> {
  // UserMenu: trigger button → "Sign out" item.
  const trigger = page
    .locator('[data-mol-id="user-menu-trigger"], button:has-text("Sign out")')
    .first()
  if (await trigger.count().catch(() => 0)) {
    await trigger.click().catch(() => undefined)
  }
  const out = page.getByRole('button', { name: /sign\s*out|log\s*out/i }).first()
  if (await out.count().catch(() => 0)) {
    await out.click().catch(() => undefined)
  }
}

export function apiHeaders(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
}

/**
 * Capture all network responses during `fn`. Useful for asserting that the
 * UI actually fired the API call we expect.
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

function unwrapEnvelope<T>(parsed: unknown): T {
  if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
    const obj = parsed as Record<string, unknown>
    if ('props' in obj && obj.props !== null && typeof obj.props === 'object') {
      return obj.props as T
    }
    if ('data' in obj && obj.data !== undefined && Object.keys(obj).length <= 4) {
      return obj.data as T
    }
  }
  return parsed as T
}

export async function api<T = unknown>(
  page: Page,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  data?: unknown,
): Promise<T> {
  const token = await getAccessToken(page).catch(() => null)
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const url = path.startsWith('http')
    ? path
    : `${API_BASE.replace(/\/$/, '')}/${path.replace(/^\/?(api\/)?/, '')}`
  const resp = await page.request.fetch(url, {
    method,
    headers,
    data: data === undefined ? undefined : JSON.stringify(data),
  })
  expect(resp.status(), `${method} ${path}`).toBeLessThan(400)
  if (resp.status() === 204) return undefined as T
  const text = await resp.text()
  try {
    return unwrapEnvelope<T>(JSON.parse(text))
  } catch {
    return text as T
  }
}

export async function rawApi(
  page: Page,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  data?: unknown,
): Promise<{ status: number; body: unknown }> {
  const token = await getAccessToken(page).catch(() => null)
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const url = path.startsWith('http')
    ? path
    : `${API_BASE.replace(/\/$/, '')}/${path.replace(/^\/?(api\/)?/, '')}`
  const resp = await page.request.fetch(url, {
    method,
    headers,
    data: data === undefined ? undefined : JSON.stringify(data),
  })
  const status = resp.status()
  if (status === 204) return { status, body: null }
  const text = await resp.text()
  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    body = text
  }
  return { status, body }
}

export interface SeededBoard {
  id: string
  title: string
  description?: string
  background?: string
  is_public?: boolean
}

export async function seedBoard(
  page: Page,
  overrides: Partial<{ title: string; description: string; is_public: boolean }> = {},
): Promise<SeededBoard> {
  return api<SeededBoard>(page, 'POST', '/boards', {
    title: overrides.title ?? `E2E Board ${Date.now()}-${++counter}`,
    description: overrides.description ?? 'seeded',
    is_public: overrides.is_public ?? false,
  })
}

export interface SeededElement {
  id: string
  board_id: string
  type: string
}

export async function seedElement(
  page: Page,
  args: {
    board_id: string
    type?: string
    x?: number
    y?: number
    width?: number
    height?: number
    content?: Record<string, unknown>
  },
): Promise<SeededElement> {
  return api<SeededElement>(page, 'POST', `/elements/${args.board_id}`, {
    type: args.type ?? 'sticky',
    x: args.x ?? 100,
    y: args.y ?? 100,
    width: args.width ?? 200,
    height: args.height ?? 200,
    content: args.content ?? { text: 'seed', color: '#fef08a' },
  })
}

export interface SeededCollaborator {
  id: string
  board_id: string
  email?: string
  role?: string
  status?: string
}

export async function seedCollaborator(
  page: Page,
  args: { board_id: string; email: string; role?: 'viewer' | 'commenter' | 'editor' },
): Promise<SeededCollaborator> {
  return api<SeededCollaborator>(page, 'POST', `/collaborators/${args.board_id}`, {
    email: args.email,
    role: args.role ?? 'editor',
  })
}

export interface SeededTemplate {
  id: string
  name: string
  description?: string
  is_system?: boolean
}

export async function seedTemplate(
  page: Page,
  overrides: Partial<{ name: string; description: string; snapshot: { elements: unknown[] } }> = {},
): Promise<SeededTemplate> {
  return api<SeededTemplate>(page, 'POST', '/templates', {
    name: overrides.name ?? `E2E Template ${Date.now()}-${++counter}`,
    description: overrides.description ?? 'seeded',
    snapshot: overrides.snapshot ?? {
      elements: [
        {
          type: 'sticky',
          x: 0,
          y: 0,
          width: 200,
          height: 100,
          content: { text: 'seed' },
        },
      ],
    },
  })
}

export interface SeededFrame {
  id: string
  board_id: string
  name?: string
}

export async function seedFrame(
  page: Page,
  args: {
    board_id: string
    name?: string
    viewport?: Record<string, unknown>
    order_index?: number
  },
): Promise<SeededFrame> {
  return api<SeededFrame>(page, 'POST', `/frames/${args.board_id}`, {
    name: args.name ?? `Frame ${Date.now()}-${++counter}`,
    viewport: args.viewport ?? { body: 'seed' },
    order_index: args.order_index ?? 0,
  })
}

export interface SeededVersion {
  id: string
  board_id: string
  change_summary?: string
}

export async function seedVersion(
  page: Page,
  args: { board_id: string; change_summary?: string; snapshot?: Record<string, unknown> },
): Promise<SeededVersion> {
  return api<SeededVersion>(page, 'POST', `/versions/${args.board_id}`, {
    snapshot: args.snapshot ?? { elements: [] },
    change_summary: args.change_summary ?? 'snapshot',
  })
}
