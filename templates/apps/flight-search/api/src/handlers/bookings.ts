import { randomBytes } from 'node:crypto'

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { create, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const listQuerySchema = z.object({
  status: z.string().optional(),
  trip_id: z.string().optional(),
})

const createBookingSchema = z.object({
  trip_id: z.string().optional(),
  flight_id: z.string().optional(),
  passenger_count: z.number().int().min(1),
  total_cents: z.number().int().min(0),
  currency: z.string().optional(),
  card_last4: z.string().length(4).optional(),
  stripe_payment_intent_id: z.string().optional(),
})

/**
 * 8-char confirmation code. Confirmation codes are passenger-presented
 * credentials — lookup and support flows key off them, so they must not be
 * guessable. Math.random is a predictable non-cryptographic PRNG; draw from
 * a CSPRNG instead. [L2-1]
 */
function generateConfirmationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  // Rejection sampling keeps every symbol equally likely (32-symbol alphabet
  // divides 256 evenly, so nothing is actually rejected here — the guard
  // keeps the generator uniform if the alphabet ever changes).
  const limit = 256 - (256 % chars.length)
  let result = ''
  while (result.length < 8) {
    const buf = randomBytes(16)
    for (let i = 0; i < buf.length && result.length < 8; i++) {
      if (buf[i]! < limit) result += chars.charAt(buf[i]! % chars.length)
    }
  }
  return result
}

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const { status, trip_id } = req.query as Record<string, string | undefined>
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (status) where.push({ field: 'status', operator: '=', value: status })
    if (trip_id) where.push({ field: 'trip_id', operator: '=', value: trip_id })
    const bookings = await findMany('bookings', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(bookings)
  } catch (err) {
    logger.error('bookings.list', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = getParamId(req)
    const booking = await findById<Record<string, unknown>>('bookings', id)
    if (!booking || booking.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('booking.notFound', {}, { defaultValue: 'Booking not found' }) })
    }
    res.json(booking)
  } catch (err) {
    logger.error('bookings.get', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', validateBody(createBookingSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const confirmationCode = generateConfirmationCode()
    // Treat as confirmed/paid when ANY payment artifact arrives:
    //   - real Stripe payment intent id (production path), OR
    //   - card_last4 (sandbox / non-Stripe simulated checkout — the
    //     UI runs Luhn-ish validation client-side and we record the
    //     last 4 here. Without this branch, every demo booking sticks
    //     in pending_payment forever and trip detail features like
    //     check-in are inaccessible.)
    const isPaid = Boolean(req.body.stripe_payment_intent_id || req.body.card_last4)
    const bookedAt = isPaid ? new Date() : null
    const result = await create<Record<string, unknown>>('bookings', {
      user_id: userId,
      trip_id: req.body.trip_id ?? null,
      confirmation_code: confirmationCode,
      status: isPaid ? 'booked' : 'pending_payment',
      flight_id: req.body.flight_id ?? null,
      passenger_count: req.body.passenger_count,
      total_cents: req.body.total_cents,
      currency: req.body.currency ?? 'USD',
      card_last4: req.body.card_last4 ?? null,
      stripe_payment_intent_id: req.body.stripe_payment_intent_id ?? null,
      created_at: new Date(),
    })

    // If linked to a trip, flip the trip into 'booked' status snapshot.
    if (req.body.trip_id) {
      try {
        const trip = await findById<Record<string, unknown>>('trips', req.body.trip_id)
        if (trip && trip.user_id === userId) {
          await updateById('trips', String(req.body.trip_id), {
            kind: 'booked',
            status: isPaid ? 'booked' : 'pending_payment',
            confirmation_code: confirmationCode,
            booked_at: bookedAt,
            updated_at: new Date(),
          })
        }
      } catch (err) {
        logger.warn('bookings.create.tripLinkage', err)
      }
    }
    res.status(201).json(result.data)
  } catch (err) {
    logger.error('bookings.create', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.put('/:id/cancel', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('bookings', id)
    if (!existing || existing.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('booking.notFound', {}, { defaultValue: 'Booking not found' }) })
    }
    const result = await updateById('bookings', id, {
      status: 'cancelled',
      updated_at: new Date(),
    })
    // Cascade trip status when present.
    if (existing.trip_id) {
      try {
        await updateById('trips', String(existing.trip_id), {
          status: 'cancelled',
          updated_at: new Date(),
        })
      } catch (err) {
        logger.warn('bookings.cancel.tripCascade', err)
      }
    }
    res.json(result.data)
  } catch (err) {
    logger.error('bookings.cancel', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
