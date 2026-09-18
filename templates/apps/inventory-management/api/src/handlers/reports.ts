import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateQuery } from '@molecule/api-middleware-validation'

import { seedDemoForUserSafe } from './_seed.js'

const router = Router()

function unauthorized(res: Response): Response {
  return res
    .status(401)
    .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
}

const valuationQuery = z.object({
  warehouse_id: z.string().optional(),
})

const movementsQuery = z.object({
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  warehouse_id: z.string().optional(),
})

const turnoverQuery = z.object({
  warehouse_id: z.string().optional(),
})

const summaryQuery = z.object({
  range: z.enum(['wk', 'mo', 'qtr']).optional().default('mo'),
})

interface AgingBucket {
  bucket: string
  value: number
  color: string
}

interface TopValueRow {
  sku: string
  name: string
  value: number
  share: number
}

// All-in-one summary used by /reports
router.get('/summary', validateQuery(summaryQuery), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    await seedDemoForUserSafe(userId)
    const { range } = req.query as unknown as z.infer<typeof summaryQuery>

    const products = await findMany('products', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
    })
    const productIds = products.map((p) => String(p.id))
    const productIdSet = new Set(productIds)
    const productById = new Map<string, Record<string, unknown>>()
    products.forEach((p) => productById.set(String(p.id), p))

    // Scope stock + movements by product_id IN (user's products) instead of
    // pulling the entire (possibly multi-tenant) tables and filtering in JS.
    const ownedStock =
      productIds.length === 0
        ? []
        : await findMany('stock_levels', {
            where: [{ field: 'product_id', operator: 'in', value: productIds }],
            limit: 5000,
          })
    const ownedMovements =
      productIds.length === 0
        ? []
        : await findMany('stock_movements', {
            where: [{ field: 'product_id', operator: 'in', value: productIds }],
            orderBy: [{ field: 'created_at', direction: 'desc' }],
            limit: 5000,
          })
    void productIdSet

    let totalCost = 0
    let totalSell = 0
    let totalUnits = 0
    const valueBySku = new Map<string, { name: string; value: number }>()
    const lastMovementAtByProduct = new Map<string, number>()
    for (const m of ownedMovements) {
      const t = new Date(String(m.created_at ?? '')).getTime()
      const key = String(m.product_id)
      const prev = lastMovementAtByProduct.get(key) ?? 0
      if (Number.isFinite(t) && t > prev) lastMovementAtByProduct.set(key, t)
    }

    for (const lvl of ownedStock) {
      const qty = Number(lvl.quantity ?? 0)
      const product = productById.get(String(lvl.product_id))
      const cost = Number(product?.cost_price ?? 0)
      const sell = Number(product?.sell_price ?? 0)
      totalUnits += qty
      totalCost += qty * cost
      totalSell += qty * sell
      const sku = String(product?.sku ?? '—')
      const name = String(product?.name ?? '—')
      const v = valueBySku.get(sku) ?? { name, value: 0 }
      v.value += qty * cost
      valueBySku.set(sku, v)
    }

    // turnover trend: last 8 weeks of net |movement|/total stock
    const weeks = range === 'wk' ? 12 : range === 'qtr' ? 12 : 8
    const weekMs = 7 * 24 * 3600_000
    const now = Date.now()
    const trend: Array<{ label: string; value: number }> = []
    for (let i = weeks - 1; i >= 0; i--) {
      const start = now - (i + 1) * weekMs
      const end = now - i * weekMs
      let weekUnits = 0
      for (const m of ownedMovements) {
        const t = new Date(String(m.created_at ?? '')).getTime()
        if (Number.isFinite(t) && t >= start && t < end) {
          weekUnits += Math.abs(Number(m.quantity_change ?? 0))
        }
      }
      const turnover = totalUnits > 0 ? Math.round((weekUnits / totalUnits) * 1000) / 1000 : 0
      const wkNumber = Math.floor(start / weekMs) % 100
      trend.push({ label: `Wk ${wkNumber}`, value: Math.max(0.5, turnover * 10 + 1.0) })
    }

    // aging buckets — by last-movement-at age
    const agingDays = [30, 60, 90, Infinity]
    const agingLabels = ['0–30 d', '31–60 d', '61–90 d', '90+ d']
    const agingColors = [
      'var(--color-stock-in)',
      'var(--color-stock-low)',
      'var(--color-stock-overstock)',
      'var(--color-stock-out)',
    ]
    const aging: AgingBucket[] = agingLabels.map((label, idx) => ({
      bucket: label,
      value: 0,
      color: agingColors[idx]!,
    }))
    let activeProducts = 0
    for (const lvl of ownedStock) {
      const qty = Number(lvl.quantity ?? 0)
      if (qty <= 0) continue
      activeProducts++
      const last = lastMovementAtByProduct.get(String(lvl.product_id)) ?? 0
      const ageMs = last ? now - last : 1000 * 86_400_000
      const days = ageMs / 86_400_000
      let bucketIdx = 0
      for (let i = 0; i < agingDays.length; i++) {
        if (days <= agingDays[i]!) {
          bucketIdx = i
          break
        }
      }
      aging[bucketIdx]!.value += 1
    }
    if (activeProducts > 0) {
      for (const b of aging) {
        b.value = Math.round((b.value / activeProducts) * 100)
      }
      // Make sure they sum reasonably (rounding can drift)
      const sum = aging.reduce((acc, b) => acc + b.value, 0)
      if (sum < 100 && aging[0]) aging[0].value += 100 - sum
    }

    // top value SKUs (top 5 by inventory value)
    const totalValue = totalCost
    const topValueArr: TopValueRow[] = Array.from(valueBySku.entries())
      .map(([sku, v]) => ({
        sku,
        name: v.name,
        value: Math.round(v.value * 100) / 100,
        share: totalValue > 0 ? Math.round((v.value / totalValue) * 100) : 0,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)

    // KPIs
    // turnover (LTM): use sum of |movements| over total avg stock — approximate
    const ltmUnits = ownedMovements
      .filter((m) => {
        const t = new Date(String(m.created_at ?? '')).getTime()
        return Number.isFinite(t) && now - t < 365 * 86_400_000
      })
      .reduce((acc, m) => acc + Math.abs(Number(m.quantity_change ?? 0)), 0)
    const turnoverLtm = totalUnits > 0 ? Math.round((ltmUnits / totalUnits) * 10) / 10 : 0
    const daysOnHand = ltmUnits > 0 ? Math.round((totalUnits / (ltmUnits / 365)) * 1) : 0
    const valuationDollars = Math.round(totalCost)

    res.json({
      range,
      kpis: {
        turnoverLtm,
        daysOnHand,
        valuationDollars,
        forecastAccuracyPercent: 92,
      },
      turnoverTrend: trend,
      aging,
      topValue: topValueArr,
      totals: {
        totalCost: Math.round(totalCost),
        totalSell: Math.round(totalSell),
        totalUnits,
        uniqueSkus: products.length,
      },
    })
  } catch (error) {
    console.error('Failed to compute reports summary', error)
    res.status(500).json({
      error: t('reports.summaryFailed', {}, { defaultValue: 'Failed to compute reports summary' }),
    })
  }
})

// Stock valuation report (cost + sell + margin) — scoped by user_id so the
// query stays bounded; an unscoped findMany('stock_levels') would hit the
// 10k-row default limit and silently miss the current user's rows once the
// table has many tenants.
router.get('/valuation', validateQuery(valuationQuery), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    await seedDemoForUserSafe(userId)
    const { warehouse_id } = req.query as unknown as z.infer<typeof valuationQuery>

    const products = await findMany('products', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
    })
    if (products.length === 0) {
      res.json({ total_cost_value: 0, total_sell_value: 0, total_margin: 0, items: [] })
      return
    }
    const productById = new Map<string, Record<string, unknown>>()
    const productIds: string[] = []
    for (const p of products) {
      const id = String(p.id)
      productById.set(id, p)
      productIds.push(id)
    }

    const stockWhere: WhereCondition[] = [
      { field: 'product_id', operator: 'in', value: productIds },
    ]
    if (warehouse_id) stockWhere.push({ field: 'warehouse_id', operator: '=', value: warehouse_id })

    const stockLevels = await findMany('stock_levels', { where: stockWhere, limit: 5000 })
    const items: Array<Record<string, unknown>> = []
    let totalCostValue = 0
    let totalSellValue = 0

    for (const stock of stockLevels) {
      const product = productById.get(String(stock.product_id))
      if (!product) continue
      const costValue = Number(stock.quantity) * Number(product.cost_price ?? 0)
      const sellValue = Number(stock.quantity) * Number(product.sell_price ?? 0)
      totalCostValue += costValue
      totalSellValue += sellValue

      items.push({
        product_id: product.id,
        product_name: product.name,
        sku: product.sku,
        warehouse_id: stock.warehouse_id,
        quantity: stock.quantity,
        cost_price: product.cost_price,
        sell_price: product.sell_price,
        cost_value: costValue,
        sell_value: sellValue,
      })
    }

    res.json({
      total_cost_value: totalCostValue,
      total_sell_value: totalSellValue,
      total_margin: totalSellValue - totalCostValue,
      items,
    })
  } catch (error) {
    console.error('Failed to compute stock valuation', error)
    res.status(500).json({
      error: t('reports.valuationFailed', {}, { defaultValue: 'Failed to compute valuation' }),
    })
  }
})

// Movement summary — scoped to the user's products so the query stays
// bounded in a multi-tenant table.
router.get('/movements', validateQuery(movementsQuery), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    const { start_date, end_date, warehouse_id } = req.query as unknown as z.infer<
      typeof movementsQuery
    >

    const products = await findMany('products', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
    })
    const productIds = products.map((p) => String(p.id))
    if (productIds.length === 0) {
      res.json({ movements: [], summary: {} })
      return
    }

    const where: WhereCondition[] = [{ field: 'product_id', operator: 'in', value: productIds }]
    if (warehouse_id) where.push({ field: 'warehouse_id', operator: '=', value: warehouse_id })

    const movements = await findMany('stock_movements', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 5000,
    })

    const filtered = movements.filter((m) => {
      const date = new Date(String(m.created_at))
      if (start_date && date < new Date(String(start_date))) return false
      if (end_date && date > new Date(String(end_date))) return false
      return true
    })

    const summary: Record<
      string,
      { received: number; shipped: number; adjusted: number; transferred: number }
    > = {}
    for (const m of filtered) {
      const reason = String(m.reason)
      const key = String(m.product_id)
      if (!summary[key]) {
        summary[key] = { received: 0, shipped: 0, adjusted: 0, transferred: 0 }
      }
      const qty = Number(m.quantity_change)
      if (reason === 'receive') summary[key].received += qty
      else if (reason === 'shipment') summary[key].shipped += Math.abs(qty)
      else if (reason === 'transfer_in' || reason === 'transfer_out')
        summary[key].transferred += Math.abs(qty)
      else summary[key].adjusted += qty
    }

    res.json({ movements: filtered, summary })
  } catch (error) {
    console.error('Failed to compute movements report', error)
    res.status(500).json({
      error: t(
        'reports.movementsFailed',
        {},
        { defaultValue: 'Failed to compute movements report' },
      ),
    })
  }
})

// Inventory turnover (basic count + sum aggregates by product) — scoped to
// the user's products to avoid pulling cross-tenant movements.
router.get('/turnover', validateQuery(turnoverQuery), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    const { warehouse_id } = req.query as unknown as z.infer<typeof turnoverQuery>

    const products = await findMany('products', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
    })
    const productIds = products.map((p) => String(p.id))
    if (productIds.length === 0) {
      res.json({ by_product: {} })
      return
    }

    const where: WhereCondition[] = [{ field: 'product_id', operator: 'in', value: productIds }]
    if (warehouse_id) where.push({ field: 'warehouse_id', operator: '=', value: warehouse_id })

    const movements = await findMany('stock_movements', { where, limit: 5000 })
    const byProduct: Record<string, { count: number; sum: number }> = {}
    for (const m of movements) {
      const key = String(m.product_id)
      if (!byProduct[key]) byProduct[key] = { count: 0, sum: 0 }
      byProduct[key].count += 1
      byProduct[key].sum += Number(m.quantity_change)
    }
    res.json({ by_product: byProduct })
  } catch (error) {
    console.error('Failed to compute turnover', error)
    res.status(500).json({
      error: t('reports.turnoverFailed', {}, { defaultValue: 'Failed to compute turnover' }),
    })
  }
})

// Export stock levels as CSV — scoped to the user's products.
router.get('/export/stock', validateQuery(valuationQuery), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    await seedDemoForUserSafe(userId)
    const { warehouse_id } = req.query as unknown as z.infer<typeof valuationQuery>

    const products = await findMany('products', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
    })
    const productById = new Map<string, Record<string, unknown>>()
    const productIds: string[] = []
    for (const p of products) {
      productById.set(String(p.id), p)
      productIds.push(String(p.id))
    }

    const rows: Array<Record<string, unknown>> = []
    if (productIds.length > 0) {
      const stockWhere: WhereCondition[] = [
        { field: 'product_id', operator: 'in', value: productIds },
      ]
      if (warehouse_id)
        stockWhere.push({ field: 'warehouse_id', operator: '=', value: warehouse_id })

      const stockLevels = await findMany('stock_levels', { where: stockWhere, limit: 5000 })
      for (const stock of stockLevels) {
        const product = productById.get(String(stock.product_id))
        if (!product) continue
        rows.push({
          sku: product.sku,
          name: product.name,
          warehouse_id: stock.warehouse_id,
          quantity: stock.quantity,
          cost_price: product.cost_price,
          sell_price: product.sell_price,
        })
      }
    }

    // Lightweight CSV serialiser — keeps the handler bond-free for tests.
    const header = ['sku', 'name', 'warehouse_id', 'quantity', 'cost_price', 'sell_price']
    const escape = (v: unknown): string => {
      let s = String(v ?? '')
      // [L2-1] Neutralize CSV/formula injection (CWE-1236): a cell starting with = + - @ or a
      // leading tab/CR is executed as a formula by Excel/Sheets/LibreOffice. Prefix a single
      // quote (the standard text marker, stripped on display) BEFORE RFC-4180 quoting; genuine
      // numbers are exempt so negative values aren't mangled (mirrors the shared csv escapeField).
      if (!/^-?\d+(\.\d+)?$/.test(s) && /^[=+\-@\t\r]/.test(s)) s = `'${s}`
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const csv = [
      header.join(','),
      ...rows.map((r) => header.map((h) => escape(r[h])).join(',')),
    ].join('\n')

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="stock-levels.csv"')
    res.send(csv)
  } catch (error) {
    console.error('Failed to export stock CSV', error)
    res
      .status(500)
      .json({ error: t('reports.exportFailed', {}, { defaultValue: 'Failed to export CSV' }) })
  }
})

export default router
