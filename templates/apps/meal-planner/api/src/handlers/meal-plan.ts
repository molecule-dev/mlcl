/**
 * Weekly meal plan handlers.
 *
 * A plan is a set of `meal_plan_entries` rows scoped by (user_id, week_start).
 * week_start is always the Monday of the week (ISO); day is 0=Monday..6=Sunday;
 * meal_slot is breakfast | lunch | dinner.
 *
 * GET /api/meal-plan?week_start=YYYY-MM-DD returns the week's entries with
 * each entry's recipe (title, servings, emoji, times) denormalized in, so the
 * client renders the grid in one round trip.
 *
 * @module
 */

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import { create, deleteMany, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'

import type { MealPlannerLimits } from '../tiers.js'
import { seedDemoForUser } from './_seed.js'

const router = Router()

const enforceMaxPlanWeeks = enforceLimit<MealPlannerLimits>({
  limitType: 'maxPlanWeeks',
  getLimit: (limits) => limits.maxPlanWeeks,
  getCurrent: async (userId) => {
    const rows = await findMany<{ week_start: string }>('meal_plan_entries', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      limit: 1000,
    })
    return new Set(rows.map((r) => String(r.week_start))).size
  },
}) as unknown as RequestHandler

const weekStartSchema = z.object({
  week_start: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'week_start must be YYYY-MM-DD')
    .optional(),
})

const createEntrySchema = z.object({
  week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  day: z.number().int().min(0).max(6),
  meal_slot: z.enum(['breakfast', 'lunch', 'dinner']),
  recipe_id: z.string().uuid(),
  servings: z.number().int().min(1).max(50).default(2),
})

const updateEntrySchema = z.object({
  recipe_id: z.string().uuid().optional(),
  servings: z.number().int().min(1).max(50).optional(),
})

/** Normalize any date to the Monday of its ISO week, as YYYY-MM-DD. */
export function mondayOf(dateIso: string): string {
  const d = new Date(`${dateIso}T00:00:00Z`)
  const dow = (d.getUTCDay() + 6) % 7 // 0=Mon..6=Sun
  d.setUTCDate(d.getUTCDate() - dow)
  return d.toISOString().slice(0, 10)
}

interface EntryRow {
  id: string
  user_id: string
  week_start: string
  day: number
  meal_slot: string
  recipe_id: string
  servings: number
  [k: string]: unknown
}

interface RecipeLite {
  id: string
  title: string
  servings: number
  prep_minutes: number
  cook_minutes: number
  image_emoji: string
  [k: string]: unknown
}

async function decorate(
  entries: EntryRow[],
): Promise<Array<EntryRow & { recipe: RecipeLite | null }>> {
  const recipeIds = [...new Set(entries.map((e) => e.recipe_id))]
  const recipes = new Map<string, RecipeLite>()
  for (const recipeId of recipeIds) {
    try {
      const recipe = await findById<RecipeLite>('recipes', recipeId)
      if (recipe) recipes.set(recipe.id, recipe)
    } catch (_error) {
      // A recipe deleted out from under a plan entry renders as null; the
      // client shows an "unavailable" chip instead of failing the request.
    }
  }
  return entries.map((e) => ({ ...e, recipe: recipes.get(e.recipe_id) ?? null }))
}

router.get(
  '/',
  validateQuery(weekStartSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const week = mondayOf(
      (req.query as z.infer<typeof weekStartSchema>).week_start ??
        new Date().toISOString().slice(0, 10),
    )
    // First visit: plant a starter week (entries + grocery list + pantry)
    // so the plan and list pages render real content. Idempotent per user.
    try {
      await seedDemoForUser(userId, week)
    } catch (error) {
      // Demo seeding is best-effort; an empty plan is still valid. But a
      // repeated silent failure reads as a broken app — log it.
      logger.error('meal_plan.seed', error)
    }
    const entries = await findMany<EntryRow>('meal_plan_entries', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'week_start', operator: '=', value: week },
      ],
      orderBy: [
        { field: 'day', direction: 'asc' },
        { field: 'meal_slot', direction: 'asc' },
      ],
    })
    res.json(await decorate(entries))
  },
)

router.post(
  '/',
  enforceMaxPlanWeeks,
  validateBody(createEntrySchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const body = req.body as z.infer<typeof createEntrySchema>
    // The recipe must be visible to this user (shared catalog or owned).
    let recipe: RecipeLite | null = null
    try {
      recipe = await findById<RecipeLite>('recipes', body.recipe_id)
    } catch (_error) {
      // handled by the null check below
    }
    if (
      !recipe ||
      (recipe.user_id !== undefined && recipe.user_id !== null && recipe.user_id !== userId)
    ) {
      res.status(404).json({
        error: t('recipe.notFound', undefined, { defaultValue: 'Recipe not found.' }),
      })
      return
    }
    const result = await create<EntryRow>('meal_plan_entries', {
      user_id: userId,
      week_start: mondayOf(body.week_start),
      day: body.day,
      meal_slot: body.meal_slot,
      recipe_id: body.recipe_id,
      servings: body.servings,
      created_at: new Date(),
      updated_at: new Date(),
    })
    if (!result.data) {
      res.status(500).json({
        error: t('plan.createFailed', undefined, { defaultValue: 'Failed to add to the plan.' }),
      })
      return
    }
    res.status(201).json((await decorate([result.data]))[0])
  },
)

router.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateEntrySchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = String(req.params.id)
    const existing = await findById<EntryRow>('meal_plan_entries', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('plan.entryNotFound', undefined, { defaultValue: 'Planned meal not found.' }),
      })
      return
    }
    const updates = { ...(req.body as Record<string, unknown>), updated_at: new Date() }
    const result = await updateById('meal_plan_entries', id, updates)
    const fresh = (result.data ?? existing) as EntryRow
    res.json((await decorate([fresh]))[0])
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
    const existing = await findById<EntryRow>('meal_plan_entries', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('plan.entryNotFound', undefined, { defaultValue: 'Planned meal not found.' }),
      })
      return
    }
    await deleteMany('meal_plan_entries', [
      { field: 'id', operator: '=', value: id },
      { field: 'user_id', operator: '=', value: userId },
    ])
    res.status(204).end()
  },
)

export default router
