import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const createNotificationSchema = z.object({
  kind: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).optional(),
})

const markReadSchema = z.object({
  read_at: z.string().optional(),
})

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const { unread } = req.query
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (unread === '1' || unread === 'true') {
      where.push({ field: 'read_at', operator: 'is_null' })
    }
    const orderBy: OrderBy[] = [{ field: 'created_at', direction: 'desc' }]
    const notifications = await findMany('notifications', { where, orderBy })
    res.json(notifications)
  } catch (error) {
    logger.error('notifications.list', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.post('/', validateBody(createNotificationSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const body = req.body as z.infer<typeof createNotificationSchema>
    const result = await create('notifications', {
      user_id: userId,
      kind: body.kind,
      payload: JSON.stringify(body.payload ?? {}),
      created_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('notifications.create', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.patch('/:id', validateBody(markReadSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('notifications', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('notifications.notFound', {}, { defaultValue: 'Notification not found' }),
      })
    }
    const body = req.body as z.infer<typeof markReadSchema>
    const readAt = body.read_at ? new Date(body.read_at) : new Date()
    const result = await updateById('notifications', id, { read_at: readAt })
    res.json(result.data)
  } catch (error) {
    logger.error('notifications.markRead', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('notifications', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('notifications.notFound', {}, { defaultValue: 'Notification not found' }),
      })
    }
    await deleteById('notifications', id)
    res.status(204).end()
  } catch (error) {
    logger.error('notifications.delete', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
