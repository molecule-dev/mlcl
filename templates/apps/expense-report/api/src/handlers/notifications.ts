/**
 * Notifications handler — expense-report activity feed.
 *
 * Reads from the `notifications` table (declared in
 * 0010_expense_report_tables.sql) and decorates each row with the shape
 * `pages/Notifications.tsx` expects (`id`, `type`, `title`, `description`,
 * `actor`, `reportId`, `amount_cents`, `occurred_at`).
 *
 * `amount_cents` is sourced from the linked report's `total_amount` (when
 * present) so the right-side amount column on the activity feed renders
 * the actual report value — not a separate hand-typed number.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { count, create, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

import { seedDemoForUser } from './_seed.js'

const router = Router()

interface NotificationRow {
  id?: string
  user_id?: string
  type?: string
  title?: string
  message?: string | null
  report_id?: string | null
  actor?: string | null
  read?: boolean
  created_at?: string | Date | null
}

interface ReportRow {
  id?: string
  total_amount?: number | string | null
}

function num(v: unknown): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

async function decorate(row: NotificationRow): Promise<Record<string, unknown>> {
  let amountCents: number | null = null
  if (row.report_id) {
    const report = await findById<ReportRow>('expense_reports', row.report_id)
    if (report && report.total_amount != null) {
      amountCents = Math.round(num(report.total_amount) * 100)
    }
  }
  return {
    id: row.id,
    type: row.type ?? 'reminder',
    title: row.title ?? '',
    description: row.message ?? '',
    amount_cents: amountCents,
    actor: row.actor ?? 'System',
    reportId: row.report_id ?? undefined,
    occurred_at: row.created_at ?? new Date().toISOString(),
    read: Boolean(row.read),
  }
}

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  try {
    await seedDemoForUser(userId)
  } catch (err) {
    console.warn('seedDemoForUser failed', err)
  }
  const rows = await findMany<NotificationRow>('notifications', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'created_at', direction: 'desc' }],
    limit: 100,
  })
  const decorated = await Promise.all(rows.map(decorate))
  res.json(decorated)
})

router.get('/unread_count', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const n = await count('notifications', [
    { field: 'user_id', operator: '=', value: userId },
    { field: 'read', operator: '=', value: false },
  ])
  res.json({ unread: n })
})

router.put('/:id/read', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const id = getParamId(req, 'id')
  const row = await findById<NotificationRow>('notifications', id)
  if (!row || row.user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('errors.notFound', undefined, { defaultValue: 'Not found' }) })
  }
  const body = req.body as { read?: boolean }
  const result = await updateById<NotificationRow>('notifications', id, {
    read: body.read === false ? false : true,
  })
  const persisted = (result as { data?: NotificationRow }).data ?? (result as NotificationRow)
  res.json(await decorate(persisted))
})

router.put('/mark_all_read', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const unread = await findMany<NotificationRow>('notifications', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'read', operator: '=', value: false },
    ],
    limit: 500,
  })
  for (const n of unread) {
    if (n.id) await updateById('notifications', n.id, { read: true })
  }
  res.json({ markedRead: unread.length })
})

/**
 * Internal helper used by other handlers (reports.submit, approvals.approve,
 * etc.) to drop a notification onto the user's activity feed.
 */
export async function recordNotification(opts: {
  userId: string
  type: string
  title: string
  message?: string | null
  reportId?: string | null
  actor?: string | null
}): Promise<void> {
  await create('notifications', {
    user_id: opts.userId,
    type: opts.type,
    title: opts.title,
    message: opts.message ?? null,
    report_id: opts.reportId ?? null,
    actor: opts.actor ?? null,
    read: false,
    created_at: new Date(),
  })
}

export default router
