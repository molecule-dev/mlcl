/** Loaded form fields use the bonded form controller: edit setters mark dirty; fill setters preserve edits. */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useAuth, useForm, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import AppShell from '../components/AppShell.js'
import SettingsAppearanceSection from '../components/SettingsAppearanceSection.js'
import SettingsDangerZone from '../components/SettingsDangerZone.js'
import SettingsNotificationsSection from '../components/SettingsNotificationsSection.js'
import SettingsPageHeader from '../components/SettingsPageHeader.js'
import SettingsProfileSection from '../components/SettingsProfileSection.js'
import SettingsSecuritySection from '../components/SettingsSecuritySection.js'
import SettingsTeamSection from '../components/SettingsTeamSection.js'
import SettingsTopBar from '../components/SettingsTopBar.js'
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
  const navigate = useNavigate()
  const cm = getClassMap()
  const { user, logout } = useAuth()
  const http = useHttpClient()
  const userData = user as Record<string, unknown> | null
  const { t } = useTranslation()

  const [email, setEmail, fillEmail] = useForm({
    defaultValues: { email: '' },
    resetOptions: { keepDirtyValues: true },
    resetKey: JSON.stringify(user && typeof user === 'object' && 'id' in user ? user.id : null),
  }).asState('email')
  const [name, setName, fillName] = useForm({
    defaultValues: { name: '' },
    resetOptions: { keepDirtyValues: true },
    resetKey: JSON.stringify(user && typeof user === 'object' && 'id' in user ? user.id : null),
  }).asState('name')
  const [jobTitle, setJobTitle, fillJobTitle] = useForm({
    defaultValues: { jobTitle: '' },
    resetOptions: { keepDirtyValues: true },
    resetKey: JSON.stringify(user && typeof user === 'object' && 'id' in user ? user.id : null),
  }).asState('jobTitle')
  const [timezone, setTimezone, fillTimezone] = useForm({
    defaultValues: {
      timezone: t(
        'settings.defaultTimezone',
        {},
        { defaultValue: '(GMT-08:00) Pacific Time (US & Canada)' },
      ),
    },
    resetOptions: { keepDirtyValues: true },
    resetKey: JSON.stringify(user && typeof user === 'object' && 'id' in user ? user.id : null),
  }).asState('timezone')
  const [newTicketsEmail, setNewTicketsEmail, fillNewTicketsEmail] = useForm({
    defaultValues: { newTicketsEmail: true },
    resetOptions: { keepDirtyValues: true },
    resetKey: JSON.stringify(user && typeof user === 'object' && 'id' in user ? user.id : null),
  }).asState('newTicketsEmail')
  const [dailySummaryEmail, setDailySummaryEmail, fillDailySummaryEmail] = useForm({
    defaultValues: { dailySummaryEmail: true },
    resetOptions: { keepDirtyValues: true },
    resetKey: JSON.stringify(user && typeof user === 'object' && 'id' in user ? user.id : null),
  }).asState('dailySummaryEmail')
  const [mentionsEmail, setMentionsEmail, fillMentionsEmail] = useForm({
    defaultValues: { mentionsEmail: false },
    resetOptions: { keepDirtyValues: true },
    resetKey: JSON.stringify(user && typeof user === 'object' && 'id' in user ? user.id : null),
  }).asState('mentionsEmail')
  const [urgentPush, setUrgentPush, fillUrgentPush] = useForm({
    defaultValues: { urgentPush: true },
    resetOptions: { keepDirtyValues: true },
    resetKey: JSON.stringify(user && typeof user === 'object' && 'id' in user ? user.id : null),
  }).asState('urgentPush')
  const [slaBreachPush, setSlaBreachPush, fillSlaBreachPush] = useForm({
    defaultValues: { slaBreachPush: true },
    resetOptions: { keepDirtyValues: true },
    resetKey: JSON.stringify(user && typeof user === 'object' && 'id' in user ? user.id : null),
  }).asState('slaBreachPush')
  const [digestFrequency, setDigestFrequency, fillDigestFrequency] = useForm({
    defaultValues: {
      digestFrequency: t('settings.defaultDigestFrequency', {}, { defaultValue: 'Every hour' }),
    },
    resetOptions: { keepDirtyValues: true },
    resetKey: JSON.stringify(user && typeof user === 'object' && 'id' in user ? user.id : null),
  }).asState('digestFrequency')
  const [theme, setThemeState, fillThemeState] = useForm({
    defaultValues: { theme: 'light' as 'light' | 'dark' | 'system' },
    resetOptions: { keepDirtyValues: true },
    resetKey: JSON.stringify(user && typeof user === 'object' && 'id' in user ? user.id : null),
  }).asState('theme')
  const [language, setLanguage, fillLanguage] = useForm({
    defaultValues: {
      language: t('settings.defaultLanguage', {}, { defaultValue: 'English (US)' }),
    },
    resetOptions: { keepDirtyValues: true },
    resetKey: JSON.stringify(user && typeof user === 'object' && 'id' in user ? user.id : null),
  }).asState('language')
  const [compactMode, setCompactMode, fillCompactMode] = useForm({
    defaultValues: { compactMode: false },
    resetOptions: { keepDirtyValues: true },
    resetKey: JSON.stringify(user && typeof user === 'object' && 'id' in user ? user.id : null),
  }).asState('compactMode')
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
        fillEmail((userData.email as string) || '')
        fillName((userData.name as string) || '')
      }
      try {
        const res = await http.get<MeResponse>('/api/users/me')
        if (cancelled) return
        const me = (res as unknown as { data?: MeResponse })?.data ?? (res as unknown as MeResponse)
        if (!me) return
        if (me.email) fillEmail(me.email)
        if (me.name !== null && me.name !== undefined) fillName(me.name)
        if (me.profile?.jobTitle != null) fillJobTitle(me.profile.jobTitle)
        if (me.profile?.timezone != null) fillTimezone(me.profile.timezone)
        const np = me.notification_preferences ?? {}
        if (typeof np.newTicketsEmail === 'boolean') fillNewTicketsEmail(np.newTicketsEmail)
        if (typeof np.dailySummaryEmail === 'boolean') fillDailySummaryEmail(np.dailySummaryEmail)
        if (typeof np.mentionsEmail === 'boolean') fillMentionsEmail(np.mentionsEmail)
        if (typeof np.urgentPush === 'boolean') fillUrgentPush(np.urgentPush)
        if (typeof np.slaBreachPush === 'boolean') fillSlaBreachPush(np.slaBreachPush)
        if (np.digestFrequency) fillDigestFrequency(np.digestFrequency)
        const pr = me.preferences ?? {}
        if (pr.theme) {
          fillThemeState(pr.theme)
          applyThemeAttribute(pr.theme)
        }
        if (pr.language) fillLanguage(pr.language)
        if (typeof pr.compactMode === 'boolean') fillCompactMode(pr.compactMode)
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
  }, [
    user,
    http,
    fillEmail,
    fillName,
    fillJobTitle,
    fillTimezone,
    fillNewTicketsEmail,
    fillDailySummaryEmail,
    fillMentionsEmail,
    fillUrgentPush,
    fillSlaBreachPush,
    fillDigestFrequency,
    fillThemeState,
    fillLanguage,
    fillCompactMode,
  ]) // userData is derived from user — re-running on user change is sufficient

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
      await logout()
      void navigate('/login')
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
    <AppShell topBar={<SettingsTopBar />}>
      <div
        className={cm.cn(cm.mxAuto, cm.sp('py', 12), cm.maxW('4xl'), cm.stack(10), 'px-4 md:px-8')}
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
    </AppShell>
  )
}

export default Settings
export { Settings, Settings as SettingsPage }
