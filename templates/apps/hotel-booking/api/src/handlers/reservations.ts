/**
 * `/api/reservations` — domain endpoint that owns the booking write path.
 *
 * The frontend prefers the view-shaped `/api/trips` endpoint for reads
 * (see ./trips.ts) but writes go here, since reservations is the
 * underlying domain concept (a row in the `reservations` table) while
 * "trip" is a view of it. Created rows include the cents subtotal/taxes/
 * total so the booking-confirmation page can render the breakdown
 * without a follow-up fetch.
 *
 * Side effect on first reservation: kicks `seedDemoForUser` so the
 * freshly signed-up user lands on /account with a starter loyalty row
 * and a few welcome notifications. Idempotent on user_id.
 *
 * @module
 */

import { randomBytes } from 'node:crypto'

import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { create, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'

import { seedDemoForUser } from './_seed.js'

const router = Router()

const listQuerySchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

const createReservationSchema = z.object({
  room_id: z.string().min(1),
  check_in: z.string().min(1),
  check_out: z.string().min(1),
  guests: z.coerce.number().int().positive().default(1),
  special_requests: z.string().optional(),
})

/**
 * 8-char confirmation number. Confirmation numbers are guest-presented
 * credentials — support and lookup flows key off them, so they must not be
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

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const { status, page, limit } = req.query as unknown as z.infer<typeof listQuerySchema>
  const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  if (status) where.push({ field: 'status', operator: '=', value: status })

  const reservations = await findMany('reservations', {
    where,
    orderBy: [{ field: 'check_in', direction: 'desc' }],
    limit,
    offset: (page - 1) * limit,
  })
  res.json({ data: reservations })
})

router.get('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const reservation = (await findById('reservations', getParamId(req))) as Record<
    string,
    unknown
  > | null
  if (!reservation) {
    res
      .status(404)
      .json({ error: t('reservation.notFound', {}, { defaultValue: 'Reservation not found' }) })
    return
  }
  if (reservation.user_id !== userId) {
    res.status(403).json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
    return
  }
  res.json(reservation)
})

router.post('/', validateBody(createReservationSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const { room_id, check_in, check_out, guests, special_requests } = req.body as z.infer<
    typeof createReservationSchema
  >

  const checkInMs = new Date(check_in).getTime()
  const checkOutMs = new Date(check_out).getTime()
  if (!Number.isFinite(checkInMs) || !Number.isFinite(checkOutMs)) {
    res.status(400).json({
      error: t('reservation.invalidDates', {}, { defaultValue: 'Invalid check-in/check-out date' }),
    })
    return
  }
  if (checkOutMs <= checkInMs) {
    res.status(400).json({
      error: t(
        'reservation.checkoutBeforeCheckin',
        {},
        { defaultValue: 'Check-out must be after check-in' },
      ),
    })
    return
  }

  const room = (await findById('rooms', room_id)) as Record<string, unknown> | null
  if (!room) {
    res.status(404).json({ error: t('room.notFound', {}, { defaultValue: 'Room not found' }) })
    return
  }

  // Enforce the room's max occupancy: `capacity` is a stored per-room limit (seeded 2/3/4 and
  // shown in the UI), so a party larger than the room holds must be rejected before we price and
  // persist the reservation — otherwise over-capacity bookings are silently accepted.
  const maxGuests = Number(room.capacity ?? 0)
  if (maxGuests > 0 && guests > maxGuests) {
    res.status(400).json({
      error: t(
        'reservation.overCapacity',
        { max: maxGuests },
        {
          defaultValue: `This room holds up to ${maxGuests} guests`,
        },
      ),
    })
    return
  }

  // Prevent overbooking: a room row is a room *type* holding `total_rooms` physical units
  // (seeded 2/4/6/…), so up to that many reservations may overlap the same nights — not just
  // one. Count ACTIVE (non-cancelled) reservations overlapping the requested nights and reject
  // only once every unit is taken; hardcoding a single unit false-rejected the 2nd guest of a
  // multi-unit type. Two half-open ranges [a_in,a_out) and [b_in,b_out) overlap iff
  // a_in < b_out AND a_out > b_in. check_in/check_out are `date` columns, so Postgres compares
  // them chronologically. (For a race-proof guard under concurrent bookings, add a Postgres
  // EXCLUDE constraint per (room_id, daterange) counting active rows — the app-level count
  // below covers the common case.)
  const conflicts = await findMany<Record<string, unknown>>('reservations', {
    where: [
      { field: 'room_id', operator: '=', value: room_id },
      { field: 'status', operator: 'in', value: ['confirmed', 'pending'] },
      { field: 'check_in', operator: '<', value: check_out },
      { field: 'check_out', operator: '>', value: check_in },
    ],
  })
  const totalUnits = Math.max(1, Number(room.total_rooms ?? 1))
  if (conflicts.length >= totalUnits) {
    res.status(409).json({
      error: t(
        'reservation.roomUnavailable',
        {},
        {
          defaultValue: 'That room is already booked for the selected dates',
        },
      ),
    })
    return
  }

  const nights = Math.max(1, Math.ceil((checkOutMs - checkInMs) / (1000 * 60 * 60 * 24)))
  const subtotal = nights * Number(room.rate ?? 0)
  const taxes = Math.round(subtotal * 0.14)
  const resort_fee = nights * Number(room.resort_fee ?? 0)
  const total = subtotal + taxes + resort_fee

  const result = await create<Record<string, unknown>>('reservations', {
    user_id: userId,
    room_id,
    hotel_id: room.hotel_id,
    check_in,
    check_out,
    guests,
    nights,
    subtotal,
    taxes,
    resort_fee,
    total,
    status: 'confirmed',
    confirmation_number: generateConfirmation(),
    special_requests: special_requests ?? null,
  })

  // Best-effort seed for the newly active user. Failures here must not
  // block the booking response — the user has already paid (in spirit);
  // we just log and move on.
  seedDemoForUser(userId).catch((err) => {
    logger.error({ err, userId }, '[reservations] seedDemoForUser failed')
  })

  res.status(201).json(result.data ?? result)
})

router.put('/:id/cancel', validateParams(idParamSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const existing = (await findById('reservations', getParamId(req))) as Record<
    string,
    unknown
  > | null
  if (!existing) {
    res
      .status(404)
      .json({ error: t('reservation.notFound', {}, { defaultValue: 'Reservation not found' }) })
    return
  }
  if (existing.user_id !== userId) {
    res.status(403).json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
    return
  }
  const result = await updateById<Record<string, unknown>>('reservations', getParamId(req), {
    status: 'cancelled',
    cancelled_at: new Date(),
  })
  res.json(result.data ?? result)
})

export default router
