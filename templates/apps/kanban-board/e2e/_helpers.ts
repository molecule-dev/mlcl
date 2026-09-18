// E2E test helpers for the kanban-board (Driftboard) flagship.
// All specs share signup/login + small request helpers from here so
// every test starts from a fresh, isolated user.

import { Page, expect, APIResponse } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3000')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'driftboard') {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

export async function signup(page: Page, email = uniqueEmail(), password = 'TestPass123!') {
  const res = await page.request.post(`${API_BASE}/users`, {
    data: { email, password, name: 'Driftboard Tester' },
  })
  expect(res.status(), 'signup should return 201').toBe(201)
  const body = await res.json()
  if (!body.accessToken) {
    throw new Error('signup did not return accessToken: ' + JSON.stringify(body))
  }
  return {
    email,
    password,
    accessToken: body.accessToken as string,
    userId: body.user?.id as string,
  }
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

export async function signupViaUI(page: Page, email = uniqueEmail(), password = 'TestPass123!') {
  await page.goto(APP_BASE + '/signup')
  await page.getByLabel(/Full name/i).fill('Driftboard Tester')
  await page.getByLabel(/Work email/i).fill(email)
  await page.getByLabel(/Password/i).fill(password)
  // Deterministic gating: arm POST /api/users BEFORE the click (so a
  // fast response can't be missed), assert < 400, wait for nav off
  // /signup, then poll until the JWT lands in localStorage. Specs that
  // chain page.request.* immediately after signupViaUI() otherwise
  // race the auth-state hook that persists the token in a microtask
  // after React routes off /signup → 401 → "flaky".
  const submit = page.getByRole('button', { name: /Create my workspace/i })
  await expect(submit).toBeEnabled({ timeout: 10000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 15000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
  return { email, password }
}

export async function createBoard(page: Page, name: string): Promise<{ id: string; name: string }> {
  const res = await page.request.post(`${API_BASE}/boards`, { data: { name } })
  expect(res.status(), `POST /boards should be 201, got body: ${await safeText(res)}`).toBe(201)
  const board = await res.json()
  return { id: board.id, name: board.name }
}

export async function createList(
  page: Page,
  boardId: string,
  name: string,
): Promise<{ id: string; name: string }> {
  const res = await page.request.post(`${API_BASE}/lists`, { data: { board_id: boardId, name } })
  expect(res.status(), `POST /lists should be 201, got body: ${await safeText(res)}`).toBe(201)
  const list = await res.json()
  return { id: list.id, name: list.name }
}

export async function createCard(
  page: Page,
  args: { boardId: string; listId?: string | null; title: string },
): Promise<{ id: string; title: string; list_id: string | null }> {
  const res = await page.request.post(`${API_BASE}/cards`, {
    data: { board_id: args.boardId, list_id: args.listId ?? null, title: args.title },
  })
  expect(res.status(), `POST /cards should be 201, got body: ${await safeText(res)}`).toBe(201)
  const card = await res.json()
  return { id: card.id, title: card.title, list_id: card.list_id }
}

export async function safeText(res: APIResponse): Promise<string> {
  try {
    return await res.text()
  } catch {
    return ''
  }
}

/**
 * Capture every network response during `fn`. Specs use this to assert the
 * app actually fired the expected backend call (and got a 2xx) — not just
 * that a click handler ran. Returns method/url/status for each response.
 */
export async function captureNetwork(page: Page, fn: () => Promise<void>) {
  const reqs: { method: string; url: string; status: number }[] = []
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

/**
 * Fail the test if any console.error fires during fn. Benign third-party noise
 * (favicon 404s, network noise from devtools) is filtered.
 */
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
