/**
 * Recipe CRUD handlers.
 *
 * - Seeded catalog recipes (user_id NULL) are readable by any authenticated
 *   user; user recipes are owner-scoped by `user_id`.
 * - Writes (PUT/DELETE) only ever apply to recipes the caller owns.
 * - Create/update accept nested `ingredients` and `steps` arrays; children
 *   are replaced wholesale on update (position = array order).
 * - Inputs validated via @molecule/api-middleware-validation (Zod).
 * - Tier-based limit enforcement via @molecule/api-entitlements.
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
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'

import type { MealPlannerLimits } from '../tiers.js'

const router = Router()

const idOf = (req: Request): string => String(req.params.id)

const enforceMaxRecipes = enforceLimit<MealPlannerLimits>({
  limitType: 'maxRecipes',
  getLimit: (limits) => limits.maxRecipes,
  getCurrent: async (userId) =>
    count('recipes', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

const ingredientSchema = z.object({
  item_name: z.string().min(1).max(200),
  quantity: z.number().min(0).default(1),
  unit: z.string().max(40).default(''),
})

const stepSchema = z.object({
  text: z.string().min(1).max(2000),
})

const createRecipeSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).default(''),
  servings: z.number().int().min(1).max(50).default(2),
  prep_minutes: z
    .number()
    .int()
    .min(0)
    .max(24 * 60)
    .default(0),
  cook_minutes: z
    .number()
    .int()
    .min(0)
    .max(24 * 60)
    .default(0),
  tags: z.array(z.string().min(1).max(40)).max(12).default([]),
  image_emoji: z.string().min(1).max(8).default('🍲'),
  ingredients: z.array(ingredientSchema).min(1).max(100),
  steps: z.array(stepSchema).max(50).default([]),
})

const updateRecipeSchema = createRecipeSchema.partial()

const listQuerySchema = z.object({
  q: z.string().optional(),
  tag: z.string().optional(),
  max_total_minutes: z.coerce
    .number()
    .int()
    .min(1)
    .max(24 * 60)
    .optional(),
  mine_only: z.union([z.literal('true'), z.literal('false')]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  sort_by: z.enum(['title', 'created_at', 'total_time']).default('title'),
  sort_order: z.enum(['asc', 'desc']).default('asc'),
})

interface RecipeRow {
  id: string
  user_id: string | null
  title: string
  prep_minutes: number
  cook_minutes: number
  tags: unknown
  [k: string]: unknown
}

/** Parse the jsonb `tags` column into a string array (never throws). */
function parseTags(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string')
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value)
      return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
    } catch (_error) {
      return []
    }
  }
  return []
}

async function loadChildren(
  recipeId: string,
): Promise<{ ingredients: Record<string, unknown>[]; steps: Record<string, unknown>[] }> {
  let ingredients: Record<string, unknown>[] = []
  let steps: Record<string, unknown>[] = []
  try {
    ingredients = await findMany<Record<string, unknown>>('recipe_ingredients', {
      where: [{ field: 'recipe_id', operator: '=', value: recipeId }],
      orderBy: [{ field: 'position', direction: 'asc' }],
    })
  } catch (_error) {
    // Ingredients fall back to empty; recipe still returns.
  }
  try {
    steps = await findMany<Record<string, unknown>>('recipe_steps', {
      where: [{ field: 'recipe_id', operator: '=', value: recipeId }],
      orderBy: [{ field: 'position', direction: 'asc' }],
    })
  } catch (_error) {
    // Steps fall back to empty; recipe still returns.
  }
  return { ingredients, steps }
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
      tag,
      max_total_minutes: maxTotalMinutes,
      mine_only: mineOnly,
      page,
      limit,
      sort_by: sortBy,
      sort_order: sortOrder,
    } = req.query as unknown as z.infer<typeof listQuerySchema>

    // Seeded rows are shared; user rows are scoped to the caller. Without a
    // server-side OR across two scopes, run two queries and merge (same
    // shape as the donor's public/custom food split). Tag containment and
    // total-time filters run post-fetch: the store's WhereCondition has no
    // jsonb operator and computed-field ordering is not portable across
    // database bonds, so both stay in JS.
    const sharedWhere: WhereCondition[] = [{ field: 'user_id', operator: 'is_null' }]
    const mineWhere: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (q) {
      // store auto-wraps with `%…%`; pass the literal substring, not a pattern.
      sharedWhere.push({ field: 'title', operator: 'ilike', value: q })
      mineWhere.push({ field: 'title', operator: 'ilike', value: q })
    }

    const [shared, mine] =
      mineOnly === 'true'
        ? [[], await findMany<RecipeRow>('recipes', { where: mineWhere, limit: 500 })]
        : await Promise.all([
            findMany<RecipeRow>('recipes', { where: sharedWhere, limit: 500 }),
            findMany<RecipeRow>('recipes', { where: mineWhere, limit: 500 }),
          ])

    let combined: Array<RecipeRow & { tags: string[] }> = [...mine, ...shared].map((r) => ({
      ...r,
      tags: parseTags(r.tags),
    }))
    if (tag) {
      combined = combined.filter((r) => r.tags.includes(tag))
    }
    if (maxTotalMinutes !== undefined) {
      combined = combined.filter(
        (r) => Number(r.prep_minutes ?? 0) + Number(r.cook_minutes ?? 0) <= maxTotalMinutes,
      )
    }
    const dir = sortOrder === 'desc' ? -1 : 1
    combined.sort((a, b) => {
      if (sortBy === 'total_time') {
        return (
          dir *
          (Number(a.prep_minutes ?? 0) +
            Number(a.cook_minutes ?? 0) -
            (Number(b.prep_minutes ?? 0) + Number(b.cook_minutes ?? 0)))
        )
      }
      if (sortBy === 'created_at') {
        return dir * String(a.created_at ?? '').localeCompare(String(b.created_at ?? ''))
      }
      return dir * String(a.title ?? '').localeCompare(String(b.title ?? ''))
    })
    res.json(combined.slice((page - 1) * limit, (page - 1) * limit + limit))
  },
)

router.get('/tags', async (_req: Request, res: Response): Promise<void> => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  const rows = await findMany<{ tags: unknown }>('recipes', {
    where: [],
    orderBy: [{ field: 'title', direction: 'asc' }],
    limit: 1000,
  })
  const seen = new Set<string>()
  const tags: string[] = []
  for (const row of rows) {
    for (const tag of parseTags(row.tags)) {
      if (!seen.has(tag)) {
        seen.add(tag)
        tags.push(tag)
      }
    }
  }
  res.json(tags.sort())
})

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
    let recipe: RecipeRow | null = null
    try {
      recipe = await findById<RecipeRow>('recipes', idOf(req))
    } catch (_error) {
      // Malformed ids (e.g. non-UUID values) surface as not-found rather
      // than 5xx so callers can render a friendly empty state.
    }
    if (!recipe) {
      res.status(404).json({
        error: t('recipe.notFound', undefined, { defaultValue: 'Recipe not found.' }),
      })
      return
    }
    const { ingredients, steps } = await loadChildren(recipe.id)
    res.json({ ...recipe, tags: parseTags(recipe.tags), ingredients, steps })
  },
)

router.post(
  '/',
  enforceMaxRecipes,
  validateBody(createRecipeSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const body = req.body as z.infer<typeof createRecipeSchema>
    const result = await create<RecipeRow>('recipes', {
      user_id: userId,
      title: body.title,
      description: body.description,
      servings: body.servings,
      prep_minutes: body.prep_minutes,
      cook_minutes: body.cook_minutes,
      tags: JSON.stringify(body.tags),
      image_emoji: body.image_emoji,
      created_at: new Date(),
      updated_at: new Date(),
    })
    if (!result.data) {
      res.status(500).json({
        error: t('recipe.createFailed', undefined, { defaultValue: 'Failed to save recipe.' }),
      })
      return
    }
    await writeChildren(result.data.id, body)
    res.status(201).json(result.data)
  },
)

async function writeChildren(
  recipeId: string,
  body: {
    ingredients: z.infer<typeof createRecipeSchema>['ingredients']
    steps: z.infer<typeof createRecipeSchema>['steps']
  },
): Promise<void> {
  for (let i = 0; i < body.ingredients.length; i++) {
    const ingredient = body.ingredients[i]
    await create('recipe_ingredients', {
      recipe_id: recipeId,
      item_name: ingredient.item_name,
      quantity: ingredient.quantity,
      unit: ingredient.unit,
      position: i,
      created_at: new Date(),
    })
  }
  for (let i = 0; i < body.steps.length; i++) {
    const step = body.steps[i]
    await create('recipe_steps', {
      recipe_id: recipeId,
      position: i,
      text: step.text,
      created_at: new Date(),
    })
  }
}

router.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateRecipeSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = idOf(req)
    const existing = await findById<RecipeRow>('recipes', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('recipe.notFound', undefined, { defaultValue: 'Recipe not found.' }),
      })
      return
    }
    const body = req.body as Partial<z.infer<typeof createRecipeSchema>>
    const updates: Record<string, unknown> = { ...body, updated_at: new Date() }
    if (body.tags !== undefined) updates.tags = JSON.stringify(body.tags)
    delete updates.ingredients
    delete updates.steps
    const result = await updateById('recipes', id, updates)
    if (body.ingredients !== undefined || body.steps !== undefined) {
      // Children are replaced wholesale: the position ordering makes
      // per-row diffs meaningless for a hand-edited form.
      await deleteMany('recipe_ingredients', [{ field: 'recipe_id', operator: '=', value: id }])
      await deleteMany('recipe_steps', [{ field: 'recipe_id', operator: '=', value: id }])
      await writeChildren(id, {
        ingredients: body.ingredients ?? [],
        steps: body.steps ?? [],
      })
    }
    const fresh = (result.data ?? existing) as RecipeRow
    const { ingredients, steps } = await loadChildren(id)
    res.json({ ...fresh, tags: parseTags(fresh.tags), ingredients, steps })
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
    const existing = await findById<RecipeRow>('recipes', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('recipe.notFound', undefined, { defaultValue: 'Recipe not found.' }),
      })
      return
    }
    await deleteMany('meal_plan_entries', [
      { field: 'recipe_id', operator: '=', value: id },
      { field: 'user_id', operator: '=', value: userId },
    ])
    await deleteMany('recipe_ingredients', [{ field: 'recipe_id', operator: '=', value: id }])
    await deleteMany('recipe_steps', [{ field: 'recipe_id', operator: '=', value: id }])
    await deleteMany('recipes', [
      { field: 'id', operator: '=', value: id },
      { field: 'user_id', operator: '=', value: userId },
    ])
    res.status(204).end()
  },
)

export default router
