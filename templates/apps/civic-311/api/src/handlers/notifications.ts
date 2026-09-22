import type { Request, Response } from 'express'
import { Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { count, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

const router = Router()

// In-app notification feed (watch-area hits, status changes, confirmations,
// official notes, comments on your reports). Strictly owner-scoped: a row is
// only ever visible to its user_id, and only that user may mark it read.

function unauthorized(res: Response): Response {
  return res
    .status(401)
    .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
}

interface NotificationRow {
  id: string
  user_id: string
  kind: string
  issue_id: string | null
  message: string
  read_at: string | null
  created_at: string
}

// ---------------------------------------------------------------------------
// GET / — The caller's feed (newest first) + unread count
// ---------------------------------------------------------------------------

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)

    const items = (await findMany('notifications', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 50,
    })) as unknown as NotificationRow[]

    const unread = await count('notifications', [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'read_at', operator: 'is_null' },
    ])

    res.json({ items, unread })
  } catch (err) {
    console.error('notification.list', err)
    res.status(500).json({
      error: t('notifications.listFailed', {}, { defaultValue: 'Failed to load notifications' }),
    })
  }
})

// ---------------------------------------------------------------------------
// POST /read-all — Mark every unread notification of the caller as read
// ---------------------------------------------------------------------------

router.post('/read-all', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)

    const unread = (await findMany('notifications', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'read_at', operator: 'is_null' },
      ],
      limit: 200,
    })) as unknown as NotificationRow[]

    const now = new Date().toISOString()
    for (const n of unread) {
      await updateById('notifications', n.id, { read_at: now })
    }

    res.json({ ok: true, marked: unread.length })
  } catch (err) {
    console.error('notification.read_all', err)
    res.status(500).json({
      error: t(
        'notifications.markFailed',
        {},
        { defaultValue: 'Failed to mark notifications read' },
      ),
    })
  }
})

// ---------------------------------------------------------------------------
// POST /:id/read — Mark one notification of the caller as read
// ---------------------------------------------------------------------------

router.post('/:id/read', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    const id = req.params.id as string

    const rows = (await findMany('notifications', {
      where: [
        { field: 'id', operator: '=', value: id },
        { field: 'user_id', operator: '=', value: userId },
      ],
      limit: 1,
    })) as unknown as NotificationRow[]
    // 404 (not 403) for someone else's row so feed ids aren't probeable.
    if (rows.length === 0) {
      return res.status(404).json({
        error: t('notifications.notFound', {}, { defaultValue: 'Notification not found' }),
      })
    }

    if (!rows[0].read_at) {
      await updateById('notifications', id, { read_at: new Date().toISOString() })
    }
    res.json({ ok: true })
  } catch (err) {
    console.error('notification.read', err)
    res.status(500).json({
      error: t(
        'notifications.markFailed',
        {},
        { defaultValue: 'Failed to mark notification read' },
      ),
    })
  }
})

export default router
