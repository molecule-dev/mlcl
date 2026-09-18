import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { findMany, findOne } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

import { fiscalYearStart } from '../lib/fiscal-year.js'
import { isInvoiceOverdue } from '../lib/serialize.js'

const router = Router()

interface InvoiceRow {
  id: string
  user_id: string
  invoice_number: string | null
  customer_name: string | null
  status: string
  issue_date: string | Date | null
  due_date: string | Date | null
  paid_at: string | Date | null
  amount_cents: number | string
  total_cents: number | string
  tax_cents: number | string
  tax_jurisdiction: string | null
}

interface ExpenseRow {
  id: string
  user_id: string
  occurred_at: string | Date | null
  amount_cents: number | string
  tax_cents: number | string
  category: string | null
  category_color: string | null
  is_deductible: boolean
}

interface PaymentRow {
  id: string
  user_id: string
  received_at: string | Date | null
  amount_cents: number | string
  status: string
}

function n(v: unknown): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const parsed = Number(v)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function monthBucket(date: Date): string {
  // YYYY-MM
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

function lastTwelveMonths(now: Date): string[] {
  const out: string[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
    out.push(monthBucket(d))
  }
  return out
}

router.get('/dashboard_stats', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const invoices = await findMany<InvoiceRow>('invoices', { where })
    const expenses = await findMany<ExpenseRow>('expenses', { where })
    const payments = await findMany<PaymentRow>('invoice_payments', { where })

    // YTD is windowed from the company's fiscal-year start (Settings →
    // company_profile.fiscal_year_start), not a hardcoded January 1.
    const company = await findOne<{ fiscal_year_start?: string | null }>('company_profile', [
      { field: 'user_id', operator: '=', value: userId },
    ])
    const now = new Date()
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    const startOfYear = fiscalYearStart(now, company?.fiscal_year_start)

    let outstanding = 0
    let overdue = 0
    let mtd_revenue = 0
    let ytd_revenue = 0
    let ytd_expenses = 0
    let mtd_expenses = 0
    let cash_on_hand = 0

    for (const inv of invoices) {
      const total = n(inv.total_cents) || n(inv.amount_cents)
      if (inv.status === 'sent' || inv.status === 'overdue') outstanding += total
      // Derive overdue from due_date (nothing writes status='overdue') so the KPI isn't always 0.
      if (isInvoiceOverdue(inv, now)) overdue += total
      const paidAt = inv.paid_at ? new Date(inv.paid_at) : null
      if (paidAt) {
        if (paidAt >= startOfYear) ytd_revenue += total
        if (paidAt >= startOfMonth) mtd_revenue += total
      }
    }

    for (const e of expenses) {
      const amount = n(e.amount_cents)
      const occurred = e.occurred_at ? new Date(e.occurred_at) : null
      if (occurred) {
        if (occurred >= startOfYear) ytd_expenses += amount
        if (occurred >= startOfMonth) mtd_expenses += amount
      }
    }

    for (const p of payments) {
      if (p.status === 'received') cash_on_hand += n(p.amount_cents)
      if (p.status === 'refunded') cash_on_hand -= n(p.amount_cents)
    }

    const months = lastTwelveMonths(now)
    const revenueByMonth = new Map<string, number>(months.map((m) => [m, 0]))
    for (const inv of invoices) {
      const paidAt = inv.paid_at ? new Date(inv.paid_at) : null
      if (!paidAt) continue
      const bucket = monthBucket(paidAt)
      if (revenueByMonth.has(bucket)) {
        revenueByMonth.set(
          bucket,
          (revenueByMonth.get(bucket) ?? 0) + (n(inv.total_cents) || n(inv.amount_cents)),
        )
      }
    }
    const revenue_history = months.map((m) => ({
      month: m,
      amount_cents: revenueByMonth.get(m) ?? 0,
    }))

    res.json({
      cash_on_hand_cents: cash_on_hand,
      outstanding_cents: outstanding,
      overdue_cents: overdue,
      mtd_revenue_cents: mtd_revenue,
      mtd_expenses_cents: mtd_expenses,
      ytd_revenue_cents: ytd_revenue,
      ytd_profit_cents: ytd_revenue - ytd_expenses,
      revenue_history,
    })
  } catch (_err) {
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.get('/full', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const invoices = await findMany<InvoiceRow>('invoices', { where })
    const expenses = await findMany<ExpenseRow>('expenses', { where })
    const payments = await findMany<PaymentRow>('invoice_payments', { where })

    const now = new Date()
    const months = lastTwelveMonths(now)
    const revenueByMonth = new Map<string, number>(months.map((m) => [m, 0]))
    const expenseByMonth = new Map<string, number>(months.map((m) => [m, 0]))
    const cashInByMonth = new Map<string, number>(months.map((m) => [m, 0]))
    const cashOutByMonth = new Map<string, number>(months.map((m) => [m, 0]))

    for (const inv of invoices) {
      const paidAt = inv.paid_at ? new Date(inv.paid_at) : null
      if (!paidAt) continue
      const bucket = monthBucket(paidAt)
      const amount = n(inv.total_cents) || n(inv.amount_cents)
      if (revenueByMonth.has(bucket))
        revenueByMonth.set(bucket, (revenueByMonth.get(bucket) ?? 0) + amount)
    }

    for (const e of expenses) {
      const occurred = e.occurred_at ? new Date(e.occurred_at) : null
      if (!occurred) continue
      const bucket = monthBucket(occurred)
      const amount = n(e.amount_cents)
      if (expenseByMonth.has(bucket))
        expenseByMonth.set(bucket, (expenseByMonth.get(bucket) ?? 0) + amount)
      if (cashOutByMonth.has(bucket))
        cashOutByMonth.set(bucket, (cashOutByMonth.get(bucket) ?? 0) + amount)
    }

    for (const p of payments) {
      const received = p.received_at ? new Date(p.received_at) : null
      if (!received) continue
      const bucket = monthBucket(received)
      const amount = n(p.amount_cents)
      if (p.status === 'received' && cashInByMonth.has(bucket)) {
        cashInByMonth.set(bucket, (cashInByMonth.get(bucket) ?? 0) + amount)
      }
    }

    const pnl_history = months.map((m) => ({
      month: m,
      revenue_cents: revenueByMonth.get(m) ?? 0,
      expenses_cents: expenseByMonth.get(m) ?? 0,
    }))

    const cash_flow_history = months.map((m) => ({
      month: m,
      in_cents: cashInByMonth.get(m) ?? 0,
      out_cents: cashOutByMonth.get(m) ?? 0,
    }))

    const expenseByCategory = new Map<string, { amount_cents: number; color: string }>()
    for (const e of expenses) {
      const category = e.category ?? 'Uncategorized'
      const cur = expenseByCategory.get(category) ?? {
        amount_cents: 0,
        color: e.category_color ?? '#888',
      }
      cur.amount_cents += n(e.amount_cents)
      if (!cur.color && e.category_color) cur.color = e.category_color
      expenseByCategory.set(category, cur)
    }
    const expense_breakdown = Array.from(expenseByCategory.entries()).map(([category, v]) => ({
      category,
      amount_cents: v.amount_cents,
      color: v.color || '#888888',
    }))

    let cash_on_hand = 0
    let outstanding = 0
    for (const p of payments) {
      if (p.status === 'received') cash_on_hand += n(p.amount_cents)
      if (p.status === 'refunded') cash_on_hand -= n(p.amount_cents)
    }
    for (const inv of invoices) {
      if (inv.status === 'sent' || inv.status === 'overdue')
        outstanding += n(inv.total_cents) || n(inv.amount_cents)
    }
    const balance_sheet = {
      assets_cents: cash_on_hand + outstanding,
      liabilities_cents: 0,
      equity_cents: cash_on_hand + outstanding,
    }

    res.json({ pnl_history, expense_breakdown, cash_flow_history, balance_sheet })
  } catch (_err) {
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.get('/taxes', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const invoices = await findMany<InvoiceRow>('invoices', { where })
    const expenses = await findMany<ExpenseRow>('expenses', { where })

    let collected = 0
    let owed = 0
    let estimated = 0
    let deductible = 0

    const byJurisdictionMap = new Map<
      string,
      { rate_pct: number; collected_cents: number; remitted_cents: number }
    >()
    for (const inv of invoices) {
      const tax = n(inv.tax_cents)
      collected += tax
      const jurisdiction = inv.tax_jurisdiction ?? 'Default'
      const cur = byJurisdictionMap.get(jurisdiction) ?? {
        rate_pct: 0,
        collected_cents: 0,
        remitted_cents: 0,
      }
      cur.collected_cents += tax
      byJurisdictionMap.set(jurisdiction, cur)
    }

    for (const e of expenses) {
      if (e.is_deductible) deductible += n(e.amount_cents)
    }

    owed = Math.max(0, collected)
    estimated = Math.round(owed / 4)

    const by_jurisdiction = Array.from(byJurisdictionMap.entries()).map(([jurisdiction, v]) => ({
      jurisdiction,
      rate_pct: v.rate_pct,
      collected_cents: v.collected_cents,
      remitted_cents: v.remitted_cents,
    }))

    const deductibleByCategory = new Map<string, number>()
    for (const e of expenses) {
      if (!e.is_deductible) continue
      const category = e.category ?? 'Uncategorized'
      deductibleByCategory.set(
        category,
        (deductibleByCategory.get(category) ?? 0) + n(e.amount_cents),
      )
    }
    const deductibles_breakdown = Array.from(deductibleByCategory.entries()).map(
      ([category, amountCents]) => ({
        category,
        amount_cents: amountCents,
      }),
    )

    const now = new Date()
    const year = now.getUTCFullYear()
    const quarterly_estimates = [
      {
        quarter: `Q1 ${year}`,
        due_date: new Date(Date.UTC(year, 3, 15)).toISOString(),
        estimated_cents: estimated,
        paid_cents: 0,
        status: 'upcoming' as const,
      },
      {
        quarter: `Q2 ${year}`,
        due_date: new Date(Date.UTC(year, 5, 15)).toISOString(),
        estimated_cents: estimated,
        paid_cents: 0,
        status: 'upcoming' as const,
      },
      {
        quarter: `Q3 ${year}`,
        due_date: new Date(Date.UTC(year, 8, 15)).toISOString(),
        estimated_cents: estimated,
        paid_cents: 0,
        status: 'upcoming' as const,
      },
      {
        quarter: `Q4 ${year}`,
        due_date: new Date(Date.UTC(year + 1, 0, 15)).toISOString(),
        estimated_cents: estimated,
        paid_cents: 0,
        status: 'upcoming' as const,
      },
    ]

    const filing_checklist: { id: string; description: string; due_date: string; done: boolean }[] =
      []

    res.json({
      collected_cents: collected,
      owed_cents: owed,
      estimated_cents: estimated,
      deductible_cents: deductible,
      by_jurisdiction,
      deductibles_breakdown,
      quarterly_estimates,
      filing_checklist,
    })
  } catch (_err) {
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
