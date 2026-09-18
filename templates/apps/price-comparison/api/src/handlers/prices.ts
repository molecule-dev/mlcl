/**
 * Price-history + cross-source comparison + drop-trends handlers.
 *
 * Reads here are intentionally public/authenticated (catalog data is not
 * user-owned), so the userId is captured only for cache-key namespacing — it
 * is *never* used to grant access. Writes mutate the shared catalog and are
 * admin-only, gated by the `requireAdmin` middleware
 * (../middleware/require-admin.ts).
 *
 * @module
 */

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { get as rawCacheGet, set as rawCacheSet } from '@molecule/api-cache'
import { logger } from '@molecule/api-logger'

// Timed cache wrappers — Redis client can hang on connect failures, so cap
// every call at 1s and treat failures as cache misses.
const CACHE_OP_TIMEOUT_MS = 1000
const withTimeout = async <T>(p: Promise<T>): Promise<T | null> => {
  let timer: NodeJS.Timeout | undefined
  try {
    return (await Promise.race([
      p,
      new Promise<null>((_, reject) => {
        timer = setTimeout(() => reject(new Error('cache timeout')), CACHE_OP_TIMEOUT_MS)
      }),
    ])) as T | null
  } finally {
    if (timer) clearTimeout(timer)
  }
}
const cacheGet = async (key: string): Promise<unknown> => {
  try {
    return await withTimeout(rawCacheGet(key))
  } catch (_error) {
    // cache miss or connection failure; caller treats null as a cache miss
    return null
  }
}
const cacheSet = async (key: string, value: unknown, opts?: { ttl?: number }): Promise<void> => {
  try {
    await withTimeout(rawCacheSet(key, value, opts))
  } catch (_error) {
    // non-fatal: cache write failure degrades to uncached responses
  }
}
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { create, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import { requireAdmin } from '../middleware/require-admin.js'

const router = Router()

const recordPriceSchema = z.object({
  productId: z.string().uuid(),
  sourceId: z.string().uuid(),
  price: z.number().nonnegative(),
  currency: z.string().min(1).optional(),
  url: z.string().url().optional(),
  inStock: z.boolean().optional(),
})

const parsePeriod = (period: string): number => {
  const match = period.match(/^(\d+)([dhwmy])$/)
  if (!match) return 30
  const [, num, unit] = match
  const n = Number(num)
  switch (unit) {
    case 'd':
      return n
    case 'w':
      return n * 7
    case 'm':
      return n * 30
    case 'y':
      return n * 365
    default:
      return 30
  }
}

const calculatePriceStats = (
  entries: Record<string, unknown>[],
): {
  min: number
  max: number
  avg: number
  current: number
} => {
  if (!entries.length) return { min: 0, max: 0, avg: 0, current: 0 }
  const prices = entries.map((e) => Number(e.price))
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const avg = Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length)
  const current = prices[prices.length - 1]
  return { min, max, avg, current }
}

router.get('/history/:productId', async (req: Request, res: Response) => {
  try {
    // user_id captured for cache namespacing only — public read, no IDOR check needed.
    const userId = getUserId(res) ?? 'anon'
    const period = String(req.query.period ?? '30d')
    const sourceId = req.query.sourceId ? String(req.query.sourceId) : null
    const productId = getParamId(req, 'productId')

    const product = await findById('products', productId)
    if (!product) {
      return res
        .status(404)
        .json({ error: t('product.notFound', {}, { defaultValue: 'Product not found' }) })
    }

    const days = parsePeriod(period)
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const cacheKey = `price_history:${userId}:${productId}:${period}:${sourceId ?? 'all'}`
    const cached = await cacheGet(cacheKey)
    if (cached) return res.json(cached)

    const where = [
      { field: 'product_id', operator: '=' as const, value: productId },
      { field: 'recorded_at', operator: '>=' as const, value: since },
    ]
    if (sourceId) where.push({ field: 'source_id', operator: '=', value: sourceId })

    const history = await findMany<Record<string, unknown>>('price_history', {
      where,
      orderBy: [{ field: 'recorded_at', direction: 'asc' }],
      limit: 10000,
    })

    const result = {
      product,
      history,
      period,
      stats: calculatePriceStats(history),
    }

    await cacheSet(cacheKey, result, { ttl: 900 })
    res.json(result)
  } catch (error) {
    logger.error('prices.history', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/compare/:productId', async (req: Request, res: Response) => {
  try {
    const productId = getParamId(req, 'productId')
    const product = await findById('products', productId)
    if (!product) {
      return res
        .status(404)
        .json({ error: t('product.notFound', {}, { defaultValue: 'Product not found' }) })
    }

    const entries = await findMany<Record<string, unknown>>('price_entries', {
      where: [
        { field: 'product_id', operator: '=', value: productId },
        { field: 'is_current', operator: '=', value: true },
      ],
      orderBy: [{ field: 'price', direction: 'asc' }],
    })

    const enriched = await Promise.all(
      entries.map(async (entry) => ({
        ...entry,
        source: await findById('sources', entry.source_id as string),
      })),
    )

    res.json({
      product,
      prices: enriched,
      bestPrice: entries[0] ?? null,
    })
  } catch (error) {
    logger.error('prices.compare', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post(
  '/',
  requireAdmin,
  validateBody(recordPriceSchema),
  async (req: Request, res: Response) => {
    try {
      // Writes mutate the *shared* catalog (price rows belong to the catalog, not
      // the caller), so they are restricted to admins via requireAdmin — anonymous
      // and ordinary authenticated traffic cannot scribble arbitrary prices.
      const { productId, sourceId, price, currency, url, inStock } = req.body as z.infer<
        typeof recordPriceSchema
      >

      const product = await findById('products', productId)
      if (!product) {
        return res
          .status(404)
          .json({ error: t('product.notFound', {}, { defaultValue: 'Product not found' }) })
      }

      const source = await findById('sources', sourceId)
      if (!source) {
        return res
          .status(404)
          .json({ error: t('source.notFound', {}, { defaultValue: 'Source not found' }) })
      }

      const existingPrices = await findMany<Record<string, unknown>>('price_entries', {
        where: [
          { field: 'product_id', operator: '=', value: productId },
          { field: 'source_id', operator: '=', value: sourceId },
          { field: 'is_current', operator: '=', value: true },
        ],
        limit: 1,
      })
      if (existingPrices.length > 0) {
        const existing = existingPrices[0]
        await updateById('price_entries', existing.id as string, { is_current: false })
      }

      const result = await create('price_entries', {
        product_id: productId,
        source_id: sourceId,
        price: Math.round(price * 100),
        currency: currency || process.env.DEFAULT_CURRENCY || 'USD',
        url,
        in_stock: inStock !== false,
        is_current: true,
        recorded_at: new Date(),
      })

      await create('price_history', {
        product_id: productId,
        source_id: sourceId,
        price: Math.round(price * 100),
        currency: currency || process.env.DEFAULT_CURRENCY || 'USD',
        in_stock: inStock !== false,
        recorded_at: new Date(),
      })

      const allCurrentPrices = await findMany<Record<string, unknown>>('price_entries', {
        where: [
          { field: 'product_id', operator: '=', value: productId },
          { field: 'is_current', operator: '=', value: true },
          { field: 'in_stock', operator: '=', value: true },
        ],
        orderBy: [{ field: 'price', direction: 'asc' }],
        limit: 1,
      })
      if (allCurrentPrices.length > 0) {
        const best = allCurrentPrices[0]
        await updateById('products', productId, {
          best_price: best.price,
          best_source: best.source_id,
        })
      }

      res.status(201).json(result.data)
    } catch (error) {
      logger.error('prices.record', error)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.get('/trends/drops', async (req: Request, res: Response) => {
  try {
    // Authenticated catalog read — gated so anonymous traffic cannot
    // enumerate trending products and so per-tier rate limits can apply.
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    // Defensive clamp — NaN/negative inputs fall back to defaults rather
    // than blowing up the SQL `WHERE recorded_at >= <Invalid Date>` query.
    const rawLimit = Number(req.query.limit)
    const rawDays = Number(req.query.days)
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 10
    const days = Number.isFinite(rawDays) && rawDays > 0 ? Math.min(rawDays, 365) : 7
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    // Bypass the shared cache in test runs — E2E suites truncate Postgres
    // between tests but cannot easily flush Redis, so a leftover cache hit
    // from a prior test would echo stale productIds into the response.
    const useCache = process.env.NODE_ENV !== 'test'
    const cacheKey = `price_trends_drops:${days}:${limit}`
    if (useCache) {
      const cached = await cacheGet(cacheKey)
      if (cached) return res.json(cached)
    }

    const recentHistory = await findMany<Record<string, unknown>>('price_history', {
      where: [{ field: 'recorded_at', operator: '>=', value: since }],
      orderBy: [{ field: 'recorded_at', direction: 'desc' }],
      limit: 10000,
    })

    const productPrices: Record<
      string,
      { min: number; max: number; latest: number; productId: string }
    > = {}

    for (const entry of recentHistory) {
      const pid = entry.product_id as string
      const price = Number(entry.price)
      if (!productPrices[pid]) {
        productPrices[pid] = { min: price, max: price, latest: price, productId: pid }
      } else {
        productPrices[pid].min = Math.min(productPrices[pid].min, price)
        productPrices[pid].max = Math.max(productPrices[pid].max, price)
      }
    }

    const drops = Object.values(productPrices)
      .map((p) => ({
        productId: p.productId,
        drop: p.max - p.min,
        dropPercent: p.max > 0 ? ((p.max - p.min) / p.max) * 100 : 0,
        currentPrice: p.latest,
        highPrice: p.max,
      }))
      .filter((d) => d.drop > 0)
      .sort((a, b) => b.dropPercent - a.dropPercent)
      .slice(0, limit)

    const enriched = await Promise.all(
      drops.map(async (drop) => ({
        ...drop,
        product: await findById('products', drop.productId),
      })),
    )

    if (useCache) await cacheSet(cacheKey, enriched, { ttl: 600 })
    res.json(enriched)
  } catch (error) {
    logger.error('prices.trends.drops', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
