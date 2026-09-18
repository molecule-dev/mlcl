import { Router } from 'express'
import { z } from 'zod'

import type { WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany, findOne } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

const listQuery = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
})

const createReviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().optional().default(''),
  body: z.string().optional().default(''),
})

const router = Router()

// List reviews for a product
router.get('/product/:productId', validateQuery(listQuery), async (req, res) => {
  try {
    const { page, limit } = req.query as unknown as z.infer<typeof listQuery>
    const where: WhereCondition[] = [
      { field: 'product_id', operator: '=', value: req.params.productId },
      { field: 'status', operator: '=', value: 'approved' },
    ]
    const [data, total] = await Promise.all([
      findMany<Record<string, unknown>>('reviews', {
        where,
        limit,
        offset: (page - 1) * limit,
        orderBy: [{ field: 'created_at', direction: 'desc' }],
      }),
      count('reviews', where),
    ])
    res.json({ data, total, page, limit })
  } catch (error) {
    logger.error('reviews.listForProduct', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// List reviews for a vendor
router.get('/vendor/:vendorId', validateQuery(listQuery), async (req, res) => {
  try {
    const { page, limit } = req.query as unknown as z.infer<typeof listQuery>
    const products = await findMany<Record<string, unknown>>('products', {
      where: [{ field: 'vendor_id', operator: '=', value: req.params.vendorId }],
      limit: 10000,
    })
    const productIds = products.map((p) => p.id as string)

    if (productIds.length === 0) {
      return res.json({
        data: [],
        total: 0,
        page,
        limit,
        aggregate: { averageRating: 0, totalReviews: 0 },
      })
    }

    const where: WhereCondition[] = [
      { field: 'product_id', operator: 'in', value: productIds },
      { field: 'status', operator: '=', value: 'approved' },
    ]
    const data = await findMany<Record<string, unknown>>('reviews', {
      where,
      limit,
      offset: (page - 1) * limit,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    const total = await count('reviews', where)

    const all = data
    const avgRating = all.length
      ? all.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / all.length
      : 0
    res.json({
      data,
      total,
      page,
      limit,
      aggregate: {
        averageRating: Math.round(avgRating * 10) / 10,
        totalReviews: total,
      },
    })
  } catch (error) {
    logger.error('reviews.listForVendor', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Create review (one per (user, product))
router.post('/', validateBody(createReviewSchema), async (req, res) => {
  try {
    const userId = res.locals.session?.userId as string
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('review.unauthorized', {}, { defaultValue: 'Not authorized' }) })
    }
    const { productId, rating, title, body } = req.body as z.infer<typeof createReviewSchema>

    const product = await findById<Record<string, unknown>>('products', productId)
    if (!product) {
      return res
        .status(404)
        .json({ error: t('product.notFound', {}, { defaultValue: 'Product not found' }) })
    }

    const existing = await findOne<Record<string, unknown>>('reviews', [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'product_id', operator: '=', value: productId },
    ])
    if (existing) {
      return res.status(409).json({
        error: t(
          'review.alreadyReviewed',
          {},
          { defaultValue: 'You already reviewed this product' },
        ),
      })
    }

    const result = await create<Record<string, unknown>>('reviews', {
      user_id: userId,
      product_id: productId,
      vendor_id: product.vendor_id ?? null,
      rating,
      title,
      body,
      status: 'approved',
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('reviews.create', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Delete review (owner only) — IDOR-safe via user_id match.
router.delete('/:id', async (req, res) => {
  try {
    const userId = res.locals.session?.userId as string
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('review.unauthorized', {}, { defaultValue: 'Not authorized' }) })
    }
    const reviewId = String(req.params.id)
    const review = await findById<Record<string, unknown>>('reviews', reviewId)
    if (!review || review.user_id !== userId) {
      return res
        .status(403)
        .json({ error: t('review.unauthorized', {}, { defaultValue: 'Not authorized' }) })
    }
    await deleteById('reviews', reviewId)
    res.status(204).send()
  } catch (error) {
    logger.error('reviews.delete', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
