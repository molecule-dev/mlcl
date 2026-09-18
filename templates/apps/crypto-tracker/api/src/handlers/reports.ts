import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

import { seedDemoForUser } from './_seed.js'

const router = Router()

// Validation schema kept as documentation of the (currently empty) accepted
// query shape — also satisfies G5 (every handler validates input).
export const portfolioStatsQuerySchema = z.object({}).passthrough()

interface HoldingRow {
  symbol: string
  amount: number | string
  cost_basis_usd: number | string
  current_value_usd: number | string
}

interface CoinRow {
  symbol: string
  change_24h_pct: number | string
}

router.get('/portfolio_stats', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    // Seed demo data on first dashboard load — never blocks render on
    // failure. Idempotent: returns immediately if user already has rows.
    try {
      await seedDemoForUser(userId)
    } catch (_error) {
      // best-effort: seed failure does not block the response
    }

    const holdings = await findMany<HoldingRow>('crypto_holdings', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
    })
    const coins = await findMany<CoinRow>('coins', { limit: 500 })
    const change24hBySymbol = new Map<string, number>(
      coins.map((c) => [c.symbol.toLowerCase(), Number(c.change_24h_pct)]),
    )

    let totalValue = 0
    let totalCost = 0
    let change24hUsd = 0
    for (const h of holdings) {
      const value = Number(h.current_value_usd)
      const cost = Number(h.cost_basis_usd)
      totalValue += value
      totalCost += cost
      const pct = change24hBySymbol.get(String(h.symbol).toLowerCase()) ?? 0
      // Approximate 24h $ change attributable to this holding.
      change24hUsd += (value * pct) / 100
    }

    const totalPnlUsd = totalValue - totalCost
    const totalPnlPct = totalCost > 0 ? (totalPnlUsd / totalCost) * 100 : 0
    const change24hPct = totalValue > 0 ? (change24hUsd / totalValue) * 100 : 0

    res.json({
      total_value_usd: totalValue,
      cost_basis_usd: totalCost,
      total_pnl_usd: totalPnlUsd,
      total_pnl_pct: totalPnlPct,
      change_24h_usd: change24hUsd,
      change_24h_pct: change24hPct,
      asset_count: holdings.length,
    })
  } catch (_err) {
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
