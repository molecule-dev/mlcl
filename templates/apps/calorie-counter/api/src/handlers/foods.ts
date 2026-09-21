/**
 * Foods CRUD + barcode lookup handlers.
 *
 * - Verified system foods are publicly readable (any authenticated user).
 * - Custom foods are owner-scoped by `user_id`.
 * - Inputs validated via @molecule/api-middleware-validation (Zod).
 * - Tier-based limit enforcement via @molecule/api-entitlements.
 *
 * @module
 */

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { count, create, deleteMany, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'

import type { CalorieCounterLimits } from '../tiers.js'

const router = Router()

const idOf = (req: Request): string => String(req.params.id)

const enforceMaxFoods = enforceLimit<CalorieCounterLimits>({
  limitType: 'maxFoods',
  getLimit: (limits) => limits.maxFoods,
  getCurrent: async (userId) =>
    count('foods', [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'is_custom', operator: '=', value: true },
    ]),
}) as unknown as RequestHandler

const codeParamSchema = z.object({ code: z.string().min(1).max(64) })

const baseFoodSchema = z.object({
  name: z.string().min(1).max(200),
  brand: z.string().max(200).nullable().optional(),
  category: z.string().max(80).nullable().optional(),
  barcode: z.string().max(64).nullable().optional(),
  calories: z.number().min(0).default(0),
  protein: z.number().min(0).default(0),
  carbs: z.number().min(0).default(0),
  fat: z.number().min(0).default(0),
  fiber: z.number().min(0).default(0),
  sodium: z.number().min(0).default(0),
  sugar: z.number().min(0).default(0),
  serving_size: z.number().min(0).default(1),
  serving_unit: z.string().max(40).default('serving'),
})

const updateFoodSchema = baseFoodSchema.partial()

const listQuerySchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  is_verified: z.union([z.literal('true'), z.literal('false')]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  sort_by: z.enum(['name', 'calories', 'protein', 'carbs', 'fat']).default('name'),
  sort_order: z.enum(['asc', 'desc']).default('asc'),
})

interface FoodRow {
  id: string
  user_id: string | null
  is_custom: boolean
  is_verified: boolean
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
    const {
      q,
      category,
      is_verified: isVerified,
      page,
      limit,
      sort_by: sortBy,
      sort_order: sortOrder,
    } = req.query as unknown as z.infer<typeof listQuerySchema>
    // Verified rows are public; custom rows are scoped to current user.
    // Without a server-side OR, run two queries and merge.
    const orderBy: OrderBy[] = [{ field: sortBy, direction: sortOrder }]
    const verifiedWhere: WhereCondition[] = [{ field: 'is_verified', operator: '=', value: true }]
    const customWhere: WhereCondition[] = [
      { field: 'is_custom', operator: '=', value: true },
      { field: 'user_id', operator: '=', value: userId },
    ]
    if (category) {
      verifiedWhere.push({ field: 'category', operator: '=', value: category })
      customWhere.push({ field: 'category', operator: '=', value: category })
    }
    if (q) {
      // store auto-wraps with `%…%`; pass the literal substring, not a pattern.
      verifiedWhere.push({ field: 'name', operator: 'ilike', value: q })
      customWhere.push({ field: 'name', operator: 'ilike', value: q })
    }

    let combined: FoodRow[]
    if (isVerified === 'true') {
      combined = await findMany<FoodRow>('foods', {
        where: verifiedWhere,
        orderBy,
        limit,
        offset: (page - 1) * limit,
      })
    } else if (isVerified === 'false') {
      combined = await findMany<FoodRow>('foods', {
        where: customWhere,
        orderBy,
        limit,
        offset: (page - 1) * limit,
      })
    } else {
      const [verified, custom] = await Promise.all([
        findMany<FoodRow>('foods', {
          where: verifiedWhere,
          orderBy,
          limit,
          offset: (page - 1) * limit,
        }),
        findMany<FoodRow>('foods', {
          where: customWhere,
          orderBy,
          limit,
          offset: (page - 1) * limit,
        }),
      ])
      combined = [...verified, ...custom]
    }
    res.json(combined.slice(0, limit))
  },
)

router.get('/categories', async (_req: Request, res: Response): Promise<void> => {
  const rows = await findMany<{ category: string }>('foods', {
    where: [{ field: 'is_verified', operator: '=', value: true }],
    orderBy: [{ field: 'category', direction: 'asc' }],
    limit: 1000,
  })
  const seen = new Set<string>()
  const categories: string[] = []
  for (const r of rows) {
    if (r.category && !seen.has(r.category)) {
      seen.add(r.category)
      categories.push(r.category)
    }
  }
  res.json(categories)
})

router.get(
  '/barcode/:code',
  validateParams(codeParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const { code } = req.params as z.infer<typeof codeParamSchema>
    // Look up barcode against verified foods OR the user's own custom foods.
    const verified = await findMany<FoodRow>('foods', {
      where: [
        { field: 'barcode', operator: '=', value: code },
        { field: 'is_verified', operator: '=', value: true },
      ],
      limit: 1,
    })
    if (verified.length > 0) {
      res.json(verified[0])
      return
    }
    const custom = await findMany<FoodRow>('foods', {
      where: [
        { field: 'barcode', operator: '=', value: code },
        { field: 'user_id', operator: '=', value: userId },
      ],
      limit: 1,
    })
    if (custom.length > 0) {
      res.json(custom[0])
      return
    }
    res.status(404).json({
      error: t('food.barcodeNotFound', undefined, {
        defaultValue: 'Food not found for this barcode.',
      }),
    })
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
    let food: FoodRow | null = null
    try {
      food = await findById<FoodRow>('foods', idOf(req))
    } catch (error) {
      // Malformed ids (e.g. non-UUID values) should surface as not-found
      // rather than 5xx so callers can render a friendly empty state — but
      // genuine datastore failures must still reach the logs.
      logger.error('food.lookup_failed', error)
    }
    if (!food) {
      res.status(404).json({
        error: t('food.notFound', undefined, { defaultValue: 'Food not found.' }),
      })
      return
    }
    // Custom foods are owner-only.
    if (food.is_custom && food.user_id !== userId) {
      res.status(404).json({
        error: t('food.notFound', undefined, { defaultValue: 'Food not found.' }),
      })
      return
    }
    res.json(food)
  },
)

router.post(
  '/',
  enforceMaxFoods,
  validateBody(baseFoodSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const body = req.body as z.infer<typeof baseFoodSchema>
    const result = await create('foods', {
      ...body,
      user_id: userId,
      is_custom: true,
      is_verified: false,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  },
)

router.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateFoodSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = idOf(req)
    const existing = await findById<FoodRow>('foods', id)
    if (!existing || !existing.is_custom || existing.user_id !== userId) {
      res.status(404).json({
        error: t('food.notFound', undefined, { defaultValue: 'Food not found.' }),
      })
      return
    }
    const updates = { ...(req.body as Record<string, unknown>), updated_at: new Date() }
    const result = await updateById('foods', id, updates)
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
    const existing = await findById<FoodRow>('foods', id)
    if (!existing || !existing.is_custom || existing.user_id !== userId) {
      res.status(404).json({
        error: t('food.notFound', undefined, { defaultValue: 'Food not found.' }),
      })
      return
    }
    await deleteMany('foods', [
      { field: 'id', operator: '=', value: id },
      { field: 'user_id', operator: '=', value: userId },
    ])
    res.status(204).end()
  },
)

export default router
