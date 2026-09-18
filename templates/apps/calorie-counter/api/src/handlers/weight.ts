/**
 * Weight log CRUD handlers.
 *
 * - Owner-scoped by `user_id`.
 * - Inputs validated via @molecule/api-middleware-validation (Zod).
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { create, deleteMany, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const idOf = (req: Request): string => String(req.params.id)

const createSchema = z.object({
  weight_kg: z.number().min(20).max(500),
  recorded_at: z.string().min(1).optional(),
  notes: z.string().max(2000).optional(),
})

const updateSchema = createSchema.partial()

const listQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(60),
  offset: z.coerce.number().int().min(0).default(0),
})

interface WeightRow {
  id: string
  user_id: string
  weight_kg: number | string
  recorded_at: string
  notes: string
}

router.get(
  '/',
  validateQuery(listQuerySchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const { from, to, limit, offset } = req.query as unknown as z.infer<typeof listQuerySchema>
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (from) where.push({ field: 'recorded_at', operator: '>=', value: from })
    if (to) where.push({ field: 'recorded_at', operator: '<=', value: to })
    const orderBy: OrderBy[] = [{ field: 'recorded_at', direction: 'desc' }]
    const rows = await findMany<WeightRow>('weight_logs', { where, orderBy, limit, offset })
    res.json(rows)
  },
)

router.get(
  '/:id',
  validateParams(idParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const row = await findById<WeightRow>('weight_logs', idOf(req))
    if (!row || row.user_id !== userId) {
      res.status(404).json({
        error: t('weight.notFound', undefined, { defaultValue: 'Weight log not found.' }),
      })
      return
    }
    res.json(row)
  },
)

router.post('/', validateBody(createSchema), async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  const body = req.body as z.infer<typeof createSchema>
  const result = await create('weight_logs', {
    user_id: userId,
    weight_kg: body.weight_kg,
    recorded_at: body.recorded_at ? new Date(body.recorded_at) : new Date(),
    notes: body.notes ?? '',
    created_at: new Date(),
    updated_at: new Date(),
  })
  res.status(201).json(result.data)
})

router.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = idOf(req)
    const existing = await findById<WeightRow>('weight_logs', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('weight.notFound', undefined, { defaultValue: 'Weight log not found.' }),
      })
      return
    }
    const updates = { ...(req.body as Record<string, unknown>), updated_at: new Date() }
    const result = await updateById('weight_logs', id, updates)
    res.json(result.data)
  },
)

router.delete(
  '/:id',
  validateParams(idParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = idOf(req)
    const existing = await findById<WeightRow>('weight_logs', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('weight.notFound', undefined, { defaultValue: 'Weight log not found.' }),
      })
      return
    }
    await deleteMany('weight_logs', [
      { field: 'id', operator: '=', value: id },
      { field: 'user_id', operator: '=', value: userId },
    ])
    res.status(204).end()
  },
)

export default router
