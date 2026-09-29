import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface OrderHeaderProps {
  order: { id: string; status: string; created_at: string }
}

function OrderDetailHeader({ order }: OrderHeaderProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const formattedDate = order.created_at
    ? new Date(order.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : ''
  const statusLabels: Record<string, string> = {
    pending: t('status.pending', {}, { defaultValue: 'Pending' }),
    confirmed: t('orderStatus.confirmed', {}, { defaultValue: 'Confirmed' }),
    processing: t('orderStatus.processing', {}, { defaultValue: 'Processing' }),
    shipped: t('orderStatus.shipped', {}, { defaultValue: 'Shipped' }),
    delivered: t('orderStatus.delivered', {}, { defaultValue: 'Delivered' }),
    cancelled: t('orderStatus.cancelled', {}, { defaultValue: 'Cancelled' }),
    refunded: t('orderStatus.refunded', {}, { defaultValue: 'Refunded' }),
  }
  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between', gap: 4 }),
        cm.sp('mb', 8),
        'md:flex-row md:items-center',
      )}
    >
      <div>
        <h1 className={cm.cn(cm.textSize('3xl'), 'font-extrabold text-foreground tracking-tight')}>
          {t(
            'orderDetailHeader.orderId',
            { id: order.id?.slice(0, 8) },
            { defaultValue: 'Order #{{id}}' },
          )}
        </h1>
        <p className={cm.cn(cm.sp('mt', 1), 'text-foreground-secondary')}>
          {t(
            'orderDetailHeader.placedOn',
            { date: formattedDate },
            { defaultValue: 'Placed on {{date}}' },
          )}
        </p>
      </div>
      <div className={cm.flex({ align: 'center' })}>
        <span
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 1),
            cm.roundedFull,
            cm.textPrimary,
            cm.fontWeight('semibold'),
            cm.textSize('sm'),
            'inline-flex items-center gap-1.5 bg-success-light border border-green-100',
          )}
        >
          <span className={cm.cn(cm.w(2), cm.h(2), cm.roundedFull, 'bg-primary')}></span>
          {statusLabels[order.status] ?? order.status}
        </span>
      </div>
    </div>
  )
}

export default OrderDetailHeader
export { OrderDetailHeader }
