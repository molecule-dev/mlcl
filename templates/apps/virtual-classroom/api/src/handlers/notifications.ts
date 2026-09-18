/**
 * Notification handlers — per-user inbox.
 *
 * - GET /         lists the authenticated user's notifications, newest first.
 * - POST /:id/read marks a single notification read (idempotent).
 * - POST /read-all marks every unread notification read.
 * - DELETE /:id   permanently deletes one notification.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import {
  deleteById,
  findMany,
  findOne,
  updateById,
  updateMany,
  type WhereCondition,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import { internalError, type NotificationRow, requireUser, validationError } from '../lib/authz.js'

const router = Router()

const idParam = z.object({ id: z.string().uuid() })

router.get('/', async (req: Request, res: Response) => {
  const userId = requireUser(res)
  if (!userId) return
  try {
    const onlyUnread = req.query.unread === 'true' || req.query.unread === '1'
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (onlyUnread) where.push({ field: 'read_at', operator: 'is_null' })
    const items = await findMany<NotificationRow>('notifications', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 200,
    })
    res.json(items)
  } catch (error) {
    logger.error('notifications.list', error)
    internalError(res)
  }
})

router.post('/:id/read', async (req: Request, res: Response) => {
  const userId = requireUser(res)
  if (!userId) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const note = await findOne<NotificationRow>('notifications', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'user_id', operator: '=', value: userId },
    ])
    if (!note) {
      res.status(404).json({
        error: t('notifications.notFound', {}, { defaultValue: 'Notification not found' }),
      })
      return
    }
    if (!note.read_at) {
      const result = await updateById<NotificationRow>('notifications', id.data.id, {
        read_at: new Date(),
      })
      res.json(result.data)
      return
    }
    res.json(note)
  } catch (error) {
    logger.error('notifications.markRead', error)
    internalError(res)
  }
})

router.post('/read-all', async (_req: Request, res: Response) => {
  const userId = requireUser(res)
  if (!userId) return
  try {
    await updateMany(
      'notifications',
      [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'read_at', operator: 'is_null' },
      ],
      { read_at: new Date() },
    )
    res.json({ success: true })
  } catch (error) {
    logger.error('notifications.markAllRead', error)
    internalError(res)
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = requireUser(res)
  if (!userId) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const note = await findOne<NotificationRow>('notifications', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'user_id', operator: '=', value: userId },
    ])
    if (!note) {
      res.status(404).json({
        error: t('notifications.notFound', {}, { defaultValue: 'Notification not found' }),
      })
      return
    }
    await deleteById('notifications', id.data.id)
    res.status(204).end()
  } catch (error) {
    logger.error('notifications.delete', error)
    internalError(res)
  }
})

export default router
