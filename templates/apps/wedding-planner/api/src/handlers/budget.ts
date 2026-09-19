/**
 * Budget tracking — line items per category with estimated vs actual.
 *
 * GET    /       the caller's items + totals + per-category rollups
 * POST   /       add a line item
 * PUT    /:id    edit a line item
 * DELETE /:id    remove a line item
 *
 * @module
 */
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams } from '@molecule/api-middleware-validation'

import { rollupBudget } from '../lib/wedding.js'
import { findWeddingForUser } from './_seed.js'

const router = Router()

export const BUDGET_CATEGORIES = [
  'venue',
  'catering',
  'photography',
  'attire',
  'flowers',
  'music',
  'decor',
  'stationery',
  'gifts',
  'other',
] as const

const createItemSchema = z.object({
  category: z.enum(BUDGET_CATEGORIES).optional(),
  label: z.string().min(1).max(200),
  estimated_cents: z.number().int().min(0).optional(),
  actual_cents: z.number().int().min(0).optional().nullable(),
  vendor: z.string().max(200).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
})

const updateItemSchema = createItemSchema.partial()

interface BudgetRow {
  id: string
  category: string
  label: string
  estimated_cents: number
  actual_cents: number | null
  vendor: string | null
}

async function ownedItems(userId: string): Promise<BudgetRow[]> {
  const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  return findMany<BudgetRow>('budget_items', {
    where,
    orderBy: [
      { field: 'category', direction: 'asc' },
      { field: 'label', direction: 'asc' },
    ],
    limit: 500,
  })
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const items = await ownedItems(userId)
    res.json({ items, ...rollupBudget(items) })
  } catch (err) {
    logger.error('budget GET failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', validateBody(createItemSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const wedding = await findWeddingForUser(userId)
    if (!wedding) {
      return res
        .status(404)
        .json({ error: t('wedding.notFound', {}, { defaultValue: 'Wedding not found' }) })
    }
    const result = await create('budget_items', {
      ...req.body,
      user_id: userId,
      wedding_id: String(wedding.id),
      category: req.body.category ?? 'other',
      estimated_cents: req.body.estimated_cents ?? 0,
      actual_cents: req.body.actual_cents ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    res.status(201).json(result.data)
  } catch (err) {
    logger.error('budget POST failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateItemSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      }
      const id = getParamId(req)
      const item = await findById<Record<string, unknown>>('budget_items', id)
      if (!item || String(item.user_id) !== userId) {
        return res
          .status(404)
          .json({ error: t('budget.notFound', {}, { defaultValue: 'Budget item not found' }) })
      }
      const result = await updateById('budget_items', id, {
        ...req.body,
        updated_at: new Date().toISOString(),
      })
      res.json(result.data)
    } catch (err) {
      logger.error('budget PUT :id failed', err)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.delete('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = getParamId(req)
    const item = await findById<Record<string, unknown>>('budget_items', id)
    if (!item || String(item.user_id) !== userId) {
      return res
        .status(404)
        .json({ error: t('budget.notFound', {}, { defaultValue: 'Budget item not found' }) })
    }
    await deleteById('budget_items', id)
    res.status(204).end()
  } catch (err) {
    logger.error('budget DELETE :id failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
