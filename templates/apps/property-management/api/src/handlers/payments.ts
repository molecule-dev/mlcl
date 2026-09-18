/**
 * Rent payments handler — owner-scoped CRUD over the `rent_payments`
 * table via the abstract DataStore. Distinct from the subscription
 * `payments` resource shipped by `@molecule/api-resource-payment`. All
 * queries scope by session userId; detail / update / delete reject
 * IDOR via `requireUserOwnership` (G6).
 *
 * Errors bubble — no try/catch swallowing.
 */
import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import {
  count,
  create,
  deleteById,
  findMany,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import { requireUserOwnership } from '../lib/authz.js'
import type { PropertyManagementLimits } from '../tiers.js'

const router = Router()

const TABLE = 'rent_payments'

const createPaymentSchema = z.object({
  tenant_id: z.string().min(1),
  rent_invoice_id: z.string().optional(),
  lease_id: z.string().optional(),
  property_id: z.string().optional(),
  amount: z.number().nonnegative(),
  currency: z.string().length(3).optional(),
  kind: z.enum(['rent', 'deposit', 'late_fee', 'other']).optional(),
  method: z.enum(['stripe', 'check', 'cash', 'ach']).optional(),
  reference: z.string().optional(),
  status: z.enum(['pending', 'paid', 'overdue', 'failed']).optional(),
  due_date: z.string().optional(),
})

const updatePaymentSchema = createPaymentSchema.partial()

router.get('/', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
    return
  }
  const { tenant_id, lease_id, status, page = '1', limit = '50' } = req.query
  const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  if (tenant_id) where.push({ field: 'tenant_id', operator: '=', value: String(tenant_id) })
  if (lease_id) where.push({ field: 'lease_id', operator: '=', value: String(lease_id) })
  if (status) where.push({ field: 'status', operator: '=', value: String(status) })
  const rows = await findMany(TABLE, {
    where,
    orderBy: [{ field: 'occurred_at', direction: 'desc' }],
    limit: Number(limit),
    offset: (Number(page) - 1) * Number(limit),
  })
  res.json(rows)
})

router.get('/summary/overview', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
    return
  }
  const { property_id } = req.query
  const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  if (property_id) where.push({ field: 'property_id', operator: '=', value: String(property_id) })

  const rows = await findMany<{ status: string; amount: number }>(TABLE, { where, limit: 5000 })
  const sumWith = (pred: (r: { status: string; amount: number }) => boolean): number =>
    rows.filter(pred).reduce((sum, r) => sum + Number(r.amount ?? 0), 0)
  const summary = {
    total_collected: sumWith((p) => p.status === 'paid'),
    total_pending: sumWith((p) => p.status === 'pending'),
    total_overdue: sumWith((p) => p.status === 'overdue'),
    count_paid: rows.filter((p) => p.status === 'paid').length,
    count_pending: rows.filter((p) => p.status === 'pending').length,
    count_overdue: rows.filter((p) => p.status === 'overdue').length,
  }
  res.json(summary)
})

router.get('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
    return
  }
  const check = await requireUserOwnership(TABLE, getParamId(req), userId)
  if (!check.ok) {
    res
      .status(check.status)
      .json({ error: t('payment.notFound', undefined, { defaultValue: 'Payment not found' }) })
    return
  }
  res.json(check.row)
})

router.post(
  '/',
  enforceLimit<PropertyManagementLimits>({
    limitType: 'maxPayments',
    getLimit: (limits) => limits.maxPayments,
    getCurrent: async (userId) =>
      count(TABLE, [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createPaymentSchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
      return
    }
    const result = await create(TABLE, {
      ...req.body,
      user_id: userId,
      status: req.body.status ?? 'pending',
      currency: req.body.currency ?? 'USD',
      kind: req.body.kind ?? 'rent',
      method: req.body.method ?? 'stripe',
      created_at: new Date(),
    })
    const data = (result as { data?: unknown }).data ?? result
    res.status(201).json(data)
  },
)

router.put('/:id', validateBody(updatePaymentSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
    return
  }
  const id = getParamId(req)
  const check = await requireUserOwnership(TABLE, id, userId)
  if (!check.ok) {
    res
      .status(check.status)
      .json({ error: t('payment.notFound', undefined, { defaultValue: 'Payment not found' }) })
    return
  }
  const result = await updateById(TABLE, id, { ...req.body, updatedAt: new Date() })
  const data = (result as { data?: unknown }).data ?? result
  res.json(data)
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
    return
  }
  const id = getParamId(req)
  const check = await requireUserOwnership(TABLE, id, userId)
  if (!check.ok) {
    res
      .status(check.status)
      .json({ error: t('payment.notFound', undefined, { defaultValue: 'Payment not found' }) })
    return
  }
  await deleteById(TABLE, id)
  res.status(204).end()
})

export default router
