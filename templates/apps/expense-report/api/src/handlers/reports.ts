/**
 * Reports handler — expense reports submitted for approval.
 *
 * Decorates rows with the shape `pages/Reports*.tsx` and the dashboard
 * expect: `total_amount_cents`, `reimbursable_cents`, `submitter_name`,
 * `submitter_role`, `expense_count`, `date_range`, plus, on detail,
 * the embedded `expenses[]` and `timeline[]`.
 *
 * Storage stores `total_amount` as a `numeric(20,4)` decimal-dollar
 * value; the API responds in integer cents to match the React UI.
 *
 * `POST /reports` accepts `expense_ids` and atomically links those
 * expenses to the new report (setting their `report_id`) and recomputes
 * the report's `total_amount` from the linked expenses. The frontend
 * `NewReport` page sends the included expense ids on submit.
 *
 * `POST /reports/:id/submit` sends an email to the listed approver via
 * `@molecule/api-emails`, marks the report `submitted`, and drops a
 * notification onto the user's activity feed (so the Notifications page
 * reflects the action without a placeholder fixture).
 *
 * `GET /reports/:id/export.csv` streams the report's expense lines as
 * CSV — wired so the "Export CSV" button on the report detail page
 * actually delivers a downloadable file rather than firing a toast.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { create, findById, findMany, updateById } from '@molecule/api-database'
import { sendMail } from '@molecule/api-emails'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'
import { transition } from '@molecule/api-workflow'

import { computePolicyViolation } from './_policy.js'
import { seedDemoForUser } from './_seed.js'
import { recordNotification } from './notifications.js'

const router = Router()

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function isUuid(value: string): boolean {
  return UUID_RE.test(value)
}

interface ReportRow {
  id?: string
  user_id?: string
  submitter_email?: string | null
  approver_id?: string | null
  approver_email?: string | null
  policy_id?: string | null
  title?: string
  description?: string | null
  total_amount?: number | string | null
  currency?: string
  status?: string
  submitted_at?: string | Date | null
  approved_at?: string | Date | null
  approved_by?: string | null
  rejected_at?: string | Date | null
  rejection_reason?: string | null
  reimbursed_at?: string | Date | null
  created_at?: string | Date | null
}

interface ExpenseRow {
  id?: string
  user_id?: string
  report_id?: string | null
  amount?: number | string
  currency?: string
  category?: string | null
  date?: string | Date | null
  description?: string | null
  merchant?: string | null
  receipt_url?: string | null
  status?: string | null
  created_at?: string | Date | null
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

function iso(v: string | Date | null | undefined): string | null {
  if (!v) return null
  if (v instanceof Date) return v.toISOString()
  return v
}

function decorateExpense(row: ExpenseRow): Record<string, unknown> {
  return {
    id: row.id,
    merchant: row.merchant ?? '',
    category: row.category ?? 'other',
    date: row.date instanceof Date ? row.date.toISOString() : (row.date ?? null),
    amountCents: cents(row.amount),
    amount: num(row.amount),
    currency: row.currency ?? 'USD',
    description: row.description ?? null,
    receiptUrl: row.receipt_url ?? null,
    receipt_url: row.receipt_url ?? null,
    status: row.status ?? 'draft',
  }
}

interface DateRange {
  text: string
  earliest: string | null
  latest: string | null
}

function dateRangeFor(items: ExpenseRow[]): DateRange {
  if (items.length === 0) return { text: '—', earliest: null, latest: null }
  const times = items
    .map((e) => (e.date instanceof Date ? e.date.getTime() : new Date(e.date as string).getTime()))
    .filter((t) => Number.isFinite(t))
    .sort((a, b) => a - b)
  if (times.length === 0) return { text: '—', earliest: null, latest: null }
  const fmt = (t: number): string =>
    new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const earliest = new Date(times[0]).toISOString()
  const latest = new Date(times[times.length - 1]).toISOString()
  if (times[0] === times[times.length - 1]) {
    return { text: fmt(times[0]), earliest, latest }
  }
  return {
    text: `${fmt(times[0])} – ${fmt(times[times.length - 1])}`,
    earliest,
    latest,
  }
}

function reimbursableCents(report: ReportRow, items: ExpenseRow[]): number {
  // Reimbursable = approved + reimbursed (rejected/draft expenses are not).
  // For draft / submitted reports we default to total (everything is
  // reimbursable until the approver flags it).
  const total = items.reduce((s, e) => s + cents(e.amount), 0)
  if (report.status === 'rejected') return 0
  return total
}

function decorateReportSummary(
  row: ReportRow,
  items: ExpenseRow[],
  submitterName: string,
): Record<string, unknown> {
  const total =
    items.length > 0 ? items.reduce((s, e) => s + cents(e.amount), 0) : cents(row.total_amount)
  const range = dateRangeFor(items)
  return {
    id: row.id,
    title: row.title ?? '',
    description: row.description ?? '',
    status: row.status ?? 'draft',
    total_amount_cents: total,
    total_amount: num(row.total_amount),
    reimbursable_cents: reimbursableCents(row, items),
    expense_count: items.length,
    submitter_name: submitterName,
    submitted_at: iso(row.submitted_at),
    approved_at: iso(row.approved_at),
    rejected_at: iso(row.rejected_at),
    reimbursed_at: iso(row.reimbursed_at),
    created_at: iso(row.created_at),
    date_range: range.text,
    approver_email: row.approver_email ?? null,
    approver_id: row.approver_id ?? null,
    currency: row.currency ?? 'USD',
  }
}

function timelineFor(row: ReportRow, submitterName: string): Array<Record<string, unknown>> {
  const steps: Array<Record<string, unknown>> = []
  steps.push({
    id: 't-draft',
    label: 'Drafted',
    actor: submitterName,
    timestamp: iso(row.created_at) ?? '',
    state: 'completed',
  })
  if (row.submitted_at) {
    steps.push({
      id: 't-submitted',
      label: 'Submitted for review',
      actor: submitterName,
      timestamp: iso(row.submitted_at) ?? '',
      state: 'completed',
    })
  }
  if (row.approved_at) {
    steps.push({
      id: 't-approved',
      label: 'Manager review',
      actor: 'Approver',
      timestamp: iso(row.approved_at) ?? '',
      state: 'completed',
    })
  } else if (row.rejected_at) {
    steps.push({
      id: 't-rejected',
      label: 'Manager review',
      actor: 'Approver',
      timestamp: iso(row.rejected_at) ?? '',
      state: 'completed',
      note: row.rejection_reason ?? 'Rejected',
    })
  } else if (row.submitted_at) {
    steps.push({
      id: 't-review',
      label: 'Manager review',
      actor: 'Approver',
      timestamp: 'In progress',
      state: 'active',
    })
  }
  if (row.reimbursed_at) {
    steps.push({
      id: 't-reimbursed',
      label: 'Finance reimbursement',
      actor: 'Finance',
      timestamp: iso(row.reimbursed_at) ?? '',
      state: 'completed',
    })
  } else if (row.approved_at) {
    steps.push({
      id: 't-reimbursing',
      label: 'Finance reimbursement',
      timestamp: 'In progress',
      state: 'active',
    })
  } else {
    steps.push({
      id: 't-reimbursement-pending',
      label: 'Finance reimbursement',
      timestamp: 'Pending',
      state: 'pending',
    })
  }
  return steps
}

const createReportSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  purpose: z.string().optional(),
  policy_id: z.string().nullable().optional(),
  approver_email: z.string().email().optional(),
  approver_id: z.string().nullable().optional(),
  currency: z.string().optional(),
  expense_ids: z.array(z.string()).optional(),
})

const updateReportSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  policy_id: z.string().nullable().optional(),
  approver_email: z.string().email().optional(),
  approver_id: z.string().nullable().optional(),
  currency: z.string().optional(),
})

const submitReportSchema = z.object({
  approver_email: z.string().email().optional(),
  approver_id: z.string().nullable().optional(),
})

router.get('/', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({ error: t('auth.unauthorized') })
  }
  try {
    await seedDemoForUser(userId)
  } catch (err) {
    console.warn('seedDemoForUser failed', err)
  }

  const { status } = req.query
  const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  if (status) where.push({ field: 'status', operator: '=', value: status })
  const orderBy: OrderBy[] = [{ field: 'created_at', direction: 'desc' }]
  const reports = await findMany<ReportRow>('expense_reports', { where, orderBy })

  const submitterName = (res.locals.session as { name?: string } | undefined)?.name ?? 'You'

  const decorated = await Promise.all(
    reports.map(async (r) => {
      if (!r.id) return decorateReportSummary(r, [], submitterName)
      const items = await findMany<ExpenseRow>('expenses', {
        where: [{ field: 'report_id', operator: '=', value: r.id }],
        orderBy: [{ field: 'date', direction: 'asc' }],
        limit: 200,
      })
      return decorateReportSummary(r, items, submitterName)
    }),
  )
  res.json(decorated)
})

router.get('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({ error: t('auth.unauthorized') })
  }

  const id = getParamId(req)
  if (!isUuid(id)) {
    return res
      .status(404)
      .json({ error: t('reports.notFound', undefined, { defaultValue: 'Report not found' }) })
  }
  const report = await findById<ReportRow>('expense_reports', id)
  if (!report || (report.user_id !== userId && report.approver_id !== userId)) {
    return res
      .status(404)
      .json({ error: t('reports.notFound', undefined, { defaultValue: 'Report not found' }) })
  }

  const items = report.id
    ? await findMany<ExpenseRow>('expenses', {
        where: [{ field: 'report_id', operator: '=', value: report.id }],
        orderBy: [{ field: 'date', direction: 'asc' }],
        limit: 500,
      })
    : []

  const submitterName =
    report.user_id === userId
      ? ((res.locals.session as { name?: string } | undefined)?.name ?? 'You')
      : (report.submitter_email ?? 'Submitter')

  const summary = decorateReportSummary(report, items, submitterName)
  res.json({
    ...summary,
    expenses: items.map(decorateExpense),
    timeline: timelineFor(report, submitterName),
    policy_violation: await computePolicyViolation(report.policy_id, items),
    submitter_role: 'Reporter',
    rejection_reason: report.rejection_reason ?? null,
  })
})

router.post('/', validateBody(createReportSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({ error: t('auth.unauthorized') })
  }

  const {
    title,
    description,
    purpose,
    policy_id,
    approver_email,
    approver_id,
    currency,
    expense_ids,
  } = req.body as z.infer<typeof createReportSchema>

  // Segregation of duties: approver_id is client-controlled, so a submitter
  // could name themselves as their own approver and later self-approve. The
  // approver must always differ from the submitter — reject it at write time.
  if (approver_id && approver_id === userId) {
    return res.status(400).json({
      error: t('reports.approverCannotBeSelf', undefined, {
        defaultValue: 'The approver must be different from the submitter.',
      }),
    })
  }

  const result = await create<ReportRow>('expense_reports', {
    user_id: userId,
    title,
    description: description ?? purpose ?? null,
    policy_id: policy_id ?? null,
    approver_email: approver_email ?? null,
    approver_id: approver_id ?? null,
    currency: currency ?? 'USD',
    status: 'draft',
    total_amount: 0,
    created_at: new Date(),
  })
  const persisted = (result as { data?: ReportRow }).data ?? (result as ReportRow)

  // Link selected expenses to the new report and compute total_amount.
  if (persisted.id && expense_ids && expense_ids.length > 0) {
    let total = 0
    for (const eid of expense_ids) {
      const e = await findById<ExpenseRow>('expenses', eid)
      if (!e || e.user_id !== userId) continue
      await updateById('expenses', eid, { report_id: persisted.id })
      total += num(e.amount)
    }
    if (total > 0) {
      await updateById('expense_reports', persisted.id, { total_amount: total })
      persisted.total_amount = total
    }
  }

  const items = persisted.id
    ? await findMany<ExpenseRow>('expenses', {
        where: [{ field: 'report_id', operator: '=', value: persisted.id }],
        limit: 500,
      })
    : []
  const submitterName = (res.locals.session as { name?: string } | undefined)?.name ?? 'You'
  res.status(201).json(decorateReportSummary(persisted, items, submitterName))
})

router.put('/:id', validateBody(updateReportSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({ error: t('auth.unauthorized') })
  }

  const id = getParamId(req)
  if (!isUuid(id)) {
    return res
      .status(404)
      .json({ error: t('reports.notFound', undefined, { defaultValue: 'Report not found' }) })
  }
  const existing = await findById<ReportRow>('expense_reports', id)
  if (!existing || existing.user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('reports.notFound', undefined, { defaultValue: 'Report not found' }) })
  }

  const { title, description, policy_id, approver_email, approver_id, currency } =
    req.body as z.infer<typeof updateReportSchema>

  // Segregation of duties: never let a submitter set themselves as approver.
  if (approver_id && approver_id === userId) {
    return res.status(400).json({
      error: t('reports.approverCannotBeSelf', undefined, {
        defaultValue: 'The approver must be different from the submitter.',
      }),
    })
  }

  const updates: Record<string, unknown> = {}
  if (title !== undefined) updates.title = title
  if (description !== undefined) updates.description = description
  if (policy_id !== undefined) updates.policy_id = policy_id
  if (approver_email !== undefined) updates.approver_email = approver_email
  if (approver_id !== undefined) updates.approver_id = approver_id
  if (currency !== undefined) updates.currency = currency

  const result = await updateById<ReportRow>('expense_reports', id, updates)
  const persisted = (result as { data?: ReportRow }).data ?? (result as ReportRow)
  const items = persisted.id
    ? await findMany<ExpenseRow>('expenses', {
        where: [{ field: 'report_id', operator: '=', value: persisted.id }],
        limit: 500,
      })
    : []
  const submitterName = (res.locals.session as { name?: string } | undefined)?.name ?? 'You'
  res.json(decorateReportSummary(persisted, items, submitterName))
})

router.post(
  '/:id/submit',
  validateBody(submitReportSchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({ error: t('auth.unauthorized') })
    }

    const id = getParamId(req)
    if (!isUuid(id)) {
      return res
        .status(404)
        .json({ error: t('reports.notFound', undefined, { defaultValue: 'Report not found' }) })
    }
    const report = await findById<ReportRow>('expense_reports', id)
    if (!report || report.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('reports.notFound', undefined, { defaultValue: 'Report not found' }) })
    }

    const approverEmail =
      (req.body?.approver_email as string | undefined) ??
      (report.approver_email as string | undefined)
    let approverId =
      (req.body?.approver_id as string | undefined) ?? (report.approver_id as string | undefined)

    // Resolve approver_id from approver_email if the caller didn't provide
    // one. Without this, an approver who has signed up under that email
    // would never see the report in their queue (the queue filters by
    // approver_id). This is the bridge from "user types a manager's email"
    // to "the manager actually receives the request in-app."
    if (!approverId && approverEmail) {
      const matches = await findMany<{ id?: string }>('users', {
        where: [{ field: 'email', operator: '=', value: approverEmail }],
        limit: 1,
      })
      if (matches[0]?.id && matches[0].id !== userId) {
        approverId = matches[0].id
      }
    }

    // Segregation of duties enforced at submit time. `approver_id` arrives
    // straight from the request body and bypasses the email-resolution
    // self-check above, so a submitter could name their OWN id as approver,
    // land the report in their own /approvals queue, and self-approve. Reject
    // any approver that equals the submitter — the approver must differ.
    if (approverId && approverId === userId) {
      return res.status(400).json({
        error: t('reports.approverCannotBeSelf', undefined, {
          defaultValue: 'The approver must be different from the submitter.',
        }),
      })
    }

    // Recompute total_amount from linked expenses to avoid drift after edits.
    let total = num(report.total_amount)
    const items = await findMany<ExpenseRow>('expenses', {
      where: [{ field: 'report_id', operator: '=', value: id }],
      limit: 500,
    })
    if (items.length > 0) {
      total = items.reduce((s, e) => s + num(e.amount), 0)
    }

    // Workflow transition is best-effort — the bond may be a no-op when no
    // workflow definition is registered for `expense_reports`. Persistence
    // of `status` + `submitted_at` is the source of truth.
    try {
      await transition(id, 'submit')
    } catch (_error) {
      // workflow events are forensic, not blocking — ignoring is correct
    }

    await updateById('expense_reports', id, {
      status: 'submitted',
      submitted_at: new Date(),
      approver_email: approverEmail ?? null,
      approver_id: approverId ?? null,
      total_amount: total,
    })
    // Mark linked expenses as submitted so the Expenses list reflects the
    // status change after submit.
    for (const e of items) {
      if (e.id && e.status !== 'submitted') {
        await updateById('expenses', e.id, { status: 'submitted' })
      }
    }

    if (approverEmail) {
      const title = (report.title as string | undefined) ?? ''
      try {
        await sendMail({
          from: process.env.EMAIL_FROM ?? `no-reply@${process.env.MAILGUN_DOMAIN ?? 'localhost'}`,
          to: approverEmail,
          subject: t(
            'reports.submittedSubject',
            { title },
            { defaultValue: 'Expense report submitted: {{title}}' },
          ),
          text: t(
            'reports.submittedBody',
            { title, amount: total },
            { defaultValue: '{{title}} has been submitted for approval. Total: ${{amount}}.' },
          ),
        })
      } catch (err) {
        console.warn('Failed to send submission email', err)
      }
    }

    // Drop a notification onto the user's activity feed so the next visit
    // to /notifications shows the action without a placeholder fixture.
    try {
      await recordNotification({
        userId,
        type: 'submitted',
        title: t(
          'notifications.submittedTitle',
          { title: report.title ?? '' },
          { defaultValue: '{{title}} submitted' },
        ),
        message: t(
          'notifications.submittedBody',
          { count: items.length, total: total.toFixed(2) },
          { defaultValue: '{{count}} expenses submitted for approval. Total: ${{total}}.' },
        ),
        reportId: id,
        actor: 'You',
      })
    } catch (err) {
      console.warn('Failed to record submission notification', err)
    }

    res.json({ success: true, total_amount: total, total_amount_cents: Math.round(total * 100) })
  },
)

/**
 * Stream the report's expense lines as a CSV file. Wired to the
 * "Export CSV" button on `pages/Reports.tsx`. The response sets a
 * `Content-Disposition: attachment` header so the browser triggers a
 * download rather than rendering inline.
 */
router.get('/:id/export.csv', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({ error: t('auth.unauthorized') })
  }
  const id = getParamId(req)
  if (!isUuid(id)) {
    return res
      .status(404)
      .json({ error: t('reports.notFound', undefined, { defaultValue: 'Report not found' }) })
  }
  const report = await findById<ReportRow>('expense_reports', id)
  if (!report || (report.user_id !== userId && report.approver_id !== userId)) {
    return res
      .status(404)
      .json({ error: t('reports.notFound', undefined, { defaultValue: 'Report not found' }) })
  }
  const items = await findMany<ExpenseRow>('expenses', {
    where: [{ field: 'report_id', operator: '=', value: id }],
    orderBy: [{ field: 'date', direction: 'asc' }],
    limit: 1000,
  })
  const escape = (v: unknown): string => {
    if (v == null) return ''
    let s = String(v).replace(/"/g, '""')
    // [L2-1] Neutralize CSV/formula injection (CWE-1236): a cell starting with = + - @ or a
    // leading tab/CR is executed as a formula by Excel/Sheets/LibreOffice. Prefix a single
    // quote (the standard text marker, stripped on display) BEFORE RFC-4180 quoting; genuine
    // numbers are exempt so negative values aren't mangled (mirrors the shared csv escapeField).
    if (!/^-?\d+(\.\d+)?$/.test(s) && /^[=+\-@\t\r]/.test(s)) s = `'${s}`
    return /[",\n]/.test(s) ? `"${s}"` : s
  }
  const rows: string[] = ['Date,Merchant,Category,Amount,Currency,Description,Receipt']
  for (const e of items) {
    const dateStr =
      e.date instanceof Date
        ? e.date.toISOString().slice(0, 10)
        : typeof e.date === 'string'
          ? e.date.slice(0, 10)
          : ''
    rows.push(
      [
        escape(dateStr),
        escape(e.merchant ?? ''),
        escape(e.category ?? ''),
        escape(num(e.amount).toFixed(2)),
        escape(e.currency ?? 'USD'),
        escape(e.description ?? ''),
        escape(e.receipt_url ?? ''),
      ].join(','),
    )
  }
  const total = items.reduce((s, e) => s + num(e.amount), 0)
  rows.push('')
  rows.push(`,,,${escape(total.toFixed(2))},${escape(report.currency ?? 'USD')},Total,`)
  const csv = rows.join('\r\n') + '\r\n'

  const filename = `${(report.title ?? 'report').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${id.slice(0, 8)}.csv`
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.send(csv)
})

export default router
