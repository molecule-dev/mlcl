// Phase 1 baseline — verbatim JSX of design-project-management-settings.html
// Do not hand-edit; Phase 2 will extract sections one at a time.
import { useEffect } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import AccountSettingsSection from '../components/AccountSettingsSection.js'
import AppearanceSettingsSection from '../components/AppearanceSettingsSection.js'
import DeviceSettingsSection from '../components/DeviceSettingsSection.js'
import NotificationsSettingsSection from '../components/NotificationsSettingsSection.js'
import ProfileSettingsSection from '../components/ProfileSettingsSection.js'
import SettingsTopAppBar from '../components/SettingsTopAppBar.js'
import SideNavBar from '../components/SideNavBar.js'
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
      className={cm.cn(cm.surface, 'text-on-surface antialiased selection:bg-primary-fixed')}
    >
      {/* SideNavBar (The Anchor) */}
      <SideNavBar />
      <SettingsTopAppBar />
      {/* Main Content Canvas */}
      <main className={cm.cn(cm.sp('px', 16), 'max-w-6xl', 'ml-[280px] pt-24 pb-20')}>
        <div className={cm.stack(12)}>
          {/* Profile Section */}
          <ProfileSettingsSection />
          {/* Notifications Section */}
          <NotificationsSettingsSection />
          {/* Appearance Section */}
          <AppearanceSettingsSection />
          {/* Account Section */}
          <AccountSettingsSection />
          {/* Devices Section */}
          <DeviceSettingsSection />
        </div>
      </main>
    </div>
  )
}

export default Settings
export { Settings, Settings as SettingsPage }
