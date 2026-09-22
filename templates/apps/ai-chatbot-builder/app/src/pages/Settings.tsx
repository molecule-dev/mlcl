import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { unwrapSingle } from '@molecule/app-http'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import {
  AuthSection,
  DevicesSection,
  NotificationsSection,
  ThisDeviceSection,
} from '@molecule/app-settings-panel-react'
import { getClassMap } from '@molecule/app-ui'
import { Button, ThemeToggle } from '@molecule/app-ui-react'

import SettingsBillingSection from '../components/SettingsBillingSection.js'
import SettingsDangerZoneSection from '../components/SettingsDangerZoneSection.js'
import SettingsFooter from '../components/SettingsFooter.js'
import SettingsPageHeader from '../components/SettingsPageHeader.js'
import SettingsProfileSection from '../components/SettingsProfileSection.js'
import SettingsSideNavBar from '../components/SettingsSideNavBar.js'
import SettingsTabsBar, { type SettingsTabId } from '../components/SettingsTabsBar.js'
import SettingsTopBar from '../components/SettingsTopBar.js'

interface ProfileResponse {
  id: string
  name?: string
  email?: string
  organization?: string
  timezone?: string
  language?: string
}

const DEFAULT_TZ = 'Pacific Time (PT) - UTC-8'
const DEFAULT_LANG = 'English (US)'

function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [settingsTab, setSettingsTab] = useState<SettingsTabId>('profile')
  const { user, logout } = useAuth()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [name, setName] = useState(() => (user as { name?: string } | null)?.name || '')
  const [email, setEmail] = useState(() => (user as { email?: string } | null)?.email || '')
  const [organization, setOrganization] = useState('')
  const [timezone, setTimezone] = useState(DEFAULT_TZ)
  const [language, setLanguage] = useState(DEFAULT_LANG)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [profileLoaded, setProfileLoaded] = useState(false)

  // Load the profile (including organisation/timezone/language prefs) on
  // mount. We call the same endpoint after a save to confirm round-trip.
  useEffect(() => {
    let cancelled = false
    http
      .get<ProfileResponse>('/api/profile/me')
      .then((res) => {
        if (cancelled) return
        const body = unwrapSingle<ProfileResponse>(res.data) ?? ({} as ProfileResponse)
        if (typeof body.name === 'string') setName(body.name)
        if (typeof body.email === 'string') setEmail(body.email)
        if (typeof body.organization === 'string') setOrganization(body.organization)
        if (typeof body.timezone === 'string') setTimezone(body.timezone)
        if (typeof body.language === 'string') setLanguage(body.language)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setProfileLoaded(true)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (savedAt === null) return
    const timer = setTimeout(() => setSavedAt(null), 2500)
    return () => clearTimeout(timer)
  }, [savedAt])

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      await http.patch<ProfileResponse>('/api/profile/me', {
        name,
        email,
        organization,
        timezone,
        language,
      })
      setSavedAt(Date.now())
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleCancel() {
    setSaveError(null)
    try {
      const res = await http.get<ProfileResponse>('/api/profile/me')
      const body = unwrapSingle<ProfileResponse>(res.data) ?? ({} as ProfileResponse)
      setName(body.name ?? '')
      setEmail(body.email ?? '')
      setOrganization(body.organization ?? '')
      setTimezone(body.timezone ?? DEFAULT_TZ)
      setLanguage(body.language ?? DEFAULT_LANG)
    } catch (_error) {
      // best-effort revert; failure here just leaves the form in its current state
    }
  }

  async function handleSignOut() {
    await logout()
    navigate('/login')
  }

  void profileLoaded

  return (
    <div className={cm.cn('text-on-surface antialiased overflow-x-hidden')}>
      {/* SideNavBar Shell */}
      <SettingsSideNavBar />
      {/* Main Content Wrapper */}
      <div className={cm.cn(cm.minH('screen'), 'ml-0 md:ml-64')}>
        {/* TopNavBar Shell */}
        <SettingsTopBar />
        {/* Main Content Canvas */}
        <main className={cm.cn(cm.sp('px', 8), 'max-w-5xl', cm.mxAuto, 'pt-24 pb-32')}>
          <div className={cm.stack(8)}>
            <SettingsPageHeader />
            <SettingsTabsBar active={settingsTab} onChange={setSettingsTab} />
            <div className={cm.stack(8)}>
              {settingsTab === 'profile' && (
                <>
                  <SettingsProfileSection
                    name={name}
                    onNameChange={setName}
                    email={email}
                    onEmailChange={setEmail}
                    organization={organization}
                    onOrganizationChange={setOrganization}
                    timezone={timezone}
                    onTimezoneChange={setTimezone}
                    language={language}
                    onLanguageChange={setLanguage}
                  />
                  <SettingsBillingSection />
                  <SettingsDangerZoneSection />
                </>
              )}
              {settingsTab === 'security' && (
                <div
                  className={cm.cn(
                    cm.sp('p', 8),
                    'bg-surface-container-lowest rounded-3xl ambient-shadow',
                    cm.stack(8),
                  )}
                >
                  <AuthSection />
                  <DevicesSection />
                  <ThisDeviceSection />
                  <section className={cm.stack(3)}>
                    <h3 className={cm.cn(cm.sectionHeading)}>
                      {t('settings.session', {}, { defaultValue: 'Session' })}
                    </h3>
                    <Button
                      variant="outline"
                      onClick={handleSignOut}
                      data-mol-id="user-menu-logout"
                    >
                      {t('settings.logOut', {}, { defaultValue: 'Sign out' })}
                    </Button>
                  </section>
                </div>
              )}
              {settingsTab === 'billing' && <SettingsBillingSection />}
              {settingsTab === 'notifications' && (
                <div
                  className={cm.cn(
                    cm.sp('p', 8),
                    'bg-surface-container-lowest rounded-3xl ambient-shadow',
                  )}
                >
                  <NotificationsSection />
                </div>
              )}
              {settingsTab === 'apiKeys' && (
                <p
                  className={cm.cn(
                    cm.textSize('sm'),
                    'text-on-surface-variant rounded-2xl bg-surface-container-lowest px-6 py-8 ambient-shadow',
                  )}
                >
                  {t(
                    'settingsTabs.apiKeysPlaceholder',
                    {},
                    { defaultValue: 'Create and revoke API keys for integrations and automation.' },
                  )}
                </p>
              )}
            </div>
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
            {/* Footer Actions */}
            <SettingsFooter
              onSave={handleSave}
              onCancel={handleCancel}
              saving={saving}
              savedAt={savedAt}
              saveError={saveError}
            />
          </div>
        </main>
      </div>
    </div>
  )
}

export default Settings
export { Settings, Settings as SettingsPage }
