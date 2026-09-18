/**
 * e2e helpers for ai-voice-assistant (Vox).
 *
 * Auth via the public signup form (POST /api/users) so each test gets
 * a fresh isolated user. Voice features back onto OpenAI (Whisper) for
 * transcription and ElevenLabs/OpenAI for synthesis; chat backs onto
 * Anthropic. All upstreams are real — keys come from the smoke env.
 */
import type { Page } from '@molecule/app-e2e-fixtures-default'
import { expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3200')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4200') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'vox'): string {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

export interface Credentials {
  email: string
  password: string
  name: string
}

/** Signup writes a fresh row in `users`; the auth bond redirects to the
 *  conversation surface once the access token comes back. */
export async function signup(page: Page, opts: Partial<Credentials> = {}): Promise<Credentials> {
  const email = opts.email ?? uniqueEmail()
  const password = opts.password ?? 'TestPass1234!'
  const name = opts.name ?? 'Vox Tester'
  await page.goto(APP_BASE + '/signup')
  // Wait for the form to mount before the optional-field probes below.
  // count() is a one-shot read with no auto-waiting, so after a goto it can
  // run against a still-empty React root, return 0, and SILENTLY SKIP the
  // fill — the form then won't submit and every spec in the app dies on a
  // signup timeout. That is exactly how restaurant-ordering lost all 78.
  await page.locator('input').first().waitFor({ state: 'visible', timeout: 15000 })
  // Name field comes first. The molecule auth bond renders <input> with
  // no `type` attribute on text fields, so a `[type=text]` query misses
  // it — we anchor on the visible placeholder ("e.g. ...") instead.
  const nameInput = page.locator('input[placeholder*="e.g."]').first()
  if ((await nameInput.count().catch(() => 0)) > 0) {
    await nameInput.fill(name)
  } else {
    // Fallback: first untyped input (no type attribute) is the name field.
    const candidate = page.locator('input:not([type])').first()
    if ((await candidate.count().catch(() => 0)) > 0) {
      await candidate.fill(name)
    }
  }
  await page.locator('input[type="email"]').fill(email)
  // The "Confirm password" field is a second password input; fill both.
  const passwordInputs = page.locator('input[type="password"]')
  const pcount = await passwordInputs.count()
  await passwordInputs.nth(0).fill(password)
  if (pcount > 1) await passwordInputs.nth(1).fill(password)
  // Hardened against an auth-race: arm the POST /api/users listener
  // BEFORE clicking submit, assert it returned 2xx, then wait for the
  // navigation away from /signup, then poll for the persisted access
  // token. The auth-state hook runs in a microtask after the POST
  // resolves; without these gates fast follow-up `api(page, ...)` calls
  // could read localStorage before the token landed → 401 flakes.
  const submit = page
    .getByRole('button', { name: /create.*account|sign.*up|get.*started|start/i })
    .first()
  await expect(submit).toBeEnabled({ timeout: 10000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 30_000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
  return { email, password, name }
}

/** Login an existing user via the public form. Same hardening as signup(). */
export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto(APP_BASE + '/login')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  const submit = page.getByRole('button', { name: /sign in|log in/i }).first()
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
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
}

/** Capture network responses during a block. */
export async function captureNetwork(
  page: Page,
  fn: () => Promise<void>,
): Promise<Array<{ method: string; url: string; status: number; postData: string | null }>> {
  const reqs: Array<{ method: string; url: string; status: number; postData: string | null }> = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onResp = (resp: any) => {
    reqs.push({
      method: resp.request().method(),
      url: resp.url(),
      status: resp.status(),
      postData: resp.request().postData() ?? null,
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

/** Decode the userId from a JWT (the `userId` claim our auth bond
 *  signs). No verification — this is a test-only helper. */
function decodeJwtUserId(token: string): string {
  const parts = token.split('.')
  if (parts.length < 2) return ''
  try {
    const payload = parts[1] ?? ''
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4)
    const b64 = padded.replace(/-/g, '+').replace(/_/g, '/')
    const raw = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('utf8')
    const decoded = JSON.parse(raw) as Record<string, unknown>
    const id = (decoded.userId ?? decoded.sub ?? decoded.id) as unknown
    return typeof id === 'string' ? id : ''
  } catch {
    return ''
  }
}

/** Resolve the active user's id by decoding the persisted access token. */
export async function getUserId(page: Page): Promise<string> {
  const token = await getAccessToken(page)
  return decodeJwtUserId(token ?? '')
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

/** Authenticated API request from a logged-in page context. */
export async function apiGet<T>(page: Page, path: string): Promise<T> {
  const token = await getAccessToken(page)
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
  const res = await page.request.get(API_BASE + path, { headers })
  expect(res.status(), `GET ${path} should be 2xx`).toBeLessThan(400)
  return (await res.json()) as T
}

export async function apiPost<T>(page: Page, path: string, body: unknown): Promise<T> {
  const token = await getAccessToken(page)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
  const res = await page.request.post(API_BASE + path, {
    headers,
    data: JSON.stringify(body),
  })
  expect(res.status(), `POST ${path} should be 2xx`).toBeLessThan(400)
  return (await res.json()) as T
}

export async function apiPatch<T>(page: Page, path: string, body: unknown): Promise<T> {
  const token = await getAccessToken(page)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
  const res = await page.request.patch(API_BASE + path, {
    headers,
    data: JSON.stringify(body),
  })
  expect(res.status(), `PATCH ${path} should be 2xx`).toBeLessThan(400)
  return (await res.json()) as T
}

/** Find or create a conversation belonging to the active session. */
export async function ensureConversation(page: Page): Promise<{ id: string; title: string }> {
  const list = await apiGet<Array<{ id: string; title: string }>>(page, '/conversations')
  if (Array.isArray(list) && list.length > 0 && list[0]) return list[0]
  return await apiPost<{ id: string; title: string }>(page, '/conversations', {
    title: 'Test conversation',
  })
}

/** Post a text user message into a conversation; returns the assistant
 *  message the conversations handler creates via the AI bond. */
export async function postTextMessage(
  page: Page,
  conversationId: string,
  content: string,
): Promise<{ assistantMessage: { id: string; content: string } }> {
  return await apiPost(page, `/conversations/${conversationId}/messages`, {
    content,
    type: 'text',
  })
}
