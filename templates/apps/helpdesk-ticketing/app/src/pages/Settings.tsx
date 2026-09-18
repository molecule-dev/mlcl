import { useEffect, useState } from 'react'

import { error as logError } from '@molecule/app-logger'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import SettingsAppearanceSection from '../components/SettingsAppearanceSection.js'
import SettingsDangerZone from '../components/SettingsDangerZone.js'
import SettingsNotificationsSection from '../components/SettingsNotificationsSection.js'
import SettingsPageHeader from '../components/SettingsPageHeader.js'
import SettingsProfileSection from '../components/SettingsProfileSection.js'
import SettingsSecuritySection from '../components/SettingsSecuritySection.js'
import SettingsTeamSection from '../components/SettingsTeamSection.js'
import SettingsTopBar from '../components/SettingsTopBar.js'
import SideNavBar from '../components/SideNavBar.js'
import { applyThemeAttribute } from '../lib/theme.js'

interface MeResponse {
  id: string
  email: string | null
  name: string | null
  profile?: {
    jobTitle?: string | null
    timezone?: string | null
  }
  notification_preferences?: {
    newTicketsEmail?: boolean
    dailySummaryEmail?: boolean
    mentionsEmail?: boolean
    urgentPush?: boolean
    slaBreachPush?: boolean
    digestFrequency?: string
  }
  preferences?: {
    theme?: 'light' | 'dark' | 'system'
    language?: string
    compactMode?: boolean
  }
}

function Settings() {
  const cm = getClassMap()
  const { user } = useAuth()
  const http = useHttpClient()
  const userData = user as Record<string, unknown> | null
  const { t } = useTranslation()

  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [timezone, setTimezone] = useState(
    t('settings.defaultTimezone', {}, { defaultValue: '(GMT-08:00) Pacific Time (US & Canada)' }),
  )
  const [newTicketsEmail, setNewTicketsEmail] = useState(true)
  const [dailySummaryEmail, setDailySummaryEmail] = useState(true)
  const [mentionsEmail, setMentionsEmail] = useState(false)
  const [urgentPush, setUrgentPush] = useState(true)
  const [slaBreachPush, setSlaBreachPush] = useState(true)
  const [digestFrequency, setDigestFrequency] = useState(
    t('settings.defaultDigestFrequency', {}, { defaultValue: 'Every hour' }),
  )
  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>('light')
  const [language, setLanguage] = useState(
    t('settings.defaultLanguage', {}, { defaultValue: 'English (US)' }),
  )
  const [compactMode, setCompactMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deactivating, setDeactivating] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [savingNotifications, setSavingNotifications] = useState(false)
  const [savingAppearance, setSavingAppearance] = useState(false)

  // Theme picks immediately apply to <html data-theme>; persistence happens
  // when the user clicks Save. This preserves the design contract: the
  // page reflects the new theme the moment you click it, even before the
  // PUT round-trips.
  function setTheme(next: 'light' | 'dark' | 'system') {
    setThemeState(next)
    applyThemeAttribute(next)
  }

  // Hydrate from /api/users/me on mount so saved preferences round-trip
  // through reload. Falls back to the auth context for the basic email/name.
  useEffect(() => {
    let cancelled = false
    async function load() {
      if (userData) {
        setEmail((userData.email as string) || '')
        setName((userData.name as string) || '')
      }
      try {
        const res = await http.get<MeResponse>('/api/users/me')
        if (cancelled) return
        const me = (res as unknown as { data?: MeResponse })?.data ?? (res as unknown as MeResponse)
        if (!me) return
        if (me.email) setEmail(me.email)
        if (me.name !== null && me.name !== undefined) setName(me.name)
        if (me.profile?.jobTitle != null) setJobTitle(me.profile.jobTitle)
        if (me.profile?.timezone != null) setTimezone(me.profile.timezone)
        const np = me.notification_preferences ?? {}
        if (typeof np.newTicketsEmail === 'boolean') setNewTicketsEmail(np.newTicketsEmail)
        if (typeof np.dailySummaryEmail === 'boolean') setDailySummaryEmail(np.dailySummaryEmail)
        if (typeof np.mentionsEmail === 'boolean') setMentionsEmail(np.mentionsEmail)
        if (typeof np.urgentPush === 'boolean') setUrgentPush(np.urgentPush)
        if (typeof np.slaBreachPush === 'boolean') setSlaBreachPush(np.slaBreachPush)
        if (np.digestFrequency) setDigestFrequency(np.digestFrequency)
        const pr = me.preferences ?? {}
        if (pr.theme) {
          setThemeState(pr.theme)
          applyThemeAttribute(pr.theme)
        }
        if (pr.language) setLanguage(pr.language)
        if (typeof pr.compactMode === 'boolean') setCompactMode(pr.compactMode)
        // Hydration failure is safe to ignore — form fields stay at their defaults
      } catch (_error) {
        // intentional noop — UI defaults remain; user can still edit and save
      }
    }
    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, http]) // userData is derived from user — re-running on user change is sufficient

  async function handleProfileSave() {
    setSaving(true)
    setMessage(null)
    try {
      await http.put('/api/users/me', { name, jobTitle, timezone })
      // Email lives on the canonical user record, not the /me preferences
      // surface — persist it through the molecule user resource's
      // PATCH /api/users/:id (auth-self) endpoint.
      const userId = userData?.id as string | undefined
      if (userId && email) {
        await http.patch(`/api/users/${userId}`, { email })
      }
      setMessage({
        type: 'success',
        text: t(
          'settings.profileSaveSuccess',
          {},
          { defaultValue: 'Profile updated successfully.' },
        ),
      })
    } catch (error) {
      logError('settings.handleProfileSave', error)
      setMessage({
        type: 'error',
        text: t('settings.profileSaveError', {}, { defaultValue: 'Failed to update profile.' }),
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate() {
    setDeactivating(true)
    try {
      await http.put('/api/users/me/deactivate', {})
      window.location.href = '/login'
    } catch (error) {
      logError('settings.handleDeactivate', error)
      setMessage({
        type: 'error',
        text: t('settings.deactivateError', {}, { defaultValue: 'Failed to deactivate account.' }),
      })
      setDeactivating(false)
    }
  }

  async function handleNotificationsSave() {
    setSavingNotifications(true)
    setMessage(null)
    try {
      await http.put('/api/users/me/notification-preferences', {
        newTicketsEmail,
        dailySummaryEmail,
        mentionsEmail,
        urgentPush,
        slaBreachPush,
        digestFrequency,
      })
      setMessage({
        type: 'success',
        text: t(
          'settings.notificationsSaveSuccess',
          {},
          { defaultValue: 'Notification preferences updated successfully.' },
        ),
      })
    } catch (error) {
      logError('settings.handleNotificationsSave', error)
      setMessage({
        type: 'error',
        text: t(
          'settings.notificationsSaveError',
          {},
          { defaultValue: 'Failed to update notification preferences.' },
        ),
      })
    } finally {
      setSavingNotifications(false)
    }
  }

  async function handleAppearanceSave() {
    setSavingAppearance(true)
    setMessage(null)
    try {
      await http.put('/api/users/me/preferences', { theme, language, compactMode })
      setMessage({
        type: 'success',
        text: t(
          'settings.appearanceSaveSuccess',
          {},
          { defaultValue: 'Appearance settings updated successfully.' },
        ),
      })
    } catch (error) {
      logError('settings.handleAppearanceSave', error)
      setMessage({
        type: 'error',
        text: t(
          'settings.appearanceSaveError',
          {},
          { defaultValue: 'Failed to update appearance settings.' },
        ),
      })
    } finally {
      setSavingAppearance(false)
    }
  }

  return (
    <div className={cm.cn(cm.surface, 'selection:bg-primary-fixed')}>
      {/* Shell Layout */}
      <div className={cm.cn(cm.flex(), cm.minH('screen'))}>
        <SideNavBar />
        {/* Main Content Area */}
        <main className={cm.cn(cm.flex1, cm.minH('screen'), 'ml-[240px] bg-surface')}>
          {/* TopAppBar */}
          <SettingsTopBar />
          <div
            className={cm.cn(
              cm.mxAuto,
              cm.sp('px', 8),
              cm.sp('py', 12),
              cm.maxW('4xl'),
              cm.stack(10),
            )}
          >
            <SettingsPageHeader />
            {message && (
              <div
                data-mol-id="settings-message"
                data-mol-message-type={message.type}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  'rounded-lg',
                  message.type === 'success'
                    ? 'bg-tertiary-container text-on-tertiary-container'
                    : 'bg-error-container text-on-error-container',
                  cm.flex({ justify: 'between', align: 'center' }),
                )}
              >
                {message.text}
                <button
                  onClick={() => setMessage(null)}
                  className={cm.cn(
                    cm.sp('ml', 4),
                    cm.textSize('xs'),
                    'underline opacity-80 hover:opacity-100',
                  )}
                >
                  {t('common.dismiss', {}, { defaultValue: 'Dismiss' })}
                </button>
              </div>
            )}
            {/* 1. Profile Settings */}
            <SettingsProfileSection
              name={name}
              setName={setName}
              email={email}
              setEmail={setEmail}
              jobTitle={jobTitle}
              setJobTitle={setJobTitle}
              timezone={timezone}
              setTimezone={setTimezone}
              saving={saving}
              onSave={handleProfileSave}
            />
            {/* 2. Notification Preferences */}
            <SettingsNotificationsSection
              newTicketsEmail={newTicketsEmail}
              setNewTicketsEmail={setNewTicketsEmail}
              dailySummaryEmail={dailySummaryEmail}
              setDailySummaryEmail={setDailySummaryEmail}
              mentionsEmail={mentionsEmail}
              setMentionsEmail={setMentionsEmail}
              urgentPush={urgentPush}
              setUrgentPush={setUrgentPush}
              slaBreachPush={slaBreachPush}
              setSlaBreachPush={setSlaBreachPush}
              digestFrequency={digestFrequency}
              setDigestFrequency={setDigestFrequency}
              saving={savingNotifications}
              onSave={handleNotificationsSave}
            />
            {/* 3. Appearance */}
            <SettingsAppearanceSection
              theme={theme}
              setTheme={setTheme}
              language={language}
              setLanguage={setLanguage}
              compactMode={compactMode}
              setCompactMode={setCompactMode}
              saving={savingAppearance}
              onSave={handleAppearanceSave}
            />
            <SettingsSecuritySection />
            <SettingsTeamSection />
            {/* Danger Zone */}
            <SettingsDangerZone onDeactivate={handleDeactivate} deactivating={deactivating} />
          </div>
        </main>
      </div>
    </div>
  )
}

export default Settings
export { Settings, Settings as SettingsPage }
