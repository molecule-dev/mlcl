/**
 * Leases handler — owner-scoped CRUD over the `leases` table via the
 * abstract DataStore. All queries scope by session userId; detail /
 * update / delete reject IDOR via `requireUserOwnership` (G6).
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

const createLeaseSchema = z
  .object({
    unit_id: z.string().min(1),
    tenant_id: z.string().min(1),
    secondary_tenant_ids: z.array(z.string()).optional(),
    start_date: z.string().min(1),
    end_date: z.string().nullable().optional(),
    monthly_rent: z.number().nonnegative().optional(),
    monthly_rent_cents: z.number().nonnegative().optional(),
    deposit: z.number().nonnegative().nullable().optional(),
    deposit_cents: z.number().nonnegative().nullable().optional(),
    status: z.enum(['active', 'expired', 'terminated']).optional(),
    renewed_from_id: z.string().nullable().optional(),
  })
  .refine((data) => data.monthly_rent !== undefined || data.monthly_rent_cents !== undefined, {
    message: 'monthly_rent or monthly_rent_cents required',
  })

const updateLeaseSchema = z.object({
  unit_id: z.string().min(1).optional(),
  tenant_id: z.string().min(1).optional(),
  secondary_tenant_ids: z.array(z.string()).optional(),
  start_date: z.string().min(1).optional(),
  end_date: z.string().nullable().optional(),
  monthly_rent: z.number().nonnegative().optional(),
  monthly_rent_cents: z.number().nonnegative().optional(),
  deposit: z.number().nonnegative().nullable().optional(),
  deposit_cents: z.number().nonnegative().nullable().optional(),
  status: z.enum(['active', 'expired', 'terminated']).optional(),
  renewed_from_id: z.string().nullable().optional(),
})

interface LeaseRow {
  id: string
  user_id: string
  unit_id: string
  tenant_id: string
  start_date: string
  end_date: string | null
  monthly_rent: string | number
  deposit: string | number | null
  status: string
  created_at: string | Date
  updatedAt: string | Date | null
}

function toCents(num: string | number | null | undefined): number {
  if (num === null || num === undefined) return 0
  const n = typeof num === 'string' ? parseFloat(num) : num
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 100)
}

function fromCents(cents: number): number {
  return Math.round(cents) / 100
}

function normalizeBody(body: Record<string, unknown>): Record<string, unknown> {
  const out = { ...body }
  if (out.monthly_rent_cents !== undefined && out.monthly_rent === undefined) {
    out.monthly_rent = fromCents(Number(out.monthly_rent_cents))
  }
  delete out.monthly_rent_cents
  if (out.deposit_cents !== undefined && out.deposit === undefined) {
    out.deposit = out.deposit_cents === null ? null : fromCents(Number(out.deposit_cents))
  }
  delete out.deposit_cents
  return out
}

function serializeLease(
  row: LeaseRow,
): LeaseRow & { monthly_rent_cents: number; deposit_cents: number } {
  return {
    ...row,
    monthly_rent_cents: toCents(row.monthly_rent),
    deposit_cents: toCents(row.deposit),
  }
}

router.get('/', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
    return
  }
  const { unit_id, tenant_id, status, page = '1', limit = '50' } = req.query
  const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  if (unit_id) where.push({ field: 'unit_id', operator: '=', value: String(unit_id) })
  if (tenant_id) where.push({ field: 'tenant_id', operator: '=', value: String(tenant_id) })
  if (status) where.push({ field: 'status', operator: '=', value: String(status) })
  const rows = await findMany<LeaseRow>('leases', {
    where,
    orderBy: [{ field: 'start_date', direction: 'desc' }],
    limit: Number(limit),
    offset: (Number(page) - 1) * Number(limit),
  })
  res.json(rows.map(serializeLease))
})

router.get('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
    return
  }
  const check = await requireUserOwnership('leases', getParamId(req), userId)
  if (!check.ok) {
    res
      .status(check.status)
      .json({ error: t('lease.notFound', undefined, { defaultValue: 'Lease not found' }) })
    return
  }
  res.json(serializeLease(check.row as unknown as LeaseRow))
})

router.post(
  '/',
  enforceLimit<PropertyManagementLimits>({
    limitType: 'maxLeases',
    getLimit: (limits) => limits.maxLeases,
    getCurrent: async (userId) =>
      count('leases', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createLeaseSchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
      return
    }
    const body = normalizeBody(req.body)
    const result = await create<LeaseRow>('leases', {
      ...body,
      user_id: userId,
      status: (body.status as string | undefined) ?? 'active',
      created_at: new Date(),
    })
    const row = ((result as { data?: LeaseRow }).data ?? result) as LeaseRow
    res.status(201).json(serializeLease(row))
  },
)

router.put('/:id', validateBody(updateLeaseSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
    return
  }
  const id = getParamId(req)
  const check = await requireUserOwnership('leases', id, userId)
  if (!check.ok) {
    res
      .status(check.status)
      .json({ error: t('lease.notFound', undefined, { defaultValue: 'Lease not found' }) })
    return
  }
  const body = normalizeBody(req.body)
  const result = await updateById<LeaseRow>('leases', id, { ...body, updatedAt: new Date() })
  const row = ((result as { data?: LeaseRow }).data ?? result) as LeaseRow
  res.json(serializeLease(row))
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
  const check = await requireUserOwnership('leases', id, userId)
  if (!check.ok) {
    res
      .status(check.status)
      .json({ error: t('lease.notFound', undefined, { defaultValue: 'Lease not found' }) })
    return
  }
  await deleteById('leases', id)
  res.status(204).end()
})

export default router
