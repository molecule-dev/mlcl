// Shared helpers for ai-code-review-tool e2e suite.
//
// All specs import from this file rather than re-rolling auth + network
// plumbing. Auth is real (POST /api/users + Bearer token), backend is the
// real Express + Postgres stack on $API_PORT, and the frontend at
// $VITE_PORT proxies /api → $API_PORT via vite.config.ts. No mocks.

import { Page, expect, type APIRequestContext } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3000')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'refract') {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

export interface SignupResult {
  email: string
  password: string
  name: string
  userId?: string
  accessToken?: string
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

/**
 * Sign up a fresh user via the UI form. Drives the real /signup page so
 * the test exercises the same flow a human user takes.
 *
 * Deterministic gating eliminates the auth-race: arm the POST /api/users
 * listener BEFORE the click (so a fast response can't be missed), assert
 * the response is < 400, wait for navigation away from /signup, then
 * poll until the JWT cookie is set. Without this, specs that immediately
 * call authedApi(page, ...) read a null token because the auth-state hook
 * sets the cookie in a subsequent microtask → 401 → "API-only" flake.
 */
export async function signup(
  page: Page,
  email = uniqueEmail(),
  password = 'TestPass123!',
  name = 'Refract Tester',
): Promise<SignupResult> {
  await page.goto(APP_BASE + '/signup')
  // Wait for the form to mount before the optional-field probes below.
  // count() is a one-shot read with no auto-waiting, so after a goto it can
  // run against a still-empty React root, return 0, and SILENTLY SKIP the
  // fill — the form then won't submit and every spec in the app dies on a
  // signup timeout. That is exactly how restaurant-ordering lost all 78.
  await page.locator('input').first().waitFor({ state: 'visible', timeout: 15000 })
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  const nameField = page.locator('#name')
  if (await nameField.count().catch(() => 0)) await nameField.fill(name)
  const submit = page.locator('[data-mol-id="signup-submit"]')
  await expect(submit).toBeEnabled({ timeout: 10000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
  const token = await getAccessToken(page)
  const meResp = await page.request.get(API_BASE + '/users/me')
  let userId: string | undefined
  if (meResp.ok()) {
    const me = (await meResp.json()) as { props?: { id?: string }; id?: string }
    userId = me?.props?.id ?? me?.id
  }
  return { email, password, name, accessToken: token ?? undefined, userId }
}

/**
 * Direct-to-API signup (no browser). Used inside helpers that need a
 * fresh user but do not want to navigate the UI yet (e.g. seeding fixture
 * rows then signing into the UI as that user).
 */
export async function apiSignup(request: APIRequestContext): Promise<SignupResult> {
  const email = uniqueEmail('apionly')
  const password = 'TestPass123!'
  const name = 'API Tester'
  const res = await request.post(API_BASE + '/users', {
    data: { email, password, name },
    headers: { 'Content-Type': 'application/json' },
  })
  expect(res.status(), 'apiSignup failed').toBe(201)
  const body = await res.json()
  return {
    email,
    password,
    name,
    userId: body?.id ?? body?.user?.id,
    accessToken: body?.accessToken,
  }
}

/**
 * Log in via the UI. Rarely needed — tests typically call signup() and
 * then continue. Use only for sessions / token rotation tests.
 *
 * Same hardening as signup(): arm the auth POST listener BEFORE the
 * click, assert < 400, wait for navigation off /login, then poll for
 * the token cookie.
 */
export async function login(page: Page, email: string, password: string) {
  await page.goto(APP_BASE + '/login')
  await page.getByLabel(/email/i).first().fill(email)
  await page
    .getByLabel(/password/i)
    .first()
    .fill(password)
  const submit = page.getByRole('button', { name: /sign\s*in|log\s*in|enter\s+refract/i }).first()
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
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 })
  await expect
    .poll(async () => (await getAccessToken(page)) !== null, {
      timeout: 10000,
      intervals: [50, 100, 250, 500],
    })
    .toBe(true)
}

/**
 * Capture all responses fired during fn() — used to assert which network
 * calls actually happened (and their statuses). Crucial for the "did the
 * action have a real backend effect?" question.
 */
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

/** Filter captured requests to those that hit /api/<path> (any verb). */
export function whereUrl(
  reqs: ReadonlyArray<{ method: string; url: string; status: number }>,
  pathRegex: RegExp,
  method?: string,
) {
  return reqs.filter(
    (r) =>
      pathRegex.test(r.url) && (method ? r.method.toUpperCase() === method.toUpperCase() : true),
  )
}

/**
 * Make an authenticated direct-to-API request with the captured Bearer
 * token. Use to verify backend invariants (read-after-write).
 */
export async function authedApi(request: APIRequestContext, token: string) {
  return {
    get: (path: string) =>
      request.get(API_BASE + path, { headers: { Authorization: `Bearer ${token}` } }),
    post: (path: string, body: unknown) =>
      request.post(API_BASE + path, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        data: body,
      }),
    put: (path: string, body: unknown) =>
      request.put(API_BASE + path, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        data: body,
      }),
    delete: (path: string) =>
      request.delete(API_BASE + path, { headers: { Authorization: `Bearer ${token}` } }),
  }
}

/**
 * Seed a repository, an open PR, and a completed review with a couple of
 * inline comments for the signed-in user. Returns the IDs so tests can
 * navigate to them and assert the data renders.
 */
export async function seedReviewedPR(
  request: APIRequestContext,
  token: string,
  opts: { repoName?: string; prTitle?: string } = {},
) {
  const api = await authedApi(request, token)
  const repoFullName = opts.repoName || `refract/example-${Date.now()}`
  const repoRes = await api.post('/repositories', {
    full_name: repoFullName,
    provider: 'github',
    default_branch: 'main',
  })
  expect(repoRes.status(), 'seed repository POST').toBeLessThan(400)
  const repo = await repoRes.json()

  const prTitle = opts.prTitle || `Refactor authn middleware (#${counter++})`
  const prRes = await api.post('/pull-requests', {
    repository_id: repo.id,
    provider_pr_number: 100 + counter,
    title: prTitle,
    head_ref: 'feat/refactor-auth',
    base_ref: 'main',
    state: 'open',
    additions: 142,
    deletions: 36,
    author_login: 'octocat',
  })
  expect(prRes.status(), 'seed PR POST').toBeLessThan(400)
  const pr = await prRes.json()

  const reviewRes = await api.post('/reviews', { pr_id: pr.id, status: 'queued' })
  expect(reviewRes.status(), 'seed review POST').toBeLessThan(400)
  const review = await reviewRes.json()

  const completeRes = await api.put(`/reviews/${review.id}`, {
    status: 'completed',
    quality_score: 84,
    completed_at: new Date().toISOString(),
    severity_summary_json: { high: 1, med: 2, low: 1 },
  })
  expect(completeRes.status(), 'complete review PUT').toBeLessThan(400)

  const c1 = await api.post(`/reviews/${review.id}/comments`, {
    file_path: 'src/auth/middleware.ts',
    line_start: 42,
    severity: 'high',
    category: 'security',
    body_md: 'Token verification missing — every request bypasses auth.',
    suggested_patch: '+ if (!token) return res.status(401).end()',
  })
  expect(c1.status(), 'comment 1 POST').toBe(201)
  const c2 = await api.post(`/reviews/${review.id}/comments`, {
    file_path: 'src/auth/middleware.ts',
    line_start: 88,
    severity: 'med',
    category: 'maintainability',
    body_md: 'Extract this branch into a helper for readability.',
  })
  expect(c2.status(), 'comment 2 POST').toBe(201)

  return { repo, pr, review }
}

/** Fail the test if any console.error fires during fn — modulo benign noise. */
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
      !/favicon|net::ERR_INSUFFICIENT_RESOURCES|Failed to load resource|the server responded with a status of 4\d\d/.test(
        e,
      ),
  )
  expect(fatal, 'console errors during interaction').toEqual([])
}
