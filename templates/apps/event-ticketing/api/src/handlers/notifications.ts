/**
 * Notifications feed for the Notifications page. Derives a normalized,
 * cross-feature activity feed from real DB rows: paid orders (purchase),
 * checked-in tickets (check_in), refunded orders (refund), and ticket
 * transfers (transfer). Also includes the caller's own purchase
 * confirmations as reminders.
 *
 * Data shape mirrors what the Notifications.tsx component expects: each
 * row has id, kind, title, body, time_ago, unread, optional `to` link.
 *
 * Note: there is no separate `notifications` table — this is a derived
 * feed. The "unread" flag is heuristic (anything from the last 30 minutes
 * counts as unread) since there is no persistent read state in v1.
 *
 * @module
 */
import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

interface UserOAuthData {
  notificationsLastReadAt?: string | null
  [key: string]: unknown
}

interface NotificationRow {
  id: string
  kind: 'purchase' | 'check_in' | 'transfer' | 'refund' | 'announcement' | 'reminder'
  title: string
  body: string
  ts: string
  to?: string
  unread: boolean
}

function timeAgo(date: Date | string): string {
  const ts = date instanceof Date ? date : new Date(date)
  const seconds = Math.max(0, Math.floor((Date.now() - ts.getTime()) / 1000))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const items: NotificationRow[] = []
    const now = Date.now()
    const callerUser = await findById<{ oauthData?: UserOAuthData | null }>('users', userId)
    const lastReadAtRaw =
      (callerUser?.oauthData as UserOAuthData | undefined)?.notificationsLastReadAt ?? null
    const lastReadAt = lastReadAtRaw ? new Date(lastReadAtRaw).getTime() : 0

    // Organizer-side: paid orders / refunds / check-ins on owned events
    const ownedEvents = await findMany<Record<string, unknown>>('events', {
      where: [{ field: 'organizer_user_id', operator: '=', value: userId }],
    })
    const ownedTitle = new Map<string, string>(
      ownedEvents.map((e) => [String(e.id), String(e.title)]),
    )
    for (const e of ownedEvents) {
      const orders = await findMany<Record<string, unknown>>('orders', {
        where: [{ field: 'event_id', operator: '=', value: String(e.id) }],
        orderBy: [{ field: 'created_at', direction: 'desc' }],
        limit: 20,
      })
      for (const o of orders) {
        const total = Number(o.total_cents) || 0
        const orderTs = String(o.created_at)
        const orderDate = new Date(orderTs)
        const fresh = now - orderDate.getTime() < 30 * 60 * 1000
        const unreadByReadAt = orderDate.getTime() > lastReadAt
        if (o.status === 'paid') {
          items.push({
            id: `order-${o.id}`,
            kind: 'purchase',
            title: `New purchase · ${e.title}`,
            body: `${o.quantity} ticket${Number(o.quantity) === 1 ? '' : 's'} — $${(total / 100).toFixed(2)} · order ${o.confirmation_code ?? o.id}`,
            ts: orderTs,
            to: `/orders/${o.id}/confirmation`,
            unread: fresh && unreadByReadAt,
          })
        }
        if (o.status === 'refunded') {
          items.push({
            id: `refund-${o.id}`,
            kind: 'refund',
            title: `Refund processed · ${e.title}`,
            body: `Order refunded ($${(total / 100).toFixed(2)})`,
            ts: String(o.updated_at ?? o.created_at),
            to: `/orders/${o.id}/confirmation`,
            unread: false,
          })
        }
      }
      const checked = await findMany<Record<string, unknown>>('tickets', {
        where: [
          { field: 'event_id', operator: '=', value: String(e.id) },
          { field: 'status', operator: '=', value: 'checked_in' },
        ],
        orderBy: [{ field: 'updated_at', direction: 'desc' }],
        limit: 5,
      })
      if (checked.length > 0) {
        const checkedTs = new Date(String(checked[0].updated_at ?? checked[0].created_at)).getTime()
        const fresh = now - checkedTs < 30 * 60 * 1000
        const unreadByReadAt = checkedTs > lastReadAt
        items.push({
          id: `checkin-${e.id}`,
          kind: 'check_in',
          title: `Check-in activity · ${e.title}`,
          body: `${checked.length} attendee${checked.length === 1 ? '' : 's'} checked in`,
          ts: String(checked[0].updated_at ?? checked[0].created_at),
          to: `/events/${e.id}/attendees`,
          unread: fresh && unreadByReadAt,
        })
      }
    }

    // Buyer-side: my orders + my refund requests + transfers I initiated/received
    const myOrders = await findMany<Record<string, unknown>>('orders', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 20,
    })
    for (const o of myOrders) {
      // Skip if already counted as organizer event
      if (ownedTitle.has(String(o.event_id))) continue
      const event = await findById<Record<string, unknown>>('events', String(o.event_id))
      const title = event?.title ?? 'Event'
      const ts = String(o.created_at)
      const fresh = now - new Date(ts).getTime() < 30 * 60 * 1000
      if (o.status === 'paid') {
        const unreadByReadAt = new Date(ts).getTime() > lastReadAt
        items.push({
          id: `myorder-${o.id}`,
          kind: 'reminder',
          title: `Tickets confirmed · ${title}`,
          body: `${o.quantity} ticket${Number(o.quantity) === 1 ? '' : 's'} ready to scan`,
          ts,
          to: `/orders/${o.id}/confirmation`,
          unread: fresh && unreadByReadAt,
        })
      }
    }

    const myTransfers = await findMany<Record<string, unknown>>('ticket_transfers', {
      where: [{ field: 'from_user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 10,
    })
    for (const tr of myTransfers) {
      const ts = String(tr.created_at)
      const tsMs = new Date(ts).getTime()
      const fresh = now - tsMs < 30 * 60 * 1000
      const unreadByReadAt = tsMs > lastReadAt
      items.push({
        id: `transfer-${tr.id}`,
        kind: 'transfer',
        title: 'Ticket transferred',
        body: `Sent to ${tr.to_email}`,
        ts,
        to: `/tickets/${tr.ticket_id}`,
        unread: fresh && unreadByReadAt,
      })
    }

    items.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
    const trimmed = items.slice(0, 50).map((it) => ({
      id: it.id,
      kind: it.kind,
      title: it.title,
      body: it.body,
      time_ago: timeAgo(it.ts),
      unread: it.unread,
      to: it.to,
    }))
    res.json(trimmed)
  } catch (err) {
    logger.error('notifications GET failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

/**
 * POST /api/notifications/read-all
 * Persist a "caught up" timestamp in the user's oauthData so subsequent
 * GET /api/notifications loads honor the marked-read state across reload.
 * Idempotent: clicking again with no new activity is a safe no-op.
 */
router.post('/read-all', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const callerUser = await findById<{ oauthData?: UserOAuthData | null }>('users', userId)
    const oauthData: UserOAuthData = { ...(callerUser?.oauthData ?? {}) }
    oauthData.notificationsLastReadAt = new Date().toISOString()
    // No timestamp write: the users table has no `updated_at`/`updatedAt`
    // writable column contract here (the DB default owns `"updatedAt"`), and
    // passing one made every "mark all read" click 500 (42703).
    await updateById('users', userId, { oauthData })
    res.json({ success: true, notificationsLastReadAt: oauthData.notificationsLastReadAt })
  } catch (err) {
    logger.error('notifications POST read-all failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
