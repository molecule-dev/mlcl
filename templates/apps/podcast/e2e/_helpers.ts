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

/** Sign up a fresh user; returns the credentials. */
export async function signup(page: Page, email = uniqueEmail(), password = 'TestPass123!') {
  await page.goto(APP_BASE + '/signup')
  // Wait for the form to mount before the optional-field probes below.
  // count() is a one-shot read with no auto-waiting, so after a goto it can
  // run against a still-empty React root, return 0, and SILENTLY SKIP the
  // fill — the form then won't submit and every spec in the app dies on a
  // signup timeout. That is exactly how restaurant-ordering lost all 78.
  await page.locator('input').first().waitFor({ state: 'visible', timeout: 15000 })
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
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 15000 })
  return { email, password }
}

export async function login(page: Page, email: string, password: string) {
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
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 })
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

/** Fail the test if any console.error fires during fn (allowing benign
 *  third-party noise like favicon 404s and in-flight fetches that get
 *  cancelled when the page navigates away). */
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
      // In-flight fetch that races with a navigate-away. Benign and
      // common in SPAs that fire data fetches in `useEffect` without
      // an AbortController.
      !/Failed to fetch/i.test(e) &&
      !/TypeError: Load failed/i.test(e),
  )
  expect(fatal, 'console errors during interaction').toEqual([])
}

/** A catalog show, in the shape `GET /api/shows` returns. */
export interface CatalogShow {
  id: string
  title: string
  publisher?: string
  category?: string
  subscribed?: boolean
}

/** A catalog episode, in the shape `GET /api/episodes` returns. */
export interface CatalogEpisode {
  id: string
  title: string
  show_id: string
  show_title?: string
  transcript?: string
  description?: string
}

/** A chapter marker, in the shape `GET /api/chapters?episode_id=…` returns. */
export interface EpisodeChapter {
  id: string
  title: string
  start_seconds: number
}

/** A notification, in the shape `GET /api/notifications` returns. */
export interface FeedNotification {
  id: string
  type: string
  title: string
  body: string
  href: string
  unread: boolean
}

/**
 * The show catalog, read from the same endpoint Discover and Search read.
 *
 * Specs drive whatever the catalog actually holds rather than naming a seeded
 * show: the demo catalog is the first thing an app's owner replaces, and a
 * spec that hardcodes a seeded title or id fails on a correct app.
 */
export async function getShows(page: Page): Promise<CatalogShow[]> {
  const resp = await page.request.get(API_BASE + '/shows')
  expect(resp.status(), 'GET /api/shows').toBeLessThan(400)
  return (await resp.json()) as CatalogShow[]
}

/** A show from the live catalog — whichever one the app actually holds. */
export async function pickShow(page: Page): Promise<CatalogShow> {
  const shows = await getShows(page)
  const show = shows[0]
  if (!show) throw new Error('catalog has no shows')
  return show
}

/**
 * A show the signed-in listener is NOT subscribed to — what the subscribe
 * toggle needs so the first click is a subscribe rather than an unsubscribe.
 */
export async function pickUnsubscribedShow(page: Page): Promise<CatalogShow> {
  const shows = await getShows(page)
  const show = shows.find((s) => !s.subscribed)
  if (!show) throw new Error('catalog has no show the listener is unsubscribed from')
  return show
}

/** Recently published episodes, as the Discover/Search pages read them. */
export async function getEpisodes(page: Page): Promise<CatalogEpisode[]> {
  const resp = await page.request.get(API_BASE + '/episodes')
  expect(resp.status(), 'GET /api/episodes').toBeLessThan(400)
  return (await resp.json()) as CatalogEpisode[]
}

/** An episode from the live catalog, together with the show it belongs to. */
export async function pickEpisode(page: Page): Promise<CatalogEpisode> {
  const episodes = await getEpisodes(page)
  const episode = episodes.find((e) => e.show_title)
  if (!episode) throw new Error('catalog has no published episode')
  return episode
}

/** The chapter markers the player renders for an episode. */
export async function getChapters(page: Page, episodeId: string): Promise<EpisodeChapter[]> {
  const resp = await page.request.get(API_BASE + '/chapters?episode_id=' + episodeId)
  expect(resp.status(), 'GET /api/chapters').toBeLessThan(400)
  return (await resp.json()) as EpisodeChapter[]
}

/** The caller's notification feed, in the shape the page renders. */
export async function getNotifications(page: Page): Promise<FeedNotification[]> {
  const resp = await page.request.get(API_BASE + '/notifications')
  expect(resp.status(), 'GET /api/notifications').toBeLessThan(400)
  return (await resp.json()) as FeedNotification[]
}

/** The listener profile card's counts, read from the endpoint the page reads. */
export async function getProfile(page: Page): Promise<Record<string, unknown>> {
  const resp = await page.request.get(API_BASE + '/profile/me')
  expect(resp.status(), 'GET /api/profile/me').toBeLessThan(400)
  return (await resp.json()) as Record<string, unknown>
}
