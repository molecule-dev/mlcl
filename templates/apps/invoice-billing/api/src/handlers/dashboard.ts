/**
 * Dashboard read endpoints.
 *
 *   GET /api/dashboard/summary    — aggregated KPIs (drafts/sent/paid counts,
 *                                   collected MTD, recurring count)
 *   GET /api/dashboard/activity   — recent invoice + payment events for the
 *                                   activity feed (real, derived from the DB,
 *                                   not stubbed)
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { count, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import { ensureDemoSeeded } from './_seed.js'

const router = Router()

interface InvoiceRow {
  id: string
  user_id: string
  client_id?: string | null
  client_name?: string | null
  invoice_number?: string | null
  status?: string | null
  total?: string | number | null
  amount_paid?: string | number | null
  due_date?: string | Date | null
  sent_at?: string | Date | null
  created_at?: string | Date | null
}

interface PaymentRow {
  id: string
  user_id: string
  invoice_id?: string | null
  invoice_number?: string | null
  client_name?: string | null
  amount?: string | number | null
  method?: string | null
  status?: string | null
  created_at?: string | Date | null
}

router.get('/summary', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    await ensureDemoSeeded(userId)

    const allInvoices = await findMany<InvoiceRow>('invoices', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
    })
    const allPayments = await findMany<PaymentRow>('invoice_payments', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
    })
    const recurringCount = await count('recurring_invoices', [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'is_active', operator: '=', value: true },
    ])

    const now = Date.now()
    const monthStart = new Date()
    monthStart.setUTCDate(1)
    monthStart.setUTCHours(0, 0, 0, 0)
    const monthStartTime = monthStart.getTime()

    let drafts = 0
    let sent = 0
    let paid = 0
    let overdueCount = 0
    let overdueAmount = 0
    let outstandingTotal = 0
    let paidThisWeek = 0

    for (const inv of allInvoices) {
      const status = String(inv.status ?? 'draft').toLowerCase()
      const total = Number(inv.total ?? 0)
      const amountPaid = Number(inv.amount_paid ?? 0)
      const due = inv.due_date ? new Date(inv.due_date).getTime() : null
      const created = inv.created_at ? new Date(inv.created_at).getTime() : 0

      if (status === 'draft') drafts++
      else if (status === 'sent' || status === 'viewed') sent++
      if (status === 'paid' && created >= now - 7 * 86400000) paidThisWeek++

      const open = ['sent', 'viewed', 'partial', 'overdue'].includes(status)
      if (open) outstandingTotal += total - amountPaid
      const isOverdue = open && due !== null && due < now
      if (isOverdue) {
        overdueCount += 1
        overdueAmount += total - amountPaid
      }
    }

    let collectedThisMonth = 0
    let collectedAllTime = 0
    for (const p of allPayments) {
      if (String(p.status ?? '').toLowerCase() !== 'completed') continue
      const amt = Number(p.amount ?? 0)
      collectedAllTime += amt
      const created = p.created_at ? new Date(p.created_at).getTime() : 0
      if (created >= monthStartTime) collectedThisMonth += amt
    }

    paid = allInvoices.filter((i) => String(i.status ?? '').toLowerCase() === 'paid').length

    // Compute MTD-vs-prior-month change %, since the frontend hero shows it.
    const prevMonthStart = new Date(monthStart)
    prevMonthStart.setUTCMonth(prevMonthStart.getUTCMonth() - 1)
    const prevMonthEndTime = monthStartTime
    const prevMonthStartTime = prevMonthStart.getTime()
    let prevMonthCollected = 0
    for (const p of allPayments) {
      if (String(p.status ?? '').toLowerCase() !== 'completed') continue
      const created = p.created_at ? new Date(p.created_at).getTime() : 0
      if (created >= prevMonthStartTime && created < prevMonthEndTime) {
        prevMonthCollected += Number(p.amount ?? 0)
      }
    }
    const changePct =
      prevMonthCollected > 0
        ? ((collectedThisMonth - prevMonthCollected) / prevMonthCollected) * 100
        : 0

    const openInvoices = allInvoices.filter((i) =>
      ['sent', 'viewed', 'partial', 'overdue'].includes(String(i.status ?? '').toLowerCase()),
    ).length

    res.json({
      // Flat shape consumed by app/src/pages/Dashboard.tsx
      outstanding_cents: Math.round(outstandingTotal * 100),
      overdue_cents: Math.round(overdueAmount * 100),
      collected_this_month_cents: Math.round(collectedThisMonth * 100),
      collected_all_time_cents: Math.round(collectedAllTime * 100),
      open_invoices: openInvoices,
      draft_count: drafts,
      sent_count: sent,
      paid_count: paid,
      paid_this_week_count: paidThisWeek,
      overdue_count: overdueCount,
      recurring_active_count: Number(recurringCount),
      change_pct: Math.round(changePct * 10) / 10,
    })
  } catch (error) {
    logger.error('dashboard.summary', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.get('/activity', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    await ensureDemoSeeded(userId)

    const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 20)))

    const invoices = await findMany<InvoiceRow>('invoices', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 50,
    })
    const payments = await findMany<PaymentRow>('invoice_payments', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 50,
    })

    type Item = {
      id: string
      kind: 'created' | 'sent' | 'paid' | 'overdue' | 'recurring'
      invoice_number: string
      client_name: string
      message: string
      amount_cents?: number
      occurred_at: string
    }
    const items: Item[] = []

    const now = Date.now()
    for (const inv of invoices) {
      const num = String(inv.invoice_number ?? 'INV-???')
      const client = String(inv.client_name ?? 'Client')
      const total = Number(inv.total ?? 0)
      items.push({
        id: `inv-created-${inv.id}`,
        kind: 'created',
        invoice_number: num,
        client_name: client,
        message: `Drafted ${num}`,
        amount_cents: Math.round(total * 100),
        occurred_at: inv.created_at
          ? new Date(inv.created_at).toISOString()
          : new Date().toISOString(),
      })
      if (inv.sent_at) {
        items.push({
          id: `inv-sent-${inv.id}`,
          kind: 'sent',
          invoice_number: num,
          client_name: client,
          message: `Sent ${num} to ${client}`,
          amount_cents: Math.round(total * 100),
          occurred_at: new Date(inv.sent_at).toISOString(),
        })
      }
      const status = String(inv.status ?? '').toLowerCase()
      const due = inv.due_date ? new Date(inv.due_date).getTime() : null
      if (['sent', 'viewed', 'partial'].includes(status) && due !== null && due < now) {
        items.push({
          id: `inv-overdue-${inv.id}`,
          kind: 'overdue',
          invoice_number: num,
          client_name: client,
          message: `${num} is past due`,
          amount_cents: Math.round((total - Number(inv.amount_paid ?? 0)) * 100),
          occurred_at: new Date(due).toISOString(),
        })
      }
    }

    for (const p of payments) {
      const num = String(p.invoice_number ?? 'INV-???')
      const client = String(p.client_name ?? 'Client')
      const amt = Number(p.amount ?? 0)
      items.push({
        id: `pay-${p.id}`,
        kind: 'paid',
        invoice_number: num,
        client_name: client,
        message: `${client} paid ${num}`,
        amount_cents: Math.round(amt * 100),
        occurred_at: p.created_at ? new Date(p.created_at).toISOString() : new Date().toISOString(),
      })
    }

    items.sort((a, b) => (a.occurred_at < b.occurred_at ? 1 : -1))
    res.json(items.slice(0, limit))
  } catch (error) {
    logger.error('dashboard.activity', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
