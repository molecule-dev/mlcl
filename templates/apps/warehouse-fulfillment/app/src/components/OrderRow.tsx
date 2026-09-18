import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type OrderStatus, OrderStatusBadge } from './OrderStatusBadge.js'

/**
 * Order queue row — editorial activity-feed grammar adapted to fulfillment.
 *
 * Left: priority chevron (rush/express/standard) + order number (mono) +
 * customer name + meta line (items, weight, ETA). Right: lifecycle status
 * pill + relative timestamp. Use inside a `divide-y divide-outline-variant`
 * list, or as a card on its own.
 *
 * Translated from inventory-management/MovementRow.tsx — same icon-tile +
 * primary-line + meta-line layout, retuned to the warehouse-fulfillment
 * order shape (priority left-border per DESIGN.md "Order Card").
 */

export type OrderPriority = 'rush' | 'express' | 'standard'

export interface OrderRowEntry {
  id: string
  orderNumber: string
  customerName: string
  itemCount: number
  weightLb: number
  shippingMethod: string
  status: OrderStatus
  priority: OrderPriority
  createdAt: string
  href?: string
}

interface OrderRowProps {
  order: OrderRowEntry
  showLink?: boolean
}

const PRIORITY_META: Record<
  OrderPriority,
  { color: string; bg: string; labelKey: string; labelDefault: string }
> = {
  rush: {
    color: 'var(--color-priority-rush)',
    bg: 'var(--color-priority-rush-bg)',
    labelKey: 'orderRow.rush',
    labelDefault: 'Rush',
  },
  express: {
    color: 'var(--color-priority-express)',
    bg: 'var(--color-priority-express-bg)',
    labelKey: 'orderRow.express',
    labelDefault: 'Express',
  },
  standard: {
    color: 'var(--color-priority-standard)',
    bg: 'var(--color-priority-standard-bg)',
    labelKey: 'orderRow.standard',
    labelDefault: 'Standard',
  },
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return iso
  const diffSec = Math.round((Date.now() - then) / 1000)
  if (diffSec < 60) return `${Math.max(diffSec, 0)}s ago`
  const diffMin = Math.round(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHour = Math.round(diffMin / 60)
  if (diffHour < 24) return `${diffHour}h ago`
  const diffDay = Math.round(diffHour / 24)
  if (diffDay < 7) return `${diffDay}d ago`
  return new Date(iso).toLocaleDateString()
}

export function OrderRow({ order, showLink = true }: OrderRowProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const priority = PRIORITY_META[order.priority]
  const href = order.href ?? `/orders/${order.id}`

  const Inner = (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
        cm.sp('px', 4),
        cm.sp('py', 3),
        'border-l-4 transition-colors hover:bg-background-secondary',
      )}
      style={{ borderLeftColor: priority.color }}
    >
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0 flex-1')}>
        <span
          className={cm.cn(
            'inline-flex h-9 w-9 rounded-full',
            cm.flex({ align: 'center', justify: 'center' }),
          )}
          style={{ backgroundColor: priority.bg, color: priority.color }}
          aria-hidden="true"
        >
          <span
            className={cm.cn('material-symbols-outlined text-[18px]')}
            data-icon={
              order.priority === 'rush'
                ? 'bolt'
                : order.priority === 'express'
                  ? 'rocket_launch'
                  : 'inventory_2'
            }
          >
            {order.priority === 'rush'
              ? 'bolt'
              : order.priority === 'express'
                ? 'rocket_launch'
                : 'inventory_2'}
          </span>
        </span>
        <div className={cm.cn('min-w-0 flex-1', cm.stack(1))}>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'min-w-0')}>
            <span
              className={cm.cn('font-mono text-[12px] font-bold tracking-wide')}
              style={{ color: 'var(--color-sku)' }}
            >
              {order.orderNumber}
            </span>
            <span className={cm.cn('text-on-surface-variant')}>·</span>
            <span
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'truncate text-on-surface',
              )}
            >
              {order.customerName}
            </span>
          </div>
          <p className={cm.cn('truncate text-[11px] text-on-surface-variant')}>
            <span
              className={cm.cn(cm.fontWeight('semibold'), 'uppercase tracking-wider')}
              style={{ color: priority.color }}
            >
              {t(priority.labelKey, {}, { defaultValue: priority.labelDefault })}
            </span>
            <span className={cm.cn('px-1.5')}>·</span>
            <span className={cm.cn('tabular-nums')}>
              {t(
                'orderRow.itemCount',
                { count: order.itemCount },
                { defaultValue: '{{count}} items' },
              )}
            </span>
            <span className={cm.cn('px-1.5')}>·</span>
            <span className={cm.cn('tabular-nums')}>{order.weightLb.toFixed(1)} lb</span>
            <span className={cm.cn('px-1.5')}>·</span>
            <span>{order.shippingMethod}</span>
          </p>
        </div>
      </div>
      <div className={cm.cn(cm.flex({ direction: 'col', align: 'end', gap: 'xs' }), 'shrink-0')}>
        <OrderStatusBadge status={order.status} />
        <span className={cm.cn('text-[10px] uppercase tracking-wider text-on-surface-variant')}>
          {formatRelative(order.createdAt)}
        </span>
      </div>
    </div>
  )

  return showLink ? (
    <Link to={href} className={cm.cn('block')}>
      {Inner}
    </Link>
  ) : (
    Inner
  )
}

export default OrderRow
