import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { count, create, findById, findMany, findOne, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import type { PetCareLimits } from '../tiers.js'

const router = Router()

/**
 * Returns true if the requesting user is either the booking owner or
 * the booking's sitter (joined via `sitters.user_id = userId`).
 */
async function canAccessBooking(
  booking: Record<string, unknown>,
  userId: string,
): Promise<boolean> {
  if (booking.owner_user_id === userId) return true
  if (!booking.sitter_id) return false
  const sitter = await findById<Record<string, unknown>>('sitters', String(booking.sitter_id))
  return Boolean(sitter && sitter.user_id === userId)
}

// SECURITY: no `price_cents` field here — the price is ALWAYS computed
// server-side from the sitter's rate × duration (see the create handler).
// Accepting a client-supplied price would let a caller book at an arbitrary
// rate (under/over-charge) — same class as a client-trusted order total.
const createBookingSchema = z.object({
  sitter_id: z.string().min(1),
  pet_ids: z.array(z.string().min(1)).min(1),
  service: z.string().min(1),
  starts_at: z.string().min(1),
  ends_at: z.string().min(1),
  notes: z.string().optional(),
})

const messageSchema = z.object({
  body: z.string().min(1),
  attachments: z.array(z.string()).optional(),
})

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  body: z.string().optional(),
})

/**
 * Hydrate bookings with their sitter's display_name and the names of
 * the linked pets so the UI can render `${service} · ${pet_name}` rows
 * without fanning out per-row queries.
 */
async function hydrateBookings(
  rows: Array<Record<string, unknown>>,
): Promise<Array<Record<string, unknown>>> {
  if (rows.length === 0) return rows
  const sitterIds = Array.from(new Set(rows.map((r) => String(r.sitter_id)).filter(Boolean)))
  const petIds = Array.from(
    new Set(
      rows.flatMap((r) => {
        const raw = r.pet_ids
        if (Array.isArray(raw)) return raw.map(String)
        if (typeof raw === 'string') {
          try {
            const parsed = JSON.parse(raw)
            return Array.isArray(parsed) ? parsed.map(String) : []
          } catch (_error) {
            // JSON.parse failed — raw value is malformed; fall back to empty array
            return []
          }
        }
        return []
      }),
    ),
  )
  const [sitters, pets] = await Promise.all([
    sitterIds.length
      ? findMany<Record<string, unknown>>('sitters', {
          where: [{ field: 'id', operator: 'in', value: sitterIds }],
          select: ['id', 'display_name'],
        })
      : Promise.resolve([]),
    petIds.length
      ? findMany<Record<string, unknown>>('pets', {
          where: [{ field: 'id', operator: 'in', value: petIds }],
          select: ['id', 'name'],
        })
      : Promise.resolve([]),
  ])
  const sitterById = new Map(sitters.map((s) => [String(s.id), String(s.display_name ?? '')]))
  const petById = new Map(pets.map((p) => [String(p.id), String(p.name ?? '')]))
  return rows.map((r) => {
    const rawPetIds = (() => {
      const raw = r.pet_ids
      if (Array.isArray(raw)) return raw.map(String)
      if (typeof raw === 'string') {
        try {
          const parsed = JSON.parse(raw)
          return Array.isArray(parsed) ? parsed.map(String) : []
        } catch (_error) {
          // JSON.parse failed — raw value is malformed; fall back to empty array
          return []
        }
      }
      return []
    })()
    const petNames = rawPetIds.map((id) => petById.get(id)).filter(Boolean) as string[]
    return {
      ...r,
      sitter_name: sitterById.get(String(r.sitter_id)) ?? r.sitter_name ?? null,
      pet_name: petNames.join(', ') || null,
      pet_names: petNames,
      // Mirror DB columns under the field names the front-end expects.
      start_date: r.starts_at ?? r.startTime ?? null,
      end_date: r.ends_at ?? r.endTime ?? null,
    }
  })
}

router.get('/', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  }

  // A user sees bookings where they are the owner OR the sitter (via sitters.user_id).
  const sitterRow = await findOne<Record<string, unknown>>('sitters', [
    { field: 'user_id', operator: '=', value: userId },
  ])

  const ownerWhere: WhereCondition[] = [{ field: 'owner_user_id', operator: '=', value: userId }]
  if (req.query.status) {
    ownerWhere.push({ field: 'status', operator: '=', value: String(req.query.status) })
  }

  const ownerBookings = await findMany('bookings', {
    where: ownerWhere,
    orderBy: [{ field: 'starts_at', direction: 'desc' }],
    limit: 200,
  })

  let sitterBookings: Array<Record<string, unknown>> = []
  if (sitterRow) {
    const sw: WhereCondition[] = [
      { field: 'sitter_id', operator: '=', value: String(sitterRow.id) },
    ]
    if (req.query.status)
      sw.push({ field: 'status', operator: '=', value: String(req.query.status) })
    sitterBookings = await findMany<Record<string, unknown>>('bookings', {
      where: sw,
      orderBy: [{ field: 'starts_at', direction: 'desc' }],
      limit: 200,
    })
  }

  // Dedupe (sitter who owns a booking will appear in both lists).
  const merged = new Map<string, Record<string, unknown>>()
  for (const b of [...(ownerBookings as Array<Record<string, unknown>>), ...sitterBookings]) {
    merged.set(String(b.id), b)
  }

  const hydrated = await hydrateBookings(Array.from(merged.values()))
  res.json(hydrated)
})

/**
 * Dashboard "upcoming" list. Returns the user's bookings with status in
 * (requested|confirmed|pending|in_progress), ordered by start time
 * ascending. Status alone decides inclusion (an in_progress booking has
 * already started, so no start-time cutoff is applied). MUST be declared
 * BEFORE `/:id` so Express doesn't route the literal `upcoming` segment
 * as an id.
 */
router.get('/upcoming', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  }
  const rows = await findMany<Record<string, unknown>>('bookings', {
    where: [
      { field: 'owner_user_id', operator: '=', value: userId },
      {
        field: 'status',
        operator: 'in',
        value: ['requested', 'confirmed', 'pending', 'in_progress'],
      },
    ],
    orderBy: [{ field: 'starts_at', direction: 'asc' }],
    limit: 20,
  })
  const hydrated = await hydrateBookings(rows)
  res.json(hydrated)
})

router.get('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  }

  const booking = await findById<Record<string, unknown>>('bookings', getParamId(req))
  if (!booking || !(await canAccessBooking(booking, userId))) {
    return res
      .status(404)
      .json({ error: t('bookings.notFound', {}, { defaultValue: 'Booking not found' }) })
  }
  const [hydrated] = await hydrateBookings([booking])
  res.json(hydrated)
})

// Free-tier booking cap — defined in tiers.ts + advertised, and bonds/index.ts claims this handler
// enforces it, but only pets.ts did. Gate create on maxBookings, counting the user's own bookings
// (owner_user_id), mirroring the maxPets gate in pets.ts.
const enforceBookingLimit = enforceLimit<PetCareLimits>({
  limitType: 'maxBookings',
  getLimit: (limits) => limits.maxBookings,
  getCurrent: async (userId) =>
    count('bookings', [{ field: 'owner_user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post(
  '/',
  enforceBookingLimit,
  validateBody(createBookingSchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const sitter = await findById<Record<string, unknown>>('sitters', String(req.body.sitter_id))
    if (!sitter || sitter.is_active === false) {
      return res
        .status(404)
        .json({ error: t('sitters.notFound', {}, { defaultValue: 'Sitter not found' }) })
    }

    // Confirm the requesting user actually owns every requested pet.
    for (const pid of req.body.pet_ids as string[]) {
      const pet = await findById<Record<string, unknown>>('pets', pid)
      if (!pet || pet.owner_user_id !== userId) {
        return res.status(403).json({
          error: t('pets.notOwned', { id: pid }, { defaultValue: 'You do not own pet {{id}}' }),
        })
      }
    }

    // SECURITY: price is computed server-side UNCONDITIONALLY from the
    // sitter's hourly rate × booked duration. A client-sent `price_cents` is
    // never read (dropped from the schema above; unknown keys are ignored here
    // too as defense in depth) — otherwise callers could book at any rate.
    const start = new Date(req.body.starts_at)
    const end = new Date(req.body.ends_at)
    const minutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000))
    const rateCents = Number(sitter.hourly_rate_cents ?? 0)
    const computedPriceCents = Math.round((rateCents * minutes) / 60)

    const result = await create('bookings', {
      owner_user_id: userId,
      sitter_id: req.body.sitter_id,
      // pet_ids is a jsonb column — see note in sitters.ts about JSON.stringify.
      pet_ids: JSON.stringify(req.body.pet_ids),
      service: req.body.service,
      starts_at: start,
      ends_at: end,
      status: 'requested',
      price_cents: computedPriceCents,
      notes: req.body.notes ?? '',
      // Generic resource-booking columns are nullable post-0010 migration;
      // populate them with sensible defaults so legacy queries still work.
      userId,
      resourceType: 'sitter',
      resourceId: req.body.sitter_id,
      startTime: start,
      endTime: end,
      duration: minutes,
    })

    // Notify the owner so the bell badge reflects the new booking.
    await create('notifications', {
      user_id: userId,
      kind: 'booking.created',
      payload: JSON.stringify({
        bookingId: result.data?.id,
        sitterName: sitter.display_name,
        service: req.body.service,
        startsAt: start.toISOString(),
      }),
    })

    res.status(201).json(result.data)
  },
)

router.post('/:id/confirm', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  }

  const id = getParamId(req)
  const booking = await findById<Record<string, unknown>>('bookings', id)
  if (!booking) {
    return res
      .status(404)
      .json({ error: t('bookings.notFound', {}, { defaultValue: 'Booking not found' }) })
  }

  // Only the sitter (owner of the sitters row) may confirm.
  const sitter = booking.sitter_id
    ? await findById<Record<string, unknown>>('sitters', String(booking.sitter_id))
    : null
  if (!sitter || sitter.user_id !== userId) {
    return res.status(403).json({
      error: t(
        'bookings.notSitter',
        {},
        { defaultValue: 'Only the sitter may confirm this booking' },
      ),
    })
  }

  if (String(booking.status) === 'confirmed') {
    return res.json(booking) // idempotent — already confirmed
  }

  // Prevent double-booking: overlapping REQUESTS are allowed (the sitter arbitrates), but a
  // sitter must not CONFIRM a request that overlaps one they have already confirmed — that
  // would commit them to two bookings at once. Overlap iff existing.start < this.end AND
  // existing.end > this.start; starts_at/ends_at are timestamptz.
  const bStart = new Date(String(booking.starts_at))
  const bEnd = new Date(String(booking.ends_at))
  if (!Number.isNaN(bStart.getTime()) && !Number.isNaN(bEnd.getTime())) {
    const overlaps = await findMany<Record<string, unknown>>('bookings', {
      where: [
        { field: 'sitter_id', operator: '=', value: booking.sitter_id },
        { field: 'status', operator: 'in', value: ['confirmed', 'in_progress'] },
        { field: 'starts_at', operator: '<', value: bEnd.toISOString() },
        { field: 'ends_at', operator: '>', value: bStart.toISOString() },
      ],
      limit: 5,
    })
    if (overlaps.some((o) => String(o.id) !== String(id))) {
      return res.status(409).json({
        error: t(
          'bookings.sitterBusy',
          {},
          {
            defaultValue: 'You already have a confirmed booking during this time',
          },
        ),
      })
    }
  }

  const result = await updateById('bookings', id, {
    status: 'confirmed',
  })
  res.json(result.data)
})

router.post('/:id/cancel', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  }

  const id = getParamId(req)
  const booking = await findById<Record<string, unknown>>('bookings', id)
  if (!booking || !(await canAccessBooking(booking, userId))) {
    return res
      .status(404)
      .json({ error: t('bookings.notFound', {}, { defaultValue: 'Booking not found' }) })
  }

  const result = await updateById('bookings', id, {
    status: 'cancelled',
    cancelled_at: new Date(),
  })
  res.json(result.data)
})

router.post('/:id/complete', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  }

  const id = getParamId(req)
  const booking = await findById<Record<string, unknown>>('bookings', id)
  if (!booking) {
    return res
      .status(404)
      .json({ error: t('bookings.notFound', {}, { defaultValue: 'Booking not found' }) })
  }
  const sitter = booking.sitter_id
    ? await findById<Record<string, unknown>>('sitters', String(booking.sitter_id))
    : null
  if (!sitter || sitter.user_id !== userId) {
    return res.status(403).json({
      error: t(
        'bookings.notSitter',
        {},
        { defaultValue: 'Only the sitter may complete this booking' },
      ),
    })
  }

  const result = await updateById('bookings', id, {
    status: 'completed',
    completed_at: new Date(),
  })
  res.json(result.data)
})

/* ---------- Booking messages ---------- */

router.get('/:id/messages', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  }

  const id = getParamId(req)
  const booking = await findById<Record<string, unknown>>('bookings', id)
  if (!booking || !(await canAccessBooking(booking, userId))) {
    return res
      .status(404)
      .json({ error: t('bookings.notFound', {}, { defaultValue: 'Booking not found' }) })
  }

  const messages = await findMany('booking_messages', {
    where: [{ field: 'booking_id', operator: '=', value: id }],
    orderBy: [{ field: 'sent_at', direction: 'asc' }],
  })
  res.json(messages)
})

router.post('/:id/messages', validateBody(messageSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  }

  const id = getParamId(req)
  const booking = await findById<Record<string, unknown>>('bookings', id)
  if (!booking || !(await canAccessBooking(booking, userId))) {
    return res
      .status(404)
      .json({ error: t('bookings.notFound', {}, { defaultValue: 'Booking not found' }) })
  }

  const result = await create('booking_messages', {
    booking_id: id,
    sender_user_id: userId,
    body: req.body.body,
    attachments: JSON.stringify(req.body.attachments ?? []),
  })
  res.status(201).json(result.data)
})

/* ---------- Sitter reviews ---------- */

router.post('/:id/review', validateBody(reviewSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  }

  const id = getParamId(req)
  const booking = await findById<Record<string, unknown>>('bookings', id)
  if (!booking || booking.owner_user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('bookings.notFound', {}, { defaultValue: 'Booking not found' }) })
  }
  if (booking.status !== 'completed') {
    return res.status(400).json({
      error: t(
        'bookings.notCompleted',
        {},
        { defaultValue: 'Cannot review a booking that has not completed' },
      ),
    })
  }
  if (!booking.sitter_id) {
    return res.status(400).json({
      error: t('bookings.noSitter', {}, { defaultValue: 'Booking has no sitter' }),
    })
  }

  const result = await create('sitter_reviews', {
    booking_id: id,
    sitter_id: booking.sitter_id,
    reviewer_user_id: userId,
    rating: req.body.rating,
    body: req.body.body ?? '',
  })

  // Recompute sitter aggregate rating.
  const all = await findMany<Record<string, unknown>>('sitter_reviews', {
    where: [{ field: 'sitter_id', operator: '=', value: String(booking.sitter_id) }],
  })
  const avg =
    all.length > 0 ? all.reduce((acc, r) => acc + Number(r.rating ?? 0), 0) / all.length : 0
  await updateById('sitters', String(booking.sitter_id), {
    avg_rating: Number(avg.toFixed(2)),
    total_bookings: all.length,
  })

  res.status(201).json(result.data)
})

export default router
