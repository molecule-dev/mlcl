import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { useAuth, useChangePassword, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Alert, Button, Input, LanguagePicker, Modal, ThemeToggle } from '@molecule/app-ui-react'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

const SECTIONS = ['account', 'security', 'practice', 'availability', 'notifications'] as const
type Section = (typeof SECTIONS)[number]

interface PracticePrefs {
  licensedStates?: string
  defaultDurationMinutes?: number
}

interface AvailabilityPrefs {
  timezone?: string
  dayStart?: string
  dayEnd?: string
}

interface NotificationPrefs {
  emailVisitReminders?: boolean
  emailMessages?: boolean
  pushUrgent?: boolean
}

interface Preferences {
  practice?: PracticePrefs
  availability?: AvailabilityPrefs
  notifications?: NotificationPrefs
}

interface Profile {
  id: string
  name: string
  email: string
  preferences?: Preferences
}

interface SecurityDevice {
  id: string
  name?: string
  isCurrent?: boolean
}

const DEFAULT_AVAILABILITY: Required<AvailabilityPrefs> = {
  timezone: 'America/Los_Angeles',
  dayStart: '09:00',
  dayEnd: '17:00',
}

const DEFAULT_NOTIFICATIONS: Required<NotificationPrefs> = {
  emailVisitReminders: true,
  emailMessages: true,
  pushUrgent: false,
}

const DEFAULT_PRACTICE: Required<PracticePrefs> = {
  licensedStates: '',
  defaultDurationMinutes: 30,
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [section, setSection] = useState<Section>('account')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [practice, setPractice] = useState<Required<PracticePrefs>>(DEFAULT_PRACTICE)
  const [availability, setAvailability] =
    useState<Required<AvailabilityPrefs>>(DEFAULT_AVAILABILITY)
  const [notifications, setNotifications] =
    useState<Required<NotificationPrefs>>(DEFAULT_NOTIFICATIONS)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/profile/me')
      .then((res) => {
        if (cancelled) return
        const me = unwrapSingle<Profile>(res)
        if (!me) return
        setProfile(me)
        setName(me.name ?? '')
        setEmail(me.email ?? '')
        const prefs = me.preferences ?? {}
        setPractice({ ...DEFAULT_PRACTICE, ...(prefs.practice ?? {}) })
        setAvailability({ ...DEFAULT_AVAILABILITY, ...(prefs.availability ?? {}) })
        setNotifications({ ...DEFAULT_NOTIFICATIONS, ...(prefs.notifications ?? {}) })
      })
      .catch(() => {
        if (!cancelled)
          setError(t('settings.loadError', {}, { defaultValue: 'Could not load your profile.' }))
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const persist = async (updates: { name?: string; preferences?: Preferences }) => {
    setSaving(true)
    setError(null)
    try {
      const res = await http.put('/api/profile/me', updates)
      const updated = unwrapSingle<Profile>(res)
      if (updated) {
        setProfile(updated)
        setName(updated.name ?? '')
        setEmail(updated.email ?? '')
        const prefs = updated.preferences ?? {}
        setPractice({ ...DEFAULT_PRACTICE, ...(prefs.practice ?? {}) })
        setAvailability({ ...DEFAULT_AVAILABILITY, ...(prefs.availability ?? {}) })
        setNotifications({ ...DEFAULT_NOTIFICATIONS, ...(prefs.notifications ?? {}) })
      }
      setSavedAt(Date.now())
    } catch (_error) {
      // save failure; error is shown via setError UI state
      setError(t('settings.saveError', {}, { defaultValue: 'Could not save changes. Try again.' }))
    } finally {
      setSaving(false)
    }
  }

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    // Email is owned by the user resource — persist it via the standard user
    // CRUD endpoint (PATCH /api/users/:id). Name + preferences go through the
    // portal profile route, which does not accept email.
    const trimmedEmail = email.trim()
    if (profile && trimmedEmail && trimmedEmail !== profile.email) {
      setSaving(true)
      setError(null)
      try {
        await http.patch(`/api/users/${profile.id}`, { email: trimmedEmail })
      } catch (_error) {
        // PATCH failure; surfaced via the error UI state below.
        setError(
          t('settings.saveError', {}, { defaultValue: 'Could not save changes. Try again.' }),
        )
        setSaving(false)
        return
      }
    }
    await persist({ name })
  }

  const handleSavePractice = async (e: React.FormEvent) => {
    e.preventDefault()
    await persist({ preferences: { practice } })
  }

  const handleSaveAvailability = async (e: React.FormEvent) => {
    e.preventDefault()
    await persist({ preferences: { availability } })
  }

  const handleSaveNotifications = async (e: React.FormEvent) => {
    e.preventDefault()
    await persist({ preferences: { notifications } })
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
      <header className={cm.sp('mb', 6)}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 2),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('settings.eyebrow', {}, { defaultValue: 'Practice & account' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mt', 1))}>
          {t(
            'settings.subheading',
            {},
            { defaultValue: 'Provider profile, practice rules, and clinical alerts.' },
          )}
        </p>
      </header>
      <div className={cm.grid({ cols: 12, gap: 'lg' })}>
        <aside className={'col-span-12 md:col-span-3'}>
          <nav
            className={'space-y-1'}
            aria-label={t('nav.settingsSections', {}, { defaultValue: 'Settings sections' })}
          >
            {SECTIONS.map((s) => {
              const isActive = section === s
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSection(s)}
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

        <main className={'col-span-12 md:col-span-9 space-y-4'}>
          {section === 'account' && (
            <form
              onSubmit={handleSaveAccount}
              data-mol-id="form-settings-account"
              className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-4')}
            >
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                {t('settings.account.heading', {}, { defaultValue: 'Account' })}
              </h2>
              <label className="block">
                <span
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'block',
                    cm.sp('mb', 1),
                  )}
                >
                  {t('form.displayName', {}, { defaultValue: 'Display name' })}
                </span>
                <input
                  type="text"
                  name="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'w-full border border-outline-variant rounded-md',
                  )}
                />
              </label>
              <label className="block">
                <span
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'block',
                    cm.sp('mb', 1),
                  )}
                >
                  {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
                </span>
                <input
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'w-full border border-outline-variant rounded-md',
                  )}
                />
              </label>
              <FormFooter
                cm={cm}
                t={t}
                saving={saving}
                savedAt={savedAt}
                error={error}
                disabled={saving || !name.trim() || !email.trim()}
              />
            </form>
          )}

          {section === 'account' && (
            <section
              data-mol-id="settings-language"
              className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}
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

          {section === 'account' && (
            <section
              data-mol-id="settings-appearance"
              className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}
            >
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                {t('settings.appearance.title', {}, { defaultValue: 'Appearance' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'settings.appearance.description',
                  {},
                  { defaultValue: 'Toggle between light and dark mode.' },
                )}
              </p>
              <ThemeToggle />
            </section>
          )}

          {section === 'practice' && (
            <form
              onSubmit={handleSavePractice}
              data-mol-id="form-settings-practice"
              className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-4')}
            >
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                {t('settings.practice.heading', {}, { defaultValue: 'Practice' })}
              </h2>
              <label className="block">
                <span
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'block',
                    cm.sp('mb', 1),
                  )}
                >
                  {t(
                    'settings.practice.licensedStates',
                    {},
                    { defaultValue: 'Licensed states (comma separated)' },
                  )}
                </span>
                <input
                  type="text"
                  name="licensedStates"
                  value={practice.licensedStates}
                  onChange={(e) => setPractice({ ...practice, licensedStates: e.target.value })}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'w-full border border-outline-variant rounded-md',
                  )}
                />
              </label>
              <label className="block">
                <span
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'block',
                    cm.sp('mb', 1),
                  )}
                >
                  {t(
                    'settings.practice.defaultDuration',
                    {},
                    { defaultValue: 'Default consult duration (minutes)' },
                  )}
                </span>
                <input
                  type="number"
                  name="defaultDurationMinutes"
                  min={5}
                  max={120}
                  value={practice.defaultDurationMinutes}
                  onChange={(e) =>
                    setPractice({
                      ...practice,
                      defaultDurationMinutes: Number(e.target.value) || 30,
                    })
                  }
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'w-full border border-outline-variant rounded-md',
                  )}
                />
              </label>
              <FormFooter
                cm={cm}
                t={t}
                saving={saving}
                savedAt={savedAt}
                error={error}
                disabled={saving}
              />
            </form>
          )}

          {section === 'availability' && (
            <form
              onSubmit={handleSaveAvailability}
              data-mol-id="form-settings-availability"
              className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-4')}
            >
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                {t('settings.availability.heading', {}, { defaultValue: 'Availability' })}
              </h2>
              <label className="block">
                <span
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'block',
                    cm.sp('mb', 1),
                  )}
                >
                  {t('form.timezone', {}, { defaultValue: 'Timezone' })}
                </span>
                <input
                  type="text"
                  name="timezone"
                  value={availability.timezone}
                  onChange={(e) => setAvailability({ ...availability, timezone: e.target.value })}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'w-full border border-outline-variant rounded-md',
                  )}
                />
              </label>
              <div className={cm.grid({ cols: 2, gap: 'md' })}>
                <label className="block">
                  <span
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('medium'),
                      'block',
                      cm.sp('mb', 1),
                    )}
                  >
                    {t('settings.availability.dayStart', {}, { defaultValue: 'Day start' })}
                  </span>
                  <input
                    type="time"
                    name="dayStart"
                    value={availability.dayStart}
                    onChange={(e) => setAvailability({ ...availability, dayStart: e.target.value })}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      'w-full border border-outline-variant rounded-md',
                    )}
                  />
                </label>
                <label className="block">
                  <span
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('medium'),
                      'block',
                      cm.sp('mb', 1),
                    )}
                  >
                    {t('settings.availability.dayEnd', {}, { defaultValue: 'Day end' })}
                  </span>
                  <input
                    type="time"
                    name="dayEnd"
                    value={availability.dayEnd}
                    onChange={(e) => setAvailability({ ...availability, dayEnd: e.target.value })}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      'w-full border border-outline-variant rounded-md',
                    )}
                  />
                </label>
              </div>
              <FormFooter
                cm={cm}
                t={t}
                saving={saving}
                savedAt={savedAt}
                error={error}
                disabled={saving}
              />
            </form>
          )}

          {section === 'notifications' && (
            <form
              onSubmit={handleSaveNotifications}
              data-mol-id="form-settings-notifications"
              className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-4')}
            >
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
              </h2>
              <ToggleRow
                cm={cm}
                label={t(
                  'settings.notifications.emailVisitReminders',
                  {},
                  { defaultValue: 'Email me appointment reminders' },
                )}
                checked={notifications.emailVisitReminders}
                onChange={(v) => setNotifications({ ...notifications, emailVisitReminders: v })}
                name="emailVisitReminders"
              />
              <ToggleRow
                cm={cm}
                label={t(
                  'settings.notifications.emailMessages',
                  {},
                  { defaultValue: 'Email me when my care team replies' },
                )}
                checked={notifications.emailMessages}
                onChange={(v) => setNotifications({ ...notifications, emailMessages: v })}
                name="emailMessages"
              />
              <ToggleRow
                cm={cm}
                label={t(
                  'settings.notifications.pushUrgent',
                  {},
                  { defaultValue: 'Push notifications for urgent alerts' },
                )}
                checked={notifications.pushUrgent}
                onChange={(v) => setNotifications({ ...notifications, pushUrgent: v })}
                name="pushUrgent"
              />
              <FormFooter
                cm={cm}
                t={t}
                saving={saving}
                savedAt={savedAt}
                error={error}
                disabled={saving}
              />
            </form>
          )}

          {section === 'security' && <SecurityPanel />}
        </main>
      </div>
    </div>
  )
}

/**
 * Account-security panel: change password, manage two-factor
 * authentication, review signed-in devices, and delete the account.
 * Each flow talks to the standard user/device endpoints (the `:id` is
 * resolved server-side from the session via the `me` alias).
 */
function SecurityPanel() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { status: pwStatus, error: pwError, changePassword, reset: pwReset } = useChangePassword()

  // Change-password modal state.
  const [showPwModal, setShowPwModal] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  // Two-factor state.
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [show2fa, setShow2fa] = useState(false)
  const [twoFactorMode, setTwoFactorMode] = useState<'enable' | 'disable'>('enable')
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null)
  const [twoFactorSecret, setTwoFactorSecret] = useState<string | null>(null)
  const [twoFactorToken, setTwoFactorToken] = useState('')
  const [twoFactorBusy, setTwoFactorBusy] = useState(false)
  const [twoFactorError, setTwoFactorError] = useState('')

  // Devices list.
  const [devices, setDevices] = useState<SecurityDevice[]>([])
  const [devicesLoading, setDevicesLoading] = useState(true)
  const [confirmingDeviceId, setConfirmingDeviceId] = useState<string | null>(null)
  const [revokingDeviceId, setRevokingDeviceId] = useState<string | null>(null)

  const loadDevices = useCallback(async () => {
    try {
      const res = await http.get('/api/devices')
      setDevices(unwrapList<SecurityDevice>(res))
    } catch (_error) {
      // Devices endpoint is optional; render the empty state on failure.
    } finally {
      setDevicesLoading(false)
    }
  }, [http])

  // Revoke (sign out) a device. Deleting the device row makes the API
  // reject that device's session server-side, so it is actually signed
  // out — then refetch so the list reflects the change.
  const revokeDevice = async (id: string) => {
    setRevokingDeviceId(id)
    try {
      await http.delete(`/api/devices/${id}`)
      setConfirmingDeviceId(null)
      await loadDevices()
    } catch (_error) {
      // Best-effort — keep the row so the user can retry the revoke.
    } finally {
      setRevokingDeviceId(null)
    }
  }

  // Delete-account modal state.
  const [showDelete, setShowDelete] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  // Load current two-factor status (self-read includes `twoFactorEnabled`).
  useEffect(() => {
    let cancelled = false
    http
      .get<{ twoFactorEnabled?: boolean }>('/api/users/me')
      .then((res) => {
        if (cancelled) return
        const body = res.data
        if (body && typeof body.twoFactorEnabled === 'boolean') {
          setTwoFactorEnabled(body.twoFactorEnabled)
        }
      })
      .catch(() => {
        // Best-effort: leave the toggle in its default (off) state.
      })
    return () => {
      cancelled = true
    }
  }, [http])

  // Load registered devices.
  useEffect(() => {
    loadDevices()
  }, [loadDevices])

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await changePassword(currentPassword, newPassword)
      setShowPwModal(false)
      setCurrentPassword('')
      setNewPassword('')
      pwReset()
    } catch (_error) {
      // The failure is surfaced via `pwError` from useChangePassword; keep the
      // modal open so the user can retry.
    }
  }

  const startEnable2fa = async () => {
    setTwoFactorMode('enable')
    setTwoFactorError('')
    setTwoFactorToken('')
    setTwoFactorBusy(true)
    try {
      const res = await http.post<{ QRImageUrl?: string; secret?: string }>(
        '/api/users/me/verify-two-factor',
        { action: 'setup' },
      )
      setQrImageUrl(res.data?.QRImageUrl ?? null)
      setTwoFactorSecret(res.data?.secret ?? null)
      setShow2fa(true)
    } catch (err) {
      setTwoFactorError(
        err instanceof Error
          ? err.message
          : t(
              'settings.security.twoFactor.setupFailed',
              {},
              {
                defaultValue: 'Could not start two-factor setup. Try again.',
              },
            ),
      )
      setShow2fa(true)
    } finally {
      setTwoFactorBusy(false)
    }
  }

  const startDisable2fa = () => {
    setTwoFactorMode('disable')
    setTwoFactorError('')
    setTwoFactorToken('')
    setQrImageUrl(null)
    setTwoFactorSecret(null)
    setShow2fa(true)
  }

  const handleConfirm2fa = async (e: React.FormEvent) => {
    e.preventDefault()
    setTwoFactorBusy(true)
    setTwoFactorError('')
    try {
      await http.post('/api/users/me/verify-two-factor', {
        action: twoFactorMode,
        token: twoFactorToken,
      })
      setTwoFactorEnabled(twoFactorMode === 'enable')
      setShow2fa(false)
      setTwoFactorToken('')
      setQrImageUrl(null)
      setTwoFactorSecret(null)
    } catch (err) {
      setTwoFactorError(
        err instanceof Error
          ? err.message
          : t(
              'settings.security.twoFactor.invalidCode',
              {},
              {
                defaultValue: 'That code did not match. Try again.',
              },
            ),
      )
    } finally {
      setTwoFactorBusy(false)
    }
  }

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault()
    setDeleteBusy(true)
    setDeleteError('')
    try {
      await http.delete('/api/users/me', { data: { password: deletePassword } })
      await logout()
      navigate('/login')
    } catch (err) {
      setDeleteError(
        err instanceof Error
          ? err.message
          : t(
              'settings.failedToDeleteAccount',
              {},
              {
                defaultValue: 'Could not delete your account. Try again.',
              },
            ),
      )
    } finally {
      setDeleteBusy(false)
    }
  }

  const labelClass = cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))

  return (
    <>
      <section
        data-mol-id="settings-password"
        className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}
      >
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
          {t('settings.security.password.heading', {}, { defaultValue: 'Password' })}
        </h2>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'settings.security.password.description',
            {},
            { defaultValue: 'Update the password used to sign in to your account.' },
          )}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPwModal(true)}
          data-mol-id="button-change-password"
        >
          {t('settings.changePassword', {}, { defaultValue: 'Change password' })}
        </Button>
      </section>

      <section
        data-mol-id="settings-two-factor"
        className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}
      >
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
          {t(
            'settings.security.twoFactor.heading',
            {},
            {
              defaultValue: 'Two-factor authentication',
            },
          )}
        </h2>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'settings.security.twoFactor.description',
            {},
            {
              defaultValue:
                'Require a one-time code from an authenticator app as a second step when signing in.',
            },
          )}
        </p>
        <div className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
          <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
            {twoFactorEnabled
              ? t('settings.security.twoFactor.statusOn', {}, { defaultValue: 'Two-factor is on' })
              : t(
                  'settings.security.twoFactor.statusOff',
                  {},
                  { defaultValue: 'Two-factor is off' },
                )}
          </span>
          {twoFactorEnabled ? (
            <Button
              variant="outline"
              color="error"
              size="sm"
              onClick={startDisable2fa}
              data-mol-id="button-disable-2fa"
            >
              {t('settings.security.twoFactor.disable', {}, { defaultValue: 'Disable' })}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              loading={twoFactorBusy}
              onClick={startEnable2fa}
              data-mol-id="button-enable-2fa"
            >
              {t('settings.security.twoFactor.enable', {}, { defaultValue: 'Enable' })}
            </Button>
          )}
        </div>
      </section>

      <section
        data-mol-id="settings-devices"
        className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}
      >
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
          {t('settings.devices', {}, { defaultValue: 'Devices' })}
        </h2>
        {devicesLoading ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : devices.length > 0 ? (
          <ul className="space-y-2">
            {devices.map((device) => (
              <li key={device.id}>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                    cm.textSize('sm'),
                  )}
                >
                  <span>
                    {device.name ||
                      t('settings.devices.unnamed', {}, { defaultValue: 'Unnamed device' })}
                  </span>
                  {device.isCurrent ? (
                    <span
                      className={cm.cn(cm.textSize('xs'), cm.fontWeight('medium'), 'text-primary')}
                    >
                      {t('settings.devices.thisDevice', {}, { defaultValue: 'This device' })}
                    </span>
                  ) : confirmingDeviceId === device.id ? (
                    <span className={cm.flex({ align: 'center', gap: 'sm' })}>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={revokingDeviceId === device.id}
                        onClick={() => setConfirmingDeviceId(null)}
                        data-mol-id="device-revoke-cancel"
                      >
                        {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                      </Button>
                      <Button
                        color="error"
                        size="sm"
                        loading={revokingDeviceId === device.id}
                        onClick={() => revokeDevice(device.id)}
                        data-mol-id="device-revoke-confirm"
                      >
                        {t('settings.signOutDevice', {}, { defaultValue: 'Sign out' })}
                      </Button>
                    </span>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmingDeviceId(device.id)}
                      data-mol-id="device-revoke"
                    >
                      {t('settings.signOutDevice', {}, { defaultValue: 'Sign out' })}
                    </Button>
                  )}
                </div>
                {confirmingDeviceId === device.id ? (
                  <p
                    className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', cm.sp('mt', 1))}
                  >
                    {t(
                      'settings.revokeDeviceWarning',
                      {},
                      {
                        defaultValue: "This device's access will be revoked shortly. Sign it out?",
                      },
                    )}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('settings.noDevices', {}, { defaultValue: 'No devices found.' })}
          </p>
        )}
      </section>

      <section
        data-mol-id="settings-delete-account"
        className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3', 'border border-error')}
      >
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
          {t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
        </h2>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'settings.deleteAccountModal.warning',
            {},
            {
              defaultValue:
                'Permanently delete your account and all associated data. This cannot be undone.',
            },
          )}
        </p>
        <Button
          variant="outline"
          color="error"
          size="sm"
          onClick={() => setShowDelete(true)}
          data-mol-id="user-menu-delete-account"
        >
          {t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
        </Button>
      </section>

      <Modal
        open={showPwModal}
        onClose={() => {
          setShowPwModal(false)
          pwReset()
        }}
        title={t('settings.changePasswordModal.title', {}, { defaultValue: 'Change password' })}
      >
        {pwError ? (
          <Alert status="error" className={cm.sp('mb', 4)}>
            {pwError.message ||
              t(
                'settings.changePasswordModal.error',
                {},
                {
                  defaultValue: 'Could not change your password.',
                },
              )}
          </Alert>
        ) : null}
        <form
          onSubmit={handleChangePassword}
          className="space-y-4"
          data-mol-id="form-change-password"
        >
          <label className="block">
            <span className={labelClass}>
              {t(
                'settings.changePasswordModal.currentPassword',
                {},
                {
                  defaultValue: 'Current password',
                },
              )}
            </span>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword((e.target as HTMLInputElement).value)}
              autoComplete="current-password"
              required
            />
          </label>
          <label className="block">
            <span className={labelClass}>
              {t('settings.changePasswordModal.newPassword', {}, { defaultValue: 'New password' })}
            </span>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword((e.target as HTMLInputElement).value)}
              autoComplete="new-password"
              required
            />
          </label>
          <Button
            type="submit"
            fullWidth
            loading={pwStatus === 'pending'}
            data-mol-id="button-submit"
          >
            {pwStatus === 'pending'
              ? t('settings.changePasswordModal.changing', {}, { defaultValue: 'Changing…' })
              : t('settings.changePassword', {}, { defaultValue: 'Change password' })}
          </Button>
        </form>
      </Modal>

      <Modal
        open={show2fa}
        onClose={() => {
          setShow2fa(false)
          setTwoFactorError('')
        }}
        title={
          twoFactorMode === 'enable'
            ? t(
                'settings.security.twoFactor.enableTitle',
                {},
                {
                  defaultValue: 'Enable two-factor authentication',
                },
              )
            : t(
                'settings.security.twoFactor.disableTitle',
                {},
                {
                  defaultValue: 'Disable two-factor authentication',
                },
              )
        }
      >
        {twoFactorError ? (
          <Alert status="error" className={cm.sp('mb', 4)}>
            {twoFactorError}
          </Alert>
        ) : null}
        <form onSubmit={handleConfirm2fa} className="space-y-4" data-mol-id="form-two-factor">
          {twoFactorMode === 'enable' ? (
            <>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'settings.security.twoFactor.scan',
                  {},
                  {
                    defaultValue:
                      'Scan this QR code with your authenticator app, then enter the 6-digit code to confirm.',
                  },
                )}
              </p>
              {qrImageUrl ? (
                <img
                  src={qrImageUrl}
                  alt={t(
                    'settings.security.twoFactor.qrAlt',
                    {},
                    {
                      defaultValue: 'Two-factor QR code',
                    },
                  )}
                  width={180}
                  height={180}
                  className={cm.cn('block mx-auto', cm.sp('my', 2))}
                />
              ) : null}
              {twoFactorSecret ? (
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    'text-on-surface-variant text-center break-all',
                  )}
                >
                  {t('settings.security.twoFactor.secretLabel', {}, { defaultValue: 'Setup key' })}:{' '}
                  <code>{twoFactorSecret}</code>
                </p>
              ) : null}
            </>
          ) : (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'settings.security.twoFactor.disablePrompt',
                {},
                {
                  defaultValue:
                    'Enter a code from your authenticator app to turn off two-factor authentication.',
                },
              )}
            </p>
          )}
          <label className="block">
            <span className={labelClass}>
              {t('settings.security.twoFactor.code', {}, { defaultValue: 'Authentication code' })}
            </span>
            <Input
              type="text"
              value={twoFactorToken}
              onChange={(e) => setTwoFactorToken((e.target as HTMLInputElement).value)}
              autoComplete="one-time-code"
              required
            />
          </label>
          <Button
            type="submit"
            color={twoFactorMode === 'disable' ? 'error' : 'primary'}
            fullWidth
            loading={twoFactorBusy}
            data-mol-id="button-confirm-2fa"
          >
            {twoFactorMode === 'enable'
              ? t(
                  'settings.security.twoFactor.confirmEnable',
                  {},
                  {
                    defaultValue: 'Verify and enable',
                  },
                )
              : t(
                  'settings.security.twoFactor.confirmDisable',
                  {},
                  {
                    defaultValue: 'Disable two-factor',
                  },
                )}
          </Button>
        </form>
      </Modal>

      <Modal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        title={t('settings.deleteAccountModal.title', {}, { defaultValue: 'Delete account' })}
      >
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mb', 4))}>
          {t(
            'settings.deleteAccountModal.warning',
            {},
            {
              defaultValue:
                'This permanently deletes your account and all associated data. This action cannot be undone.',
            },
          )}
        </p>
        {deleteError ? (
          <Alert status="error" className={cm.sp('mb', 4)}>
            {deleteError}
          </Alert>
        ) : null}
        <form onSubmit={handleDelete} className="space-y-4" data-mol-id="form-delete-account">
          <label className="block">
            <span className={labelClass}>
              {t(
                'settings.deleteAccountModal.password',
                {},
                {
                  defaultValue: 'Confirm your password',
                },
              )}
            </span>
            <Input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword((e.target as HTMLInputElement).value)}
              autoComplete="current-password"
              required
            />
          </label>
          <Button
            type="submit"
            color="error"
            fullWidth
            loading={deleteBusy}
            data-mol-id="button-confirm-delete"
          >
            {deleteBusy
              ? t('settings.deleteAccountModal.deleting', {}, { defaultValue: 'Deleting…' })
              : t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
          </Button>
        </form>
      </Modal>
    </>
  )
}

interface FormFooterProps {
  cm: ReturnType<typeof getClassMap>
  t: ReturnType<typeof useTranslation>['t']
  saving: boolean
  savedAt: number | null
  error: string | null
  disabled: boolean
}

function FormFooter({ cm, t, saving, savedAt, error, disabled }: FormFooterProps) {
  return (
    <div className={cm.flex({ align: 'center', gap: 'sm' })}>
      <button
        type="submit"
        data-mol-id="button-submit"
        disabled={disabled}
        className={cm.cn(
          cm.sp('px', 4),
          cm.sp('py', 2),
          cm.fontWeight('semibold'),
          'rounded-md bg-primary text-on-primary disabled:opacity-50',
        )}
      >
        {saving
          ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
          : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
      </button>
      {savedAt ? (
        <span data-mol-id="settings-saved" className={cm.cn(cm.textSize('xs'), 'text-success')}>
          {t('common.savedPeriod', {}, { defaultValue: 'Saved.' })}
        </span>
      ) : null}
      {error ? (
        <span role="alert" className={cm.cn(cm.textSize('xs'), 'text-error')}>
          {error}
        </span>
      ) : null}
    </div>
  )
}

interface ToggleRowProps {
  cm: ReturnType<typeof getClassMap>
  label: string
  checked: boolean
  onChange: (next: boolean) => void
  name: string
}

function ToggleRow({ cm, label, checked, onChange, name }: ToggleRowProps) {
  return (
    <label className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>{label}</span>
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={'h-5 w-5 rounded border-outline-variant text-primary focus:ring-primary'}
      />
    </label>
  )
}
