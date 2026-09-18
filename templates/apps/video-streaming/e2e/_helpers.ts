// Test helpers for video-streaming e2e specs.
//
// Exercise the LIVE app + LIVE postgres. Specs never name a catalog row:
// they read the videos and channels they drive out of the same endpoints
// the pages read (see the catalog pickers at the bottom of this file), so
// they keep passing once the demo catalog is replaced with real content.

import {
  type APIRequestContext,
  type Page,
  type Response,
  expect,
  request,
} from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3210')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4210') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'vse2e'): string {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

export interface SignupResult {
  email: string
  password: string
  userId: string
  accessToken: string
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
 * Sign up via the API. The handler sets an httpOnly `token` cookie via
 * Set-Cookie which page.request automatically stores in the browser context
 * — available for the next page.goto(). The returned accessToken comes
 * from the API response body (for specs that need to pass a bearer explicitly).
 */
export async function signup(
  page: Page,
  emailArg?: string,
  passwordArg = 'TestPass123!',
  nameArg = 'Walk Tester',
): Promise<SignupResult> {
  const email = emailArg ?? uniqueEmail()
  const password = passwordArg
  const res = await page.request.post(`${API_BASE}/users`, {
    data: { email, password, name: nameArg },
    headers: { 'Content-Type': 'application/json' },
    failOnStatusCode: false,
  })
  expect(res.status(), await res.text()).toBe(201)
  const body = (await res.json()) as {
    accessToken: string
    user?: { id: string }
    props?: { id: string }
  }
  const userId = body.user?.id ?? body.props?.id ?? ''
  expect(userId, 'signup returned no user id').toBeTruthy()
  expect(body.accessToken, 'signup returned no accessToken').toBeTruthy()

  // Navigate to /login so the Set-Cookie from POST /api/users is applied to
  // the browser context before the next navigation. The cookie-based auth
  // (M1-1) means no localStorage seeding is needed.
  await page.goto(APP_BASE + '/login')

  return { email, password, userId, accessToken: body.accessToken }
}

/** Log out via DELETE /api/sessions. */
export async function logout(page: Page, accessToken: string): Promise<void> {
  await page.request
    .delete(`${API_BASE}/sessions`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      failOnStatusCode: false,
    })
    .catch(() => {})
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

/**
 * Authenticated page-context fetch — uses the JWT from the httpOnly cookie
 * (M1-1) so specs can read/write through the API without going through the UI.
 */
export async function authedFetch<T = unknown>(
  page: Page,
  url: string,
  init: AuthedFetchInit = {},
): Promise<{ status: number; body: T | null }> {
  const token = (await getAccessToken(page)) ?? ''
  return page.evaluate(
    async (args) => {
      const headers = {
        ...(args.init.headers || {}),
        Authorization: `Bearer ${args.token}`,
        'Content-Type': 'application/json',
      }
      const resp = await fetch(args.url, { ...args.init, headers })
      let body: unknown = null
      try {
        body = await resp.json()
      } catch {
        body = null
      }
      return { status: resp.status, body: body as never }
    },
    { url, init, token },
  )
}

/** A published catalog video, in the shape `GET /api/videos` returns. */
export interface CatalogVideo {
  id: string
  title: string
  channel_id?: string
  channel_name?: string
  duration_sec?: number
  duration_seconds?: number
  view_count?: number
}

/** A channel row, in the shape `GET /api/channels` returns. */
export interface CatalogChannel {
  id: string
  name: string
  handle?: string
}

/**
 * The catalog under test, read from the same endpoint the pages read.
 *
 * Specs drive whatever videos the app actually holds rather than naming
 * rows: the demo catalog is the first thing an app's owner replaces, and a
 * spec that names a seeded title or id fails on a correct app.
 */
export async function getVideos(page: Page, query = ''): Promise<CatalogVideo[]> {
  const suffix = query ? `?${query}` : ''
  // Relative path: the app dev server proxies /api, so this is a same-origin
  // fetch from inside the page (no CORS), exactly like the pages themselves.
  const { status, body } = await authedFetch<CatalogVideo[]>(page, `/api/videos${suffix}`)
  expect(status, 'GET /api/videos').toBe(200)
  return (body ?? []) as CatalogVideo[]
}

/** The channels the app holds, most-subscribed first. */
export async function getChannels(page: Page): Promise<CatalogChannel[]> {
  const { status, body } = await authedFetch<CatalogChannel[]>(page, '/api/channels')
  expect(status, 'GET /api/channels').toBe(200)
  return (body ?? []) as CatalogChannel[]
}

/**
 * A catalog video — the newest one that belongs to a channel.
 *
 * Preferring a channel-owned row also skips the channel-less videos other
 * specs create and delete, which would otherwise disappear mid-test.
 */
export async function pickVideo(page: Page): Promise<CatalogVideo> {
  const videos = await getVideos(page, 'limit=24')
  const video = videos.find((v) => !!v.channel_id) ?? videos[0]
  if (!video) throw new Error('catalog holds no published videos')
  return video
}

/** A catalog video that belongs to a channel — what the subscribe flows need. */
export async function pickVideoWithChannel(page: Page): Promise<CatalogVideo> {
  const videos = await getVideos(page, 'limit=24')
  const video = videos.find((v) => !!v.channel_id)
  if (!video) throw new Error('catalog holds no published video with a channel')
  return video
}

/** The most-viewed catalog video — what /trending lists first. */
export async function pickTrendingVideo(page: Page): Promise<CatalogVideo> {
  const videos = await getVideos(page, 'sort=trending&limit=50')
  const top = videos[0]
  if (!top) throw new Error('catalog holds no published videos')
  return top
}

/**
 * Two catalog videos whose titles are unambiguous for a text search —
 * neither title contains the other, so searching one must exclude the other.
 */
export async function pickTwoDistinctTitles(
  page: Page,
): Promise<{ target: CatalogVideo; other: CatalogVideo }> {
  const videos = await getVideos(page, 'limit=24')
  const disjoint = (a: string, b: string) =>
    !a.toLowerCase().includes(b.toLowerCase()) && !b.toLowerCase().includes(a.toLowerCase())
  for (const target of videos) {
    const other = videos.find((v) => v.id !== target.id && disjoint(v.title, target.title))
    if (other) return { target, other }
  }
  throw new Error('catalog needs two videos with distinguishable titles')
}

/**
 * A channel that owns at least `min` published videos, plus those videos —
 * what the channel, subscriptions and journey specs drive.
 */
export async function pickChannelWithVideos(
  page: Page,
  min = 1,
): Promise<{ channel: CatalogChannel; videos: CatalogVideo[] }> {
  const channels = await getChannels(page)
  for (const channel of channels) {
    const videos = await getVideos(page, `channel_id=${channel.id}&limit=24`)
    if (videos.length >= min) return { channel, videos }
  }
  throw new Error(`catalog needs a channel owning at least ${min} published video(s)`)
}

/** Convenience: assert no surprising console errors during a flow. */
export async function expectNoConsoleErrors(page: Page, fn: () => Promise<void>): Promise<void> {
  const errs: string[] = []
  const handler = (msg: { type(): string; text(): string }) => {
    if (msg.type() === 'error') errs.push(msg.text())
  }
  page.on('console', handler)
  try {
    await fn()
  } finally {
    page.off('console', handler)
  }
  const fatal = errs.filter(
    (e) => !/favicon|net::ERR_|Failed to load resource|apple-mobile-web-app-capable/.test(e),
  )
  expect(fatal, 'console errors during interaction').toEqual([])
}
