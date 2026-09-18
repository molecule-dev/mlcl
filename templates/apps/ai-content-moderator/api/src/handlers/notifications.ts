/**
 * Notifications handler.
 *
 * Routes:
 *   GET    /notifications                list user's notifications (latest first)
 *   POST   /notifications/:id/read       mark a single notification read
 *   POST   /notifications/read-all       mark every unread notification read
 *
 * Scoped by `user_id` (per-recipient, not per-org).
 */

import { randomUUID } from 'node:crypto'

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { requireUserOwnership } from '@molecule/api-bonds-default-express'
import {
  create,
  findMany,
  updateById,
  updateMany,
  type WhereCondition,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'
import { authorizers } from '@molecule/api-resource-user'

const router = Router()

const listQuerySchema = z.object({
  unread: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
})

const createNotificationSchema = z.object({
  kind: z.enum(['assignment', 'escalation', 'mention', 'rule-fired', 'system']),
  title: z.string().min(1).max(200),
  body: z.string().max(2000).optional(),
  link: z.string().max(2048).optional(),
})

router.use(authorizers.auth())

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const { unread, limit } = req.query as unknown as z.infer<typeof listQuerySchema>
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (unread === true) where.push({ field: 'read_at', operator: 'is_null' })
    if (unread === false) where.push({ field: 'read_at', operator: 'is_not_null' })

    const items = await findMany('notifications', {
      where,
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      limit,
    })
    res.json(items)
  } catch (error) {
    logger.error('notifications.list', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', validateBody(createNotificationSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const body = req.body as z.infer<typeof createNotificationSchema>
    const id = randomUUID()
    const inserted = await create('notifications', {
      id,
      user_id: userId,
      owner_id: userId,
      kind: body.kind,
      title: body.title,
      body: body.body ?? null,
      link: body.link ?? null,
    })
    res.status(201).json(inserted.data ?? { id })
  } catch (error) {
    logger.error('notifications.create', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/:id/read', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireUserOwnership('notifications', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('notifications.notFound', {}, { defaultValue: 'Notification not found' }),
      })
      return
    }
    const updated = await updateById('notifications', req.params.id as string, {
      read_at: new Date().toISOString(),
    })
    res.json(updated.data)
  } catch (error) {
    logger.error('notifications.markRead', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/read-all', async (_req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const result = await updateMany(
      'notifications',
      [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'read_at', operator: 'is_null' },
      ],
      { read_at: new Date().toISOString() },
    )
    res.json({ updated: result.affected })
  } catch (error) {
    logger.error('notifications.markAllRead', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
