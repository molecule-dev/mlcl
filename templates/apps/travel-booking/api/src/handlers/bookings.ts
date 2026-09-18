import { randomBytes } from 'node:crypto'

import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { create, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const listQuerySchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

const createBookingSchema = z.object({
  room_id: z.string().min(1),
  check_in: z.string().min(1),
  check_out: z.string().min(1),
  guests: z.coerce.number().int().positive().default(1),
  special_requests: z.string().optional(),
  payment_method_id: z.string().min(1).optional(),
})

const cancelBookingSchema = z.object({
  reason: z.string().max(500).optional(),
})

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const { status, page, limit } = req.query as unknown as z.infer<typeof listQuerySchema>
    // Owner-scoped: bookings are returned ONLY for the requesting user — no
    // per-query user_id override allowed (no IDOR).
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (status) where.push({ field: 'status', operator: '=', value: status })

    const bookings = await findMany('travel_bookings', {
      where,
      orderBy: [{ field: 'check_in', direction: 'desc' }],
      limit,
      offset: (page - 1) * limit,
    })
    res.json({ data: bookings, page, limit })
  } catch (error) {
    logger.error('bookings.list', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const booking = (await findById('travel_bookings', String(req.params.id))) as Record<
      string,
      unknown
    > | null
    if (!booking) {
      res
        .status(404)
        .json({ error: t('booking.notFound', {}, { defaultValue: 'Booking not found' }) })
      return
    }
    // Ownership check — the booking's owner_id must match the session user_id.
    // Anything else is treated as not-found to avoid leaking existence.
    const ownerId = String(booking.user_id ?? '')
    if (ownerId !== userId) {
      res
        .status(404)
        .json({ error: t('booking.notFound', {}, { defaultValue: 'Booking not found' }) })
      return
    }
    res.json(booking)
  } catch (error) {
    logger.error('bookings.get', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', validateBody(createBookingSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const { room_id, check_in, check_out, guests, special_requests, payment_method_id } =
      req.body as z.infer<typeof createBookingSchema>

    const room = (await findById('room_types', room_id)) as Record<string, unknown> | null
    if (!room) {
      res.status(404).json({ error: t('room.notFound', {}, { defaultValue: 'Room not found' }) })
      return
    }

    const inMs = new Date(check_in).getTime()
    const outMs = new Date(check_out).getTime()
    if (Number.isNaN(inMs) || Number.isNaN(outMs) || outMs <= inMs) {
      res.status(400).json({
        error: t('booking.invalidDates', {}, { defaultValue: 'check_out must be after check_in' }),
      })
      return
    }

    // Enforce max occupancy: `capacity` is a stored per-room-type limit (seeded 2/4, shown in
    // the UI), so a party larger than the room holds must be rejected before we price and persist.
    const maxGuests = Number(room.capacity ?? 0)
    if (maxGuests > 0 && guests > maxGuests) {
      res.status(400).json({
        error: t(
          'booking.overCapacity',
          { max: maxGuests },
          { defaultValue: `This room holds up to ${maxGuests} guests` },
        ),
      })
      return
    }

    // Enforce inventory: a room_type row holds `total_rooms` physical units (seeded 4/2), so it
    // may be booked up to that many times for overlapping nights — but only that many. Count
    // ACTIVE (non-cancelled) bookings overlapping the requested window and reject once every unit
    // is taken; without this guard a single room booked unlimited times for the same dates.
    // Half-open ranges [a_in,a_out) and [b_in,b_out) overlap iff a_in < b_out AND a_out > b_in.
    const overlapping = await findMany('travel_bookings', {
      where: [
        { field: 'room_type_id', operator: '=', value: room_id },
        { field: 'status', operator: 'in', value: ['confirmed', 'pending'] },
        { field: 'check_in', operator: '<', value: check_out },
        { field: 'check_out', operator: '>', value: check_in },
      ],
    })
    const totalUnits = Math.max(1, Number(room.total_rooms ?? 1))
    if ((overlapping as unknown[]).length >= totalUnits) {
      res.status(409).json({
        error: t(
          'booking.roomUnavailable',
          {},
          { defaultValue: 'That room is fully booked for the selected dates' },
        ),
      })
      return
    }

    const nights = Math.ceil((outMs - inMs) / (1000 * 60 * 60 * 24))
    const ratePerNight = Number(room.price_per_night_cents) || 0
    const subtotal = nights * ratePerNight
    const taxes = Math.round(subtotal * 0.13)
    const total = subtotal + taxes

    // payment_method_id is accepted by the schema for forward compatibility
    // (when we wire a real Stripe PaymentMethod handle), but the
    // travel_bookings table currently only stores stripe_payment_intent_id
    // — so we just acknowledge the choice and let the row persist without
    // the saved card reference.
    void payment_method_id

    const result = await create('travel_bookings', {
      user_id: userId,
      property_id: room.property_id,
      room_type_id: room_id,
      check_in,
      check_out,
      guests: guests ?? 1,
      nights,
      subtotal_cents: subtotal,
      taxes_cents: taxes,
      total_cents: total,
      currency: 'USD',
      status: 'confirmed',
      confirmation_code: generateConfirmation(),
      special_requests: special_requests ?? null,
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('bookings.create', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.put(
  '/:id/cancel',
  validateParams(idParamSchema),
  validateBody(cancelBookingSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res
          .status(401)
          .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
        return
      }
      const existing = (await findById('travel_bookings', String(req.params.id))) as Record<
        string,
        unknown
      > | null
      if (!existing) {
        res
          .status(404)
          .json({ error: t('booking.notFound', {}, { defaultValue: 'Booking not found' }) })
        return
      }
      if (String(existing.user_id ?? '') !== userId) {
        // Forbidden — non-owner cancel attempt; do not leak existence beyond
        // the ownership boundary.
        res.status(403).json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
        return
      }
      const result = await updateById('travel_bookings', String(req.params.id), {
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: (req.body as z.infer<typeof cancelBookingSchema>).reason ?? null,
      })
      res.json(result.data)
    } catch (error) {
      logger.error('bookings.cancel', error)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

/**
 * 8-char confirmation code. Confirmation codes are traveler-presented
 * credentials — lookup and support flows key off them, so they must not be
 * guessable. Math.random is a predictable non-cryptographic PRNG; draw from
 * a CSPRNG instead. [L2-1]
 */
function generateConfirmation(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  // Rejection sampling keeps every symbol equally likely: skip byte values
  // above the largest multiple of the alphabet size (a plain modulo would
  // favor the earliest characters).
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

export default router
