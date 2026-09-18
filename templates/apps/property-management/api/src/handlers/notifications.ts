/**
 * Notifications handler — server-derived activity feed for the
 * property-management dashboard. Items are derived from real owner-
 * scoped data (rent_payments, maintenance_requests, leases). Read state
 * is persisted in users.oauthData.notifications_read so a 'mark all
 * read' click survives reload.
 */
import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findById, findMany, updateById, type WhereCondition } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

const router = Router()

interface PaymentRow {
  id: string
  amount?: number | string
  status?: string
  occurred_at?: string
  due_date?: string | null
  tenant_id?: string | null
  property_id?: string | null
  lease_id?: string | null
}

interface MaintenanceRow {
  id: string
  title?: string
  priority?: string
  status?: string
  created_at?: string
  property_id?: string | null
  unit_id?: string | null
}

interface LeaseRow {
  id: string
  status?: string
  end_date?: string | null
  tenant_id?: string | null
  unit_id?: string | null
}

interface Tenant {
  id: string
  first_name?: string
  last_name?: string
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
interface UserOAuth {
  oauthData?: { notifications_read?: { all_until?: string; ids?: string[] } | null } | null
}

function fmtMoney(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

interface DerivedNotification {
  id: string
  category: 'maintenance' | 'lease' | 'payment' | 'system'
  title: string
  body: string
  unread: boolean
  href: string
  at: string
}

async function deriveNotifications(userId: string): Promise<DerivedNotification[]> {
  const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  const [payments, maintenance, leases, tenants, units, properties, user] = await Promise.all([
    findMany<PaymentRow>('rent_payments', {
      where,
      orderBy: [{ field: 'occurred_at', direction: 'desc' }],
      limit: 50,
    }),
    findMany<MaintenanceRow>('maintenance_requests', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 50,
    }),
    findMany<LeaseRow>('leases', { where, limit: 200 }),
    findMany<Tenant>('tenants', { where, limit: 500 }),
    findMany<Unit>('units', { where, limit: 1000 }),
    findMany<Property>('properties', { where, limit: 500 }),
    findById<UserOAuth>('users', userId),
  ])

  const tenantById = new Map(tenants.map((t) => [t.id, t]))
  const unitById = new Map(units.map((u) => [u.id, u]))
  const propertyById = new Map(properties.map((p) => [p.id, p]))
  const allUntil = user?.oauthData?.notifications_read?.all_until
    ? new Date(user.oauthData.notifications_read.all_until).getTime()
    : 0
  const ids = new Set(user?.oauthData?.notifications_read?.ids ?? [])
  const isUnread = (id: string, atIso?: string): boolean => {
    if (ids.has(id)) return false
    if (!atIso) return true
    return new Date(atIso).getTime() > allUntil
  }

  const out: DerivedNotification[] = []

  for (const p of payments.slice(0, 10)) {
    const tenant = p.tenant_id ? tenantById.get(p.tenant_id) : undefined
    const property = p.property_id ? propertyById.get(p.property_id) : undefined
    const tenantName = tenant
      ? `${tenant.first_name ?? ''} ${tenant.last_name ?? ''}`.trim()
      : 'Tenant'
    const amountCents = Math.round(Number(p.amount ?? 0) * 100)
    const id = `payment:${p.id}`
    const at = p.occurred_at ?? new Date().toISOString()
    if (p.status === 'paid') {
      out.push({
        id,
        category: 'payment',
        title: 'Rent received',
        body: `${tenantName} paid ${fmtMoney(amountCents)}${property ? ' for ' + property.name : ''}.`,
        unread: isUnread(id, at),
        href: '/finances',
        at,
      })
    } else if (p.status === 'overdue') {
      const due = p.due_date ?? p.occurred_at
      const days = due
        ? Math.max(0, Math.round((Date.now() - new Date(due).getTime()) / (1000 * 60 * 60 * 24)))
        : 0
      out.push({
        id,
        category: 'payment',
        title: 'Rent overdue',
        body: `${tenantName}'s ${fmtMoney(amountCents)} payment is ${days} days late.`,
        unread: isUnread(id, at),
        href: '/finances?filter=overdue',
        at,
      })
    }
  }

  for (const m of maintenance.slice(0, 10)) {
    const id = `maintenance:${m.id}`
    const at = m.created_at ?? new Date().toISOString()
    const unit = m.unit_id ? unitById.get(m.unit_id) : undefined
    const property = m.property_id
      ? propertyById.get(m.property_id)
      : unit?.property_id
        ? propertyById.get(unit.property_id)
        : undefined
    const where = property
      ? `${property.name}${unit?.unit_number ? ' · ' + unit.unit_number : ''}`
      : (unit?.unit_number ?? 'Unit')
    if (m.priority === 'high' || m.priority === 'urgent') {
      out.push({
        id,
        category: 'maintenance',
        title: 'High-priority work order',
        body: `${m.title ?? 'Maintenance request'} (${where}).`,
        unread: isUnread(id, at),
        href: `/maintenance/${m.id}`,
        at,
      })
    } else {
      out.push({
        id,
        category: 'maintenance',
        title: 'New work order',
        body: `${m.title ?? 'Maintenance request'} (${where}).`,
        unread: isUnread(id, at),
        href: `/maintenance/${m.id}`,
        at,
      })
    }
  }

  const now = Date.now()
  const sixtyDays = 60 * 24 * 60 * 60 * 1000
  for (const l of leases) {
    if (l.status !== 'active' || !l.end_date) continue
    const ms = new Date(l.end_date).getTime() - now
    if (ms < 0 || ms > sixtyDays) continue
    const id = `lease:${l.id}`
    const tenant = l.tenant_id ? tenantById.get(l.tenant_id) : undefined
    const unit = l.unit_id ? unitById.get(l.unit_id) : undefined
    const property = unit?.property_id ? propertyById.get(unit.property_id) : undefined
    out.push({
      id,
      category: 'lease',
      title: 'Lease expiring in 60 days',
      body: `${tenant ? `${tenant.first_name ?? ''} ${tenant.last_name ?? ''}`.trim() : 'Tenant'}'s lease (${property?.name ?? 'Property'}${unit?.unit_number ? ' ' + unit.unit_number : ''}) expires ${new Date(l.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.`,
      unread: isUnread(id, l.end_date),
      href: '/leases',
      at: l.end_date,
    })
  }

  out.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  return out.slice(0, 25)
}

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
    return
  }
  const items = await deriveNotifications(userId)
  const unread_count = items.filter((i) => i.unread).length
  res.json({ items, unread_count })
})

router.post('/mark-all-read', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
    return
  }
  const user = await findById<UserOAuth>('users', userId)
  const oauthData = (user?.oauthData ?? {}) as Record<string, unknown>
  oauthData.notifications_read = { all_until: new Date().toISOString(), ids: [] }
  await updateById('users', userId, { oauthData, updatedAt: new Date() })
  res.json({ ok: true, marked_at: new Date().toISOString() })
})

router.post('/:id/read', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
    return
  }
  const id = String(req.params.id)
  const user = await findById<UserOAuth>('users', userId)
  const oauthData = (user?.oauthData ?? {}) as Record<string, unknown>
  const prev =
    (oauthData.notifications_read as { all_until?: string; ids?: string[] } | undefined) ?? {}
  const ids = new Set(prev.ids ?? [])
  ids.add(id)
  oauthData.notifications_read = { all_until: prev.all_until, ids: Array.from(ids) }
  await updateById('users', userId, { oauthData, updatedAt: new Date() })
  res.json({ ok: true, id })
})

export default router
