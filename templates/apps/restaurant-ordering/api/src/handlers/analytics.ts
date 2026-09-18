import { Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

const router = Router()

interface OrderRow {
  id: string
  user_id: string
  status: string
  total: number | string
  tax: number | string
  tip: number | string
  subtotal: number | string
  created_at: string | Date
}

interface OrderItemRow {
  id: string
  order_id: string
  menu_item_id: string | null
  name: string
  quantity: number
  unit_price: number | string
}

const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? 0))
  return Number.isFinite(n) ? n : 0
}

router.get('/snapshot', async (_req, res) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    return
  }
  const since = new Date()
  since.setHours(0, 0, 0, 0)

  const orders = await findMany<OrderRow>('orders', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'created_at', operator: '>=', value: since.toISOString() },
    ],
    orderBy: [{ field: 'created_at', direction: 'asc' }],
    limit: 1000,
  })

  // Hourly breakdown — buckets 0..23, dollars (cents).
  const hourly = Array.from({ length: 24 }, (_, hour) => ({ hour, cents: 0 }))
  let coversCount = 0
  let revenueDollars = 0
  let tipsDollars = 0
  let pretaxDollars = 0
  let firstSeating: string | null = null
  let lastTicket: string | null = null
  let busiestHour: { hour: number; cents: number } | null = null

  for (const order of orders) {
    const total = num(order.total)
    const tip = num(order.tip)
    const subtotal = num(order.subtotal)
    const date = order.created_at instanceof Date ? order.created_at : new Date(order.created_at)
    const cents = Math.round(total * 100)
    const hour = date.getHours()
    hourly[hour].cents += cents
    if (order.status === 'paid' || order.status === 'served') {
      revenueDollars += total
      tipsDollars += tip
      pretaxDollars += subtotal
      coversCount += 1
    }
    if (!firstSeating || date.toISOString() < firstSeating) {
      firstSeating = date.toISOString()
    }
    if (!lastTicket || date.toISOString() > lastTicket) {
      lastTicket = date.toISOString()
    }
  }

  for (const bucket of hourly) {
    if (!busiestHour || bucket.cents > busiestHour.cents) busiestHour = bucket
  }

  // Top items — aggregate from all order_items belonging to today's orders.
  const orderIds = orders.map((o) => o.id)
  const items = orderIds.length
    ? await findMany<OrderItemRow>('order_items', {
        where: [{ field: 'order_id', operator: 'in', value: orderIds }],
        limit: 5000,
      })
    : []
  const itemAgg = new Map<
    string,
    { id: string | null; name: string; sold: number; grossCents: number }
  >()
  for (const item of items) {
    const key = (item.menu_item_id ?? item.name) || item.id
    const grossCents = Math.round(num(item.unit_price) * 100) * item.quantity
    const existing = itemAgg.get(key)
    if (existing) {
      existing.sold += item.quantity
      existing.grossCents += grossCents
    } else {
      itemAgg.set(key, {
        id: item.menu_item_id ?? null,
        name: item.name,
        sold: item.quantity,
        grossCents,
      })
    }
  }
  const topItems = Array.from(itemAgg.values())
    .sort((a, b) => b.grossCents - a.grossCents)
    .slice(0, 5)

  const avgCheckCents = coversCount > 0 ? Math.round((revenueDollars * 100) / coversCount) : 0
  const tipsAvgPct = pretaxDollars > 0 ? (tipsDollars / pretaxDollars) * 100 : 0

  res.json({
    todayRevenueCents: Math.round(revenueDollars * 100),
    coversCount,
    avgCheckCents,
    tipsAvgPct: Number(tipsAvgPct.toFixed(1)),
    busiestHour: busiestHour
      ? { hour: busiestHour.hour, cents: busiestHour.cents }
      : { hour: 0, cents: 0 },
    firstSeating,
    lastTicket,
    hourly,
    topItems,
    orderCount: orders.length,
  })
})

export default router
