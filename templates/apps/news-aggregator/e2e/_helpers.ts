// Test helpers for news-aggregator e2e specs.
//
// These run against the LIVE app + LIVE postgres + LIVE Stripe test keys.
// There are no upstream-API mocks; every spec exercises the real stack.

import {
  type APIRequestContext,
  type Page,
  type Response,
  expect,
  request,
} from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3000')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'news'): string {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

export interface SignupResult {
  email: string
  password: string
}

/** Sign up a fresh user via the live /signup form. Returns the credentials. */
export async function signup(
  page: Page,
  emailArg?: string,
  passwordArg = 'TestPass123!',
): Promise<SignupResult> {
  const email = emailArg || uniqueEmail()
  const password = passwordArg
  await page.goto(APP_BASE + '/signup')
  // Wait for the form to mount before the optional-field probes below.
  // count() is a one-shot read with no auto-waiting, so after a goto it can
  // run against a still-empty React root, return 0, and SILENTLY SKIP the
  // fill — the form then won't submit and every spec in the app dies on a
  // signup timeout. That is exactly how restaurant-ordering lost all 78.
  await page.locator('input').first().waitFor({ state: 'visible', timeout: 15000 })
  // Name fields (one-name layout). Try a few common label shapes.
  const name = page.getByLabel(/^name|full\s*name/i).first()
  if (await name.count().catch(() => 0)) await name.fill('Walk Tester')
  const first = page.getByLabel(/first\s*name/i).first()
  if (await first.count().catch(() => 0)) await first.fill('Walk')
  const last = page.getByLabel(/last\s*name/i).first()
  if (await last.count().catch(() => 0)) await last.fill('Tester')
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
    .getByRole('button', {
      name: /sign\s*up|create.*account|register|get\s*started|start reading/i,
    })
    .first()
  await expect(submit).toBeEnabled({ timeout: 10000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).toHaveURL(/\/home(\?|$|\/)/, { timeout: 20_000 })
  return { email, password }
}

/** Log in an existing user. */
export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto(APP_BASE + '/login')
  await page.getByLabel(/email/i).first().fill(email)
  await page
    .getByLabel(/password/i)
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
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 })
}

/** Sign out via the Settings page (the in-app sign-out button). */
export async function logout(page: Page): Promise<void> {
  await page.goto(APP_BASE + '/settings')
  await page
    .getByRole('button', { name: /sign\s*out|log\s*out/i })
    .first()
    .click()
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
}

export interface CapturedReq {
  method: string
  url: string
  status: number
}

export async function captureNetwork(page: Page, fn: () => Promise<void>): Promise<CapturedReq[]> {
  const reqs: CapturedReq[] = []
  const onResp = (resp: Response) => {
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

export async function apiContext(): Promise<APIRequestContext> {
  return request.newContext()
}

/** Sign up directly via the API (no browser). Returns token + userId. */
export async function apiSignup(
  ctx: APIRequestContext,
  email = uniqueEmail(),
  password = 'TestPass123!',
  name = 'API Tester',
): Promise<{ token: string; userId: string; email: string; password: string }> {
  const resp = await ctx.post(`${API_BASE}/users`, { data: { email, password, name } })
  if (!resp.ok()) {
    throw new Error(`apiSignup failed: ${resp.status()} ${await resp.text()}`)
  }
  const body = (await resp.json()) as {
    accessToken?: string
    user?: { id: string }
    props?: { id: string }
    id?: string
  }
  const userId = body.user?.id ?? body.props?.id ?? body.id ?? ''
  if (!userId || !body.accessToken) {
    throw new Error(
      `apiSignup: missing accessToken/userId in ${JSON.stringify(body).slice(0, 200)}`,
    )
  }
  return { token: body.accessToken, userId, email, password }
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

/** @deprecated Use getAccessToken instead. */
export async function getAccessTokenFromPage(page: Page): Promise<string | null> {
  return getAccessToken(page)
}

/**
 * The subset of `RequestInit` these helpers pass through `page.evaluate`.
 * It has to be structured-cloneable, so it is spelled out rather than taken
 * as a full `RequestInit` (whose `headers` union is not spreadable).
 */
export interface AuthedFetchInit {
  method?: string
  body?: string
  headers?: Record<string, string>
}

/** Authenticated browser-side fetch using the JWT stored by @molecule/app-auth.
 *
 * Two overloads:
 *   - `authedFetch<T>(page, url, init)` returns the parsed JSON body as T (legacy callers).
 *   - `authedFetch(page, url, init, { withStatus: true })` returns `{ status, body }`
 *     so callers can assert on HTTP status without re-issuing the request.
 *
 * Reads the JWT from page localStorage and fires `fetch(url)` from inside the
 * page context (so cookies + Vite proxy + same-origin all work).
 */
export async function authedFetch<T = unknown>(
  page: Page,
  url: string,
  init?: AuthedFetchInit,
): Promise<T>
export async function authedFetch(
  page: Page,
  url: string,
  init: AuthedFetchInit | undefined,
  options: { withStatus: true },
): Promise<{ status: number; body: unknown }>
export async function authedFetch<T>(
  page: Page,
  url: string,
  init: AuthedFetchInit = {},
  options?: { withStatus?: boolean },
): Promise<unknown> {
  const token = await getAccessTokenFromPage(page)
  const result = await page.evaluate(
    async (args) => {
      const headers = { ...(args.init.headers || {}), Authorization: `Bearer ${args.token}` }
      const resp = await fetch(args.url, { ...args.init, headers })
      const status = resp.status
      let body: unknown = null
      try {
        body = await resp.json()
      } catch {
        body = null
      }
      return { status, body }
    },
    { url, init, token },
  )
  if (options?.withStatus) return result
  return result.body as T
}

/** A topic row, in the shape `GET /api/topics` returns. */
export interface CatalogTopic {
  id: string
  slug: string
  label: string
}

/** A source row, in the shape `GET /api/sources` returns. */
export interface CatalogSource {
  id: string
  slug: string
  name: string
  following?: boolean
}

/** A story row, in the shape `GET /api/stories` returns. */
export interface CatalogStory {
  id: string
  headline: string
}

/**
 * The topics/sources/stories under test, read from the same endpoints the
 * pages read.
 *
 * Specs drive whatever content the app actually holds rather than naming
 * rows: the demo feed is the first thing an app's owner replaces, and a
 * spec that names a seeded topic, source or headline fails on a correct app.
 */
export async function getTopics(page: Page): Promise<CatalogTopic[]> {
  const topics = await authedFetch<CatalogTopic[]>(page, '/api/topics')
  return topics ?? []
}

export async function getSources(page: Page): Promise<CatalogSource[]> {
  const sources = await authedFetch<CatalogSource[]>(page, '/api/sources')
  return sources ?? []
}

export async function getStories(page: Page): Promise<CatalogStory[]> {
  const stories = await authedFetch<CatalogStory[]>(page, '/api/stories')
  return stories ?? []
}

/** A topic the app holds — whichever one /api/topics lists first. */
export async function pickTopic(page: Page): Promise<CatalogTopic> {
  const [topic] = await getTopics(page)
  if (!topic) throw new Error('the app has no topics')
  return topic
}

/** Two topics with different slugs — what the chip-navigation specs need. */
export async function pickTwoTopics(
  page: Page,
): Promise<{ target: CatalogTopic; other: CatalogTopic }> {
  const topics = await getTopics(page)
  const target = topics[0]
  const other = topics.find((t) => t.slug !== target?.slug)
  if (!target || !other) throw new Error('the app needs two topics')
  return { target, other }
}

/** A source the app holds — whichever one /api/sources lists first. */
export async function pickSource(page: Page): Promise<CatalogSource> {
  const [source] = await getSources(page)
  if (!source) throw new Error('the app has no sources')
  return source
}

/**
 * Two sources whose names are unambiguous on screen — neither name contains
 * the other, so a list showing one must not show the other.
 */
export async function pickTwoSources(
  page: Page,
): Promise<{ target: CatalogSource; other: CatalogSource }> {
  const sources = await getSources(page)
  const disjoint = (a: string, b: string) =>
    !a.toLowerCase().includes(b.toLowerCase()) && !b.toLowerCase().includes(a.toLowerCase())
  for (const target of sources) {
    const other = sources.find((s) => s.id !== target.id && disjoint(s.name, target.name))
    if (other) return { target, other }
  }
  throw new Error('the app needs two sources with distinguishable names')
}

/** A story the app holds — whichever one /api/stories lists first. */
export async function pickStory(page: Page): Promise<CatalogStory> {
  const [story] = await getStories(page)
  if (!story) throw new Error('the app has no stories')
  return story
}
