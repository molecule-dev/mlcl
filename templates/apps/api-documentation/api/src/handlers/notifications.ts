import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import { isUuid } from '../lib/is-uuid.js'

const router = Router()

const createSchema = z.object({
  type: z.string().min(1),
  title: z.string().min(1),
  body: z.string().optional(),
  href: z.string().optional(),
  unread: z.boolean().optional(),
})

const updateSchema = z.object({
  unread: z.boolean().optional(),
  title: z.string().optional(),
  body: z.string().optional(),
  href: z.string().optional(),
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
    logger.error(error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    if (!isUuid(getParamId(req)))
      return res.status(404).json({ error: t('notifications.notFound') })
    const row = await findById<Record<string, unknown>>('notifications', getParamId(req))
    if (!row || row.user_id !== userId) {
      return res.status(404).json({ error: t('notifications.notFound') })
    }
    res.json(row)
  } catch (error) {
    logger.error(error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.post('/', validateBody(createSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const result = await create('notifications', {
      ...req.body,
      user_id: userId,
      unread: req.body.unread ?? true,
      created_at: new Date(),
    })
    res.status(201).json((result as { data?: unknown }).data ?? result)
  } catch (error) {
    logger.error(error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.put('/:id', validateBody(updateSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const id = getParamId(req)
    if (!isUuid(id)) return res.status(404).json({ error: t('notifications.notFound') })
    const existing = await findById<Record<string, unknown>>('notifications', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('notifications.notFound') })
    }
    const result = await updateById('notifications', id, req.body)
    res.json((result as { data?: unknown }).data ?? result)
  } catch (error) {
    logger.error(error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const id = getParamId(req)
    if (!isUuid(id)) return res.status(404).json({ error: t('notifications.notFound') })
    const existing = await findById<Record<string, unknown>>('notifications', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('notifications.notFound') })
    }
    await deleteById('notifications', id)
    res.status(204).end()
  } catch (error) {
    logger.error(error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
