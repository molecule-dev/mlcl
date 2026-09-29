import { useEffect } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import AccountSettingsSection from '../components/AccountSettingsSection.js'
import AppearanceSettingsSection from '../components/AppearanceSettingsSection.js'
import DeviceSettingsSection from '../components/DeviceSettingsSection.js'
import IntegrationsSettingsSection from '../components/IntegrationsSettingsSection.js'
import NotificationsSettingsSection from '../components/NotificationsSettingsSection.js'
import ProfileSettingsSection from '../components/ProfileSettingsSection.js'

function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const pageTitle = t('nav.settings', {}, { defaultValue: 'Settings' })

  useEffect(() => {
    document.title = pageTitle
  }, [pageTitle])

  return (
    <div
      aria-label={pageTitle}
      className={cm.cn(cm.maxW('4xl'), 'px-4 md:px-8', cm.sp('py', 8), 'space-y-10')}
    >
      <header>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>{pageTitle}</h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'settings.subheading',
            {},
            { defaultValue: 'Profile, notifications, appearance, and account' },
          )}
        </p>
      </header>
      <ProfileSettingsSection />
      <NotificationsSettingsSection />
      <AppearanceSettingsSection />
      <AccountSettingsSection />
      <DeviceSettingsSection />
      <IntegrationsSettingsSection />
    </div>
  )
}

export default Settings
export { Settings, Settings as SettingsPage }
