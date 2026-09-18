/**
 * Nutrition goals + BMR/TDEE calculator handlers.
 *
 * - Goals are owner-scoped by `user_id`.
 * - Setting a new active goal flips previous active goals to inactive
 *   (preserves a per-user history).
 * - Inputs validated via @molecule/api-middleware-validation (Zod).
 *
 * @module
 */

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { count, create, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

import type { CalorieCounterLimits } from '../tiers.js'

const router = Router()

const enforceMaxGoals = enforceLimit<CalorieCounterLimits>({
  limitType: 'maxGoals',
  getLimit: (limits) => limits.maxGoals,
  getCurrent: async (userId) =>
    count('nutrition_goals', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

const goalSchema = z.object({
  calories: z.number().min(0),
  protein: z.number().min(0),
  carbs: z.number().min(0),
  fat: z.number().min(0),
  fiber: z.number().min(0).optional(),
  sodium: z.number().min(0).optional(),
  sugar: z.number().min(0).optional(),
})

const calculateQuerySchema = z.object({
  weight_kg: z.coerce.number().min(20).max(500),
  height_cm: z.coerce.number().min(50).max(300),
  age: z.coerce.number().int().min(10).max(120),
  sex: z.enum(['male', 'female']),
  activity_level: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']),
  goal_type: z.enum(['lose', 'maintain', 'gain']),
})

interface GoalRow {
  id: string
  user_id: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  sodium: number
  sugar: number
  is_active: boolean
}

router.get('/', async (_req: Request, res: Response): Promise<void> => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  const where: WhereCondition[] = [
    { field: 'user_id', operator: '=', value: userId },
    { field: 'is_active', operator: '=', value: true },
  ]
  const orderBy: OrderBy[] = [{ field: 'created_at', direction: 'desc' }]
  const goals = await findMany<GoalRow>('nutrition_goals', { where, orderBy, limit: 1 })
  if (goals.length === 0) {
    res.json({
      calories: 2000,
      protein: 150,
      carbs: 250,
      fat: 65,
      fiber: 30,
      sodium: 2300,
      sugar: 50,
      is_default: true,
    })
    return
  }
  res.json(goals[0])
})

router.post(
  '/',
  enforceMaxGoals,
  validateBody(goalSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const body = req.body as z.infer<typeof goalSchema>

    // Deactivate any existing active goals for this user.
    const active = await findMany<GoalRow>('nutrition_goals', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'is_active', operator: '=', value: true },
      ],
    })
    for (const g of active) {
      await updateById('nutrition_goals', g.id, { is_active: false, updated_at: new Date() })
    }

    const result = await create('nutrition_goals', {
      user_id: userId,
      calories: body.calories,
      protein: body.protein,
      carbs: body.carbs,
      fat: body.fat,
      fiber: body.fiber ?? 30,
      sodium: body.sodium ?? 2300,
      sugar: body.sugar ?? 50,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  },
)

router.get(
  '/calculate',
  validateQuery(calculateQuerySchema),
  async (req: Request, res: Response): Promise<void> => {
    const {
      weight_kg: weightKg,
      height_cm: heightCm,
      age,
      sex,
      activity_level: activityLevel,
      goal_type: goalType,
    } = req.query as unknown as z.infer<typeof calculateQuerySchema>

    // Mifflin-St Jeor BMR.
    const bmr =
      sex === 'male'
        ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
        : 10 * weightKg + 6.25 * heightCm - 5 * age - 161

    const activityMultipliers: Record<string, number> = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    }
    const tdee = bmr * (activityMultipliers[activityLevel] ?? 1.55)

    const goalAdjustments: Record<string, number> = {
      lose: -500,
      maintain: 0,
      gain: 500,
    }
    const targetCalories = Math.round(tdee + (goalAdjustments[goalType] ?? 0))

    res.json({
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      target_calories: targetCalories,
      suggested_macros: {
        protein: Math.round(weightKg * 2.2 * 0.8),
        carbs: Math.round((targetCalories * 0.45) / 4),
        fat: Math.round((targetCalories * 0.25) / 9),
      },
    })
  },
)

export default router
