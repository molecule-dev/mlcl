import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

interface SegmentRow {
  id: string
  meeting_id: string
  user_id: string
  ts_start_ms: number
  speaker_id: string | null
  text: string
  created_at: string | Date
}

interface MeetingRow {
  id: string
  user_id: string
  title: string
  recorded_at: string | Date
  attendees_json: unknown
  primary_speaker_id: string | null
}

interface UserRow {
  id: string
  email: string
  display_name?: string | null
}

function fmtTs(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
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

const searchQuerySchema = z.object({
  q: z.string().min(1),
  filter: z.enum(['all', 'last7d', 'last30d', 'mentions']).optional(),
})

/**
 * Cross-meeting transcript search. The query string `q` is matched against
 * the transcript_segments.text column scoped to the caller's segments.
 *
 * Filters:
 *   - last7d / last30d → restrict by created_at window
 *   - mentions         → require text to contain caller's name/email
 *
 * Each row is enriched with meeting_title, recorded_at, speaker (label),
 * and ts (mm:ss) so the Search UI can render hits without extra fetches.
 */
router.get('/', validateQuery(searchQuerySchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
    })
  }

  const q = String(req.query.q).trim()
  const filter =
    typeof req.query.filter === 'string' &&
    ['all', 'last7d', 'last30d', 'mentions'].includes(req.query.filter)
      ? (req.query.filter as 'all' | 'last7d' | 'last30d' | 'mentions')
      : 'all'

  const where = [
    { field: 'user_id', operator: '=' as const, value: userId },
    { field: 'text', operator: 'ilike' as const, value: q },
  ] as Array<{
    field: string
    operator: '=' | 'ilike' | '>='
    value: string | Date
  }>

  if (filter === 'last7d') {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    where.push({ field: 'created_at', operator: '>=', value: cutoff })
  } else if (filter === 'last30d') {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    where.push({ field: 'created_at', operator: '>=', value: cutoff })
  }

  const segments = await findMany<SegmentRow>('transcript_segments', {
    where,
    orderBy: [{ field: 'created_at', direction: 'desc' }],
  })

  const meetingIds = Array.from(new Set(segments.map((s) => s.meeting_id)))
  const meetings: MeetingRow[] =
    meetingIds.length === 0
      ? []
      : await findMany<MeetingRow>('meetings', {
          where: [{ field: 'id', operator: 'in', value: meetingIds }],
        })
  const meetingById = new Map(meetings.map((m) => [m.id, m]))

  const me = await findById<UserRow>('users', userId)
  const myEmail = me?.email ?? ''
  const myName = me?.display_name?.trim() || myEmail.split('@')[0] || ''

  let filtered = segments
  if (filter === 'mentions' && (myEmail || myName)) {
    const haystack = (s: string): string => s.toLowerCase()
    filtered = segments.filter((s) => {
      const text = haystack(s.text || '')
      return (
        (myEmail && text.includes(myEmail.toLowerCase())) ||
        (myName && text.includes(myName.toLowerCase()))
      )
    })
  }

  const slots = new Map<string, number>()
  const enriched = filtered.map((s) => {
    const meeting = meetingById.get(s.meeting_id)
    const attendees = meeting ? parseAttendees(meeting.attendees_json) : []
    const speakerKey = s.speaker_id ?? 'unknown'
    if (!slots.has(speakerKey)) slots.set(speakerKey, (slots.size % 5) + 1)
    const slot = slots.get(speakerKey)!
    const speakerLabel = attendees[slot - 1] ?? `Speaker ${slot}`
    return {
      id: s.id,
      meeting_id: s.meeting_id,
      meeting_title: meeting?.title ?? '',
      recorded_at:
        meeting?.recorded_at instanceof Date
          ? meeting.recorded_at.toISOString()
          : meeting?.recorded_at != null
            ? String(meeting.recorded_at)
            : '',
      speaker: speakerLabel,
      ts: fmtTs(s.ts_start_ms),
      text: s.text,
    }
  })

  res.json(enriched)
})

export default router
