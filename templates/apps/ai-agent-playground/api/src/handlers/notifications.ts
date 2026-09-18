/**
 * Notifications handler — workspace event feed shown on `/notifications`.
 *
 * Supports listing (filtered by read state via ?read=true|false),
 * marking a single notification read (PATCH /:id), marking everything
 * unread as read (POST /mark-all-read), creating new entries (used by
 * other handlers when an interesting event occurs), and deleting.
 *
 * Ownership is enforced on every read/write — non-owner reads return 404,
 * not 403, to avoid leaking existence per the project's authorization rules.
 *
 * @module
 */
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import {
  create,
  deleteById,
  findById,
  findMany,
  query,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const listQuerySchema = z.object({
  read: z.enum(['true', 'false']).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
})

const createSchema = z.object({
  kind: z.enum(['info', 'success', 'failed', 'tool-alert']).default('info'),
  title: z.string().max(255).default(''),
  body: z.string().max(2000).default(''),
  link: z.string().max(1024).optional().nullable(),
})

interface NotificationRow {
  id: string
  user_id: string
  kind: string
  title: string
  body: string
  link?: string | null
  read_at?: Date | string | null
  created_at?: Date | string
}

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
      return
    }
    const q = req.query as z.infer<typeof listQuerySchema>
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (q.read === 'true') {
      where.push({ field: 'read_at', operator: 'is_not_null' })
    } else if (q.read === 'false') {
      where.push({ field: 'read_at', operator: 'is_null' })
    }
    const items = await findMany<NotificationRow>('notifications', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: q.limit ?? 200,
    })
    res.json(items)
  } catch (err) {
    logger.error('notifications.list failed', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/mark-all-read', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
      return
    }
    await query('UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL', [
      userId,
    ])
    res.json({ ok: true })
  } catch (err) {
    logger.error('notifications.markAllRead failed', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/', validateBody(createSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
      return
    }
    const body = req.body as z.infer<typeof createSchema>
    const result = await create<NotificationRow>('notifications', {
      user_id: userId,
      kind: body.kind,
      title: body.title,
      body: body.body,
      link: body.link ?? null,
      created_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (err) {
    logger.error('notifications.create failed', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.patch('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const existing = await findById<NotificationRow>('notifications', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('notifications.notFound', undefined, { defaultValue: 'Notification not found' }),
      })
      return
    }
    const result = await updateById<NotificationRow>('notifications', id, {
      read_at: existing.read_at ?? new Date(),
    })
    res.json(result.data)
  } catch (err) {
    logger.error('notifications.markRead failed', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.delete('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const existing = await findById<NotificationRow>('notifications', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('notifications.notFound', undefined, { defaultValue: 'Notification not found' }),
      })
      return
    }
    await deleteById('notifications', id)
    res.status(204).end()
  } catch (err) {
    logger.error('notifications.delete failed', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
