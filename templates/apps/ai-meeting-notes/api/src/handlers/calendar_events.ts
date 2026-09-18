import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const ALLOWED_SOURCES = ['google', 'outlook'] as const

interface CalendarEventRow {
  id: string
  user_id: string
  source: string
  external_event_id: string | null
  title: string
  starts_at: string | Date
  ends_at: string | Date
  attendees_json: unknown
  conference_url: string | null
  meeting_id: string | null
  created_at: string | Date
}

function parseAttendees(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === 'string')
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown
      return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
    } catch (_error) {
      // raw string is not valid JSON — fall back to empty attendee list
      return []
    }
  }
  return []
}

function asDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value)
}

function isoDate(value: string | Date | null): string | null {
  if (value == null) return null
  return value instanceof Date ? value.toISOString() : String(value)
}

function dayKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function timeKey(d: Date): string {
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

function speakerSlot(
  externalId: string | null,
  fallbackId: string,
  slots: Map<string, number>,
): number {
  const key = externalId ?? fallbackId
  if (slots.has(key)) return slots.get(key)!
  const slot = (slots.size % 5) + 1
  slots.set(key, slot)
  return slot
}

function enrich(row: CalendarEventRow, slots: Map<string, number>): Record<string, unknown> {
  const start = asDate(row.starts_at)
  const end = asDate(row.ends_at)
  const durationMin = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000))
  return {
    id: row.id,
    title: row.title,
    source: row.source,
    starts_at: start.toISOString(),
    ends_at: end.toISOString(),
    date: dayKey(start),
    time: timeKey(start),
    duration_min: durationMin,
    duration_minutes: durationMin,
    attendees: parseAttendees(row.attendees_json),
    conference_url: row.conference_url,
    meeting_id: row.meeting_id,
    speaker_id: speakerSlot(row.external_event_id, row.id, slots),
    created_at: isoDate(row.created_at) ?? '',
  }
}

const createCalendarEventSchema = z.object({
  title: z.string().min(1),
  source: z.enum(ALLOWED_SOURCES).default('google'),
  external_event_id: z.string().optional(),
  starts_at: z.string(),
  ends_at: z.string(),
  attendees: z.array(z.string()).optional(),
  conference_url: z.string().url().optional(),
  meeting_id: z.string().uuid().optional(),
})

const updateCalendarEventSchema = z.object({
  title: z.string().min(1).optional(),
  starts_at: z.string().optional(),
  ends_at: z.string().optional(),
  attendees: z.array(z.string()).optional(),
  conference_url: z.string().url().nullable().optional(),
  meeting_id: z.string().uuid().nullable().optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
    })
  }

  const events = await findMany<CalendarEventRow>('calendar_events', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'starts_at', direction: 'asc' }],
  })
  const slots = new Map<string, number>()
  res.json(events.map((e) => enrich(e, slots)))
})

router.post('/', validateBody(createCalendarEventSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
    })
  }

  const body = req.body as z.infer<typeof createCalendarEventSchema>
  const result = await create('calendar_events', {
    user_id: userId,
    source: body.source,
    external_event_id: body.external_event_id ?? null,
    title: body.title,
    starts_at: new Date(body.starts_at),
    ends_at: new Date(body.ends_at),
    attendees_json: JSON.stringify(body.attendees ?? []),
    conference_url: body.conference_url ?? null,
    meeting_id: body.meeting_id ?? null,
    created_at: new Date(),
  })

  const created = (result as { data?: Record<string, unknown> }).data ?? result
  res.status(201).json(created)
})

router.put('/:id', validateBody(updateCalendarEventSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
    })
  }

  const id = getParamId(req)
  const existing = await findById<CalendarEventRow>('calendar_events', id)
  if (!existing || existing.user_id !== userId) {
    return res.status(404).json({
      error: t('calendar.notFound', undefined, { defaultValue: 'Calendar event not found.' }),
    })
  }

  const body = req.body as z.infer<typeof updateCalendarEventSchema>
  const updates: Record<string, unknown> = {}
  if (body.title !== undefined) updates.title = body.title
  if (body.starts_at !== undefined) updates.starts_at = new Date(body.starts_at)
  if (body.ends_at !== undefined) updates.ends_at = new Date(body.ends_at)
  if (body.attendees !== undefined) updates.attendees_json = JSON.stringify(body.attendees)
  if (body.conference_url !== undefined) updates.conference_url = body.conference_url
  if (body.meeting_id !== undefined) updates.meeting_id = body.meeting_id

  const result = await updateById('calendar_events', id, updates)
  res.json((result as { data?: Record<string, unknown> }).data ?? result)
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
    })
  }

  const id = getParamId(req)
  const existing = await findById<CalendarEventRow>('calendar_events', id)
  if (!existing || existing.user_id !== userId) {
    return res.status(404).json({
      error: t('calendar.notFound', undefined, { defaultValue: 'Calendar event not found.' }),
    })
  }

  await deleteById('calendar_events', id)
  res.status(204).end()
})

export default router
