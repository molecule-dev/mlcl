import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import { decorateGoal, decorateGoalsForUser, decorateTransactionsForUser } from '../lib/decorate.js'

const router = Router()

const createGoalSchema = z
  .object({
    name: z.string().min(1),
    category_id: z.string().nullable().optional(),
    // Accept cents OR decimal dollars; UI sends cents, scripts may send dollars.
    target_amount: z.number().positive().optional(),
    target_cents: z.number().int().positive().optional(),
    saved_amount: z.number().optional(),
    saved_cents: z.number().int().optional(),
    monthly_contribution: z.number().optional(),
    monthly_contribution_cents: z.number().int().optional(),
    target_date: z.string().nullable().optional(),
    icon: z.string().optional(),
    color: z.string().optional(),
  })
  .refine((b) => typeof b.target_amount === 'number' || typeof b.target_cents === 'number', {
    message: 'target_amount or target_cents required',
  })

const updateGoalSchema = z.object({
  name: z.string().min(1).optional(),
  category_id: z.string().nullable().optional(),
  target_amount: z.number().positive().optional(),
  target_cents: z.number().int().positive().optional(),
  saved_amount: z.number().optional(),
  saved_cents: z.number().int().optional(),
  monthly_contribution: z.number().optional(),
  monthly_contribution_cents: z.number().int().optional(),
  target_date: z.string().nullable().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  status: z.enum(['active', 'completed', 'cancelled']).optional(),
})

const contributionSchema = z
  .object({
    amount_cents: z.number().int().positive().optional(),
    amount: z.number().positive().optional(),
    source: z.string().optional(),
  })
  .refine((b) => typeof b.amount === 'number' || typeof b.amount_cents === 'number', {
    message: 'amount or amount_cents required',
  })

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  const goals = await findMany('goals', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'target_date', direction: 'asc' }],
  })
  const decorated = await decorateGoalsForUser(goals, userId)
  res.json(decorated)
})

router.get('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  const id = getParamId(req)
  const goal = await findById('goals', id)
  if (!goal || goal.user_id !== userId) {
    return res.status(404).json({ error: t('goals.notFound') })
  }
  res.json(decorateGoal(goal))
})

/** A goal's "contributions" are every transaction whose category equals the
 * goal's linked category and whose amount is positive (income/transfer-in).
 * If the goal has no category, contributions == empty. */
router.get('/:id/contributions', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  const id = getParamId(req)
  const goal = await findById('goals', id)
  if (!goal || goal.user_id !== userId) {
    return res.status(404).json({ error: t('goals.notFound') })
  }
  const categoryId = goal.category_id as string | null
  if (!categoryId) {
    return res.json([])
  }
  const txs = await findMany('budget_transactions', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'category_id', operator: '=', value: categoryId },
      { field: 'amount', operator: '>', value: 0 },
    ],
    orderBy: [{ field: 'date', direction: 'desc' }],
  })
  const decorated = await decorateTransactionsForUser(txs, userId)
  res.json(
    decorated.map((tx) => ({
      id: tx.id,
      contributed_at: tx.posted_at,
      amount_cents: tx.amount_cents,
      source: tx.payee || tx.account_name || 'Manual',
    })),
  )
})

/** Manually add to a goal's saved amount. Records the contribution in the
 * goals table directly (no separate ledger needed for hand-tracked
 * progress); auto-completes when target reached. */
router.post(
  '/:id/contributions',
  validateBody(contributionSchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const id = getParamId(req)
    const goal = await findById('goals', id)
    if (!goal || goal.user_id !== userId) {
      return res.status(404).json({ error: t('goals.notFound') })
    }
    const { amount_cents, amount } = req.body
    const dollars = typeof amount_cents === 'number' ? amount_cents / 100 : (amount as number)
    const newSaved = Number(goal.saved_amount ?? 0) + dollars
    const target = Number(goal.target_amount ?? 0)
    const status = newSaved >= target ? 'completed' : ((goal.status as string) ?? 'active')
    const result = await updateById('goals', id, { saved_amount: newSaved, status })
    res.json(decorateGoal(result.data))
  },
)

router.post('/', validateBody(createGoalSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  const {
    name,
    category_id,
    target_amount,
    target_cents,
    saved_amount,
    saved_cents,
    monthly_contribution,
    monthly_contribution_cents,
    target_date,
    icon,
    color,
  } = req.body
  const targetD = typeof target_cents === 'number' ? target_cents / 100 : (target_amount as number)
  const savedD =
    typeof saved_cents === 'number'
      ? saved_cents / 100
      : typeof saved_amount === 'number'
        ? saved_amount
        : 0
  const monthlyD =
    typeof monthly_contribution_cents === 'number'
      ? monthly_contribution_cents / 100
      : typeof monthly_contribution === 'number'
        ? monthly_contribution
        : 0
  const result = await create('goals', {
    user_id: userId,
    name,
    category_id: category_id ?? null,
    target_amount: targetD,
    saved_amount: savedD,
    monthly_contribution: monthlyD,
    target_date: target_date ? new Date(target_date) : null,
    icon: icon ?? null,
    color: color ?? null,
    status: 'active',
    created_at: new Date(),
  })
  res.status(201).json(decorateGoal(result.data))
})

router.put('/:id', validateBody(updateGoalSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  const id = getParamId(req)
  const existing = await findById('goals', id)
  if (!existing || existing.user_id !== userId) {
    return res.status(404).json({ error: t('goals.notFound') })
  }

  const updates: Record<string, unknown> = {}
  const body = req.body as Record<string, unknown>
  for (const f of ['name', 'category_id', 'icon', 'color', 'status'] as const) {
    if (body[f] !== undefined) updates[f] = body[f]
  }
  if (typeof body.target_cents === 'number')
    updates.target_amount = (body.target_cents as number) / 100
  else if (body.target_amount !== undefined) updates.target_amount = body.target_amount
  if (typeof body.saved_cents === 'number')
    updates.saved_amount = (body.saved_cents as number) / 100
  else if (body.saved_amount !== undefined) updates.saved_amount = body.saved_amount
  if (typeof body.monthly_contribution_cents === 'number')
    updates.monthly_contribution = (body.monthly_contribution_cents as number) / 100
  else if (body.monthly_contribution !== undefined)
    updates.monthly_contribution = body.monthly_contribution
  if (body.target_date !== undefined) {
    updates.target_date = body.target_date ? new Date(body.target_date as string) : null
  }

  const result = await updateById('goals', id, updates)
  res.json(decorateGoal(result.data))
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  const id = getParamId(req)
  const existing = await findById('goals', id)
  if (!existing || existing.user_id !== userId) {
    return res.status(404).json({ error: t('goals.notFound') })
  }
  await deleteById('goals', id)
  res.status(204).end()
})

export default router
