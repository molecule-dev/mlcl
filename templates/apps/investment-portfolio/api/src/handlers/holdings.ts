import { type NextFunction, type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

interface AssetRow {
  symbol: string
  name?: string | null
  asset_class?: string | null
  description?: string | null
  last_price_cents?: number | string | null
  market_price_cents?: number | string | null
  fifty_two_week_high_cents?: number | string | null
  fifty_two_week_low_cents?: number | string | null
  pe_ratio?: number | string | null
  market_cap_cents?: number | string | null
  dividend_yield_pct?: number | string | null
  history_30d?: unknown
}

interface HoldingRow {
  id?: string
  user_id?: string
  symbol?: string
  name?: string | null
  asset_class?: string | null
  shares?: number | string | null
  avg_cost?: number | string | null
  cost_basis_cents?: number | string | null
  market_value_cents?: number | string | null
  current_price?: number | string | null
  pnl_cents?: number | string | null
  pnl_pct?: number | string | null
  allocation_pct?: number | string | null
  day_change_pct?: number | string | null
  asset_type?: string | null
  sector?: string | null
}

const num = (v: unknown, fallback = 0): number => {
  if (v == null) return fallback
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}

const numOrNull = (v: unknown): number | null => {
  if (v == null) return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

const isUuid = (s: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)

async function loadAssetCatalog(symbols: string[]): Promise<Record<string, AssetRow>> {
  const dedup = Array.from(new Set(symbols)).filter(Boolean)
  if (dedup.length === 0) return {}
  const rows = (await findMany<AssetRow>('assets', {
    where: [{ field: 'symbol', operator: 'in', value: dedup }],
  })) as AssetRow[]
  const out: Record<string, AssetRow> = {}
  for (const row of rows) if (row.symbol) out[row.symbol] = row
  return out
}

function enrichHolding(
  holding: HoldingRow,
  asset: AssetRow | undefined,
  totalValueCents = 0,
): Record<string, unknown> {
  const symbol = holding.symbol ?? asset?.symbol ?? ''
  const shares = num(holding.shares)
  const avgCost = num(holding.avg_cost)
  const lastPriceCentsFromAsset = num(asset?.last_price_cents)
  const currentPriceFromHolding = num(holding.current_price)

  const marketPriceCents =
    lastPriceCentsFromAsset > 0
      ? lastPriceCentsFromAsset
      : Math.round(currentPriceFromHolding * 100)
  const costBasisCents = Math.round(shares * avgCost * 100)
  const marketValueCents = Math.round(shares * marketPriceCents)
  const pnlCents = marketValueCents - costBasisCents
  const pnlPct = costBasisCents > 0 ? (pnlCents / costBasisCents) * 100 : 0
  const allocationPct = totalValueCents > 0 ? (marketValueCents / totalValueCents) * 100 : 0

  return {
    id: holding.id,
    user_id: holding.user_id,
    symbol,
    name: holding.name ?? asset?.name ?? symbol,
    asset_class: holding.asset_class ?? asset?.asset_class ?? 'equity',
    shares,
    avg_cost: avgCost,
    market_price_cents: marketPriceCents,
    last_price_cents: marketPriceCents,
    market_value_cents: marketValueCents,
    cost_basis_cents: costBasisCents,
    pnl_cents: pnlCents,
    pnl_pct: pnlPct,
    allocation_pct: allocationPct,
    day_change_pct: num(holding.day_change_pct, 0),
    dividend_yield_pct: numOrNull(asset?.dividend_yield_pct),
    fifty_two_week_high_cents: numOrNull(asset?.fifty_two_week_high_cents),
    fifty_two_week_low_cents: numOrNull(asset?.fifty_two_week_low_cents),
    pe_ratio: numOrNull(asset?.pe_ratio),
    market_cap_cents: numOrNull(asset?.market_cap_cents),
    history_30d: asset?.history_30d ?? null,
    description: asset?.description ?? null,
    sector: holding.sector ?? null,
    asset_type: holding.asset_type ?? 'stock',
  }
}

// When the URL parameter is a ticker symbol but the user has no holding yet,
// return a snapshot built from the public assets catalogue so the
// AssetDetail page renders fundamentals instead of a 404. Returns null if
// neither catalogue nor holding has the symbol.
async function buildAssetSnapshot(symbol: string): Promise<Record<string, unknown> | null> {
  const upper = symbol.toUpperCase()
  const asset = (await findOne<AssetRow>('assets', [
    { field: 'symbol', operator: '=', value: upper },
  ])) as AssetRow | null
  if (!asset) return null
  return enrichHolding({ symbol: upper, shares: 0 }, asset)
}

const createHoldingSchema = z.object({
  symbol: z.string().min(1),
  name: z.string().optional(),
  shares: z.number(),
  avg_cost: z.number().optional(),
  current_price: z.number().optional(),
  asset_type: z.string().optional(),
  asset_class: z.string().optional(),
  sector: z.string().optional(),
})

const updateHoldingSchema = z.object({
  shares: z.number().optional(),
  avg_cost: z.number().optional(),
  current_price: z.number().optional(),
  sector: z.string().optional(),
})

router.get('/', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized') })
      return
    }

    const holdings = (await findMany<HoldingRow>('holdings', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'symbol', direction: 'asc' }],
    })) as HoldingRow[]

    const assets = await loadAssetCatalog(holdings.map((h) => h.symbol ?? ''))
    const totalValueCents = holdings.reduce((sum, h) => {
      const last = num(assets[h.symbol ?? '']?.last_price_cents)
      const px = last > 0 ? last : Math.round(num(h.current_price) * 100)
      return sum + Math.round(num(h.shares) * px)
    }, 0)
    res.json(holdings.map((h) => enrichHolding(h, assets[h.symbol ?? ''], totalValueCents)))
  } catch (error) {
    logger.error('holdings list failed', error)
    next(error)
  }
})

router.get('/summary', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized') })
      return
    }

    const holdings = (await findMany<HoldingRow>('holdings', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
    })) as HoldingRow[]

    const assets = await loadAssetCatalog(holdings.map((h) => h.symbol ?? ''))
    let totalValueCents = 0
    let totalCostCents = 0
    for (const h of holdings) {
      const lastPrice = num(assets[h.symbol ?? '']?.last_price_cents)
      const priceCents = lastPrice > 0 ? lastPrice : Math.round(num(h.current_price) * 100)
      totalValueCents += Math.round(num(h.shares) * priceCents)
      totalCostCents += Math.round(num(h.shares) * num(h.avg_cost) * 100)
    }

    res.json({
      total_value_cents: totalValueCents,
      cost_basis_cents: totalCostCents,
      total_pnl_cents: totalValueCents - totalCostCents,
      total_pnl_pct:
        totalCostCents > 0 ? ((totalValueCents - totalCostCents) / totalCostCents) * 100 : 0,
      holding_count: holdings.length,
    })
  } catch (error) {
    logger.error('holdings/summary failed', error)
    next(error)
  }
})

// GET /api/holdings/:idOrSymbol — accept either a UUID id OR a ticker symbol.
// AssetDetail.tsx fetches `/api/holdings/${symbol}`; if the user has no
// holding for that symbol, we still return a real catalogue snapshot so the
// page renders fundamentals + price history instead of "Asset not found".
router.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized') })
      return
    }

    const idOrSymbol = getParamId(req)
    let holding: HoldingRow | null = null
    if (isUuid(idOrSymbol)) {
      holding = (await findById<HoldingRow>('holdings', idOrSymbol)) ?? null
      if (holding && holding.user_id !== userId) holding = null
    } else {
      holding = (await findOne<HoldingRow>('holdings', [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'symbol', operator: '=', value: idOrSymbol.toUpperCase() },
      ])) as HoldingRow | null
    }

    if (!holding) {
      const snapshot = await buildAssetSnapshot(idOrSymbol)
      if (!snapshot) {
        res.status(404).json({ error: t('holdings.notFound') })
        return
      }
      res.json(snapshot)
      return
    }
    const assets = await loadAssetCatalog([holding.symbol ?? ''])
    res.json(enrichHolding(holding, assets[holding.symbol ?? '']))
  } catch (error) {
    logger.error('holdings get failed', error)
    next(error)
  }
})

router.post(
  '/',
  validateBody(createHoldingSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({ error: t('auth.unauthorized') })
        return
      }

      const { symbol, name, shares, avg_cost, current_price, asset_type, asset_class, sector } =
        req.body as z.infer<typeof createHoldingSchema>
      const upperSymbol = symbol.toUpperCase()
      const cost = avg_cost ?? 0
      const price = current_price ?? cost

      const result = await create<HoldingRow>('holdings', {
        user_id: userId,
        symbol: upperSymbol,
        name: name ?? upperSymbol,
        shares,
        avg_cost: cost,
        avg_cost_cents: Math.round(cost * 100),
        cost_basis_cents: Math.round(shares * cost * 100),
        current_price: price,
        market_value_cents: Math.round(shares * price * 100),
        asset_type: asset_type ?? 'stock',
        asset_class: asset_class ?? 'equity',
        sector,
        created_at: new Date(),
      })

      // Record an opening "buy" transaction so the transactions journal
      // matches the holding row. Without this, any later sell (e.g. from
      // a rebalance run) would rebuildHoldingFromTransactions and see only
      // the sell — pushing shares negative and deleting the holding the
      // user just added. Use price_cents = avg_cost so cost-basis math
      // round-trips through the rebuild.
      if (shares > 0) {
        const occurredAt = new Date()
        await create('investment_transactions', {
          user_id: userId,
          symbol: upperSymbol,
          asset_name: name ?? upperSymbol,
          kind: 'buy',
          type: 'buy',
          shares,
          price_per_share: cost,
          price_cents: Math.round(cost * 100),
          fees: 0,
          fee_cents: 0,
          total_amount: shares * cost,
          total_cents: Math.round(shares * cost * 100),
          amount_cents: Math.round(shares * cost * 100),
          occurred_at: occurredAt,
          date: occurredAt,
          notes: 'Opening position',
          created_at: occurredAt,
        })
      }

      res.status(201).json((result as { data?: HoldingRow }).data ?? result)
    } catch (error) {
      logger.error('holdings create failed', error)
      next(error)
    }
  },
)

router.put(
  '/:id',
  validateBody(updateHoldingSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({ error: t('auth.unauthorized') })
        return
      }

      const id = getParamId(req)
      const existing = await findById<HoldingRow>('holdings', id)
      if (!existing || existing.user_id !== userId) {
        res.status(404).json({ error: t('holdings.notFound') })
        return
      }

      const { shares, avg_cost, current_price, sector } = req.body as z.infer<
        typeof updateHoldingSchema
      >
      const updates: Record<string, unknown> = {}
      if (shares !== undefined) updates.shares = shares
      if (avg_cost !== undefined) {
        updates.avg_cost = avg_cost
        updates.avg_cost_cents = Math.round(avg_cost * 100)
      }
      if (current_price !== undefined) updates.current_price = current_price
      if (sector !== undefined) updates.sector = sector

      const newShares = shares ?? num(existing.shares)
      const newAvgCost = avg_cost ?? num(existing.avg_cost)
      const newCurrentPrice = current_price ?? num(existing.current_price)
      updates.cost_basis_cents = Math.round(newShares * newAvgCost * 100)
      updates.market_value_cents = Math.round(newShares * newCurrentPrice * 100)

      const result = await updateById('holdings', id, updates)
      res.json((result as { data?: HoldingRow }).data ?? result)
    } catch (error) {
      logger.error('holdings update failed', error)
      next(error)
    }
  },
)

router.delete('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized') })
      return
    }

    const id = getParamId(req)
    const existing = await findById<HoldingRow>('holdings', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({ error: t('holdings.notFound') })
      return
    }

    await deleteById('holdings', id)
    res.status(204).end()
  } catch (error) {
    logger.error('holdings delete failed', error)
    next(error)
  }
})

export default router
