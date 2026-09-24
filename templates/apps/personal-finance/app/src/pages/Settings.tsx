import { useEffect, useState } from 'react'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ThemeToggle } from '@molecule/app-ui-react'

import AppearanceSection from '../components/AppearanceSection.js'
import CommunicationsSection from '../components/CommunicationsSection.js'
import DataPrivacySection from '../components/DataPrivacySection.js'
import ProfileIdentitySection from '../components/ProfileIdentitySection.js'
import RegionalPreferencesSection from '../components/RegionalPreferencesSection.js'
import SecurityAccessSection from '../components/SecurityAccessSection.js'
import SettingsFooter from '../components/SettingsFooter.js'
import SettingsPageHeader from '../components/SettingsPageHeader.js'
import SettingsSaveButton from '../components/SettingsSaveButton.js'
import SettingsTopNavBar from '../components/SettingsTopNavBar.js'
import SideNavBar from '../components/SideNavBar.js'
function Settings() {
  const cm = getClassMap()
  const { t, locale, setLocale } = useTranslation()
  const { user } = useAuth<{ id?: string; name?: string; email?: string }>()
  const http = useHttpClient()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [emailAlerts, setEmailAlerts] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(false)
  const [weeklyDigest, setWeeklyDigest] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  useEffect(() => {
    if (user) {
      setName(user.name ?? '')
      setEmail(user.email ?? '')
    }
  }, [user])

  useEffect(() => {
    if (savedAt === null) return
    const timer = setTimeout(() => setSavedAt(null), 2500)
    return () => clearTimeout(timer)
  }, [savedAt])

  async function handleSave() {
    if (!user || !(user as { id?: string }).id) return
    setSaving(true)
    try {
      await http.patch(`/api/users/${(user as { id: string }).id}`, {
        name,
        email,
        oauthData: {
          notifications: { email: emailAlerts, push: pushNotifications, weekly: weeklyDigest },
        },
      })
      setSavedAt(Date.now())
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteAccount() {
    if (!user || !(user as { id?: string }).id) return
    // Confirmation is owned by the DataPrivacySection ConfirmButton (two-click
    // arm/commit) — this handler only runs on the committing click.
    try {
      await http.delete(`/api/users/${(user as { id: string }).id}`)
      window.location.href = '/login'
    } catch (_error) {
      // best-effort delete; if it fails the server-side session will expire naturally
    }
  }

  return (
    <div
      className={cm.cn(
        'bg-background text-on-surface selection:bg-primary-container selection:text-on-primary-container',
      )}
    >
      {/* Sidebar Navigation */}
      <SideNavBar />
      {/* Main Viewport */}
      <main
        className={cm.cn(cm.flex({ direction: 'col' }), cm.minH('screen'), 'md:ml-64 relative')}
      >
        {/* Top Navigation */}
        <SettingsTopNavBar />
        {/* Content Canvas */}
        <div
          className={cm.cn(
            cm.flex1,
            cm.sp('p', 8),
            cm.stack(8),
            'max-w-7xl',
            cm.w('full'),
            cm.mxAuto,
          )}
        >
          <SettingsPageHeader onSave={handleSave} saving={saving} savedAt={savedAt} />
          {/* Settings Grid Layout */}
          <div className={cm.grid({ cols: 12, gap: 'xl' })}>
            {/* Left Column */}
            <div className={cm.cn(cm.stack(8), 'col-span-12 lg:col-span-7')}>
              {/* Profile Section */}
              <ProfileIdentitySection
                name={name}
                email={email}
                onNameChange={setName}
                onEmailChange={setEmail}
              />
              {/* Preferences Section */}
              <RegionalPreferencesSection locale={locale} onLocaleChange={setLocale} />
              {/* Security Section */}
              <SecurityAccessSection />
            </div>
            {/* Right Column */}
            <div className={cm.cn(cm.stack(8), 'col-span-12 lg:col-span-5')}>
              {/* Appearance Section */}
              <AppearanceSection />
              <CommunicationsSection
                emailAlerts={emailAlerts}
                pushNotifications={pushNotifications}
                weeklyDigest={weeklyDigest}
                onEmailAlertsChange={setEmailAlerts}
                onPushNotificationsChange={setPushNotifications}
                onWeeklyDigestChange={setWeeklyDigest}
              />
              {/* Data Section */}
              <DataPrivacySection onDeleteAccount={handleDeleteAccount} />
            </div>
          </div>
          <SettingsSaveButton onSave={handleSave} saving={saving} />
        </div>
        {/* Footer Decoration */}
        <SettingsFooter />
      </main>
      <section className={cm.cn(cm.sp('p', 8), 'bg-surface-container-low rounded-xl')}>
        <div className={cm.sp('mb', 6)}>
          <h3 className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}>
            {t('settings.appearance.title', {}, { defaultValue: 'Appearance' })}
          </h3>
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {t(
              'settings.appearance.description',
              {},
              { defaultValue: 'Toggle between light and dark mode.' },
            )}
          </p>
        </div>
        <ThemeToggle />
      </section>
    </div>
  )
}

export default Settings
export { Settings, Settings as SettingsPage }
