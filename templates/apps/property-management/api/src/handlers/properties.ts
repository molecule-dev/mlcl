/**
 * Properties handler — owner-scoped CRUD over the `properties` table via the
 * abstract DataStore. All routes require an authenticated session and scope
 * every read/write by the session's userId so users cannot read/modify each
 * other's properties (G6 — IDOR avoidance).
 *
 * Errors bubble — no try/catch swallowing. The /api error middleware in
 * server.ts will surface failures as 500 with logs.
 */
import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import {
  count,
  create,
  deleteById,
  findById,
  findMany,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import type { PropertyManagementLimits } from '../tiers.js'

const router = Router()

const createPropertySchema = z.object({
  name: z.string().min(1),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  postal_code: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  units_count: z.number().int().nonnegative().optional(),
  unit_count: z.number().int().nonnegative().optional(),
  year_built: z.number().int().nullable().optional(),
  status: z.enum(['active', 'sold', 'inactive']).optional(),
  // NOTE: the object-storage key (`photo_s3_key`) is NEVER accepted from the
  // client — neither directly nor via the `photo_url` alias. A client-chosen
  // key defeats server-minted UUID keys: a future photo download/preview route
  // streaming getFile(<client key>) would let one owner address another owner's
  // object (cross-tenant read IDOR). The key is minted server-side; `photo_url`
  // in responses is a derived display field (see serializeProperty), not input.
})

const updatePropertySchema = createPropertySchema.partial()

interface PropertyRow {
  id: string
  user_id: string
  name: string
  address: string | null
  units_count: number
  status: string
  photo_s3_key: string | null
  created_at: string | Date
  updatedAt: string | Date | null
}

interface UnitRow {
  id: string
  property_id: string
  status: string
  monthly_rent: string | number
}
interface LeaseRow {
  id: string
  unit_id: string
  monthly_rent: string | number
  status: string
}

function toCents(num: string | number | null | undefined): number {
  if (num === null || num === undefined) return 0
  const n = typeof num === 'string' ? parseFloat(num) : num
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 100)
}

function normalizeBody(body: Record<string, unknown>): Record<string, unknown> {
  const out = { ...body }
  if (out.unit_count !== undefined && out.units_count === undefined) {
    out.units_count = out.unit_count
  }
  delete out.unit_count
  // The client must never set the storage key — not directly (`photo_s3_key`)
  // nor via the `photo_url` alias. Both are stripped by the Zod schema, but we
  // also drop them here as defense in depth so a client value can never become
  // the persisted storage key (cross-tenant read IDOR). It is minted
  // server-side; `photo_url` in responses is a derived display field.
  delete out.photo_url
  delete out.photo_s3_key
  return out
}

function serializeProperty(
  row: PropertyRow,
  unitsByProperty: Map<string, UnitRow[]> = new Map(),
  leasesByUnit: Map<string, LeaseRow[]> = new Map(),
): PropertyRow & {
  unit_count: number
  occupied_units: number
  monthly_revenue_cents: number
  photo_url: string | null
} {
  const units = unitsByProperty.get(row.id) ?? []
  const occupied = units.filter((u) => {
    if (u.status === 'occupied') return true
    const leases = leasesByUnit.get(u.id) ?? []
    return leases.some((l) => l.status === 'active')
  }).length
  const revenue = units.reduce((acc, u) => {
    const leases = leasesByUnit.get(u.id) ?? []
    const activeLease = leases.find((l) => l.status === 'active')
    if (activeLease) return acc + toCents(activeLease.monthly_rent)
    return acc + toCents(u.monthly_rent)
  }, 0)
  const unitCount = units.length || row.units_count || 0
  return {
    ...row,
    unit_count: unitCount,
    occupied_units: occupied,
    monthly_revenue_cents: revenue,
    photo_url: row.photo_s3_key,
  }
}

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
    return
  }
  const ownerWhere: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  const [rows, units, leases] = await Promise.all([
    findMany<PropertyRow>('properties', {
      where: ownerWhere,
      orderBy: [{ field: 'name', direction: 'asc' }],
    }),
    findMany<UnitRow>('units', { where: ownerWhere }),
    findMany<LeaseRow>('leases', { where: ownerWhere }),
  ])
  const unitsByProperty = new Map<string, UnitRow[]>()
  for (const u of units) {
    const arr = unitsByProperty.get(u.property_id) ?? []
    arr.push(u)
    unitsByProperty.set(u.property_id, arr)
  }
  const leasesByUnit = new Map<string, LeaseRow[]>()
  for (const l of leases) {
    const arr = leasesByUnit.get(l.unit_id) ?? []
    arr.push(l)
    leasesByUnit.set(l.unit_id, arr)
  }
  res.json(rows.map((r) => serializeProperty(r, unitsByProperty, leasesByUnit)))
})

router.get('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
    return
  }
  const id = getParamId(req)
  const row = await findById<PropertyRow>('properties', id)
  if (!row || row.user_id !== userId) {
    res
      .status(404)
      .json({ error: t('property.notFound', undefined, { defaultValue: 'Property not found' }) })
    return
  }
  const ownerWhere: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  const [units, leases] = await Promise.all([
    findMany<UnitRow>('units', {
      where: [...ownerWhere, { field: 'property_id', operator: '=', value: id }],
    }),
    findMany<LeaseRow>('leases', { where: ownerWhere }),
  ])
  const unitsByProperty = new Map<string, UnitRow[]>([[id, units]])
  const leasesByUnit = new Map<string, LeaseRow[]>()
  for (const l of leases) {
    const arr = leasesByUnit.get(l.unit_id) ?? []
    arr.push(l)
    leasesByUnit.set(l.unit_id, arr)
  }
  res.json(serializeProperty(row, unitsByProperty, leasesByUnit))
})

router.post(
  '/',
  enforceLimit<PropertyManagementLimits>({
    limitType: 'maxProperties',
    getLimit: (limits) => limits.maxProperties,
    getCurrent: async (userId) =>
      count('properties', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createPropertySchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
      return
    }
    const body = normalizeBody(req.body)
    const result = await create<PropertyRow>('properties', {
      ...body,
      user_id: userId,
      status: (body.status as string | undefined) ?? 'active',
      created_at: new Date(),
    })
    const row = ((result as { data?: PropertyRow }).data ?? result) as PropertyRow
    res.status(201).json(serializeProperty(row))
  },
)

router.put('/:id', validateBody(updatePropertySchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
    return
  }
  const id = getParamId(req)
  const existing = await findById<PropertyRow>('properties', id)
  if (!existing || existing.user_id !== userId) {
    res
      .status(404)
      .json({ error: t('property.notFound', undefined, { defaultValue: 'Property not found' }) })
    return
  }
  const body = normalizeBody(req.body)
  const result = await updateById<PropertyRow>('properties', id, { ...body, updatedAt: new Date() })
  const row = ((result as { data?: PropertyRow }).data ?? result) as PropertyRow
  res.json(serializeProperty(row))
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
  const existing = await findById<Record<string, unknown>>('properties', id)
  if (!existing || existing.user_id !== userId) {
    res
      .status(404)
      .json({ error: t('property.notFound', undefined, { defaultValue: 'Property not found' }) })
    return
  }
  await deleteById('properties', id)
  res.status(204).end()
})

export default router
