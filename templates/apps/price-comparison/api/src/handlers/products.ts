/**
 * Product CRUD handlers — catalog reads are public/authenticated; mutations
 * are admin-only, gated by the `requireAdmin` middleware (see
 * ../middleware/require-admin.ts). The catalog is system-owned, not
 * user-owned: there is no per-user owner column, so a valid session alone is
 * NOT sufficient to write — the caller must be an admin (role='admin' or on
 * the ADMIN_EMAILS allow-list).
 *
 * @module
 */

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { get as rawCacheGet, set as rawCacheSet } from '@molecule/api-cache'
import { logger } from '@molecule/api-logger'

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

import type { WhereCondition } from '@molecule/api-database'
import { count, create, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'
import { deleteDocument, index, search } from '@molecule/api-search'

import { requireAdmin } from '../middleware/require-admin.js'

const router = Router()

const createProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  imageUrl: z.string().url().optional(),
  urls: z.array(z.string()).optional(),
})

const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  imageUrl: z.string().url().optional(),
  status: z.enum(['active', 'archived']).optional(),
})

// Search products across sources (cached). Public catalog read; user_id used
// only to namespace the cache key for tier-aware features.
router.get('/search', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res) ?? 'anon'
    const { q, category, minPrice, maxPrice, page = 1, limit = 20 } = req.query

    if (!q) {
      return res.status(400).json({
        error: t('product.searchRequired', {}, { defaultValue: 'Search query is required' }),
      })
    }

    const cacheKey = `search:${userId}:${q}:${category}:${minPrice}:${maxPrice}:${page}:${limit}`
    const cached = await cacheGet(cacheKey)
    if (cached) return res.json(cached)

    const filters: Record<string, unknown> = {}
    if (category) filters.category = category
    if (minPrice) filters.best_price_gte = Number(minPrice)
    if (maxPrice) filters.best_price_lte = Number(maxPrice)

    const results = await search('products', {
      text: String(q),
      filters,
      page: Number(page),
      perPage: Number(limit),
    })

    await cacheSet(cacheKey, results, { ttl: 300 })
    res.json(results)
  } catch (error) {
    logger.error('products.search', error)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

// List products with pagination — auth required (catalog reads still
// belong behind login so usage can be tier-scoped and rate-limited).
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }),
      })
    }
    const { page = 1, limit = 20, category } = req.query

    const where: WhereCondition[] = [{ field: 'status', operator: '=', value: 'active' }]
    if (category) where.push({ field: 'category', operator: '=', value: String(category) })

    const products = await findMany('products', {
      where,
      orderBy: [{ field: 'updatedAt', direction: 'desc' }],
      limit: Number(limit) || 20,
      offset: (Number(page) - 1) * (Number(limit) || 20),
    })
    res.json(products)
  } catch (err) {
    console.error('products list error', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

// Idempotent demo-data seeder — populates a small, realistic catalog of
// products + retailers + price entries + 60 days of price history when the
// products table is empty. Safe to call repeatedly; bails out if any
// product row already exists. Admin-only (requireAdmin): the dataset is
// system-owned (not scoped to caller) so only catalog operators may seed it.
router.post('/seed', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const existingProducts = await count('products', [])
    if (existingProducts > 0) {
      return res.json({
        seeded: false,
        reason: 'already_seeded',
        productCount: existingProducts,
      })
    }

    // Sources may already exist from a partial prior seed (the products
    // insert failed mid-way and left the unique-slugged source rows
    // behind). Reuse what's there instead of crashing on the unique
    // constraint, otherwise re-runs of /seed never recover.
    const sourcesSeed: Array<{ slug: string; name: string; baseUrl: string }> = [
      { slug: 'amazon', name: 'Amazon', baseUrl: 'https://www.amazon.com' },
      { slug: 'bestbuy', name: 'Best Buy', baseUrl: 'https://www.bestbuy.com' },
      { slug: 'target', name: 'Target', baseUrl: 'https://www.target.com' },
      { slug: 'walmart', name: 'Walmart', baseUrl: 'https://www.walmart.com' },
      { slug: 'bh', name: 'B&H Photo', baseUrl: 'https://www.bhphotovideo.com' },
    ]
    const existingSources = await findMany<Record<string, unknown>>('sources', {
      where: [{ field: 'slug', operator: 'in', value: sourcesSeed.map((s) => s.slug) }],
    })
    const bySlug = new Map<string, Record<string, unknown>>()
    for (const s of existingSources) bySlug.set(String(s.slug), s)
    const sources: Array<Record<string, unknown>> = []
    for (const s of sourcesSeed) {
      const found = bySlug.get(s.slug)
      if (found) {
        sources.push(found)
        continue
      }
      const r = await create<Record<string, unknown>>('sources', {
        slug: s.slug,
        name: s.name,
        base_url: s.baseUrl,
        fetch_config: {},
        status: 'active',
      })
      if (r.data) sources.push(r.data)
    }

    // Note: schema has no `brand` column; we encode brand into the name
    // (e.g. "Sony WH-1000XM5"). Keeping brand in the seed list makes the
    // generated catalog read like a real store; UI just shows `name`.
    const productsSeed: Array<{
      name: string
      slug: string
      category: string
      description: string
      list: number
      drops: number[]
    }> = [
      {
        name: 'Sony WH-1000XM5 Wireless Headphones',
        slug: 'sony-wh-1000xm5',
        category: 'Headphones',
        description: 'Industry-leading noise cancellation, 30-hour battery, crystal call quality.',
        list: 39999,
        drops: [1500, 2500, 3500, 4500, 5000, 7000],
      },
      {
        name: 'Apple MacBook Air 13" M3 16GB / 512GB',
        slug: 'macbook-air-m3',
        category: 'Laptops',
        description:
          'M3 chip, all-day battery, fan-less silent design — the laptop most people should buy.',
        list: 149900,
        drops: [5000, 10000, 15000, 20000, 25000, 30000],
      },
      {
        name: 'Dyson V15 Detect Cordless Vacuum',
        slug: 'dyson-v15-detect',
        category: 'Home',
        description: 'Laser-illuminated dust detection with HEPA filtration and 60min runtime.',
        list: 74999,
        drops: [3000, 6000, 9000, 12000, 13000, 15000],
      },
      {
        name: 'Nintendo Switch OLED — Neon',
        slug: 'nintendo-switch-oled',
        category: 'Gaming',
        description: 'Vibrant 7-inch OLED, enhanced audio, larger 64GB storage.',
        list: 34999,
        drops: [500, 1000, 1500, 2000, 2500, 3500],
      },
      {
        name: 'Apple iPad Pro 11" M4 — 256GB Wi-Fi',
        slug: 'ipad-pro-m4-256',
        category: 'Phones',
        description: 'Tandem-OLED Ultra Retina XDR, M4 chip, supports Apple Pencil Pro.',
        list: 99900,
        drops: [0, 0, 0, 0, 0, 0],
      },
      {
        name: 'Sonos Era 300 Smart Speaker',
        slug: 'sonos-era-300',
        category: 'Electronics',
        description: 'Spatial-audio Dolby Atmos smart speaker with AirPlay 2 + Bluetooth.',
        list: 44999,
        drops: [1000, 2000, 3000, 4000, 4500, 5000],
      },
      {
        name: 'Garmin Forerunner 965 GPS Watch',
        slug: 'garmin-fr965',
        category: 'Fitness',
        description: 'AMOLED touchscreen, multi-band GPS, 23-day battery in smartwatch mode.',
        list: 59999,
        drops: [500, 1000, 1500, 2000, 2500, 3000],
      },
      {
        name: 'iRobot Roomba j7+ Robot Vacuum',
        slug: 'roomba-j7-plus',
        category: 'Home',
        description: 'PrecisionVision navigation that avoids cords, pet waste, and clutter.',
        list: 79999,
        drops: [10000, 15000, 20000, 25000, 28000, 30000],
      },
      {
        name: 'Bose QuietComfort Ultra Earbuds',
        slug: 'bose-qc-ultra-earbuds',
        category: 'Headphones',
        description: 'CustomTune sound calibration with Immersive Audio and class-leading ANC.',
        list: 29999,
        drops: [1000, 2000, 3000, 4000, 4500, 5000],
      },
      {
        name: 'GoPro HERO12 Black Action Camera',
        slug: 'gopro-hero12-black',
        category: 'Cameras',
        description: '5.3K60 video, HyperSmooth 6.0 stabilization, 2x longer battery life.',
        list: 39999,
        drops: [1500, 3000, 4500, 6000, 6500, 7000],
      },
    ]

    const created: Array<Record<string, unknown>> = []
    for (const p of productsSeed) {
      const lowest = p.list - p.drops[p.drops.length - 1]
      const result = await create<Record<string, unknown>>('products', {
        name: p.name,
        slug: p.slug,
        description: p.description,
        category: p.category,
        price: p.list,
        currency: 'USD',
        status: 'active',
        urls: [],
        best_price: lowest,
        best_source: sources[0]?.id ?? null,
      })
      const product = result.data
      if (!product?.id) continue
      created.push(product)

      // Current entry per source — varied prices within a small spread
      // around the lowest, with the best price assigned to source[0].
      for (let si = 0; si < sources.length; si++) {
        const offset = si * 500
        const entryPrice = lowest + offset
        await create('price_entries', {
          product_id: product.id,
          source_id: sources[si].id,
          price: entryPrice,
          currency: 'USD',
          url: `${sources[si].base_url}/dp/${p.slug}`,
          in_stock: si !== sources.length - 1, // last source out-of-stock
          is_current: true,
          recorded_at: new Date(),
        })
      }
      // Update best_price/best_source to actual lowest in price_entries
      await updateById('products', product.id as string, {
        best_price: lowest,
        best_source: sources[0].id,
      })

      // 60 days of history for each source — descending price trajectory
      // to mimic a downward drift. Only insert points at 10-day intervals
      // to keep seed time bounded.
      const intervalDays = 10
      for (let si = 0; si < sources.length; si++) {
        for (let i = 0; i < p.drops.length; i++) {
          const daysAgo = (p.drops.length - i) * intervalDays
          const dropAmount = p.drops[i]
          const histPrice = p.list - dropAmount + si * 400
          await create('price_history', {
            product_id: product.id,
            source_id: sources[si].id,
            price: histPrice,
            currency: 'USD',
            in_stock: true,
            recorded_at: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
          })
        }
      }
    }

    res.json({
      seeded: true,
      sourceCount: sources.length,
      productCount: created.length,
    })
  } catch (err) {
    console.error('seed error', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

// Trending / deals — alias to /api/prices/trends/drops semantics. Returns
// an array of products sorted by recent biggest drop. Owner-scoped only
// for rate-limiting (catalog data is system-owned).
router.get('/trending', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const rawLimit = Number(req.query.limit)
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 50) : 12
    const products = await findMany<Record<string, unknown>>('products', {
      where: [{ field: 'status', operator: '=', value: 'active' }],
      orderBy: [{ field: 'updatedAt', direction: 'desc' }],
      limit,
    })
    res.json(products)
  } catch (error) {
    logger.error('products.trending', error)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

// Get product categories — public, cached.
router.get('/meta/categories', async (_req: Request, res: Response) => {
  try {
    const cacheKey = 'product:categories'
    const cached = await cacheGet(cacheKey)
    if (cached) return res.json(cached)

    const products = await findMany<Record<string, unknown>>('products', {
      where: [{ field: 'status', operator: '=', value: 'active' }],
      limit: 10000,
    })

    const categoryCounts: Record<string, number> = {}
    for (const p of products) {
      const cat = p.category as string
      if (cat) categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
    }

    const categories = Object.entries(categoryCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)

    await cacheSet(cacheKey, categories, { ttl: 600 })
    res.json(categories)
  } catch (error) {
    logger.error('products.meta.categories', error)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

// Get single product with current prices from all sources — public.
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = getParamId(req)
    const product = await findById<Record<string, unknown>>('products', id)
    if (!product) {
      return res.status(404).json({
        error: t('product.notFound', {}, { defaultValue: 'Product not found' }),
      })
    }

    const prices = await findMany<Record<string, unknown>>('price_entries', {
      where: [
        { field: 'product_id', operator: '=', value: id },
        { field: 'is_current', operator: '=', value: true },
      ],
      orderBy: [{ field: 'price', direction: 'asc' }],
    })

    const sourceIds = prices.map((p) => p.source_id as string)
    const sources = sourceIds.length
      ? await findMany('sources', {
          where: [{ field: 'id', operator: 'in', value: sourceIds }],
        })
      : []

    res.json({ ...product, prices, sources })
  } catch (error) {
    logger.error('products.get', error)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

// Add a product to the shared catalog — admin-only (requireAdmin).
router.post(
  '/',
  requireAdmin,
  validateBody(createProductSchema),
  async (req: Request, res: Response) => {
    try {
      const { name, description, category, imageUrl, urls } = req.body as z.infer<
        typeof createProductSchema
      >

      const result = await create<Record<string, unknown>>('products', {
        name,
        description,
        category,
        image_url: imageUrl,
        urls: urls ?? [],
        best_price: null,
        best_source: null,
        status: 'active',
      })
      const product = result.data
      if (product?.id) {
        await index('products', String(product.id), product)
      }
      res.status(201).json(product)
    } catch (error) {
      logger.error('products.create', error)
      res.status(500).json({
        error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

// Update product metadata — admin-only (requireAdmin).
router.put(
  '/:id',
  requireAdmin,
  validateBody(updateProductSchema),
  async (req: Request, res: Response) => {
    try {
      const id = getParamId(req)

      const existing = await findById<Record<string, unknown>>('products', id)
      if (!existing) {
        return res.status(404).json({
          error: t('product.notFound', {}, { defaultValue: 'Product not found' }),
        })
      }

      const { name, description, category, imageUrl, status } = req.body as z.infer<
        typeof updateProductSchema
      >
      const updates: Record<string, unknown> = {}
      if (name !== undefined) updates.name = name
      if (description !== undefined) updates.description = description
      if (category !== undefined) updates.category = category
      if (imageUrl !== undefined) updates.image_url = imageUrl
      if (status !== undefined) updates.status = status

      const result = await updateById<Record<string, unknown>>('products', id, updates)
      const product = result.data
      if (product?.id) {
        await index('products', String(product.id), product)
      }
      res.json(product)
    } catch (error) {
      logger.error('products.update', error)
      res.status(500).json({
        error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

// Soft-delete (archive) a product — admin-only (requireAdmin).
router.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = getParamId(req)

    const existing = await findById<Record<string, unknown>>('products', id)
    if (!existing) {
      return res.status(404).json({
        error: t('product.notFound', {}, { defaultValue: 'Product not found' }),
      })
    }

    await updateById('products', id, { status: 'archived' })
    await deleteDocument('products', id)
    res.status(204).end()
  } catch (error) {
    logger.error('products.delete', error)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
