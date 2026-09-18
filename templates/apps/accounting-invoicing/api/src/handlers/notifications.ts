import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const markReadSchema = z.object({
  unread: z.boolean().optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const orderBy: OrderBy[] = [{ field: 'created_at', direction: 'desc' }]
    const rows = await findMany('notifications', { where, orderBy })
    res.json(rows)
  } catch (error) {
    logger.error('notifications.list', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.put('/:id/read', validateBody(markReadSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('notifications', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('errors.notFound') })
    }
    const unread = req.body.unread ?? false
    const result = await updateById('notifications', id, { unread })
    res.json((result as { data?: unknown }).data ?? result)
  } catch (error) {
    logger.error('notifications.markRead', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
