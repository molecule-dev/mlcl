/**
 * Notifications handlers — owner-scoped notification feed + mark-read.
 *
 * Reads from the `notifications` table created by the canonical
 * 0010_to_do_list_tables.sql migration. Uses @molecule/api-database
 * DataStore (no raw SQL); inputs validated via zod.
 *
 * Wire-format normalisation: each notification is enriched with a
 * derived `unread` boolean (true when read_at IS NULL) so the
 * frontend can render badges directly without recomputing from
 * timestamps on every render.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { requireUser } from '@molecule/api-bonds-default-express'
import { findMany, findOne, updateById, updateMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

const router = Router()

const idParam = z.object({ id: z.string().uuid() })

interface NotificationRow {
  id: string
  user_id: string
  type: string
  title: string
  body: string | null
  data: unknown
  read_at: string | Date | null
  created_at: string | Date
}

interface EnrichedNotification {
  id: string
  type: string
  title: string
  body: string
  href: string | null
  unread: boolean
  read_at: string | null
  created_at: string
  data: unknown
}

function toIso(value: string | Date | null): string | null {
  if (value === null || value === undefined) return null
  if (value instanceof Date) return value.toISOString()
  return String(value)
}

function enrich(row: NotificationRow): EnrichedNotification {
  const readIso = toIso(row.read_at)
  let href: string | null = null
  if (row.data && typeof row.data === 'object') {
    const obj = row.data as Record<string, unknown>
    if (typeof obj.href === 'string') href = obj.href
    else if (typeof obj.task_id === 'string') href = `/tasks/${obj.task_id}`
    else if (typeof obj.project_id === 'string') href = `/projects/${obj.project_id}`
  }
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body ?? '',
    href,
    unread: !readIso,
    read_at: readIso,
    created_at: toIso(row.created_at) ?? '',
    data: row.data,
  }
}

router.get('/', async (_req: Request, res: Response) => {
  const uid = requireUser(res)
  if (!uid) return
  try {
    const rows = await findMany<NotificationRow>('notifications', {
      where: [{ field: 'user_id', operator: '=', value: uid }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 100,
    })
    res.json(rows.map(enrich))
  } catch (err) {
    console.error('GET /notifications failed:', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Convenience endpoint surfaced to the sidebar so the badge can update
// without paginating the whole feed.
router.get('/unread-count', async (_req: Request, res: Response) => {
  const uid = requireUser(res)
  if (!uid) return
  try {
    const rows = await findMany<NotificationRow>('notifications', {
      where: [
        { field: 'user_id', operator: '=', value: uid },
        { field: 'read_at', operator: 'is_null' },
      ],
    })
    res.json({ count: rows.length })
  } catch (err) {
    console.error('GET /notifications/unread-count failed:', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/mark-all-read', async (_req: Request, res: Response) => {
  const uid = requireUser(res)
  if (!uid) return
  try {
    await updateMany(
      'notifications',
      [
        { field: 'user_id', operator: '=', value: uid },
        { field: 'read_at', operator: 'is_null' },
      ],
      { read_at: new Date() },
    )
    res.json({ marked: true })
  } catch (err) {
    console.error('POST /notifications/mark-all-read failed:', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/:id/read', async (req: Request, res: Response) => {
  const uid = requireUser(res)
  if (!uid) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    res
      .status(400)
      .json({ error: t('validation.failed', {}, { defaultValue: 'Validation failed' }) })
    return
  }
  try {
    const owned = await findOne<NotificationRow>('notifications', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'user_id', operator: '=', value: uid },
    ])
    if (!owned) {
      res
        .status(404)
        .json({ error: t('notification.notFound', {}, { defaultValue: 'Notification not found' }) })
      return
    }
    const updated = await updateById<NotificationRow>('notifications', id.data.id, {
      read_at: new Date(),
    })
    res.json({ read: true, notification: enrich(updated.data as NotificationRow) })
  } catch (err) {
    console.error(`POST /notifications/:id/read failed:`, err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
