// Auto-generated boilerplate. Helper functions used across crypto-tracker
// e2e specs. Every spec should import from this module.

import { Page, expect } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3000')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'ct') {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

/** Sign up a fresh user via the UI, returning the credentials.
 *  Lands on /dashboard.
 *
 *  Hardened against the auth-race: arm POST /api/users response listener
 *  BEFORE clicking submit so a fast response can't be missed, gate on
 *  status < 400, then wait for navigation to /dashboard. Eliminates the
 *  API-only flake where a spec read the persisted JWT from localStorage
 *  (or fired an authed API call) before the auth-state hook wrote it. */
export async function signup(page: Page, email = uniqueEmail(), password = 'TestPass123!') {
  await page.goto(APP_BASE + '/signup')
  await page.locator('input[placeholder="First name"]').fill('Test')
  await page.locator('input[placeholder="Last name"]').fill('User')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[placeholder="Password"]').fill(password)
  await page.locator('input[placeholder="Confirm password"]').fill(password)
  const submit = page.getByRole('button', { name: /create account/i })
  await expect(submit).toBeEnabled({ timeout: 10000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30_000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 })
  return { email, password }
}

/** Capture all network responses during a block. */
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

/** A coin from the markets catalog, in the shape `GET /api/markets` returns. */
export interface MarketCoin {
  id: string
  symbol: string
  name: string
}

/** A watchlist row, in the shape `GET /api/watchlist` returns. */
export interface WatchlistRow {
  id: string
  symbol: string
  name: string
}

/** A portfolio holding, in the shape `GET /api/portfolio` returns. */
export interface Holding {
  id: string
  symbol: string
  name?: string
  amount: number
}

/**
 * The markets catalog, read from the same endpoint the Markets page reads.
 *
 * Specs drive whichever coins the catalog holds instead of naming seeded ones:
 * the demo catalog is the first thing an app's owner replaces, and a spec that
 * names a seeded coin fails on a correct app.
 */
export async function getMarkets(page: Page): Promise<MarketCoin[]> {
  const resp = await page.request.get(API_BASE + '/markets')
  expect(resp.status(), 'GET /api/markets').toBeLessThan(400)
  const body = (await resp.json()) as MarketCoin[] | { data?: MarketCoin[] }
  return Array.isArray(body) ? body : (body.data ?? [])
}

/** A coin from the live markets catalog. */
export async function pickCoin(page: Page): Promise<MarketCoin> {
  const coins = await getMarkets(page)
  const coin = coins[0]
  if (!coin) throw new Error('markets catalog is empty')
  return coin
}

/**
 * Force the lazy per-user demo seed (watchlist / portfolio / alerts) to finish.
 * It is triggered by GET /api/reports/portfolio_stats, so a spec that reads
 * per-user rows straight after signup would otherwise race the dashboard's
 * background mount.
 */
export async function ensureUserSeed(page: Page): Promise<void> {
  await page.request.get(API_BASE + '/reports/portfolio_stats', { failOnStatusCode: false })
}

export async function getWatchlist(page: Page): Promise<WatchlistRow[]> {
  await ensureUserSeed(page)
  const resp = await page.request.get(API_BASE + '/watchlist')
  expect(resp.status(), 'GET /api/watchlist').toBeLessThan(400)
  const body = (await resp.json()) as WatchlistRow[] | { data?: WatchlistRow[] }
  return Array.isArray(body) ? body : (body.data ?? [])
}

/** A coin the user is already watching — what the remove-from-watchlist flow needs. */
export async function pickWatchedCoin(page: Page): Promise<WatchlistRow> {
  const rows = await getWatchlist(page)
  const row = rows[0]
  if (!row) throw new Error('watchlist is empty')
  return row
}

/**
 * A catalog coin the user is NOT watching — what the add-to-watchlist toggle
 * needs so the first click provably changes state.
 */
export async function pickUnwatchedCoin(page: Page): Promise<MarketCoin> {
  const [coins, watched] = await Promise.all([getMarkets(page), getWatchlist(page)])
  const watching = new Set(watched.map((r) => r.symbol.toLowerCase()))
  const coin = coins.find((c) => !watching.has(c.symbol.toLowerCase()))
  if (!coin) throw new Error('every catalog coin is already on the watchlist')
  return coin
}

export async function getHoldings(page: Page): Promise<Holding[]> {
  await ensureUserSeed(page)
  const resp = await page.request.get(API_BASE + '/portfolio')
  expect(resp.status(), 'GET /api/portfolio').toBeLessThan(400)
  const body = (await resp.json()) as Holding[] | { data?: Holding[] }
  return Array.isArray(body) ? body : (body.data ?? [])
}

/** A coin the portfolio already holds — what the fold-into-existing flow needs. */
export async function pickHolding(page: Page): Promise<Holding> {
  const holdings = await getHoldings(page)
  const holding = holdings[0]
  if (!holding) throw new Error('portfolio is empty')
  return holding
}

/** A symbol the portfolio does NOT hold, so adding it creates a new row. */
export async function pickUnheldSymbol(page: Page): Promise<string> {
  const holdings = await getHoldings(page)
  const held = new Set(holdings.map((h) => h.symbol.toLowerCase()))
  const candidate = ['atom', 'near', 'algo', 'ftm', 'hbar', 'egld'].find((s) => !held.has(s))
  if (!candidate) throw new Error('no unheld symbol available for this spec')
  return candidate
}

/** Force-submit a React-controlled input by setting the native value
 *  and dispatching a real input event so React's onChange fires. */
export async function setInputValue(page: Page, selector: string, value: string) {
  await page.evaluate(
    ({ sel, val }) => {
      const el = document.querySelector(sel) as HTMLInputElement | HTMLSelectElement | null
      if (!el) throw new Error('selector not found: ' + sel)
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )!.set!
      setter.call(el, val)
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
    },
    { sel: selector, val: value },
  )
}
