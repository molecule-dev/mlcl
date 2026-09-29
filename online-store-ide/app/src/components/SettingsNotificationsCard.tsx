import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
interface SettingsNotificationsCardProps {
  orderUpdates: boolean
  setOrderUpdates: (v: boolean) => void
  promotions: boolean
  setPromotions: (v: boolean) => void
  priceDrops: boolean
  setPriceDrops: (v: boolean) => void
  newsletter: boolean
  setNewsletter: (v: boolean) => void
}
export default function SettingsNotificationsCard({
  orderUpdates,
  setOrderUpdates,
  promotions,
  setPromotions,
  priceDrops,
  setPriceDrops,
  newsletter,
  setNewsletter,
}: SettingsNotificationsCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <section
      className={cm.cn(cm.sp('p', 6), cm.stack(6), 'bg-surface rounded-xl shadow-sm')}
      data-mol-id="section-notifications"
      id="notifications"
    >
      <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }), cm.sp('mb', 2))}>
        <span className={cm.cn('material-symbols-outlined text-success')}>notifications</span>
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
          {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
        </h2>
      </div>
      <div className={cm.stack(4)}>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
          <div>
            <h3 className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
              {t('settingsNotifications.orderUpdatesTitle', {}, { defaultValue: 'Order Updates' })}
            </h3>
            <p className={cm.cn(cm.textSize('xs'), cm.textMuted)}>
              {t(
                'settingsNotifications.orderUpdatesDescription',
                {},
                { defaultValue: 'Get notified about your shipping and delivery status.' },
              )}
            </p>
          </div>
          <label className={cm.cn(cm.cursorPointer, 'relative inline-flex items-center')}>
            <input
              aria-label={t(
                'settingsNotifications.orderUpdatesTitle',
                {},
                { defaultValue: 'Order Updates' },
              )}
              checked={orderUpdates}
              onChange={(e) => setOrderUpdates(e.target.checked)}
              className={cm.cn('sr-only peer')}
              data-mol-id="toggle-order-updates"
              type="checkbox"
            />
            <div
              className={cm.cn(
                cm.w(10),
                cm.h(5),
                cm.roundedFull,
                "bg-border-secondary peer-focus:outline-none peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-surface after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary",
              )}
            ></div>
          </label>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
          <div>
            <h3 className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
              {t(
                'settingsNotifications.promotionsTitle',
                {},
                { defaultValue: 'Promotions & Sales' },
              )}
            </h3>
            <p className={cm.cn(cm.textSize('xs'), cm.textMuted)}>
              {t(
                'settingsNotifications.promotionsDescription',
                {},
                { defaultValue: 'Receive alerts about upcoming seasonal deals and coupons.' },
              )}
            </p>
          </div>
          <label className={cm.cn(cm.cursorPointer, 'relative inline-flex items-center')}>
            <input
              aria-label={t(
                'settingsNotifications.promotionsTitle',
                {},
                { defaultValue: 'Promotions & Sales' },
              )}
              checked={promotions}
              onChange={(e) => setPromotions(e.target.checked)}
              className={cm.cn('sr-only peer')}
              data-mol-id="toggle-promotions"
              type="checkbox"
            />
            <div
              className={cm.cn(
                cm.w(10),
                cm.h(5),
                cm.roundedFull,
                "bg-border-secondary peer-focus:outline-none peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-surface after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary",
              )}
            ></div>
          </label>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
          <div>
            <h3 className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
              {t('settingsNotifications.priceDropsTitle', {}, { defaultValue: 'Price Drops' })}
            </h3>
            <p className={cm.cn(cm.textSize('xs'), cm.textMuted)}>
              {t(
                'settingsNotifications.priceDropsDescription',
                {},
                { defaultValue: 'Be first to know when items in your wishlist go on sale.' },
              )}
            </p>
          </div>
          <label className={cm.cn(cm.cursorPointer, 'relative inline-flex items-center')}>
            <input
              aria-label={t(
                'settingsNotifications.priceDropsTitle',
                {},
                { defaultValue: 'Price Drops' },
              )}
              checked={priceDrops}
              onChange={(e) => setPriceDrops(e.target.checked)}
              className={cm.cn('sr-only peer')}
              data-mol-id="toggle-price-drops"
              type="checkbox"
            />
            <div
              className={cm.cn(
                cm.w(10),
                cm.h(5),
                cm.roundedFull,
                "bg-border-secondary peer-focus:outline-none peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-surface after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary",
              )}
            ></div>
          </label>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
          <div>
            <h3 className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
              {t('settingsNotifications.newsletterTitle', {}, { defaultValue: 'Newsletter' })}
            </h3>
            <p className={cm.cn(cm.textSize('xs'), cm.textMuted)}>
              {t(
                'settingsNotifications.newsletterDescription',
                {},
                { defaultValue: 'Weekly curations of the best digital experiences.' },
              )}
            </p>
          </div>
          <label className={cm.cn(cm.cursorPointer, 'relative inline-flex items-center')}>
            <input
              aria-label={t(
                'settingsNotifications.newsletterTitle',
                {},
                { defaultValue: 'Newsletter' },
              )}
              checked={newsletter}
              onChange={(e) => setNewsletter(e.target.checked)}
              className={cm.cn('sr-only peer')}
              data-mol-id="toggle-newsletter"
              type="checkbox"
            />
            <div
              className={cm.cn(
                cm.w(10),
                cm.h(5),
                cm.roundedFull,
                "bg-border-secondary peer-focus:outline-none peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-surface after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary",
              )}
            ></div>
          </label>
        </div>
      </div>
    </section>
  )
}
export { SettingsNotificationsCard }
