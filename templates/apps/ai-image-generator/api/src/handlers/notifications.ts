/**
 * Notifications handler — surfaces generation events grouped by day.
 * Backed by `public.notifications` (migration 0010).
 */
import { type Request, type Response, Router } from 'express'

import { getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { findById, findMany, query, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateParams } from '@molecule/api-middleware-validation'

const router = Router()

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }),
      })
    }
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const orderBy: OrderBy[] = [{ field: 'created_at', direction: 'desc' }]
    const items = await findMany<Record<string, unknown>>('notifications', {
      where,
      orderBy,
      limit: 100,
    })
    res.json(items)
  } catch (error) {
    logger.error('notifications.list', error)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/mark-all-read', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }),
      })
    }
    await query(`UPDATE notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL`, [
      userId,
    ])
    res.json({ ok: true })
  } catch (error) {
    logger.error('notifications.markAllRead', error)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.put('/:id/read', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }),
      })
    }
    const id = String(req.params.id)
    const found = await findById<Record<string, unknown>>('notifications', id)
    if (!found || found.user_id !== userId) {
      return res.status(404).json({
        error: t('notifications.notFound', {}, { defaultValue: 'Notification not found' }),
      })
    }
    const updated = await updateById('notifications', id, {
      read_at: new Date(),
    })
    res.json(updated.data)
  } catch (error) {
    logger.error('notifications.markRead', error)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
