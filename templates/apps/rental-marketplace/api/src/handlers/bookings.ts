/**
 * Bookings handler — guest reservations against host listings.
 *
 * GET /bookings           — auth; lists own bookings (?role=guest, default)
 *                           OR host's incoming bookings (?role=host:
 *                           filtered by listings the user owns)
 * GET /bookings/:id       — auth + party scoping (guest or host of listing)
 * POST /bookings          — auth + tier-gated create (guest books)
 * PUT /bookings/:id/confirm — auth + host-only (host accepts pending)
 * PUT /bookings/:id/cancel  — auth + party scoping (either side)
 *
 * Storage uses the canonical `@molecule/api-resource-booking` schema:
 *   id / userId / resourceType / resourceId / startTime / endTime /
 *   duration / status / notes / metadata (JSONB) / createdAt / updatedAt
 *
 * Marketplace-specific fields (hostId, guests, subtotal, serviceFee,
 * cleaningFee, total, paymentIntentId, cancellationReason) live in
 * `metadata` JSONB. This mirrors the venue-booking pattern.
 *
 * On confirmation, a host_payouts row is created. The live Stripe
 * Connect transfer is dispatched via routes/payouts.ts when
 * STRIPE_CONNECT_ACCOUNT_ID is configured.
 */
import type { Request, RequestHandler, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import type { FindManyOptions, WhereCondition } from '@molecule/api-database'
import { count, create, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

import type { RentalMarketplaceLimits } from '../tiers.js'
import { decorateBooking, decorateBookings } from './_decorate.js'
import { seedDemoForUser } from './_seed.js'

const createBookingSchema = z.object({
  listing_id: z.string().min(1),
  check_in: z.string().min(1),
  check_out: z.string().min(1),
  guests: z.number().int().positive().optional().default(1),
  payment_intent_id: z.string().optional(),
  notes: z.string().optional(),
})

const cancelBookingSchema = z.object({
  reason: z.string().optional(),
})

const listBookingsQuery = z.object({
  role: z.enum(['guest', 'host']).optional().default('guest'),
  status: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
})

const router = Router()

interface BookingMetadata {
  hostId?: string | null
  guests?: number
  subtotal?: number
  serviceFee?: number
  cleaningFee?: number
  total?: number
  nights?: number
  paymentIntentId?: string | null
  cancellationReason?: string | null
}

/**
 * Normalise a timestamp column to ISO-8601 for use in a query value.
 *
 * @param value - Whatever the driver returned for the column (Date or string).
 * @returns The ISO string, or null if absent/unparseable.
 */
function toIsoTimestamp(value: unknown): string | null {
  if (value == null) return null
  const d = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function readMetadata(b: Record<string, unknown>): BookingMetadata {
  if (!b.metadata) return {}
  if (typeof b.metadata === 'string') {
    try {
      return JSON.parse(b.metadata) as BookingMetadata
    } catch (_error) {
      // Invalid JSON string — return empty metadata as fallback.
      return {}
    }
  }
  return b.metadata as BookingMetadata
}

router.get('/', validateQuery(listBookingsQuery), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session?.userId as string | undefined
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const { role, status, page, limit } = req.query as unknown as z.infer<typeof listBookingsQuery>

    if (role === 'host') {
      // Host view: bookings against any listing this user owns. Two-pass
      // because the DataStore abstraction doesn't expose `IN` cleanly —
      // pull the host's listing ids first.
      const myListings = await findMany<Record<string, unknown>>('listings', {
        where: [{ field: 'host_id', operator: '=', value: userId }],
        limit: 500,
      })
      const listingIds = myListings.map((l) => String(l.id))
      if (listingIds.length === 0) {
        return res.json({ data: [], total: 0, page, limit })
      }
      // Aggregate one query per listing — small N (host listings) keeps
      // this within tier limits + avoids raw SQL.
      const buckets = await Promise.all(
        listingIds.map((lid) =>
          findMany<Record<string, unknown>>('bookings', {
            where: [
              { field: 'resourceType', operator: '=', value: 'listing' },
              { field: 'resourceId', operator: '=', value: lid },
              ...(status ? [{ field: 'status', operator: '=' as const, value: status }] : []),
            ],
            limit,
          }),
        ),
      )
      const rows = buckets.flat()
      rows.sort((a, b) => {
        const ax = a.createdAt ? new Date(String(a.createdAt)).getTime() : 0
        const bx = b.createdAt ? new Date(String(b.createdAt)).getTime() : 0
        return bx - ax
      })
      const decorated = await decorateBookings(rows.slice(0, limit), userId)
      return res.json({ data: decorated, total: rows.length, page, limit })
    }

    const where: WhereCondition[] = [{ field: 'userId', operator: '=', value: userId }]
    if (status) where.push({ field: 'status', operator: '=', value: status })

    const options: FindManyOptions = {
      where,
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      limit,
      offset: (page - 1) * limit,
    }
    const [rows, total] = await Promise.all([
      findMany<Record<string, unknown>>('bookings', options),
      count('bookings', where),
    ])
    const data = await decorateBookings(rows, userId)
    res.json({ data, total, page, limit })
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
    const id = String(req.params.id)
    const booking = await findById<Record<string, unknown>>('bookings', id)
    if (!booking) {
      return res
        .status(404)
        .json({ error: t('booking.notFound', {}, { defaultValue: 'Booking not found' }) })
    }
    // Visible to its guest (userId) OR to the listing's host.
    if (booking.userId !== userId) {
      const meta = readMetadata(booking)
      const listingId = booking.resourceId ? String(booking.resourceId) : null
      const listing = listingId
        ? await findById<Record<string, unknown>>('listings', listingId)
        : null
      const hostId = meta.hostId ?? (listing ? String(listing.host_id) : null)
      if (hostId !== userId) {
        return res
          .status(403)
          .json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
      }
    }
    const decorated = await decorateBooking(booking, userId)
    res.json(decorated)
  } catch (err) {
    console.error('[bookings.get]', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post(
  '/',
  enforceLimit<RentalMarketplaceLimits>({
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

      const listing = await findById<Record<string, unknown>>('listings', body.listing_id)
      if (!listing) {
        return res
          .status(404)
          .json({ error: t('listing.notFound', {}, { defaultValue: 'Listing not found' }) })
      }
      if (listing.host_id === userId) {
        return res.status(400).json({
          error: t('booking.cannotBookOwn', {}, { defaultValue: 'Cannot book your own listing' }),
        })
      }

      // Enforce the listing's stored capacity. `max_guests` was set on the listing and used to
      // filter search + cap the client picker, but the booking API accepted any party size — a
      // direct POST could overbook. Reject a booking whose guest count exceeds the listing cap.
      const maxGuests = Number(listing.max_guests) || 0
      if (maxGuests > 0 && body.guests > maxGuests) {
        return res.status(400).json({
          error: t(
            'booking.tooManyGuests',
            { max: maxGuests },
            { defaultValue: 'This listing accommodates up to {{max}} guest(s).' },
          ),
        })
      }

      const checkInTs = new Date(body.check_in).getTime()
      const checkOutTs = new Date(body.check_out).getTime()
      if (!Number.isFinite(checkInTs) || !Number.isFinite(checkOutTs) || checkOutTs <= checkInTs) {
        return res.status(400).json({
          error: t(
            'booking.invalidDates',
            {},
            { defaultValue: 'Invalid check-in / check-out dates' },
          ),
        })
      }
      const nights = Math.max(1, Math.ceil((checkOutTs - checkInTs) / (1000 * 60 * 60 * 24)))
      const pricePerNight = Number(listing.price_per_night) || 0
      const cleaningFee = Number(listing.cleaning_fee) || 0
      const subtotal = nights * pricePerNight
      // Honor the listing's own service-fee rate (per-listing column, default 0.12);
      // this was hardcoded 0.12, so a host's configured rate never affected the charge.
      const serviceFeeRate = Number(listing.service_fee_rate ?? 0.12)
      const serviceFee = Math.round(subtotal * serviceFeeRate)
      const total = subtotal + serviceFee + cleaningFee

      const metadata: BookingMetadata = {
        hostId: listing.host_id ? String(listing.host_id) : null,
        guests: body.guests,
        nights,
        subtotal,
        serviceFee,
        cleaningFee,
        total,
        paymentIntentId: body.payment_intent_id ?? null,
      }

      const result = await create<Record<string, unknown>>('bookings', {
        userId,
        resourceType: 'listing',
        resourceId: body.listing_id,
        startTime: new Date(checkInTs).toISOString(),
        endTime: new Date(checkOutTs).toISOString(),
        duration: nights,
        status: 'pending',
        notes: body.notes ?? null,
        metadata: JSON.stringify(metadata),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      // Per-user demo seed (idempotent) — first booking pulls a fresh
      // user into a populated /wishlist, /messages, /notifications.
      seedDemoForUser(userId).catch(() => {
        // best-effort
      })

      const booking = result.data as Record<string, unknown> | null
      const decorated = booking ? await decorateBooking(booking, userId) : null
      res.status(201).json(decorated ?? booking)
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
    const id = String(req.params.id)
    const booking = await findById<Record<string, unknown>>('bookings', id)
    if (!booking) {
      return res
        .status(404)
        .json({ error: t('booking.notFound', {}, { defaultValue: 'Booking not found' }) })
    }
    const meta = readMetadata(booking)
    const listingId = booking.resourceId ? String(booking.resourceId) : null
    const listing = listingId
      ? await findById<Record<string, unknown>>('listings', listingId)
      : null
    const hostId = meta.hostId ?? (listing ? String(listing.host_id) : null)
    if (!hostId || hostId !== userId) {
      return res
        .status(403)
        .json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }

    // Idempotent: an already-confirmed booking must not be re-confirmed — that would record a
    // SECOND host_payout row for the same booking (double payout).
    if (String(booking.status) === 'confirmed') {
      return res.json(booking)
    }

    // Prevent double-booking the listing: overlapping pending REQUESTS are allowed (the host
    // arbitrates), but the host must not CONFIRM a booking that overlaps one already confirmed
    // for the same listing. Overlap iff existing.start < this.end AND existing.end > this.start.
    // ISO, not String(). The driver hands timestamps back as JS Dates, and
    // String(date) is the locale form — "Mon Jul 27 2026 12:00:00 GMT+0300
    // (Eastern European Summer Time)". Feeding that back into the timestamp
    // comparison below made Postgres parse `gmt+0300` as a time zone name and
    // throw, so every confirm answered 500 and no booking could be approved.
    const startTime = toIsoTimestamp(booking.startTime)
    const endTime = toIsoTimestamp(booking.endTime)
    if (startTime && endTime && listingId) {
      const overlaps = await findMany<Record<string, unknown>>('bookings', {
        where: [
          { field: 'resourceType', operator: '=', value: 'listing' },
          { field: 'resourceId', operator: '=', value: listingId },
          { field: 'status', operator: '=', value: 'confirmed' },
          { field: 'startTime', operator: '<', value: endTime },
          { field: 'endTime', operator: '>', value: startTime },
        ],
        limit: 5,
      })
      if (overlaps.some((o) => String(o.id) !== id)) {
        return res.status(409).json({
          error: t(
            'booking.datesUnavailable',
            {},
            {
              defaultValue: 'Those dates are already booked for this listing',
            },
          ),
        })
      }
    }

    const updateResult = await updateById<Record<string, unknown>>('bookings', id, {
      status: 'confirmed',
      updatedAt: new Date().toISOString(),
    })
    const updatedBooking = updateResult.data as Record<string, unknown> | null

    // Record a host_payout row. Live Stripe Connect transfer is dispatched
    // by handlers/payouts.ts when STRIPE_CONNECT_ACCOUNT_ID is configured;
    // until then we record the row in `pending` so the dashboards stay
    // accurate without forging fake transfer ids.
    try {
      const subtotal = Number(meta.subtotal) || 0
      const serviceFee = Number(meta.serviceFee) || 0
      // The cleaning fee is host revenue (host-configured, charged to the guest as part of the
      // booking total), so it passes through to the host payout — only the platform's service fee is
      // withheld. It was previously dropped here, so the platform silently kept 100% of it.
      const cleaningFee = Number(meta.cleaningFee) || 0
      const payoutAmount = Math.max(0, subtotal + cleaningFee - serviceFee)
      await create('host_payouts', {
        host_id: hostId,
        user_id: hostId,
        booking_id: id,
        amount: payoutAmount,
        service_fee: serviceFee,
        currency: 'USD',
        status: 'pending',
        created_at: new Date().toISOString(),
      })
    } catch (payoutErr) {
      console.error('[bookings.confirm.payout]', payoutErr)
    }

    const decorated = updatedBooking ? await decorateBooking(updatedBooking, userId) : null
    res.json(decorated ?? updatedBooking)
  } catch (err) {
    console.error('[bookings.confirm]', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.put(
  '/:id/cancel',
  validateBody(cancelBookingSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = res.locals.session?.userId as string | undefined
      if (!userId) {
        return res
          .status(401)
          .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      }
      const id = String(req.params.id)
      const booking = await findById<Record<string, unknown>>('bookings', id)
      if (!booking) {
        return res
          .status(404)
          .json({ error: t('booking.notFound', {}, { defaultValue: 'Booking not found' }) })
      }
      const meta = readMetadata(booking)
      if (booking.userId !== userId) {
        const listingId = booking.resourceId ? String(booking.resourceId) : null
        const listing = listingId
          ? await findById<Record<string, unknown>>('listings', listingId)
          : null
        const hostId = meta.hostId ?? (listing ? String(listing.host_id) : null)
        if (!hostId || hostId !== userId) {
          return res
            .status(403)
            .json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
        }
      }
      const body = req.body as z.infer<typeof cancelBookingSchema>
      const newMeta: BookingMetadata = { ...meta, cancellationReason: body.reason ?? null }
      const updated = await updateById<Record<string, unknown>>('bookings', id, {
        status: 'cancelled',
        metadata: JSON.stringify(newMeta),
        updatedAt: new Date().toISOString(),
      })
      const updatedBooking = updated.data as Record<string, unknown> | null
      const decorated = updatedBooking ? await decorateBooking(updatedBooking, userId) : null
      res.json(decorated ?? updatedBooking)
    } catch (err) {
      console.error('[bookings.cancel]', err)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

export default router
