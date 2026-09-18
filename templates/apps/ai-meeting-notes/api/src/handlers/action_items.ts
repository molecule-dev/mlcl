import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import type { AiMeetingNotesLimits } from '../tiers.js'

const router = Router()

const ALLOWED_PRIORITIES = ['high', 'med', 'low'] as const
const ALLOWED_STATUSES = ['open', 'done', 'dismissed'] as const

interface ActionItemRow {
  id: string
  user_id: string
  meeting_id: string | null
  description: string
  assignee_user_id: string | null
  due_date: string | Date | null
  priority: string
  status: string
  source_segment_id: string | null
  created_at: string | Date
}

interface UserRow {
  id: string
  email: string
  display_name?: string | null
}

interface MeetingRow {
  id: string
  user_id: string
  title: string
}

function ownerName(row: UserRow | undefined, fallback: string): string {
  if (!row) return fallback
  if (row.display_name && row.display_name.trim()) return row.display_name.trim()
  if (row.email) return row.email.split('@')[0]
  return fallback
}

function ownerInitial(name: string): string {
  const cleaned = name.trim()
  if (!cleaned) return '·'
  return cleaned.charAt(0).toUpperCase()
}

function isoDate(value: string | Date | null): string | null {
  if (value == null) return null
  return value instanceof Date ? value.toISOString() : String(value)
}

const createActionItemSchema = z.object({
  description: z.string().min(1),
  meeting_id: z.string().uuid().optional(),
  assignee_user_id: z.string().uuid().optional(),
  due_date: z.string().optional(),
  priority: z.enum(ALLOWED_PRIORITIES).default('med'),
  source_segment_id: z.string().uuid().optional(),
})

const updateActionItemSchema = z.object({
  description: z.string().min(1).optional(),
  status: z.enum(ALLOWED_STATUSES).optional(),
  priority: z.enum(ALLOWED_PRIORITIES).optional(),
  assignee_user_id: z.string().uuid().nullable().optional(),
  due_date: z.string().nullable().optional(),
})

router.get('/', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
    })
  }

  const where = [{ field: 'user_id', operator: '=' as const, value: userId }] as Array<{
    field: string
    operator: '=' | '!='
    value: string
  }>
  const status = typeof req.query.status === 'string' ? req.query.status : null
  if (status && (ALLOWED_STATUSES as readonly string[]).includes(status)) {
    where.push({ field: 'status', operator: '=', value: status })
  }

  const items = await findMany<ActionItemRow>('action_items', {
    where,
    orderBy: [{ field: 'created_at', direction: 'desc' }],
  })

  // Enrich each row so the ActionItems UI has text/owner/owner_initial/
  // meeting_title fields without N+1 lookups in the frontend.
  const meetingIds = Array.from(
    new Set(items.map((i) => i.meeting_id).filter((id): id is string => !!id)),
  )
  const meetings: MeetingRow[] =
    meetingIds.length === 0
      ? []
      : await findMany<MeetingRow>('meetings', {
          where: [{ field: 'id', operator: 'in', value: meetingIds }],
        })
  const meetingTitleById = new Map(meetings.map((m) => [m.id, m.title]))

  const assigneeIds = Array.from(
    new Set(items.map((i) => i.assignee_user_id).filter((id): id is string => !!id)),
  )
  const assignees: UserRow[] =
    assigneeIds.length === 0
      ? []
      : await findMany<UserRow>('users', {
          where: [{ field: 'id', operator: 'in', value: assigneeIds }],
        })
  const userById = new Map(assignees.map((u) => [u.id, u]))
  const me = await findById<UserRow>('users', userId)

  const enriched = items.map((row) => {
    const owner = row.assignee_user_id
      ? ownerName(userById.get(row.assignee_user_id), 'Unassigned')
      : ownerName(me ?? undefined, 'You')
    const itemStatus =
      row.status === 'open'
        ? 'open'
        : row.status === 'done'
          ? 'done'
          : row.status === 'dismissed'
            ? 'done'
            : 'in_progress'
    return {
      id: row.id,
      text: row.description,
      description: row.description,
      meeting_id: row.meeting_id ?? '',
      meeting_title: row.meeting_id ? (meetingTitleById.get(row.meeting_id) ?? '') : '',
      owner,
      owner_initial: ownerInitial(owner),
      due_date: isoDate(row.due_date),
      priority: row.priority,
      status: itemStatus,
      created_at: isoDate(row.created_at) ?? '',
    }
  })

  res.json(enriched)
})

router.post(
  '/',
  enforceLimit<AiMeetingNotesLimits>({
    limitType: 'maxActions',
    getLimit: (limits) => limits.maxActions,
    getCurrent: async (userId) =>
      count('action_items', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createActionItemSchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }

    const body = req.body as z.infer<typeof createActionItemSchema>

    if (body.meeting_id) {
      const meeting = await findById<Record<string, unknown>>('meetings', body.meeting_id)
      if (!meeting || meeting.user_id !== userId) {
        return res.status(404).json({
          error: t('meetings.notFound', undefined, { defaultValue: 'Meeting not found.' }),
        })
      }
    }

    const result = await create('action_items', {
      user_id: userId,
      meeting_id: body.meeting_id ?? null,
      description: body.description,
      assignee_user_id: body.assignee_user_id ?? null,
      due_date: body.due_date ? new Date(body.due_date) : null,
      priority: body.priority,
      status: 'open',
      source_segment_id: body.source_segment_id ?? null,
      created_at: new Date(),
    })

    const created = (result as { data?: Record<string, unknown> }).data ?? result
    res.status(201).json(created)
  },
)

router.put('/:id', validateBody(updateActionItemSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
    })
  }

  const id = getParamId(req)
  const existing = await findById<ActionItemRow>('action_items', id)
  if (!existing || existing.user_id !== userId) {
    return res.status(404).json({
      error: t('actionItems.notFound', undefined, {
        defaultValue: 'Action item not found.',
      }),
    })
  }

  const body = req.body as z.infer<typeof updateActionItemSchema>
  const updates: Record<string, unknown> = {}
  if (body.description !== undefined) updates.description = body.description
  if (body.status !== undefined) updates.status = body.status
  if (body.priority !== undefined) updates.priority = body.priority
  if (body.assignee_user_id !== undefined) updates.assignee_user_id = body.assignee_user_id
  if (body.due_date !== undefined) updates.due_date = body.due_date ? new Date(body.due_date) : null

  const result = await updateById('action_items', id, updates)
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
  const existing = await findById<ActionItemRow>('action_items', id)
  if (!existing || existing.user_id !== userId) {
    return res.status(404).json({
      error: t('actionItems.notFound', undefined, {
        defaultValue: 'Action item not found.',
      }),
    })
  }

  await deleteById('action_items', id)
  res.status(204).end()
})

export default router
