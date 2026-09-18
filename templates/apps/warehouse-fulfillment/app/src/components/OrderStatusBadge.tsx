import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Order lifecycle pill badge — DESIGN.md "Status Badge" component.
 *
 * Seven semantic variants driven from the `--color-order-*` token pairs in
 * theme.css. Used by the orders list, the order detail header, and the
 * pick/pack/ship action button labels.
 *
 * Translated from inventory-management/StockBadge.tsx — same dot+label pill
 * grammar, retuned to the warehouse-fulfillment lifecycle palette.
 */

export type OrderStatus =
  'pending' | 'picking' | 'packed' | 'shipped' | 'delivered' | 'returned' | 'cancelled'

interface OrderStatusBadgeProps {
  status: OrderStatus
  className?: string
}

const VARIANTS: Record<
  OrderStatus,
  { bg: string; text: string; dot: string; labelKey: string; labelDefault: string }
> = {
  pending: {
    bg: 'var(--color-order-pending-bg)',
    text: 'var(--color-order-pending)',
    dot: 'var(--color-order-pending)',
    labelKey: 'orderStatusBadge.pending',
    labelDefault: 'Pending',
  },
  picking: {
    bg: 'var(--color-order-picking-bg)',
    text: 'var(--color-order-picking)',
    dot: 'var(--color-order-picking)',
    labelKey: 'orderStatusBadge.picking',
    labelDefault: 'Picking',
  },
  packed: {
    bg: 'var(--color-order-packed-bg)',
    text: 'var(--color-order-packed)',
    dot: 'var(--color-order-packed)',
    labelKey: 'orderStatusBadge.packed',
    labelDefault: 'Packed',
  },
  shipped: {
    bg: 'var(--color-order-shipped-bg)',
    text: 'var(--color-order-shipped)',
    dot: 'var(--color-order-shipped)',
    labelKey: 'orderStatusBadge.shipped',
    labelDefault: 'Shipped',
  },
  delivered: {
    bg: 'var(--color-order-delivered-bg)',
    text: 'var(--color-order-delivered)',
    dot: 'var(--color-order-delivered)',
    labelKey: 'orderStatusBadge.delivered',
    labelDefault: 'Delivered',
  },
  returned: {
    bg: 'var(--color-order-returned-bg)',
    text: 'var(--color-order-returned)',
    dot: 'var(--color-order-returned)',
    labelKey: 'orderStatusBadge.returned',
    labelDefault: 'Returned',
  },
  cancelled: {
    bg: 'var(--color-order-cancelled-bg)',
    text: 'var(--color-order-cancelled)',
    dot: 'var(--color-order-cancelled)',
    labelKey: 'orderStatusBadge.cancelled',
    labelDefault: 'Cancelled',
  },
}

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const variant = VARIANTS[status]

  return (
    <span
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'xs' }),
        'inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]',
        className,
      )}
      style={{ backgroundColor: variant.bg, color: variant.text }}
      data-order-status={status}
    >
      <span
        aria-hidden="true"
        className={cm.cn('inline-block h-1.5 w-1.5 rounded-full')}
        style={{ backgroundColor: variant.dot }}
      />
      {t(variant.labelKey, {}, { defaultValue: variant.labelDefault })}
    </span>
  )
}

export default OrderStatusBadge
