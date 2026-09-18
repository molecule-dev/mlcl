import type { NextFunction, Request, Response } from 'express'
import { Router } from 'express'

import { count, create, findMany, updateById, updateMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { broadcast } from '@molecule/api-realtime'

const requireAuth = (_req: Request, res: Response, next: NextFunction): void => {
  if (!res.locals.session?.userId) {
    res
      .status(401)
      .json({ error: t('auth.required', undefined, { defaultValue: 'Authentication required' }) })
    return
  }
  next()
}

/**
 * Emit a notification to a user: persists the row AND pushes it live to that
 * user's bell in one call. Call this from whatever feature triggers it (a
 * like / follow / comment / order-status handler) — NOT from a poller.
 *
 * The broadcast room MUST be `user:<recipientId>` so it matches the room the
 * bell subscribes to (`/api/realtime/user:<userId>`); broadcasting to any
 * other room persists the row but the badge never updates live.
 */
export async function notify(
  recipientId: string,
  fields: { type: string; actor_name: string; subject_title: string },
): Promise<void> {
  const result = await create('notifications', {
    user_id: recipientId,
    ...fields,
    read_at: null,
    created_at: new Date().toISOString(),
  })
  await broadcast(`user:${recipientId}`, 'notification:created', result.data)
}

const router = Router()

router.get('/', requireAuth, async (req, res) => {
  const userId = res.locals.session.userId as string
  const limit = Math.min(Number(req.query.limit) || 20, 100)
  const items = await findMany('notifications', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'created_at', direction: 'desc' }],
    limit,
  })
  const unread = await count('notifications', [
    { field: 'user_id', operator: '=', value: userId },
    { field: 'read_at', operator: '=', value: null },
  ])
  res.json({ items, unread })
})

router.post('/:id/read', requireAuth, async (req, res) => {
  const result = await updateById('notifications', req.params.id as string, {
    read_at: new Date().toISOString(),
  })
  if (!result.data) {
    return res.status(404).json({
      error: t('notifications.notFound', undefined, { defaultValue: 'Notification not found' }),
    })
  }
  await broadcast(`user:${res.locals.session.userId}`, 'notification:read', { id: req.params.id })
  res.json(result.data)
})

router.post('/mark-all-read', requireAuth, async (_req, res) => {
  // One set-based write via the DataStore's `updateMany` — no per-row loop and
  // no arbitrary row cap. `affected` is the number of rows flipped to read.
  const userId = res.locals.session.userId as string
  const result = await updateMany(
    'notifications',
    [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'read_at', operator: '=', value: null },
    ],
    { read_at: new Date().toISOString() },
  )
  await broadcast(`user:${userId}`, 'notification:all-read', {})
  res.json({ ok: true, marked: result.affected })
})

export default router
