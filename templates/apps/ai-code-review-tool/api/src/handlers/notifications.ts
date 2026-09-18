/**
 * Notifications handler — per-user in-app notification feed.
 *
 * Routes:
 *   GET    /notifications           list caller's notifications
 *   GET    /notifications/:id       single notification
 *   POST   /notifications           create a notification (system / test)
 *   POST   /notifications/:id/read  mark as read
 *   DELETE /notifications/:id       delete
 *
 * Per-user via `user_id` (G6 — IDOR-safe). `requireUserOwnership` scopes
 * to the authenticated user, returning 404 for cross-user reads.
 */

import { randomUUID } from 'node:crypto'

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { requireUserOwnership } from '@molecule/api-bonds-default-express'
import {
  create,
  deleteById,
  findMany,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'
import { authorizers } from '@molecule/api-resource-user'

const router = Router()

const listQuerySchema = z.object({
  unread: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
})

const createSchema = z.object({
  kind: z.string().min(1).max(64),
  title: z.string().min(1).max(200),
  body: z.string().max(2000).optional(),
  link: z.string().max(2048).optional(),
})

router.use(authorizers.auth())

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const { unread, page, limit } = req.query as unknown as z.infer<typeof listQuerySchema>
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (unread === true) where.push({ field: 'read_at', operator: 'is_null', value: null })
    const items = await findMany('notifications', {
      where,
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      limit,
      offset: (page - 1) * limit,
    })
    res.json(items)
  } catch (err) {
    logger.error('notifications.list', err)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireUserOwnership('notifications', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('notifications.notFound', {}, { defaultValue: 'Notification not found' }),
      })
      return
    }
    res.json(check.row)
  } catch (err) {
    logger.error('notifications.get', err)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/', validateBody(createSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const body = req.body as z.infer<typeof createSchema>
    const id = randomUUID()
    const created = await create('notifications', {
      id,
      user_id: userId,
      owner_id: userId,
      kind: body.kind,
      title: body.title,
      body: body.body ?? null,
      link: body.link ?? null,
    })
    res.status(201).json(created.data ?? { id })
  } catch (err) {
    logger.error('notifications.create', err)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
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
  } catch (err) {
    logger.error('notifications.markRead', err)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireUserOwnership('notifications', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('notifications.notFound', {}, { defaultValue: 'Notification not found' }),
      })
      return
    }
    await deleteById('notifications', req.params.id as string)
    res.status(204).end()
  } catch (err) {
    logger.error('notifications.delete', err)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
