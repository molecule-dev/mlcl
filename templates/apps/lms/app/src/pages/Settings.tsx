// Phase 1 baseline — verbatim JSX of design-lms-settings.html
// Phase 4 wires every form to its real backend endpoint and persists
// theme/notification preferences across page reloads via
// `/api/profile/me/preferences`.
import React, { useEffect, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useAuth, useHttpClient, useTheme, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import AppearanceSettingsCard from '../components/AppearanceSettingsCard.js'
import NotificationControlsCard from '../components/NotificationControlsCard.js'
import ProfileSettingsCard from '../components/ProfileSettingsCard.js'
import SecuritySettingsCard from '../components/SecuritySettingsCard.js'
import SettingsActionsBar from '../components/SettingsActionsBar.js'
import SettingsPageHeader from '../components/SettingsPageHeader.js'
import SettingsTopNavBar from '../components/SettingsTopNavBar.js'
import SideNavBar from '../components/SideNavBar.js'

type ThemeChoice = 'light' | 'dark' | 'system'

interface PreferencesResponse {
  preferences?: {
    theme?: ThemeChoice
    language?: string
    notifyEmail?: boolean
    notifyCourseUpdates?: boolean
    notifyAssignments?: boolean
    notifyDiscussions?: boolean
  }
}

function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth<{ id?: string; name?: string; email?: string }>()
  const userId: string | undefined = user?.id
  const http = useHttpClient()
  const { setTheme: applyTheme } = useTheme()
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [bio, setBio] = useState('')
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  // Changing the email is a sensitive write: the molecule core user resource
  // rejects PATCH {email} without the account's current password (400
  // currentPasswordRequired). Show a confirm-password input only while the
  // email field differs from the signed-in address.
  const originalEmail = user?.email || ''
  const emailChanged = email !== originalEmail && email.trim() !== ''
  const [emailPassword, setEmailPassword] = useState('')
  const [notifyEmail, setNotifyEmailState] = useState(true)
  const [notifyCourseUpdates, setNotifyCourseUpdatesState] = useState(true)
  const [notifyAssignments, setNotifyAssignmentsState] = useState(true)
  const [notifyDiscussions, setNotifyDiscussionsState] = useState(false)
  const [theme, setThemeState] = useState<ThemeChoice>('light')
  const [language, setLanguageState] = useState('en-US')
  const [savedAt, setSavedAt] = useState<number | null>(null)

  useEffect(() => {
    if (user) {
      setName(user.name || '')
      setEmail(user.email || '')
    }
  }, [user])

  // Hydrate preferences from the backend so theme + notification toggles
  // round-trip through reload. The page already renders before this fires;
  // when the response lands we merge into state and re-apply the theme.
  useEffect(() => {
    let cancelled = false
    http
      .get<PreferencesResponse>('/api/profile/me')
      .then((res: unknown) => {
        if (cancelled) return
        const body = res as (PreferencesResponse & { data?: PreferencesResponse }) | null
        const prefs = body?.preferences ?? body?.data?.preferences
        if (!prefs) return
        if (prefs.theme) {
          setThemeState(prefs.theme)
          if (prefs.theme !== 'system') applyTheme(prefs.theme)
        }
        if (prefs.language) setLanguageState(prefs.language)
        if (typeof prefs.notifyEmail === 'boolean') setNotifyEmailState(prefs.notifyEmail)
        if (typeof prefs.notifyCourseUpdates === 'boolean')
          setNotifyCourseUpdatesState(prefs.notifyCourseUpdates)
        if (typeof prefs.notifyAssignments === 'boolean')
          setNotifyAssignmentsState(prefs.notifyAssignments)
        if (typeof prefs.notifyDiscussions === 'boolean')
          setNotifyDiscussionsState(prefs.notifyDiscussions)
      })
      .catch(() => {
        /* not signed in / preferences not yet saved — fall through with defaults */
      })
    return () => {
      cancelled = true
    }
  }, [http, applyTheme])

  useEffect(() => {
    if (savedAt === null) return
    const timer = setTimeout(() => setSavedAt(null), 2500)
    return () => clearTimeout(timer)
  }, [savedAt])

  // Best-effort fire-and-forget preference save. Returning the promise lets
  // the e2e suite await persistence before reload, but most call sites are
  // toggles that don't need to surface a spinner.
  async function persistPreferences(partial: Record<string, unknown>): Promise<void> {
    try {
      await http.put('/api/profile/me/preferences', partial)
    } catch (_error) {
      /* best-effort persistence — toggle still reflected locally; user can retry */
    }
  }

  function setTheme(next: ThemeChoice) {
    setThemeState(next)
    if (next === 'system') {
      const sysDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
      applyTheme(sysDark ? 'dark' : 'light')
    } else {
      applyTheme(next)
    }
    persistPreferences({ theme: next })
  }

  function setLanguage(next: string) {
    setLanguageState(next)
    persistPreferences({ language: next })
  }

  function setNotifyEmail(next: boolean) {
    setNotifyEmailState(next)
    persistPreferences({ notifyEmail: next })
  }
  function setNotifyCourseUpdates(next: boolean) {
    setNotifyCourseUpdatesState(next)
    persistPreferences({ notifyCourseUpdates: next })
  }
  function setNotifyAssignments(next: boolean) {
    setNotifyAssignmentsState(next)
    persistPreferences({ notifyAssignments: next })
  }
  function setNotifyDiscussions(next: boolean) {
    setNotifyDiscussionsState(next)
    persistPreferences({ notifyDiscussions: next })
  }

  async function handleProfileSave() {
    setProfileLoading(true)
    setProfileSuccess(false)
    setProfileError(null)
    try {
      if (!userId) throw new Error('Not signed in')
      if (emailChanged && emailPassword.trim() === '') {
        throw new Error(
          t(
            'settings.emailPasswordRequired',
            {},
            {
              defaultValue: 'Enter your current password to change your email address.',
            },
          ),
        )
      }
      // The molecule core user resource exposes PATCH /api/users/:id (not
      // PUT /api/user). Send a partial with just the fields that changed;
      // an email change must carry `currentPassword` or the API 400s.
      // `bio` is per-app — store it under preferences instead.
      const patch: Record<string, unknown> = { name }
      if (emailChanged) {
        patch.email = email
        patch.currentPassword = emailPassword
      }
      await http.patch(`/api/users/${userId}`, patch)
      if (bio.trim().length > 0) {
        await persistPreferences({ bio })
      }
      track({
        name: 'profile.updated',
        properties: { userId, emailChanged },
      })
      setProfileSuccess(true)
      setEmailPassword('')
      setSavedAt(Date.now())
    } catch (err) {
      const apiMessage = (err as { response?: { body?: { error?: string } } } | null)?.response
        ?.body?.error
      setProfileError(
        apiMessage ||
          (err instanceof Error
            ? err.message
            : t('settings.profileSaveError', {}, { defaultValue: 'Failed to save profile.' })),
      )
    } finally {
      setProfileLoading(false)
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess(false)
    if (newPassword !== confirmPassword) {
      setPasswordError(
        t('auth.signup.passwordsDoNotMatchPeriod', {}, { defaultValue: 'Passwords do not match.' }),
      )
      return
    }
    setPasswordLoading(true)
    try {
      if (!userId) throw new Error('Not signed in')
      await http.patch(`/api/users/${userId}/password`, { currentPassword, newPassword })
      track({ name: 'password.changed', properties: { userId } })
      setPasswordSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      const apiMessage = (err as { response?: { body?: { error?: string } } } | null)?.response
        ?.body?.error
      setPasswordError(
        apiMessage ||
          (err instanceof Error ? err.message : '') ||
          t(
            'settings.changePasswordModal.error',
            {},
            { defaultValue: 'Failed to change password.' },
          ),
      )
    } finally {
      setPasswordLoading(false)
    }
  }

  function handleCancel() {
    if (user) {
      setName(user.name || '')
      setEmail(user.email || '')
      setBio('')
    }
  }

  return (
    <div className={cm.cn(cm.surface, 'text-on-surface antialiased')}>
      {/* SideNavBar (Execution from JSON) */}
      <SideNavBar />
      {/* TopAppBar (Execution from JSON) */}
      <SettingsTopNavBar />
      {/* Main Content Canvas */}
      <main className={cm.cn(cm.minH('screen'), 'md:ml-[260px] pt-6 md:pt-20 pb-32')}>
        <div
          className={cm.cn(
            cm.maxW('5xl'),
            cm.mxAuto,
            cm.sp('px', 8),
            cm.sp('py', 12),
            cm.stack(10),
          )}
        >
          {/* Page Header */}
          <SettingsPageHeader />
          {/* Profile Section */}
          <ProfileSettingsCard
            name={name}
            setName={setName}
            email={email}
            setEmail={setEmail}
            bio={bio}
            setBio={setBio}
            profileSuccess={profileSuccess}
            profileError={profileError}
            emailChanged={emailChanged}
            emailPassword={emailPassword}
            setEmailPassword={setEmailPassword}
          />
          <div className={cm.cn(cm.grid({ cols: 1, gap: 'xl' }), 'lg:grid-cols-2')}>
            {/* Notifications Section */}
            <NotificationControlsCard
              notifyEmail={notifyEmail}
              setNotifyEmail={setNotifyEmail}
              notifyCourseUpdates={notifyCourseUpdates}
              setNotifyCourseUpdates={setNotifyCourseUpdates}
              notifyAssignments={notifyAssignments}
              setNotifyAssignments={setNotifyAssignments}
              notifyDiscussions={notifyDiscussions}
              setNotifyDiscussions={setNotifyDiscussions}
            />
            {/* Appearance Section */}
            <AppearanceSettingsCard
              theme={theme}
              setTheme={setTheme}
              language={language}
              setLanguage={setLanguage}
            />
          </div>
          <SecuritySettingsCard
            currentPassword={currentPassword}
            setCurrentPassword={setCurrentPassword}
            newPassword={newPassword}
            setNewPassword={setNewPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
            passwordLoading={passwordLoading}
            passwordError={passwordError}
            passwordSuccess={passwordSuccess}
            onSubmit={handlePasswordChange}
          />
        </div>
      </main>
      <SettingsActionsBar
        onSave={handleProfileSave}
        onCancel={handleCancel}
        loading={profileLoading}
        savedAt={savedAt}
      />
    </div>
  )
}

export default Settings
export { Settings, Settings as SettingsPage }
