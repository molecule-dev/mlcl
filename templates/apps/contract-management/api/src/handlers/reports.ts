/**
 * Reports endpoints. Each computes its result via direct
 * @molecule/api-database queries scoped to the authenticated user so
 * dashboards never leak across tenants and so empty-account responses
 * are always shape-complete (zeroed) rather than absent.
 *
 * /reports/dashboard_stats — single-row KPI block consumed by Dashboard.tsx
 * /reports/expiring_soon   — list of contracts expiring in <= 30 days
 * /reports/full            — Reports.tsx payload (throughput, status mix,
 *                            counterparty value, renewals)
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'

import { findMany } from '@molecule/api-database'
import { authorizers } from '@molecule/api-resource-user'

const router = Router()

router.use(authorizers.auth())

interface ContractRow {
  id: string
  user_id: string
  title: string
  party_name: string | null
  type: string | null
  status: string | null
  amount_cents: number | null
  expires_at: string | null
  effective_at: string | null
  created_at: string | null
  updated_at: string | null
  signed_at: string | null
  sent_at: string | null
}

const DAY_MS = 86_400_000

async function loadUserContracts(userId: string): Promise<ContractRow[]> {
  return findMany<ContractRow>('contracts', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    limit: 10_000,
  })
}

router.get('/dashboard_stats', async (_req: Request, res: Response) => {
  const userId = res.locals.session.userId as string
  const contracts = await loadUserContracts(userId)

  const totalContracts = contracts.length
  const pendingSignature = contracts.filter((c) => c.status === 'pending').length
  const active = contracts.filter((c) => c.status === 'active').length
  const totalValueCents = contracts.reduce((sum, c) => sum + (c.amount_cents ?? 0), 0)

  const now = Date.now()
  const in30 = now + 30 * DAY_MS
  const expiring30d = contracts.filter((c) => {
    if (!c.expires_at) return false
    const t = Date.parse(c.expires_at)
    return Number.isFinite(t) && t >= now && t <= in30
  }).length

  const cycles = contracts
    .filter((c) => c.sent_at && c.signed_at)
    .map((c) => (Date.parse(c.signed_at!) - Date.parse(c.sent_at!)) / DAY_MS)
    .filter((d) => Number.isFinite(d) && d >= 0)
  const cycleTimeDays =
    cycles.length > 0 ? Math.round(cycles.reduce((s, d) => s + d, 0) / cycles.length) : 0

  res.json({
    total_contracts: totalContracts,
    pending_signature: pendingSignature,
    active,
    expiring_30d: expiring30d,
    total_value_cents: totalValueCents,
    cycle_time_days: cycleTimeDays,
  })
})

router.get('/expiring_soon', async (_req: Request, res: Response) => {
  const userId = res.locals.session.userId as string
  const contracts = await loadUserContracts(userId)
  const now = Date.now()
  const in30 = now + 30 * DAY_MS

  const rows = contracts
    .filter((c) => {
      if (!c.expires_at) return false
      const t = Date.parse(c.expires_at)
      return Number.isFinite(t) && t >= now && t <= in30
    })
    .sort((a, b) => Date.parse(a.expires_at!) - Date.parse(b.expires_at!))
    .slice(0, 25)
    .map((c) => ({
      id: c.id,
      title: c.title,
      counterparty: c.party_name ?? '',
      expires_at: c.expires_at!,
      amount_cents: c.amount_cents ?? 0,
    }))

  res.json(rows)
})

router.get('/full', async (_req: Request, res: Response) => {
  const userId = res.locals.session.userId as string
  const contracts = await loadUserContracts(userId)

  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]
  const now = new Date()
  const buckets: { month: string; sent: number; signed: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getUTCFullYear(), now.getUTCMonth() - i, 1)
    buckets.push({ month: months[d.getUTCMonth()] ?? '', sent: 0, signed: 0 })
  }
  for (const c of contracts) {
    if (c.sent_at) {
      const d = new Date(c.sent_at)
      const idx =
        (now.getUTCFullYear() - d.getUTCFullYear()) * 12 + (now.getUTCMonth() - d.getUTCMonth())
      const slot = 5 - idx
      if (slot >= 0 && slot < buckets.length) buckets[slot]!.sent++
    }
    if (c.signed_at) {
      const d = new Date(c.signed_at)
      const idx =
        (now.getUTCFullYear() - d.getUTCFullYear()) * 12 + (now.getUTCMonth() - d.getUTCMonth())
      const slot = 5 - idx
      if (slot >= 0 && slot < buckets.length) buckets[slot]!.signed++
    }
  }

  const valueByTypeMap = new Map<string, number>()
  for (const c of contracts) {
    const k = c.type ?? 'other'
    valueByTypeMap.set(k, (valueByTypeMap.get(k) ?? 0) + (c.amount_cents ?? 0))
  }
  const valueByType = [...valueByTypeMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([type, totalCents]) => ({ type, total_cents: totalCents }))

  const renewalMap = new Map<string, { count: number; total_cents: number }>()
  const in90 = Date.now() + 90 * DAY_MS
  const renewable = contracts.filter((c) => {
    if (!c.expires_at) return false
    const t = Date.parse(c.expires_at)
    return Number.isFinite(t) && t >= Date.now() && t <= in90
  })
  for (const c of renewable) {
    const k = c.party_name ?? ''
    const existing = renewalMap.get(k) ?? { count: 0, total_cents: 0 }
    existing.count++
    existing.total_cents += c.amount_cents ?? 0
    renewalMap.set(k, existing)
  }
  const renewalPipeline = [...renewalMap.entries()]
    .sort((a, b) => b[1].total_cents - a[1].total_cents)
    .map(([counterparty, agg]) => ({
      counterparty,
      count: agg.count,
      total_cents: agg.total_cents,
    }))

  const statusCounts: Record<string, number> = {
    draft: 0,
    pending: 0,
    active: 0,
    expiring: 0,
    expired: 0,
    voided: 0,
    terminated: 0,
  }
  const now30 = Date.now() + 30 * DAY_MS
  for (const c of contracts) {
    let s = c.status ?? 'draft'
    const t = c.expires_at ? Date.parse(c.expires_at) : null
    if (s === 'active' && t && Number.isFinite(t) && t >= Date.now() && t <= now30) s = 'expiring'
    if (s in statusCounts) statusCounts[s] = (statusCounts[s] ?? 0) + 1
  }
  const statusMix = Object.entries(statusCounts).map(([status, count]) => ({ status, count }))

  res.json({
    throughput_history: buckets,
    value_by_type: valueByType,
    renewal_pipeline: renewalPipeline,
    status_mix: statusMix,
  })
})

export default router
