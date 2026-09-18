import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId } from '@molecule/api-bonds-default-express'
import { findById, findMany, findOne } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateParams, validateQuery } from '@molecule/api-middleware-validation'
import { search } from '@molecule/api-search'

const router = Router()

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface CoinRow {
  id: string
  symbol: string
  name?: string
  market_cap_rank?: number | null
  current_price?: string | number
  market_cap_usd?: string | number
  volume_24h_usd?: string | number
  change_1h_pct?: string | number
  change_24h_pct?: string | number
  change_7d_pct?: string | number
  change_30d_pct?: string | number
  fully_diluted_valuation_usd?: string | number | null
  circulating_supply?: string | number | null
  total_supply?: string | number | null
  max_supply?: string | number | null
  ath_usd?: string | number | null
  atl_usd?: string | number | null
  sparkline_7d?: unknown
  history_30d?: unknown
  description?: string | null
  links?: unknown
}

function num(v: unknown): number {
  if (v === null || v === undefined) return 0
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

function asArray<T = unknown>(v: unknown): T[] {
  if (Array.isArray(v)) return v as T[]
  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v)
      return Array.isArray(parsed) ? (parsed as T[]) : []
    } catch (_error) {
      // invalid JSON: fall back to empty array
      return []
    }
  }
  return []
}

function asObject<T = Record<string, unknown>>(v: unknown): T {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as T
  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v)
      return parsed && typeof parsed === 'object' ? (parsed as T) : ({} as T)
    } catch (_error) {
      // invalid JSON: fall back to empty object
      return {} as T
    }
  }
  return {} as T
}

function decorateCoin(row: CoinRow): Record<string, unknown> {
  const price = num(row.current_price)
  return {
    id: row.id,
    symbol: row.symbol,
    name: row.name ?? '',
    rank: row.market_cap_rank ?? null,
    price_usd: price,
    current_price: price,
    market_cap_usd: num(row.market_cap_usd),
    volume_24h_usd: num(row.volume_24h_usd),
    change_1h_pct: num(row.change_1h_pct),
    change_24h_pct: num(row.change_24h_pct),
    change_7d_pct: num(row.change_7d_pct),
    change_30d_pct: num(row.change_30d_pct),
    fully_diluted_valuation_usd: num(row.fully_diluted_valuation_usd),
    circulating_supply: num(row.circulating_supply),
    total_supply: num(row.total_supply),
    max_supply:
      row.max_supply !== null && row.max_supply !== undefined ? num(row.max_supply) : null,
    ath_usd: num(row.ath_usd),
    atl_usd: num(row.atl_usd),
    sparkline_7d: asArray<number>(row.sparkline_7d),
    history_30d: asArray<{ ts: string; price_usd: number }>(row.history_30d),
    description: row.description ?? '',
    links: asObject<{ website?: string; whitepaper?: string; twitter?: string }>(row.links),
  }
}

/**
 * Resolve a coin row by either UUID or symbol. The UI links to
 * `/coin/:symbol` (e.g. `/coin/btc`), so the handler must accept lower-
 * cased symbols in addition to actual UUIDs. Returns null if neither
 * lookup hits.
 */
async function findCoinByIdOrSymbol(idOrSymbol: string): Promise<CoinRow | null> {
  if (UUID_RE.test(idOrSymbol)) {
    const row = await findById<CoinRow>('coins', idOrSymbol)
    if (row) return row
  }
  return await findOne<CoinRow>('coins', [
    { field: 'symbol', operator: '=', value: idOrSymbol.toLowerCase() },
  ])
}

const listMarketsQuerySchema = z.object({
  sort_by: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
})

const searchQuerySchema = z.object({
  q: z.string().min(1),
})

const idParamSchema = z.object({
  id: z.string().min(1),
})

const historyQuerySchema = z.object({
  interval: z.string().optional(),
  days: z.coerce.number().int().positive().max(365).optional(),
})

router.get('/', validateQuery(listMarketsQuerySchema), async (req: Request, res: Response) => {
  try {
    const { sort_by, order, limit, offset } = req.query as {
      sort_by?: string
      order?: 'asc' | 'desc'
      limit?: number
      offset?: number
    }

    const coins = await findMany<CoinRow>('coins', {
      orderBy: [{ field: sort_by ?? 'market_cap_rank', direction: order ?? 'asc' }],
      limit: limit ?? 100,
      offset: offset ?? 0,
    })

    res.json(coins.map(decorateCoin))
  } catch (err) {
    console.error('[crypto-tracker] markets handler failed', err)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.get('/search', validateQuery(searchQuerySchema), async (req: Request, res: Response) => {
  try {
    const { q } = req.query as { q: string }
    const results = await search('coins', { text: q, perPage: 20 })
    res.json(results)
  } catch (err) {
    console.error('[crypto-tracker] markets handler failed', err)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.get('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    // Coins are global / public-read by design (INVENTORY G6 — no IDOR
    // surface here because the resource has no owner_id; market data is
    // shared across all users). Lookup accepts either uuid or symbol so
    // /coin/:symbol routes work without a frontend pre-resolution call.
    const coin = await findCoinByIdOrSymbol(getParamId(req))
    if (!coin) {
      return res.status(404).json({ error: t('coins.notFound') })
    }
    res.json(decorateCoin(coin))
  } catch (err) {
    console.error('[crypto-tracker] markets handler failed', err)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.get(
  '/:id/history',
  validateParams(idParamSchema),
  validateQuery(historyQuerySchema),
  async (req: Request, res: Response) => {
    try {
      const { interval, days } = req.query as { interval?: string; days?: number }
      const coin = await findCoinByIdOrSymbol(getParamId(req))
      if (!coin) {
        return res.status(404).json({ error: t('coins.notFound') })
      }
      const history = await findMany('coin_price_history', {
        where: [
          { field: 'coin_id', operator: '=', value: coin.id },
          { field: 'interval', operator: '=', value: interval ?? '1h' },
        ],
        orderBy: [{ field: 'timestamp', direction: 'desc' }],
        limit: days ?? 30,
      })
      res.json(history)
    } catch (err) {
      console.error('[crypto-tracker] markets handler failed', err)
      res.status(500).json({ error: t('errors.internalServer') })
    }
  },
)

export default router
