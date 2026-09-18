/**
 * Notification handlers — per-user inbox for check-in reminders,
 * objective completions, and review events.
 *
 * Uses the abstract DataStore from @molecule/api-database (no raw SQL).
 * Every read/write scopes by user_id = session.userId.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { requireUser, validationError } from '@molecule/api-bonds-default-express'
import {
  deleteById,
  findMany,
  findOne,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

const idParam = z.object({ id: z.string().uuid() })

const listQuery = z.object({
  read: z.enum(['true', 'false', 'any']).optional(),
})

interface NotificationRow {
  id: string
  user_id: string
  type: string
  title: string
  body: string | null
  data: Record<string, unknown> | null
  read_at: string | null
  created_at: string
}

router.get('/', async (req: Request, res: Response) => {
  const user = requireUser(res)
  if (!user) return
  const parsedQuery = listQuery.safeParse(req.query)
  if (!parsedQuery.success) {
    validationError(res, parsedQuery.error.issues)
    return
  }
  try {
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: user }]
    if (parsedQuery.data.read === 'true') {
      where.push({ field: 'read_at', operator: 'is_not_null' })
    } else if (parsedQuery.data.read === 'false') {
      where.push({ field: 'read_at', operator: 'is_null' })
    }
    const items = await findMany<NotificationRow>('notifications', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 200,
    })
    res.json(items)
  } catch (error) {
    logger.error('notifications.list', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/:id/read', async (req: Request, res: Response) => {
  const user = requireUser(res)
  if (!user) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const existing = await findOne<NotificationRow>('notifications', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'user_id', operator: '=', value: user },
    ])
    if (!existing) {
      res.status(404).json({
        error: t('notification.notFound', {}, { defaultValue: 'Notification not found' }),
      })
      return
    }
    await updateById('notifications', id.data.id, { read_at: new Date() })
    res.json({ read: true })
  } catch (error) {
    logger.error('notifications.markRead', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  const user = requireUser(res)
  if (!user) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const existing = await findOne<NotificationRow>('notifications', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'user_id', operator: '=', value: user },
    ])
    if (!existing) {
      res.status(404).json({
        error: t('notification.notFound', {}, { defaultValue: 'Notification not found' }),
      })
      return
    }
    await deleteById('notifications', id.data.id)
    res.status(204).end()
  } catch (error) {
    logger.error('notifications.delete', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
