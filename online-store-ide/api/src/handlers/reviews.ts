import { Router } from 'express'
import { z } from 'zod'

import type { WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const createReviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().min(1).max(200),
  body: z.string().min(1),
})

const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  title: z.string().min(1).max(200).optional(),
  body: z.string().min(1).optional(),
})

const router = Router()

// List reviews for a product
router.get('/product/:productId', async (req, res) => {
  try {
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 20

    const where: WhereCondition[] = [
      { field: 'product_id', operator: '=', value: req.params.productId },
      { field: 'status', operator: '=', value: 'approved' },
    ]

    const [reviews, total] = await Promise.all([
      findMany<Record<string, unknown>>('reviews', {
        where,
        limit,
        offset: (page - 1) * limit,
        orderBy: [{ field: 'created_at', direction: 'desc' }],
      }),
      count('reviews', where),
    ])

    // Calculate aggregate rating
    const allReviews = await findMany<Record<string, unknown>>('reviews', { where })
    const avgRating = allReviews.length
      ? allReviews.reduce((sum: number, r) => sum + (r.rating as number), 0) / allReviews.length
      : 0

    res.json({
      data: reviews,
      total,
      page,
      limit,
      aggregate: {
        averageRating: Math.round(avgRating * 10) / 10,
        totalReviews: allReviews.length,
      },
    })
  } catch (error) {
    logger.error('reviews.handler', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Create review
router.post('/', validateBody(createReviewSchema), async (req, res) => {
  try {
    const userId = res.locals.session?.userId as string
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const { productId, rating, title, body } = req.body

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        error: t('review.invalidRating', {}, { defaultValue: 'Rating must be between 1 and 5' }),
      })
    }

    // Verify user purchased this product
    const userOrders = await findMany<Record<string, unknown>>('orders', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'status', operator: '=', value: 'delivered' },
      ],
    })
    const userOrderIds = userOrders.map((o) => o.id as string)

    let hasPurchased = false
    if (userOrderIds.length > 0) {
      const orderItems = await findMany<Record<string, unknown>>('order_items', {
        where: [
          { field: 'product_id', operator: '=', value: productId },
          { field: 'order_id', operator: 'in', value: userOrderIds },
        ],
      })
      hasPurchased = orderItems.length > 0
    }

    if (!hasPurchased) {
      return res.status(403).json({
        error: t(
          'review.purchaseRequired',
          {},
          { defaultValue: 'You must purchase this product before reviewing' },
        ),
      })
    }

    // Check for existing review
    const existing = await findMany<Record<string, unknown>>('reviews', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'product_id', operator: '=', value: productId },
      ],
      limit: 1,
    })

    if (existing.length > 0) {
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
      rating,
      title,
      body,
      status: 'approved',
      created_at: new Date().toISOString(),
    })

    res.status(201).json(result.data)
  } catch (error) {
    logger.error('reviews.handler', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Update review
router.put('/:id', validateBody(updateReviewSchema), async (req, res) => {
  try {
    const id = req.params.id as string
    const userId = res.locals.session?.userId as string
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const review = await findById<Record<string, unknown>>('reviews', id)
    if (!review) {
      return res
        .status(404)
        .json({ error: t('review.notFound', {}, { defaultValue: 'Review not found' }) })
    }

    if (review.user_id !== userId) {
      return res
        .status(403)
        .json({ error: t('review.unauthorized', {}, { defaultValue: 'Not authorized' }) })
    }

    const { rating, title, body } = req.body
    const updates: Record<string, unknown> = {}
    if (rating !== undefined) updates.rating = rating
    if (title !== undefined) updates.title = title
    if (body !== undefined) updates.body = body

    const result = await updateById<Record<string, unknown>>('reviews', id, updates)
    res.json(result.data)
  } catch (error) {
    logger.error('reviews.handler', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Delete review
router.delete('/:id', async (req, res) => {
  try {
    const userId = res.locals.session?.userId as string
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const review = await findById<Record<string, unknown>>('reviews', req.params.id)
    if (!review) {
      return res
        .status(404)
        .json({ error: t('review.notFound', {}, { defaultValue: 'Review not found' }) })
    }

    if (review.user_id !== userId) {
      return res
        .status(403)
        .json({ error: t('review.unauthorized', {}, { defaultValue: 'Not authorized' }) })
    }

    await deleteById('reviews', req.params.id)
    res.status(204).send()
  } catch (error) {
    logger.error('reviews.handler', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
