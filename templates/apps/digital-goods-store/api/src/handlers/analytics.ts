/**
 * Analytics handler — seller-side aggregates over a creator's products.
 *
 * `/seller`            → overall: revenue, sales, downloads, per-product breakdown.
 * `/product/:productId` → per-product: sales, revenue, downloads.
 *
 * Both require auth; product endpoint additionally enforces `creator_id`.
 */
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const periodSchema = z.object({
  period: z.enum(['7d', '30d', '90d', 'all']).default('30d'),
})

/**
 * Dashboard analytics — `/api/analytics`. Returns the headline metrics
 * the polished `Dashboard` page renders (this-month revenue, sparkline,
 * top products, etc.). Buyer-side users with no products see zeroed
 * fields, which the UI handles cleanly.
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const products = await findMany<Record<string, unknown>>('products', {
      where: [{ field: 'creator_id', operator: '=', value: userId }],
      limit: 1000,
    })
    const productIds = products.map((p) => p.id as string)
    let purchases: Record<string, unknown>[] = []
    let downloads: Record<string, unknown>[] = []
    if (productIds.length > 0) {
      purchases = await findMany<Record<string, unknown>>('purchases', {
        where: [
          { field: 'product_id', operator: 'in', value: productIds },
          { field: 'status', operator: '=', value: 'completed' },
        ],
        limit: 10000,
      })
      downloads = await findMany<Record<string, unknown>>('download_logs', {
        where: [{ field: 'product_id', operator: 'in', value: productIds }],
        limit: 10000,
      })
    }
    const toNum = (v: unknown): number => (typeof v === 'number' ? v : Number(v ?? 0))
    const totalRevenueCents = purchases.reduce((s, p) => s + toNum(p.amount), 0)
    const now = Date.now()
    const thirtyDaysAgo = now - 30 * 24 * 3600 * 1000
    const monthPurchases = purchases.filter(
      (p) => new Date(p.created_at as string).getTime() >= thirtyDaysAgo,
    )
    const monthRevenueCents = monthPurchases.reduce((s, p) => s + toNum(p.amount), 0)
    const sixtyDaysAgo = now - 60 * 24 * 3600 * 1000
    const prevMonthPurchases = purchases.filter((p) => {
      const t = new Date(p.created_at as string).getTime()
      return t >= sixtyDaysAgo && t < thirtyDaysAgo
    })
    const prevMonthRevenueCents = prevMonthPurchases.reduce((s, p) => s + toNum(p.amount), 0)
    const monthChangeCents = monthRevenueCents - prevMonthRevenueCents
    const monthChangePct =
      prevMonthRevenueCents > 0
        ? Math.round((monthChangeCents / prevMonthRevenueCents) * 1000) / 10
        : monthRevenueCents > 0
          ? 100
          : 0

    // Sparkline = last 12 days of revenue, in $ (rounded).
    const sparkline: number[] = []
    for (let i = 11; i >= 0; i -= 1) {
      const start = now - (i + 1) * 24 * 3600 * 1000
      const end = now - i * 24 * 3600 * 1000
      const dayTotal = purchases
        .filter((p) => {
          const t = new Date(p.created_at as string).getTime()
          return t >= start && t < end
        })
        .reduce((s, p) => s + toNum(p.amount), 0)
      sparkline.push(Math.round(dayTotal / 100))
    }

    const topProducts = products
      .map((product) => {
        const productPurchases = purchases.filter((p) => p.product_id === product.id)
        return {
          slug: (product.slug as string) ?? '',
          name: (product.name as string) ?? '',
          sales_count: productPurchases.length,
          revenue_cents: productPurchases.reduce((s, p) => s + toNum(p.amount), 0),
        }
      })
      .sort((a, b) => b.revenue_cents - a.revenue_cents)
      .slice(0, 5)

    const conversionPct =
      downloads.length > 0
        ? Math.round((purchases.length / Math.max(downloads.length, 1)) * 1000) / 10
        : 0

    res.json({
      totalRevenueCents,
      monthRevenueCents,
      monthChangeCents,
      monthChangePct,
      totalSales: purchases.length,
      totalDownloads: downloads.length,
      totalProducts: products.length,
      monthSales: monthPurchases.length,
      conversionPct,
      sparkline,
      topProducts,
    })
  } catch (err) {
    logger.error(err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/seller', validateQuery(periodSchema), async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const products = await findMany<Record<string, unknown>>('products', {
      where: [{ field: 'creator_id', operator: '=', value: userId }],
      limit: 10000,
    })
    const productIds = products.map((p) => p.id as string)

    let purchases: Record<string, unknown>[] = []
    let downloads: Record<string, unknown>[] = []
    if (productIds.length > 0) {
      purchases = await findMany<Record<string, unknown>>('purchases', {
        where: [
          { field: 'product_id', operator: 'in', value: productIds },
          { field: 'status', operator: '=', value: 'completed' },
        ],
        limit: 10000,
      })
      downloads = await findMany<Record<string, unknown>>('download_logs', {
        where: [{ field: 'product_id', operator: 'in', value: productIds }],
        limit: 10000,
      })
    }

    // BIGINT columns come back as strings from node-pg; coerce so the
    // aggregate is numeric (otherwise + concatenates).
    const toNum = (v: unknown): number => (typeof v === 'number' ? v : Number(v ?? 0))
    const totalRevenue = purchases.reduce((sum, p) => sum + toNum(p.amount), 0)
    const productStats = products
      .map((product) => {
        const productPurchases = purchases.filter((p) => p.product_id === product.id)
        return {
          id: product.id,
          name: product.name,
          sales: productPurchases.length,
          revenue: productPurchases.reduce((sum, p) => sum + toNum(p.amount), 0),
        }
      })
      .sort((a, b) => b.revenue - a.revenue)

    res.json({
      totalRevenue,
      totalSales: purchases.length,
      totalDownloads: downloads.length,
      totalProducts: products.length,
      productStats,
    })
  } catch (err) {
    logger.error('analytics.seller', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/product/:productId', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const owned = await findMany<Record<string, unknown>>('products', {
      where: [
        { field: 'id', operator: '=', value: getParamId(req, 'productId') },
        { field: 'creator_id', operator: '=', value: userId },
      ],
      limit: 1,
    })
    if (owned.length === 0) {
      res
        .status(404)
        .json({ error: t('product.notFound', undefined, { defaultValue: 'Product not found' }) })
      return
    }
    const purchases = await findMany<Record<string, unknown>>('purchases', {
      where: [
        { field: 'product_id', operator: '=', value: getParamId(req, 'productId') },
        { field: 'status', operator: '=', value: 'completed' },
      ],
      limit: 10000,
    })
    const downloads = await findMany<Record<string, unknown>>('download_logs', {
      where: [{ field: 'product_id', operator: '=', value: getParamId(req, 'productId') }],
      limit: 10000,
    })
    const toNum = (v: unknown): number => (typeof v === 'number' ? v : Number(v ?? 0))
    const revenue = purchases.reduce((sum, p) => sum + toNum(p.amount), 0)
    res.json({
      product: owned[0],
      sales: purchases.length,
      revenue,
      downloads: downloads.length,
    })
  } catch (err) {
    logger.error('analytics.product', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
