/**
 * Bookings handler — guest reservations against host venues.
 *
 * GET /bookings        — auth; lists own bookings (or own+venue host bookings)
 * GET /bookings/:id    — auth + party scoping (guest or host of the booking)
 * POST /bookings       — auth + tier-gated create (guest books a venue)
 * PUT /bookings/:id/confirm — auth + host-only (host accepts a pending booking)
 * PUT /bookings/:id/cancel  — auth + party scoping (either side cancels)
 *
 * Column-naming note: the bookings table is the framework-canonical
 * `@molecule/api-resource-booking` schema, which uses camelCase columns
 * (`userId`, `resourceType`, `resourceId`, `startTime`, `endTime`,
 * `duration`, `notes`, `metadata`, `createdAt`, `updatedAt`). The API
 * accepts the venue-booking-flavoured snake_case body shape
 * (`venue_id`, `start_time`, `end_time`, `guest_count`, `message`) and
 * maps it to the canonical columns inside the handler so the public REST
 * surface matches the design while the storage layer stays aligned with
 * the rest of the molecule resource ecosystem.
 */
import type { Request, RequestHandler, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import type { FindManyOptions, WhereCondition } from '@molecule/api-database'
import { count, create, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

import type { VenueBookingLimits } from '../tiers.js'

const router = Router()

const createBookingSchema = z.object({
  venue_id: z.string().min(1),
  start_at: z.string().min(1).optional(),
  end_at: z.string().min(1).optional(),
  date: z.string().min(1).optional(),
  start_time: z.string().min(1).optional(),
  end_time: z.string().min(1).optional(),
  guest_count: z.number().int().positive().optional(),
  event_type: z.string().optional(),
  message: z.string().optional(),
})

const listBookingsQuery = z.object({
  user_id: z.string().optional(),
  venue_id: z.string().optional(),
  status: z.string().optional(),
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(20),
})

/** Combine an ISO date and a `HH:MM` time into an ISO timestamp. Falls back
 *  gracefully if `start_at` / `end_at` are already provided. */
const toIso = (isoOrDate: string | undefined, time: string | undefined): string => {
  if (!isoOrDate) return new Date().toISOString()
  // If it already parses as a full ISO, keep it.
  const direct = new Date(isoOrDate)
  if (!Number.isNaN(direct.getTime()) && isoOrDate.includes('T')) {
    return direct.toISOString()
  }
  const t = (time ?? '00:00').padEnd(5, '0')
  const composed = new Date(`${isoOrDate}T${t}:00Z`)
  if (!Number.isNaN(composed.getTime())) return composed.toISOString()
  return new Date().toISOString()
}

router.get('/', validateQuery(listBookingsQuery), async (req: Request, res: Response) => {
  try {
    // Fail closed: identity comes from the session, never the query/body. An
    // anonymous caller must not be able to read any bookings.
    const userId = res.locals.session?.userId as string | undefined
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const { venue_id, status, page, limit } = req.query as unknown as z.infer<
      typeof listBookingsQuery
    >

    const where: WhereCondition[] = []
    // The list is always scoped to rows the caller owns. The only authorized
    // cross-row view is a host listing bookings against a venue they own — and
    // only after we verify ownership of that venue. Otherwise we scope strictly
    // to the caller's own bookings so a request can never surface rows it
    // doesn't own.
    let scopedToOwnedVenue = false
    if (venue_id) {
      const venue = await findById<Record<string, unknown>>('venues', venue_id)
      if (venue && (venue.owner_id === userId || venue.host_user_id === userId)) {
        where.push({ field: 'resourceType', operator: '=', value: 'venue' })
        where.push({ field: 'resourceId', operator: '=', value: venue_id })
        scopedToOwnedVenue = true
      }
    }
    if (!scopedToOwnedVenue) {
      where.push({ field: 'userId', operator: '=', value: userId })
    }
    if (status) where.push({ field: 'status', operator: '=', value: status })

    const options: FindManyOptions = {
      where,
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      limit: limit!,
      offset: (page! - 1) * limit!,
    }
    const bookings = await findMany('bookings', options)
    res.json({ data: bookings, page })
  } catch (err) {
    console.error('[bookings.list]', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session?.userId as string | undefined
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = req.params.id as string
    const booking = await findById<Record<string, unknown>>('bookings', id)
    if (!booking) {
      return res
        .status(404)
        .json({ error: t('booking.notFound', {}, { defaultValue: 'Booking not found' }) })
    }
    // Booking is visible to its guest (userId) or to the host of the booked venue.
    if (booking.userId !== userId) {
      const venue = booking.resourceId
        ? await findById<Record<string, unknown>>('venues', String(booking.resourceId))
        : null
      if (!venue || venue.owner_id !== userId) {
        return res
          .status(403)
          .json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
      }
    }
    res.json(booking)
  } catch (err) {
    console.error('[bookings.get]', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post(
  '/',
  enforceLimit<VenueBookingLimits>({
    limitType: 'maxBookings',
    getLimit: (limits) => limits.maxBookings,
    getCurrent: async (userId) =>
      count('bookings', [{ field: 'userId', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createBookingSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = res.locals.session?.userId as string | undefined
      if (!userId) {
        return res
          .status(401)
          .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      }
      const body = req.body as z.infer<typeof createBookingSchema>
      const venueId = body.venue_id
      const venue = await findById<Record<string, unknown>>('venues', venueId)
      if (!venue) {
        return res
          .status(404)
          .json({ error: t('venue.notFound', {}, { defaultValue: 'Venue not found' }) })
      }

      // Enforce the venue's max occupancy — reject a party larger than the venue holds before
      // pricing and persisting (otherwise over-capacity bookings are silently accepted).
      const capacity = Number(venue.capacity ?? 0)
      if (capacity > 0 && body.guest_count != null && Number(body.guest_count) > capacity) {
        return res.status(400).json({
          error: t(
            'reservation.overCapacity',
            { max: capacity },
            {
              defaultValue: `This venue holds up to ${capacity} guests`,
            },
          ),
        })
      }

      // Naïve cost calculation: hours × hourly_rate (when present).
      const startTimeStr = body.start_time ?? ''
      const endTimeStr = body.end_time ?? ''
      let durationHours = 0
      if (startTimeStr && endTimeStr) {
        const startHour = parseInt(String(startTimeStr).split(':')[0] ?? '0', 10)
        const endHour = parseInt(String(endTimeStr).split(':')[0] ?? '0', 10)
        durationHours = Math.max(0, endHour - startHour)
      }
      const subtotal = durationHours * Number(venue.hourly_rate ?? 0)
      const serviceFee = Math.round(subtotal * 0.1)
      const total = subtotal + serviceFee

      const startTimeIso = body.start_at ?? toIso(body.date, body.start_time)
      const endTimeIso = body.end_at ?? toIso(body.date, body.end_time)

      // Prevent double-booking a venue: reject if an active (pending/confirmed) booking for
      // this venue overlaps the requested window. Overlap iff existing.start < new.end AND
      // existing.end > new.start; "startTime"/"endTime" are timestamptz, compared
      // chronologically. Cancelled bookings free the venue. (A Postgres EXCLUDE constraint
      // — btree_gist + tstzrange && — would make this race-proof under concurrent bookings.)
      if (startTimeIso && endTimeIso) {
        const conflicts = await findMany<Record<string, unknown>>('bookings', {
          where: [
            { field: 'resourceType', operator: '=', value: 'venue' },
            { field: 'resourceId', operator: '=', value: venueId },
            { field: 'status', operator: 'in', value: ['pending', 'confirmed'] },
            { field: 'startTime', operator: '<', value: endTimeIso },
            { field: 'endTime', operator: '>', value: startTimeIso },
          ],
          limit: 1,
        })
        if (conflicts.length > 0) {
          return res.status(409).json({
            error: t(
              'booking.venueUnavailable',
              {},
              {
                defaultValue: 'That venue is already booked for the selected time',
              },
            ),
          })
        }
      }

      const metadata = {
        venueId,
        hostUserId: venue.host_user_id ?? venue.owner_id,
        guestCount: body.guest_count ?? null,
        eventType: body.event_type ?? null,
        subtotal,
        serviceFee,
        total,
      }

      const result = await create('bookings', {
        userId,
        resourceType: 'venue',
        resourceId: venueId,
        status: 'pending',
        startTime: startTimeIso,
        endTime: endTimeIso,
        duration: durationHours * 60,
        notes: body.message ?? null,
        metadata: JSON.stringify(metadata),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      res.status(201).json(result.data)
    } catch (err) {
      console.error('[bookings.create]', err)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.put('/:id/confirm', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session?.userId as string | undefined
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = req.params.id as string
    const booking = await findById<Record<string, unknown>>('bookings', id)
    if (!booking) {
      return res
        .status(404)
        .json({ error: t('booking.notFound', {}, { defaultValue: 'Booking not found' }) })
    }
    const venue = booking.resourceId
      ? await findById<Record<string, unknown>>('venues', String(booking.resourceId))
      : null
    if (!venue || venue.owner_id !== userId) {
      return res
        .status(403)
        .json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }
    const current = String(booking.status)
    // Only a pending booking can be confirmed. Re-confirming is an idempotent no-op;
    // confirming a cancelled/completed booking would resurrect a dead booking (and
    // re-occupy the slot the customer freed) — a state-machine violation.
    if (current === 'confirmed') {
      return res.json(booking)
    }
    if (current !== 'pending') {
      return res.status(409).json({
        error: t(
          'booking.notConfirmable',
          { status: current },
          {
            defaultValue: `A ${current} booking cannot be confirmed`,
          },
        ),
      })
    }
    const updated = await updateById('bookings', id, {
      status: 'confirmed',
      updatedAt: new Date().toISOString(),
    })
    res.json(updated.data)
  } catch (err) {
    console.error('[bookings.confirm]', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.put('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session?.userId as string | undefined
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = req.params.id as string
    const booking = await findById<Record<string, unknown>>('bookings', id)
    if (!booking) {
      return res
        .status(404)
        .json({ error: t('booking.notFound', {}, { defaultValue: 'Booking not found' }) })
    }
    if (booking.userId !== userId) {
      const venue = booking.resourceId
        ? await findById<Record<string, unknown>>('venues', String(booking.resourceId))
        : null
      if (!venue || venue.owner_id !== userId) {
        return res
          .status(403)
          .json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
      }
    }
    const current = String(booking.status)
    // Cancelling is idempotent for an already-cancelled booking; a completed booking
    // is terminal and cannot be un-done by cancelling.
    if (current === 'cancelled') {
      return res.json(booking)
    }
    if (current === 'completed') {
      return res.status(409).json({
        error: t(
          'booking.notCancellable',
          {},
          {
            defaultValue: 'A completed booking cannot be cancelled',
          },
        ),
      })
    }
    const updated = await updateById('bookings', id, {
      status: 'cancelled',
      updatedAt: new Date().toISOString(),
    })
    res.json(updated.data)
  } catch (err) {
    console.error('[bookings.cancel]', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
