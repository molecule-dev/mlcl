/**
 * Pantry CRUD handlers — ingredients the cook already has on hand.
 *
 * The grocery list cross-references these rows by normalized name to badge
 * "you already have this" on generated list items. Owner-scoped by user_id.
 *
 * @module
 */

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { count, create, deleteMany, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'

import type { MealPlannerLimits } from '../tiers.js'
import { seedPantryForUser } from './_seed.js'

const router = Router()

const enforceMaxPantryItems = enforceLimit<MealPlannerLimits>({
  limitType: 'maxPantryItems',
  getLimit: (limits) => limits.maxPantryItems,
  getCurrent: async (userId) =>
    count('pantry_items', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

const listQuerySchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(200),
})

const createItemSchema = z.object({
  name: z.string().min(1).max(200),
  quantity: z.number().min(0).default(1),
  unit: z.string().max(40).default(''),
})

const updateItemSchema = createItemSchema.partial()

interface PantryRow {
  id: string
  user_id: string
  name: string
  quantity: number | string
  unit: string
  [k: string]: unknown
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
    // First visit seeds a handful of staple rows so the page renders real
    // content; idempotent per user.
    try {
      await seedPantryForUser(userId)
    } catch (error) {
      // Demo seeding is best-effort; an empty pantry is still valid. But a
      // repeated silent failure reads as a broken app — log it.
      logger.error('pantry.seed', error)
    }
    const { q, page, limit } = req.query as unknown as z.infer<typeof listQuerySchema>
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (q) {
      // store auto-wraps with `%…%`; pass the literal substring, not a pattern.
      where.push({ field: 'name', operator: 'ilike', value: q })
    }
    const rows = await findMany<PantryRow>('pantry_items', {
      where,
      orderBy: [{ field: 'name', direction: 'asc' }],
      limit,
      offset: (page - 1) * limit,
    })
    res.json(rows)
  },
)

router.post(
  '/',
  enforceMaxPantryItems,
  validateBody(createItemSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const body = req.body as z.infer<typeof createItemSchema>
    const result = await create<PantryRow>('pantry_items', {
      user_id: userId,
      name: body.name,
      quantity: body.quantity,
      unit: body.unit,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  },
)

router.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateItemSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = String(req.params.id)
    const existing = await findById<PantryRow>('pantry_items', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('pantry.notFound', undefined, { defaultValue: 'Pantry item not found.' }),
      })
      return
    }
    const updates = { ...(req.body as Record<string, unknown>), updated_at: new Date() }
    const result = await updateById('pantry_items', id, updates)
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
    const existing = await findById<PantryRow>('pantry_items', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('pantry.notFound', undefined, { defaultValue: 'Pantry item not found.' }),
      })
      return
    }
    await deleteMany('pantry_items', [
      { field: 'id', operator: '=', value: id },
      { field: 'user_id', operator: '=', value: userId },
    ])
    res.status(204).end()
  },
)

export default router
