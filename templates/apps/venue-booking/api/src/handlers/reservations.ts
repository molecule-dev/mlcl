/**
 * `/api/reservations` — view-shaped wrapper over the `bookings` table.
 *
 * Reads return the rich `ViewReservation` shape with venue+host
 * metadata joined in. Writes accept the snake_case body shape the
 * Booking page sends (`venue_id`, `starts_at_iso`, `ends_at_iso`,
 * `guest_count`, `notes`, `total_cents`, etc.) and persist them into
 * the canonical `bookings` table where the API resource ecosystem lives.
 *
 * Side effect on first reservation: kicks `seedDemoForUser` so the
 * freshly signed-up user lands on /favorites + /notifications +
 * /messages with sample content. Idempotent on user_id.
 *
 * @module
 */

import type { Request, RequestHandler, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import type { FindManyOptions, WhereCondition } from '@molecule/api-database'
import { count, create, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'

import type { VenueBookingLimits } from '../tiers.js'
import { decorateReservation, decorateReservations } from './_decorate.js'
import { seedDemoForUser } from './_seed.js'

const router = Router()

// Postgres uuid columns reject non-uuid strings with SQLSTATE 22P02, which
// used to surface as an unhandled 500. Treat any malformed id as
// "not found" instead (URLs are user-editable).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const listQuerySchema = z.object({
  status: z
    .enum(['upcoming', 'in_progress', 'completed', 'cancelled', 'pending', 'confirmed'])
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
})

const createReservationSchema = z.object({
  venue_id: z.string().min(1),
  // Either explicit ISO timestamps...
  starts_at_iso: z.string().min(1).optional(),
  ends_at_iso: z.string().min(1).optional(),
  // ...or {date, start_time, end_time} (legacy contract).
  date: z.string().min(1).optional(),
  start_time: z.string().min(1).optional(),
  end_time: z.string().min(1).optional(),
  guest_count: z.coerce.number().int().positive().optional(),
  guest_name: z.string().optional(),
  phone: z.string().optional(),
  event_type: z.string().optional(),
  notes: z.string().optional(),
  total_cents: z.coerce.number().int().nonnegative().optional(),
})

function toIso(date: string | undefined, time: string | undefined): string {
  if (!date) return new Date().toISOString()
  // If it already parses as a full ISO, keep it.
  const direct = new Date(date)
  if (!Number.isNaN(direct.getTime()) && date.includes('T')) {
    return direct.toISOString()
  }
  const t = (time ?? '00:00').padEnd(5, '0')
  const composed = new Date(`${date}T${t}:00Z`)
  if (!Number.isNaN(composed.getTime())) return composed.toISOString()
  return new Date().toISOString()
}

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const { status, page, limit } = req.query as unknown as z.infer<typeof listQuerySchema>

  const where: WhereCondition[] = [
    { field: 'userId', operator: '=', value: userId },
    { field: 'resourceType', operator: '=', value: 'venue' },
  ]
  if (status === 'cancelled') {
    where.push({ field: 'status', operator: '=', value: 'cancelled' })
  } else if (status === 'pending' || status === 'confirmed') {
    where.push({ field: 'status', operator: '=', value: status })
  }

  const options: FindManyOptions = {
    where,
    orderBy: [{ field: 'startTime', direction: 'desc' }],
    limit,
    offset: (page - 1) * limit,
  }
  const bookings = await findMany<Record<string, unknown>>('bookings', options)
  let decorated = await decorateReservations(bookings)

  // Frontend filtering by classified status (upcoming / in_progress /
  // completed) is computed in the decorator; if a status filter was
  // passed for one of those values we filter on the decorated rows so
  // it works even though the underlying column doesn't carry the same
  // semantics.
  if (status === 'upcoming' || status === 'in_progress' || status === 'completed') {
    decorated = decorated.filter((d) => d.status === status)
  }

  res.json({ data: decorated })
})

router.get('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const id = String(req.params.id)
  if (!UUID_RE.test(id)) {
    res
      .status(404)
      .json({ error: t('reservation.notFound', {}, { defaultValue: 'Reservation not found' }) })
    return
  }
  const booking = await findById<Record<string, unknown>>('bookings', id)
  if (!booking) {
    res
      .status(404)
      .json({ error: t('reservation.notFound', {}, { defaultValue: 'Reservation not found' }) })
    return
  }
  if (booking.userId !== userId) {
    // Allow venue host to view too.
    const venue = booking.resourceId
      ? await findById<Record<string, unknown>>('venues', String(booking.resourceId))
      : null
    if (!venue || venue.host_user_id !== userId) {
      res.status(403).json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
      return
    }
  }
  const decorated = await decorateReservation(booking)
  res.json(decorated)
})

router.post(
  '/',
  enforceLimit<VenueBookingLimits>({
    limitType: 'maxBookings',
    getLimit: (limits) => limits.maxBookings,
    getCurrent: async (userId) =>
      count('bookings', [{ field: 'userId', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createReservationSchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const body = req.body as z.infer<typeof createReservationSchema>
    const venue = await findById<Record<string, unknown>>('venues', body.venue_id)
    if (!venue) {
      res.status(404).json({ error: t('venue.notFound', {}, { defaultValue: 'Venue not found' }) })
      return
    }

    // Enforce the venue's max occupancy: `capacity` is a stored per-venue limit, so a party
    // larger than the venue holds must be rejected before we price and persist the booking —
    // otherwise over-capacity reservations are silently accepted.
    const capacity = Number(venue.capacity ?? 0)
    if (capacity > 0 && body.guest_count != null && Number(body.guest_count) > capacity) {
      res.status(400).json({
        error: t(
          'reservation.overCapacity',
          { max: capacity },
          {
            defaultValue: `This venue holds up to ${capacity} guests`,
          },
        ),
      })
      return
    }

    const startTimeIso = body.starts_at_iso ?? toIso(body.date, body.start_time)
    const endTimeIso = body.ends_at_iso ?? toIso(body.date, body.end_time)
    const startMs = new Date(startTimeIso).getTime()
    const endMs = new Date(endTimeIso).getTime()
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
      res.status(400).json({
        error: t(
          'reservation.invalidTimes',
          {},
          {
            defaultValue: 'Reservation must end after it begins.',
          },
        ),
      })
      return
    }

    // Prevent double-booking a venue: reject if an active (pending/confirmed) booking for this venue
    // overlaps the requested window. Overlap iff existing.start < new.end AND existing.end > new.start;
    // startTime/endTime are timestamptz, compared chronologically. Cancelled bookings free the venue.
    // This guard already lived in the sibling /api/bookings route, but the UI books via /api/reservations
    // — which created the row without ever checking for a conflict, so overlapping reservations were
    // silently confirmed.
    const conflicts = await findMany<Record<string, unknown>>('bookings', {
      where: [
        { field: 'resourceType', operator: '=', value: 'venue' },
        { field: 'resourceId', operator: '=', value: body.venue_id },
        { field: 'status', operator: 'in', value: ['pending', 'confirmed'] },
        { field: 'startTime', operator: '<', value: endTimeIso },
        { field: 'endTime', operator: '>', value: startTimeIso },
      ],
      limit: 1,
    })
    if (conflicts.length > 0) {
      res.status(409).json({
        error: t(
          'booking.venueUnavailable',
          {},
          {
            defaultValue: 'That venue is already booked for the selected time',
          },
        ),
      })
      return
    }

    const durationMinutes = Math.max(0, Math.round((endMs - startMs) / 60_000))
    const durationHours = durationMinutes / 60

    const hourlyRateCents = Number(venue.hourly_rate_cents ?? 0)
    const dailyRateCents = Number(venue.daily_rate_cents ?? 0)

    let subtotalCents: number
    if (hourlyRateCents > 0 && durationHours > 0) {
      subtotalCents = Math.round(hourlyRateCents * durationHours)
    } else if (dailyRateCents > 0) {
      const days = Math.max(1, Math.ceil((endMs - startMs) / (1000 * 60 * 60 * 24)))
      subtotalCents = dailyRateCents * days
    } else {
      subtotalCents = Number(body.total_cents ?? 0)
    }
    const serviceFeeCents = Math.round(subtotalCents * 0.1)
    const totalCents = subtotalCents + serviceFeeCents

    const metadata = {
      venueId: body.venue_id,
      hostUserId: venue.host_user_id ?? venue.owner_id,
      guestCount: body.guest_count ?? null,
      guestName: body.guest_name ?? null,
      phone: body.phone ?? null,
      eventType: body.event_type ?? null,
      subtotalCents,
      serviceFeeCents,
      totalCents,
    }

    const result = await create<Record<string, unknown>>('bookings', {
      userId,
      resourceType: 'venue',
      resourceId: body.venue_id,
      status: 'confirmed',
      startTime: new Date(startTimeIso),
      endTime: new Date(endTimeIso),
      duration: durationMinutes,
      notes: body.notes ?? null,
      metadata: JSON.stringify(metadata),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    const booking = (result.data ?? result) as Record<string, unknown>

    // Best-effort seed of the new user's per-user demo content. Failures
    // here must not block the booking response.
    seedDemoForUser(userId).catch((err) => {
      logger.error({ err, userId }, '[reservations] seedDemoForUser failed')
    })

    const decorated = await decorateReservation(booking)
    res.status(201).json(decorated)
  },
)

router.put('/:id/cancel', validateParams(idParamSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const id = String(req.params.id)
  if (!UUID_RE.test(id)) {
    res
      .status(404)
      .json({ error: t('reservation.notFound', {}, { defaultValue: 'Reservation not found' }) })
    return
  }
  const booking = await findById<Record<string, unknown>>('bookings', id)
  if (!booking) {
    res
      .status(404)
      .json({ error: t('reservation.notFound', {}, { defaultValue: 'Reservation not found' }) })
    return
  }
  if (booking.userId !== userId) {
    const venue = booking.resourceId
      ? await findById<Record<string, unknown>>('venues', String(booking.resourceId))
      : null
    if (!venue || venue.host_user_id !== userId) {
      res.status(403).json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
      return
    }
  }
  const result = await updateById<Record<string, unknown>>('bookings', id, {
    status: 'cancelled',
    updatedAt: new Date(),
  })
  const updated = (result.data ?? result) as Record<string, unknown>
  const decorated = await decorateReservation(updated)
  res.json(decorated)
})

export default router
