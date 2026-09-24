interface NotificationSettings {
  orderConfirmation: boolean
  shippingUpdates: boolean
  marketingEmails: boolean
  reviewRequests: boolean
}
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Switch } from '@molecule/app-ui-react'
function AdminNotificationsSettingsCard({
  notifications,
  onChange,
}: {
  notifications: NotificationSettings
  onChange: (n: NotificationSettings) => void
}) {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <section className={cm.cn(cm.sp('p', 6), cm.stack(6), 'bg-surface rounded-xl shadow-sm')}>
      <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }), cm.sp('mb', 2))}>
        <span className={cm.cn('material-symbols-outlined text-success')}>
          notifications_active
        </span>
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
          {t('adminNotificationsSettings.title', {}, { defaultValue: 'Email Notifications' })}
        </h2>
      </div>
      <div className={cm.stack(4)}>
        <div className={cm.flex({ align: 'center', justify: 'between' })}>
          <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
            {t(
              'adminNotificationsSettings.orderConfirmation',
              {},
              { defaultValue: 'Order Confirmation' },
            )}
          </span>
          <Switch
            checked={notifications.orderConfirmation}
            onChange={(e) =>
              onChange({
                ...notifications,
                orderConfirmation: (e.target as HTMLInputElement).checked,
              })
            }
            size="md"
            color="success"
            data-mol-id="notif-order"
            aria-label={t(
              'adminNotificationsSettings.orderConfirmation',
              {},
              { defaultValue: 'Order Confirmation' },
            )}
          />
        </div>
        <div className={cm.flex({ align: 'center', justify: 'between' })}>
          <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
            {t(
              'adminNotificationsSettings.shippingUpdates',
              {},
              { defaultValue: 'Shipping Updates' },
            )}
          </span>
          <Switch
            checked={notifications.shippingUpdates}
            onChange={(e) =>
              onChange({
                ...notifications,
                shippingUpdates: (e.target as HTMLInputElement).checked,
              })
            }
            size="md"
            color="success"
            data-mol-id="notif-shipping"
            aria-label={t(
              'adminNotificationsSettings.shippingUpdates',
              {},
              { defaultValue: 'Shipping Updates' },
            )}
          />
        </div>
        <div className={cm.flex({ align: 'center', justify: 'between' })}>
          <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
            {t(
              'adminNotificationsSettings.marketingEmails',
              {},
              { defaultValue: 'Marketing Emails' },
            )}
          </span>
          <Switch
            checked={notifications.marketingEmails}
            onChange={(e) =>
              onChange({
                ...notifications,
                marketingEmails: (e.target as HTMLInputElement).checked,
              })
            }
            size="md"
            color="success"
            data-mol-id="notif-marketing"
            aria-label={t(
              'adminNotificationsSettings.marketingEmails',
              {},
              { defaultValue: 'Marketing Emails' },
            )}
          />
        </div>
        <div className={cm.flex({ align: 'center', justify: 'between' })}>
          <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
            {t(
              'adminNotificationsSettings.reviewRequests',
              {},
              { defaultValue: 'Review Requests' },
            )}
          </span>
          <Switch
            checked={notifications.reviewRequests}
            onChange={(e) =>
              onChange({
                ...notifications,
                reviewRequests: (e.target as HTMLInputElement).checked,
              })
            }
            size="md"
            color="success"
            data-mol-id="notif-review"
            aria-label={t(
              'adminNotificationsSettings.reviewRequests',
              {},
              { defaultValue: 'Review Requests' },
            )}
          />
        </div>
      </div>
    </section>
  )
}

export default AdminNotificationsSettingsCard
export { AdminNotificationsSettingsCard }
