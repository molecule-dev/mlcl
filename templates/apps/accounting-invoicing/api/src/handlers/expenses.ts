import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import { serializeExpense } from '../lib/serialize.js'
import type { AccountingInvoicingLimits } from '../tiers.js'

const router = Router()

type RawExpenseRow = Parameters<typeof serializeExpense>[0]

const createExpenseSchema = z.object({
  amount: z.number().optional(),
  amount_cents: z.number().optional(),
  currency: z.string().nullable().optional(),
  merchant: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  category_color: z.string().nullable().optional(),
  occurred_at: z.string().nullable().optional(),
  date: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  vendor: z.string().nullable().optional(),
  account_id: z.string().nullable().optional(),
  receipt_url: z.string().nullable().optional(),
  has_receipt: z.boolean().optional(),
  is_deductible: z.boolean().optional(),
  status: z.string().nullable().optional(),
})

const updateExpenseSchema = createExpenseSchema.extend({
  reconciled: z.boolean().optional(),
  reconciled_match_id: z.string().nullable().optional(),
})

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const { category, status } = req.query
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (category) where.push({ field: 'category', operator: '=', value: String(category) })
    if (status) where.push({ field: 'status', operator: '=', value: String(status) })

    const orderBy: OrderBy[] = [{ field: 'occurred_at', direction: 'desc' }]
    const items = await findMany<RawExpenseRow>('expenses', { where, orderBy })
    res.json(items.map(serializeExpense))
  } catch (error) {
    logger.error('expenses.list', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const item = await findById<RawExpenseRow>('expenses', getParamId(req))
    if (!item || item.user_id !== userId) {
      return res.status(404).json({ error: t('expenses.notFound') })
    }
    res.json(serializeExpense(item))
  } catch (error) {
    logger.error('expenses.get', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

// Enforce the per-tier expenses cap (tiers.ts maxExpenses) — defined + shown on Pricing (CATALOG
// claims it gated) but the create route never enforced it, so any tier could create unlimited.
const enforceExpenseLimit = enforceLimit<AccountingInvoicingLimits>({
  limitType: 'maxExpenses',
  getLimit: (limits) => limits.maxExpenses,
  getCurrent: async (userId) =>
    count('expenses', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post(
  '/',
  enforceExpenseLimit,
  validateBody(createExpenseSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

      const occurred = req.body.occurred_at
        ? new Date(req.body.occurred_at)
        : req.body.date
          ? new Date(req.body.date)
          : new Date()
      const date = req.body.date ? new Date(req.body.date) : occurred

      const result = await create<RawExpenseRow>('expenses', {
        user_id: userId,
        amount: req.body.amount ?? 0,
        amount_cents: req.body.amount_cents ?? Math.round((req.body.amount ?? 0) * 100),
        currency: req.body.currency ?? 'USD',
        merchant: req.body.merchant ?? req.body.vendor ?? null,
        category: req.body.category ?? null,
        category_color: req.body.category_color ?? null,
        occurred_at: occurred,
        date,
        has_receipt: req.body.has_receipt ?? Boolean(req.body.receipt_url),
        receipt_url: req.body.receipt_url ?? null,
        notes: req.body.notes ?? req.body.description ?? null,
        description: req.body.description ?? null,
        vendor: req.body.vendor ?? null,
        account_id: req.body.account_id ?? null,
        is_deductible: req.body.is_deductible ?? false,
        tax_cents: 0,
        reconciled: false,
        audit_log: JSON.stringify([]),
        status: req.body.status ?? 'pending',
        created_by: userId,
        created_at: new Date(),
        updated_at: new Date(),
      })
      if (!result.data) return res.status(500).json({ error: t('errors.internalServer') })
      res.status(201).json(serializeExpense(result.data))
    } catch (error) {
      logger.error('expenses.create', error)
      res.status(500).json({ error: t('errors.internalServer') })
    }
  },
)

router.put('/:id', validateBody(updateExpenseSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('expenses', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('expenses.notFound') })
    }

    const updates: Record<string, unknown> = { ...req.body, updated_at: new Date() }
    if (typeof req.body.occurred_at === 'string')
      updates.occurred_at = new Date(req.body.occurred_at)
    if (typeof req.body.date === 'string') updates.date = new Date(req.body.date)

    const result = await updateById<RawExpenseRow>('expenses', id, updates)
    if (!result.data) return res.status(500).json({ error: t('errors.internalServer') })
    res.json(serializeExpense(result.data))
  } catch (error) {
    logger.error('expenses.update', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('expenses', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('expenses.notFound') })
    }
    await deleteById('expenses', id)
    res.status(204).end()
  } catch (error) {
    logger.error('expenses.delete', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
