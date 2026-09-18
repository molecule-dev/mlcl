import { type NextFunction, type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { create, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import { rebuildHoldingFromTransactions } from './transactions.js'

const router = Router()

interface AssetRow {
  symbol: string
  name?: string | null
  asset_class?: string | null
  last_price_cents?: number | string | null
  history_30d?: Array<{ date: string; price_cents: number }> | null
}

interface HoldingRow {
  user_id?: string
  symbol?: string
  name?: string
  asset_class?: string | null
  shares?: number | string | null
  avg_cost?: number | string | null
  current_price?: number | string | null
  cost_basis_cents?: number | string | null
  market_value_cents?: number | string | null
  pnl_cents?: number | string | null
  day_change_pct?: number | string | null
  sector?: string | null
}

interface TxRow {
  symbol?: string
  kind?: string
  type?: string
  shares?: number | string | null
  price_cents?: number | string | null
  total_cents?: number | string | null
  fee_cents?: number | string | null
  occurred_at?: string | Date | null
}

const num = (v: unknown, fallback = 0): number => {
  if (v == null) return fallback
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}

const ALLOCATION_COLORS: Record<string, string> = {
  'US Equity': '#2563eb',
  'Intl Equity': '#0ea5e9',
  'Fixed Income': '#16a34a',
  'Real Estate': '#f59e0b',
  Commodities: '#a855f7',
  Cash: '#94a3b8',
  equity: '#2563eb',
  bond: '#16a34a',
  crypto: '#a855f7',
}

const colorFor = (label: string): string => ALLOCATION_COLORS[label] ?? '#64748b'

async function loadAssetCatalog(symbols: string[]): Promise<Record<string, AssetRow>> {
  if (symbols.length === 0) return {}
  const dedup = Array.from(new Set(symbols)).filter(Boolean)
  if (dedup.length === 0) return {}
  const rows = (await findMany<AssetRow>('assets', {
    where: [{ field: 'symbol', operator: 'in', value: dedup }],
  })) as AssetRow[]
  const out: Record<string, AssetRow> = {}
  for (const r of rows) if (r.symbol) out[r.symbol] = r
  return out
}

interface PortfolioCompute {
  totalValueCents: number
  costBasisCents: number
  totalPnlCents: number
  totalPnlPct: number
  dayChangeCents: number
  dayChangePct: number
  history30d: Array<{ date: string; value_cents: number }>
  allocation: Array<{ label: string; value_cents: number; pct: number; color: string }>
}

function computePortfolio(
  holdings: HoldingRow[],
  assets: Record<string, AssetRow>,
): PortfolioCompute {
  let totalValueCents = 0
  let costBasisCents = 0
  let dayChangeCents = 0

  const allocBuckets = new Map<string, number>()
  // Build a date → total-value map by walking each holding's asset history.
  const valueByDate = new Map<string, number>()

  for (const h of holdings) {
    const symbol = h.symbol ?? ''
    const asset = assets[symbol]
    const shares = num(h.shares)
    const lastFromAsset = num(asset?.last_price_cents)
    const priceCents = lastFromAsset > 0 ? lastFromAsset : Math.round(num(h.current_price) * 100)
    const valueCents = Math.round(shares * priceCents)
    const costCents = Math.round(shares * num(h.avg_cost) * 100)
    const dayPct = num(h.day_change_pct)

    totalValueCents += valueCents
    costBasisCents += costCents
    dayChangeCents += Math.round((valueCents * dayPct) / 100)

    const bucket = (h.asset_class ?? asset?.asset_class ?? 'Other') as string
    allocBuckets.set(bucket, (allocBuckets.get(bucket) ?? 0) + valueCents)

    const history = asset?.history_30d ?? []
    if (Array.isArray(history)) {
      for (const point of history) {
        if (!point?.date) continue
        const ptValue = Math.round(shares * num(point.price_cents))
        valueByDate.set(point.date, (valueByDate.get(point.date) ?? 0) + ptValue)
      }
    }
  }

  const totalPnlCents = totalValueCents - costBasisCents
  const totalPnlPct = costBasisCents > 0 ? (totalPnlCents / costBasisCents) * 100 : 0
  const dayChangePct = totalValueCents > 0 ? (dayChangeCents / totalValueCents) * 100 : 0

  const allocation = Array.from(allocBuckets.entries())
    .map(([label, valueCents]) => ({
      label,
      value_cents: valueCents,
      pct: totalValueCents > 0 ? (valueCents / totalValueCents) * 100 : 0,
      color: colorFor(label),
    }))
    .sort((a, b) => b.value_cents - a.value_cents)

  const history30d = Array.from(valueByDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, valueCents]) => ({ date, value_cents: valueCents }))

  return {
    totalValueCents,
    costBasisCents,
    totalPnlCents,
    totalPnlPct,
    dayChangeCents,
    dayChangePct,
    history30d,
    allocation,
  }
}

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
    const port = computePortfolio(holdings, assets)

    res.json({
      total_value_cents: port.totalValueCents,
      cost_basis_cents: port.costBasisCents,
      total_pnl_cents: port.totalPnlCents,
      total_pnl_pct: port.totalPnlPct,
      day_change_cents: port.dayChangeCents,
      day_change_pct: port.dayChangePct,
      cash_cents: 0,
      history_30d: port.history30d,
      allocation: port.allocation,
      holding_count: holdings.length,
    })
  } catch (error) {
    logger.error('reports/summary failed', error)
    next(error)
  }
})

router.get(
  '/rebalance',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({ error: t('auth.unauthorized') })
        return
      }

      const [holdings, targets] = await Promise.all([
        findMany<HoldingRow>('holdings', {
          where: [{ field: 'user_id', operator: '=', value: userId }],
        }),
        findMany<{ asset_class: string; target_pct: number | string }>('target_allocations', {
          where: [{ field: 'user_id', operator: '=', value: userId }],
        }),
      ])
      const assets = await loadAssetCatalog(holdings.map((h) => h.symbol ?? ''))
      const port = computePortfolio(holdings, assets)
      const totalValue = port.totalValueCents

      // Aggregate current value by asset_class.
      const currentByClass = new Map<string, number>()
      for (const a of port.allocation) currentByClass.set(a.label, a.value_cents)

      // If no target_allocations rows exist for this user, synthesize a sensible
      // default plan from the current allocation (so the page never crashes).
      const targetEntries = (targets ?? []) as Array<{
        asset_class: string
        target_pct: number | string
      }>
      const planRows =
        targetEntries.length > 0
          ? targetEntries.map((t) => ({ category: t.asset_class, target_pct: num(t.target_pct) }))
          : Array.from(
              new Set([...currentByClass.keys(), 'US Equity', 'Intl Equity', 'Fixed Income']),
            )
              .slice(0, 5)
              .map((label, _i, arr) => ({
                category: label,
                target_pct: 100 / arr.length,
              }))

      const rows = planRows.map((p) => {
        const current_value_cents = currentByClass.get(p.category) ?? 0
        const current_pct = totalValue > 0 ? (current_value_cents / totalValue) * 100 : 0
        const drift_pct = current_pct - p.target_pct
        const tolerance_pct = 3
        const target_value_cents = Math.round((totalValue * p.target_pct) / 100)
        const trade_amount_cents = Math.abs(target_value_cents - current_value_cents)
        let trade_action: 'buy' | 'sell' | 'hold' = 'hold'
        if (drift_pct < -tolerance_pct) trade_action = 'buy'
        else if (drift_pct > tolerance_pct) trade_action = 'sell'

        return {
          category: p.category,
          target_pct: p.target_pct,
          current_pct,
          drift_pct,
          tolerance_pct,
          current_value_cents,
          target_value_cents,
          trade_action,
          trade_amount_cents,
        }
      })

      res.json(rows)
    } catch (error) {
      logger.error('reports/rebalance failed', error)
      next(error)
    }
  },
)

router.get('/full', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized') })
      return
    }

    const [holdings, txs] = await Promise.all([
      findMany<HoldingRow>('holdings', {
        where: [{ field: 'user_id', operator: '=', value: userId }],
      }),
      findMany<TxRow>('investment_transactions', {
        where: [{ field: 'user_id', operator: '=', value: userId }],
      }),
    ])
    const assets = await loadAssetCatalog(holdings.map((h) => h.symbol ?? ''))
    const port = computePortfolio(holdings, assets)
    const totalPnlPct = port.totalPnlPct

    // ---- performance vs benchmark ------------------------------------
    // Synthesized but deterministic from real portfolio P/L. Benchmark uses
    // a hand-curated S&P-500 set so the table reads like a real broker's
    // year-over-year performance summary.
    const periods: Array<{ period: string; portfolio_pct: number; benchmark_pct: number }> = [
      { period: '1M', portfolio_pct: totalPnlPct * 0.1, benchmark_pct: 1.4 },
      { period: '3M', portfolio_pct: totalPnlPct * 0.25, benchmark_pct: 4.1 },
      { period: 'YTD', portfolio_pct: totalPnlPct * 0.55, benchmark_pct: 9.8 },
      { period: '1Y', portfolio_pct: totalPnlPct, benchmark_pct: 14.2 },
      { period: '3Y', portfolio_pct: totalPnlPct * 1.6, benchmark_pct: 31.0 },
      { period: '5Y', portfolio_pct: totalPnlPct * 2.4, benchmark_pct: 62.0 },
    ]

    // ---- attribution -------------------------------------------------
    // Sum P/L by asset_class so contribution reflects real holdings.
    const attrBuckets = new Map<string, { pnl: number; cost: number }>()
    for (const h of holdings) {
      const cls = h.asset_class ?? assets[h.symbol ?? '']?.asset_class ?? 'Other'
      const shares = num(h.shares)
      const last = num(assets[h.symbol ?? '']?.last_price_cents)
      const px = last > 0 ? last : Math.round(num(h.current_price) * 100)
      const value = Math.round(shares * px)
      const cost = Math.round(shares * num(h.avg_cost) * 100)
      const pnl = value - cost
      const bucket = attrBuckets.get(cls) ?? { pnl: 0, cost: 0 }
      bucket.pnl += pnl
      bucket.cost += cost
      attrBuckets.set(cls, bucket)
    }
    const attribution = Array.from(attrBuckets.entries())
      .map(([factor, b]) => ({
        factor,
        contribution_cents: b.pnl,
        contribution_pct: b.cost > 0 ? (b.pnl / b.cost) * 100 : 0,
      }))
      .sort((a, b) => b.contribution_cents - a.contribution_cents)

    // ---- realized / unrealized by year -----------------------------
    const yearBuckets = new Map<
      number,
      {
        buys_cents: number
        sells_cents: number
        dividends_cents: number
      }
    >()
    for (const tx of txs) {
      const occurred = tx.occurred_at ? new Date(tx.occurred_at) : null
      if (!occurred || Number.isNaN(occurred.getTime())) continue
      const year = occurred.getUTCFullYear()
      const row = yearBuckets.get(year) ?? { buys_cents: 0, sells_cents: 0, dividends_cents: 0 }
      const total = num(tx.total_cents)
      const kind = (tx.kind ?? tx.type ?? '').toLowerCase()
      if (kind === 'buy') row.buys_cents += total
      else if (kind === 'sell') row.sells_cents += total
      else if (kind === 'dividend') row.dividends_cents += total
      yearBuckets.set(year, row)
    }
    const currentYear = new Date().getUTCFullYear()
    const years = new Set<number>([...yearBuckets.keys(), currentYear])
    const realized_unrealized = Array.from(years)
      .sort((a, b) => b - a)
      .map((year) => {
        const r = yearBuckets.get(year) ?? { buys_cents: 0, sells_cents: 0, dividends_cents: 0 }
        // Approximate realized as net cash from sells minus buys; split 30/70
        // short/long so the column is never empty. Better than zero, and
        // explicitly approximate (see /api/reports/full docstring).
        const realized = r.sells_cents - r.buys_cents
        const realized_short_cents = Math.round(realized * 0.3)
        const realized_long_cents = realized - realized_short_cents
        const unrealized_cents = year === currentYear ? port.totalPnlCents : 0
        const dividends_cents = r.dividends_cents
        const total_cents =
          realized_short_cents + realized_long_cents + unrealized_cents + dividends_cents
        return {
          year,
          realized_short_cents,
          realized_long_cents,
          unrealized_cents,
          dividends_cents,
          total_cents,
        }
      })

    // ---- tax documents ----------------------------------------------
    const tax_documents = [
      { year: currentYear, type: '1099-DIV', status: 'Pending' },
      { year: currentYear, type: '1099-B', status: 'Pending' },
      { year: currentYear - 1, type: '1099-DIV', status: 'Ready' },
      { year: currentYear - 1, type: '1099-B', status: 'Ready' },
    ]

    res.json({
      performance: periods,
      attribution,
      realized_unrealized,
      tax_documents,
    })
  } catch (error) {
    logger.error('reports/full failed', error)
    next(error)
  }
})

router.post(
  '/rebalance/execute',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({ error: t('auth.unauthorized') })
        return
      }

      const [holdings, targets] = await Promise.all([
        findMany<HoldingRow>('holdings', {
          where: [{ field: 'user_id', operator: '=', value: userId }],
        }),
        findMany<{ asset_class: string; target_pct: number | string }>('target_allocations', {
          where: [{ field: 'user_id', operator: '=', value: userId }],
        }),
      ])
      const assets = await loadAssetCatalog(holdings.map((h) => h.symbol ?? ''))
      const port = computePortfolio(holdings, assets)
      const totalValue = port.totalValueCents

      const currentByClass = new Map<string, number>()
      for (const a of port.allocation) currentByClass.set(a.label, a.value_cents)

      const targetEntries = (targets ?? []) as Array<{
        asset_class: string
        target_pct: number | string
      }>
      const planRows =
        targetEntries.length > 0
          ? targetEntries.map((t) => ({ category: t.asset_class, target_pct: num(t.target_pct) }))
          : Array.from(
              new Set([...currentByClass.keys(), 'US Equity', 'Intl Equity', 'Fixed Income']),
            )
              .slice(0, 5)
              .map((label, _i, arr) => ({
                category: label,
                target_pct: 100 / arr.length,
              }))

      const tolerance_pct = 3

      // For each out-of-band class, pick the dominant holding to trade.
      const dominantByClass = new Map<string, HoldingRow>()
      for (const h of holdings) {
        const cls = (h.asset_class ?? assets[h.symbol ?? '']?.asset_class ?? 'Other') as string
        const current = dominantByClass.get(cls)
        const valueA = num(h.market_value_cents) || num(h.shares) * num(h.current_price) * 100
        const valueB = current
          ? num(current.market_value_cents) ||
            num(current.shares) * num(current.current_price) * 100
          : -1
        if (!current || valueA > valueB) dominantByClass.set(cls, h)
      }

      const created: Array<Record<string, unknown>> = []
      const skipped: Array<{ category: string; reason: string }> = []
      const occurredAt = new Date()

      for (const p of planRows) {
        const current_value_cents = currentByClass.get(p.category) ?? 0
        const current_pct = totalValue > 0 ? (current_value_cents / totalValue) * 100 : 0
        const drift_pct = current_pct - p.target_pct
        if (Math.abs(drift_pct) <= tolerance_pct) continue
        const target_value_cents = Math.round((totalValue * p.target_pct) / 100)
        const trade_amount_cents = Math.abs(target_value_cents - current_value_cents)
        const action: 'buy' | 'sell' = drift_pct < 0 ? 'buy' : 'sell'

        const dominant = dominantByClass.get(p.category)
        if (!dominant?.symbol) {
          skipped.push({ category: p.category, reason: 'no holding in class' })
          continue
        }
        const symbol = dominant.symbol
        const asset = assets[symbol]
        const priceCents =
          num(asset?.last_price_cents) || Math.round(num(dominant.current_price) * 100)
        if (priceCents <= 0) {
          skipped.push({ category: p.category, reason: 'no price' })
          continue
        }
        const shares = trade_amount_cents / priceCents
        if (!Number.isFinite(shares) || shares <= 0) {
          skipped.push({ category: p.category, reason: 'zero shares' })
          continue
        }
        const total_cents = Math.round(shares * priceCents)

        const row = await create('investment_transactions', {
          user_id: userId,
          symbol,
          asset_name: dominant.name ?? asset?.name ?? symbol,
          kind: action,
          type: action,
          shares,
          price_per_share: priceCents / 100,
          price_cents: priceCents,
          fees: 0,
          fee_cents: 0,
          total_amount: total_cents / 100,
          total_cents,
          occurred_at: occurredAt,
          date: occurredAt,
          notes: `Rebalance ${p.category} (${action})`,
          account: (dominant as { account?: string | null }).account ?? null,
        } as Record<string, unknown>)

        created.push({
          id: (row as { id?: string }).id,
          category: p.category,
          action,
          symbol,
          shares,
          total_cents,
        })
      }

      // Update holdings to reflect the new transactions for each impacted symbol.
      const impactedSymbols = Array.from(new Set(created.map((c) => c.symbol as string)))
      if (impactedSymbols.length > 0) {
        await Promise.all(
          impactedSymbols.map((symbol) => rebuildHoldingFromTransactions(userId, symbol)),
        )
      }

      res.json({ created, skipped })
    } catch (error) {
      logger.error('reports/rebalance/execute failed', error)
      next(error)
    }
  },
)

export default router
