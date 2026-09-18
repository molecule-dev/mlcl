/**
 * Reviews handler — restaurant-scoped reviews authored by users.
 *
 * The molecule reviews resource (`@molecule/api-resource-review`) provides
 * a generic `(resourceType, resourceId, userId)` shape; we keep an
 * app-specific `restaurant_reviews` table because the discovery and detail
 * pages query reviews by `restaurant_id` directly, and the rating
 * recompute on create/update/delete is much simpler with a denormalised
 * column.
 *
 * Authorization: writes require the bearer token; PUT/DELETE checks the
 * row's `owner_id` against the session user. UNIQUE(restaurant_id, owner_id)
 * enforces the "one review per user per restaurant" inventory rule.
 */

import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import {
  count,
  create,
  deleteById,
  findById,
  findMany,
  findOne,
  updateById,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const createReviewSchema = z.object({
  restaurant_id: z.string().min(1),
  title: z.string().max(200).optional().default(''),
  rating: z.coerce.number().int().min(1).max(5),
  body: z.string().min(1).max(10_000),
  photos: z.array(z.string()).optional().default([]),
})

const updateReviewSchema = z.object({
  title: z.string().max(200).optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  body: z.string().min(1).max(10_000).optional(),
  photos: z.array(z.string()).optional(),
})

const listReviewsQuery = z.object({
  restaurant_id: z.string().optional(),
  user_id: z.string().optional(),
  sort_by: z.enum(['created_at', 'rating', 'helpful_count']).optional().default('created_at'),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
})

/** Recomputes the parent restaurant's rating + review_count after a write. */
async function recomputeRestaurantRating(restaurantId: string): Promise<void> {
  const rows = await findMany<{ rating: number }>('restaurant_reviews', {
    where: [{ field: 'restaurant_id', operator: '=', value: restaurantId }],
  })
  const reviewCount = rows.length
  const avg =
    reviewCount === 0 ? 0 : rows.reduce((sum, r) => sum + Number(r.rating), 0) / reviewCount
  await updateById('restaurants', restaurantId, {
    rating: Math.round(avg * 100) / 100,
    review_count: reviewCount,
    updated_at: new Date().toISOString(),
  })
}

// ---------------------------------------------------------------------------
// GET / — Public list (filterable by restaurant_id / user_id).
// ---------------------------------------------------------------------------

router.get('/', validateQuery(listReviewsQuery), async (req: Request, res: Response) => {
  try {
    const { restaurant_id, user_id, sort_by, sort_order, page, limit } =
      req.query as unknown as z.infer<typeof listReviewsQuery>
    const where: WhereCondition[] = []
    if (restaurant_id) where.push({ field: 'restaurant_id', operator: '=', value: restaurant_id })
    if (user_id) where.push({ field: 'owner_id', operator: '=', value: user_id })

    const reviews = await findMany('restaurant_reviews', {
      where,
      orderBy: [{ field: sort_by, direction: sort_order }],
      limit,
      offset: (page - 1) * limit,
    })
    const total = await count('restaurant_reviews', where)
    res.json({ data: reviews, total, page })
  } catch (error) {
    logger.error('reviews.list', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// ---------------------------------------------------------------------------
// GET /:id — Public read.
// ---------------------------------------------------------------------------

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const review = await findById('restaurant_reviews', req.params.id as string)
    if (!review) {
      return res
        .status(404)
        .json({ error: t('review.notFound', {}, { defaultValue: 'Review not found' }) })
    }
    res.json(review)
  } catch (error) {
    logger.error('reviews.get', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// ---------------------------------------------------------------------------
// POST / — Authenticated create (one per (restaurant, user)).
// ---------------------------------------------------------------------------

router.post('/', validateBody(createReviewSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const data = req.body as z.infer<typeof createReviewSchema>

    const existing = await findOne('restaurant_reviews', [
      { field: 'restaurant_id', operator: '=', value: data.restaurant_id },
      { field: 'owner_id', operator: '=', value: userId },
    ])
    if (existing) {
      return res.status(409).json({
        error: t('review.duplicate', {}, { defaultValue: 'You already reviewed this restaurant.' }),
      })
    }

    const result = await create('restaurant_reviews', {
      ...data,
      photos: JSON.stringify(data.photos ?? []),
      owner_id: userId,
      helpful_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    await recomputeRestaurantRating(data.restaurant_id)
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('reviews.create', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// ---------------------------------------------------------------------------
// PUT /:id — Owner-only update.
// ---------------------------------------------------------------------------

router.put('/:id', validateBody(updateReviewSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = req.params.id as string
    const existing = await findById<Record<string, unknown>>('restaurant_reviews', id)
    if (!existing) {
      return res
        .status(404)
        .json({ error: t('review.notFound', {}, { defaultValue: 'Review not found' }) })
    }
    if (existing.owner_id !== userId) {
      return res
        .status(403)
        .json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }
    const body = req.body as Partial<z.infer<typeof updateReviewSchema>>
    const updates: Record<string, unknown> = { ...body, updated_at: new Date().toISOString() }
    if (body.photos !== undefined) updates.photos = JSON.stringify(body.photos)
    const result = await updateById('restaurant_reviews', id, updates)
    await recomputeRestaurantRating(existing.restaurant_id as string)
    res.json(result.data)
  } catch (error) {
    logger.error('reviews.update', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// ---------------------------------------------------------------------------
// DELETE /:id — Owner-only delete.
// ---------------------------------------------------------------------------

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = req.params.id as string
    const existing = await findById<Record<string, unknown>>('restaurant_reviews', id)
    if (!existing) {
      return res
        .status(404)
        .json({ error: t('review.notFound', {}, { defaultValue: 'Review not found' }) })
    }
    if (existing.owner_id !== userId) {
      return res
        .status(403)
        .json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }
    await deleteById('restaurant_reviews', id)
    await recomputeRestaurantRating(existing.restaurant_id as string)
    res.status(204).send()
  } catch (error) {
    logger.error('reviews.delete', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
