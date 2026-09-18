import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import type { PersonalFinanceLimits } from '../tiers.js'

/** Returns the start of the current calendar month in UTC. */
const startOfMonth = (): Date => {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0))
}

const router = Router()

const createTransactionSchema = z.object({
  account_id: z.string().min(1),
  amount: z.number(),
  type: z.enum(['income', 'expense', 'transfer']),
  description: z.string().min(1),
  date: z.string().optional(),
  category_id: z.string().nullable().optional(),
  notes: z.string().optional(),
  // The `tags` array and the `recurring` flag have real columns and are set on the Add Transaction
  // form, but were omitted from this schema — so validateBody stripped them and every user
  // transaction saved with empty tags / recurring=false. (Generating the recurring occurrences is a
  // separate scheduler concern; here we at least persist the flag the user set.)
  tags: z.array(z.string()).optional(),
  recurring: z.boolean().optional(),
})

const updateTransactionSchema = z.object({
  amount: z.number().optional(),
  type: z.enum(['income', 'expense', 'transfer']).optional(),
  description: z.string().min(1).optional(),
  date: z.string().optional(),
  category_id: z.string().nullable().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  recurring: z.boolean().optional(),
})

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({ error: t('auth.unauthorized') })
    }

    const { account_id, category_id, start_date, end_date, type, limit, offset } = req.query

    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]

    if (account_id) {
      where.push({ field: 'account_id', operator: '=', value: account_id })
    }
    if (category_id) {
      where.push({ field: 'category_id', operator: '=', value: category_id })
    }
    if (type) {
      where.push({ field: 'type', operator: '=', value: type })
    }
    if (start_date) {
      where.push({ field: 'date', operator: '>=', value: new Date(start_date as string) })
    }
    if (end_date) {
      where.push({ field: 'date', operator: '<=', value: new Date(end_date as string) })
    }

    const orderBy: OrderBy[] = [{ field: 'date', direction: 'desc' }]

    const transactions = await findMany('transactions', {
      where,
      orderBy,
      limit: Number(limit) || 50,
      offset: Number(offset) || 0,
    })

    res.json(transactions)
  } catch (error) {
    logger.error('transactions.handler', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({ error: t('auth.unauthorized') })
    }

    const id = getParamId(req)
    const transaction = await findById<Record<string, unknown>>('transactions', id)

    if (!transaction || transaction.user_id !== userId) {
      return res.status(404).json({ error: t('transactions.notFound') })
    }

    res.json(transaction)
  } catch (error) {
    logger.error('transactions.handler', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.post(
  '/',
  enforceLimit<PersonalFinanceLimits>({
    limitType: 'maxTransactionsPerMonth',
    getLimit: (limits) => limits.maxTransactionsPerMonth,
    getCurrent: async (userId) =>
      count('transactions', [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'date', operator: '>=', value: startOfMonth() },
      ]),
  }) as unknown as RequestHandler,
  validateBody(createTransactionSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res.status(401).json({ error: t('auth.unauthorized') })
      }

      const { account_id, amount, type, description, date, category_id, notes, tags, recurring } =
        req.body

      const result = await create('transactions', {
        user_id: userId,
        account_id,
        amount,
        type,
        description,
        date: date ? new Date(date) : new Date(),
        category_id: category_id || null,
        notes,
        tags: tags ?? [],
        recurring: recurring ?? false,
        created_at: new Date(),
      })

      res.status(201).json(result.data)
    } catch (error) {
      logger.error('transactions.handler', error)
      res.status(500).json({ error: t('errors.internalServer') })
    }
  },
)

router.put('/:id', validateBody(updateTransactionSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({ error: t('auth.unauthorized') })
    }

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('transactions', id)

    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('transactions.notFound') })
    }

    const { amount, type, description, date, category_id, notes, tags, recurring } = req.body
    const updates: Record<string, unknown> = {}
    if (amount !== undefined) updates.amount = amount
    if (type !== undefined) updates.type = type
    if (description !== undefined) updates.description = description
    if (date !== undefined) updates.date = new Date(date)
    if (category_id !== undefined) updates.category_id = category_id
    if (notes !== undefined) updates.notes = notes
    if (tags !== undefined) updates.tags = tags
    if (recurring !== undefined) updates.recurring = recurring

    const result = await updateById('transactions', id, updates)

    res.json(result.data)
  } catch (error) {
    logger.error('transactions.handler', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({ error: t('auth.unauthorized') })
    }

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('transactions', id)

    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('transactions.notFound') })
    }

    await deleteById('transactions', id)
    res.status(204).end()
  } catch (error) {
    logger.error('transactions.handler', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
