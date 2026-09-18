interface NotificationSettings {
  orderConfirmation: boolean
  shippingUpdates: boolean
  marketingEmails: boolean
  reviewRequests: boolean
}
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
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
          <button
            role="switch"
            aria-checked={notifications.orderConfirmation}
            className={cm.cn(
              cm.w(10),
              cm.h(5),
              cm.roundedFull,
              cm.flex({ align: 'center' }),
              cm.sp('px', 1),
              'relative',
            )}
            data-mol-id="notif-order"
            style={{
              backgroundColor: notifications.orderConfirmation
                ? 'var(--color-in-stock)'
                : 'var(--color-toggle-off)',
            }}
            onClick={() =>
              onChange({ ...notifications, orderConfirmation: !notifications.orderConfirmation })
            }
          >
            <div
              className={cm.cn(cm.w(3), cm.h(3), cm.roundedFull, 'bg-surface')}
              style={{ marginLeft: notifications.orderConfirmation ? 'auto' : '0' }}
            ></div>
          </button>
        </div>
        <div className={cm.flex({ align: 'center', justify: 'between' })}>
          <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
            {t(
              'adminNotificationsSettings.shippingUpdates',
              {},
              { defaultValue: 'Shipping Updates' },
            )}
          </span>
          <button
            role="switch"
            aria-checked={notifications.shippingUpdates}
            className={cm.cn(
              cm.w(10),
              cm.h(5),
              cm.roundedFull,
              cm.flex({ align: 'center' }),
              cm.sp('px', 1),
              'relative',
            )}
            data-mol-id="notif-shipping"
            style={{
              backgroundColor: notifications.shippingUpdates
                ? 'var(--color-in-stock)'
                : 'var(--color-toggle-off)',
            }}
            onClick={() =>
              onChange({ ...notifications, shippingUpdates: !notifications.shippingUpdates })
            }
          >
            <div
              className={cm.cn(cm.w(3), cm.h(3), cm.roundedFull, 'bg-surface')}
              style={{ marginLeft: notifications.shippingUpdates ? 'auto' : '0' }}
            ></div>
          </button>
        </div>
        <div className={cm.flex({ align: 'center', justify: 'between' })}>
          <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
            {t(
              'adminNotificationsSettings.marketingEmails',
              {},
              { defaultValue: 'Marketing Emails' },
            )}
          </span>
          <button
            role="switch"
            aria-checked={notifications.marketingEmails}
            className={cm.cn(
              cm.w(10),
              cm.h(5),
              cm.roundedFull,
              cm.flex({ align: 'center' }),
              cm.sp('px', 1),
              'relative',
            )}
            data-mol-id="notif-marketing"
            style={{
              backgroundColor: notifications.marketingEmails
                ? 'var(--color-in-stock)'
                : 'var(--color-toggle-off)',
            }}
            onClick={() =>
              onChange({ ...notifications, marketingEmails: !notifications.marketingEmails })
            }
          >
            <div
              className={cm.cn(cm.w(3), cm.h(3), cm.roundedFull, 'bg-surface')}
              style={{ marginLeft: notifications.marketingEmails ? 'auto' : '0' }}
            ></div>
          </button>
        </div>
        <div className={cm.flex({ align: 'center', justify: 'between' })}>
          <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
            {t(
              'adminNotificationsSettings.reviewRequests',
              {},
              { defaultValue: 'Review Requests' },
            )}
          </span>
          <button
            role="switch"
            aria-checked={notifications.reviewRequests}
            className={cm.cn(
              cm.w(10),
              cm.h(5),
              cm.roundedFull,
              cm.flex({ align: 'center' }),
              cm.sp('px', 1),
              'relative',
            )}
            data-mol-id="notif-review"
            style={{
              backgroundColor: notifications.reviewRequests
                ? 'var(--color-in-stock)'
                : 'var(--color-toggle-off)',
            }}
            onClick={() =>
              onChange({ ...notifications, reviewRequests: !notifications.reviewRequests })
            }
          >
            <div
              className={cm.cn(cm.w(3), cm.h(3), cm.roundedFull, 'bg-surface')}
              style={{ marginLeft: notifications.reviewRequests ? 'auto' : '0' }}
            ></div>
          </button>
        </div>
      </div>
    </section>
  )
}

export default AdminNotificationsSettingsCard
export { AdminNotificationsSettingsCard }
