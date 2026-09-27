/**
 * Event-type endpoints — both authed (host) and public (invitee booking page).
 *
 * Public surface:
 *   GET /api/event-types/by-slug/:slug
 *     -> { eventType, host: { name, email } }
 *   GET /api/event-types/by-slug/:slug/availability?date=YYYY-MM-DD
 *     -> { slots: [{ start, end, available }], duration_minutes }
 *
 * Authed surface (host operating their own catalog):
 *   GET    /api/event-types
 *   GET    /api/event-types/:id
 *   POST   /api/event-types
 *   PUT    /api/event-types/:id
 *   PATCH  /api/event-types/:id
 *   DELETE /api/event-types/:id
 *
 * @module
 */

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import {
  count,
  create,
  deleteById,
  findById,
  findMany,
  findOne,
  updateById,
} from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import { getSystemOwnerId } from '../lib/business.js'
import type { MeetingSchedulerLimits } from '../tiers.js'

const router = Router()

interface EventTypeRow {
  id: string
  owner_id: string
  name: string
  slug: string
  description: string | null
  duration_minutes: number
  location_kind: string
  location_value: unknown
  buffer_before_minutes: number
  buffer_after_minutes: number
  min_notice_minutes: number
  max_per_day: number | null
  requires_confirmation: boolean
  color: string | null
  is_active: boolean
  position: number
}

interface AvailabilityRule {
  id: string
  user_id: string
  day_of_week: number
  start_minute: number
  end_minute: number
  timezone: string
}

interface AvailabilityOverride {
  id: string
  user_id: string
  date: string
  is_unavailable: boolean
  start_minute: number | null
  end_minute: number | null
}

interface BookingRow {
  start_at: string | Date
  end_at: string | Date
  status: string
}

interface UserRow {
  id: string
  name: string | null
  email: string | null
}

function getParamSlug(req: Request): string {
  const slug = req.params.slug
  return Array.isArray(slug) ? slug[0] : slug
}

const dateRegex = /^\d{4}-\d{2}-\d{2}$/

const createEventTypeSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, 'slug must be lowercase kebab-case'),
  description: z.string().max(2000).nullable().optional(),
  duration_minutes: z.number().int().min(5).max(480).optional(),
  location_kind: z
    .enum(['in_person', 'phone', 'zoom', 'google_meet', 'jitsi', 'custom'])
    .optional(),
  location_value: z.unknown().optional(),
  buffer_before_minutes: z.number().int().min(0).max(720).optional(),
  buffer_after_minutes: z.number().int().min(0).max(720).optional(),
  min_notice_minutes: z.number().int().min(0).max(43_200).optional(),
  max_per_day: z.number().int().min(0).max(1000).nullable().optional(),
  requires_confirmation: z.boolean().optional(),
  color: z.string().max(32).nullable().optional(),
  is_active: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
})

const updateEventTypeSchema = createEventTypeSchema.partial()

// ---- public routes (declared first so /:id never shadows them) ----------

// Public, signed-out business catalog — the home page's services section and
// the booking flow read THIS, never the authed GET / (the m018 failure: a
// visitor-visible page calling an owner-only route got 401 for everyone).
router.get('/public/services', async (_req: Request, res: Response) => {
  const systemOwnerId = await getSystemOwnerId()
  if (!systemOwnerId) {
    return res.json({ services: [], hours: [] })
  }
  const services = (
    await findMany<EventTypeRow & { price_cents: number }>('event_types', {
      where: [
        { field: 'owner_id', operator: '=', value: systemOwnerId },
        { field: 'is_active', operator: '=', value: true },
      ],
      orderBy: [{ field: 'position', direction: 'asc' }],
      limit: 100,
      offset: 0,
    })
  ).map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    description: s.description,
    duration_minutes: s.duration_minutes,
    price_cents: s.price_cents,
  }))
  const rules = (await findMany<{ day_of_week: number; start_minute: number; end_minute: number }>(
    'availability_rules',
    {
      where: [{ field: 'user_id', operator: '=', value: systemOwnerId }],
      orderBy: [{ field: 'day_of_week', direction: 'asc' }],
      limit: 200,
      offset: 0,
    },
  )) as Array<{ day_of_week: number; start_minute: number; end_minute: number }>
  const hours = rules.map((r) => ({
    day_of_week: r.day_of_week,
    start_minute: r.start_minute,
    end_minute: r.end_minute,
  }))
  return res.json({ services, hours })
})

router.get('/by-slug/:slug', async (req: Request, res: Response) => {
  const slug = getParamSlug(req)
  const eventType = (await findOne<EventTypeRow>('event_types', [
    { field: 'slug', operator: '=', value: slug },
    { field: 'is_active', operator: '=', value: true },
  ])) as EventTypeRow | null
  if (!eventType) {
    return res
      .status(404)
      .json({ error: t('eventType.notFound', {}, { defaultValue: 'Event type not found' }) })
  }
  const host = await findById<UserRow>('users', eventType.owner_id)
  return res.json({
    eventType: {
      id: eventType.id,
      name: eventType.name,
      slug: eventType.slug,
      description: eventType.description,
      duration_minutes: eventType.duration_minutes,
      price_cents: (eventType as EventTypeRow & { price_cents?: number }).price_cents ?? 0,
      location_kind: eventType.location_kind,
      location_value: eventType.location_value,
      buffer_before_minutes: eventType.buffer_before_minutes,
      buffer_after_minutes: eventType.buffer_after_minutes,
      min_notice_minutes: eventType.min_notice_minutes,
      requires_confirmation: eventType.requires_confirmation,
      color: eventType.color,
    },
    host: host ? { id: host.id, name: host.name, email: host.email } : null,
  })
})

router.get('/by-slug/:slug/availability', async (req: Request, res: Response) => {
  const slug = getParamSlug(req)
  const dateRaw = req.query.date
  const date = typeof dateRaw === 'string' ? dateRaw : ''
  if (!dateRegex.test(date)) {
    return res
      .status(400)
      .json({ error: t('booking.invalidDate', {}, { defaultValue: 'date must be YYYY-MM-DD' }) })
  }

  const eventType = (await findOne<EventTypeRow>('event_types', [
    { field: 'slug', operator: '=', value: slug },
    { field: 'is_active', operator: '=', value: true },
  ])) as EventTypeRow | null
  if (!eventType) {
    return res
      .status(404)
      .json({ error: t('eventType.notFound', {}, { defaultValue: 'Event type not found' }) })
  }

  const dayStart = Date.parse(`${date}T00:00:00.000Z`)
  if (Number.isNaN(dayStart)) {
    return res
      .status(400)
      .json({ error: t('booking.invalidDate', {}, { defaultValue: 'date must be YYYY-MM-DD' }) })
  }
  const dayEnd = dayStart + 24 * 60 * 60 * 1000

  // Rules are authored in the host's local time and stored with the
  // host's IANA timezone. To resolve "Mon 09:00 in host-tz" to a real
  // UTC instant on a given date we need the host's tz; pull it from the
  // first rule so the Availability page is the source of truth.
  // Fallback is UTC for legacy data without a timezone.
  const allRules = (await findMany<AvailabilityRule>('availability_rules', {
    where: [{ field: 'user_id', operator: '=', value: eventType.owner_id }],
    orderBy: [{ field: 'day_of_week', direction: 'asc' }],
    limit: 200,
    offset: 0,
  })) as AvailabilityRule[]
  const hostTz = allRules.find((r) => r.timezone)?.timezone || 'UTC'

  // Host-local day boundaries on the requested date. Pull the dow from
  // host's TZ so the rule lookup matches what the host configured.
  function localToUtc(d: string, minute: number, tz: string): number {
    // d is YYYY-MM-DD in host-local time. Convert local minute-of-day
    // (e.g. 540 = 09:00) at that local date to a UTC instant.
    const h = Math.floor(minute / 60)
    const m = minute % 60
    const targetIso = `${d}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`
    // We want the UTC instant whose representation in `tz` is `targetIso`.
    // Strategy: parse `targetIso` as if it were UTC (naiveUtc), then ask
    // Intl to format that instant in `tz`, and compute the offset diff.
    const naiveUtcMs = Date.parse(`${targetIso}.000Z`)
    if (Number.isNaN(naiveUtcMs)) return NaN
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(new Date(naiveUtcMs))
    const pick = (type: string): number => Number(parts.find((p) => p.type === type)?.value)
    let hh = pick('hour')
    if (hh === 24) hh = 0
    const localStr =
      `${pick('year')}-${String(pick('month')).padStart(2, '0')}-` +
      `${String(pick('day')).padStart(2, '0')}T` +
      `${String(hh).padStart(2, '0')}:${String(pick('minute')).padStart(2, '0')}:00.000Z`
    const localAsUtcMs = Date.parse(localStr)
    return naiveUtcMs + (naiveUtcMs - localAsUtcMs)
  }

  function dowInTz(d: string, tz: string): number {
    // Day-of-week of the date `d` (YYYY-MM-DD) interpreted as host-local.
    // Use noon to avoid DST edges.
    const ms = localToUtc(d, 12 * 60, tz)
    if (Number.isNaN(ms)) return new Date(`${d}T00:00:00.000Z`).getUTCDay()
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      weekday: 'short',
    }).formatToParts(new Date(ms))
    const map: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    }
    return map[parts.find((p) => p.type === 'weekday')?.value || 'Sun'] ?? 0
  }

  const dow = dowInTz(date, hostTz)
  const rules = allRules.filter((r) => r.day_of_week === dow)

  const overrides = (await findMany<AvailabilityOverride>('availability_overrides', {
    where: [
      { field: 'user_id', operator: '=', value: eventType.owner_id },
      { field: 'date', operator: '=', value: date },
    ],
    limit: 50,
    offset: 0,
  })) as AvailabilityOverride[]

  // Closed-day override beats everything.
  if (overrides.some((o) => o.is_unavailable && o.start_minute == null)) {
    return res.json({ slots: [], duration_minutes: eventType.duration_minutes })
  }

  // If any open-window override exists, those windows REPLACE the rules.
  const openWindows: Array<{ start: number; end: number }> = []
  const openOverrides = overrides.filter(
    (o) => !o.is_unavailable && o.start_minute != null && o.end_minute != null,
  )
  if (openOverrides.length > 0) {
    for (const o of openOverrides) {
      openWindows.push({ start: o.start_minute as number, end: o.end_minute as number })
    }
  } else {
    for (const r of rules) {
      openWindows.push({ start: r.start_minute, end: r.end_minute })
    }
  }
  if (openWindows.length === 0) {
    return res.json({ slots: [], duration_minutes: eventType.duration_minutes })
  }

  // Use the host-local day's UTC range for booking-conflict lookup so we
  // don't miss conflicts that only overlap the local day's earlier/later
  // hours that fall on the adjacent UTC date.
  const localDayStartUtc = localToUtc(date, 0, hostTz)
  const localDayEndUtc = localToUtc(date, 24 * 60, hostTz)
  const lookupStart = Math.min(dayStart, localDayStartUtc)
  const lookupEnd = Math.max(dayEnd, localDayEndUtc)

  const bookings = (await findMany<BookingRow>('bookings', {
    where: [
      { field: 'host_user_id', operator: '=', value: eventType.owner_id },
      { field: 'status', operator: '=', value: 'scheduled' },
      { field: 'start_at', operator: '<', value: new Date(lookupEnd).toISOString() },
      { field: 'end_at', operator: '>', value: new Date(lookupStart).toISOString() },
    ],
    limit: 200,
    offset: 0,
  })) as BookingRow[]

  const busy = bookings.map((b) => ({
    start: new Date(b.start_at).getTime() - eventType.buffer_before_minutes * 60_000,
    end: new Date(b.end_at).getTime() + eventType.buffer_after_minutes * 60_000,
  }))

  // Step granularity: typical event-type-page pattern stepping at duration
  // (or every 30 min for long meetings). Use min(duration, 30) so a 60-min
  // meeting still offers half-hour starts.
  const stepMinutes = Math.min(eventType.duration_minutes, 30) || eventType.duration_minutes
  const minNoticeMs = (eventType.min_notice_minutes || 0) * 60_000
  const earliest = Date.now() + minNoticeMs

  const slots: Array<{ start: string; end: string; available: boolean }> = []
  for (const w of openWindows) {
    let cursor = w.start
    while (cursor + eventType.duration_minutes <= w.end) {
      const slotStart = localToUtc(date, cursor, hostTz)
      const slotEnd = slotStart + eventType.duration_minutes * 60_000
      const conflicts = busy.some((b) => b.start < slotEnd && b.end > slotStart)
      const available = !conflicts && slotStart >= earliest
      slots.push({
        start: new Date(slotStart).toISOString(),
        end: new Date(slotEnd).toISOString(),
        available,
      })
      cursor += stepMinutes
    }
  }

  return res.json({ slots, duration_minutes: eventType.duration_minutes })
})

// ---- authed routes (require getUserId() to succeed) -----------------------

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({ error: t('auth.unauthorized') })
  }
  const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: userId }]
  const orderBy: OrderBy[] = [
    { field: 'position', direction: 'asc' },
    { field: 'name', direction: 'asc' },
  ]
  const items = await findMany('event_types', { where, orderBy, limit: 200, offset: 0 })
  return res.json(items)
})

router.get('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({ error: t('auth.unauthorized') })
  }
  const id = getParamId(req)
  const item = await findById<EventTypeRow>('event_types', id)
  if (!item || item.owner_id !== userId) {
    return res
      .status(404)
      .json({ error: t('eventType.notFound', {}, { defaultValue: 'Event type not found' }) })
  }
  return res.json(item)
})

router.post(
  '/',
  enforceLimit<MeetingSchedulerLimits>({
    limitType: 'maxEventTypes',
    getLimit: (limits) => limits.maxEventTypes,
    getCurrent: async (userId) =>
      count('event_types', [{ field: 'owner_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createEventTypeSchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({ error: t('auth.unauthorized') })
    }
    const body = req.body as z.infer<typeof createEventTypeSchema>

    // Slug uniqueness — per the schema the slug column has a UNIQUE
    // constraint on (owner_id, slug). Pre-check + return a clean 409 so the
    // UI gets a typed error instead of a generic 500 from the DB.
    const existingSlug = await findOne<EventTypeRow>('event_types', [
      { field: 'owner_id', operator: '=', value: userId },
      { field: 'slug', operator: '=', value: body.slug },
    ])
    if (existingSlug) {
      return res.status(409).json({
        error: t(
          'eventType.slugTaken',
          { slug: body.slug },
          {
            defaultValue: `Slug "${body.slug}" is already in use.`,
          },
        ),
      })
    }

    const result = await create('event_types', {
      owner_id: userId,
      name: body.name,
      slug: body.slug,
      description: body.description ?? null,
      duration_minutes: body.duration_minutes ?? 30,
      location_kind: body.location_kind ?? 'jitsi',
      location_value: body.location_value ?? null,
      buffer_before_minutes: body.buffer_before_minutes ?? 0,
      buffer_after_minutes: body.buffer_after_minutes ?? 0,
      min_notice_minutes: body.min_notice_minutes ?? 0,
      max_per_day: body.max_per_day ?? null,
      requires_confirmation: body.requires_confirmation ?? false,
      color: body.color ?? null,
      is_active: body.is_active ?? true,
      position: body.position ?? 0,
      created_at: new Date(),
    })
    return res.status(201).json(result.data)
  },
)

router.put('/:id', validateBody(updateEventTypeSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({ error: t('auth.unauthorized') })
  }
  const id = getParamId(req)
  const existing = await findById<EventTypeRow>('event_types', id)
  if (!existing || existing.owner_id !== userId) {
    return res
      .status(404)
      .json({ error: t('eventType.notFound', {}, { defaultValue: 'Event type not found' }) })
  }
  const body = req.body as z.infer<typeof updateEventTypeSchema>
  if (body.slug && body.slug !== existing.slug) {
    const conflict = await findOne<EventTypeRow>('event_types', [
      { field: 'owner_id', operator: '=', value: userId },
      { field: 'slug', operator: '=', value: body.slug },
    ])
    if (conflict && conflict.id !== id) {
      return res.status(409).json({
        error: t(
          'eventType.slugTaken',
          { slug: body.slug },
          {
            defaultValue: `Slug "${body.slug}" is already in use.`,
          },
        ),
      })
    }
  }
  const result = await updateById('event_types', id, body)
  return res.json(result.data)
})

router.patch('/:id', validateBody(updateEventTypeSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({ error: t('auth.unauthorized') })
  }
  const id = getParamId(req)
  const existing = await findById<EventTypeRow>('event_types', id)
  if (!existing || existing.owner_id !== userId) {
    return res
      .status(404)
      .json({ error: t('eventType.notFound', {}, { defaultValue: 'Event type not found' }) })
  }
  const body = req.body as z.infer<typeof updateEventTypeSchema>
  if (body.slug && body.slug !== existing.slug) {
    const conflict = await findOne<EventTypeRow>('event_types', [
      { field: 'owner_id', operator: '=', value: userId },
      { field: 'slug', operator: '=', value: body.slug },
    ])
    if (conflict && conflict.id !== id) {
      return res.status(409).json({
        error: t(
          'eventType.slugTaken',
          { slug: body.slug },
          {
            defaultValue: `Slug "${body.slug}" is already in use.`,
          },
        ),
      })
    }
  }
  const result = await updateById('event_types', id, body)
  return res.json(result.data)
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({ error: t('auth.unauthorized') })
  }
  const id = getParamId(req)
  const existing = await findById<EventTypeRow>('event_types', id)
  if (!existing || existing.owner_id !== userId) {
    return res
      .status(404)
      .json({ error: t('eventType.notFound', {}, { defaultValue: 'Event type not found' }) })
  }
  await deleteById('event_types', id)
  return res.status(204).end()
})

export default router
