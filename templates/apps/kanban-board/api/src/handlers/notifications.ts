/**
 * Notification handlers — owner-scoped feed and read-state.
 *
 * Notifications are user-targeted (not board-scoped). The user_id
 * column is the recipient; readers must match the session user.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { requireUser } from '@molecule/api-bonds-default-express'
import {
  findMany,
  findOne,
  updateById,
  updateMany,
  type WhereCondition,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

const idParam = z.object({ id: z.string().uuid() })

interface NotificationRow {
  id: string
  user_id: string
  type: string
  title: string
  body: string | null
  data: unknown
  read_at: string | null
  created_at: string
}

router.get('/', async (req: Request, res: Response) => {
  const userId = requireUser(res)
  if (!userId) return
  try {
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (req.query.unread === 'true') {
      where.push({ field: 'read_at', operator: 'is_null' })
    }
    const items = await findMany<NotificationRow>('notifications', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 100,
    })
    res.json(items)
  } catch (error) {
    logger.error('notification.list', error)
    res.status(500).json({
      error: t('notification.error.list', {}, { defaultValue: 'Failed to list notifications' }),
    })
  }
})

router.post('/:id/read', async (req: Request, res: Response) => {
  const userId = requireUser(res)
  if (!userId) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      issues: id.error.issues,
    })
    return
  }
  try {
    const owned = await findOne<NotificationRow>('notifications', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'user_id', operator: '=', value: userId },
    ])
    if (!owned) {
      res.status(404).json({
        error: t('notification.notFound', {}, { defaultValue: 'Notification not found' }),
      })
      return
    }
    await updateById('notifications', id.data.id, { read_at: new Date() })
    res.json({ read: true })
  } catch (error) {
    logger.error('notification.read', error)
    res.status(500).json({
      error: t('notification.error.read', {}, { defaultValue: 'Failed to mark as read' }),
    })
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
    res.json({ read: true })
  } catch (error) {
    logger.error('notification.readAll', error)
    res.status(500).json({
      error: t('notification.error.readAll', {}, { defaultValue: 'Failed to mark as read' }),
    })
  }
})

export default router
