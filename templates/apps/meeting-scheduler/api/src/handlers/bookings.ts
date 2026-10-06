/**
 * Booking endpoints — both authed (host viewing/managing their bookings)
 * and public (invitee creating + cancelling via signed token).
 *
 * Public surface (no auth required):
 *   POST /api/bookings/public — body must include `event_type_slug`
 *     -> creates the booking against the slug's owner; returns
 *        { booking, cancellationToken }
 *   GET  /api/bookings/by-token/:token  -> booking + event-type + host (limited shape)
 *   POST /api/bookings/by-token/:token/cancel -> sets status='cancelled'
 *
 * Authed surface (host):
 *   GET   /api/bookings
 *   GET   /api/bookings/:id
 *   POST  /api/bookings  (book on behalf of yourself, e.g. test data)
 *   PATCH /api/bookings/:id
 *   PUT   /api/bookings/:id
 *
 * @module
 */

import crypto from 'node:crypto'

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { get, getLogger } from '@molecule/api-bond'
import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { get as getConfig } from '@molecule/api-config'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { count, create, findById, findMany, findOne, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import { getSystemOwnerId } from '../lib/business.js'
import { formatInTimezone } from '../lib/format-time.js'
import type { MeetingSchedulerLimits } from '../tiers.js'

const router = Router()
const logger = getLogger()

interface BookingRow {
  id: string
  event_type_id: string
  host_user_id: string
  invitee_name: string
  invitee_email: string
  invitee_timezone: string
  start_at: string | Date
  end_at: string | Date
  status: string
  location_kind: string
  location_value: unknown
  notes: string | null
  cancellation_token: string | null
}

interface EventTypeRow {
  id: string
  owner_id: string
  name: string
  slug: string
  duration_minutes: number
  location_kind: string
  location_value: unknown
  buffer_before_minutes: number
  buffer_after_minutes: number
  min_notice_minutes: number
  max_per_day: number | null
  requires_confirmation: boolean
  is_active: boolean
}

interface UserRow {
  id: string
  name: string | null
  email: string | null
}

function getParamToken(req: Request): string {
  const tok = req.params.token
  return Array.isArray(tok) ? tok[0] : tok
}

const STATUS_VALUES = ['scheduled', 'cancelled', 'completed', 'no_show', 'pending'] as const

const createBookingSchema = z.object({
  event_type_id: z.string().min(1),
  invitee_name: z.string().min(1).max(200),
  invitee_email: z.string().email().max(320),
  invitee_timezone: z.string().min(1).max(64).optional(),
  start_at: z.string().min(1),
  end_at: z.string().min(1),
  notes: z.string().max(2000).optional(),
  answers: z.unknown().optional(),
  location_kind: z
    .enum(['in_person', 'phone', 'zoom', 'google_meet', 'jitsi', 'custom'])
    .optional(),
  location_value: z.unknown().optional(),
})

const publicBookingSchema = z.object({
  event_type_slug: z.string().min(1).max(80),
  invitee_name: z.string().min(1).max(200),
  invitee_email: z.string().email().max(320),
  invitee_timezone: z.string().min(1).max(64).optional(),
  start_at: z.string().min(1),
  notes: z.string().max(2000).optional(),
})

const updateBookingSchema = z.object({
  status: z.enum(STATUS_VALUES).optional(),
  start_at: z.string().min(1).optional(),
  end_at: z.string().min(1).optional(),
  notes: z.string().max(2000).optional(),
  cancellation_reason: z.string().max(500).optional(),
  location_kind: z
    .enum(['in_person', 'phone', 'zoom', 'google_meet', 'jitsi', 'custom'])
    .optional(),
  location_value: z.unknown().optional(),
})

const cancelByTokenSchema = z.object({
  reason: z.string().max(500).optional(),
})

async function findBookingsOverlapping(
  userId: string,
  startAt: Date,
  endAt: Date,
): Promise<BookingRow[]> {
  return (await findMany<BookingRow>('bookings', {
    where: [
      { field: 'host_user_id', operator: '=', value: userId },
      { field: 'status', operator: '=', value: 'scheduled' },
      { field: 'start_at', operator: '<', value: endAt.toISOString() },
      { field: 'end_at', operator: '>', value: startAt.toISOString() },
    ],
    limit: 5,
    offset: 0,
  })) as BookingRow[]
}

async function sendBookingEmails(opts: {
  eventType: EventTypeRow
  host: UserRow | null
  inviteeName: string
  inviteeEmail: string
  inviteeTimezone: string
  startAt: Date
  endAt: Date
  cancellationToken: string
  location: { kind: string; value: unknown }
  appOrigin: string
  pending: boolean
}): Promise<void> {
  const provider = get<{ sendMail(opts: Record<string, unknown>): Promise<unknown> }>('email')
  if (!provider?.sendMail) return

  // Show each recipient the meeting time in THEIR timezone: the invitee in the
  // timezone they submitted (invitee_timezone), the host in their configured
  // availability timezone. Both previously saw a hardcoded UTC time, so the
  // stored invitee_timezone had no effect on the confirmation.
  const inviteeLabel = formatInTimezone(opts.startAt, opts.inviteeTimezone)
  const hostRules = opts.host
    ? ((await findMany('availability_rules', {
        where: [{ field: 'user_id', operator: '=', value: opts.host.id }],
        limit: 200,
        offset: 0,
      })) as Array<{ timezone?: string }>)
    : []
  const hostLabel = formatInTimezone(
    opts.startAt,
    hostRules.find((r) => r.timezone)?.timezone || 'UTC',
  )
  const fromAddress = getConfig(
    'EMAIL_FROM',
    `no-reply@${getConfig('MAILGUN_DOMAIN', 'localhost')}`,
  ) as string
  // The /confirmed page reads the booking by token and offers the cancel
  // action — there is no dedicated /book/:slug/cancel route in the app.
  const cancelUrl = `${opts.appOrigin}/book/${opts.eventType.slug}/confirmed?token=${opts.cancellationToken}`

  const hostName = opts.host?.name ?? opts.host?.email ?? 'host'
  const inviteeMessage = {
    from: fromAddress,
    to: opts.inviteeEmail,
    subject: opts.pending
      ? `Booking request received: ${opts.eventType.name}`
      : `Booking confirmed: ${opts.eventType.name}`,
    text: `Hi ${opts.inviteeName},

${
  opts.pending
    ? `Your ${opts.eventType.duration_minutes}-minute "${opts.eventType.name}" request with ${hostName} for ${inviteeLabel} is awaiting confirmation — you'll get an email once ${hostName} confirms it.`
    : `Your ${opts.eventType.duration_minutes}-minute "${opts.eventType.name}" with ${hostName} is confirmed for ${inviteeLabel}.`
}

If you need to cancel: ${cancelUrl}
`,
    html: `<p>Hi ${opts.inviteeName},</p>
<p>${
      opts.pending
        ? `Your <strong>${opts.eventType.duration_minutes}-minute "${opts.eventType.name}"</strong> request with ${hostName} for <strong>${inviteeLabel}</strong> is awaiting confirmation — you'll get an email once ${hostName} confirms it.`
        : `Your <strong>${opts.eventType.duration_minutes}-minute "${opts.eventType.name}"</strong> with ${hostName} is confirmed for <strong>${inviteeLabel}</strong>.`
    }</p>
<p>If you need to cancel, <a href="${cancelUrl}">click here</a>.</p>`,
  }
  await provider.sendMail(inviteeMessage).catch((err) => {
    logger.warn('booking confirmation email (invitee) failed', { err })
  })

  if (opts.host?.email) {
    const hostMessage = {
      from: fromAddress,
      to: opts.host.email,
      subject: opts.pending
        ? `Booking request (needs confirmation): ${opts.eventType.name} with ${opts.inviteeName}`
        : `New booking: ${opts.eventType.name} with ${opts.inviteeName}`,
      text: `${opts.pending ? 'New booking request' : 'New booking'} on ${hostLabel}.${
        opts.pending ? ' Confirm or decline it from your bookings.' : ''
      }

Invitee: ${opts.inviteeName} <${opts.inviteeEmail}>
Duration: ${opts.eventType.duration_minutes} minutes
`,
      html: `<p>${
        opts.pending ? 'New booking request' : 'New booking'
      } on <strong>${hostLabel}</strong>.${
        opts.pending ? ' Confirm or decline it from your bookings.' : ''
      }</p>
<p>Invitee: ${opts.inviteeName} &lt;${opts.inviteeEmail}&gt;<br/>
Duration: ${opts.eventType.duration_minutes} minutes</p>`,
    }
    await provider.sendMail(hostMessage).catch((err) => {
      logger.warn('booking confirmation email (host) failed', { err })
    })
  }
}

// ---- public routes (declared first so /:id never shadows them) ----------

router.post('/public', validateBody(publicBookingSchema), async (req: Request, res: Response) => {
  const body = req.body as z.infer<typeof publicBookingSchema>
  const eventType = (await findOne<EventTypeRow>('event_types', [
    { field: 'slug', operator: '=', value: body.event_type_slug },
    { field: 'is_active', operator: '=', value: true },
  ])) as EventTypeRow | null
  if (!eventType) {
    return res
      .status(404)
      .json({ error: t('eventType.notFound', {}, { defaultValue: 'Event type not found' }) })
  }
  const startAt = new Date(body.start_at)
  if (Number.isNaN(startAt.getTime())) {
    return res.status(400).json({
      error: t('booking.invalidStart', {}, { defaultValue: 'invalid start_at' }),
    })
  }
  const endAt = new Date(startAt.getTime() + eventType.duration_minutes * 60_000)

  const minNoticeMs = (eventType.min_notice_minutes || 0) * 60_000
  if (startAt.getTime() < Date.now() + minNoticeMs) {
    return res.status(400).json({
      error: t('booking.tooSoon', {}, { defaultValue: 'Slot is in the past or too soon.' }),
    })
  }

  // Enforce the event type's per-day cap — external bookers must not exceed it (it was ignored).
  if (eventType.max_per_day != null) {
    const dayStart = new Date(startAt)
    dayStart.setUTCHours(0, 0, 0, 0)
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60_000)
    const sameDay = await count('bookings', [
      { field: 'event_type_id', operator: '=', value: eventType.id },
      { field: 'status', operator: '=', value: 'scheduled' },
      { field: 'start_at', operator: '>=', value: dayStart },
      { field: 'start_at', operator: '<', value: dayEnd },
    ])
    if (sameDay >= eventType.max_per_day) {
      return res.status(409).json({
        error: t(
          'booking.dayFull',
          {},
          {
            defaultValue: 'No more bookings are available on that day.',
          },
        ),
      })
    }
  }

  // Pad the conflict window by the event type's buffers so the booking keeps the required gap
  // before/after existing meetings on the host's calendar (buffer_before/after were being ignored,
  // so back-to-back bookings slipped through).
  const bufBeforeMs = (eventType.buffer_before_minutes || 0) * 60_000
  const bufAfterMs = (eventType.buffer_after_minutes || 0) * 60_000
  const overlaps = await findBookingsOverlapping(
    eventType.owner_id,
    new Date(startAt.getTime() - bufBeforeMs),
    new Date(endAt.getTime() + bufAfterMs),
  )
  if (overlaps.length > 0) {
    return res.status(409).json({
      error: t('booking.slotTaken', {}, { defaultValue: 'That slot is no longer available.' }),
    })
  }

  const cancellationToken = crypto.randomBytes(24).toString('hex')

  const result = await create('bookings', {
    event_type_id: eventType.id,
    host_user_id: eventType.owner_id,
    invitee_name: body.invitee_name,
    invitee_email: body.invitee_email,
    invitee_timezone: body.invitee_timezone ?? 'UTC',
    start_at: startAt,
    end_at: endAt,
    // Honor the event type's requires_confirmation: such a booking starts 'pending' (awaiting host
    // approval via PATCH /:id), not auto-'scheduled'. The dashboard/list already surface pending.
    status: eventType.requires_confirmation ? 'pending' : 'scheduled',
    location_kind: eventType.location_kind ?? 'jitsi',
    location_value: eventType.location_value ?? null,
    notes: body.notes ?? null,
    cancellation_token: cancellationToken,
    created_at: new Date(),
  })

  // Best-effort confirmation emails. Mailgun sandbox domains restrict
  // recipients, so failures are noisy but never block a booking.
  const host = await findById<UserRow>('users', eventType.owner_id)
  // User-facing links in these confirmation emails MUST come from the trusted,
  // CONFIGURED origin — never `req.headers.origin`/`host`, which the caller
  // controls. This endpoint is public and emails whatever `invitee_email` the
  // request names, so a forged Origin header would send a VICTIM a confirmation
  // whose cancel link — carrying a valid cancellation token — points at the
  // attacker's domain (token leak + phishing). Mirror the framework's
  // password-reset flow, which builds links from SITE_ORIGIN.
  const appOrigin = (getConfig('SITE_ORIGIN', '') as string) || 'http://localhost:3000'
  void sendBookingEmails({
    eventType,
    host,
    inviteeName: body.invitee_name,
    inviteeEmail: body.invitee_email,
    inviteeTimezone: body.invitee_timezone ?? 'UTC',
    startAt,
    endAt,
    cancellationToken,
    location: { kind: eventType.location_kind, value: eventType.location_value },
    appOrigin,
    pending: eventType.requires_confirmation,
  })

  return res.status(201).json({
    booking: result.data,
    cancellationToken,
    price_cents: (eventType as { price_cents?: number }).price_cents ?? 0,
  })
})

router.get('/by-token/:token', async (req: Request, res: Response) => {
  const token = getParamToken(req)
  if (!token || token.length < 16) {
    return res
      .status(404)
      .json({ error: t('booking.notFound', {}, { defaultValue: 'Booking not found' }) })
  }
  const item = (await findOne<BookingRow>('bookings', [
    { field: 'cancellation_token', operator: '=', value: token },
  ])) as BookingRow | null
  if (!item) {
    return res
      .status(404)
      .json({ error: t('booking.notFound', {}, { defaultValue: 'Booking not found' }) })
  }
  const eventType = await findById<EventTypeRow>('event_types', item.event_type_id)
  const host = await findById<UserRow>('users', item.host_user_id)
  return res.json({
    booking: {
      id: item.id,
      invitee_name: item.invitee_name,
      invitee_email: item.invitee_email,
      invitee_timezone: item.invitee_timezone,
      start_at: item.start_at,
      end_at: item.end_at,
      status: item.status,
      location_kind: item.location_kind,
      location_value: item.location_value,
      notes: item.notes,
      cancellation_token: item.cancellation_token,
    },
    eventType: eventType
      ? {
          name: eventType.name,
          slug: eventType.slug,
          duration_minutes: eventType.duration_minutes,
          location_kind: eventType.location_kind,
        }
      : null,
    host: host ? { name: host.name, email: host.email } : null,
  })
})

router.post(
  '/by-token/:token/cancel',
  validateBody(cancelByTokenSchema),
  async (req: Request, res: Response) => {
    const token = getParamToken(req)
    if (!token || token.length < 16) {
      return res
        .status(404)
        .json({ error: t('booking.notFound', {}, { defaultValue: 'Booking not found' }) })
    }
    const item = (await findOne<BookingRow>('bookings', [
      { field: 'cancellation_token', operator: '=', value: token },
    ])) as BookingRow | null
    if (!item) {
      return res
        .status(404)
        .json({ error: t('booking.notFound', {}, { defaultValue: 'Booking not found' }) })
    }
    if (item.status !== 'scheduled') {
      return res.json({ booking: item })
    }
    const body = (req.body || {}) as z.infer<typeof cancelByTokenSchema>
    const result = await updateById('bookings', item.id, {
      status: 'cancelled',
      cancellation_reason: body.reason ?? null,
    })
    return res.json({ booking: result.data })
  },
)

// ---- authed routes -------------------------------------------------------

router.get('/', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({ error: t('auth.unauthorized') })
  }
  const where: WhereCondition[] = [{ field: 'host_user_id', operator: '=', value: userId }]
  const eventTypeId = typeof req.query.event_type_id === 'string' ? req.query.event_type_id : null
  const status = typeof req.query.status === 'string' ? req.query.status : null
  if (eventTypeId) {
    where.push({ field: 'event_type_id', operator: '=', value: eventTypeId })
  }
  if (status && (STATUS_VALUES as readonly string[]).includes(status)) {
    where.push({ field: 'status', operator: '=', value: status })
  }
  const orderBy: OrderBy[] = [{ field: 'start_at', direction: 'asc' }]
  const items = await findMany('bookings', { where, orderBy, limit: 200, offset: 0 })
  return res.json(items)
})

// Owner view of the PUBLIC business catalog's bookings (signed-out visitors
// book against the seeded system account). Kept as a SEPARATE authed endpoint
// rather than merged into GET / so a fresh account's list stays empty — the
// owner page merges the two. (Fleet audit 2026-09-27.)
router.get('/business', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({ error: t('auth.unauthorized') })
  }
  const systemOwnerId = await getSystemOwnerId()
  if (!systemOwnerId) return res.json([])
  const items = await findMany('bookings', {
    where: [{ field: 'host_user_id', operator: '=', value: systemOwnerId }],
    orderBy: [{ field: 'start_at', direction: 'asc' }],
    limit: 200,
    offset: 0,
  })
  const eventTypeNames = new Map<string, string>()
  const typeIds = [...new Set(items.map((b) => b.event_type_id as string))]
  for (const id of typeIds) {
    const et = await findOne<{ name: string }>('event_types', [
      { field: 'id', operator: '=', value: id },
    ])
    if (et) eventTypeNames.set(id, et.name)
  }
  return res.json(
    items.map((b) => ({
      ...(b as Record<string, unknown>),
      event_type_name: eventTypeNames.get(b.event_type_id as string) ?? null,
    })),
  )
})

router.get('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({ error: t('auth.unauthorized') })
  }
  const id = getParamId(req)
  const item = await findById<BookingRow>('bookings', id)
  const systemOwnerId = await getSystemOwnerId()
  const isBusinessBooking = systemOwnerId != null && item?.host_user_id === systemOwnerId
  if (!item || (item.host_user_id !== userId && !isBusinessBooking)) {
    return res
      .status(404)
      .json({ error: t('booking.notFound', {}, { defaultValue: 'Booking not found' }) })
  }
  return res.json(item)
})

router.post(
  '/',
  enforceLimit<MeetingSchedulerLimits>({
    limitType: 'maxBookings',
    getLimit: (limits) => limits.maxBookings,
    getCurrent: async (userId) =>
      count('bookings', [{ field: 'host_user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createBookingSchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({ error: t('auth.unauthorized') })
    }
    const body = req.body as z.infer<typeof createBookingSchema>
    const eventType = await findById<EventTypeRow>('event_types', body.event_type_id)
    if (!eventType || eventType.owner_id !== userId) {
      return res.status(404).json({
        error: t('eventType.notFound', {}, { defaultValue: 'Event type not found' }),
      })
    }
    // Same conflict guard as POST /public: a host must not double-book their own calendar
    // by creating a booking that overlaps an existing scheduled one. Without this, the
    // authenticated create path silently bypassed the overlap check the public path enforces.
    const overlaps = await findBookingsOverlapping(
      userId,
      new Date(body.start_at),
      new Date(body.end_at),
    )
    if (overlaps.length > 0) {
      return res.status(409).json({
        error: t('booking.slotTaken', {}, { defaultValue: 'That slot is no longer available.' }),
      })
    }
    const result = await create('bookings', {
      event_type_id: body.event_type_id,
      host_user_id: userId,
      invitee_name: body.invitee_name,
      invitee_email: body.invitee_email,
      invitee_timezone: body.invitee_timezone ?? 'UTC',
      start_at: body.start_at,
      end_at: body.end_at,
      status: 'scheduled',
      location_kind: body.location_kind ?? eventType.location_kind ?? 'jitsi',
      location_value: body.location_value ?? null,
      answers: body.answers ?? null,
      notes: body.notes ?? null,
      created_at: new Date(),
    })
    return res.status(201).json(result.data)
  },
)

/**
 * A reschedule (changing start_at/end_at via PATCH/PUT) must respect the same conflict guard as
 * create: the new window must not overlap another scheduled booking on the host's calendar
 * (excluding this booking itself). Without this, an update could silently move a booking onto a
 * taken slot, double-booking the host — bypassing the create-time overlap check.
 */
async function hasRescheduleConflict(
  userId: string,
  id: string,
  existing: BookingRow,
  body: z.infer<typeof updateBookingSchema>,
): Promise<boolean> {
  if (!body.start_at && !body.end_at) return false
  const startAt = new Date(body.start_at ?? String(existing.start_at))
  const endAt = new Date(body.end_at ?? String(existing.end_at))
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) return false
  const overlaps = await findBookingsOverlapping(userId, startAt, endAt)
  return overlaps.some((b) => String(b.id) !== String(id))
}

router.patch('/:id', validateBody(updateBookingSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({ error: t('auth.unauthorized') })
  }
  const id = getParamId(req)
  const existing = await findById<BookingRow>('bookings', id)
  if (!existing || existing.host_user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('booking.notFound', {}, { defaultValue: 'Booking not found' }) })
  }
  if (
    await hasRescheduleConflict(
      userId,
      id,
      existing,
      req.body as z.infer<typeof updateBookingSchema>,
    )
  ) {
    return res.status(409).json({
      error: t('booking.slotTaken', {}, { defaultValue: 'That slot is no longer available.' }),
    })
  }
  const result = await updateById('bookings', id, req.body)
  return res.json(result.data)
})

router.put('/:id', validateBody(updateBookingSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({ error: t('auth.unauthorized') })
  }
  const id = getParamId(req)
  const existing = await findById<BookingRow>('bookings', id)
  if (!existing || existing.host_user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('booking.notFound', {}, { defaultValue: 'Booking not found' }) })
  }
  if (
    await hasRescheduleConflict(
      userId,
      id,
      existing,
      req.body as z.infer<typeof updateBookingSchema>,
    )
  ) {
    return res.status(409).json({
      error: t('booking.slotTaken', {}, { defaultValue: 'That slot is no longer available.' }),
    })
  }
  const result = await updateById('bookings', id, req.body)
  return res.json(result.data)
})

export default router
