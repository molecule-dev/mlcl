// Shared test plumbing for payroll-manager e2e specs. Every spec
// imports auth/network/api helpers from here so the signup, login,
// and bearer-token threading stays consistent.

import { createHmac } from 'node:crypto'

import { Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3100')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4100') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'payroll') {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

/** Sign up a fresh user via the UI form. After submit the app
 *  navigates to /dashboard and the http client owns the access token.
 *
 *  Hardened against an auth-race: arm POST /api/users response listener
 *  BEFORE clicking submit, assert 2xx, then wait for navigation off
 *  /signup. Without these gates the auth-state hook (which persists the
 *  session) could still be pending when a follow-up API call read it →
 *  401 flakes. */
export async function signup(page: Page, email = uniqueEmail(), password = 'TestPass123!') {
  await page.goto(APP_BASE + '/signup')
  await page.locator('input#firstName').fill('Test')
  await page.locator('input#lastName').fill('User')
  await page.locator('input#email').fill(email)
  await page.locator('input#password').fill(password)
  await page.locator('input#confirmPassword').fill(password)
  const submit = page.getByRole('button', { name: /create account/i })
  await expect(submit).toBeEnabled({ timeout: 10000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 15_000 })
  return { email, password }
}

export async function login(page: Page, email: string, password: string) {
  await page.goto(APP_BASE + '/login')
  await page.locator('input[type="email"], input#email').first().fill(email)
  await page.locator('input[type="password"], input#password').first().fill(password)
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
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 })
}

/** Sign up via UI then immediately POST /users/log-in to retrieve the
 *  same bearer token, so subsequent ctx.request calls are auth'd
 *  outside the page's http client. */
export async function signupAndToken(page: Page): Promise<{
  email: string
  password: string
  token: string
  user: { id: string; email: string }
}> {
  const creds = await signup(page)
  const resp = await page.context().request.post(API_BASE + '/users/log-in', {
    data: { email: creds.email, password: creds.password },
  })
  if (!resp.ok()) throw new Error('login after signup failed: ' + resp.status())
  // The legacy auth endpoint returns `{ props: {id, email, ...}, accessToken }`.
  // Accept both that shape and the newer `{ user, accessToken }` envelope so
  // the helper keeps working when the auth bond is upgraded.
  const body = (await resp.json()) as {
    accessToken?: string
    user?: { id: string; email: string }
    props?: { id: string; email: string }
    data?: {
      accessToken?: string
      user?: { id: string; email: string }
      props?: { id: string; email: string }
    }
  }
  const token = body.accessToken ?? body.data?.accessToken
  const user = body.user ?? body.props ?? body.data?.user ?? body.data?.props
  if (!token) throw new Error('no accessToken in /users/log-in response')
  if (!user) throw new Error('no user/props in /users/log-in response')
  return { ...creds, token, user }
}

export async function logout(page: Page) {
  const menu = page.getByRole('button', { name: /account|menu|profile|user/i }).first()
  if (await menu.count().catch(() => 0)) await menu.click()
  const out = page.getByRole('button', { name: /sign\s*out|log\s*out/i }).first()
  if (await out.count().catch(() => 0)) await out.click()
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
  const onResp = (resp: import('@playwright/test').Response) => {
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

interface ApiResponse<T> {
  status: number
  body: T
}

export async function apiGet<T = unknown>(
  page: Page,
  token: string,
  path: string,
): Promise<ApiResponse<T>> {
  const resp = await page.context().request.get(API_BASE + path, {
    headers: { Authorization: 'Bearer ' + token },
  })
  return { status: resp.status(), body: (await resp.json()) as T }
}

export async function apiPost<T = unknown>(
  page: Page,
  token: string,
  path: string,
  data: unknown,
): Promise<ApiResponse<T>> {
  const resp = await page.context().request.post(API_BASE + path, {
    headers: { Authorization: 'Bearer ' + token },
    data,
  })
  return { status: resp.status(), body: (await resp.json()) as T }
}

export async function apiPut<T = unknown>(
  page: Page,
  token: string,
  path: string,
  data: unknown,
): Promise<ApiResponse<T>> {
  const resp = await page.context().request.put(API_BASE + path, {
    headers: { Authorization: 'Bearer ' + token },
    data,
  })
  return { status: resp.status(), body: (await resp.json()) as T }
}

export async function apiPatch<T = unknown>(
  page: Page,
  token: string,
  path: string,
  data: unknown,
): Promise<ApiResponse<T>> {
  const resp = await page.context().request.patch(API_BASE + path, {
    headers: { Authorization: 'Bearer ' + token },
    data,
  })
  return { status: resp.status(), body: (await resp.json()) as T }
}

export async function apiDelete<T = unknown>(
  page: Page,
  token: string,
  path: string,
): Promise<ApiResponse<T | null>> {
  const resp = await page.context().request.delete(API_BASE + path, {
    headers: { Authorization: 'Bearer ' + token },
  })
  let body: T | null = null
  try {
    body = (await resp.json()) as T
  } catch {
    body = null
  }
  return { status: resp.status(), body }
}

/** Decodes an RFC 4648 base32 string (the format authenticator secrets use).
 *  Padding and grouping whitespace are tolerated because setup responses and
 *  on-screen secrets are sometimes rendered in 4-char groups. */
function base32Decode(input: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const clean = input.replace(/\s+/g, '').replace(/=+$/, '').toUpperCase()
  let bits = 0
  let value = 0
  const bytes: number[] = []
  for (const char of clean) {
    const index = alphabet.indexOf(char)
    if (index === -1) throw new Error(`invalid base32 character: ${char}`)
    value = (value << 5) | index
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return Buffer.from(bytes)
}

/** Computes the current RFC 6238 TOTP code for a base32 secret, matching the
 *  server's defaults (HMAC-SHA1, 6 digits, 30-second step) as implemented by
 *  `@molecule/api-two-factor-otplib`.
 *
 *  This exists so e2e specs can complete a REAL two-factor enrollment instead
 *  of asserting on a boolean flag: `twoFactorEnabled` is deliberately NOT an
 *  updatable field on `PATCH /users/:id` (the update handler rejects it), so
 *  the only way 2FA can be turned on is by posting a valid code to
 *  `POST /users/:id/verify-two-factor`. No extra dependency needed — node's
 *  crypto is enough. */
export function totp(secret: string, atMs: number = Date.now()): string {
  const counter = Math.floor(atMs / 1000 / 30)
  const counterBuffer = Buffer.alloc(8)
  counterBuffer.writeUInt32BE(Math.floor(counter / 2 ** 32), 0)
  counterBuffer.writeUInt32BE(counter >>> 0, 4)
  const digest = createHmac('sha1', base32Decode(secret)).update(counterBuffer).digest()
  const offset = digest[digest.length - 1]! & 0x0f
  const binary =
    ((digest[offset]! & 0x7f) << 24) |
    ((digest[offset + 1]! & 0xff) << 16) |
    ((digest[offset + 2]! & 0xff) << 8) |
    (digest[offset + 3]! & 0xff)
  return String(binary % 1_000_000).padStart(6, '0')
}

/** Tolerate either a bare object or `{data: object}` envelope. */
export function unwrap<T>(body: unknown): T | null {
  if (!body) return null
  if (typeof body === 'object' && 'data' in (body as Record<string, unknown>)) {
    return (body as { data: T }).data
  }
  return body as T
}
