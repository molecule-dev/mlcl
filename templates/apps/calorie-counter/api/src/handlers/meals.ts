/**
 * Saved meals (recipes) CRUD handlers.
 *
 * - Owner-scoped by `user_id` on the parent meal; child items inherit
 *   ownership via the meal_id FK.
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
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'

import type { CalorieCounterLimits } from '../tiers.js'

const router = Router()

const idOf = (req: Request): string => String(req.params.id)

const enforceMaxMeals = enforceLimit<CalorieCounterLimits>({
  limitType: 'maxMeals',
  getLimit: (limits) => limits.maxMeals,
  getCurrent: async (userId) =>
    count('saved_meals', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

const itemSchema = z.object({
  food_id: z.string().nullable().optional(),
  servings: z.number().min(0),
  serving_unit: z.string().max(40).default('serving'),
  calories: z.number().min(0).default(0),
  protein: z.number().min(0).default(0),
  carbs: z.number().min(0).default(0),
  fat: z.number().min(0).default(0),
})

const createMealSchema = z.object({
  name: z.string().min(1).max(200),
  items: z.array(itemSchema).min(1).max(50),
})

const updateMealSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  total_calories: z.number().min(0).optional(),
  total_protein: z.number().min(0).optional(),
  total_carbs: z.number().min(0).optional(),
  total_fat: z.number().min(0).optional(),
})

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
})

interface MealRow {
  id: string
  user_id: string
  name: string
  total_calories: number
  total_protein: number
  total_carbs: number
  total_fat: number
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
    const { page, limit } = req.query as unknown as z.infer<typeof listQuerySchema>
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const orderBy: OrderBy[] = [{ field: 'name', direction: 'asc' }]
    const meals = await findMany<MealRow>('saved_meals', {
      where,
      orderBy,
      limit,
      offset: (page - 1) * limit,
    })
    res.json(meals)
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
    const id = idOf(req)
    let meal: MealRow | null = null
    try {
      meal = await findById<MealRow>('saved_meals', id)
    } catch (_error) {
      // Malformed ids (e.g. non-UUID values) should surface as not-found
      // rather than 5xx so callers can render a friendly empty state.
    }
    if (!meal || meal.user_id !== userId) {
      res.status(404).json({
        error: t('meal.notFound', undefined, { defaultValue: 'Saved meal not found.' }),
      })
      return
    }
    let items: Record<string, unknown>[] = []
    try {
      items = await findMany<Record<string, unknown>>('saved_meal_items', {
        where: [{ field: 'meal_id', operator: '=', value: id }],
        orderBy: [{ field: 'sort_order', direction: 'asc' }],
      })
    } catch (_error) {
      // Items fallback to empty array; meal still returns successfully without items
    }
    res.json({ ...meal, items })
  },
)

router.post(
  '/',
  enforceMaxMeals,
  validateBody(createMealSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const body = req.body as z.infer<typeof createMealSchema>
    const totalCalories = body.items.reduce((sum, i) => sum + i.calories * i.servings, 0)
    const totalProtein = body.items.reduce((sum, i) => sum + i.protein * i.servings, 0)
    const totalCarbs = body.items.reduce((sum, i) => sum + i.carbs * i.servings, 0)
    const totalFat = body.items.reduce((sum, i) => sum + i.fat * i.servings, 0)

    const result = await create<MealRow>('saved_meals', {
      user_id: userId,
      name: body.name,
      total_calories: totalCalories,
      total_protein: totalProtein,
      total_carbs: totalCarbs,
      total_fat: totalFat,
      created_at: new Date(),
      updated_at: new Date(),
    })

    if (!result.data) {
      res.status(500).json({
        error: t('meal.createFailed', undefined, { defaultValue: 'Failed to save meal.' }),
      })
      return
    }
    const mealId = result.data.id
    for (let i = 0; i < body.items.length; i++) {
      const item = body.items[i]
      await create('saved_meal_items', {
        meal_id: mealId,
        food_id: item.food_id ?? null,
        servings: item.servings,
        serving_unit: item.serving_unit,
        sort_order: i,
        created_at: new Date(),
      })
    }

    res.status(201).json(result.data)
  },
)

router.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateMealSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = idOf(req)
    const existing = await findById<MealRow>('saved_meals', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('meal.notFound', undefined, { defaultValue: 'Saved meal not found.' }),
      })
      return
    }
    const updates = { ...(req.body as Record<string, unknown>), updated_at: new Date() }
    const result = await updateById('saved_meals', id, updates)
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
    const existing = await findById<MealRow>('saved_meals', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('meal.notFound', undefined, { defaultValue: 'Saved meal not found.' }),
      })
      return
    }
    await deleteMany('saved_meal_items', [{ field: 'meal_id', operator: '=', value: id }])
    await deleteMany('saved_meals', [
      { field: 'id', operator: '=', value: id },
      { field: 'user_id', operator: '=', value: userId },
    ])
    res.status(204).end()
  },
)

export default router
