import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface OrderItem {
  id: string
  name: string
  quantity: number
  price: number
  thumbnail?: string
  variant?: string
}

function OrderItemsCard({ items }: { items: OrderItem[] }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
      (amount || 0) / 100,
    )
  return (
    <div className={cm.cn(cm.sp('p', 6), cm.stack(6), 'bg-surface rounded-xl shadow-sm')}>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }), cm.sp('mb', 2))}>
        <span className={cm.cn('material-symbols-outlined text-success')}>shopping_bag</span>
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
          {t(
            'orderItemsCard.title',
            { count: items.length },
            { defaultValue: 'Items ({{count}})' },
          )}
        </h2>
      </div>
      <div className={cm.cn('divide-y divide-border')}>
        {items.map((item) => (
          <div key={item.id} className={cm.cn(cm.flex({ align: 'center', gap: 6 }), cm.sp('p', 6))}>
            <div
              className={cm.cn(
                cm.w(24),
                cm.h(24),
                cm.shrink0,
                'rounded-lg bg-surface-secondary overflow-hidden border border-border',
              )}
            >
              {item.thumbnail ? (
                <img
                  alt={item.name}
                  className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
                  src={item.thumbnail}
                />
              ) : (
                <div className={cm.cn(cm.w('full'), cm.h('full'), 'bg-surface-secondary')} />
              )}
            </div>
            <div className={cm.cn('flex-grow')}>
              <h3 className={cm.cn(cm.fontWeight('bold'), cm.textSize('base'), cm.sp('mb', 1))}>
                {item.name}
              </h3>
              {item.variant && (
                <p
                  className={cm.cn(cm.textSize('sm'), cm.sp('mb', 2), 'text-foreground-secondary')}
                >
                  {item.variant}
                </p>
              )}
              <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                {t(
                  'orderItemsCard.quantity',
                  { count: item.quantity },
                  { defaultValue: 'Qty: {{count}}' },
                )}
              </p>
            </div>
            <div className={cm.textRight}>
              <p className={cm.cn(cm.fontWeight('bold'), 'tabular-nums')}>
                {formatPrice(item.price)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default OrderItemsCard
export { OrderItemsCard }
