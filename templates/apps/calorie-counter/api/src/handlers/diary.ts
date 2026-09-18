/**
 * Diary entry CRUD handlers.
 *
 * - Every read/write scopes by `user_id` (ownership) — no IDOR.
 * - Inputs validated via @molecule/api-middleware-validation (Zod).
 * - Tier-based limit enforcement via @molecule/api-entitlements.
 * - DataStore (no raw SQL) via @molecule/api-database.
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

const enforceMaxDiary = enforceLimit<CalorieCounterLimits>({
  limitType: 'maxDiary',
  getLimit: (limits) => limits.maxDiary,
  getCurrent: async (userId) =>
    count('diary_entries', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

const mealTypeEnum = z.enum(['breakfast', 'lunch', 'dinner', 'snack'])

const createSchema = z.object({
  date: z.string().min(1),
  meal_type: mealTypeEnum,
  food_id: z.string().nullable().optional(),
  food_name: z.string().min(1).max(200),
  servings: z.number().min(0).default(1),
  serving_unit: z.string().max(40).default('serving'),
  calories: z.number().min(0).default(0),
  protein: z.number().min(0).default(0),
  carbs: z.number().min(0).default(0),
  fat: z.number().min(0).default(0),
  fiber: z.number().min(0).optional(),
  sodium: z.number().min(0).optional(),
  sugar: z.number().min(0).optional(),
})

const updateSchema = createSchema.partial()

const quickAddSchema = z.object({
  date: z.string().min(1),
  meal_type: mealTypeEnum,
  calories: z.number().min(0).default(0),
  protein: z.number().min(0).default(0),
  carbs: z.number().min(0).default(0),
  fat: z.number().min(0).default(0),
  food_name: z.string().min(1).max(200).optional(),
})

const listQuerySchema = z.object({
  date: z.string().optional(),
})

const rangeQuerySchema = z.object({
  start_date: z.string().min(1),
  end_date: z.string().min(1),
})

interface DiaryRow {
  id: string
  user_id: string
  date: string
  meal_type: string
  calories: number | string
  protein: number | string
  carbs: number | string
  fat: number | string
  fiber: number | string
  sodium: number | string
  sugar: number | string
}

const num = (v: number | string | null | undefined): number => {
  const n = typeof v === 'string' ? Number.parseFloat(v) : (v ?? 0)
  return Number.isFinite(n) ? Number(n) : 0
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
    const { date } = req.query as z.infer<typeof listQuerySchema>
    if (!date) {
      res.status(400).json({
        error: t('diary.dateRequired', undefined, { defaultValue: 'Date is required.' }),
      })
      return
    }

    const where: WhereCondition[] = [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'date', operator: '=', value: date },
    ]
    const orderBy: OrderBy[] = [
      { field: 'meal_type', direction: 'asc' },
      { field: 'created_at', direction: 'asc' },
    ]
    const entries = await findMany<DiaryRow>('diary_entries', { where, orderBy })

    const totals = entries.reduce(
      (acc, entry) => ({
        calories: acc.calories + num(entry.calories),
        protein: acc.protein + num(entry.protein),
        carbs: acc.carbs + num(entry.carbs),
        fat: acc.fat + num(entry.fat),
        fiber: acc.fiber + num(entry.fiber),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
    )

    res.json({ date, entries, totals })
  },
)

router.get(
  '/range',
  validateQuery(rangeQuerySchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const { start_date: startDate, end_date: endDate } = req.query as unknown as z.infer<
      typeof rangeQuerySchema
    >
    const where: WhereCondition[] = [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'date', operator: '>=', value: startDate },
      { field: 'date', operator: '<=', value: endDate },
    ]
    const orderBy: OrderBy[] = [
      { field: 'date', direction: 'asc' },
      { field: 'meal_type', direction: 'asc' },
    ]
    const entries = await findMany<DiaryRow>('diary_entries', { where, orderBy })
    res.json(entries)
  },
)

router.post(
  '/',
  enforceMaxDiary,
  validateBody(createSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const body = req.body as z.infer<typeof createSchema>
    const result = await create('diary_entries', {
      user_id: userId,
      date: body.date,
      meal_type: body.meal_type,
      food_id: body.food_id ?? null,
      food_name: body.food_name,
      servings: body.servings,
      serving_unit: body.serving_unit,
      calories: body.calories * body.servings,
      protein: body.protein * body.servings,
      carbs: body.carbs * body.servings,
      fat: body.fat * body.servings,
      fiber: (body.fiber ?? 0) * body.servings,
      sodium: (body.sodium ?? 0) * body.servings,
      sugar: (body.sugar ?? 0) * body.servings,
      is_quick_add: false,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  },
)

router.post(
  '/quick-add',
  enforceMaxDiary,
  validateBody(quickAddSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const body = req.body as z.infer<typeof quickAddSchema>
    const result = await create('diary_entries', {
      user_id: userId,
      date: body.date,
      meal_type: body.meal_type,
      food_name: body.food_name ?? t('diary.quickAdd', undefined, { defaultValue: 'Quick Add' }),
      servings: 1,
      serving_unit: 'serving',
      calories: body.calories,
      protein: body.protein,
      carbs: body.carbs,
      fat: body.fat,
      fiber: 0,
      sodium: 0,
      sugar: 0,
      is_quick_add: true,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  },
)

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
    const existing = await findById<DiaryRow>('diary_entries', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('diary.notFound', undefined, { defaultValue: 'Diary entry not found.' }),
      })
      return
    }
    const body = req.body as Record<string, unknown>
    const updates = { ...body, updated_at: new Date() }
    const result = await updateById('diary_entries', id, updates)
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
    const existing = await findById<DiaryRow>('diary_entries', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('diary.notFound', undefined, { defaultValue: 'Diary entry not found.' }),
      })
      return
    }
    await deleteMany('diary_entries', [
      { field: 'id', operator: '=', value: id },
      { field: 'user_id', operator: '=', value: userId },
    ])
    res.status(204).end()
  },
)

export default router
