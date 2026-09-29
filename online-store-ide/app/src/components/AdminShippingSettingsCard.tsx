import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface ShippingSettings {
  freeShippingThreshold: number
  standardRate: number
  expressRate: number
  estimatedDelivery: string
}
function AdminShippingSettingsCard({
  shipping,
  onChange,
}: {
  shipping: ShippingSettings
  onChange: (s: ShippingSettings) => void
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <section className={cm.cn(cm.sp('p', 6), cm.stack(6), 'bg-surface rounded-xl shadow-sm')}>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }), cm.sp('mb', 2))}>
        <span className={cm.cn('material-symbols-outlined text-success')}>local_shipping</span>
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
          {t('adminShippingSettingsCard.title', {}, { defaultValue: 'Shipping Settings' })}
        </h2>
      </div>
      <div className={cm.grid({ cols: 2, gap: 'md' })}>
        <div className={cm.cn('col-span-2')}>
          <label
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'block text-foreground-secondary uppercase tracking-wider mb-1.5',
            )}
          >
            {t(
              'adminShippingSettingsCard.freeShippingThreshold',
              {},
              { defaultValue: 'Free Shipping Threshold' },
            )}
          </label>
          <div className={cm.cn('relative')}>
            <span
              className={cm.cn(
                cm.textSize('sm'),
                'absolute left-3 top-1/2 -translate-y-1/2 text-foreground-tertiary',
              )}
            >
              {t('common.currencySymbol', {}, { defaultValue: '$' })}
            </span>
            <input
              className={cm.cn(
                cm.w('full'),
                cm.sp('p', 3),
                cm.sp('pl', 8),
                cm.textSize('sm'),
                'bg-surface-secondary border-none rounded-lg focus:ring-2 focus:ring-green-500 tabular-nums',
              )}
              data-mol-id="input-shipping-threshold"
              type="text"
              value={shipping.freeShippingThreshold}
              onChange={(e) =>
                onChange({ ...shipping, freeShippingThreshold: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
        </div>
        <div>
          <label
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'block text-foreground-secondary uppercase tracking-wider mb-1.5',
            )}
          >
            {t('adminShippingSettingsCard.standardRate', {}, { defaultValue: 'Standard Rate' })}
          </label>
          <div className={cm.cn('relative')}>
            <span
              className={cm.cn(
                cm.textSize('sm'),
                'absolute left-3 top-1/2 -translate-y-1/2 text-foreground-tertiary',
              )}
            >
              {t('common.currencySymbol', {}, { defaultValue: '$' })}
            </span>
            <input
              className={cm.cn(
                cm.w('full'),
                cm.sp('p', 3),
                cm.sp('pl', 8),
                cm.textSize('sm'),
                'bg-surface-secondary border-none rounded-lg focus:ring-2 focus:ring-green-500 tabular-nums',
              )}
              data-mol-id="input-standard-rate"
              type="text"
              value={shipping.standardRate}
              onChange={(e) =>
                onChange({ ...shipping, standardRate: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
        </div>
        <div>
          <label
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'block text-foreground-secondary uppercase tracking-wider mb-1.5',
            )}
          >
            {t('adminShippingSettingsCard.expressRate', {}, { defaultValue: 'Express Rate' })}
          </label>
          <div className={cm.cn('relative')}>
            <span
              className={cm.cn(
                cm.textSize('sm'),
                'absolute left-3 top-1/2 -translate-y-1/2 text-foreground-tertiary',
              )}
            >
              {t('common.currencySymbol', {}, { defaultValue: '$' })}
            </span>
            <input
              className={cm.cn(
                cm.w('full'),
                cm.sp('p', 3),
                cm.sp('pl', 8),
                cm.textSize('sm'),
                'bg-surface-secondary border-none rounded-lg focus:ring-2 focus:ring-green-500 tabular-nums',
              )}
              data-mol-id="input-express-rate"
              type="text"
              value={shipping.expressRate}
              onChange={(e) =>
                onChange({ ...shipping, expressRate: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
        </div>
        <div className={cm.cn('col-span-2')}>
          <label
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'block text-foreground-secondary uppercase tracking-wider mb-1.5',
            )}
          >
            {t(
              'adminShippingSettingsCard.estimatedDelivery',
              {},
              { defaultValue: 'Estimated Delivery' },
            )}
          </label>
          <input
            className={cm.cn(
              cm.w('full'),
              cm.sp('p', 3),
              cm.textSize('sm'),
              'bg-surface-secondary border-none rounded-lg focus:ring-2 focus:ring-green-500',
            )}
            data-mol-id="input-delivery-time"
            type="text"
            value={shipping.estimatedDelivery}
            onChange={(e) => onChange({ ...shipping, estimatedDelivery: e.target.value })}
          />
        </div>
      </div>
    </section>
  )
}

export default AdminShippingSettingsCard
export { AdminShippingSettingsCard }
