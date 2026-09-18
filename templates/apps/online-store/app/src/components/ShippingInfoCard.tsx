import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface ShippingInfo {
  name?: string
  line1?: string
  line2?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  carrier?: string
}

function ShippingInfoCard({ shippingInfo }: { shippingInfo: ShippingInfo }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.cn(cm.sp('p', 6), cm.stack(6), 'bg-surface rounded-xl shadow-sm')}>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }), cm.sp('mb', 2))}>
        <span className={cm.cn('material-symbols-outlined text-success')}>local_shipping</span>
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
          {t('shippingInfoCard.title', {}, { defaultValue: 'Shipping Info' })}
        </h2>
      </div>
      <div className={cm.cn(cm.stack(1), cm.textSize('sm'))}>
        <p className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'), cm.sp('mb', 2))}>
          {shippingInfo.name}
        </p>
        {shippingInfo.line1 && <p>{shippingInfo.line1}</p>}
        {shippingInfo.line2 && <p>{shippingInfo.line2}</p>}
        {(shippingInfo.city || shippingInfo.state || shippingInfo.postalCode) && (
          <p>
            {[shippingInfo.city, shippingInfo.state, shippingInfo.postalCode]
              .filter(Boolean)
              .join(', ')}
          </p>
        )}
        {shippingInfo.country && <p>{shippingInfo.country}</p>}
      </div>
      <div
        className={cm.cn(
          cm.sp('pt', 6),
          cm.flex({ align: 'center', gap: 3 }),
          'border-t border-gray-50',
        )}
      >
        <div className={cm.cn(cm.sp('p', 2), 'bg-surface-secondary rounded')}>
          <span className={cm.cn('material-symbols-outlined text-foreground-secondary')}>
            box_edit
          </span>
        </div>
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'text-foreground-secondary uppercase tracking-wider',
            )}
          >
            {t('shippingInfoCard.methodLabel', {}, { defaultValue: 'Method' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
            {shippingInfo.carrier ??
              t('shippingInfoCard.defaultCarrier', {}, { defaultValue: 'Standard Shipping' })}
          </p>
        </div>
      </div>
    </div>
  )
}

export default ShippingInfoCard
export { ShippingInfoCard }
