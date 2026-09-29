import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function OrderPaymentMethodCard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn(cm.sp('p', 6), cm.stack(6), cm.surface, 'rounded-xl shadow-sm')}>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }), cm.sp('mb', 2))}>
        <span className={cm.cn('material-symbols-outlined text-success')}>payments</span>
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
          {t('orderPaymentMethodCard.sectionTitle', {}, { defaultValue: 'Payment Method' })}
        </h2>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }))}>
        <div
          className={cm.cn(
            cm.sp('px', 2),
            cm.sp('py', 1),
            'bg-surface-secondary border border-border rounded',
          )}
        >
          <span className={cm.cn(cm.fontWeight('bold'), cm.textSize('xs'), 'text-blue-800 italic')}>
            {t(
              'orderPaymentMethodCard.cardBrand',
              { brand: 'VISA' },
              { defaultValue: '{{brand}}' },
            )}
          </span>
        </div>
        <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
          {t(
            'orderPaymentMethodCard.cardDetails',
            { brand: 'Visa', lastFour: '4242' },
            { defaultValue: '{{brand}} ending in {{lastFour}}' },
          )}
        </p>
      </div>
      <p className={cm.cn(cm.textSize('xs'), 'text-foreground-secondary')}>
        {t(
          'orderPaymentMethodCard.billingAddressMatch',
          {},
          { defaultValue: 'Billing address same as shipping' },
        )}
      </p>
    </div>
  )
}

export default OrderPaymentMethodCard
export { OrderPaymentMethodCard }
