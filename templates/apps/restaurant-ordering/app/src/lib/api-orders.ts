import type { OrderStatus, OrderTicket, OrderTicketItem } from '../components/OrderTicketCard.js'

export interface ApiOrderItem {
  id?: string
  menu_item_id?: string
  name?: string
  quantity?: number
  unit_price?: number | string
  special_instructions?: string
  status?: string
}

export interface ApiOrder {
  id: string
  user_id?: string
  table_id?: string | null
  table_number?: number | null
  status: string
  subtotal?: number | string
  tax?: number | string
  total?: number | string
  currency?: string
  created_at?: string
  updated_at?: string | null
  payment_id?: string | null
  tip?: number | string | null
  items?: ApiOrderItem[]
}

const STATUS_MAP: Record<string, OrderStatus> = {
  pending: 'new',
  new: 'new',
  preparing: 'preparing',
  ready: 'ready',
  served: 'served',
  paid: 'served',
  cancelled: 'cancelled',
}

export const mapOrderStatus = (raw: string | undefined): OrderStatus =>
  STATUS_MAP[(raw ?? 'pending').toLowerCase()] ?? 'new'

export const mapApiOrderToTicket = (order: ApiOrder): OrderTicket => {
  const items: OrderTicketItem[] = (order.items ?? []).map((it) => ({
    name: String(it.name ?? ''),
    qty: Number(it.quantity ?? 1),
    note: it.special_instructions || undefined,
  }))
  const placedAt = order.created_at ?? new Date().toISOString()
  const totalCents = Math.round(Number(order.total ?? 0) * 100)
  const tableLabel = order.table_number != null ? `Table ${order.table_number}` : 'Pickup'
  return {
    id: order.id,
    number: order.id.slice(0, 8),
    table: tableLabel,
    placedAt,
    status: mapOrderStatus(order.status),
    items,
    totalCents,
  }
}
