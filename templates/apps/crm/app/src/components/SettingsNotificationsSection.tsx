import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Switch } from '@molecule/app-ui-react'

function SettingsNotificationsSection() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [emailNotif, setEmailNotif] = useState(true)
  const [pushNotif, setPushNotif] = useState(true)
  const [dealUpdates, setDealUpdates] = useState(false)
  const [activityReminders, setActivityReminders] = useState(true)

  return (
    <section className={cm.cn(cm.sp('p', 8), 'bg-surface-container-low rounded-xl')}>
      <div className={cm.sp('mb', 6)}>
        <h2 className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}>
          {t(
            'settingsNotifications.sectionTitle',
            {},
            { defaultValue: 'Notification Preferences' },
          )}
        </h2>
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
          {t(
            'settingsNotifications.sectionDescription',
            {},
            { defaultValue: 'Decide which updates you want to receive across your platforms.' },
          )}
        </p>
      </div>
      <div className={cm.stack(1)}>
        {/* Toggle Item 1 */}
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('p', 4),
            cm.sp('mb', 2),
            'bg-surface-container-lowest rounded hover:bg-surface-container transition-colors',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-4')}>
            <span className={cm.fv92b0d261} data-icon="mail">
              mail
            </span>
            <div>
              <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                {t('settingsNotifications.emailTitle', {}, { defaultValue: 'Email Notifications' })}
              </p>
              <p className={cm.fv9e529c51}>
                {t(
                  'settingsNotifications.emailDescription',
                  {},
                  { defaultValue: 'Daily digest of account activities' },
                )}
              </p>
            </div>
          </div>
          <Switch
            checked={emailNotif}
            onChange={(e) => setEmailNotif((e.target as HTMLInputElement).checked)}
          />
        </div>
        {/* Toggle Item 2 */}
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('p', 4),
            cm.sp('mb', 2),
            'bg-surface-container-lowest rounded hover:bg-surface-container transition-colors',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-4')}>
            <span className={cm.fv92b0d261} data-icon="notifications_active">
              notifications_active
            </span>
            <div>
              <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                {t('settingsNotifications.pushTitle', {}, { defaultValue: 'Push Notifications' })}
              </p>
              <p className={cm.fv9e529c51}>
                {t(
                  'settingsNotifications.pushDescription',
                  {},
                  { defaultValue: 'Real-time alerts on your devices' },
                )}
              </p>
            </div>
          </div>
          <Switch
            checked={pushNotif}
            onChange={(e) => setPushNotif((e.target as HTMLInputElement).checked)}
          />
        </div>
        {/* Toggle Item 3 */}
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('p', 4),
            cm.sp('mb', 2),
            'bg-surface-container-lowest rounded hover:bg-surface-container transition-colors',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-4')}>
            <span className={cm.fv92b0d261} data-icon="trending_up">
              trending_up
            </span>
            <div>
              <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                {t('settingsNotifications.dealUpdatesTitle', {}, { defaultValue: 'Deal Updates' })}
              </p>
              <p className={cm.fv9e529c51}>
                {t(
                  'settingsNotifications.dealUpdatesDescription',
                  {},
                  { defaultValue: 'Get notified when stage transitions happen' },
                )}
              </p>
            </div>
          </div>
          <Switch
            checked={dealUpdates}
            onChange={(e) => setDealUpdates((e.target as HTMLInputElement).checked)}
          />
        </div>
        {/* Toggle Item 4 */}
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('p', 4),
            'bg-surface-container-lowest rounded hover:bg-surface-container transition-colors',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-4')}>
            <span className={cm.fv92b0d261} data-icon="alarm">
              alarm
            </span>
            <div>
              <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                {t(
                  'settingsNotifications.activityRemindersTitle',
                  {},
                  { defaultValue: 'Activity Reminders' },
                )}
              </p>
              <p className={cm.fv9e529c51}>
                {t(
                  'settingsNotifications.activityRemindersDescription',
                  {},
                  { defaultValue: 'Stay on top of scheduled meetings and tasks' },
                )}
              </p>
            </div>
          </div>
          <Switch
            checked={activityReminders}
            onChange={(e) => setActivityReminders((e.target as HTMLInputElement).checked)}
          />
        </div>
      </div>
    </section>
  )
}

export default SettingsNotificationsSection
export { SettingsNotificationsSection }
