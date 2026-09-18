/**
 * Reports handler — owner-scoped portfolio analytics derived from real
 * tables. Returns top-line KPIs (gross revenue, net income, occupancy,
 * arrears) and a per-property breakdown.
 */
import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findMany, type WhereCondition } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

const router = Router()

interface Property {
  id: string
  name: string
}
interface Unit {
  id: string
  property_id?: string
  status?: string
  monthly_rent?: number | string
}
interface Payment {
  property_id?: string | null
  amount?: number | string
  status?: string
  occurred_at?: string
}
interface Expense {
  property_id?: string | null
  amount?: number | string
  occurred_at?: string
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
  const [properties, units, payments, expenses] = await Promise.all([
    findMany<Property>('properties', { where, limit: 500 }),
    findMany<Unit>('units', { where, limit: 5000 }),
    findMany<Payment>('rent_payments', { where, limit: 5000 }),
    findMany<Expense>('expenses', { where, limit: 5000 }),
  ])

  const grossCents = payments
    .filter((p) => p.status === 'paid')
    .reduce((s, p) => s + Math.round(Number(p.amount ?? 0) * 100), 0)
  const expenseCents = expenses.reduce((s, e) => s + Math.round(Number(e.amount ?? 0) * 100), 0)
  const arrearsCents = payments
    .filter((p) => p.status === 'overdue')
    .reduce((s, p) => s + Math.round(Number(p.amount ?? 0) * 100), 0)

  const occupancyPct =
    units.length > 0
      ? Math.round((units.filter((u) => u.status === 'occupied').length / units.length) * 100)
      : 0

  const propertyBreakdown = properties.map((p) => {
    const unitsHere = units.filter((u) => u.property_id === p.id)
    const paidHere = payments.filter((pay) => pay.property_id === p.id && pay.status === 'paid')
    const arrearsHere = payments.filter(
      (pay) => pay.property_id === p.id && pay.status === 'overdue',
    )
    return {
      id: p.id,
      name: p.name,
      units_count: unitsHere.length,
      occupied_count: unitsHere.filter((u) => u.status === 'occupied').length,
      occupancy_pct:
        unitsHere.length > 0
          ? Math.round(
              (unitsHere.filter((u) => u.status === 'occupied').length / unitsHere.length) * 100,
            )
          : 0,
      revenue_cents: paidHere.reduce((s, pay) => s + Math.round(Number(pay.amount ?? 0) * 100), 0),
      arrears_cents: arrearsHere.reduce(
        (s, pay) => s + Math.round(Number(pay.amount ?? 0) * 100),
        0,
      ),
    }
  })

  res.json({
    range: 't12m',
    kpis: {
      gross_revenue_cents: grossCents,
      net_income_cents: grossCents - expenseCents,
      avg_occupancy_pct: occupancyPct,
      arrears_cents: arrearsCents,
    },
    property_breakdown: propertyBreakdown,
  })
})

export default router
