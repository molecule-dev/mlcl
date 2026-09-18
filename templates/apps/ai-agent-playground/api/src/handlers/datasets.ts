/**
 * Datasets handler — evaluation fixtures for agent regression suites.
 *
 * Backs the `/datasets` page. Standard owner-scoped CRUD with the same
 * authorization rules as agents: non-owner reads return 404 to avoid
 * leaking existence.
 *
 * @module
 */
import { type Request, type Response, Router } from 'express'
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
import { validateBody, validateParams } from '@molecule/api-middleware-validation'

const router = Router()

const createSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).default(''),
  format: z.enum(['jsonl', 'csv', 'parquet']).default('jsonl'),
  row_count: z.number().int().min(0).optional(),
})

const updateSchema = createSchema.partial()

interface DatasetRow {
  id: string
  user_id: string
  name: string
  description: string
  format: string
  row_count: number
  created_at?: Date | string
  updated_at?: Date | string
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
      return
    }
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const items = await findMany<DatasetRow>('datasets', {
      where,
      orderBy: [{ field: 'updated_at', direction: 'desc' }],
    })
    res.json(items)
  } catch (err) {
    logger.error('datasets.list failed', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const ds = await findById<DatasetRow>('datasets', id)
    if (!ds || ds.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('datasets.notFound', undefined, { defaultValue: 'Dataset not found' }) })
      return
    }
    res.json(ds)
  } catch (err) {
    logger.error('datasets.get failed', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/', validateBody(createSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
      return
    }
    const body = req.body as z.infer<typeof createSchema>
    const result = await create<DatasetRow>('datasets', {
      user_id: userId,
      name: body.name,
      description: body.description,
      format: body.format,
      row_count: body.row_count ?? 0,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (err) {
    logger.error('datasets.create failed', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res
          .status(401)
          .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
        return
      }
      const id = getParamId(req)
      const existing = await findById<DatasetRow>('datasets', id)
      if (!existing || existing.user_id !== userId) {
        res
          .status(404)
          .json({ error: t('datasets.notFound', undefined, { defaultValue: 'Dataset not found' }) })
        return
      }
      const body = req.body as z.infer<typeof updateSchema>
      const updates: Record<string, unknown> = { updated_at: new Date() }
      if (body.name !== undefined) updates.name = body.name
      if (body.description !== undefined) updates.description = body.description
      if (body.format !== undefined) updates.format = body.format
      if (body.row_count !== undefined) updates.row_count = body.row_count
      const result = await updateById<DatasetRow>('datasets', id, updates)
      res.json(result.data)
    } catch (err) {
      logger.error('datasets.update failed', err)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.delete('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const existing = await findById<DatasetRow>('datasets', id)
    if (!existing || existing.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('datasets.notFound', undefined, { defaultValue: 'Dataset not found' }) })
      return
    }
    await deleteById('datasets', id)
    res.status(204).end()
  } catch (err) {
    logger.error('datasets.delete failed', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
