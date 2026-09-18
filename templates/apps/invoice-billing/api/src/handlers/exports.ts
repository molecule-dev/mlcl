/**
 * CSV export endpoints for invoices and payments.
 *
 *   GET /api/exports/invoices.csv
 *   GET /api/exports/payments.csv
 *
 * Returns text/csv. Free tier is gated — pro+ only — to mirror the
 * `canExport` limit advertised on the pricing page.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findMany } from '@molecule/api-database'
import { getEffectiveTier } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'

import type { InvoiceBillingLimits } from '../tiers.js'

const router = Router()

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return ''
  let str = String(value)
  // [L2-1] Neutralize CSV/formula injection (CWE-1236): a cell starting with = + - @ or a
  // leading tab/CR is executed as a formula by Excel/Sheets/LibreOffice. Prefix a single
  // quote (the standard text marker, stripped on display) BEFORE RFC-4180 quoting; genuine
  // numbers are exempt so negative values aren't mangled (mirrors the shared csv escapeField).
  if (!/^-?\d+(\.\d+)?$/.test(str) && /^[=+\-@\t\r]/.test(str)) str = `'${str}`
  if (/[",\n\r]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

function rowsToCsv(headers: string[], rows: Array<Record<string, unknown>>): string {
  const headerLine = headers.join(',')
  const bodyLines = rows.map((row) => headers.map((h) => csvEscape(row[h])).join(','))
  return [headerLine, ...bodyLines].join('\n') + '\n'
}

async function requirePaidTier(userId: string, res: Response): Promise<boolean> {
  const tier = await getEffectiveTier<InvoiceBillingLimits>(res)
  if (!tier.limits.canExport) {
    res.status(402).json({
      error: t('exports.error.requiresPaidPlan', undefined, {
        defaultValue: 'CSV export is a Pro/Team feature. Upgrade your plan to download invoices.',
      }),
      limitType: 'canExport',
    })
    return false
  }
  void userId
  return true
}

router.get('/invoices.csv', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  if (!(await requirePaidTier(userId, res))) return

  const invoices = await findMany<Record<string, unknown>>('invoices', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'created_at', direction: 'desc' }],
  })

  const headers = [
    'invoice_number',
    'client_name',
    'client_company',
    'status',
    'subtotal',
    'tax_rate',
    'tax_amount',
    'total',
    'amount_paid',
    'currency',
    'due_date',
    'sent_at',
    'created_at',
  ]
  const csv = rowsToCsv(headers, invoices)

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="invoices.csv"')
  res.send(csv)
})

router.get('/payments.csv', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  if (!(await requirePaidTier(userId, res))) return

  const payments = await findMany<Record<string, unknown>>('invoice_payments', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'created_at', direction: 'desc' }],
  })

  const headers = [
    'invoice_number',
    'client_name',
    'method',
    'reference',
    'amount',
    'status',
    'created_at',
  ]
  const csv = rowsToCsv(headers, payments)

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="payments.csv"')
  res.send(csv)
})

export default router
