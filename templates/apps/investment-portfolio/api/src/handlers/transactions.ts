import { type NextFunction, type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { create, deleteById, findById, findMany, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

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
}

interface AssetRow {
  symbol: string
  name?: string | null
  asset_class?: string | null
  last_price_cents?: number | string | null
}

interface TxRow {
  id?: string
  user_id?: string
  symbol?: string
  asset_name?: string | null
  type?: string
  kind?: string
  shares?: number | string | null
  price_per_share?: number | string | null
  price_cents?: number | string | null
  fees?: number | string | null
  fee_cents?: number | string | null
  total_amount?: number | string | null
  total_cents?: number | string | null
  amount_cents?: number | string | null
  occurred_at?: string | Date | null
  date?: string | Date | null
  notes?: string | null
  account?: string | null
  created_at?: string | Date | null
}

const num = (v: unknown, fallback = 0): number => {
  if (v == null) return fallback
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}

// pg returns NUMERIC columns as strings; the React UI calls
// `tx.shares.toFixed(4)` and friends, which throws on strings. Coerce the
// well-known numeric fields back to JS numbers before sending the wire
// response.
const coerceTx = (row: TxRow): Record<string, unknown> => ({
  ...row,
  shares: num(row.shares),
  price_per_share: num(row.price_per_share),
  price_cents: num(row.price_cents),
  fees: num(row.fees),
  fee_cents: num(row.fee_cents),
  total_amount: num(row.total_amount),
  total_cents: num(row.total_cents),
  amount_cents: num(row.amount_cents),
})

const createTransactionSchema = z.object({
  symbol: z.string().min(1),
  asset_name: z.string().optional(),
  type: z.enum(['buy', 'sell', 'dividend', 'split']).optional(),
  kind: z.enum(['buy', 'sell', 'dividend', 'split']).optional(),
  shares: z.number(),
  price_per_share: z.number().optional(),
  price_cents: z.number().optional(),
  fees: z.number().optional(),
  fee_cents: z.number().optional(),
  date: z.string().optional(),
  occurred_at: z.string().optional(),
  notes: z.string().optional(),
  account: z.string().optional(),
})

// Re-derive the holding row from the user's transactions for this symbol so
// shares + cost basis stay in sync after every POST/DELETE. Buys open cost lots
// at the trade price; sells relieve lots per the user's tax_method (FIFO relieves
// the oldest lots first, LIFO the newest). No realised P/L is recorded on the
// holding — that's a Reports concern. Dividends don't move the holding; a split
// rescales each lot's share count (cost unchanged).
export async function rebuildHoldingFromTransactions(
  userId: string,
  symbol: string,
): Promise<void> {
  const txs = (await findMany<TxRow>('investment_transactions', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'symbol', operator: '=', value: symbol },
    ],
    orderBy: [{ field: 'occurred_at', direction: 'asc' }],
  })) as TxRow[]

  // Lot-relief method from Settings. SpecID has no per-sale lot picker in the UI,
  // so it defaults to FIFO (the IRS default when no lots are identified). This
  // was previously a weighted average, so the setting had no effect at all.
  const settings = await findOne<{ tax_method?: string }>('user_settings', [
    { field: 'user_id', operator: '=', value: userId },
  ])
  const lifo = String(settings?.tax_method ?? 'FIFO').toUpperCase() === 'LIFO'

  const lots: Array<{ shares: number; costCents: number }> = []
  for (const tx of txs) {
    const kind = (tx.kind ?? tx.type ?? '').toLowerCase()
    const txShares = num(tx.shares)
    const txTotalCents = num(tx.total_cents) || Math.round(num(tx.price_per_share) * txShares * 100)
    if (kind === 'buy') {
      if (txShares > 0) lots.push({ shares: txShares, costCents: txTotalCents })
    } else if (kind === 'sell') {
      // Relieve `txShares` from the oldest (FIFO) or newest (LIFO) lots.
      let remaining = txShares
      while (remaining > 1e-9 && lots.length > 0) {
        const idx = lifo ? lots.length - 1 : 0
        const lot = lots[idx]
        if (lot.shares <= remaining + 1e-9) {
          remaining -= lot.shares
          lots.splice(idx, 1)
        } else {
          const costPerShare = lot.costCents / lot.shares
          lot.costCents = Math.max(0, lot.costCents - Math.round(costPerShare * remaining))
          lot.shares -= remaining
          remaining = 0
        }
      }
    } else if (kind === 'split') {
      // Treat shares field as the resulting multiplier (e.g. 2 = 2-for-1): each
      // lot's share count scales, its cost is unchanged.
      const ratio = txShares
      if (ratio > 0) for (const lot of lots) lot.shares *= ratio
    }
    // dividends don't touch shares or cost basis
  }
  const shares = Math.max(
    0,
    lots.reduce((s, l) => s + l.shares, 0),
  )
  const costCents = Math.max(
    0,
    lots.reduce((s, l) => s + l.costCents, 0),
  )
  const avgCost = shares > 0 ? costCents / 100 / shares : 0

  const existing = await findOne<HoldingRow>('holdings', [
    { field: 'user_id', operator: '=', value: userId },
    { field: 'symbol', operator: '=', value: symbol },
  ])

  if (shares <= 0) {
    if (existing?.id) await deleteById('holdings', existing.id)
    return
  }

  // Pull asset metadata so the holding has a sensible last price + name.
  const asset = (await findOne<AssetRow>('assets', [
    { field: 'symbol', operator: '=', value: symbol },
  ])) as AssetRow | null
  const lastPriceCents =
    num(asset?.last_price_cents) || Math.round(num(existing?.current_price) * 100)
  const currentPrice = lastPriceCents / 100
  const marketValueCents = Math.round(shares * lastPriceCents)

  const baseFields = {
    user_id: userId,
    symbol,
    name: existing?.name ?? asset?.name ?? symbol,
    asset_class: existing?.asset_class ?? asset?.asset_class ?? 'equity',
    asset_type: 'stock',
    shares,
    avg_cost: avgCost,
    avg_cost_cents: Math.round(avgCost * 100),
    cost_basis_cents: costCents,
    current_price: currentPrice,
    market_value_cents: marketValueCents,
    pnl_cents: marketValueCents - costCents,
    pnl_pct: costCents > 0 ? ((marketValueCents - costCents) / costCents) * 100 : 0,
  }

  if (existing?.id) {
    await updateById('holdings', existing.id, baseFields)
  } else {
    await create('holdings', { ...baseFields, created_at: new Date() })
  }
}

router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized') })
      return
    }

    const { symbol, type, kind, start_date, end_date, limit, offset } = req.query
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (symbol) where.push({ field: 'symbol', operator: '=', value: symbol })
    if (type) where.push({ field: 'type', operator: '=', value: type })
    if (kind) where.push({ field: 'kind', operator: '=', value: kind })
    if (start_date)
      where.push({ field: 'occurred_at', operator: '>=', value: new Date(start_date as string) })
    if (end_date) {
      const dt = new Date(end_date as string)
      dt.setUTCHours(23, 59, 59, 999)
      where.push({ field: 'occurred_at', operator: '<=', value: dt })
    }

    const orderBy: OrderBy[] = [{ field: 'occurred_at', direction: 'desc' }]

    const transactions = (await findMany<TxRow>('investment_transactions', {
      where,
      orderBy,
      limit: Number(limit) || 200,
      offset: Number(offset) || 0,
    })) as TxRow[]
    res.json(transactions.map(coerceTx))
  } catch (error) {
    logger.error('transactions list failed', error)
    next(error)
  }
})

router.get('/export', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized') })
      return
    }
    const txs = (await findMany<TxRow>('investment_transactions', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'occurred_at', direction: 'desc' }],
    })) as TxRow[]

    const header = 'date,kind,symbol,asset_name,shares,price_per_share,total,fees,account,notes'
    const rows = txs.map((tx) => {
      const date = tx.occurred_at ? new Date(tx.occurred_at).toISOString().slice(0, 10) : ''
      const kind = (tx.kind ?? tx.type ?? '').toLowerCase()
      const escape = (v: unknown): string => {
        let s = v == null ? '' : String(v)
        // [L2-1] Neutralize CSV/formula injection (CWE-1236): a cell starting with = + - @ or a
        // leading tab/CR is executed as a formula by Excel/Sheets/LibreOffice. Prefix a single
        // quote (the standard text marker, stripped on display) BEFORE RFC-4180 quoting; genuine
        // numbers are exempt so negative values aren't mangled (mirrors the shared csv escapeField).
        if (!/^-?\d+(\.\d+)?$/.test(s) && /^[=+\-@\t\r]/.test(s)) s = `'${s}`
        return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s
      }
      const dollar = (cents: unknown): string => (num(cents) / 100).toFixed(2)
      return [
        date,
        kind,
        escape(tx.symbol),
        escape(tx.asset_name ?? ''),
        num(tx.shares).toFixed(4),
        dollar(tx.price_cents),
        dollar(tx.total_cents),
        dollar(tx.fee_cents),
        escape(tx.account ?? ''),
        escape(tx.notes ?? ''),
      ].join(',')
    })

    const csv = [header, ...rows].join('\n')
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"')
    res.send(csv)
  } catch (error) {
    logger.error('transactions export failed', error)
    next(error)
  }
})

router.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized') })
      return
    }

    const id = getParamId(req)
    const tx = await findById<TxRow>('investment_transactions', id)
    if (!tx || tx.user_id !== userId) {
      res.status(404).json({ error: t('transactions.notFound') })
      return
    }
    res.json(coerceTx(tx))
  } catch (error) {
    logger.error('transactions get failed', error)
    next(error)
  }
})

router.post(
  '/',
  validateBody(createTransactionSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({ error: t('auth.unauthorized') })
        return
      }

      const {
        symbol,
        asset_name,
        type,
        kind,
        shares,
        price_per_share,
        price_cents,
        fees,
        fee_cents,
        date,
        occurred_at,
        notes,
        account,
      } = req.body as z.infer<typeof createTransactionSchema>

      const upperSymbol = symbol.toUpperCase()
      const effectiveKind = kind ?? type ?? 'buy'
      const pps = price_per_share ?? (price_cents != null ? price_cents / 100 : 0)
      const feesValue = fees ?? (fee_cents != null ? fee_cents / 100 : 0)
      const total = shares * pps + feesValue
      const occurred = occurred_at ? new Date(occurred_at) : date ? new Date(date) : new Date()

      const result = await create<TxRow>('investment_transactions', {
        user_id: userId,
        symbol: upperSymbol,
        asset_name: asset_name ?? upperSymbol,
        type: effectiveKind,
        kind: effectiveKind,
        shares,
        price_per_share: pps,
        price_cents: Math.round(pps * 100),
        fees: feesValue,
        fee_cents: Math.round(feesValue * 100),
        total_amount: total,
        total_cents: Math.round(total * 100),
        amount_cents: Math.round(total * 100),
        occurred_at: occurred,
        date: occurred,
        notes,
        account,
        created_at: new Date(),
      })

      await rebuildHoldingFromTransactions(userId, upperSymbol)

      const inserted = ((result as { data?: TxRow }).data ?? result) as TxRow
      res.status(201).json(coerceTx(inserted))
    } catch (error) {
      logger.error('transactions create failed', error)
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
    const existing = await findById<TxRow>('investment_transactions', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({ error: t('transactions.notFound') })
      return
    }
    await deleteById('investment_transactions', id)

    if (existing.symbol) {
      await rebuildHoldingFromTransactions(userId, existing.symbol)
    }

    res.status(204).end()
  } catch (error) {
    logger.error('transactions delete failed', error)
    next(error)
  }
})

export default router
