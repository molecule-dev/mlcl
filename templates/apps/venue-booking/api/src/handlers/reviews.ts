/**
 * Reviews handler — venue + host reviews left by guests after stays.
 *
 * GET /reviews        — public list scoped by venue_id
 * POST /reviews       — auth + tier-gated create
 * PUT /reviews/:id    — auth + ownership (author edits own review)
 * DELETE /reviews/:id — auth + ownership (author removes own review)
 */
import type { Request, RequestHandler, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import type { FindManyOptions, WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

import type { VenueBookingLimits } from '../tiers.js'
import { decorateReviews } from './_decorate.js'

const router = Router()

const createReviewSchema = z.object({
  venue_id: z.string().min(1).optional(),
  resourceType: z.string().optional(),
  resourceId: z.string().optional(),
  booking_id: z.string().optional(),
  rating: z.number().int().min(1).max(5),
  title: z.string().min(1).max(200).optional().default(''),
  body: z.string().min(1),
})

const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  title: z.string().min(1).max(200).optional(),
  body: z.string().min(1).optional(),
})

const listReviewsQuery = z.object({
  venue_id: z.string().optional(),
  resourceId: z.string().optional(),
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(10),
})

router.get('/', validateQuery(listReviewsQuery), async (req: Request, res: Response) => {
  try {
    const { venue_id, resourceId, page, limit } = req.query as unknown as z.infer<
      typeof listReviewsQuery
    >
    const where: WhereCondition[] = []
    const target = venue_id ?? resourceId
    if (target) {
      where.push({ field: 'resourceId', operator: '=', value: target })
    }
    const options: FindManyOptions = {
      where,
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      limit: limit!,
      offset: (page! - 1) * limit!,
    }
    const reviews = await findMany<Record<string, unknown>>('reviews', options)
    const decorated = await decorateReviews(reviews)
    res.json({ data: decorated, page })
  } catch (error) {
    logger.error('reviews.list', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post(
  '/',
  enforceLimit<VenueBookingLimits>({
    limitType: 'maxReviews',
    getLimit: (limits) => limits.maxReviews,
    getCurrent: async (userId) =>
      count('reviews', [{ field: 'userId', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createReviewSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = res.locals.session?.userId as string | undefined
      if (!userId) {
        return res
          .status(401)
          .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      }
      const body = req.body as z.infer<typeof createReviewSchema>
      const target = body.venue_id ?? body.resourceId ?? ''
      // Strip the convenience fields (`venue_id`, optional `booking_id`)
      // and any duplicated `resourceType`/`resourceId` from the spread so the
      // INSERT only carries actual reviews-table columns.
      const {
        venue_id: _venueId,
        booking_id: _bookingId,
        resourceId: _rId,
        resourceType: _rType,
        ...reviewProps
      } = body
      void _venueId
      void _bookingId
      void _rId
      void _rType
      const result = await create('reviews', {
        ...reviewProps,
        resourceType: body.resourceType ?? 'venue',
        resourceId: target,
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      res.status(201).json(result.data)
    } catch (err) {
      console.error('[reviews.create]', err)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.put('/:id', validateBody(updateReviewSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session?.userId as string | undefined
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = req.params.id as string
    const existing = await findById<Record<string, unknown>>('reviews', id)
    if (!existing) {
      return res
        .status(404)
        .json({ error: t('review.notFound', {}, { defaultValue: 'Review not found' }) })
    }
    if (existing.userId !== userId) {
      return res
        .status(403)
        .json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }
    const result = await updateById('reviews', id, {
      ...req.body,
      updatedAt: new Date().toISOString(),
    })
    res.json(result.data)
  } catch (err) {
    console.error('[reviews.update]', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session?.userId as string | undefined
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = req.params.id as string
    const existing = await findById<Record<string, unknown>>('reviews', id)
    if (!existing) {
      return res
        .status(404)
        .json({ error: t('review.notFound', {}, { defaultValue: 'Review not found' }) })
    }
    if (existing.userId !== userId) {
      return res
        .status(403)
        .json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }
    await deleteById('reviews', id)
    res.status(204).send()
  } catch (error) {
    logger.error('reviews.delete', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
