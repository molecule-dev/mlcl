/**
 * Units handler — owner-scoped CRUD over the `units` table via the
 * abstract DataStore. All queries scope by session userId and
 * detail/update/delete reject IDOR via `requireUserOwnership` (G6).
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

// Accept either `unit_number` (DB-canonical) or `name` (UI-friendly)
// from the frontend; normalizeBody maps `name` → `unit_number` so the
// frontend creation form doesn't need to know the DB column name.
const createUnitSchema = z
  .object({
    property_id: z.string().min(1),
    unit_number: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    bedrooms: z.number().int().nonnegative().nullable().optional(),
    bathrooms: z.number().nonnegative().nullable().optional(),
    sqft: z.number().int().nonnegative().nullable().optional(),
    monthly_rent: z.number().nonnegative().nullable().optional(),
    monthly_rent_cents: z.number().nonnegative().nullable().optional(),
    status: z.enum(['vacant', 'occupied', 'maintenance']).optional(),
  })
  .refine((d) => Boolean(d.unit_number || d.name), {
    message: 'unit_number or name is required',
    path: ['unit_number'],
  })

const updateUnitSchema = z.object({
  property_id: z.string().min(1).optional(),
  unit_number: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  bedrooms: z.number().int().nonnegative().nullable().optional(),
  bathrooms: z.number().nonnegative().nullable().optional(),
  sqft: z.number().int().nonnegative().nullable().optional(),
  monthly_rent: z.number().nonnegative().nullable().optional(),
  monthly_rent_cents: z.number().nonnegative().nullable().optional(),
  status: z.enum(['vacant', 'occupied', 'maintenance']).optional(),
})

interface UnitRow {
  id: string
  user_id: string
  property_id: string
  unit_number: string
  bedrooms: number | null
  bathrooms: string | number | null
  sqft: number | null
  monthly_rent: string | number | null
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
    out.monthly_rent =
      out.monthly_rent_cents === null ? null : fromCents(Number(out.monthly_rent_cents))
  }
  delete out.monthly_rent_cents
  // UI form sends `name`; DB column is `unit_number`. Map both directions.
  if (out.name !== undefined && out.unit_number === undefined) {
    out.unit_number = out.name
  }
  delete out.name
  return out
}

function serializeUnit(
  row: UnitRow,
): UnitRow & { monthly_rent_cents: number; rent_cents: number; name: string } {
  const cents = toCents(row.monthly_rent)
  return { ...row, monthly_rent_cents: cents, rent_cents: cents, name: row.unit_number }
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
  const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  if (property_id) where.push({ field: 'property_id', operator: '=', value: String(property_id) })
  if (status) where.push({ field: 'status', operator: '=', value: String(status) })
  const rows = await findMany<UnitRow>('units', {
    where,
    orderBy: [{ field: 'unit_number', direction: 'asc' }],
    limit: Number(limit),
    offset: (Number(page) - 1) * Number(limit),
  })
  res.json(rows.map(serializeUnit))
})

router.get('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
    return
  }
  const check = await requireUserOwnership('units', getParamId(req), userId)
  if (!check.ok) {
    res
      .status(check.status)
      .json({ error: t('unit.notFound', undefined, { defaultValue: 'Unit not found' }) })
    return
  }
  res.json(serializeUnit(check.row as unknown as UnitRow))
})

router.post(
  '/',
  enforceLimit<PropertyManagementLimits>({
    limitType: 'maxUnits',
    getLimit: (limits) => limits.maxUnits,
    getCurrent: async (userId) =>
      count('units', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createUnitSchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
      return
    }
    const body = normalizeBody(req.body)
    const result = await create<UnitRow>('units', {
      ...body,
      user_id: userId,
      status: (body.status as string | undefined) ?? 'vacant',
      created_at: new Date(),
    })
    const row = ((result as { data?: UnitRow }).data ?? result) as UnitRow
    res.status(201).json(serializeUnit(row))
  },
)

router.put('/:id', validateBody(updateUnitSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
    return
  }
  const id = getParamId(req)
  const check = await requireUserOwnership('units', id, userId)
  if (!check.ok) {
    res
      .status(check.status)
      .json({ error: t('unit.notFound', undefined, { defaultValue: 'Unit not found' }) })
    return
  }
  const body = normalizeBody(req.body)
  const result = await updateById<UnitRow>('units', id, { ...body, updatedAt: new Date() })
  const row = ((result as { data?: UnitRow }).data ?? result) as UnitRow
  res.json(serializeUnit(row))
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
  const check = await requireUserOwnership('units', id, userId)
  if (!check.ok) {
    res
      .status(check.status)
      .json({ error: t('unit.notFound', undefined, { defaultValue: 'Unit not found' }) })
    return
  }
  await deleteById('units', id)
  res.status(204).end()
})

export default router
