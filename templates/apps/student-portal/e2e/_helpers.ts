// Shared Playwright helpers for the student-portal e2e suite.

import { Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3000')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'student-portal') {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

/**
 * Sign up a fresh user via the signup form.
 *
 * Hardened against an auth-race: arm POST /api/users response listener
 * BEFORE clicking submit, assert 2xx, wait for navigation off /signup,
 * then poll localStorage until the access token actually lands. Without
 * these gates the auth-state hook (which persists the token) could still
 * be pending when a follow-up `api(page, ...)` call read localStorage →
 * 401 flakes.
 */
export async function signup(page: Page, email = uniqueEmail(), password = 'TestPass123!') {
  await page.goto(APP_BASE + '/signup')
  await page.locator('input#signup-first').fill('Riley')
  await page.locator('input#signup-last').fill('Carter')
  await page.locator('input#signup-email').fill(email)
  await page.locator('input#signup-password').fill(password)
  const submit = page.getByRole('button', { name: /create account|creating/i }).first()
  await expect(submit).toBeEnabled({ timeout: 10000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 30000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
  return { email, password }
}

/** Same hardening as signup(). */
export async function login(page: Page, email: string, password: string) {
  await page.goto(APP_BASE + '/login')
  await page.locator('input[type=email], input#login-email').first().fill(email)
  await page.locator('input[type=password], input#login-password').first().fill(password)
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
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
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

export async function getMyUserId(page: Page): Promise<string> {
  const token = await getAccessToken(page)
  if (!token) throw new Error('No accessToken in localStorage — call signup() first')
  const segments = token.split('.')
  if (segments.length < 2) throw new Error('Token is not a JWT')
  const payload = JSON.parse(Buffer.from(segments[1], 'base64').toString('utf8'))
  const userId = payload.userId ?? payload.sub ?? payload.user_id
  if (!userId) throw new Error('JWT missing userId: ' + JSON.stringify(payload))
  return userId as string
}

/**
 * Issue an authenticated request through the page's session. Used to
 * read-after-write the backend without going through the UI.
 */
export async function api<T = unknown>(
  page: Page,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  data?: unknown,
): Promise<T> {
  const token = await getAccessToken(page)
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (data !== undefined) headers['Content-Type'] = 'application/json'
  const url = path.startsWith('http')
    ? path
    : `${API_BASE.replace(/\/$/, '')}/${path.replace(/^\/?(api\/)?/, '')}`
  const resp = await page.request.fetch(url, {
    method,
    headers,
    data: data === undefined ? undefined : JSON.stringify(data),
  })
  expect(resp.status(), `${method} ${path} → ${resp.status()}`).toBeLessThan(400)
  if (resp.status() === 204) return undefined as T
  const text = await resp.text()
  try {
    return JSON.parse(text) as T
  } catch {
    return text as T
  }
}

export async function apiRaw(
  page: Page,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  data?: unknown,
) {
  const token = await getAccessToken(page)
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (data !== undefined) headers['Content-Type'] = 'application/json'
  const url = path.startsWith('http')
    ? path
    : `${API_BASE.replace(/\/$/, '')}/${path.replace(/^\/?(api\/)?/, '')}`
  return page.request.fetch(url, {
    method,
    headers,
    data: data === undefined ? undefined : JSON.stringify(data),
  })
}

interface CourseRow {
  course_name?: string | null
}

/**
 * The distinct course names the API actually serves for `path`.
 *
 * Specs read the names they assert on out of the API instead of naming a
 * seeded course — the demo roster is the first thing an app's owner replaces,
 * and a spec that names one fails on a correct app.
 */
export async function courseNames(page: Page, path: string): Promise<string[]> {
  const rows = await api<CourseRow[]>(page, 'GET', path)
  const names: string[] = []
  for (const row of rows) {
    const name = row.course_name?.trim()
    if (name && !names.includes(name)) names.push(name)
  }
  return names
}

export interface InboxThread {
  id: string
  user_id: string
  thread_id?: string | null
  sender_name?: string | null
  unread: number
}

/** An unread inbox thread the API actually holds — see courseNames() for why. */
export async function pickUnreadThread(
  page: Page,
): Promise<InboxThread & { thread_id: string; sender_name: string }> {
  const threads = await api<InboxThread[]>(page, 'GET', '/messages/threads')
  const found = threads.find((t) => t.unread > 0 && t.thread_id && t.sender_name)
  if (!found) throw new Error('inbox has no unread thread with a sender name')
  return found as InboxThread & { thread_id: string; sender_name: string }
}

export async function captureNetwork(page: Page, fn: () => Promise<void>) {
  const reqs: { method: string; url: string; status: number; postData?: string | null }[] = []
  const onResp = async (resp: import('@playwright/test').Response) => {
    let postData: string | null = null
    try {
      postData = resp.request().postData()
    } catch {}
    reqs.push({
      method: resp.request().method(),
      url: resp.url(),
      status: resp.status(),
      postData,
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
  const fatal = errs.filter(
    (e) => !/favicon|net::ERR_|Failed to load resource|i18n key not found/.test(e),
  )
  expect(fatal, 'console errors during interaction').toEqual([])
}
