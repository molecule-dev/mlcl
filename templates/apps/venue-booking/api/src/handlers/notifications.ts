/**
 * `/api/notifications` — per-user notification feed.
 *
 * @module
 */

import type { Request, Response } from 'express'
import { Router } from 'express'

import { getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
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
    limit: 200,
  })
  res.json({ data: decorateNotifications(rows) })
})

router.put('/:id/read', validateParams(idParamSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const id = String(req.params.id)
  const existing = await findById<Record<string, unknown>>('notifications', id)
  if (!existing) {
    res
      .status(404)
      .json({ error: t('notification.notFound', {}, { defaultValue: 'Notification not found' }) })
    return
  }
  if (existing.user_id !== userId) {
    res.status(403).json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
    return
  }
  const result = await updateById<Record<string, unknown>>('notifications', id, {
    read_at: new Date(),
  })
  const updated = (result.data ?? result) as Record<string, unknown>
  res.json(decorateNotification(updated))
})

router.put('/read-all', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  await updateMany(
    'notifications',
    [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'read_at', operator: 'is_null', value: null },
    ],
    { read_at: new Date() },
  )
  res.json({ updated: true })
})

export default router
