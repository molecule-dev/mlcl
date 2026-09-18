/**
 * history handler — read-only execution log + delete/clear.
 *
 * History rows are written exclusively by `requests.ts:/execute` (and by
 * the cron monitor worker once it lands); this handler only reads/deletes.
 *
 * @module
 */
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { deleteById, deleteMany, findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const listQuerySchema = z.object({
  request_id: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const reqId = (req.query.request_id ?? req.body?.request_id) as string | undefined
    if (reqId) where.push({ field: 'request_id', operator: '=', value: reqId })
    const limit = Number(req.query.limit ?? 50)
    const offset = Number(req.query.offset ?? 0)
    const orderBy: OrderBy[] = [{ field: 'created_at', direction: 'desc' }]
    const items = await findMany('history', { where, orderBy, limit, offset })
    res.json(items)
  } catch (error) {
    logger.error('history.list', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const entry = await findById<Record<string, unknown>>('history', getParamId(req))
    if (!entry || entry.user_id !== userId) {
      return res.status(404).json({ error: t('history.notFound') })
    }
    res.json(entry)
  } catch (error) {
    logger.error('history.getById', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const id = getParamId(req)
    const entry = await findById<Record<string, unknown>>('history', id)
    if (!entry || entry.user_id !== userId) {
      return res.status(404).json({ error: t('history.notFound') })
    }
    await deleteById('history', id)
    res.status(204).end()
  } catch (error) {
    logger.error('history.delete', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.delete('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    await deleteMany('history', [{ field: 'user_id', operator: '=', value: userId }])
    res.status(204).end()
  } catch (error) {
    logger.error('history.clear', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
