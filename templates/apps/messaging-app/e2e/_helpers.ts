// Auto-generated boilerplate. Add helpers here as needed; do not delete
// these. Every spec file should import from this module rather than
// rewriting auth/network plumbing per-test.

import { Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3000')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'test') {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

/** Sign up a fresh user; returns the credentials. Hush expects an
 *  optional name field; we always provide one for deterministic
 *  display-name and avatar-initial assertions. */
export async function signup(
  page: Page,
  email = uniqueEmail(),
  password = 'TestPass123!',
  name = 'Hush Tester',
) {
  await page.goto(APP_BASE + '/signup')
  // Wait for the form to mount before the optional-field probes below.
  // count() is a one-shot read with no auto-waiting, so after a goto it can
  // run against a still-empty React root, return 0, and SILENTLY SKIP the
  // fill — the form then won't submit and every spec in the app dies on a
  // signup timeout. That is exactly how restaurant-ordering lost all 78.
  await page.locator('input').first().waitFor({ state: 'visible', timeout: 15000 })
  const nameField = page.getByLabel(/^name$/i).first()
  if (await nameField.count().catch(() => 0)) await nameField.fill(name)
  await page.getByLabel(/email/i).first().fill(email)
  await page
    .getByLabel(/^password$/i)
    .first()
    .fill(password)
  const confirm = page.getByLabel(/confirm.*password|password.*confirm/i).first()
  if (await confirm.count().catch(() => 0)) await confirm.fill(password)
  const terms = page.getByRole('checkbox', { name: /terms|agree/i }).first()
  if (await terms.count().catch(() => 0)) await terms.check()
  const submit = page
    .getByRole('button', { name: /sign\s*up|create.*account|register|get\s*started/i })
    .first()
  await expect(submit).toBeEnabled({ timeout: 10000 })
  // Arm POST listener BEFORE click so a fast response can't be missed.
  // Mirrors virtual-classroom hardening (b296e327d).
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 20000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
  return { email, password, name }
}

export async function login(page: Page, email: string, password: string) {
  await page.goto(APP_BASE + '/login')
  await page.getByLabel(/email/i).first().fill(email)
  await page
    .getByLabel(/^password$/i)
    .first()
    .fill(password)
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

export async function logout(page: Page) {
  const menu = page.getByRole('button', { name: /account|menu|profile|user/i }).first()
  if (await menu.count().catch(() => 0)) await menu.click()
  const out = page.getByRole('button', { name: /sign\s*out|log\s*out/i }).first()
  if (await out.count().catch(() => 0)) await out.click()
}

/** Capture all network responses during a block; mocked-only tests will
 *  return empty. Useful for asserting the app actually called the API. */
export async function captureNetwork(page: Page, fn: () => Promise<void>) {
  const reqs: { method: string; url: string; status: number }[] = []
  const onResp = (resp: { request(): { method(): string }; url(): string; status(): number }) => {
    reqs.push({ method: resp.request().method(), url: resp.url(), status: resp.status() })
  }
  page.on('response', onResp as never)
  try {
    await fn()
  } finally {
    page.off('response', onResp as never)
  }
  return reqs
}

// ---------- roster pickers ----------
//
// Specs read the contact / conversation / group / notification they drive
// out of the API instead of naming one. The demo roster is the first thing
// an app's owner replaces, and a spec that names a seeded row fails on a
// correct app.

/** A contact row in the shape `GET /api/contacts` returns. */
export interface ContactRow {
  id: string
  contact_user_id: string
  name: string
  initials: string
}

/** A conversation row in the shape `GET /api/conversations` returns. */
export interface ConversationRow {
  id: string
  type: 'direct' | 'group'
  name: string
}

/** A group row in the shape `GET /api/groups` returns. */
export interface GroupRow {
  id: string
  name: string
}

/** A notification in the shape `GET /api/notifications` returns. */
export interface NotificationRow {
  id: string
  title: string
  body: string
}

/** A message in the shape `GET /api/messages?conversation_id=` returns. */
export interface MessageRow {
  id: string
  body: string
  self: boolean
}

async function apiList<T>(page: Page, path: string): Promise<T[]> {
  const resp = await page.request.get(API_BASE + path)
  if (resp.status() !== 200) {
    throw new Error(`GET /api${path} failed: ${resp.status()} ${await resp.text()}`)
  }
  return (await resp.json()) as T[]
}

/** Every contact the signed-in user actually has. */
export async function getContacts(page: Page): Promise<ContactRow[]> {
  return apiList<ContactRow>(page, '/contacts')
}

/** One contact from the signed-in user's roster. */
export async function pickContact(page: Page): Promise<ContactRow> {
  const contacts = await getContacts(page)
  const first = contacts[0]
  if (!first) throw new Error('the signed-in user has no contacts')
  return first
}

/** A direct conversation from the inbox — the row the inbox specs click. */
export async function pickDirectConversation(page: Page): Promise<ConversationRow> {
  const conversations = await apiList<ConversationRow>(page, '/conversations')
  const direct = conversations.find((c) => c.type === 'direct')
  if (!direct) throw new Error('the inbox holds no direct conversation')
  return direct
}

/** The most recent message in a conversation, as the thread renders it. */
export async function pickLatestMessage(page: Page, conversationId: string): Promise<MessageRow> {
  const messages = await apiList<MessageRow>(
    page,
    '/messages?conversation_id=' + encodeURIComponent(conversationId),
  )
  const last = messages[messages.length - 1] ?? messages[0]
  if (!last) throw new Error('conversation has no messages')
  return last
}

/** One group the signed-in user belongs to. */
export async function pickGroup(page: Page): Promise<GroupRow> {
  const groups = await apiList<GroupRow>(page, '/groups')
  const first = groups[0]
  if (!first) throw new Error('the signed-in user belongs to no group')
  return first
}

/** The newest notification in the signed-in user's feed. */
export async function pickNotification(page: Page): Promise<NotificationRow> {
  // GET /api/notifications does not itself trigger the first-touch seed —
  // the conversations endpoint does — so touch that first.
  await apiList(page, '/conversations')
  const notifications = await apiList<NotificationRow>(page, '/notifications')
  const first = notifications[0]
  if (!first) throw new Error('the signed-in user has no notifications')
  return first
}

/** Fail the test if any console.error fires during fn (allowing benign
 *  third-party noise like favicon 404s and races with navigation). */
export async function expectNoConsoleErrors(page: Page, fn: () => Promise<void>) {
  const errs: string[] = []
  const handler = (msg: { type(): string; text(): string }) => {
    if (msg.type() === 'error') errs.push(msg.text())
  }
  page.on('console', handler as never)
  try {
    await fn()
  } finally {
    page.off('console', handler as never)
  }
  const fatal = errs.filter(
    (e) =>
      !/favicon|net::ERR_|Failed to load resource/i.test(e) &&
      !/Failed to fetch/i.test(e) &&
      !/TypeError: Load failed/i.test(e),
  )
  expect(fatal, 'console errors during interaction').toEqual([])
}
