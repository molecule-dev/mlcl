/**
 * Tenants handler — owner-scoped CRUD over the `tenants` table via the
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
import { isUuid } from './_uuid.js'

const router = Router()

const createTenantSchema = z
  .object({
    name: z.string().min(1).optional(),
    first_name: z.string().min(1).optional(),
    last_name: z.string().min(1).optional(),
    email: z.string().email().nullable().optional(),
    phone: z.string().nullable().optional(),
    property_id: z.string().nullable().optional(),
    unit_id: z.string().nullable().optional(),
    emergency_contact: z.record(z.string(), z.unknown()).optional(),
    status: z.enum(['active', 'former', 'applicant']).optional(),
  })
  .refine((data) => Boolean((data.first_name && data.last_name) || data.name), {
    message: 'name or first_name + last_name required',
  })

const updateTenantSchema = z.object({
  name: z.string().min(1).optional(),
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  property_id: z.string().nullable().optional(),
  unit_id: z.string().nullable().optional(),
  emergency_contact: z.record(z.string(), z.unknown()).optional(),
  status: z.enum(['active', 'former', 'applicant']).optional(),
})

interface TenantRow {
  id: string
  user_id: string
  property_id: string | null
  unit_id: string | null
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  status: string
  created_at: string | Date
  updatedAt: string | Date | null
  emergency_contact?: Record<string, unknown> | null
}

function splitName(name: string): { first_name: string; last_name: string } {
  const trimmed = name.trim()
  if (!trimmed) return { first_name: '', last_name: '' }
  const parts = trimmed.split(/\s+/)
  if (parts.length === 1) return { first_name: parts[0], last_name: '' }
  return { first_name: parts[0], last_name: parts.slice(1).join(' ') }
}

function serializeTenant(row: TenantRow): TenantRow & { name: string } {
  const fullName = [row.first_name, row.last_name].filter(Boolean).join(' ').trim()
  return { ...row, name: fullName }
}

function normalizeBody(body: Record<string, unknown>): Record<string, unknown> {
  const out = { ...body }
  if (out.name && (!out.first_name || !out.last_name)) {
    const { first_name, last_name } = splitName(String(out.name))
    out.first_name = first_name
    out.last_name = last_name || ''
  }
  delete out.name
  return out
}

router.get('/', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
    return
  }
  const { property_id, status, page = '1', limit = '50' } = req.query
  // property_id is a uuid column — a non-UUID filter would make the query
  // throw 22P02 (a 500). A non-UUID id matches no rows by definition.
  if (property_id && !isUuid(property_id)) {
    res.json([])
    return
  }
  const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  if (property_id) where.push({ field: 'property_id', operator: '=', value: String(property_id) })
  if (status) where.push({ field: 'status', operator: '=', value: String(status) })
  const rows = await findMany<TenantRow>('tenants', {
    where,
    orderBy: [{ field: 'last_name', direction: 'asc' }],
    limit: Number(limit),
    offset: (Number(page) - 1) * Number(limit),
  })
  res.json(rows.map(serializeTenant))
})

router.get('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
    return
  }
  const check = await requireUserOwnership('tenants', getParamId(req), userId)
  if (!check.ok) {
    res
      .status(check.status)
      .json({ error: t('tenant.notFound', undefined, { defaultValue: 'Tenant not found' }) })
    return
  }
  res.json(serializeTenant(check.row as unknown as TenantRow))
})

router.post(
  '/',
  enforceLimit<PropertyManagementLimits>({
    limitType: 'maxTenants',
    getLimit: (limits) => limits.maxTenants,
    getCurrent: async (userId) =>
      count('tenants', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createTenantSchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
      return
    }
    const body = normalizeBody(req.body)
    const result = await create<TenantRow>('tenants', {
      ...body,
      user_id: userId,
      status: (body.status as string | undefined) ?? 'active',
      created_at: new Date(),
    })
    const row = ((result as { data?: TenantRow }).data ?? result) as TenantRow
    res.status(201).json(serializeTenant(row))
  },
)

router.put('/:id', validateBody(updateTenantSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
    return
  }
  const id = getParamId(req)
  const check = await requireUserOwnership('tenants', id, userId)
  if (!check.ok) {
    res
      .status(check.status)
      .json({ error: t('tenant.notFound', undefined, { defaultValue: 'Tenant not found' }) })
    return
  }
  const body = normalizeBody(req.body)
  const result = await updateById<TenantRow>('tenants', id, { ...body, updatedAt: new Date() })
  const row = ((result as { data?: TenantRow }).data ?? result) as TenantRow
  res.json(serializeTenant(row))
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
  const check = await requireUserOwnership('tenants', id, userId)
  if (!check.ok) {
    res
      .status(check.status)
      .json({ error: t('tenant.notFound', undefined, { defaultValue: 'Tenant not found' }) })
    return
  }
  await deleteById('tenants', id)
  res.status(204).end()
})

export default router
