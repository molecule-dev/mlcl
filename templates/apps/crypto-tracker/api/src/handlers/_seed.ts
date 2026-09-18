/**
 * Demo seed for crypto-tracker.
 *
 * Layered like coupon-deals-platform's seed:
 *
 * 1. **Globals** (`seedGlobalCatalogIfEmpty`) — coins (markets) and
 *    crypto_news rows. Idempotent: if the `coins` table already has any
 *    rows we skip globals entirely. Called once at server boot.
 *
 * 2. **Per-user** (`seedDemoForUser`) — a small starter set of holdings,
 *    watchlist coins, transactions, alerts, and notifications so a fresh
 *    signup lands on Dashboard / Portfolio / Watchlist / Alerts pages
 *    that actually show something. Idempotent on user_id.
 *
 * @module
 */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { count, create } from '@molecule/api-database'
import { logger } from '@molecule/api-logger'

import { FREE_LIMITS } from '../tiers.js'

const here = dirname(fileURLToPath(import.meta.url))

/** Resolve a fixture path. Tries multiple locations because the layout
 * differs between source-tree (api/fixtures/<name>.json — same level
 * as src/) and built-tree (dist/handlers/_seed.js — fixtures live two
 * levels up at api/fixtures/). */
function resolveFixture(name: string): string | null {
  const candidates = [
    resolve(here, '../../fixtures', name),
    resolve(here, '../../../fixtures', name),
    resolve(process.cwd(), 'fixtures', name),
    resolve(process.cwd(), 'api/fixtures', name),
  ]
  for (const c of candidates) {
    if (existsSync(c)) return c
  }
  return null
}

/**
 * Trim a demo collection so a new user is not born over quota.
 *
 * The fixtures ship more rows than the FREE plan allows — 8 holdings against
 * maxPortfolio 5, 6 alerts against maxAlerts 5, 6 watchlist coins against
 * maxCoins 5 — so a freshly signed-up user was already at the ceiling and every
 * add answered 403 "Limit reached". The three flows that broke in e2e were
 * exactly those three. Seeding one BELOW the limit keeps the demo looking full
 * while leaving room to actually use the feature.
 *
 * @param rows - The fixture rows.
 * @param limit - The free plan cap for this collection.
 * @returns At most `limit - 1` rows.
 */
function withinFreePlan<T>(rows: T[], limit: number): T[] {
  return rows.slice(0, Math.max(1, limit - 1))
}
function loadFixture<T = unknown>(name: string): T[] {
  const path = resolveFixture(name)
  if (!path) {
    logger.warn(`[crypto-tracker seed] fixture missing: ${name}`)
    return []
  }
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as T[]
  } catch (err) {
    logger.error(err)
    return []
  }
}

interface MarketFixture {
  symbol: string
  name: string
  rank: number
  price_usd: number
  change_1h_pct: number
  change_24h_pct: number
  change_7d_pct: number
  change_30d_pct: number
  market_cap_usd: number
  fully_diluted_valuation_usd: number
  volume_24h_usd: number
  circulating_supply: number
  total_supply: number
  max_supply: number | null
  ath_usd: number
  atl_usd: number
  history_30d: { ts: string; price_usd: number }[]
  sparkline_7d: number[]
  description: string
  links: { website?: string; whitepaper?: string; twitter?: string }
}

interface NewsFixture {
  title: string
  source: string
  url: string
  summary: string
  published_at: string
  related_symbols: string[]
  signal: 'bullish' | 'bearish' | 'neutral'
}

interface PortfolioFixture {
  symbol: string
  name: string
  amount: number
  cost_basis_usd: number
  current_value_usd: number
}

interface WatchlistFixture {
  symbol: string
  name: string
  added_at: string
}

interface TransactionFixture {
  occurred_at: string
  kind: 'buy' | 'sell' | 'transfer_in' | 'transfer_out' | 'reward' | 'fee'
  symbol: string
  amount: number
  price_usd: number
  total_usd: number
  fee_usd?: number
  exchange: string
  notes?: string
}

interface AlertFixture {
  symbol: string
  coin_name: string
  condition: 'above' | 'below' | 'change_24h_above' | 'change_24h_below' | 'volume_above'
  threshold: number
  active: boolean
  triggered_at: string | null
  created_at: string
}

interface NotificationFixture {
  type: string
  title: string
  body: string
  href: string
  created_at: string
  unread: boolean
}

/**
 * Seed the global market catalog (coins + crypto_news) if the `coins`
 * table is empty. Idempotent.
 */
export async function seedGlobalCatalogIfEmpty(): Promise<{
  coinsCreated: number
  newsCreated: number
}> {
  const existingCoinCount = await count('coins', [])
  if (existingCoinCount > 0) {
    return { coinsCreated: 0, newsCreated: 0 }
  }

  const markets = loadFixture<MarketFixture>('markets.json')
  let coinsCreated = 0
  for (const m of markets) {
    // Map the full domain shape to the squashed schema. Frontend reads
    // `price_usd`, `market_cap_usd`, `volume_24h_usd`, etc. directly off
    // the row, so the column names must match the fixture keys.
    await create('coins', {
      symbol: m.symbol,
      name: m.name,
      market_cap_rank: m.rank,
      current_price: m.price_usd,
      market_cap_usd: m.market_cap_usd,
      market_cap: m.market_cap_usd,
      volume_24h_usd: m.volume_24h_usd,
      volume_24h: m.volume_24h_usd,
      change_1h_pct: m.change_1h_pct,
      change_24h_pct: m.change_24h_pct,
      price_change_24h_pct: m.change_24h_pct,
      change_7d_pct: m.change_7d_pct,
      change_30d_pct: m.change_30d_pct,
      circulating_supply: m.circulating_supply,
      total_supply: m.total_supply,
      max_supply: m.max_supply,
      ath_usd: m.ath_usd,
      atl_usd: m.atl_usd,
      fully_diluted_valuation_usd: m.fully_diluted_valuation_usd,
      sparkline_7d: JSON.stringify(m.sparkline_7d ?? []),
      history_30d: JSON.stringify(m.history_30d ?? []),
      description: m.description,
      links: JSON.stringify(m.links ?? {}),
    })
    coinsCreated++
  }

  const news = loadFixture<NewsFixture>('news.json')
  let newsCreated = 0
  for (const n of news) {
    await create('crypto_news', {
      title: n.title,
      source: n.source,
      url: n.url,
      summary: n.summary,
      related_symbols: JSON.stringify(n.related_symbols ?? []),
      signal: n.signal,
      published_at: new Date(n.published_at),
    })
    newsCreated++
  }

  return { coinsCreated, newsCreated }
}

/**
 * Seed a freshly signed-up user with a starter portfolio, watchlist,
 * transactions, alerts, and notifications. Idempotent: returns early
 * if the user already has any holding rows.
 *
 * Called lazily on the first dashboard / portfolio fetch — never blocks
 * boot, never blocks render on failure.
 */
export async function seedDemoForUser(userId: string): Promise<{
  holdingsCreated: number
  watchlistCreated: number
  transactionsCreated: number
  alertsCreated: number
  notificationsCreated: number
}> {
  if (!userId) {
    return {
      holdingsCreated: 0,
      watchlistCreated: 0,
      transactionsCreated: 0,
      alertsCreated: 0,
      notificationsCreated: 0,
    }
  }
  const existingHoldings = await count('crypto_holdings', [
    { field: 'user_id', operator: '=', value: userId },
  ])
  if (existingHoldings > 0) {
    return {
      holdingsCreated: 0,
      watchlistCreated: 0,
      transactionsCreated: 0,
      alertsCreated: 0,
      notificationsCreated: 0,
    }
  }

  const portfolio = withinFreePlan(
    loadFixture<PortfolioFixture>('portfolio.json'),
    FREE_LIMITS.maxPortfolio,
  )
  let holdingsCreated = 0
  for (const h of portfolio) {
    const avgBuy = h.amount > 0 ? h.cost_basis_usd / h.amount : 0
    await create('crypto_holdings', {
      user_id: userId,
      coin_id: null,
      symbol: h.symbol,
      name: h.name,
      amount: h.amount,
      avg_buy_price: avgBuy,
      total_cost: h.cost_basis_usd,
      cost_basis_usd: h.cost_basis_usd,
      current_value: h.current_value_usd,
      current_value_usd: h.current_value_usd,
    })
    holdingsCreated++
  }

  const watchlist = withinFreePlan(
    loadFixture<WatchlistFixture>('watchlist.json'),
    FREE_LIMITS.maxCoins,
  )
  let watchlistCreated = 0
  for (const w of watchlist) {
    await create('crypto_watchlist', {
      user_id: userId,
      coin_id: null,
      symbol: w.symbol,
      name: w.name,
      added_at: new Date(w.added_at),
    })
    watchlistCreated++
  }

  const txs = loadFixture<TransactionFixture>('transactions.json')
  let transactionsCreated = 0
  for (const tx of txs) {
    // Schema CHECK constraint allows kind in (buy|sell|dividend|split)
    // — but the fixtures use a richer set (transfer_in/out, reward, fee).
    // We collapse the unknowns into 'buy' / 'sell' based on amount sign so
    // we don't violate the constraint while keeping the demo recognizable.
    let kind: 'buy' | 'sell' | 'dividend' | 'split' = 'buy'
    if (tx.kind === 'sell' || tx.kind === 'transfer_out' || tx.kind === 'fee') kind = 'sell'
    else if (tx.kind === 'reward') kind = 'dividend'
    await create('crypto_transactions', {
      user_id: userId,
      symbol: tx.symbol,
      kind,
      amount: Math.abs(tx.amount),
      price_usd: tx.price_usd,
      fee_usd: tx.fee_usd ?? 0,
      exchange: tx.exchange,
      total_usd: tx.total_usd,
      occurred_at: new Date(tx.occurred_at),
      notes: tx.notes ?? null,
    })
    transactionsCreated++
  }

  const alerts = withinFreePlan(loadFixture<AlertFixture>('alerts.json'), FREE_LIMITS.maxAlerts)
  let alertsCreated = 0
  for (const a of alerts) {
    await create('price_alerts', {
      user_id: userId,
      coin_id: null,
      symbol: a.symbol.toLowerCase(),
      condition:
        a.condition === 'change_24h_above'
          ? '24h_change_above'
          : a.condition === 'change_24h_below'
            ? '24h_change_above'
            : a.condition === 'volume_above'
              ? 'volume_spike'
              : a.condition,
      target_price: a.threshold,
      is_active: a.active,
      channels: JSON.stringify(['email']),
      repeat: 'one-time',
      notes: null,
      triggered_at: a.triggered_at ? new Date(a.triggered_at) : null,
      created_at: new Date(a.created_at),
    })
    alertsCreated++
  }

  const notifs = loadFixture<NotificationFixture>('notifications.json')
  let notificationsCreated = 0
  for (const n of notifs) {
    await create('notifications', {
      user_id: userId,
      type: n.type,
      title: n.title,
      body: n.body,
      href: n.href,
      unread: n.unread,
      created_at: new Date(n.created_at),
    })
    notificationsCreated++
  }

  return {
    holdingsCreated,
    watchlistCreated,
    transactionsCreated,
    alertsCreated,
    notificationsCreated,
  }
}
