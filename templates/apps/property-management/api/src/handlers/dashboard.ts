/**
 * Dashboard overview — aggregate KPIs derived from real owner-scoped
 * data. Used by /dashboard, /properties summary header, etc.
 *
 * Returns the shape the React client expects:
 *
 * {
 *   total_rent_collected_cents,
 *   rent_change_30d_cents,
 *   rent_history_12mo: number[12],
 *   occupied_units, total_units, vacant_units,
 *   overdue_count,
 *   lease_expiring_count,
 * }
 *
 * Errors bubble — no try/catch swallowing. The /api error middleware in
 * server.ts will surface failures as 500 with logs, which is the contract.
 */
import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findMany, type WhereCondition } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

const router = Router()

interface UnitRow {
  id: string
  status?: string
}
interface LeaseRow {
  unit_id?: string
  status?: string
  end_date?: string | null
}
interface PaymentRow {
  status?: string
  amount?: number | string
  occurred_at?: string
}
interface MaintenanceRow {
  status?: string
  priority?: string
}

router.get('/overview', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
    return
  }
  const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]

  const [units, leases, payments, maintenance] = await Promise.all([
    findMany<UnitRow>('units', { where }),
    findMany<LeaseRow>('leases', { where }),
    findMany<PaymentRow>('rent_payments', {
      where,
      orderBy: [{ field: 'occurred_at', direction: 'desc' }],
    }),
    findMany<MaintenanceRow>('maintenance_requests', { where }),
  ])

  const total_units = units.length
  const activeLeaseUnitIds = new Set(
    leases.filter((l) => l.status === 'active' && l.unit_id).map((l) => l.unit_id as string),
  )
  const occupied_units = units.filter(
    (u) => u.status === 'occupied' || activeLeaseUnitIds.has(u.id),
  ).length
  const vacant_units = total_units - occupied_units

  // Lease "expiring" = active lease with end_date within next 60 days.
  const now = Date.now()
  const sixtyDays = 60 * 24 * 60 * 60 * 1000
  const lease_expiring_count = leases.filter((l) => {
    if (l.status !== 'active' || !l.end_date) return false
    const ms = new Date(l.end_date).getTime() - now
    return ms >= 0 && ms <= sixtyDays
  }).length

  // Open maintenance count
  const overdue_count = payments.filter((p) => p.status === 'overdue').length

  // Rent collected = sum of paid amounts.
  const total_rent_collected_cents = payments
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + Math.round(Number(p.amount ?? 0) * 100), 0)

  // Rent change 30d = paid(last 30d) - paid(prior 30d).
  const thirty = 30 * 24 * 60 * 60 * 1000
  const last30 = payments
    .filter(
      (p) =>
        p.status === 'paid' && p.occurred_at && now - new Date(p.occurred_at).getTime() < thirty,
    )
    .reduce((s, p) => s + Math.round(Number(p.amount ?? 0) * 100), 0)
  const prior30 = payments
    .filter((p) => {
      if (p.status !== 'paid' || !p.occurred_at) return false
      const age = now - new Date(p.occurred_at).getTime()
      return age >= thirty && age < 2 * thirty
    })
    .reduce((s, p) => s + Math.round(Number(p.amount ?? 0) * 100), 0)
  const rent_change_30d_cents = last30 - prior30

  // Rent history monthly buckets (last 12 months, oldest first).
  const buckets = new Array(12).fill(0)
  for (const p of payments) {
    if (p.status !== 'paid' || !p.occurred_at) continue
    const d = new Date(p.occurred_at)
    const monthsAgo =
      (new Date().getFullYear() - d.getFullYear()) * 12 + (new Date().getMonth() - d.getMonth())
    if (monthsAgo >= 0 && monthsAgo < 12) {
      buckets[11 - monthsAgo] += Math.round(Number(p.amount ?? 0) * 100)
    }
  }
  // Convert to dollars (rounded) for display sparkline parity with FALLBACK_STATS.
  const rent_history_12mo = buckets.map((c) => Math.round(c / 100))

  // Open maintenance count surfaced as counter for the dashboard hero.
  const open_maintenance_count = maintenance.filter(
    (m) => m.status === 'open' || m.status === 'in_progress',
  ).length

  res.json({
    total_rent_collected_cents,
    rent_change_30d_cents,
    rent_history_12mo,
    occupied_units,
    total_units,
    vacant_units,
    overdue_count,
    lease_expiring_count,
    open_maintenance_count,
  })
})

export default router
