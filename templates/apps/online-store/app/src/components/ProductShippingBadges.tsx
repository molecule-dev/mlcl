import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export default function ProductShippingBadges() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(cm.grid({ cols: 2, gap: 'md' }), cm.sp('pt', 8), 'border-t border-border')}
    >
      <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }))}>
        <div
          className={cm.cn(
            cm.w(10),
            cm.h(10),
            cm.roundedFull,
            cm.flex({ align: 'center', justify: 'center' }),
            'bg-surface-secondary',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-foreground-secondary')}>
            local_shipping
          </span>
        </div>
        <div>
          <p className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'))}>
            {t('productShippingBadges.freeDelivery', {}, { defaultValue: 'Free Delivery' })}
          </p>
          <p className={cm.cn('text-[10px] text-foreground-tertiary')}>
            {t(
              'productShippingBadges.orderDeadline',
              { time: '2pm' },
              { defaultValue: 'Order before {{time}}' },
            )}
          </p>
        </div>
      </div>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }))}>
        <div
          className={cm.cn(
            cm.w(10),
            cm.h(10),
            cm.roundedFull,
            cm.flex({ align: 'center', justify: 'center' }),
            'bg-surface-secondary',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-foreground-secondary')}>
            verified_user
          </span>
        </div>
        <div>
          <p className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'))}>
            {t(
              'productShippingBadges.warranty',
              { years: 2 },
              { defaultValue: '{{years}}-Year Warranty' },
            )}
          </p>
          <p className={cm.cn('text-[10px] text-foreground-tertiary')}>
            {t(
              'productShippingBadges.coverageDetail',
              {},
              { defaultValue: 'Full manufacturer coverage' },
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
export { ProductShippingBadges }
