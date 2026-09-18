/**
 * `/api/notifications` — owner-scoped notification feed for the current
 * user. Backed by the `notifications` table (see migration 0010).
 *
 * Routes:
 *   GET    /api/notifications              — list (newest first)
 *   PATCH  /api/notifications/:id/read     — mark a notification read
 *   POST   /api/notifications/read-all     — mark every unread row read
 *
 * The DB column is `read boolean`; the view shape uses `unread` so the
 * UI can render an unread badge directly. The decorator handles the
 * inversion in one place.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'

import { getParamId, getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import { findById, findMany, updateById, updateMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateParams } from '@molecule/api-middleware-validation'

import { decorateNotification, decorateNotifications } from './_decorate.js'

const router = Router()

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const rows = await findMany<Record<string, unknown>>('notifications', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'created_at', direction: 'desc' }],
    limit: 100,
  })
  res.json({ data: decorateNotifications(rows) })
})

router.patch('/:id/read', validateParams(idParamSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const id = getParamId(req)
  const existing = await findById<Record<string, unknown>>('notifications', id)
  if (!existing || existing.user_id !== userId) {
    res
      .status(404)
      .json({ error: t('notification.notFound', {}, { defaultValue: 'Notification not found' }) })
    return
  }
  const result = await updateById<Record<string, unknown>>('notifications', id, { read: true })
  const row = (result.data ?? result) as Record<string, unknown>
  res.json(decorateNotification(row))
})

router.post('/read-all', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const result = await updateMany(
    'notifications',
    [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'read', operator: '=', value: false },
    ],
    { read: true },
  )
  res.json({ updated: result.affected ?? 0 })
})

export default router
