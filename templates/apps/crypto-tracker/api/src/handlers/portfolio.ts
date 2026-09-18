import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import {
  count,
  create,
  deleteById,
  findById,
  findMany,
  findOne,
  updateById,
} from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import type { CryptoTrackerLimits } from '../tiers.js'

interface CoinPriceRow {
  symbol: string
  current_price: number | string
}

async function lookupCoinPrice(symbol: string): Promise<number> {
  const row = await findOne<CoinPriceRow>('coins', [
    { field: 'symbol', operator: '=', value: symbol.toLowerCase() },
  ])
  return row ? Number(row.current_price) : 0
}

const router = Router()

interface HoldingRow {
  id: string
  user_id: string
  coin_id: string | null
  symbol: string
  name?: string | null
  amount: number | string
  avg_buy_price: number | string
  total_cost: number | string
  cost_basis_usd: number | string
  current_value: number | string
  current_value_usd: number | string
}

const createHoldingSchema = z.object({
  coin_id: z.string().optional(),
  symbol: z.string().min(1),
  name: z.string().optional(),
  amount: z.coerce.number().nonnegative(),
  // Accept either avg_buy_price (per-unit) OR cost_basis_usd (total spent)
  // — the UI sends total cost and computes avg from amount.
  avg_buy_price: z.coerce.number().nonnegative().optional(),
  cost_basis_usd: z.coerce.number().nonnegative().optional(),
})

const updateHoldingSchema = z.object({
  amount: z.coerce.number().nonnegative().optional(),
  avg_buy_price: z.coerce.number().nonnegative().optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const holdings = await findMany<HoldingRow>('crypto_holdings', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'current_value', direction: 'desc' }],
    })

    // Decorate each row with derived numbers the UI expects
    // (pnl_usd / pnl_pct / allocation_pct). Doing this in the API keeps
    // every page consistent and avoids subtle divide-by-zero / NaN
    // surprises in components.
    const totalValue = holdings.reduce((sum, h) => sum + Number(h.current_value_usd), 0)
    const decorated = holdings.map((h) => {
      const value = Number(h.current_value_usd)
      const cost = Number(h.cost_basis_usd)
      const pnl = value - cost
      const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0
      const allocation = totalValue > 0 ? (value / totalValue) * 100 : 0
      return {
        ...h,
        amount: Number(h.amount),
        avg_buy_price: Number(h.avg_buy_price),
        total_cost: Number(h.total_cost),
        cost_basis_usd: cost,
        current_value: value,
        current_value_usd: value,
        pnl_usd: pnl,
        pnl_pct: pnlPct,
        allocation_pct: allocation,
      }
    })
    res.json(decorated)
  } catch (err) {
    console.error('[crypto-tracker] portfolio handler failed', err)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.get('/summary', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const holdings = await findMany<HoldingRow>('crypto_holdings', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
    })

    const totalValue = holdings.reduce((sum, h) => sum + Number(h.current_value), 0)
    const totalCost = holdings.reduce((sum, h) => sum + Number(h.total_cost), 0)

    res.json({
      total_value: totalValue,
      total_cost: totalCost,
      total_gain_loss: totalValue - totalCost,
      total_gain_loss_pct: totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0,
      holding_count: holdings.length,
    })
  } catch (err) {
    console.error('[crypto-tracker] portfolio handler failed', err)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

// Enforce the per-tier portfolio-holding cap (tiers.ts maxPortfolio) — defined + shown on Pricing but
// never enforced, so any tier could add unlimited holdings.
const enforceHoldingLimit = enforceLimit<CryptoTrackerLimits>({
  limitType: 'maxPortfolio',
  getLimit: (limits) => limits.maxPortfolio,
  getCurrent: async (userId) =>
    count('crypto_holdings', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post(
  '/',
  enforceHoldingLimit,
  validateBody(createHoldingSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

      const { coin_id, symbol, name, amount, avg_buy_price, cost_basis_usd } = req.body
      const amt = Number(amount)
      const totalCost =
        cost_basis_usd !== undefined
          ? Number(cost_basis_usd)
          : avg_buy_price !== undefined
            ? amt * Number(avg_buy_price)
            : 0
      const avg = amt > 0 ? totalCost / amt : 0
      // Resolve current price from the global coin catalog so the holding
      // shows a non-zero current value in the table the moment it lands.
      // Without this every new holding would render as $0 / -100% P/L until
      // a separate refresh job kicked in.
      const sym = String(symbol).toLowerCase()
      const price = await lookupCoinPrice(sym)
      let resolvedName = name ?? null
      if (!resolvedName) {
        const coinRow = await findOne<{ name: string }>('coins', [
          { field: 'symbol', operator: '=', value: sym },
        ])
        if (coinRow) resolvedName = coinRow.name
      }
      const currentValue = amt * price
      try {
        const result = await create<HoldingRow>('crypto_holdings', {
          user_id: userId,
          coin_id: coin_id ?? null,
          symbol: sym,
          name: resolvedName,
          amount: amt,
          avg_buy_price: avg,
          total_cost: totalCost,
          cost_basis_usd: totalCost,
          current_value: currentValue,
          current_value_usd: currentValue,
          created_at: new Date(),
        })
        res.status(201).json(result.data)
      } catch (err) {
        // crypto_holdings_user_symbol_uq enforces one row per (user,symbol).
        // On a duplicate, fold the new buy into the existing position by
        // averaging the cost basis — matches what a user expects when they
        // add another lot of a coin they already hold.
        if (err && (err as { code?: string }).code === '23505') {
          const existing = await findOne<HoldingRow>('crypto_holdings', [
            { field: 'user_id', operator: '=', value: userId },
            { field: 'symbol', operator: '=', value: sym },
          ])
          if (existing) {
            const newAmount = Number(existing.amount) + amt
            const newCost = Number(existing.cost_basis_usd) + totalCost
            const newAvg = newAmount > 0 ? newCost / newAmount : 0
            const newCurrentValue = newAmount * price
            const updated = await updateById('crypto_holdings', existing.id, {
              amount: newAmount,
              avg_buy_price: newAvg,
              total_cost: newCost,
              cost_basis_usd: newCost,
              current_value: newCurrentValue,
              current_value_usd: newCurrentValue,
            })
            return res.status(200).json(updated.data)
          }
        }
        throw err
      }
    } catch (err) {
      console.error('[crypto-tracker] portfolio handler failed', err)
      res.status(500).json({ error: t('errors.internalServer') })
    }
  },
)

router.put('/:id', validateBody(updateHoldingSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const existing = await findById<HoldingRow>('crypto_holdings', getParamId(req))
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('portfolio.notFound') })
    }

    const amount = req.body.amount !== undefined ? Number(req.body.amount) : Number(existing.amount)
    const avg =
      req.body.avg_buy_price !== undefined
        ? Number(req.body.avg_buy_price)
        : Number(existing.avg_buy_price)
    const totalCost = amount * avg

    const updated = await updateById('crypto_holdings', getParamId(req), {
      amount,
      avg_buy_price: avg,
      total_cost: totalCost,
      cost_basis_usd: totalCost,
    })
    res.json(updated.data)
  } catch (err) {
    console.error('[crypto-tracker] portfolio handler failed', err)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const existing = await findById<HoldingRow>('crypto_holdings', getParamId(req))
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('portfolio.notFound') })
    }

    await deleteById('crypto_holdings', getParamId(req))
    res.status(204).end()
  } catch (err) {
    console.error('[crypto-tracker] portfolio handler failed', err)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
