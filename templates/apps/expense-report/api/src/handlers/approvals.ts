/**
 * Approvals handler — manager queue for expense reports.
 *
 * Lists `expense_reports` rows where `approver_id` is the current user
 * and the status is `submitted`. Decorated with the shape
 * `pages/Approvals.tsx` expects: `total_amount_cents`, `submitter_name`,
 * `submitter_role`, `expense_count`, `policy_violation`.
 *
 * Approve / reject mutate the report row, drop a notification onto the
 * report owner's activity feed (so the next visit to /notifications
 * surfaces the manager's decision), and email the submitter.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { findById, findMany, updateById } from '@molecule/api-database'
import { sendMail } from '@molecule/api-emails'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'
import { transition } from '@molecule/api-workflow'

import { computePolicyViolation, type PolicyCheckExpense } from './_policy.js'
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
  approver_id?: string | null
  approver_email?: string | null
  submitter_email?: string | null
  title?: string
  description?: string | null
  status?: string
  policy_id?: string | null
  total_amount?: number | string | null
  submitted_at?: string | Date | null
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

function iso(v: string | Date | null | undefined): string | null {
  if (!v) return null
  if (v instanceof Date) return v.toISOString()
  return v
}

const approveSchema = z.object({
  comment: z.string().optional(),
})

const rejectSchema = z.object({
  reason: z.string().min(1),
})

router.get('/pending', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({ error: t('auth.unauthorized') })
  }
  try {
    await seedDemoForUser(userId)
  } catch (err) {
    console.warn('seedDemoForUser failed', err)
  }

  const where: WhereCondition[] = [
    { field: 'approver_id', operator: '=', value: userId },
    { field: 'status', operator: '=', value: 'submitted' },
  ]
  const orderBy: OrderBy[] = [{ field: 'submitted_at', direction: 'asc' }]
  const pending = await findMany<ReportRow>('expense_reports', { where, orderBy })

  const decorated = await Promise.all(
    pending.map(async (r) => {
      // Load the report's expenses so we can both count them AND flag policy violations for the
      // approver — the queue previously counted expenses and reported policy_violation: null.
      const expenses = r.id
        ? await findMany<PolicyCheckExpense>('expenses', {
            where: [{ field: 'report_id', operator: '=', value: r.id }],
          })
        : []
      const submitter = (r.submitter_email ?? '').split('@')[0] || 'Submitter'
      return {
        id: r.id,
        title: r.title ?? '',
        submitter_name: submitter
          .split('.')
          .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
          .join(' '),
        submitter_role: 'Reporter',
        submitter_email: r.submitter_email ?? '',
        total_amount_cents: Math.round(num(r.total_amount) * 100),
        total_amount: num(r.total_amount),
        submitted_at: iso(r.submitted_at) ?? new Date().toISOString(),
        policy_violation: await computePolicyViolation(r.policy_id, expenses),
        expense_count: expenses.length,
        currency: 'USD',
      }
    }),
  )
  res.json(decorated)
})

router.post('/:id/approve', validateBody(approveSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({ error: t('auth.unauthorized') })
  }

  const id = getParamId(req)
  if (!isUuid(id)) {
    return res.status(404).json({
      error: t('approvals.notFound', undefined, { defaultValue: 'Approval not found' }),
    })
  }
  const report = await findById<ReportRow>('expense_reports', id)
  if (!report || report.approver_id !== userId) {
    return res.status(404).json({
      error: t('approvals.notFound', undefined, { defaultValue: 'Approval not found' }),
    })
  }

  // Segregation of duties enforced AT APPROVE TIME — not merely that the user
  // was named approver. A submitter must never approve their own report, even
  // if a stale or forged approver_id names them as the approver. Fail closed.
  if (report.user_id === userId) {
    return res.status(403).json({
      error: t('approvals.cannotReviewOwn', undefined, {
        defaultValue: 'You cannot approve or reject your own report.',
      }),
    })
  }

  try {
    await transition(id, 'approve')
  } catch (_error) {
    // workflow is forensic; persistence is the source of truth — ignoring is correct
  }

  await updateById('expense_reports', id, {
    status: 'approved',
    approved_at: new Date(),
    approved_by: userId,
  })

  const submitterEmail = report.submitter_email as string | undefined
  const title = (report.title as string | undefined) ?? ''
  if (submitterEmail) {
    try {
      await sendMail({
        from: process.env.EMAIL_FROM ?? `no-reply@${process.env.MAILGUN_DOMAIN ?? 'localhost'}`,
        to: submitterEmail,
        subject: t(
          'approvals.approvedSubject',
          { title },
          { defaultValue: 'Expense report approved: {{title}}' },
        ),
        text: t(
          'approvals.approvedBody',
          { title },
          { defaultValue: '{{title}} has been approved.' },
        ),
      })
    } catch (err) {
      console.warn('Failed to send approval email', err)
    }
  }

  if (report.user_id) {
    try {
      await recordNotification({
        userId: report.user_id,
        type: 'approved',
        title: t('notifications.approvedTitle', { title }, { defaultValue: '{{title}} approved' }),
        message: t(
          'notifications.approvedBody',
          {},
          { defaultValue: 'Your manager approved this report.' },
        ),
        reportId: id,
        actor: 'Approver',
      })
    } catch (err) {
      console.warn('Failed to record approval notification', err)
    }
  }

  res.json({ success: true })
})

router.post('/:id/reject', validateBody(rejectSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({ error: t('auth.unauthorized') })
  }

  const id = getParamId(req)
  if (!isUuid(id)) {
    return res.status(404).json({
      error: t('approvals.notFound', undefined, { defaultValue: 'Approval not found' }),
    })
  }
  const { reason } = req.body as z.infer<typeof rejectSchema>
  const report = await findById<ReportRow>('expense_reports', id)
  if (!report || report.approver_id !== userId) {
    return res.status(404).json({
      error: t('approvals.notFound', undefined, { defaultValue: 'Approval not found' }),
    })
  }

  // Segregation of duties enforced at review time: a submitter must never act
  // as the reviewer of their own report, even if approver_id names them.
  if (report.user_id === userId) {
    return res.status(403).json({
      error: t('approvals.cannotReviewOwn', undefined, {
        defaultValue: 'You cannot approve or reject your own report.',
      }),
    })
  }

  try {
    await transition(id, 'reject')
  } catch (_error) {
    // workflow is forensic; persistence is the source of truth — ignoring is correct
  }

  await updateById('expense_reports', id, {
    status: 'rejected',
    rejection_reason: reason,
    rejected_at: new Date(),
  })

  const submitterEmail = report.submitter_email as string | undefined
  const title = (report.title as string | undefined) ?? ''
  if (submitterEmail) {
    try {
      await sendMail({
        from: process.env.EMAIL_FROM ?? `no-reply@${process.env.MAILGUN_DOMAIN ?? 'localhost'}`,
        to: submitterEmail,
        subject: t(
          'approvals.rejectedSubject',
          { title },
          { defaultValue: 'Expense report rejected: {{title}}' },
        ),
        text: t(
          'approvals.rejectedBody',
          { title, reason },
          { defaultValue: '{{title}} was rejected: {{reason}}' },
        ),
      })
    } catch (err) {
      console.warn('Failed to send rejection email', err)
    }
  }

  if (report.user_id) {
    try {
      await recordNotification({
        userId: report.user_id,
        type: 'rejected',
        title: t('notifications.rejectedTitle', { title }, { defaultValue: '{{title}} rejected' }),
        message: reason,
        reportId: id,
        actor: 'Approver',
      })
    } catch (err) {
      console.warn('Failed to record rejection notification', err)
    }
  }

  res.json({ success: true })
})

export default router
