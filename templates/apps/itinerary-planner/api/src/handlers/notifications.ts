import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const createNotificationSchema = z.object({
  kind: z.string().min(1),
  title: z.string().min(1),
  body: z.string().optional(),
  trip_id: z.string().optional(),
  occurred_at: z.string().optional(),
})

const updateNotificationSchema = z.object({
  read: z.boolean().optional(),
  title: z.string().optional(),
  body: z.string().optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
    }
    const rows = await findMany('notifications', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'occurred_at', direction: 'desc' }],
    })
    res.json(rows)
  } catch (error) {
    logger.error('GET /notifications failed', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.post('/', validateBody(createNotificationSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
    }
    const data = req.body as z.infer<typeof createNotificationSchema>
    const result = await create('notifications', {
      user_id: userId,
      kind: data.kind,
      title: data.title,
      body: data.body ?? null,
      trip_id: data.trip_id ?? null,
      occurred_at: data.occurred_at ?? new Date(),
      read: false,
      created_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('POST /notifications failed', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.put('/:id', validateBody(updateNotificationSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('notifications', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('notification.notFound', undefined, { defaultValue: 'Notification not found.' }),
      })
    }
    const result = await updateById('notifications', id, { ...req.body })
    res.json(result.data)
  } catch (error) {
    logger.error('PUT /notifications/:id failed', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('notifications', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('notification.notFound', undefined, { defaultValue: 'Notification not found.' }),
      })
    }
    await deleteById('notifications', id)
    res.status(204).end()
  } catch (error) {
    logger.error('DELETE /notifications/:id failed', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.post('/mark-all-read', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
    }
    const unread = await findMany<Record<string, unknown>>('notifications', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'read', operator: '=', value: false },
      ],
    })
    await Promise.all(
      unread.map((row) => updateById('notifications', row.id as string, { read: true })),
    )
    res.json({ updated: unread.length })
  } catch (error) {
    logger.error('POST /notifications/mark-all-read failed', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

export default router
