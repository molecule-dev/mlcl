/**
 * Notifications backend — supports the Notifications page and the
 * notification dot in the user menu.
 *
 * Rows are stored in a flat `notifications` table with a `kind` enum
 * (mention, group_invite, missed_call, security_event, system_message)
 * and a free-form JSON `payload` containing { title, body, href }.
 *
 * On read, we project the JSON payload up onto the response row so the
 * UI can render `title` / `body` / `href` directly without descending
 * into `payload.*`.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import {
  count,
  create,
  deleteById,
  findById,
  findMany,
  query,
  type WhereCondition,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const knownKinds = [
  'mention',
  'group_invite',
  'missed_call',
  'security_event',
  'system_message',
] as const
type NotifKind = (typeof knownKinds)[number]

interface NotifRow extends Record<string, unknown> {
  id: string
  user_id: string
  kind: string
  payload: Record<string, unknown> | string | null
  read_at: string | Date | null
  created_at: string | Date
}

interface ApiNotif {
  id: string
  type: NotifKind
  title: string
  body: string
  href: string | null
  unread: boolean
  created_at: string
}

function decodePayload(raw: NotifRow['payload']): Record<string, unknown> {
  if (!raw) return {}
  if (typeof raw === 'object') return raw
  try {
    const parsed = JSON.parse(String(raw))
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
  } catch (_error) {
    // payload is malformed JSON — return empty object so notification still renders
    return {}
  }
}

function projectNotif(row: NotifRow): ApiNotif {
  const payload = decodePayload(row.payload)
  const kind = (knownKinds as readonly string[]).includes(row.kind)
    ? (row.kind as NotifKind)
    : 'system_message'
  return {
    id: String(row.id),
    type: kind,
    title: String(payload.title ?? row.kind ?? 'Notification'),
    body: String(payload.body ?? ''),
    href: payload.href ? String(payload.href) : null,
    unread: row.read_at == null,
    created_at: new Date(row.created_at).toISOString(),
  }
}

router.get('/', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.required', undefined, { defaultValue: 'Authentication required' }) })
    return
  }
  const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  if (req.query.unread === '1' || req.query.unread === 'true') {
    where.push({ field: 'read_at', operator: 'is_null', value: null })
  }
  const rows = await findMany<NotifRow>('notifications', {
    where,
    orderBy: [{ field: 'created_at', direction: 'desc' }],
    limit: 200,
  })
  res.json(rows.map(projectNotif))
})

router.get('/unread-count', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.required', undefined, { defaultValue: 'Authentication required' }) })
    return
  }
  const c = await count('notifications', [
    { field: 'user_id', operator: '=', value: userId },
    { field: 'read_at', operator: 'is_null', value: null },
  ])
  res.json({ unread: c })
})

const readOneSchema = z.object({ read_at: z.string().optional() })

router.patch('/:id/read', validateBody(readOneSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.required', undefined, { defaultValue: 'Authentication required' }) })
    return
  }
  const id = req.params.id as string
  const existing = await findById<NotifRow>('notifications', id)
  if (!existing || String(existing.user_id) !== String(userId)) {
    res.status(404).json({
      error: t('notifications.notFound', undefined, { defaultValue: 'Notification not found' }),
    })
    return
  }
  const body = req.body as z.infer<typeof readOneSchema>
  const readAt = body.read_at ? new Date(body.read_at) : new Date()
  await query(
    `UPDATE public.notifications SET read_at = $1::timestamptz, "updatedAt" = now()
     WHERE id = $2::uuid AND user_id = $3::uuid`,
    [readAt.toISOString(), id, userId],
  )
  const after = await findById<NotifRow>('notifications', id)
  res.json(after ? projectNotif(after) : { id, unread: false })
})

router.post('/read-all', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.required', undefined, { defaultValue: 'Authentication required' }) })
    return
  }
  const result = await query<{ count: number }>(
    `UPDATE public.notifications
       SET read_at = now(), "updatedAt" = now()
     WHERE user_id = $1::uuid AND read_at IS NULL`,
    [userId],
  )
  res.json({ updated: result.rowCount ?? 0 })
})

const createSchema = z.object({
  kind: z.enum(knownKinds),
  title: z.string().min(1).max(200),
  body: z.string().max(2000).optional(),
  href: z.string().max(500).optional(),
})

router.post('/', validateBody(createSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.required', undefined, { defaultValue: 'Authentication required' }) })
    return
  }
  const body = req.body as z.infer<typeof createSchema>
  const result = await create('notifications', {
    user_id: userId,
    kind: body.kind,
    payload: { title: body.title, body: body.body ?? '', href: body.href ?? null },
    created_at: new Date().toISOString(),
  })
  const row = result.data as NotifRow | undefined
  res.status(201).json(row ? projectNotif(row) : { id: '' })
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.required', undefined, { defaultValue: 'Authentication required' }) })
    return
  }
  const id = req.params.id as string
  const existing = await findById<NotifRow>('notifications', id)
  if (!existing || String(existing.user_id) !== String(userId)) {
    res.status(404).json({
      error: t('notifications.notFound', undefined, { defaultValue: 'Notification not found' }),
    })
    return
  }
  await deleteById('notifications', id)
  res.status(204).end()
})

export default router
