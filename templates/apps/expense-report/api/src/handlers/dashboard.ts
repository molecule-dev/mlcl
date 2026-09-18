/**
 * Dashboard handler — composes the rollup KPIs that
 * `pages/Dashboard.tsx` renders.
 *
 * Returns the `DashboardSnapshot` shape exactly:
 *
 * - `recovered_cents`            — total reimbursed across all-time
 * - `recovered_change_cents`     — month-over-month delta in reimbursed
 * - `pending_count`              — reports submitted by user OR awaiting
 *                                 user approval (queue length)
 * - `approved_this_month`        — count of reports approved this month
 * - `rejected_this_month`        — count of reports rejected this month
 * - `reimbursed_this_month_cents` — sum of reimbursed amounts this month
 * - `awaiting_receipts`          — count of expenses with no receipt_url
 * - `recent_reports`             — last 6 reports, decorated for the
 *                                  recent-reports list on the dashboard
 *
 * Triggers the demo seed on first authenticated request so the dashboard
 * is never blank for fresh signups.
 *
 * @module
 */

import { type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

import { seedDemoForUser } from './_seed.js'

const router = Router()

interface ReportRow {
  id?: string
  user_id?: string
  approver_id?: string | null
  submitter_email?: string | null
  title?: string
  description?: string | null
  status?: string
  total_amount?: number | string | null
  submitted_at?: string | Date | null
  approved_at?: string | Date | null
  rejected_at?: string | Date | null
  reimbursed_at?: string | Date | null
  created_at?: string | Date | null
}

interface ExpenseRow {
  id?: string
  user_id?: string
  amount?: number | string
  receipt_url?: string | null
  status?: string
}

function num(v: unknown): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

function cents(v: unknown): number {
  return Math.round(num(v) * 100)
}

function ts(v: string | Date | null | undefined): number {
  if (!v) return 0
  if (v instanceof Date) return v.getTime()
  const t = new Date(v).getTime()
  return Number.isFinite(t) ? t : 0
}

function startOfMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime()
}

router.get('/summary', async (_req, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  try {
    await seedDemoForUser(userId)
  } catch (err) {
    console.warn('seedDemoForUser failed', err)
  }

  const ownReports = await findMany<ReportRow>('expense_reports', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'created_at', direction: 'desc' }],
    limit: 200,
  })
  const approvalQueue = await findMany<ReportRow>('expense_reports', {
    where: [
      { field: 'approver_id', operator: '=', value: userId },
      { field: 'status', operator: '=', value: 'submitted' },
    ],
    orderBy: [{ field: 'submitted_at', direction: 'desc' }],
    limit: 200,
  })
  const ownExpenses = await findMany<ExpenseRow>('expenses', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    limit: 500,
  })

  const now = new Date()
  const monthStart = startOfMonth(now)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime()

  let recoveredCents = 0
  let reimbursedThisMonthCents = 0
  let reimbursedLastMonthCents = 0
  let approvedThisMonth = 0
  let rejectedThisMonth = 0

  for (const r of ownReports) {
    const total = cents(r.total_amount)
    if (r.status === 'reimbursed') {
      recoveredCents += total
      const at = ts(r.reimbursed_at)
      if (at >= monthStart) reimbursedThisMonthCents += total
      else if (at >= lastMonthStart) reimbursedLastMonthCents += total
    }
    if (r.status === 'approved') {
      const at = ts(r.approved_at)
      if (at >= monthStart) approvedThisMonth++
    }
    if (r.status === 'rejected') {
      const at = ts(r.rejected_at)
      if (at >= monthStart) rejectedThisMonth++
    }
  }

  const pendingOwn = ownReports.filter((r) => r.status === 'submitted').length
  const pendingCount = pendingOwn + approvalQueue.length

  const awaitingReceipts = ownExpenses.filter((e) => !e.receipt_url).length

  const recentSource = [...ownReports]
    .filter((r) => r.status !== 'draft')
    .sort((a, b) => ts(b.submitted_at) - ts(a.submitted_at))
    .slice(0, 6)

  const recentReports = recentSource.map((r) => ({
    id: r.id,
    title: r.title ?? '',
    status: r.status ?? 'draft',
    total_amount_cents: cents(r.total_amount),
    submitter_name: 'You',
    submitted_at:
      (typeof r.submitted_at === 'string'
        ? r.submitted_at
        : r.submitted_at instanceof Date
          ? r.submitted_at.toISOString()
          : null) ?? new Date().toISOString(),
  }))

  res.json({
    recovered_cents: recoveredCents,
    recovered_change_cents: reimbursedThisMonthCents - reimbursedLastMonthCents,
    pending_count: pendingCount,
    approved_this_month: approvedThisMonth,
    rejected_this_month: rejectedThisMonth,
    reimbursed_this_month_cents: reimbursedThisMonthCents,
    awaiting_receipts: awaitingReceipts,
    recent_reports: recentReports,
  })
})

export default router
