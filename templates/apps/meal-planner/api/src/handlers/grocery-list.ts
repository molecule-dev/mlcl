/**
 * Grocery list handlers — the auto-generated shopping list for a planned week.
 *
 * The "list" is identified by (user_id, week_start). Rows come from two
 * sources:
 *
 * - `plan`   — aggregated from the week's meal_plan_entries → recipe
 *   ingredients, scaled by planned servings (see ../lib/grocery.ts);
 * - `manual` — hand-added by the user.
 *
 * POST /regenerate rebuilds the plan-sourced rows from the current plan:
 * manual rows and the checked state of items that survive regeneration are
 * preserved. Every returned row carries an `in_pantry` flag when a pantry
 * item of the same (normalized) name exists, so the UI can badge
 * "you already have this".
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import { count, create, deleteMany, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'

import { aggregateGroceryItems, type IngredientLine, normalizeItemName } from '../lib/grocery.js'

const router = Router()

const weekQuerySchema = z.object({
  week_start: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'week_start must be YYYY-MM-DD')
    .optional(),
})

const regenerateSchema = z.object({
  week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

const addItemSchema = z.object({
  week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  name: z.string().min(1).max(200),
  quantity: z.number().min(0).default(1),
  unit: z.string().max(40).default(''),
  category: z.string().max(40).default('other'),
})

const updateItemSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  quantity: z.number().min(0).optional(),
  unit: z.string().max(40).optional(),
  category: z.string().max(40).optional(),
  checked: z.boolean().optional(),
})

interface GroceryRow {
  id: string
  user_id: string
  week_start: string
  name: string
  quantity: number | string
  unit: string
  category: string
  source: string
  checked: boolean
  [k: string]: unknown
}

interface PantryRow {
  id: string
  user_id: string
  name: string
  quantity: number | string
  unit: string
  [k: string]: unknown
}

/** Normalize any date to the Monday of its ISO week, as YYYY-MM-DD. */
function mondayOf(dateIso: string): string {
  const d = new Date(`${dateIso}T00:00:00Z`)
  const dow = (d.getUTCDay() + 6) % 7 // 0=Mon..6=Sun
  d.setUTCDate(d.getUTCDate() - dow)
  return d.toISOString().slice(0, 10)
}

interface DecoratedRow extends GroceryRow {
  in_pantry: boolean
  pantry_quantity: number | null
  pantry_unit: string | null
}

async function decorateWithPantry(userId: string, rows: GroceryRow[]): Promise<DecoratedRow[]> {
  if (rows.length === 0) return []
  const pantry = await findMany<PantryRow>('pantry_items', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    limit: 1000,
  })
  const pantryByName = new Map<string, PantryRow>()
  for (const item of pantry) {
    const key = normalizeItemName(item.name)
    if (!pantryByName.has(key)) pantryByName.set(key, item)
  }
  const num = (v: number | string | null | undefined): number => {
    const n = typeof v === 'string' ? Number.parseFloat(v) : (v ?? 0)
    return Number.isFinite(n) ? Number(n) : 0
  }
  return rows.map((row) => {
    const match = pantryByName.get(normalizeItemName(row.name)) ?? null
    return {
      ...row,
      in_pantry: match !== null,
      pantry_quantity: match ? num(match.quantity) : null,
      pantry_unit: match ? match.unit : null,
    }
  })
}

/**
 * Rebuild the plan-sourced rows for one week from the plan's recipes.
 * Preserves manual rows and the checked flag of surviving plan items.
 * Shared with the demo seed — the seed plants its first list through the
 * exact same aggregation the button uses.
 */
export async function regenerateForWeek(userId: string, week: string): Promise<number> {
  const entries = await findMany<{ recipe_id: string; servings: number | string }>(
    'meal_plan_entries',
    {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'week_start', operator: '=', value: week },
      ],
      limit: 200,
    },
  )
  const lines: IngredientLine[] = []
  for (const entry of entries) {
    let recipe: { servings: number | string } | null = null
    try {
      recipe = await findById<{ servings: number | string }>('recipes', entry.recipe_id)
    } catch (_error) {
      // Recipe deleted out from under a plan entry: skip its lines.
    }
    if (!recipe) continue
    const ingredients = await findMany<{
      item_name: string
      quantity: number | string
      unit: string
    }>('recipe_ingredients', {
      where: [{ field: 'recipe_id', operator: '=', value: entry.recipe_id }],
      orderBy: [{ field: 'position', direction: 'asc' }],
    })
    for (const ingredient of ingredients) {
      lines.push({
        item_name: ingredient.item_name,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        servings: entry.servings,
        recipeServings: recipe.servings,
      })
    }
  }
  const aggregated = aggregateGroceryItems(lines)

  // Remember which names were already checked so regenerating mid-shop
  // doesn't un-check items the cook has already bagged.
  const existing = await findMany<GroceryRow>('grocery_items', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'week_start', operator: '=', value: week },
    ],
    limit: 1000,
  })
  const wasChecked = new Set(
    existing.filter((row) => row.checked).map((row) => normalizeItemName(row.name)),
  )

  await deleteMany('grocery_items', [
    { field: 'user_id', operator: '=', value: userId },
    { field: 'week_start', operator: '=', value: week },
    { field: 'source', operator: '=', value: 'plan' },
  ])
  let createdCount = 0
  for (const item of aggregated) {
    await create('grocery_items', {
      user_id: userId,
      week_start: week,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      category: item.category,
      source: 'plan',
      checked: wasChecked.has(normalizeItemName(item.name)),
      created_at: new Date(),
      updated_at: new Date(),
    })
    createdCount++
  }
  return createdCount
}

router.get(
  '/',
  validateQuery(weekQuerySchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const week = mondayOf(
      (req.query as z.infer<typeof weekQuerySchema>).week_start ??
        new Date().toISOString().slice(0, 10),
    )
    const rows = await findMany<GroceryRow>('grocery_items', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'week_start', operator: '=', value: week },
      ],
      orderBy: [
        { field: 'category', direction: 'asc' },
        { field: 'name', direction: 'asc' },
      ],
    })
    res.json(await decorateWithPantry(userId, rows))
  },
)

router.post(
  '/regenerate',
  validateBody(regenerateSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const week = mondayOf((req.body as z.infer<typeof regenerateSchema>).week_start)
    const createdCount = await regenerateForWeek(userId, week)
    const rows = await findMany<GroceryRow>('grocery_items', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'week_start', operator: '=', value: week },
      ],
      orderBy: [
        { field: 'category', direction: 'asc' },
        { field: 'name', direction: 'asc' },
      ],
    })
    res.status(201).json({ created: createdCount, items: await decorateWithPantry(userId, rows) })
  },
)

router.post(
  '/',
  validateBody(addItemSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const body = req.body as z.infer<typeof addItemSchema>
    const result = await create<GroceryRow>('grocery_items', {
      user_id: userId,
      week_start: mondayOf(body.week_start),
      name: body.name,
      quantity: body.quantity,
      unit: body.unit,
      category: body.category,
      source: 'manual',
      checked: false,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json((await decorateWithPantry(userId, [result.data as GroceryRow]))[0])
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
    const existing = await findById<GroceryRow>('grocery_items', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('grocery.notFound', undefined, { defaultValue: 'Grocery item not found.' }),
      })
      return
    }
    const updates = { ...(req.body as Record<string, unknown>), updated_at: new Date() }
    const result = await updateById('grocery_items', id, updates)
    const fresh = (result.data ?? existing) as GroceryRow
    res.json((await decorateWithPantry(userId, [fresh]))[0])
  },
)

router.delete('/checked', async (_req: Request, res: Response): Promise<void> => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  // "Clear checked" across every week the user has lists for. Fetch then
  // delete by id: deleteMany has no cross-bond boolean-literal guarantee
  // on every store, and the row set is small.
  const rows = await findMany<GroceryRow>('grocery_items', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'checked', operator: '=', value: true },
    ],
    limit: 1000,
  })
  for (const row of rows) {
    await deleteMany('grocery_items', [
      { field: 'id', operator: '=', value: row.id },
      { field: 'user_id', operator: '=', value: userId },
    ])
  }
  res.status(204).end()
})

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
    const existing = await findById<GroceryRow>('grocery_items', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('grocery.notFound', undefined, { defaultValue: 'Grocery item not found.' }),
      })
      return
    }
    await deleteMany('grocery_items', [
      { field: 'id', operator: '=', value: id },
      { field: 'user_id', operator: '=', value: userId },
    ])
    res.status(204).end()
  },
)

// Count endpoint used by the plan page badge ("12 items to shop").
router.get('/count', async (_req: Request, res: Response): Promise<void> => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  const total = await count('grocery_items', [{ field: 'user_id', operator: '=', value: userId }])
  res.json({ total })
})

export default router
