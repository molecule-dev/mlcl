import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import {
  count,
  create,
  deleteById,
  deleteMany,
  findById,
  findMany,
  updateById,
} from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import { decorateAccount } from '../lib/decorate.js'
import { applyOpeningBalanceRecompute } from '../lib/recompute.js'
import type { BudgetPlannerLimits } from '../tiers.js'

const router = Router()

const createAccountSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['checking', 'savings', 'credit', 'cash', 'loan', 'investment']),
  institution: z.string().optional(),
  mask: z.string().optional(),
  // Accept cents (preferred) or dollars; if balance_cents is provided we use it.
  balance: z.number().optional(),
  balance_cents: z.number().int().optional(),
  on_budget: z.boolean().default(true),
})

const updateAccountSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(['checking', 'savings', 'credit', 'cash', 'loan', 'investment']).optional(),
  institution: z.string().optional(),
  mask: z.string().optional(),
  balance: z.number().optional(),
  balance_cents: z.number().int().optional(),
  on_budget: z.boolean().optional(),
  closed: z.boolean().optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  const accounts = await findMany('budget_accounts', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'name', direction: 'asc' }],
  })

  res.json(accounts.map(decorateAccount))
})

router.get('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  const id = getParamId(req)
  const account = await findById('budget_accounts', id)

  if (!account || account.user_id !== userId) {
    return res.status(404).json({ error: t('accounts.notFound') })
  }
  res.json(decorateAccount(account))
})

router.post(
  '/',
  enforceLimit<BudgetPlannerLimits>({
    limitType: 'maxAccounts',
    getLimit: (limits) => limits.maxAccounts,
    getCurrent: async (userId) =>
      count('budget_accounts', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createAccountSchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const { name, type, institution, mask, balance, balance_cents, on_budget } = req.body
    const balanceDecimal =
      typeof balance_cents === 'number'
        ? balance_cents / 100
        : typeof balance === 'number'
          ? balance
          : 0

    const result = await create('budget_accounts', {
      user_id: userId,
      name,
      type,
      institution: institution ?? null,
      mask: mask ?? null,
      balance: balanceDecimal,
      opening_balance: balanceDecimal,
      on_budget: on_budget ?? true,
      closed: false,
      created_at: new Date(),
    })

    res.status(201).json(decorateAccount(result.data))
  },
)

router.put('/:id', validateBody(updateAccountSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  const id = getParamId(req)
  const existing = await findById('budget_accounts', id)
  if (!existing || existing.user_id !== userId) {
    return res.status(404).json({ error: t('accounts.notFound') })
  }

  const { name, type, institution, mask, balance, balance_cents, on_budget, closed } = req.body
  const updates: Record<string, unknown> = {}
  if (name !== undefined) updates.name = name
  if (type !== undefined) updates.type = type
  if (institution !== undefined) updates.institution = institution
  if (mask !== undefined) updates.mask = mask
  // Updating "balance" via PUT is interpreted as updating the *opening
  // balance* — i.e. the user is correcting their starting figure. We then
  // recompute the running balance to honor the new opening + existing
  // ledger so PUT-then-GET round-trips reflect the right total.
  let newOpening: number | undefined
  if (typeof balance_cents === 'number') newOpening = balance_cents / 100
  else if (balance !== undefined) newOpening = balance
  if (newOpening !== undefined) updates.opening_balance = newOpening
  if (on_budget !== undefined) updates.on_budget = on_budget
  if (closed !== undefined) updates.closed = closed

  const result = await updateById('budget_accounts', id, updates)
  if (newOpening !== undefined) {
    await applyOpeningBalanceRecompute(id, userId)
  }
  res.json(decorateAccount(result.data))
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  const id = getParamId(req)
  const existing = await findById('budget_accounts', id)
  if (!existing || existing.user_id !== userId) {
    return res.status(404).json({ error: t('accounts.notFound') })
  }
  // No FK cascades on budget_transactions.account_id, so we have to clean up
  // dependent rows here. Without this, deleted accounts leave orphan
  // transactions that the ledger and reports still pick up.
  await deleteMany('budget_transactions', [
    { field: 'account_id', operator: '=', value: id },
    { field: 'user_id', operator: '=', value: userId },
  ])
  await deleteById('budget_accounts', id)
  res.status(204).end()
})

export default router
