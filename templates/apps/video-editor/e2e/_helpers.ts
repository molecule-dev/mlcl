// Shared test helpers for the video-editor Playwright suite.
//
// Signup form has First/Last name + email + password + confirm-password fields.
// Login form has email + password. After successful auth the AuthGuard redirects
// to /dashboard.

import { Page, expect, type APIRequestContext } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3200')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4200') + '/api'

let counter = 0
export function uniqueEmail(prefix = 've'): string {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

/**
 * Sign up a fresh user via the Signup form. Lands on /dashboard.
 */
export async function signup(
  page: Page,
  email = uniqueEmail(),
  password = 'TestPass123!',
): Promise<{ email: string; password: string }> {
  await page.goto(APP_BASE + '/signup')
  await page.locator('#first-name').fill('Test')
  await page.locator('#last-name').fill('User')
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page.locator('#confirm-password').fill(password)
  const submit = page.locator('[data-mol-id="signup-submit"]')
  await expect(submit).toBeEnabled({ timeout: 10000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 30000 })
  return { email, password }
}

/**
 * Log in an existing user. Lands on /dashboard or whichever protected page
 * AuthGuard redirected from.
 */
export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto(APP_BASE + '/login')
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  const submit = page.locator('[data-mol-id="login-submit"]')
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
  if (!token) throw new Error('No accessToken in cookie — call signup() first')
  const segments = String(token).split('.')
  if (segments.length < 2) throw new Error('Token is not a JWT: ' + String(token).slice(0, 40))
  const payload = JSON.parse(Buffer.from(segments[1], 'base64').toString('utf8'))
  if (!payload.userId) throw new Error('JWT has no userId field: ' + JSON.stringify(payload))
  return payload.userId as string
}

function unwrapEnvelope<T>(parsed: unknown): T {
  if (
    parsed !== null &&
    typeof parsed === 'object' &&
    !Array.isArray(parsed) &&
    'data' in parsed &&
    Object.keys(parsed as object).length <= 4
  ) {
    const inner = (parsed as { data: unknown }).data
    if (inner !== undefined) return inner as T
  }
  return parsed as T
}

export async function api<T = unknown>(
  page: Page,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  data?: unknown,
): Promise<T> {
  const cookies = await page.context().cookies()
  const cookieStr = cookies.map((c) => `${c.name}=${c.value}`).join('; ')
  const token = await getAccessToken(page)
  const headers: Record<string, string> = {}
  if (cookieStr) headers['Cookie'] = cookieStr
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
  const cookies = await page.context().cookies()
  const cookieStr = cookies.map((c) => `${c.name}=${c.value}`).join('; ')
  const token = await getAccessToken(page)
  const headers: Record<string, string> = {}
  if (cookieStr) headers['Cookie'] = cookieStr
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

export async function rawRequest<T = unknown>(
  request: APIRequestContext,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  bearer?: string,
  data?: unknown,
): Promise<{ status: number; body: T | string | null }> {
  const headers: Record<string, string> = {}
  if (bearer) headers['Authorization'] = `Bearer ${bearer}`
  if (data !== undefined) headers['Content-Type'] = 'application/json'
  const url = path.startsWith('http')
    ? path
    : `${API_BASE.replace(/\/$/, '')}/${path.replace(/^\/?(api\/)?/, '')}`
  const resp = await request.fetch(url, {
    method,
    headers,
    data: data === undefined ? undefined : JSON.stringify(data),
  })
  const status = resp.status()
  if (status === 204) return { status, body: null }
  const text = await resp.text()
  try {
    return { status, body: JSON.parse(text) as T }
  } catch {
    return { status, body: text }
  }
}

/**
 * Convenience: signup, then create a project + a default video track.
 * Returns the project shape the API returned so the test can navigate to it.
 */
export async function signupWithProject(
  page: Page,
  name = `Test Project ${Date.now()}`,
): Promise<{
  email: string
  password: string
  project: { id: string; name: string; width: number; height: number; fps: number }
}> {
  const creds = await signup(page)
  const project = await api<{
    id: string
    name: string
    width: number
    height: number
    fps: number
  }>(page, 'POST', '/projects', { name, width: 1920, height: 1080, fps: 30 })
  await api(page, 'POST', '/timeline/tracks', {
    project_id: project.id,
    name: 'Video',
    type: 'video',
    position: 0,
  })
  return { email: creds.email, password: creds.password, project }
}
