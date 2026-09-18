import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import {
  useAuth,
  useChangePassword,
  useHttpClient,
  useTheme,
  useTranslation,
} from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, Modal } from '@molecule/app-ui-react'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

const SECTIONS = ['account', 'security', 'study', 'reminders', 'language'] as const
type Section = (typeof SECTIONS)[number]

interface AccountUser {
  id: string
  name?: string | null
  email?: string | null
}

interface Device {
  id: string
  name?: string | null
  pushPlatform?: string | null
  /** `true` for the device making the current request (the API marks it). */
  isCurrent?: boolean
}

interface Profile {
  id: string
  name: string
  email: string
  plan_key: string
  daily_goal: number
  theme: 'system' | 'light' | 'dark'
  current_streak: number
  longest_streak: number
}

type ReminderKey = 'daily' | 'atRisk' | 'weekly' | 'milestones'

const REMINDER_STORAGE_KEY = 'engram.reminders.v1'

const loadReminders = (): Record<ReminderKey, boolean> => {
  if (typeof window === 'undefined') {
    return { daily: true, atRisk: true, weekly: true, milestones: true }
  }
  try {
    const raw = window.localStorage.getItem(REMINDER_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Record<ReminderKey, boolean>>
      return {
        daily: parsed.daily ?? true,
        atRisk: parsed.atRisk ?? true,
        weekly: parsed.weekly ?? true,
        milestones: parsed.milestones ?? true,
      }
    }
  } catch (_error) {
    // JSON.parse failed — localStorage value is corrupt; fall back to defaults
  }
  return { daily: true, atRisk: true, weekly: true, milestones: true }
}

const persistReminders = (next: Record<ReminderKey, boolean>): void => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(next))
  } catch (_error) {
    // localStorage write failed (e.g. private-browsing quota); reminders are best-effort
  }
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const theme = useTheme()
  const auth = useAuth<AccountUser>()
  const navigate = useNavigate()
  const { status: pwStatus, error: pwError, changePassword, reset: resetPw } = useChangePassword()
  const [section, setSection] = useState<Section>('account')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [dailyGoal, setDailyGoal] = useState<number>(20)
  const [reminders, setReminders] = useState<Record<ReminderKey, boolean>>(() => loadReminders())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [devices, setDevices] = useState<Device[]>([])
  const [devicesLoading, setDevicesLoading] = useState(false)
  const [devicesLoaded, setDevicesLoaded] = useState(false)
  const [confirmingDeviceId, setConfirmingDeviceId] = useState<string | null>(null)
  const [revokingDeviceId, setRevokingDeviceId] = useState<string | null>(null)
  const [showPwModal, setShowPwModal] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/profile/me')
      .then((res) => {
        if (cancelled) return
        const p = unwrapSingle<Profile>(res)
        if (p) {
          setProfile(p)
          setName(p.name)
          setEmail(p.email)
          setDailyGoal(p.daily_goal)
        }
      })
      .catch(() => {
        if (!cancelled)
          setError(t('nav.failedToLoadProfile', {}, { defaultValue: 'Failed to load profile.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const loadDevices = useCallback(async () => {
    setDevicesLoading(true)
    try {
      const res = await http.get('/api/devices')
      setDevices(unwrapList<Device>(res))
    } catch (_error) {
      // Devices endpoint is optional; the list renders empty when unavailable.
    } finally {
      setDevicesLoading(false)
      setDevicesLoaded(true)
    }
  }, [http])

  useEffect(() => {
    if (section !== 'security' || devicesLoaded) return
    loadDevices()
  }, [section, devicesLoaded, loadDevices])

  const revokeDevice = async (id: string) => {
    setRevokingDeviceId(id)
    try {
      // Deleting the device row revokes its session server-side, so the
      // removed device is actually signed out — not just hidden here.
      await http.delete(`/api/devices/${id}`)
      setConfirmingDeviceId(null)
      await loadDevices()
    } catch (_error) {
      // Best-effort — keep the row so the user can retry the revoke.
    } finally {
      setRevokingDeviceId(null)
    }
  }

  const flashSaved = () => {
    setSavedAt(Date.now())
    window.setTimeout(() => setSavedAt(null), 2000)
  }

  const saveAccount = async () => {
    setSaving(true)
    setError(null)
    try {
      // Email lives on the user record, not user_profiles — PATCH the user
      // resource for it (the profile endpoint only owns name + study prefs).
      const userId = profile?.id ?? auth.user?.id
      if (userId && email !== (profile?.email ?? '')) {
        await http.patch(`/api/users/${userId}`, { email })
      }
      const res = await http.patch('/api/profile/me', { name })
      const after = unwrapSingle<Profile>(res)
      if (after) {
        setProfile(after)
        setName(after.name)
        setEmail(after.email)
      }
      flashSaved()
    } catch (_error) {
      setError(t('settings.saveError', {}, { defaultValue: 'Failed to save.' }))
    } finally {
      setSaving(false)
    }
  }

  const saveStudy = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await http.patch('/api/profile/me', { daily_goal: dailyGoal })
      const after = unwrapSingle<Profile>(res)
      if (after) {
        setProfile(after)
        setDailyGoal(after.daily_goal)
      }
      flashSaved()
    } catch (_error) {
      setError(t('settings.saveError', {}, { defaultValue: 'Failed to save.' }))
    } finally {
      setSaving(false)
    }
  }

  const onTheme = async (mode: 'system' | 'light' | 'dark') => {
    if (mode !== 'system') {
      theme.setTheme(mode)
    } else if (typeof window !== 'undefined') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      theme.setTheme(prefersDark ? 'dark' : 'light')
    }
    try {
      const res = await http.patch('/api/profile/me', { theme: mode })
      const after = unwrapSingle<Profile>(res)
      if (after) setProfile(after)
      flashSaved()
    } catch (_error) {
      setError(t('settings.saveError', {}, { defaultValue: 'Failed to save.' }))
    }
  }

  const setReminder = (key: ReminderKey, value: boolean) => {
    setReminders((prev) => {
      const next = { ...prev, [key]: value }
      persistReminders(next)
      return next
    })
    flashSaved()
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwSuccess(false)
    try {
      await changePassword(currentPassword, newPassword)
      setShowPwModal(false)
      setCurrentPassword('')
      setNewPassword('')
      resetPw()
      setPwSuccess(true)
      window.setTimeout(() => setPwSuccess(false), 2500)
    } catch (_error) {
      // Failure is surfaced via `pwError` from useChangePassword; keep the modal open.
    }
  }

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setDeleting(true)
    setDeleteError(null)
    try {
      await http.delete(`/api/users/${auth.user?.id}`, { data: { password: deletePassword } })
      await auth.logout()
      navigate('/login')
    } catch (_error) {
      setDeleteError(
        t(
          'settings.deleteError',
          {},
          { defaultValue: 'Failed to delete account. Check your password and try again.' },
        ),
      )
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.grid({ cols: 12, gap: 'lg' }))}>
      <aside className={cm.cn('col-span-12 md:col-span-3')}>
        <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 4))}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
        <nav
          className={cm.cn('space-y-1')}
          aria-label={t('nav.settingsSections', {}, { defaultValue: 'Settings sections' })}
        >
          {SECTIONS.map((s) => {
            const isActive = section === s
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSection(s)}
                data-mol-id={`settings-tab-${s}`}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'block w-full text-left rounded-md',
                  isActive
                    ? cm.cn('bg-primary-container', cm.textPrimary)
                    : cm.cn(
                        'text-on-surface-variant',
                        'hover:bg-surface-container hover:text-on-surface',
                      ),
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                {t(
                  `settings.section.${s}`,
                  {},
                  { defaultValue: s.charAt(0).toUpperCase() + s.slice(1) },
                )}
              </button>
            )
          })}
        </nav>
      </aside>

      <main className={cm.cn('col-span-12 md:col-span-9 space-y-4')}>
        {error && (
          <p className={cm.cn(cm.textSize('sm'), 'text-error')} role="alert">
            {error}
          </p>
        )}
        {savedAt && (
          <p data-mol-id="settings-saved" className={cm.cn(cm.textSize('sm'), 'text-success')}>
            {t('settings.saved', {}, { defaultValue: 'Saved.' })}
          </p>
        )}

        {loading && (
          <p className={cm.cn(cm.sp('py', 8), 'text-on-surface-variant')}>
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </p>
        )}

        {!loading && section === 'account' && (
          <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-4')}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t('settings.account', {}, { defaultValue: 'Account' })}
            </h2>
            <div className="block">
              <label
                htmlFor="settings-name"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'block',
                  cm.sp('mb', 1),
                )}
              >
                {t('form.displayName', {}, { defaultValue: 'Display name' })}
              </label>
              <input
                id="settings-name"
                type="text"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-mol-id="settings-name"
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'w-full border border-outline-variant rounded-md',
                )}
              />
            </div>
            <div className="block">
              <label
                htmlFor="settings-email"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'block',
                  cm.sp('mb', 1),
                )}
              >
                {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
              </label>
              <input
                id="settings-email"
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                data-mol-id="settings-email"
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'w-full border border-outline-variant rounded-md',
                )}
              />
            </div>
            <div className="block">
              <span
                id="settings-theme-label"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'block',
                  cm.sp('mb', 1),
                )}
              >
                {t('nav.theme', {}, { defaultValue: 'Theme' })}
              </span>
              <div
                role="group"
                aria-labelledby="settings-theme-label"
                className={cm.flex({ align: 'center', gap: 'sm' })}
              >
                {(['system', 'light', 'dark'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => onTheme(mode)}
                    aria-pressed={profile?.theme === mode}
                    data-mol-id={`settings-theme-${mode}`}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      cm.textSize('sm'),
                      'rounded-md border border-outline-variant',
                      profile?.theme === mode ? 'bg-primary text-on-primary' : 'bg-surface',
                    )}
                  >
                    {t(
                      `settings.theme.${mode}`,
                      {},
                      { defaultValue: mode.charAt(0).toUpperCase() + mode.slice(1) },
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <button
                type="button"
                onClick={saveAccount}
                disabled={saving}
                data-mol-id="settings-save-account"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'bg-primary text-on-primary rounded-md disabled:opacity-50',
                )}
              >
                {saving
                  ? t('settings.saving', {}, { defaultValue: 'Saving…' })
                  : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
              </button>
            </div>
          </section>
        )}

        {!loading && section === 'security' && (
          <div className="space-y-4">
            <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-4')}>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                {t('settings.security.heading', {}, { defaultValue: 'Security' })}
              </h2>
              <div className="block">
                <span
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'block',
                    cm.sp('mb', 1),
                  )}
                >
                  {t('settings.password', {}, { defaultValue: 'Password' })}
                </span>
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', cm.sp('mb', 2))}>
                  {t(
                    'settings.passwordHint',
                    {},
                    { defaultValue: 'Change the password you use to sign in.' },
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => setShowPwModal(true)}
                  data-mol-id="settings-change-password"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'rounded-md border border-outline-variant hover:bg-surface-container',
                  )}
                >
                  {t('settings.changePassword', {}, { defaultValue: 'Change password' })}
                </button>
                {pwSuccess && (
                  <p
                    data-mol-id="settings-password-changed"
                    className={cm.cn(cm.textSize('sm'), 'text-success', cm.sp('mt', 2))}
                  >
                    {t('settings.passwordChanged', {}, { defaultValue: 'Password updated.' })}
                  </p>
                )}
              </div>
            </section>

            <section
              className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}
              data-mol-id="settings-devices-section"
            >
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                {t('settings.devices', {}, { defaultValue: 'Devices' })}
              </h2>
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t(
                  'settings.devicesHint',
                  {},
                  { defaultValue: 'Devices currently registered to your account.' },
                )}
              </p>
              {devicesLoading ? (
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
                </p>
              ) : devices.length === 0 ? (
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t('settings.noDevices', {}, { defaultValue: 'No devices registered.' })}
                </p>
              ) : (
                <ul className="space-y-2">
                  {devices.map((d) => (
                    <li
                      key={d.id}
                      data-mol-id={`settings-device-${d.id}`}
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 2),
                        'rounded-md border border-outline-variant',
                      )}
                    >
                      <div
                        className={cm.cn(
                          cm.flex({ align: 'center', justify: 'between' }),
                          cm.textSize('sm'),
                        )}
                      >
                        <span>
                          {d.name ||
                            t('settings.unnamedDevice', {}, { defaultValue: 'Registered device' })}
                          {d.isCurrent ? (
                            <span
                              className={cm.cn(
                                cm.textSize('xs'),
                                'text-on-surface-variant',
                                cm.sp('ml', 2),
                              )}
                            >
                              {t('settings.thisDevice', {}, { defaultValue: 'This device' })}
                            </span>
                          ) : null}
                        </span>
                        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                          {d.pushPlatform ? (
                            <span
                              className={cm.cn(
                                cm.textSize('xs'),
                                'text-on-surface-variant uppercase',
                              )}
                            >
                              {d.pushPlatform}
                            </span>
                          ) : null}
                          {d.isCurrent ? null : confirmingDeviceId === d.id ? (
                            <span className={cm.flex({ align: 'center', gap: 'sm' })}>
                              <button
                                type="button"
                                disabled={revokingDeviceId === d.id}
                                onClick={() => setConfirmingDeviceId(null)}
                                data-mol-id={`settings-device-revoke-cancel-${d.id}`}
                                className={cm.cn(
                                  cm.sp('px', 2),
                                  cm.sp('py', 1),
                                  cm.textSize('xs'),
                                  'rounded-md border border-outline-variant hover:bg-surface-container disabled:opacity-50',
                                )}
                              >
                                {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                              </button>
                              <button
                                type="button"
                                disabled={revokingDeviceId === d.id}
                                onClick={() => revokeDevice(d.id)}
                                data-mol-id={`settings-device-revoke-confirm-${d.id}`}
                                className={cm.cn(
                                  cm.sp('px', 2),
                                  cm.sp('py', 1),
                                  cm.textSize('xs'),
                                  cm.fontWeight('semibold'),
                                  'rounded-md bg-error text-on-error disabled:opacity-50',
                                )}
                              >
                                {revokingDeviceId === d.id
                                  ? t('settings.signingOut', {}, { defaultValue: 'Signing out…' })
                                  : t('settings.signOutDevice', {}, { defaultValue: 'Sign out' })}
                              </button>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmingDeviceId(d.id)}
                              data-mol-id={`settings-device-revoke-${d.id}`}
                              className={cm.cn(
                                cm.sp('px', 2),
                                cm.sp('py', 1),
                                cm.textSize('xs'),
                                cm.fontWeight('medium'),
                                'rounded-md border border-outline-variant hover:bg-surface-container',
                              )}
                            >
                              {t('settings.signOutDevice', {}, { defaultValue: 'Sign out' })}
                            </button>
                          )}
                        </div>
                      </div>
                      {confirmingDeviceId === d.id ? (
                        <p
                          className={cm.cn(
                            cm.textSize('xs'),
                            'text-on-surface-variant',
                            cm.sp('mt', 1),
                          )}
                        >
                          {t(
                            'settings.revokeDeviceWarning',
                            {},
                            {
                              defaultValue:
                                "This device's access will be revoked shortly. Sign it out?",
                            },
                          )}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section
              className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3 border border-error')}
              data-mol-id="settings-danger-zone"
            >
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'text-error')}>
                {t('settings.dangerZone', {}, { defaultValue: 'Danger zone' })}
              </h2>
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t(
                  'settings.deleteAccountHint',
                  {},
                  {
                    defaultValue:
                      'Permanently delete your account and all study data. This cannot be undone.',
                  },
                )}
              </p>
              <div>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  data-mol-id="settings-delete-account"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'rounded-md bg-error text-on-error disabled:opacity-50',
                  )}
                >
                  {t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
                </button>
              </div>
            </section>
          </div>
        )}

        {!loading && section === 'study' && (
          <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-4')}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t('settings.study.heading', {}, { defaultValue: 'Study preferences' })}
            </h2>
            <div className="block">
              <label
                htmlFor="settings-daily-goal"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'block',
                  cm.sp('mb', 1),
                )}
              >
                {t('settings.study.dailyGoal', {}, { defaultValue: 'Daily review goal' })}
              </label>
              <input
                id="settings-daily-goal"
                type="number"
                min={1}
                max={500}
                value={dailyGoal}
                onChange={(e) => setDailyGoal(Number(e.target.value) || 0)}
                name="daily_goal"
                data-mol-id="settings-daily-goal"
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'w-full border border-outline-variant rounded-md',
                )}
              />
            </div>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'settings.study.streaks',
                { current: profile?.current_streak ?? 0, longest: profile?.longest_streak ?? 0 },
                { defaultValue: 'Current streak {{current}}d · longest {{longest}}d' },
              )}
            </p>
            <div>
              <button
                type="button"
                onClick={saveStudy}
                disabled={saving}
                data-mol-id="settings-save-study"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'bg-primary text-on-primary rounded-md disabled:opacity-50',
                )}
              >
                {saving
                  ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                  : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
              </button>
            </div>
          </section>
        )}

        {!loading && section === 'reminders' && (
          <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t('settings.reminders.heading', {}, { defaultValue: 'Reminders' })}
            </h2>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'settings.reminders.note',
                {},
                {
                  defaultValue:
                    'Stored on this device. Toggle which study nudges this browser surfaces; preferences sync across reload.',
                },
              )}
            </p>
            <Toggle
              dataId="settings-reminder-daily"
              label={t('settings.reminders.daily', {}, { defaultValue: 'Daily reminder (8:00am)' })}
              checked={reminders.daily}
              onChange={(v) => setReminder('daily', v)}
            />
            <Toggle
              dataId="settings-reminder-atRisk"
              label={t(
                'settings.reminders.atRisk',
                {},
                { defaultValue: 'Streak-at-risk alert (after 8:00pm)' },
              )}
              checked={reminders.atRisk}
              onChange={(v) => setReminder('atRisk', v)}
            />
            <Toggle
              dataId="settings-reminder-weekly"
              label={t(
                'settings.reminders.weekly',
                {},
                { defaultValue: 'Weekly retention summary (Sundays)' },
              )}
              checked={reminders.weekly}
              onChange={(v) => setReminder('weekly', v)}
            />
            <Toggle
              dataId="settings-reminder-milestones"
              label={t(
                'settings.reminders.milestones',
                {},
                { defaultValue: 'Milestone celebrations' },
              )}
              checked={reminders.milestones}
              onChange={(v) => setReminder('milestones', v)}
            />
          </section>
        )}

        {!loading && section === 'language' && (
          <section
            className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-4')}
            data-mol-id="settings-language-section"
          >
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t('footer.language', {}, { defaultValue: 'Language' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'common.chooseTheLanguage',
                {},
                { defaultValue: 'Choose the language used throughout the app.' },
              )}
            </p>
            <LanguagePicker />
          </section>
        )}
      </main>

      <Modal
        open={showPwModal}
        onClose={() => {
          setShowPwModal(false)
          resetPw()
        }}
        title={t('settings.changePassword', {}, { defaultValue: 'Change password' })}
      >
        {pwError && (
          <p className={cm.cn(cm.textSize('sm'), 'text-error', cm.sp('mb', 3))} role="alert">
            {pwError.message ||
              t('settings.changePasswordError', {}, { defaultValue: 'Could not change password.' })}
          </p>
        )}
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="block">
            <label
              htmlFor="settings-current-password"
              className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}
            >
              {t('settings.currentPassword', {}, { defaultValue: 'Current password' })}
            </label>
            <input
              id="settings-current-password"
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              data-mol-id="settings-current-password"
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                'w-full border border-outline-variant rounded-md',
              )}
            />
          </div>
          <div className="block">
            <label
              htmlFor="settings-new-password"
              className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}
            >
              {t('settings.newPassword', {}, { defaultValue: 'New password' })}
            </label>
            <input
              id="settings-new-password"
              type="password"
              autoComplete="new-password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              data-mol-id="settings-new-password"
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                'w-full border border-outline-variant rounded-md',
              )}
            />
          </div>
          <button
            type="submit"
            disabled={pwStatus === 'pending'}
            data-mol-id="settings-change-password-submit"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'w-full bg-primary text-on-primary rounded-md disabled:opacity-50',
            )}
          >
            {pwStatus === 'pending'
              ? t('settings.saving', {}, { defaultValue: 'Saving…' })
              : t('settings.changePassword', {}, { defaultValue: 'Change password' })}
          </button>
        </form>
      </Modal>

      <Modal
        open={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setDeletePassword('')
          setDeleteError(null)
        }}
        title={t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
      >
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mb', 4))}>
          {t(
            'settings.deleteAccountWarning',
            {},
            {
              defaultValue:
                'This permanently deletes your account and all decks, cards, and study history. This cannot be undone.',
            },
          )}
        </p>
        {deleteError && (
          <p className={cm.cn(cm.textSize('sm'), 'text-error', cm.sp('mb', 3))} role="alert">
            {deleteError}
          </p>
        )}
        <form onSubmit={handleDeleteAccount} className="space-y-4">
          <div className="block">
            <label
              htmlFor="settings-delete-password"
              className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}
            >
              {t('settings.confirmPassword', {}, { defaultValue: 'Confirm your password' })}
            </label>
            <input
              id="settings-delete-password"
              type="password"
              autoComplete="current-password"
              required
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              data-mol-id="settings-delete-password"
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                'w-full border border-outline-variant rounded-md',
              )}
            />
          </div>
          <button
            type="submit"
            disabled={deleting}
            data-mol-id="settings-delete-account-submit"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'w-full bg-error text-on-error rounded-md disabled:opacity-50',
            )}
          >
            {deleting
              ? t('settings.deleting', {}, { defaultValue: 'Deleting…' })
              : t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
          </button>
        </form>
      </Modal>
    </div>
  )
}

function Toggle({
  label,
  checked,
  onChange,
  dataId,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  dataId: string
}) {
  const cm = getClassMap()
  return (
    <label className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'cursor-pointer')}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        data-mol-id={dataId}
        className={cm.cn(cm.h(4), cm.w(4))}
      />
      <span className={cm.cn(cm.textSize('sm'))}>{label}</span>
    </label>
  )
}
