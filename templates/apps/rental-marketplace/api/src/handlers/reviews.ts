/**
 * Reviews handler — guest reviews of listings (and host counter-reviews).
 *
 * GET /reviews                     — public list (filter by listing/host)
 * POST /reviews                    — auth + ownership (only the booking's
 *                                      guest or host may write a review)
 * PUT /reviews/:id                 — auth + ownership (own review only)
 * DELETE /reviews/:id              — auth + ownership (own review only)
 *
 * Storage uses the canonical `@molecule/api-resource-review` schema:
 *   id / userId / resourceType / resourceId / rating / title / body /
 *   helpful / createdAt / updatedAt — UNIQUE (resourceType, resourceId,
 *   userId) means one review per user per listing.
 *
 * Marketplace-specific fields (bookingId, role, hostId) are encoded into
 * the review's `body` is preserved as authored; structural metadata is
 * looked up live via the booking_id when we need reviewer↔reviewee
 * authorization. We avoid a metadata column on reviews because the base
 * `reviews` migration doesn't expose one (vs. bookings, which has JSONB).
 */
import type { Request, RequestHandler, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import type { WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

import type { RentalMarketplaceLimits } from '../tiers.js'
import { decorateReview, decorateReviews } from './_decorate.js'

const router = Router()

const listReviewsQuery = z.object({
  listing_id: z.string().optional(),
  host_id: z.string().optional(),
  reviewer_id: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
})

const createReviewSchema = z.object({
  booking_id: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().min(1).max(200).optional().default('Stay review'),
  body: z.string().min(1).max(4000),
  role: z.enum(['guest_review', 'host_review']).optional().default('guest_review'),
})

const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  title: z.string().min(1).max(200).optional(),
  body: z.string().min(1).max(4000).optional(),
})

interface BookingMetaForReview {
  hostId?: string | null
}

function readBookingMeta(b: Record<string, unknown>): BookingMetaForReview {
  if (!b.metadata) return {}
  if (typeof b.metadata === 'string') {
    try {
      return JSON.parse(b.metadata) as BookingMetaForReview
    } catch (_error) {
      // Invalid JSON string — return empty metadata as fallback.
      return {}
    }
  }
  return b.metadata as BookingMetaForReview
}

router.get('/', validateQuery(listReviewsQuery), async (req: Request, res: Response) => {
  try {
    const { listing_id, host_id, reviewer_id, page, limit } = req.query as unknown as z.infer<
      typeof listReviewsQuery
    >

    const where: WhereCondition[] = [{ field: 'resourceType', operator: '=', value: 'listing' }]
    if (listing_id) where.push({ field: 'resourceId', operator: '=', value: listing_id })
    if (reviewer_id) where.push({ field: 'userId', operator: '=', value: reviewer_id })

    let data = await findMany<Record<string, unknown>>('reviews', {
      where,
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      limit,
      offset: (page - 1) * limit,
    })

    if (host_id && data.length > 0) {
      // Filter by host: a review applies to a listing whose host_id
      // matches the requested host. Two-pass; small-N is fine for the
      // public read path.
      const listingIds = Array.from(new Set(data.map((r) => String(r.resourceId))))
      const listings = await Promise.all(
        listingIds.map((lid) => findById<Record<string, unknown>>('listings', lid)),
      )
      const hostByListing = new Map(
        listingIds.map((lid, i) => [lid, listings[i] ? String(listings[i]!.host_id) : null]),
      )
      data = data.filter((r) => hostByListing.get(String(r.resourceId)) === host_id)
    }

    const total = await count('reviews', where)
    const decorated = await decorateReviews(data)
    res.json({ data: decorated, total, page, limit })
  } catch (err) {
    console.error('[reviews.list]', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post(
  '/',
  enforceLimit<RentalMarketplaceLimits>({
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

      const booking = await findById<Record<string, unknown>>('bookings', body.booking_id)
      if (!booking) {
        return res
          .status(404)
          .json({ error: t('booking.notFound', {}, { defaultValue: 'Booking not found' }) })
      }
      const meta = readBookingMeta(booking)
      const isGuest = booking.userId === userId
      const isHost = meta.hostId === userId
      if (!isGuest && !isHost) {
        return res
          .status(403)
          .json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
      }
      if (body.role === 'host_review' && !isHost) {
        return res
          .status(403)
          .json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
      }
      if (body.role === 'guest_review' && !isGuest) {
        return res
          .status(403)
          .json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
      }

      const result = await create<Record<string, unknown>>('reviews', {
        userId,
        resourceType: 'listing',
        resourceId: String(booking.resourceId ?? ''),
        rating: body.rating,
        title: body.title || (body.role === 'guest_review' ? 'Stay review' : 'Guest review'),
        body: body.body,
        helpful: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      const decorated = await decorateReview(result.data as Record<string, unknown>)
      res.status(201).json(decorated)
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
    const id = String(req.params.id)
    const review = await findById<Record<string, unknown>>('reviews', id)
    if (!review) {
      return res
        .status(404)
        .json({ error: t('review.notFound', {}, { defaultValue: 'Review not found' }) })
    }
    if (review.userId !== userId) {
      return res
        .status(403)
        .json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }
    const body = req.body as z.infer<typeof updateReviewSchema>
    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() }
    if (body.rating !== undefined) updates.rating = body.rating
    if (body.title !== undefined) updates.title = body.title
    if (body.body !== undefined) updates.body = body.body
    const result = await updateById<Record<string, unknown>>('reviews', id, updates)
    const decorated = await decorateReview(result.data as Record<string, unknown>)
    res.json(decorated)
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
    const id = String(req.params.id)
    const review = await findById<Record<string, unknown>>('reviews', id)
    if (!review) {
      return res
        .status(404)
        .json({ error: t('review.notFound', {}, { defaultValue: 'Review not found' }) })
    }
    if (review.userId !== userId) {
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
