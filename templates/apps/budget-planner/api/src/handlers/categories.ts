import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import { decorateCategory } from '../lib/decorate.js'
import type { BudgetPlannerLimits } from '../tiers.js'

const router = Router()

const createCategorySchema = z.object({
  name: z.string().min(1),
  group_name: z.string().optional(),
  group: z.string().optional(),
  sort_order: z.number().int().default(0),
})

const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  group_name: z.string().optional(),
  group: z.string().optional(),
  sort_order: z.number().int().optional(),
  archived: z.boolean().optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  const categories = await findMany('budget_categories', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'sort_order', direction: 'asc' }],
  })
  res.json(categories.map(decorateCategory))
})

router.get('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  const id = getParamId(req)
  const category = await findById('budget_categories', id)
  if (!category || category.user_id !== userId) {
    return res.status(404).json({ error: t('categories.notFound') })
  }
  res.json(decorateCategory(category))
})

router.post(
  '/',
  enforceLimit<BudgetPlannerLimits>({
    limitType: 'maxCategories',
    getLimit: (limits) => limits.maxCategories,
    getCurrent: async (userId) =>
      count('budget_categories', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createCategorySchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const { name, group_name, group, sort_order } = req.body
    const result = await create('budget_categories', {
      user_id: userId,
      name,
      group_name:
        group_name ?? group ?? t('categories.defaultGroup', {}, { defaultValue: 'Uncategorized' }),
      sort_order: sort_order ?? 0,
      archived: false,
      created_at: new Date(),
    })
    res.status(201).json(decorateCategory(result.data))
  },
)

router.put('/:id', validateBody(updateCategorySchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  const id = getParamId(req)
  const existing = await findById('budget_categories', id)
  if (!existing || existing.user_id !== userId) {
    return res.status(404).json({ error: t('categories.notFound') })
  }

  const { name, group_name, group, sort_order, archived } = req.body
  const updates: Record<string, unknown> = {}
  if (name !== undefined) updates.name = name
  if (group_name !== undefined) updates.group_name = group_name
  else if (group !== undefined) updates.group_name = group
  if (sort_order !== undefined) updates.sort_order = sort_order
  if (archived !== undefined) updates.archived = archived

  const result = await updateById('budget_categories', id, updates)
  res.json(decorateCategory(result.data))
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  const id = getParamId(req)
  const existing = await findById('budget_categories', id)
  if (!existing || existing.user_id !== userId) {
    return res.status(404).json({ error: t('categories.notFound') })
  }
  await deleteById('budget_categories', id)
  res.status(204).end()
})

export default router
