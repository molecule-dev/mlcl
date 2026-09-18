import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { findById, findMany, updateById, updateMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(100),
  read: z.coerce.boolean().optional(),
})

const idParamSchema = z.object({
  id: z.string().uuid(),
})

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const { limit, read } = req.query as unknown as z.infer<typeof listQuerySchema>
    const where: Array<{ field: string; operator: '='; value: unknown }> = [
      { field: 'user_id', operator: '=', value: userId },
    ]
    if (typeof read === 'boolean') {
      where.push({ field: 'read', operator: '=', value: read })
    }
    const notifications = await findMany('notifications', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit,
    })
    res.json(notifications)
  } catch (err) {
    console.error('[notifications] handler failed:', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.put('/read-all', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const result = await updateMany(
      'notifications',
      [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'read', operator: '=', value: false },
      ],
      { read: true },
    )
    res.json({ updated: result.affected ?? 0 })
  } catch (err) {
    console.error('[notifications] mark-all-read failed:', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.put('/:id/read', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const parsed = idParamSchema.safeParse({ id: getParamId(req) })
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: t('errors.invalidId', {}, { defaultValue: 'Invalid id parameter' }) })
      return
    }
    const id = parsed.data.id
    const notification = await findById<Record<string, unknown>>('notifications', id)
    if (!notification) {
      res.status(404).json({
        error: t('notifications.notFound', {}, { defaultValue: 'Notification not found' }),
      })
      return
    }
    if (notification.user_id !== userId) {
      res.status(403).json({
        error: t(
          'notifications.notOwner',
          {},
          { defaultValue: 'You cannot update this notification' },
        ),
      })
      return
    }
    const result = await updateById('notifications', id, { read: true })
    res.json(result.data)
  } catch (err) {
    console.error('[notifications] handler failed:', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
