import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import { type DecoratedTransaction, decorateTransactionsForUser } from '../lib/decorate.js'
import { applyOpeningBalanceRecompute, signedAmount } from '../lib/recompute.js'
import type { BudgetPlannerLimits } from '../tiers.js'

const router = Router()

const createTransactionSchema = z
  .object({
    account_id: z.string().min(1),
    category_id: z.string().nullable().optional(),
    payee: z.string().optional(),
    // Accept cents (preferred) or decimal dollars; the frontend's typed
    // amount-cents form sends `amount_cents`, the legacy import-flow sends
    // `amount` as a decimal.
    amount: z.number().optional(),
    amount_cents: z.number().int().optional(),
    date: z.string().optional(),
    memo: z.string().optional(),
    type: z.enum(['inflow', 'outflow', 'transfer']).optional(),
  })
  .refine((b) => typeof b.amount === 'number' || typeof b.amount_cents === 'number', {
    message: 'amount or amount_cents required',
  })

const updateTransactionSchema = z.object({
  category_id: z.string().nullable().optional(),
  payee: z.string().optional(),
  amount: z.number().optional(),
  amount_cents: z.number().int().optional(),
  date: z.string().optional(),
  memo: z.string().optional(),
  cleared: z.boolean().optional(),
  type: z.enum(['inflow', 'outflow', 'transfer']).optional(),
})

router.get('/', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  const { category_id, account_id, start_date, end_date, limit, offset } = req.query
  const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  if (category_id) where.push({ field: 'category_id', operator: '=', value: category_id })
  if (account_id) where.push({ field: 'account_id', operator: '=', value: account_id })
  if (start_date)
    where.push({ field: 'date', operator: '>=', value: new Date(start_date as string) })
  if (end_date) where.push({ field: 'date', operator: '<=', value: new Date(end_date as string) })

  const transactions = await findMany('budget_transactions', {
    where,
    orderBy: [{ field: 'date', direction: 'desc' }],
    limit: Number(limit) || 50,
    offset: Number(offset) || 0,
  })
  const decorated = await decorateTransactionsForUser(transactions, userId)
  res.json(decorated)
})

router.get('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  const id = getParamId(req)
  const tx = await findById('budget_transactions', id)
  if (!tx || tx.user_id !== userId) {
    return res.status(404).json({ error: t('transactions.notFound') })
  }
  const [decorated] = await decorateTransactionsForUser([tx], userId)
  res.json(decorated)
})

router.post(
  '/',
  enforceLimit<BudgetPlannerLimits>({
    limitType: 'maxTransactions',
    getLimit: (limits) => limits.maxTransactions,
    getCurrent: async (userId) =>
      count('budget_transactions', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createTransactionSchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const { account_id, category_id, payee, amount, amount_cents, date, memo, type } = req.body
    const rawAmount = typeof amount_cents === 'number' ? amount_cents / 100 : (amount as number)
    const resolvedType = type ?? (rawAmount < 0 ? 'outflow' : 'inflow')
    const signed = signedAmount(rawAmount, resolvedType)

    const result = await create('budget_transactions', {
      user_id: userId,
      account_id,
      category_id: category_id ?? null,
      payee: payee ?? null,
      amount: signed,
      type: resolvedType,
      date: date ? new Date(date) : new Date(),
      memo: memo ?? null,
      cleared: false,
      created_at: new Date(),
    })

    await applyOpeningBalanceRecompute(account_id, userId)

    const [decorated] = await decorateTransactionsForUser([result.data ?? {}], userId)
    res.status(201).json(decorated)
  },
)

router.put('/:id', validateBody(updateTransactionSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  const id = getParamId(req)
  const existing = await findById('budget_transactions', id)
  if (!existing || existing.user_id !== userId) {
    return res.status(404).json({ error: t('transactions.notFound') })
  }
  const { category_id, payee, amount, amount_cents, date, memo, cleared, type } = req.body
  const updates: Record<string, unknown> = {}
  if (category_id !== undefined) updates.category_id = category_id
  if (payee !== undefined) updates.payee = payee
  // Either amount field reaches us as the user's intended magnitude/sign;
  // we re-derive the canonical signed value using the (possibly updated)
  // type so the ledger stays consistent with the recompute helper.
  const wantsAmountChange = typeof amount_cents === 'number' || amount !== undefined
  const wantsTypeChange = type !== undefined
  if (wantsAmountChange || wantsTypeChange) {
    const existingType =
      (existing.type as 'inflow' | 'outflow' | 'transfer' | undefined) ?? undefined
    const nextType = (type ?? existingType ?? 'outflow') as 'inflow' | 'outflow' | 'transfer'
    const baseAmount =
      typeof amount_cents === 'number'
        ? amount_cents / 100
        : amount !== undefined
          ? (amount as number)
          : Number(existing.amount ?? 0)
    updates.amount = signedAmount(baseAmount, nextType)
    updates.type = nextType
  }
  if (date !== undefined) updates.date = new Date(date)
  if (memo !== undefined) updates.memo = memo
  if (cleared !== undefined) updates.cleared = cleared

  const result = await updateById('budget_transactions', id, updates)
  await applyOpeningBalanceRecompute(existing.account_id as string, userId)
  const [decorated] = await decorateTransactionsForUser([result.data ?? {}], userId)
  res.json(decorated)
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  const id = getParamId(req)
  const existing = await findById('budget_transactions', id)
  if (!existing || existing.user_id !== userId) {
    return res.status(404).json({ error: t('transactions.notFound') })
  }
  const accountId = existing.account_id as string
  await deleteById('budget_transactions', id)
  await applyOpeningBalanceRecompute(accountId, userId)
  res.status(204).end()
})

export type { DecoratedTransaction }
export default router
