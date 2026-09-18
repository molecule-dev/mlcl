/**
 * Finances handler — owner-scoped rent-roll / arrears / CSV export
 * derived from real data (rent_payments + leases + tenants + units +
 * properties). Errors bubble; no try/catch swallowing.
 *
 * GET /finances/rent-roll                → rows for the rent-roll table
 * GET /finances/summary                  → collected / outstanding / overdue
 * GET /finances/rent-roll.csv            → real text/csv download (Pro+ tier)
 */
import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findMany, type WhereCondition } from '@molecule/api-database'
import { getEffectiveTier } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'

import type { PropertyManagementLimits } from '../tiers.js'

const router = Router()

interface Payment {
  id: string
  tenant_id?: string | null
  lease_id?: string | null
  property_id?: string | null
  amount?: number | string
  status?: string
  due_date?: string | null
  occurred_at?: string | null
  kind?: string
}
interface Tenant {
  id: string
  first_name?: string
  last_name?: string
}
interface Lease {
  id: string
  unit_id?: string
  tenant_id?: string
}
interface Unit {
  id: string
  unit_number?: string
  property_id?: string
}
interface Property {
  id: string
  name?: string
}

async function loadOwned(userId: string): Promise<{
  payments: Payment[]
  tenants: Tenant[]
  leases: Lease[]
  units: Unit[]
  properties: Property[]
}> {
  const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  const [payments, tenants, leases, units, properties] = await Promise.all([
    findMany<Payment>('rent_payments', {
      where,
      orderBy: [{ field: 'due_date', direction: 'desc' }],
      limit: 500,
    }),
    findMany<Tenant>('tenants', { where, limit: 500 }),
    findMany<Lease>('leases', { where, limit: 500 }),
    findMany<Unit>('units', { where, limit: 500 }),
    findMany<Property>('properties', { where, limit: 500 }),
  ])
  return { payments, tenants, leases, units, properties }
}

function buildRows(d: Awaited<ReturnType<typeof loadOwned>>): Array<{
  id: string
  property: string
  unit: string
  tenant: string
  due_cents: number
  paid_cents: number
  balance_cents: number
  due_date: string | null
  status: string
  kind: string
}> {
  const tenantById = new Map(d.tenants.map((t) => [t.id, t]))
  const leaseById = new Map(d.leases.map((l) => [l.id, l]))
  const unitById = new Map(d.units.map((u) => [u.id, u]))
  const propertyById = new Map(d.properties.map((p) => [p.id, p]))

  return d.payments.map((p) => {
    const lease = p.lease_id ? leaseById.get(p.lease_id) : undefined
    const unit = lease?.unit_id ? unitById.get(lease.unit_id) : undefined
    const property =
      (p.property_id && propertyById.get(p.property_id)) ||
      (unit?.property_id ? propertyById.get(unit.property_id) : undefined)
    const tenant =
      (p.tenant_id && tenantById.get(p.tenant_id)) ||
      (lease?.tenant_id ? tenantById.get(lease.tenant_id) : undefined)
    const amountCents = Math.round(Number(p.amount ?? 0) * 100)
    const paidCents = p.status === 'paid' ? amountCents : 0
    const balance = amountCents - paidCents
    return {
      id: p.id,
      property: property?.name ?? '',
      unit: unit?.unit_number ?? '',
      tenant: tenant ? `${tenant.first_name ?? ''} ${tenant.last_name ?? ''}`.trim() : '',
      due_cents: amountCents,
      paid_cents: paidCents,
      balance_cents: balance,
      due_date: p.due_date ?? p.occurred_at ?? null,
      status: p.status ?? 'pending',
      kind: p.kind ?? 'rent',
    }
  })
}

router.get('/rent-roll', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
    return
  }
  const data = await loadOwned(userId)
  res.json(buildRows(data))
})

router.get('/summary', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
    return
  }
  const data = await loadOwned(userId)
  const rows = buildRows(data)
  const totalDue = rows.reduce((s, r) => s + r.due_cents, 0)
  const totalPaid = rows.reduce((s, r) => s + r.paid_cents, 0)
  const overdueRows = rows.filter((r) => r.status === 'overdue')
  const totalOverdue = overdueRows.reduce(
    (s, r) => s + (r.balance_cents > 0 ? r.balance_cents : 0),
    0,
  )
  res.json({
    total_due_cents: totalDue,
    total_paid_cents: totalPaid,
    total_outstanding_cents: totalDue - totalPaid,
    total_overdue_cents: totalOverdue,
    overdue_count: overdueRows.length,
    collection_rate_pct: totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0,
    paid_count: rows.filter((r) => r.status === 'paid').length,
    pending_count: rows.filter((r) => r.status === 'pending').length,
    partial_count: rows.filter((r) => r.status === 'partial').length,
  })
})

router.get('/rent-roll.csv', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
    return
  }
  // Free tier doesn't get CSV export — gate on tier.canExport.
  const tier = await getEffectiveTier<PropertyManagementLimits>(res)
  if (!tier.limits.canExport) {
    res.status(402).json({
      error: t('finances.exportLocked', undefined, {
        defaultValue: 'CSV export requires the Pro plan.',
      }),
      upgrade_required: true,
    })
    return
  }
  const data = await loadOwned(userId)
  const rows = buildRows(data)
  const header = 'property,unit,tenant,due_date,due_cents,paid_cents,balance_cents,status,kind\n'
  // [L2-1] Neutralize CSV/formula injection (CWE-1236): a cell starting with = + - @ or a
  // leading tab/CR is executed as a formula by Excel/Sheets/LibreOffice. Prefix a single
  // quote (the standard text marker, stripped on display) BEFORE the existing JSON.stringify
  // quoting; genuine numbers are exempt so negative values aren't mangled (mirrors the shared
  // csv escapeField). Applied to the free-text cells (property/unit/tenant/due_date).
  const csvCell = (v: unknown): string => {
    let s = String(v ?? '')
    if (!/^-?\d+(\.\d+)?$/.test(s) && /^[=+\-@\t\r]/.test(s)) s = `'${s}`
    return JSON.stringify(s)
  }
  const csvBody = rows
    .map((r) =>
      [
        csvCell(r.property),
        csvCell(r.unit),
        csvCell(r.tenant),
        csvCell(r.due_date ?? ''),
        r.due_cents,
        r.paid_cents,
        r.balance_cents,
        r.status,
        r.kind,
      ].join(','),
    )
    .join('\n')
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="rent-roll-${new Date().toISOString().slice(0, 10)}.csv"`,
  )
  res.send(header + csvBody + (csvBody ? '\n' : ''))
})

export default router
