import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import {
  create,
  deleteById,
  findById,
  findMany,
  updateById,
  updateMany,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const createNotificationSchema = z.object({
  user_id: z.string().min(1).optional(),
  kind: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).optional(),
})

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (req.query.unread === 'true') {
      where.push({ field: 'read_at', operator: 'is_null' })
    }

    const notifications = await findMany('notifications', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: Number(req.query.limit) || 100,
    })
    res.json(notifications)
  } catch (err) {
    console.error(`[notifications.ts]`, err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

/**
 * Self-service notification creation. The notification is always created
 * for the authenticated user — `user_id` in the body is ignored to prevent
 * users from inserting rows for other people.
 */
router.post('/', validateBody(createNotificationSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const result = await create('notifications', {
      user_id: userId,
      kind: req.body.kind,
      payload: JSON.stringify(req.body.payload ?? {}),
    })
    res.status(201).json(result.data)
  } catch (err) {
    console.error(`[notifications.ts]`, err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/mark-all-read', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    await updateMany(
      'notifications',
      [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'read_at', operator: 'is_null' },
      ],
      { read_at: new Date() },
    )
    res.json({ ok: true })
  } catch (err) {
    console.error(`[notifications.ts]`, err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/:id/read', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('notifications', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('notifications.notFound', {}, { defaultValue: 'Notification not found' }),
      })
    }

    const result = await updateById('notifications', id, { read_at: new Date() })
    res.json(result.data)
  } catch (err) {
    console.error(`[notifications.ts]`, err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('notifications', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('notifications.notFound', {}, { defaultValue: 'Notification not found' }),
      })
    }

    await deleteById('notifications', id)
    res.status(204).end()
  } catch (err) {
    console.error(`[notifications.ts]`, err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
