// e2e helpers for secrets-manager.
//
// Auth via the public signup form (POST /api/users) so each test gets a
// fresh isolated user. Workspace-scoped vault/secret data is created by
// the test that needs it via apiFetch() — there is no implicit seed.

import { type Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3270')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4270') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'arcanum'): string {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

export interface Credentials {
  email: string
  password: string
}

/** Sign up via the UI; returns the credentials. App lands on /vaults.
 *
 *  Hardening: arm POST listener BEFORE click + assert <400, then nav,
 *  then waitForFunction-token (existing). Pre-arming the listener
 *  eliminates the race where the POST returns before waitForResponse
 *  can attach. See virtual-classroom/_helpers.ts. */
export async function signup(page: Page, opts: Partial<Credentials> = {}): Promise<Credentials> {
  const email = opts.email ?? uniqueEmail()
  const password = opts.password ?? 'TestPass1234!'
  await page.goto(APP_BASE + '/signup')
  await page.locator('#signup-email').fill(email)
  await page.locator('#signup-password').fill(password)
  const submit = page.getByRole('button', { name: /create account/i })
  await expect(submit).toBeEnabled({ timeout: 10_000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30_000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 15_000 })
  // Wait for the httpOnly auth cookie to land before any test code runs
  // authenticated requests.
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10_000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
  return { email, password }
}

/** Login via the UI. Same auth-race hardening as signup(). */
export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto(APP_BASE + '/login')
  await page.locator('#login-email').fill(email)
  await page.locator('#login-password').fill(password)
  const submit = page.getByRole('button', { name: /unlock vault/i })
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

/** Capture network responses during a block. */
export async function captureNetwork(
  page: Page,
  fn: () => Promise<void>,
): Promise<Array<{ method: string; url: string; status: number }>> {
  const reqs: Array<{ method: string; url: string; status: number }> = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onResp = (resp: any) => {
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

/** Read the JWT bearer token from the httpOnly cookie set by the auth client. */
export async function getAccessToken(page: Page): Promise<string | null> {
  // [M1-1] The bearer token is held in memory (a localStorage copy is
  // XSS-exfiltratable); the persistent credential is the httpOnly `token`
  // cookie (prod: `__Host-token`), readable in tests via the Playwright
  // context. Its value IS the JWT.
  const cookies = await page.context().cookies()
  const tok = cookies.find((c) => /(^|[-_])token$/i.test(c.name) && c.value)
  return tok?.value ?? null
}

/** Issue an API call with a stored auth bearer token. */
export async function apiFetch(
  page: Page,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; json: unknown }> {
  const token = await getAccessToken(page)
  const url = path.startsWith('http') ? path : API_BASE + path
  const opts: Parameters<Page['request']['fetch']>[1] = {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  }
  if (body !== undefined) opts.data = body as Record<string, unknown>
  const resp = await page.request.fetch(url, opts)
  let json: unknown = null
  try {
    json = await resp.json()
  } catch {
    /* not json */
  }
  return { status: resp.status(), json }
}

/** Convenience: create a vault for the signed-in user via the API. */
export async function createVault(
  page: Page,
  name = 'acme-prod',
  environment: 'production' | 'staging' | 'development' | 'test' = 'production',
): Promise<{ id: string }> {
  const res = await apiFetch(page, 'POST', '/vaults', { name, environment })
  expect(res.status, `vault create: ${JSON.stringify(res.json)}`).toBe(201)
  return res.json as { id: string }
}

/** Convenience: create a secret in a vault for the signed-in user. */
export async function createSecret(
  page: Page,
  vaultId: string,
  name = 'DB_PASSWORD',
  value = 'super-secret-123',
): Promise<{ id: string }> {
  const res = await apiFetch(page, 'POST', '/secrets', {
    vault_id: vaultId,
    name,
    key: name,
    value,
    kind: 'db-credential',
    environment: 'production',
  })
  expect(res.status, `secret create: ${JSON.stringify(res.json)}`).toBe(201)
  return res.json as { id: string }
}
