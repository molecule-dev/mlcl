import { randomUUID } from 'node:crypto'

import express, { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import {
  type AIProvider,
  getAllProviders as getAllAiProviders,
  getProvider as getAiProvider,
  getProviderByName as getAiProviderByName,
} from '@molecule/api-ai'
import { requireProvider as requireSpeech } from '@molecule/api-ai-speech'
import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import {
  resolveTranscriptionLanguage,
  type UserWithSettings,
} from '../lib/transcription-language.js'
import type { AiMeetingNotesLimits } from '../tiers.js'

const router = Router()

const ALLOWED_SOURCES = ['recorded', 'uploaded', 'zoom', 'meet', 'teams'] as const
const ALLOWED_STATUSES = ['pending', 'transcribing', 'ready', 'failed'] as const

interface MeetingRow {
  id: string
  user_id: string
  team_id: string | null
  title: string
  source: string
  recorded_at: string | Date
  duration_minutes: number
  audio_s3_key: string | null
  transcription_status: string
  summary_md: string | null
  ai_summary_short: string | null
  primary_speaker_id: string | null
  attendees_json: unknown
  calendar_event_id: string | null
  created_at: string | Date
  [key: string]: unknown
}

interface SegmentRow {
  id: string
  meeting_id: string
  user_id: string
  ts_start_ms: number
  ts_end_ms: number
  speaker_id: string | null
  text: string
  confidence: number
  created_at: string | Date
}

interface ActionRow {
  id: string
  meeting_id: string | null
  user_id: string
  description: string
  assignee_user_id: string | null
  due_date: string | Date | null
  priority: string
  status: string
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

function initials(name: string): string {
  const cleaned = name.trim()
  if (!cleaned) return '·'
  const parts = cleaned.split(/[@\s]+/).filter(Boolean)
  if (parts.length === 0) return '·'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

function fmtTs(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function speakerSlot(speakerId: string | null, slots: Map<string, number>): number {
  if (!speakerId) return 1
  if (slots.has(speakerId)) return slots.get(speakerId)!
  const slot = (slots.size % 5) + 1
  slots.set(speakerId, slot)
  return slot
}

const createMeetingSchema = z.object({
  title: z.string().min(1),
  source: z.enum(ALLOWED_SOURCES).default('recorded'),
  recorded_at: z.string().optional(),
  duration_minutes: z.number().int().nonnegative().optional(),
  // audio_s3_key is intentionally NOT accepted from the client. A client-chosen
  // storage key could address another tenant's object via any future
  // download/preview route (cross-tenant IDOR); it is minted server-side below.
  attendees: z.array(z.string()).optional(),
  team_id: z.string().uuid().optional(),
  calendar_event_id: z.string().uuid().optional(),
})

const updateMeetingSchema = z.object({
  title: z.string().min(1).optional(),
  source: z.enum(ALLOWED_SOURCES).optional(),
  transcription_status: z.enum(ALLOWED_STATUSES).optional(),
  summary_md: z.string().optional(),
  ai_summary_short: z.string().optional(),
  duration_minutes: z.number().int().nonnegative().optional(),
  attendees: z.array(z.string()).optional(),
  team_id: z.string().uuid().nullable().optional(),
  calendar_event_id: z.string().uuid().nullable().optional(),
})

/**
 * Transcribe an uploaded audio recording and create a meeting + transcript +
 * summary in one shot. Body is the raw audio bytes (audio/* up to 25 MB —
 * matching Whisper's per-request limit). Returns the new meeting's id and
 * the parsed payload.
 *
 * The flow is:
 *   1. Whisper STT → transcript text + segments + duration.
 *   2. Persist meeting row (transcription_status = 'transcribing').
 *   3. Persist transcript_segments rows (one per Whisper segment).
 *   4. Claude summarization → markdown blob with sections (Summary,
 *      Decisions, Action Items) + a one-line short summary.
 *   5. Parse Action Items section into action_items rows.
 *   6. Mark meeting transcription_status = 'ready'.
 *
 * Failures along the way mark the meeting as 'failed' and bubble up so
 * the user sees what went wrong.
 */
router.post(
  '/transcribe',
  enforceLimit<AiMeetingNotesLimits>({
    limitType: 'maxMeetings',
    getLimit: (limits) => limits.maxMeetings,
    getCurrent: async (userId) =>
      count('meetings', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  // Up to 25MB of raw audio, matching OpenAI Whisper's per-request limit.
  express.raw({ type: ['audio/*', 'application/octet-stream'], limit: '25mb' }),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }

    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      return res.status(400).json({
        error: t('meetings.audio.empty', undefined, {
          defaultValue: 'Audio body is empty. Send raw audio bytes as the request body.',
        }),
      })
    }

    const audio = req.body as Buffer
    const contentType = req.headers['content-type'] ?? 'audio/webm'
    const titleHeader =
      typeof req.headers['x-meeting-title'] === 'string'
        ? (req.headers['x-meeting-title'] as string)
        : ''
    const ext = contentType.includes('mp4')
      ? 'mp4'
      : contentType.includes('mp3') || contentType.includes('mpeg')
        ? 'mp3'
        : contentType.includes('wav')
          ? 'wav'
          : contentType.includes('m4a')
            ? 'm4a'
            : contentType.includes('ogg')
              ? 'ogg'
              : 'webm'

    // 1) Speech-to-text via the bonded ai-speech provider (OpenAI Whisper).
    const speech = requireSpeech()
    if (!speech.transcribe) {
      return res.status(500).json({
        error: t('meetings.transcribe.unsupported', undefined, {
          defaultValue: 'The configured speech provider does not support transcription.',
        }),
      })
    }
    // Honor the user's stored transcription language (was persisted in Settings but never passed —
    // Whisper auto-detected regardless). Omit when unset/unmapped so auto-detect still applies.
    const meetingUser = await findById<UserWithSettings>('users', userId)
    const languageCode = resolveTranscriptionLanguage(meetingUser)
    const stt = await speech.transcribe({
      audio,
      filename: `meeting.${ext}`,
      responseFormat: 'verbose_json',
      timestampGranularity: 'segment',
      ...(languageCode ? { language: languageCode } : {}),
    })
    const fullText = (stt.text ?? '').trim()
    const segments = Array.isArray(stt.segments) ? stt.segments : []
    const durationMin = stt.duration ? Math.max(1, Math.round(stt.duration / 60)) : 0

    // 2) Persist the meeting row in the 'transcribing' state so it is
    //    visible immediately even if summarization takes a few seconds.
    const recordedAt = new Date()
    const titleFromText = fullText
      ? fullText
          .split(/[.!?\n]/)[0]
          .slice(0, 80)
          .trim()
      : 'Voice memo'
    const title = titleHeader.trim() || titleFromText || 'Voice memo'
    const meetingResult = await create('meetings', {
      user_id: userId,
      team_id: null,
      title,
      source: 'recorded',
      recorded_at: recordedAt,
      duration_minutes: durationMin,
      audio_s3_key: null,
      transcription_status: 'transcribing',
      summary_md: null,
      ai_summary_short: null,
      attendees_json: JSON.stringify([]),
      created_at: new Date(),
    })
    const meetingRow = ((meetingResult as { data?: Record<string, unknown> }).data ??
      meetingResult) as MeetingRow
    const meetingId = meetingRow.id as string

    // 3) Persist transcript segments. Whisper segment timestamps are in
    //    seconds; convert to ms to match our schema.
    if (segments.length > 0) {
      for (const seg of segments) {
        const startMs = Math.max(0, Math.round((seg.start ?? 0) * 1000))
        const endMs = Math.max(startMs, Math.round((seg.end ?? 0) * 1000))
        const text = (seg.text ?? '').trim()
        if (!text) continue
        await create('transcript_segments', {
          meeting_id: meetingId,
          user_id: userId,
          ts_start_ms: startMs,
          ts_end_ms: endMs,
          speaker_id: null,
          text,
          confidence: 0,
          created_at: new Date(),
        })
      }
    } else if (fullText) {
      await create('transcript_segments', {
        meeting_id: meetingId,
        user_id: userId,
        ts_start_ms: 0,
        ts_end_ms: Math.round((stt.duration ?? 0) * 1000),
        speaker_id: null,
        text: fullText,
        confidence: 0,
        created_at: new Date(),
      })
    }

    // 4) Summarize via Claude. Stream events into a single string buffer.
    //    The AI bond is multi-provider (named); pick anthropic if available,
    //    otherwise fall back to whatever singleton or first named provider is bonded.
    const ai: AIProvider | null =
      getAiProviderByName('anthropic') ??
      getAiProvider() ??
      (() => {
        const all = getAllAiProviders()
        return all.size > 0 ? (all.values().next().value ?? null) : null
      })()
    if (!ai) {
      await updateById('meetings', meetingId, { transcription_status: 'failed' })
      return res.status(500).json({
        error: t('ai.error.noProvider', undefined, {
          defaultValue: 'AI provider not configured. Bond an AI provider first.',
        }),
        meeting_id: meetingId,
      })
    }
    const systemPrompt =
      'You are an expert meeting notes assistant. Given a verbatim meeting transcript, produce concise, well-formatted notes a busy executive can scan in 30 seconds. ' +
      "Output strict GitHub-flavored markdown. ALWAYS include three sections in this exact order, even if a section is empty (write '_None._'): " +
      '## Summary\n(one short paragraph capturing the core thread)\n' +
      '## Decisions\n(- bullet list of explicit decisions made)\n' +
      "## Action Items\n(- bullet list of tasks; each starts with the action verb followed by '— owner: <name|team>' if mentioned)"
    const userPrompt =
      'Transcript:\n\n' +
      (fullText.length > 60_000
        ? fullText.slice(0, 60_000) + '\n…[transcript truncated]'
        : fullText)

    let summaryMd = ''
    let summaryError: Error | null = null
    try {
      // NOTE: no explicit `temperature` — thinking-era default models reject
      // the param with a 400 ("temperature is deprecated for this model"),
      // which failed every summarization. The provider default is fine here.
      const stream = ai.chat({
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        maxTokens: 1500,
      })
      for await (const ev of stream) {
        if (ev.type === 'text') summaryMd += ev.content
        else if (ev.type === 'error') {
          summaryError = new Error(ev.message)
          break
        }
      }
    } catch (err) {
      summaryError = err instanceof Error ? err : new Error(String(err))
    }

    if (summaryError) {
      await updateById('meetings', meetingId, { transcription_status: 'failed' })
      return res.status(502).json({
        error: t('meetings.transcribe.summaryFailed', undefined, {
          defaultValue: 'Transcription succeeded but summarization failed.',
        }),
        details: summaryError.message,
        meeting_id: meetingId,
      })
    }

    // Extract a one-line short summary from the Summary section, falling
    // back to the first sentence of the transcript if Claude omitted it.
    const shortSummary = (() => {
      const m = summaryMd.match(/##\s*Summary\s*\n([\s\S]*?)(?=\n##\s|$)/i)
      const para = (m?.[1] ?? '').trim()
      const firstSentence = para.split(/[.!?\n]/)[0]?.trim() ?? ''
      if (firstSentence) return firstSentence.slice(0, 200)
      return (
        fullText
          .split(/[.!?\n]/)[0]
          ?.trim()
          .slice(0, 200) ?? ''
      )
    })()

    await updateById('meetings', meetingId, {
      transcription_status: 'ready',
      summary_md: summaryMd,
      ai_summary_short: shortSummary,
    })

    // 5) Parse Action Items into rows so they appear on the dashboard.
    const actionsBlock = summaryMd.match(/##\s*Action\s*Items\s*\n([\s\S]*?)(?=\n##\s|$)/i)
    const actionLines = actionsBlock
      ? actionsBlock[1]
          .split('\n')
          .map((l) => l.replace(/^[\s\-*•]+/, '').trim())
          .filter((l) => l && !/^_*\s*none\s*\.?\s*_*$/i.test(l))
      : []
    for (const line of actionLines.slice(0, 25)) {
      await create('action_items', {
        user_id: userId,
        meeting_id: meetingId,
        description: line.slice(0, 500),
        assignee_user_id: null,
        due_date: null,
        priority: 'med',
        status: 'open',
        source_segment_id: null,
        created_at: new Date(),
      })
    }

    res.status(201).json({
      meeting_id: meetingId,
      duration_minutes: durationMin,
      transcript_text: fullText,
      summary_md: summaryMd,
      action_items_count: actionLines.length,
    })
  },
)

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
    })
  }

  const meetings = await findMany<MeetingRow>('meetings', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'recorded_at', direction: 'desc' }],
  })

  // Enrich each meeting with derived fields the frontend Dashboard/Meetings
  // pages need: action_count (from action_items), attendee_initials,
  // primary_speaker (1-5 slot), ai_summary, unread, recorded_at as iso.
  const meetingIds = meetings.map((m) => m.id)
  const allActions =
    meetingIds.length === 0
      ? []
      : await findMany<ActionRow>('action_items', {
          where: [{ field: 'meeting_id', operator: 'in', value: meetingIds }],
        })
  const actionCounts = new Map<string, number>()
  for (const a of allActions) {
    if (!a.meeting_id) continue
    actionCounts.set(a.meeting_id, (actionCounts.get(a.meeting_id) ?? 0) + 1)
  }

  const enriched = meetings.map((m) => {
    const attendees = parseAttendees(m.attendees_json)
    const slots = new Map<string, number>()
    const primarySpeaker = speakerSlot(m.primary_speaker_id, slots)
    const recordedAt =
      m.recorded_at instanceof Date ? m.recorded_at.toISOString() : String(m.recorded_at)
    const isRecent = Date.now() - new Date(recordedAt).getTime() < 1000 * 60 * 60 * 24 * 7
    return {
      id: m.id,
      title: m.title,
      source: m.source,
      transcription_status: m.transcription_status,
      recorded_at: recordedAt,
      duration_minutes: m.duration_minutes,
      attendees,
      attendee_initials: attendees.map((a) => initials(a)),
      primary_speaker: primarySpeaker,
      ai_summary: m.ai_summary_short ?? '',
      summary_md: m.summary_md ?? '',
      action_count: actionCounts.get(m.id) ?? 0,
      unread: isRecent && !!m.ai_summary_short,
    }
  })

  res.json(enriched)
})

router.get('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
    })
  }

  const id = getParamId(req)
  const meeting = await findById<MeetingRow>('meetings', id)
  if (!meeting || meeting.user_id !== userId) {
    return res.status(404).json({
      error: t('meetings.notFound', undefined, { defaultValue: 'Meeting not found.' }),
    })
  }

  const segments = await findMany<SegmentRow>('transcript_segments', {
    where: [{ field: 'meeting_id', operator: '=', value: id }],
    orderBy: [{ field: 'ts_start_ms', direction: 'asc' }],
  })

  const actions = await findMany<ActionRow>('action_items', {
    where: [{ field: 'meeting_id', operator: '=', value: id }],
    orderBy: [{ field: 'created_at', direction: 'asc' }],
  })

  const slots = new Map<string, number>()
  const transcript = segments.map((seg) => ({
    ts: fmtTs(seg.ts_start_ms),
    speaker_id: speakerSlot(seg.speaker_id, slots),
    text: seg.text,
  }))

  const attendees = parseAttendees(meeting.attendees_json)
  const speakers = Array.from(slots.entries()).map(([raw, slot]) => ({
    id: slot,
    name: attendees[slot - 1] ?? raw,
  }))
  if (speakers.length === 0 && attendees.length > 0) {
    attendees.slice(0, 5).forEach((name, i) => {
      speakers.push({ id: i + 1, name })
    })
  }

  // Parse summary_md into TLDR / Decisions / Follow-ups sections.
  // The summarizer writes a markdown blob with three "## " headings:
  //   ## Summary | TLDR | Recap → tldr text
  //   ## Decisions → bulleted list
  //   ## Follow-ups | Action Items | Next Steps → bulleted list
  // Anything that doesn't match the headings falls into tldr.
  const md = meeting.summary_md ?? ''
  const sections: Record<string, string[]> = { tldr: [], decisions: [], followups: [] }
  let currentSection: keyof typeof sections = 'tldr'
  for (const line of md.split('\n')) {
    const heading = line.match(/^#{1,3}\s+(.+?)\s*$/)
    if (heading) {
      const h = heading[1].toLowerCase()
      if (/decision/.test(h)) currentSection = 'decisions'
      else if (/follow|action|next/.test(h)) currentSection = 'followups'
      else if (/tldr|summary|recap|overview/.test(h)) currentSection = 'tldr'
      else currentSection = 'tldr'
      continue
    }
    sections[currentSection].push(line)
  }
  const isNoneMarker = (l: string): boolean => /^_*\s*none\s*\.?\s*_*$/i.test(l)
  const decisionsList = sections.decisions
    .map((l) => l.replace(/^[\s\-*•]+/, '').trim())
    .filter((l) => l.length > 0 && !isNoneMarker(l))
  const followupsList = sections.followups
    .map((l) => l.replace(/^[\s\-*•]+/, '').trim())
    .filter((l) => l.length > 0 && !isNoneMarker(l))
  const tldrText = sections.tldr.join('\n').trim() || meeting.ai_summary_short || ''

  res.json({
    id: meeting.id,
    title: meeting.title,
    source: meeting.source,
    transcription_status: meeting.transcription_status,
    recorded_at:
      meeting.recorded_at instanceof Date
        ? meeting.recorded_at.toISOString()
        : String(meeting.recorded_at),
    duration_minutes: meeting.duration_minutes,
    attendees,
    speakers,
    transcript,
    summary_md: meeting.summary_md ?? '',
    ai_tldr: tldrText,
    ai_decisions: decisionsList,
    ai_followups: followupsList,
    action_items: actions.map((a) => ({
      id: a.id,
      text: a.description,
      owner: 'You',
      due_date:
        a.due_date == null
          ? null
          : a.due_date instanceof Date
            ? a.due_date.toISOString()
            : String(a.due_date),
      status: a.status === 'open' ? 'open' : a.status === 'done' ? 'done' : 'in_progress',
    })),
  })
})

router.post(
  '/',
  enforceLimit<AiMeetingNotesLimits>({
    limitType: 'maxMeetings',
    getLimit: (limits) => limits.maxMeetings,
    getCurrent: async (userId) =>
      count('meetings', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createMeetingSchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }

    const body = req.body as z.infer<typeof createMeetingSchema>
    const recordedAt = body.recorded_at ? new Date(body.recorded_at) : new Date()

    const result = await create('meetings', {
      user_id: userId,
      team_id: body.team_id ?? null,
      title: body.title,
      source: body.source,
      recorded_at: recordedAt,
      duration_minutes: body.duration_minutes ?? 0,
      // Server-minted, owner-scoped key — never a client-supplied value.
      audio_s3_key: `meetings/${userId}/${randomUUID()}`,
      transcription_status: 'pending',
      attendees_json: JSON.stringify(body.attendees ?? []),
      calendar_event_id: body.calendar_event_id ?? null,
      created_at: new Date(),
    })

    const created = (result as { data?: Record<string, unknown> }).data ?? result
    res.status(201).json(created)
  },
)

router.put('/:id', validateBody(updateMeetingSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
    })
  }

  const id = getParamId(req)
  const existing = await findById<MeetingRow>('meetings', id)
  if (!existing || existing.user_id !== userId) {
    return res.status(404).json({
      error: t('meetings.notFound', undefined, { defaultValue: 'Meeting not found.' }),
    })
  }

  const body = req.body as z.infer<typeof updateMeetingSchema>
  const updates: Record<string, unknown> = {}
  if (body.title !== undefined) updates.title = body.title
  if (body.source !== undefined) updates.source = body.source
  if (body.transcription_status !== undefined)
    updates.transcription_status = body.transcription_status
  if (body.summary_md !== undefined) updates.summary_md = body.summary_md
  if (body.ai_summary_short !== undefined) updates.ai_summary_short = body.ai_summary_short
  if (body.duration_minutes !== undefined) updates.duration_minutes = body.duration_minutes
  if (body.attendees !== undefined) updates.attendees_json = JSON.stringify(body.attendees)
  if (body.team_id !== undefined) updates.team_id = body.team_id
  if (body.calendar_event_id !== undefined) updates.calendar_event_id = body.calendar_event_id

  const result = await updateById('meetings', id, updates)
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
  const existing = await findById<MeetingRow>('meetings', id)
  if (!existing || existing.user_id !== userId) {
    return res.status(404).json({
      error: t('meetings.notFound', undefined, { defaultValue: 'Meeting not found.' }),
    })
  }

  await deleteById('meetings', id)
  res.status(204).end()
})

export default router
