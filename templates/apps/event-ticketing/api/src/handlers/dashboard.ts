/**
 * Dashboard summary + recent activity for the organizer Dashboard page.
 *
 * GET /summary — counts/aggregates over the caller's owned events:
 *   - events_published     count of events with status=published
 *   - tickets_sold         number of issued/checked-in tickets across owned events
 *   - revenue_cents        sum of total_cents on paid orders for owned events
 *   - upcoming_count       events with start_date in the future
 *
 * GET /activity — most-recent activity items (purchases, check-ins, refunds,
 *   transfers, event status changes) across the caller's owned events plus
 *   their own ticket activity. Returns a normalized list the frontend can
 *   render directly.
 *
 * @module
 */
import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

router.get('/summary', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const events = await findMany<Record<string, unknown>>('events', {
      where: [{ field: 'organizer_user_id', operator: '=', value: userId }],
    })
    const eventIds = events.map((e) => String(e.id))
    const eventsPublished = events.filter((e) => e.status === 'published').length
    const now = new Date()
    const upcomingCount = events.filter((e) => {
      const sd = e.start_date instanceof Date ? e.start_date : new Date(String(e.start_date))
      return e.status === 'published' && sd >= now
    }).length

    let ticketsSold = 0
    let revenueCents = 0
    if (eventIds.length > 0) {
      // Sum tickets across all owned events (one query per event keeps the
      // shared findMany API simple and avoids needing IN-clauses).
      for (const id of eventIds) {
        const tickets = await findMany<Record<string, unknown>>('tickets', {
          where: [{ field: 'event_id', operator: '=', value: id }],
        })
        ticketsSold += tickets.filter(
          (tk) => tk.status === 'issued' || tk.status === 'checked_in',
        ).length
        const orders = await findMany<Record<string, unknown>>('orders', {
          where: [{ field: 'event_id', operator: '=', value: id }],
        })
        for (const o of orders) {
          if (o.status === 'paid') revenueCents += Number(o.total_cents) || 0
        }
      }
    }

    res.json({
      events_published: eventsPublished,
      tickets_sold: ticketsSold,
      revenue_cents: revenueCents,
      upcoming_count: upcomingCount,
    })
  } catch (err) {
    logger.error('dashboard summary GET failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

interface ActivityItem {
  id: string
  kind: 'purchase' | 'check_in' | 'transfer' | 'refund' | 'announcement' | 'reminder'
  title: string
  body: string
  ts: string
  to?: string
}

function timeAgo(date: Date | string): string {
  const ts = date instanceof Date ? date : new Date(date)
  const seconds = Math.max(0, Math.floor((Date.now() - ts.getTime()) / 1000))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

router.get('/activity', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const events = await findMany<Record<string, unknown>>('events', {
      where: [{ field: 'organizer_user_id', operator: '=', value: userId }],
    })
    const eventTitleById = new Map<string, string>(
      events.map((e) => [String(e.id), String(e.title)]),
    )
    const items: ActivityItem[] = []

    // Recent paid orders on owned events
    for (const e of events) {
      const orders = await findMany<Record<string, unknown>>('orders', {
        where: [{ field: 'event_id', operator: '=', value: String(e.id) }],
        orderBy: [{ field: 'created_at', direction: 'desc' }],
        limit: 10,
      })
      for (const o of orders) {
        const total = Number(o.total_cents) || 0
        if (o.status === 'paid') {
          items.push({
            id: `order-${o.id}`,
            kind: 'purchase',
            title: `New purchase · ${e.title}`,
            body: `${o.quantity} ticket${Number(o.quantity) === 1 ? '' : 's'} — $${(total / 100).toFixed(2)}`,
            ts: String(o.created_at),
            to: `/orders/${o.id}/confirmation`,
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
          })
        }
      }
      // Check-ins
      const tickets = await findMany<Record<string, unknown>>('tickets', {
        where: [
          { field: 'event_id', operator: '=', value: String(e.id) },
          { field: 'status', operator: '=', value: 'checked_in' },
        ],
        orderBy: [{ field: 'updated_at', direction: 'desc' }],
        limit: 5,
      })
      if (tickets.length > 0) {
        items.push({
          id: `checkin-${e.id}-${tickets.length}`,
          kind: 'check_in',
          title: `Check-in activity · ${e.title}`,
          body: `${tickets.length} attendee${tickets.length === 1 ? '' : 's'} checked in`,
          ts: String(tickets[0].updated_at ?? tickets[0].created_at),
          to: `/events/${e.id}/attendees`,
        })
      }
    }

    // Buyer-side: refund requests, transfers from this user
    const myOrders = await findMany<Record<string, unknown>>('orders', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 10,
    })
    for (const o of myOrders) {
      const eventTitle = eventTitleById.get(String(o.event_id)) ?? 'Event'
      if (o.status === 'paid' && !eventTitleById.has(String(o.event_id))) {
        items.push({
          id: `myorder-${o.id}`,
          kind: 'reminder',
          title: `Tickets confirmed · ${eventTitle}`,
          body: `${o.quantity} ticket${Number(o.quantity) === 1 ? '' : 's'} ready to scan`,
          ts: String(o.created_at),
          to: `/orders/${o.id}/confirmation`,
        })
      }
    }

    items.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
    const out = items.slice(0, 30).map((it) => ({ ...it, time_ago: timeAgo(it.ts) }))
    res.json(out)
  } catch (err) {
    logger.error('dashboard activity GET failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
