/**
 * collections handler — owner-scoped CRUD for saved-request groupings.
 *
 * @module
 */
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const createCollectionSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  sort_order: z.number().int().optional(),
})

const updateCollectionSchema = createCollectionSchema.partial()

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const orderBy: OrderBy[] = [{ field: 'updated_at', direction: 'desc' }]
    const rows = await findMany('collections', { where, orderBy })
    res.json(rows)
  } catch (error) {
    logger.error('collections.list', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const row = await findById<Record<string, unknown>>('collections', getParamId(req))
    if (!row || row.user_id !== userId) {
      return res.status(404).json({ error: t('collections.notFound') })
    }
    const requestRows = await findMany('requests', {
      where: [{ field: 'collection_id', operator: '=', value: row.id as string }],
      orderBy: [{ field: 'sort_order', direction: 'asc' }],
    })
    res.json({ ...row, requests: requestRows })
  } catch (error) {
    logger.error('collections.getById', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.post('/', validateBody(createCollectionSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const result = await create('collections', {
      user_id: userId,
      name: req.body.name,
      description: req.body.description ?? '',
      sort_order: req.body.sort_order ?? 0,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json((result as { data?: unknown }).data ?? result)
  } catch (error) {
    logger.error('collections.create', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.put('/:id', validateBody(updateCollectionSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('collections', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('collections.notFound') })
    }
    const updates: Record<string, unknown> = { ...req.body, updated_at: new Date() }
    const result = await updateById('collections', id, updates)
    res.json((result as { data?: unknown }).data ?? result)
  } catch (error) {
    logger.error('collections.update', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('collections', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('collections.notFound') })
    }
    await deleteById('collections', id)
    res.status(204).end()
  } catch (error) {
    logger.error('collections.delete', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
