/**
 * Notifications feed for the bell-icon page.
 *
 *   GET   /api/notifications            — recent events for this user
 *   POST  /api/notifications/read-all   — mark all unread as read
 *
 * Backed by the same activity stream as /api/dashboard/activity, plus
 * unread bookkeeping in `oauthData.lastReadNotificationAt`. We intentionally
 * derive notifications from real data rather than maintaining a separate
 * `notifications` table — every flagship-level "notification" has a
 * corresponding invoice/payment row already.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import { ensureDemoSeeded } from './_seed.js'

const router = Router()

interface InvoiceRow {
  id: string
  user_id: string
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
  invoice_number?: string | null
  client_name?: string | null
  amount?: string | number | null
  method?: string | null
  status?: string | null
  created_at?: string | Date | null
}
interface UserRow {
  id: string
  oauthData?: Record<string, unknown> | null
}

type NotificationKind = 'invoice_paid' | 'invoice_sent' | 'invoice_overdue' | 'invoice_created'

interface Notification {
  id: string
  kind: NotificationKind
  title: string
  message: string
  amount_cents?: number
  occurred_at: string
  read: boolean
}

function lastReadAt(user: UserRow | null): number {
  const raw = (user?.oauthData as Record<string, unknown> | null | undefined)
    ?.lastReadNotificationAt
  if (typeof raw !== 'string') return 0
  const ts = Date.parse(raw)
  return Number.isFinite(ts) ? ts : 0
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    await ensureDemoSeeded(userId)

    const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 25)))
    const user = await findById<UserRow>('users', userId)
    const lastRead = lastReadAt(user)

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

    const items: Notification[] = []
    const now = Date.now()
    for (const p of payments) {
      const occurred = p.created_at
        ? new Date(p.created_at).toISOString()
        : new Date().toISOString()
      const occurredMs = Date.parse(occurred)
      items.push({
        id: `pay-${p.id}`,
        kind: 'invoice_paid',
        title: `${p.client_name ?? 'Client'} paid ${p.invoice_number ?? ''}`.trim(),
        message: `Recorded a ${p.method ?? 'manual'} payment.`,
        amount_cents: Math.round(Number(p.amount ?? 0) * 100),
        occurred_at: occurred,
        read: occurredMs <= lastRead,
      })
    }
    for (const inv of invoices) {
      if (inv.sent_at) {
        const occurred = new Date(inv.sent_at).toISOString()
        items.push({
          id: `sent-${inv.id}`,
          kind: 'invoice_sent',
          title: `Sent ${inv.invoice_number ?? 'Invoice'} to ${inv.client_name ?? 'client'}`,
          message: `Invoice email queued via Mailgun.`,
          amount_cents: Math.round(Number(inv.total ?? 0) * 100),
          occurred_at: occurred,
          read: Date.parse(occurred) <= lastRead,
        })
      }
      const status = String(inv.status ?? '').toLowerCase()
      const due = inv.due_date ? new Date(inv.due_date).getTime() : null
      if (['sent', 'viewed', 'partial'].includes(status) && due !== null && due < now) {
        const occurred = new Date(due).toISOString()
        items.push({
          id: `overdue-${inv.id}`,
          kind: 'invoice_overdue',
          title: `${inv.invoice_number ?? 'Invoice'} is overdue`,
          message: `${inv.client_name ?? 'Client'} hasn't paid yet — consider a reminder.`,
          amount_cents: Math.round((Number(inv.total ?? 0) - Number(inv.amount_paid ?? 0)) * 100),
          occurred_at: occurred,
          read: Date.parse(occurred) <= lastRead,
        })
      }
    }

    items.sort((a, b) => (a.occurred_at < b.occurred_at ? 1 : -1))
    const trimmed = items.slice(0, limit)
    const unreadCount = trimmed.filter((n) => !n.read).length

    res.json({ data: trimmed, unreadCount })
  } catch (error) {
    logger.error('notifications.list', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.post('/read-all', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const existing = await findById<UserRow>('users', userId)
    if (!existing) return res.status(404).json({ error: t('profile.notFound') })

    const oauthData = { ...(existing.oauthData ?? {}) } as Record<string, unknown>
    oauthData.lastReadNotificationAt = new Date().toISOString()
    await updateById('users', userId, { oauthData, updatedAt: new Date() })

    res.json({ success: true, lastReadAt: oauthData.lastReadNotificationAt })
  } catch (error) {
    logger.error('notifications.readAll', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
