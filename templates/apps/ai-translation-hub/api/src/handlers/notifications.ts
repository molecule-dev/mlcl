/**
 * Notifications handler — owner-scoped CRUD over `notifications`. The
 * canonical INVENTORY flow is "new assignment / review request" surfacing
 * a row here; mark-read is a PATCH that sets `read_at`.
 */
import { Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import {
  create,
  deleteById,
  findById,
  findMany,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const createNotificationSchema = z.object({
  kind: z.string().min(1).default('info'),
  title: z.string().min(1),
  body: z.string().default(''),
  link: z.string().nullish(),
})

const listQuerySchema = z.object({
  unread: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

router.get('/', validateQuery(listQuerySchema), async (req, res) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const q = req.query as unknown as z.infer<typeof listQuerySchema>
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (q.unread) where.push({ field: 'read_at', operator: 'is_null' })
    const rows = await findMany('notifications', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: q.limit,
      offset: q.offset,
    })
    res.json(rows)
  } catch (error) {
    logger.error('notifications.list', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', validateParams(idParamSchema), async (req, res) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const notif = await findById<Record<string, unknown>>('notifications', id)
    if (!notif || notif.user_id !== userId) {
      res.status(404).json({
        error: t('notifications.notFound', {}, { defaultValue: 'Notification not found' }),
      })
      return
    }
    res.json(notif)
  } catch (error) {
    logger.error('notifications.get', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', validateBody(createNotificationSchema), async (req, res) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const body = req.body as z.infer<typeof createNotificationSchema>
    const result = await create('notifications', {
      user_id: userId,
      kind: body.kind,
      title: body.title,
      body: body.body,
      link: body.link ?? null,
      read_at: null,
      created_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('notifications.create', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/:id/read', validateParams(idParamSchema), async (req, res) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('notifications', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('notifications.notFound', {}, { defaultValue: 'Notification not found' }),
      })
      return
    }
    const result = await updateById('notifications', id, { read_at: new Date() })
    res.json(result.data)
  } catch (error) {
    logger.error('notifications.markRead', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/:id', validateParams(idParamSchema), async (req, res) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('notifications', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('notifications.notFound', {}, { defaultValue: 'Notification not found' }),
      })
      return
    }
    await deleteById('notifications', id)
    res.status(204).end()
  } catch (error) {
    logger.error('notifications.delete', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
