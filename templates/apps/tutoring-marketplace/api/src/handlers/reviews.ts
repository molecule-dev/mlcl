import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { create, findById, findMany, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

// A review carries a rating for a tutor. `booking_id` is OPTIONAL and selects
// the trust model:
//   • WITH booking_id  → the SessionDetail "Leave a review" flow. The booking
//     must exist, be owned by the reviewer, and be completed; the tutor is
//     derived from the booking (never the client tutor_id) so booking-backed
//     attribution can't be forged, and one review per booking is enforced.
//   • WITHOUT booking_id → a standalone tutor review (e.g. from the public
//     tutor profile). The tutor must exist; the review is attributed to the
//     client-supplied tutor_id and stored with a NULL booking_id (matching the
//     seed migration's pre-platform history rows, which the partial UNIQUE
//     index on (reviewer_id, booking_id) WHERE booking_id IS NOT NULL allows).
const createReviewSchema = z.object({
  tutor_id: z.string().min(1),
  booking_id: z.string().min(1).optional(),
  rating: z.number().int().min(1).max(5),
  body: z.string().optional(),
})

router.get('/tutor/:tutorId', async (req: Request, res: Response) => {
  try {
    const tutorId = Array.isArray(req.params.tutorId) ? req.params.tutorId[0] : req.params.tutorId
    const reviews = await findMany('reviews', {
      where: [{ field: 'tutor_id', operator: '=', value: tutorId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 100,
    })
    res.json(reviews)
  } catch (_err) {
    logger.error?.('reviews.listByTutor', _err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

// Returns the existing review for a booking by the current user, or 404 if
// none exists yet. The SessionDetail page calls this on a completed booking
// to decide whether to show "Leave a review" or "✓ You rated this session"
// — a missing endpoint here meant the UI offered no post-session action at
// all, so review-less completed sessions were dead ends.
router.get('/booking/:bookingId', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const bookingId = Array.isArray(req.params.bookingId)
      ? req.params.bookingId[0]
      : req.params.bookingId
    const reviews = await findMany<Record<string, unknown>>('reviews', {
      where: [
        { field: 'booking_id', operator: '=', value: bookingId },
        { field: 'reviewer_id', operator: '=', value: userId },
      ],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 1,
    })
    const review = reviews?.[0]
    // "No review yet" is the NORMAL answer while the SessionDetail page polls
    // a completed booking (it renders the rating form on a falsy body), so
    // respond 200 + null instead of 404 — a 404 here logged a browser console
    // error on every post-session visit.
    if (!review) {
      res.json(null)
      return
    }
    res.json(review)
  } catch (_err) {
    logger.error?.('reviews.getByBooking', _err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/', validateBody(createReviewSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const body = req.body as z.infer<typeof createReviewSchema>

    // The tutor a review is attributed to. For a booking-backed review this is
    // overridden with the booking's own tutor_id (forge-proof); for a
    // standalone review it is the client-supplied tutor_id, validated to exist.
    let tutorId = body.tutor_id

    if (body.booking_id) {
      // Booking-backed path: the booking must exist, belong to the reviewer,
      // and be completed. The tutor is derived from the booking — never from the
      // client-supplied tutor_id — so a review can only ever be attributed to a
      // tutor the caller actually had a completed session with.
      const booking = await findById<Record<string, unknown>>('bookings', body.booking_id)
      if (!booking) {
        res
          .status(404)
          .json({ error: t('bookings.notFound', undefined, { defaultValue: 'Booking not found' }) })
        return
      }
      if (booking.student_id !== userId) {
        res
          .status(403)
          .json({ error: t('auth.forbidden', undefined, { defaultValue: 'Forbidden.' }) })
        return
      }
      if (booking.status !== 'completed') {
        res.status(400).json({
          error: t('reviews.bookingNotCompleted', undefined, {
            defaultValue: 'Reviews are only allowed after the booking is completed.',
          }),
        })
        return
      }
      // Authoritative tutor for this review = the booking's tutor. Reject any
      // client-supplied tutor_id that doesn't match so the attribution can't be
      // forged.
      tutorId = String(booking.tutor_id)
      if (body.tutor_id !== tutorId) {
        res.status(400).json({
          error: t('reviews.tutorMismatch', undefined, {
            defaultValue: 'The tutor does not match the booking being reviewed.',
          }),
        })
        return
      }

      // One review per completed booking. Backstopped by a partial UNIQUE index
      // on reviews(reviewer_id, booking_id) WHERE booking_id IS NOT NULL so
      // concurrent requests can't bypass this.
      const existingReview = await findOne<Record<string, unknown>>('reviews', [
        { field: 'reviewer_id', operator: '=', value: userId },
        { field: 'booking_id', operator: '=', value: body.booking_id },
      ])
      if (existingReview) {
        res.status(409).json({
          error: t('reviews.alreadyReviewed', undefined, {
            defaultValue: 'You have already reviewed this session.',
          }),
        })
        return
      }
    } else {
      // Standalone path: no booking to derive the tutor from, so validate the
      // client-supplied tutor_id points at a real tutor before accepting the
      // review (and before touching its aggregate). The review is stored with a
      // NULL booking_id, which the partial UNIQUE index leaves unconstrained.
      const tutorExists = await findById<Record<string, unknown>>('tutor_profiles', tutorId)
      if (!tutorExists) {
        res
          .status(404)
          .json({ error: t('tutors.notFound', undefined, { defaultValue: 'Tutor not found' }) })
        return
      }
    }

    let review: Record<string, unknown> | undefined
    try {
      const result = await create<Record<string, unknown>>('reviews', {
        reviewer_id: userId,
        tutor_id: tutorId,
        booking_id: body.booking_id ?? null,
        rating: body.rating,
        body: body.body ?? null,
        created_at: new Date(),
        updated_at: new Date(),
      })
      review = result.data as Record<string, unknown> | undefined
    } catch (createErr) {
      // Unique-index violation from a race on the duplicate check above.
      if ((createErr as { code?: string })?.code === '23505') {
        res.status(409).json({
          error: t('reviews.alreadyReviewed', undefined, {
            defaultValue: 'You have already reviewed this session.',
          }),
        })
        return
      }
      throw createErr
    }

    // Incrementally update the cached aggregate on tutor_profiles instead of
    // recomputing from rows. The seed migration sets a historical
    // rating_count/rating_average that represents reviews accumulated before
    // joining the platform; recomputing would clobber that baseline on the
    // first real review. Incremental update preserves the seeded history and
    // still satisfies the invariant: rating_count goes up by exactly 1 per
    // accepted review.
    const tutor = await findById<Record<string, unknown>>('tutor_profiles', tutorId)
    if (tutor) {
      const oldCount = Number(tutor.rating_count ?? 0)
      const oldAvg = Number(tutor.rating_average ?? 0)
      const newCount = oldCount + 1
      const newAvg = (oldAvg * oldCount + body.rating) / newCount
      await updateById('tutor_profiles', tutorId, {
        rating_average: Math.round(newAvg * 100) / 100,
        rating_count: newCount,
        updated_at: new Date(),
      })
    }

    res.status(201).json(review)
  } catch (_err) {
    logger.error?.('reviews.create', _err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
