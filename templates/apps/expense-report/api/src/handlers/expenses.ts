/**
 * Expenses handler — line items the user can group into reports.
 *
 * Storage stores `amount` as a `numeric(20,4)` decimal-dollar value;
 * the API responds with `amountCents` (integer cents) so the React UI
 * can format with `Intl.NumberFormat` and avoid floating-point drift in
 * sums. Frontends should send `amount` (decimal dollars) on POST/PUT
 * which we accept verbatim.
 *
 * @module
 */

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import type { ExpenseReportLimits } from '../tiers.js'
import { seedDemoForUser } from './_seed.js'

const router = Router()

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function isUuid(value: string): boolean {
  return UUID_RE.test(value)
}

interface ExpenseRow {
  id?: string
  user_id?: string
  report_id?: string | null
  amount?: number | string
  currency?: string
  category?: string | null
  date?: string | Date | null
  description?: string | null
  merchant?: string | null
  receipt_url?: string | null
  status?: string | null
  created_at?: string | Date | null
}

function num(v: unknown): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

/**
 * Decorate an expense row with the shape `ExpenseRowItem` expects on
 * the frontend (`amountCents`, `receiptUrl`, ISO `date`).
 */
function decorate(row: ExpenseRow): Record<string, unknown> {
  return {
    id: row.id,
    merchant: row.merchant ?? '',
    category: row.category ?? 'other',
    date: row.date instanceof Date ? row.date.toISOString() : (row.date ?? null),
    amountCents: Math.round(num(row.amount) * 100),
    amount: num(row.amount),
    currency: row.currency ?? 'USD',
    description: row.description ?? null,
    receiptUrl: row.receipt_url ?? null,
    receipt_url: row.receipt_url ?? null,
    status: row.status ?? 'draft',
    report_id: row.report_id ?? null,
    reportId: row.report_id ?? null,
  }
}

const createExpenseSchema = z.object({
  amount: z.number(),
  currency: z.string().optional(),
  merchant: z.string().optional(),
  category: z.string().optional(),
  date: z.string().optional(),
  description: z.string().optional(),
  receipt_url: z.string().nullable().optional(),
  report_id: z.string().nullable().optional(),
})

const updateExpenseSchema = z.object({
  amount: z.number().optional(),
  currency: z.string().optional(),
  merchant: z.string().optional(),
  category: z.string().optional(),
  date: z.string().optional(),
  description: z.string().optional(),
  receipt_url: z.string().nullable().optional(),
  report_id: z.string().nullable().optional(),
})

router.get('/', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({ error: t('auth.unauthorized') })
  }
  try {
    await seedDemoForUser(userId)
  } catch (err) {
    console.warn('seedDemoForUser failed', err)
  }

  const { report_id, category, status, limit, offset } = req.query

  const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  if (report_id) where.push({ field: 'report_id', operator: '=', value: report_id })
  if (category) where.push({ field: 'category', operator: '=', value: category })
  if (status) where.push({ field: 'status', operator: '=', value: status })

  const orderBy: OrderBy[] = [{ field: 'date', direction: 'desc' }]

  const expenses = await findMany<ExpenseRow>('expenses', {
    where,
    orderBy,
    limit: Number(limit) || 100,
    offset: Number(offset) || 0,
  })
  res.json(expenses.map(decorate))
})

router.get('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({ error: t('auth.unauthorized') })
  }

  const id = getParamId(req)
  if (!isUuid(id)) {
    return res
      .status(404)
      .json({ error: t('expenses.notFound', undefined, { defaultValue: 'Expense not found' }) })
  }
  const expense = await findById<ExpenseRow>('expenses', id)
  if (!expense || expense.user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('expenses.notFound', undefined, { defaultValue: 'Expense not found' }) })
  }
  res.json(decorate(expense))
})

// Enforce the per-tier expense cap (tiers.ts maxExpenses) — defined + advertised in CATALOG but
// enforceLimit was never called, so any tier could create unlimited expenses.
const enforceExpenseLimit = enforceLimit<ExpenseReportLimits>({
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
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({ error: t('auth.unauthorized') })
    }

    const { amount, currency, merchant, category, date, description, receipt_url, report_id } =
      req.body

    const result = await create<ExpenseRow>('expenses', {
      user_id: userId,
      amount,
      currency: currency ?? 'USD',
      merchant,
      category,
      date: date ? new Date(date) : new Date(),
      description,
      receipt_url,
      report_id: report_id ?? null,
      status: 'draft',
      created_at: new Date(),
    })

    const persisted = (result as { data?: ExpenseRow }).data ?? (result as ExpenseRow)
    res.status(201).json(decorate(persisted))
  },
)

router.put('/:id', validateBody(updateExpenseSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({ error: t('auth.unauthorized') })
  }

  const id = getParamId(req)
  const existing = await findById<ExpenseRow>('expenses', id)
  if (!existing || existing.user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('expenses.notFound', undefined, { defaultValue: 'Expense not found' }) })
  }

  const { amount, currency, merchant, category, date, description, receipt_url, report_id } =
    req.body
  const updates: Record<string, unknown> = {}
  if (amount !== undefined) updates.amount = amount
  if (currency !== undefined) updates.currency = currency
  if (merchant !== undefined) updates.merchant = merchant
  if (category !== undefined) updates.category = category
  if (date !== undefined) updates.date = new Date(date)
  if (description !== undefined) updates.description = description
  if (receipt_url !== undefined) updates.receipt_url = receipt_url
  if (report_id !== undefined) updates.report_id = report_id

  const result = await updateById<ExpenseRow>('expenses', id, updates)
  const persisted = (result as { data?: ExpenseRow }).data ?? (result as ExpenseRow)
  res.json(decorate(persisted))
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({ error: t('auth.unauthorized') })
  }

  const id = getParamId(req)
  const existing = await findById<ExpenseRow>('expenses', id)
  if (!existing || existing.user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('expenses.notFound', undefined, { defaultValue: 'Expense not found' }) })
  }
  await deleteById('expenses', id)
  res.status(204).end()
})

export default router
