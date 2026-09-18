/**
 * Body-measurement CRUD handlers (weight, body comp, circumferences,
 * progress photos).
 *
 * - Owner-scoped via `user_id` (no IDOR).
 * - Inputs validated via @molecule/api-middleware-validation (zod).
 * - DataStore (no raw SQL) via @molecule/api-database.
 *
 * @module
 */

import { randomUUID } from 'node:crypto'

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId, uuidParamSchema as idParamSchema } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { create, deleteMany, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const listQuerySchema = z.object({
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

const measurementShape = {
  recorded_at: z.string().datetime().optional(),
  weight_kg: z.number().nonnegative().nullable().optional(),
  body_fat_pct: z.number().min(0).max(100).nullable().optional(),
  chest_cm: z.number().nonnegative().nullable().optional(),
  waist_cm: z.number().nonnegative().nullable().optional(),
  hips_cm: z.number().nonnegative().nullable().optional(),
  thigh_cm: z.number().nonnegative().nullable().optional(),
  bicep_cm: z.number().nonnegative().nullable().optional(),
  // photo_s3_key is intentionally NOT accepted from the client. A client-chosen
  // storage key could address another tenant's object via any future
  // download/preview route (cross-tenant IDOR); it is minted server-side below.
  notes: z.string().max(2000).nullable().optional(),
}

const createSchema = z.object(measurementShape)
const updateSchema = z.object(measurementShape).partial()

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
    const { start_date, end_date, limit, offset } = req.query as z.infer<typeof listQuerySchema>
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (start_date) where.push({ field: 'recorded_at', operator: '>=', value: start_date })
    if (end_date) where.push({ field: 'recorded_at', operator: '<=', value: end_date })
    const orderBy: OrderBy[] = [{ field: 'recorded_at', direction: 'desc' }]
    const items = await findMany('body_measurements', {
      where,
      orderBy,
      limit: limit ?? 100,
      offset: offset ?? 0,
    })
    res.json(items)
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
    const item = await findById<Record<string, unknown>>('body_measurements', String(req.params.id))
    if (!item || item.user_id !== userId) {
      res.status(404).json({
        error: t('measurement.notFound', undefined, { defaultValue: 'Measurement not found.' }),
      })
      return
    }
    res.json(item)
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
  const result = await create('body_measurements', {
    user_id: userId,
    recorded_at: body.recorded_at ? new Date(body.recorded_at) : new Date(),
    weight_kg: body.weight_kg ?? null,
    body_fat_pct: body.body_fat_pct ?? null,
    chest_cm: body.chest_cm ?? null,
    waist_cm: body.waist_cm ?? null,
    hips_cm: body.hips_cm ?? null,
    thigh_cm: body.thigh_cm ?? null,
    bicep_cm: body.bicep_cm ?? null,
    // Server-minted, owner-scoped key — never a client-supplied value.
    photo_s3_key: `measurements/${userId}/${randomUUID()}`,
    notes: body.notes ?? null,
    created_at: new Date(),
  })
  res.status(201).json(result.data)
})

router.patch(
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
    const id = String(req.params.id)
    const existing = await findById<Record<string, unknown>>('body_measurements', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('measurement.notFound', undefined, { defaultValue: 'Measurement not found.' }),
      })
      return
    }
    const result = await updateById('body_measurements', id, {
      ...(req.body as Record<string, unknown>),
    })
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
    const id = String(req.params.id)
    const existing = await findById<Record<string, unknown>>('body_measurements', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('measurement.notFound', undefined, { defaultValue: 'Measurement not found.' }),
      })
      return
    }
    await deleteMany('body_measurements', [
      { field: 'id', operator: '=', value: id },
      { field: 'user_id', operator: '=', value: userId },
    ])
    res.status(204).end()
  },
)

export default router
