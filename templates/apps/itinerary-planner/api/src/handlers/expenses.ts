import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import { userCanEditTrip } from './_authz.js'

const router = Router()

const createExpenseSchema = z.object({
  trip_id: z.string().min(1),
  category: z.enum(['food', 'lodging', 'transport', 'activities', 'other']),
  amount_cents: z.number().int().nonnegative(),
  currency: z.string().optional(),
  occurred_at: z.string().optional(),
  vendor: z.string().optional(),
  description: z.string().optional(),
})

// [L2-1] Omit the parent FK from updates: `.partial()` would let an update body reassign
// `trip_id` to another user's trip (the create path checks userOwnsTrip, an update did not),
// attaching this expense to a victim's trip + polluting its budget. Reparenting is not a
// supported operation here, so drop it entirely (mirrors crm/deals.ts's explicit updateSchema).
const updateExpenseSchema = createExpenseSchema.omit({ trip_id: true }).partial()

async function recomputeTripBudget(tripId: string): Promise<void> {
  const expenses = await findMany<Record<string, unknown>>('expenses', {
    where: [{ field: 'trip_id', operator: '=', value: tripId }],
  })
  const total = expenses.reduce(
    (sum: number, row) => sum + Number((row.amount_cents as number | string | null) ?? 0),
    0,
  )
  await updateById('trips', tripId, { budget_used_cents: total, updated_at: new Date() })
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
    }
    const where: Array<{ field: string; operator: '='; value: unknown }> = [
      { field: 'user_id', operator: '=', value: userId },
    ]
    if (req.query.trip_id) {
      where.push({ field: 'trip_id', operator: '=', value: String(req.query.trip_id) })
    }
    const rows = await findMany('expenses', {
      where,
      orderBy: [{ field: 'occurred_at', direction: 'desc' }],
    })
    res.json(rows)
  } catch (error) {
    logger.error('expenses.ts', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
    }
    const id = getParamId(req)
    const row = await findById<Record<string, unknown>>('expenses', id)
    if (!row || row.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('expense.notFound', undefined, { defaultValue: 'Expense not found.' }) })
    }
    res.json(row)
  } catch (error) {
    logger.error('expenses.ts', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.post('/', validateBody(createExpenseSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
    }
    const data = req.body as z.infer<typeof createExpenseSchema>
    if (!(await userCanEditTrip(data.trip_id, userId))) {
      return res
        .status(404)
        .json({ error: t('trip.notFound', undefined, { defaultValue: 'Trip not found.' }) })
    }
    const result = await create('expenses', {
      user_id: userId,
      trip_id: data.trip_id,
      category: data.category,
      amount_cents: data.amount_cents,
      currency: data.currency ?? 'USD',
      occurred_at: data.occurred_at ?? new Date(),
      vendor: data.vendor ?? null,
      description: data.description ?? null,
      created_at: new Date(),
    })
    await recomputeTripBudget(data.trip_id)
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('expenses.ts', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.put('/:id', validateBody(updateExpenseSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('expenses', id)
    if (!existing || !(await userCanEditTrip(String(existing.trip_id), userId))) {
      return res
        .status(404)
        .json({ error: t('expense.notFound', undefined, { defaultValue: 'Expense not found.' }) })
    }
    const result = await updateById('expenses', id, { ...req.body, updated_at: new Date() })
    if (existing.trip_id) await recomputeTripBudget(existing.trip_id as string)
    res.json(result.data)
  } catch (error) {
    logger.error('expenses.ts', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('expenses', id)
    if (!existing || !(await userCanEditTrip(String(existing.trip_id), userId))) {
      return res
        .status(404)
        .json({ error: t('expense.notFound', undefined, { defaultValue: 'Expense not found.' }) })
    }
    await deleteById('expenses', id)
    if (existing.trip_id) await recomputeTripBudget(existing.trip_id as string)
    res.status(204).end()
  } catch (error) {
    logger.error('expenses.ts', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

export default router
