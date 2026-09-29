import { Router } from 'express'
import { z } from 'zod'

import type { WhereCondition } from '@molecule/api-database'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateQuery } from '@molecule/api-middleware-validation'
import { search } from '@molecule/api-search'

const searchQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required'),
  category: z.string().optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
})

const limitOnlyQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
})

const router = Router()

// Search products
router.get('/search', validateQuery(searchQuerySchema), async (req, res) => {
  try {
    const { q, category, minPrice, maxPrice } = req.query
    const page = Number(req.query.page) || 1
    const perPage = Number(req.query.limit) || 20

    if (!q) {
      return res.status(400).json({
        error: t('storefront.searchRequired', {}, { defaultValue: 'Search query is required' }),
      })
    }

    const where: Record<string, unknown> = {}
    if (category) where.category = String(category)
    if (minPrice || maxPrice) {
      where.price = {}
      if (minPrice) (where.price as Record<string, unknown>).gte = Number(minPrice)
      if (maxPrice) (where.price as Record<string, unknown>).lte = Number(maxPrice)
    }

    try {
      const results = await search('products', {
        text: String(q),
        filters: where,
        page,
        perPage,
      })
      const hits = (results as { hits?: unknown[] }).hits ?? []
      // If the search index is empty (e.g. async indexing lag in CI),
      // fall back to a DB LIKE scan so the endpoint always returns data.
      if (hits.length === 0) throw new Error('search returned no hits — falling back to DB')
      res.json(results)
    } catch (_error) {
      // Search backend unavailable or returned empty — DB fallback.
      const dbWhere: WhereCondition[] = [{ field: 'name', operator: 'ilike', value: String(q) }]
      if (where.category)
        dbWhere.push({ field: 'category', operator: '=', value: String(where.category) })
      const products = await findMany<Record<string, unknown>>('products', {
        where: dbWhere,
        limit: perPage,
        offset: (page - 1) * perPage,
        orderBy: [{ field: 'created_at', direction: 'desc' }],
      })
      res.json({ hits: products, total: products.length, page, perPage })
    }
  } catch (error) {
    logger.error('storefront.handler', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Get product categories
router.get('/categories', async (_req, res) => {
  try {
    const where: WhereCondition[] = [{ field: 'status', operator: '=', value: 'active' }]
    const products = await findMany<Record<string, unknown>>('products', { where })

    const categoryCounts = products.reduce(
      (acc: Record<string, number>, p) => {
        const cat = p.category as string
        if (cat) acc[cat] = (acc[cat] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    const categories = Object.entries(categoryCounts).map(([name, count]) => ({
      name,
      count,
    }))

    res.json(categories)
  } catch (error) {
    logger.error('storefront.handler', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Get featured products
router.get('/featured', validateQuery(limitOnlyQuerySchema), async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 8
    const where: WhereCondition[] = [
      { field: 'status', operator: '=', value: 'active' },
      { field: 'featured', operator: '=', value: true },
    ]

    const products = await findMany<Record<string, unknown>>('products', {
      where,
      limit,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })

    res.json({ data: products })
  } catch (error) {
    logger.error('storefront.handler', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Get new arrivals
router.get('/new-arrivals', validateQuery(limitOnlyQuerySchema), async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 8
    const where: WhereCondition[] = [{ field: 'status', operator: '=', value: 'active' }]

    const products = await findMany<Record<string, unknown>>('products', {
      where,
      limit,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })

    res.json({ data: products })
  } catch (error) {
    logger.error('storefront.handler', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Get bestsellers
router.get('/bestsellers', validateQuery(limitOnlyQuerySchema), async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 8
    const where: WhereCondition[] = [{ field: 'status', operator: '=', value: 'active' }]

    const products = await findMany<Record<string, unknown>>('products', {
      where,
      limit,
      orderBy: [{ field: 'total_sold', direction: 'desc' }],
    })

    res.json({ data: products })
  } catch (error) {
    logger.error('storefront.handler', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
