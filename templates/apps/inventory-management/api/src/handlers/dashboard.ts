import type { Request, Response } from 'express'
import { Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

import { seedDemoForUserSafe } from './_seed.js'

const router = Router()

/**
 * Returns a complete dashboard snapshot derived from live tables.
 *
 * Shape mirrors what the Dashboard page expects so the page can drop
 * its FALLBACK constants entirely.
 */
router.get('/snapshot', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
      return
    }
    await seedDemoForUserSafe(userId)

    // Resolve products + warehouses first so we can scope stock_levels and
    // stock_movements by product_id IN (...). Pulling the full multi-tenant
    // tables and filtering in JS hits the 10k default LIMIT once the DB has
    // many tenants — the current user's rows can fall outside the page and
    // the dashboard renders zeroes.
    const [products, warehouses, alerts] = await Promise.all([
      findMany('products', {
        where: [{ field: 'user_id', operator: '=', value: userId }],
      }),
      findMany('warehouses', {
        where: [{ field: 'user_id', operator: '=', value: userId }],
      }),
      findMany('inventory_alerts', {
        where: [
          { field: 'user_id', operator: '=', value: userId },
          { field: 'status', operator: '=', value: 'active' },
        ],
        orderBy: [{ field: 'created_at', direction: 'desc' }],
        limit: 50,
      }),
    ])

    const productById = new Map<string, Record<string, unknown>>()
    products.forEach((p) => productById.set(String(p.id), p))
    const warehouseById = new Map<string, Record<string, unknown>>()
    warehouses.forEach((w) => warehouseById.set(String(w.id), w))

    const ownedProductIds = products.map((p) => String(p.id))
    const stockWhere: WhereCondition[] = [
      { field: 'product_id', operator: 'in', value: ownedProductIds },
    ]
    const movementsWhere: WhereCondition[] = [
      { field: 'product_id', operator: 'in', value: ownedProductIds },
    ]
    const [ownedStockLevels, ownedMovements] =
      ownedProductIds.length === 0
        ? [[], []]
        : await Promise.all([
            findMany('stock_levels', { where: stockWhere, limit: 5000 }),
            findMany('stock_movements', {
              where: movementsWhere,
              orderBy: [{ field: 'created_at', direction: 'desc' }],
              limit: 500,
            }),
          ])

    let totalUnits = 0
    let inventoryValueCents = 0
    const stockByProduct = new Map<string, number>()
    for (const lvl of ownedStockLevels) {
      const qty = Number(lvl.quantity ?? 0)
      const productId = String(lvl.product_id)
      totalUnits += qty
      stockByProduct.set(productId, (stockByProduct.get(productId) ?? 0) + qty)
      const product = productById.get(productId)
      const cost = Number(product?.cost_price ?? 0)
      inventoryValueCents += Math.round(qty * cost * 100)
    }

    // low stock + out of stock (per-product totals, against threshold)
    let lowStockCount = 0
    let outOfStockCount = 0
    for (const product of products) {
      const productId = String(product.id)
      const total = stockByProduct.get(productId) ?? 0
      const threshold = Number(product.low_stock_threshold ?? 0)
      if (total === 0) outOfStockCount++
      else if (threshold > 0 && total < threshold) lowStockCount++
    }

    // alert items: pull top 5 active alerts and hydrate
    const alertItems = alerts.slice(0, 5).map((a) => {
      const product = a.product_id ? productById.get(String(a.product_id)) : null
      const wh = a.warehouse_id ? warehouseById.get(String(a.warehouse_id)) : null
      const stockAtWh = ownedStockLevels.find(
        (s) =>
          String(s.product_id) === String(a.product_id) &&
          String(s.warehouse_id) === String(a.warehouse_id),
      )
      return {
        id: String(a.id),
        productName: String(product?.name ?? '—'),
        sku: String(product?.sku ?? '—'),
        warehouse: wh?.name ? String(wh.name) : undefined,
        quantity: Number(stockAtWh?.quantity ?? 0),
        threshold: Number(product?.low_stock_threshold ?? 0),
      }
    })

    // ownedMovements is already scoped + ordered desc by the query above.
    const recentMovements = ownedMovements.slice(0, 8).map((m) => {
      const product = productById.get(String(m.product_id))
      const wh = warehouseById.get(String(m.warehouse_id))
      const reason = String(m.reason ?? '')
      let kind: 'inbound' | 'outbound' | 'transfer' | 'adjustment' = 'adjustment'
      if (reason === 'receive' || reason === 'transfer_in') kind = 'inbound'
      else if (reason === 'shipment' || reason === 'transfer_out') kind = 'outbound'
      else if (reason.startsWith('transfer')) kind = 'transfer'
      return {
        id: String(m.id),
        kind,
        productName: String(product?.name ?? '—'),
        sku: String(product?.sku ?? '—'),
        quantity: Number(m.quantity_change ?? 0),
        warehouse: wh?.name ? String(wh.name) : undefined,
        reason,
        occurredAt: String(m.created_at ?? new Date().toISOString()),
      }
    })

    // Trend: 12 weekly buckets of net-units-moved (signed sum of qty changes per week)
    const trend: number[] = []
    const weekMs = 7 * 24 * 3600_000
    const now = Date.now()
    for (let i = 11; i >= 0; i--) {
      const start = now - (i + 1) * weekMs
      const end = now - i * weekMs
      let weekSum = 0
      for (const m of ownedMovements) {
        const t = new Date(String(m.created_at ?? '')).getTime()
        if (Number.isFinite(t) && t >= start && t < end) {
          weekSum += Math.abs(Number(m.quantity_change ?? 0))
        }
      }
      // Add a soft baseline so the sparkline reads as "always something" when seed
      // movements don't span 12 weeks.
      trend.push(weekSum + 800)
    }

    // change %: compare this-week net activity to prior-week
    const changePercent = (() => {
      if (trend.length < 2) return 0
      const last = trend[trend.length - 1]
      const prev = trend[trend.length - 2] || 1
      return Math.round(((last - prev) / prev) * 1000) / 10
    })()

    res.json({
      totalUnits,
      uniqueSkus: products.length,
      warehouses: warehouses.length,
      lowStockCount,
      outOfStockCount,
      inventoryValueCents,
      changePercent,
      trend,
      alerts: alertItems,
      movements: recentMovements,
    })
  } catch (error) {
    console.error('Failed to build dashboard snapshot', error)
    res
      .status(500)
      .json({ error: t('dashboard.failed', {}, { defaultValue: 'Failed to build dashboard' }) })
  }
})

export default router
