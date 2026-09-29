import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function OrderSummaryCard({
  subtotal,
  shipping,
  tax,
  total,
}: {
  subtotal: number
  shipping: number
  tax: number
  total: number
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
      (amount || 0) / 100,
    )
  return (
    <div className={cm.cn(cm.sp('p', 6), cm.stack(6), 'bg-surface rounded-xl shadow-sm')}>
      <h2 className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'))}>
        {t('orderSummaryCard.title', {}, { defaultValue: 'Order Summary' })}
      </h2>
      <div className={cm.cn(cm.stack(4), 'tabular-nums')}>
        <div className={cm.cn(cm.flex({ justify: 'between' }), 'text-text-primary')}>
          <span>{t('nav.subtotal', {}, { defaultValue: 'Subtotal' })}</span>
          <span className={cm.fontWeight('medium')}>{formatPrice(subtotal)}</span>
        </div>
        <div className={cm.cn(cm.flex({ justify: 'between' }), 'text-text-primary')}>
          <span>{t('orderSummaryCard.shipping', {}, { defaultValue: 'Shipping' })}</span>
          <div className={cm.flex({ align: 'center', gap: 2 })}>
            {shipping === 0 && (
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  cm.sp('px', 2),
                  cm.textPrimary,
                  'bg-success-light rounded py-0.5',
                )}
              >
                {t('orderSummaryCard.free', {}, { defaultValue: 'FREE' })}
              </span>
            )}
            <span className={cm.fontWeight('medium')}>{formatPrice(shipping)}</span>
          </div>
        </div>
        <div className={cm.cn(cm.flex({ justify: 'between' }), 'text-text-primary')}>
          <span>{t('orderSummaryCard.estimatedTax', {}, { defaultValue: 'Estimated Tax' })}</span>
          <span className={cm.fontWeight('medium')}>{formatPrice(tax)}</span>
        </div>
        <div
          className={cm.cn(
            cm.sp('pt', 4),
            cm.flex({ justify: 'between', align: 'baseline' }),
            'border-t border-border',
          )}
        >
          <span className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
            {t('nav.total', {}, { defaultValue: 'Total' })}
          </span>
          <span
            className={cm.cn(
              cm.textSize('2xl'),
              'font-extrabold text-[var(--mol-color-secondary)]',
            )}
          >
            {formatPrice(total)}
          </span>
        </div>
      </div>
    </div>
  )
}

export default OrderSummaryCard
export { OrderSummaryCard }
