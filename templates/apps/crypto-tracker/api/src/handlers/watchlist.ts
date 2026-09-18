import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany, findOne } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import type { CryptoTrackerLimits } from '../tiers.js'

interface CoinSnapshot {
  symbol: string
  name: string
  current_price: number | string
  change_24h_pct: number | string
  market_cap_usd: number | string
}

const router = Router()

interface WatchlistRow {
  id: string
  user_id: string
}

const createWatchlistSchema = z.object({
  coin_id: z.string().optional(),
  symbol: z.string().min(1),
  name: z.string().optional(),
  target_price: z.coerce.number().nullable().optional(),
  alert_direction: z.string().optional(),
  notes: z.string().optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const rows = await findMany<{
      symbol: string
      name?: string | null
      added_at: Date | string
      id: string
    }>('crypto_watchlist', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'added_at', direction: 'desc' }],
    })
    // Decorate each watchlist row with the latest market snapshot so the
    // UI doesn't have to fetch /api/markets separately.
    const symbols = Array.from(new Set(rows.map((r) => r.symbol.toLowerCase())))
    const coinRows = symbols.length
      ? await findMany<CoinSnapshot>('coins', {
          where: [{ field: 'symbol', operator: 'in', value: symbols }],
        })
      : []
    const bySymbol = new Map(coinRows.map((c) => [c.symbol.toLowerCase(), c]))
    const decorated = rows.map((r) => {
      const c = bySymbol.get(r.symbol.toLowerCase())
      return {
        ...r,
        name: r.name ?? c?.name ?? r.symbol.toUpperCase(),
        price_usd: c ? Number(c.current_price) : 0,
        change_24h_pct: c ? Number(c.change_24h_pct) : 0,
        market_cap_usd: c ? Number(c.market_cap_usd) : 0,
      }
    })
    res.json(decorated)
  } catch (err) {
    console.error('[crypto-tracker] watchlist handler failed', err)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

// Enforce the per-tier watchlist-coin cap (tiers.ts maxCoins) — defined + shown on Pricing but never
// enforced, so any tier could watch unlimited coins.
const enforceWatchlistLimit = enforceLimit<CryptoTrackerLimits>({
  limitType: 'maxCoins',
  getLimit: (limits) => limits.maxCoins,
  getCurrent: async (userId) =>
    count('crypto_watchlist', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post(
  '/',
  enforceWatchlistLimit,
  validateBody(createWatchlistSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

      const incoming = { ...req.body }
      if (typeof incoming.symbol === 'string') incoming.symbol = incoming.symbol.toLowerCase()
      // Resolve a friendly name from the coin catalog if the caller didn't
      // supply one. Lets the UI pass just `{ symbol }` and still get a
      // proper row back.
      if (!incoming.name) {
        const coin = await findOne<{ name: string }>('coins', [
          { field: 'symbol', operator: '=', value: incoming.symbol },
        ])
        if (coin) incoming.name = coin.name
      }
      try {
        const result = await create('crypto_watchlist', {
          ...incoming,
          user_id: userId,
          added_at: new Date(),
        })
        res.status(201).json(result.data)
      } catch (err) {
        // crypto_watchlist_user_symbol_uq enforces one row per (user_id,symbol).
        // Treat re-add of an existing coin as success — the row already
        // captures the same intent, so the UI's optimistic add stays correct
        // without surfacing a 500.
        if (err && (err as { code?: string }).code === '23505') {
          const existing = await findOne('crypto_watchlist', [
            { field: 'user_id', operator: '=', value: userId },
            { field: 'symbol', operator: '=', value: incoming.symbol },
          ])
          return res.status(200).json(existing)
        }
        throw err
      }
    } catch (err) {
      console.error('[crypto-tracker] watchlist handler failed', err)
      res.status(500).json({ error: t('errors.internalServer') })
    }
  },
)

router.delete('/by-symbol/:symbol', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const symbol = String(req.params.symbol).toLowerCase()
    const row = await findOne<WatchlistRow>('crypto_watchlist', [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'symbol', operator: '=', value: symbol },
    ])
    if (!row) return res.status(404).json({ error: t('watchlist.notFound') })
    await deleteById('crypto_watchlist', row.id)
    res.status(204).end()
  } catch (err) {
    console.error('[crypto-tracker] watchlist handler failed', err)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const existing = await findById<WatchlistRow>('crypto_watchlist', getParamId(req))
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('watchlist.notFound') })
    }

    await deleteById('crypto_watchlist', getParamId(req))
    res.status(204).end()
  } catch (err) {
    console.error('[crypto-tracker] watchlist handler failed', err)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
