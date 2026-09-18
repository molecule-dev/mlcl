import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function CommunicationsSection({
  emailAlerts,
  pushNotifications,
  weeklyDigest,
  onEmailAlertsChange,
  onPushNotificationsChange,
  onWeeklyDigestChange,
}: {
  emailAlerts: boolean
  pushNotifications: boolean
  weeklyDigest: boolean
  onEmailAlertsChange: (v: boolean) => void
  onPushNotificationsChange: (v: boolean) => void
  onWeeklyDigestChange: (v: boolean) => void
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <section
      className={cm.cn(cm.sp('p', 8), 'rounded-3xl', 'bg-surface-container-lowest ambient-shadow')}
    >
      <h2
        className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mb', 6), 'text-success')}
      >
        {t('communicationsSection.title', {}, { defaultValue: 'Communications' })}
      </h2>
      <div className={cm.stack(6)}>
        <div className={cm.cn(cm.flex({ align: 'center' }), 'justify-between')}>
          <div>
            <p className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'))}>
              {t('communicationsSection.emailAlertsLabel', {}, { defaultValue: 'Email Alerts' })}
            </p>
            <p className={cm.cn(cm.textSize('xs'), 'text-foreground-secondary')}>
              {t(
                'communicationsSection.emailAlertsDescription',
                {},
                { defaultValue: 'Transactional receipts and login alerts.' },
              )}
            </p>
          </div>
          <label className={cm.cn(cm.cursorPointer, 'relative inline-flex items-center')}>
            <input
              aria-label={t(
                'communicationsSection.emailAlertsLabel',
                {},
                { defaultValue: 'Email Alerts' },
              )}
              checked={emailAlerts}
              className={cm.cn('sr-only peer')}
              type="checkbox"
              onChange={(e) => onEmailAlertsChange(e.target.checked)}
            />
            <div
              className={cm.cn(
                cm.roundedFull,
                cm.w(11),
                cm.h(6),
                `bg-border-secondary peer-focus:outline-none peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-surface after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-surface after:border-border-secondary after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary`,
              )}
            ></div>
          </label>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center' }), 'justify-between')}>
          <div>
            <p className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'))}>
              {t(
                'communicationsSection.pushNotificationsLabel',
                {},
                { defaultValue: 'Push Notifications' },
              )}
            </p>
            <p className={cm.cn(cm.textSize('xs'), 'text-foreground-secondary')}>
              {t(
                'communicationsSection.pushNotificationsDescription',
                {},
                { defaultValue: 'Real-time spend notifications.' },
              )}
            </p>
          </div>
          <label className={cm.cn(cm.cursorPointer, 'relative inline-flex items-center')}>
            <input
              aria-label={t(
                'communicationsSection.pushNotificationsLabel',
                {},
                { defaultValue: 'Push Notifications' },
              )}
              checked={pushNotifications}
              className={cm.cn('sr-only peer')}
              type="checkbox"
              onChange={(e) => onPushNotificationsChange(e.target.checked)}
            />
            <div
              className={cm.cn(
                cm.roundedFull,
                cm.w(11),
                cm.h(6),
                `bg-border-secondary peer-focus:outline-none peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-surface after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-surface after:border-border-secondary after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary`,
              )}
            ></div>
          </label>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center' }), 'justify-between')}>
          <div>
            <p className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'))}>
              {t('communicationsSection.weeklyDigestLabel', {}, { defaultValue: 'Weekly Digest' })}
            </p>
            <p className={cm.cn(cm.textSize('xs'), 'text-foreground-secondary')}>
              {t(
                'communicationsSection.weeklyDigestDescription',
                {},
                { defaultValue: 'Summary of your financial health.' },
              )}
            </p>
          </div>
          <label className={cm.cn(cm.cursorPointer, 'relative inline-flex items-center')}>
            <input
              aria-label={t(
                'communicationsSection.weeklyDigestLabel',
                {},
                { defaultValue: 'Weekly Digest' },
              )}
              checked={weeklyDigest}
              className={cm.cn('sr-only peer')}
              type="checkbox"
              onChange={(e) => onWeeklyDigestChange(e.target.checked)}
            />
            <div
              className={cm.cn(
                cm.roundedFull,
                cm.w(11),
                cm.h(6),
                `bg-border-secondary peer-focus:outline-none peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-surface after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-surface after:border-border-secondary after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary`,
              )}
            ></div>
          </label>
        </div>
      </div>
    </section>
  )
}

export default CommunicationsSection
export { CommunicationsSection }
