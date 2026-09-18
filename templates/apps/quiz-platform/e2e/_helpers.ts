// Quiz-platform e2e helpers. Inputs use FloatingInput (placeholder is the
// only accessible name; there is no <label>), so all field lookups go
// through getByRole('textbox', { name }) which matches accessible names
// computed from placeholder text.

import { Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3100')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4100') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'test') {
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

/** Sign up a fresh user; returns the credentials, display name, and bearer token. */
export async function signup(
  page: Page,
  email = uniqueEmail(),
  password = 'TestPass123!',
  name?: string,
) {
  const displayName = name ?? `T${Date.now() % 1_000_000}`
  await page.goto(APP_BASE + '/signup')
  await page
    .getByRole('textbox', { name: /display name|your name|name/i })
    .first()
    .fill(displayName)
  await page.getByRole('textbox', { name: /email/i }).first().fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  // Brand voice: button reads "Create account" (and "Creating your account…" while pending).
  const submit = page
    .getByRole('button', { name: /create.*account|sign\s*up|get\s*started/i })
    .first()
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
  const token = (await getAccessToken(page)) ?? ''
  return { email, password, name: displayName, token }
}

export async function login(page: Page, email: string, password: string) {
  await page.goto(APP_BASE + '/login')
  await page.getByRole('textbox', { name: /email/i }).first().fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  // Brand voice: login button reads "Ignite the spark" (and "Signing you in…" while pending).
  const submit = page.getByRole('button', { name: /ignite the spark|log\s*in|sign\s*in/i }).first()
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

/**
 * Read the document's theme attribute. The CSS-variables theme provider
 * applies "data-{prefix}-mode" (default prefix = "mol", so "data-mol-mode")
 * to <html>, NOT "data-theme". Tests should poll this helper instead of
 * the legacy "data-theme" name.
 */
export function readThemeAttr(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const html = document.documentElement
    return (
      html.getAttribute('data-mol-mode') ||
      html.getAttribute('data-mol-theme') ||
      html.getAttribute('data-theme') ||
      null
    )
  })
}

/** Toggle the theme via the header button and assert the attribute flips. */
export async function flipThemeAndAssertChanged(page: Page) {
  const before = await readThemeAttr(page)
  await page
    .getByRole('button', { name: /toggle theme/i })
    .first()
    .click()
  await expect.poll(async () => readThemeAttr(page), { timeout: 8000 }).not.toBe(before)
}

/**
 * Toggle theme, reload the page, and assert the new mode survived the reload.
 * Catches the failure mode where persistKey is set but no storage adapter
 * is wired (silent no-op) — every reload re-rendered the default theme.
 */
export async function flipThemeAndAssertSurvivesReload(page: Page) {
  const before = await readThemeAttr(page)
  await page
    .getByRole('button', { name: /toggle theme/i })
    .first()
    .click()
  await expect.poll(async () => readThemeAttr(page), { timeout: 8000 }).not.toBe(before)
  const after = await readThemeAttr(page)
  await page.reload()
  await expect.poll(async () => readThemeAttr(page), { timeout: 8000 }).toBe(after)
}

/** Click sign-out from the user menu in AppLayout. */
export async function logout(page: Page) {
  const trigger = page.getByRole('button', { name: /open user menu|account|profile/i }).first()
  if (await trigger.count().catch(() => 0)) {
    await trigger.click().catch(() => undefined)
  }
  const out = page.getByRole('button', { name: /sign\s*out|log\s*out/i }).first()
  if (await out.count().catch(() => 0)) await out.click().catch(() => undefined)
}

/** Build standard authorization headers for direct page.request.* calls. */
export function apiHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

/** Read the JWT bearer token from the httpOnly cookie (set by auth client after signup/login). */
export async function bearerToken(page: Page): Promise<string> {
  const t = await getAccessToken(page)
  expect(t, 'no access token in cookie').toBeTruthy()
  return t as string
}

/** Capture all network responses during a block. */
export async function captureNetwork(page: Page, fn: () => Promise<void>) {
  const reqs: { method: string; url: string; status: number }[] = []
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

/** Helper: assert at least one captured request matches method + url-regex + 2xx. */
export function expectReq(
  reqs: Array<{ method: string; url: string; status: number }>,
  method: string,
  pattern: RegExp,
  okStatuses: number[] = [200, 201, 204],
) {
  const match = reqs.find(
    (r) => r.method === method && pattern.test(r.url) && okStatuses.includes(r.status),
  )
  expect(
    match,
    `expected ${method} ${pattern} to match a successful request — saw: ${
      reqs
        .filter((r) => pattern.test(r.url))
        .map((r) => `${r.method} ${r.url} → ${r.status}`)
        .join(' | ') || '(none)'
    }`,
  ).toBeTruthy()
  return match
}

/** Fail the test if any console.error fires during fn (allowing benign noise). */
export async function expectNoConsoleErrors(page: Page, fn: () => Promise<void>) {
  const errs: string[] = []
  const handler = (msg: any) => {
    if (msg.type() === 'error') errs.push(msg.text())
  }
  page.on('console', handler)
  try {
    await fn()
  } finally {
    page.off('console', handler)
  }
  const fatal = errs.filter(
    (e) =>
      !/favicon|net::ERR_|Failed to load resource/i.test(e) &&
      !/Failed to fetch/i.test(e) &&
      !/TypeError: Load failed/i.test(e),
  )
  expect(fatal, 'console errors during interaction').toEqual([])
}

/** Get the JWT bearer token from the httpOnly cookie (set by auth client after signup/login). */
async function getBearer(page: Page): Promise<string | null> {
  return getAccessToken(page)
}

/** Same-origin fetch from inside the page, carrying the bearer token. */
export async function apiFetch<T = any>(
  page: Page,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; body: T }> {
  const token = await getBearer(page)
  return page.evaluate(
    async ({ apiBase, method, path, body, token }) => {
      const headers: Record<string, string> = { 'content-type': 'application/json' }
      if (token) headers['authorization'] = `Bearer ${token}`
      const r = await fetch(apiBase + path, {
        method,
        headers,
        credentials: 'include',
        body: body == null ? undefined : JSON.stringify(body),
      })
      let parsed: any = null
      try {
        parsed = await r.json()
      } catch {}
      return { status: r.status, body: parsed }
    },
    { apiBase: API_BASE, method, path, body, token },
  )
}

/** Create a quiz via API once we have an authed page. Returns its id. */
export async function createQuizViaApi(
  page: Page,
  title = `Quiz ${Date.now()}`,
  category = 'general',
): Promise<string> {
  const r = await apiFetch<{ id: string }>(page, 'POST', '/quizzes', { title, category })
  expect(r.status, `quiz create unexpected status — body: ${JSON.stringify(r.body)}`).toBe(201)
  return r.body.id
}

export async function addQuestionViaApi(
  page: Page,
  quizId: string,
  prompt: string,
  choices: string[],
  correctIndex: number,
  position = 0,
) {
  const body = {
    quiz_id: quizId,
    prompt,
    type: 'multiple-choice',
    choices,
    correct_answer: choices[correctIndex],
    points: 100,
    time_limit_s: 20,
    position,
  }
  const r = await apiFetch(page, 'POST', '/questions', body)
  expect(r.status, `question create unexpected status — body: ${JSON.stringify(r.body)}`).toBe(201)
  return r.body
}

/** Publish a quiz (creator-only). */
export async function publishQuiz(page: Page, quizId: string) {
  const r = await apiFetch(page, 'POST', `/quizzes/${quizId}/publish`)
  expect(r.status, `quiz publish unexpected status — body: ${JSON.stringify(r.body)}`).toBe(200)
  return r.body
}

/** Build a complete published quiz with N questions in one shot. */
export async function buildPublishedQuiz(
  page: Page,
  title = `Trivia ${Date.now()}`,
  category = 'general',
) {
  const id = await createQuizViaApi(page, title, category)
  const q1 = await addQuestionViaApi(page, id, '2 + 2 = ?', ['3', '4', '5', '6'], 1, 0)
  const q2 = await addQuestionViaApi(
    page,
    id,
    'Capital of France?',
    ['Berlin', 'Madrid', 'Paris', 'Rome'],
    2,
    1,
  )
  await publishQuiz(page, id)
  return { id, title, questionIds: [q1.id, q2.id] }
}
