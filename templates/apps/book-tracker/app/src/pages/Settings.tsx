import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import {
  useAuth,
  useChangePassword,
  useHttpClient,
  usePush,
  useTranslation,
} from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Alert, Button, Input, LanguagePicker, Modal, ThemeToggle } from '@molecule/app-ui-react'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

const SECTIONS = ['account', 'reminders', 'reading', 'appearance', 'security', 'language'] as const
type Section = (typeof SECTIONS)[number]

interface Prefs {
  timezone: string | null
  startOfWeek: 'sunday' | 'monday'
  dailyGoalPages: number
  countDnfInStats: boolean
  remindDaily: boolean
  remindStalled: boolean
  remindWeekly: boolean
  remindChallenge: boolean
  bio: string
}

interface ProfileMe {
  id: string
  name: string | null
  email: string | null
  username: string | null
  planKey: string
  createdAt: string
  preferences: Prefs
}

interface AccountUser {
  id?: string
  oauthServer?: string | null
}

interface DeviceRow {
  id: string
  name?: string | null
  pushPlatform?: string | null
  createdAt?: string | null
  /** `true` for the device making the current request (the API marks it). */
  isCurrent?: boolean
}

const DEFAULT_PREFS: Prefs = {
  timezone: null,
  startOfWeek: 'monday',
  dailyGoalPages: 20,
  countDnfInStats: false,
  remindDaily: true,
  remindStalled: true,
  remindWeekly: true,
  remindChallenge: true,
  bio: '',
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const auth = useAuth<AccountUser>()
  const isOAuth = Boolean(auth.user?.oauthServer)
  const push = usePush()
  const {
    status: pwStatus,
    error: pwError,
    changePassword,
    reset: resetChangePassword,
  } = useChangePassword()
  const [section, setSection] = useState<Section>('account')

  const [me, setMe] = useState<ProfileMe | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  // C5 — browser push enable (subscribe/unsubscribe via @molecule/app-push)
  const [pushEnabled, setPushEnabled] = useState(push.permission === 'granted')

  // C7 — registered devices (with per-device revoke / sign out)
  const [devices, setDevices] = useState<DeviceRow[]>([])
  const [devicesLoading, setDevicesLoading] = useState(true)
  const [confirmingDeviceId, setConfirmingDeviceId] = useState<string | null>(null)
  const [revokingDeviceId, setRevokingDeviceId] = useState<string | null>(null)

  // C4 — change-password modal
  const [showPwModal, setShowPwModal] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  // C10 — delete-account modal
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const loadDevices = useCallback(async () => {
    try {
      const res = await http.get('/devices')
      setDevices(unwrapList<DeviceRow>(res))
    } catch (_error) {
      // Devices endpoint is optional — the list simply renders empty when unavailable.
    } finally {
      setDevicesLoading(false)
    }
  }, [http])

  useEffect(() => {
    void loadDevices()
  }, [loadDevices])

  // Revoke (sign out) a device: deleting the row triggers server-side session
  // revocation, then we refetch so the list reflects the change.
  async function revokeDevice(id: string) {
    setRevokingDeviceId(id)
    try {
      await http.delete(`/devices/${id}`)
      setConfirmingDeviceId(null)
      await loadDevices()
    } catch (_error) {
      // Best-effort — keep the row so the user can retry the revoke.
    } finally {
      setRevokingDeviceId(null)
    }
  }

  async function handlePushToggle(next: boolean) {
    try {
      if (next) {
        await push.requestPermission()
        await push.register()
        setPushEnabled(true)
      } else {
        await push.unregister()
        setPushEnabled(false)
      }
    } catch (_error) {
      // Browser permission denied or service worker unavailable — leave the toggle
      // in its previous state; no data loss, no broken state.
    }
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault()
    try {
      await changePassword(currentPassword, newPassword)
      setShowPwModal(false)
      setCurrentPassword('')
      setNewPassword('')
      resetChangePassword()
    } catch (_error) {
      // Error surfaced via `pwError` from useChangePassword — keep the modal open.
    }
  }

  async function handleDeleteAccount(e: FormEvent) {
    e.preventDefault()
    if (deleting) return
    setDeleting(true)
    setDeleteError('')
    try {
      await http.delete(`/users/${auth.user?.id}`, { data: { password: deletePassword } })
      await auth.logout()
      navigate('/login')
    } catch (err) {
      setDeleteError(
        err instanceof Error
          ? err.message
          : t('settings.failedToDeleteAccount', {}, { defaultValue: 'Failed to delete account.' }),
      )
    } finally {
      setDeleting(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        const res = await http.get('/profile/me')
        if (cancelled) return
        const data = unwrapSingle<ProfileMe>(res)
        if (!data) throw new Error('Empty profile')
        setMe(data)
        setName(data.name ?? '')
        setEmail(data.email ?? '')
        setPrefs({ ...DEFAULT_PREFS, ...(data.preferences ?? {}) })
        setError(null)
      } catch (err) {
        if (cancelled) return
        const msg = err instanceof Error ? err.message : String(err)
        setError(msg)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [http])

  const dirty = useMemo(() => {
    if (!me) return false
    if (name !== (me.name ?? '')) return true
    if (email !== (me.email ?? '')) return true
    const stored = me.preferences ?? DEFAULT_PREFS
    const current = prefs as unknown as Record<string, unknown>
    const compare = stored as unknown as Record<string, unknown>
    for (const k of Object.keys(current)) {
      if (current[k] !== compare[k]) return true
    }
    return false
  }, [me, name, email, prefs])

  async function save() {
    if (saving || !me) return
    setSaving(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {}
      if (name !== (me.name ?? '')) body.name = name
      if (email !== (me.email ?? '')) body.email = email
      body.preferences = prefs
      const res = await http.put('/profile/me', body)
      const updated = unwrapSingle<ProfileMe>(res)
      if (updated) {
        setMe(updated)
        setName(updated.name ?? '')
        setEmail(updated.email ?? '')
        setPrefs({ ...DEFAULT_PREFS, ...(updated.preferences ?? {}) })
      }
      setSavedAt(Date.now())
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
    } finally {
      setSaving(false)
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
        {loading ? (
          <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}>
            {t('settings.loading', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : !me ? (
          <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-error')}>
            {error ?? 'Failed to load profile.'}
          </p>
        ) : (
          <>
            {section === 'account' && (
              <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-4')}>
                <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                  {t('settings.account', {}, { defaultValue: 'Account' })}
                </h2>
                <Field
                  label={t('form.displayName', {}, { defaultValue: 'Display name' })}
                  value={name}
                  onChange={setName}
                />
                <Field
                  label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
                  value={email}
                  onChange={setEmail}
                  type="email"
                  disabled
                />
                <Field
                  label={t('form.timezone', {}, { defaultValue: 'Timezone' })}
                  value={prefs.timezone ?? ''}
                  onChange={(v) => setPrefs((p) => ({ ...p, timezone: v || null }))}
                />
                <TextArea
                  label={t('form.bio', {}, { defaultValue: 'Bio' })}
                  value={prefs.bio}
                  onChange={(v) => setPrefs((p) => ({ ...p, bio: v }))}
                />
              </section>
            )}

            {section === 'reminders' && (
              <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
                <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                  {t('settings.reminders.heading', {}, { defaultValue: 'Reminders' })}
                </h2>
                <div className={cm.cn(cm.sp('pb', 3), 'border-b border-outline-variant')}>
                  <Toggle
                    label={t(
                      'settings.pushNotifications',
                      {},
                      { defaultValue: 'Enable push notifications on this device' },
                    )}
                    checked={pushEnabled}
                    onChange={handlePushToggle}
                  />
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.sp('mt', 1),
                      cm.sp('pl', 6),
                      'text-on-surface-variant',
                    )}
                  >
                    {t(
                      'settings.pushNotificationsHint',
                      {},
                      {
                        defaultValue: 'Allow this browser to receive the reminders selected below.',
                      },
                    )}
                  </p>
                </div>
                <Toggle
                  label={t(
                    'settings.reminders.daily',
                    {},
                    { defaultValue: 'Daily reading reminder (8:00pm)' },
                  )}
                  checked={prefs.remindDaily}
                  onChange={(v) => setPrefs((p) => ({ ...p, remindDaily: v }))}
                />
                <Toggle
                  label={t(
                    'settings.reminders.stalled',
                    {},
                    { defaultValue: 'Stalled-book nudge (nothing logged for 5 days)' },
                  )}
                  checked={prefs.remindStalled}
                  onChange={(v) => setPrefs((p) => ({ ...p, remindStalled: v }))}
                />
                <Toggle
                  label={t(
                    'settings.reminders.weekly',
                    {},
                    { defaultValue: 'Weekly pages summary (Sunday evenings)' },
                  )}
                  checked={prefs.remindWeekly}
                  onChange={(v) => setPrefs((p) => ({ ...p, remindWeekly: v }))}
                />
                <Toggle
                  label={t(
                    'settings.reminders.challenge',
                    {},
                    { defaultValue: 'Challenge milestones' },
                  )}
                  checked={prefs.remindChallenge}
                  onChange={(v) => setPrefs((p) => ({ ...p, remindChallenge: v }))}
                />
              </section>
            )}

            {section === 'language' && (
              <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
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

            {section === 'reading' && (
              <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
                <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                  {t('settings.reading.heading', {}, { defaultValue: 'Reading rules' })}
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
                    {t('settings.reading.startOfWeek', {}, { defaultValue: 'Start of week' })}
                  </span>
                  <select
                    value={prefs.startOfWeek}
                    onChange={(e) =>
                      setPrefs((p) => ({
                        ...p,
                        startOfWeek: e.target.value as Prefs['startOfWeek'],
                      }))
                    }
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      'w-full border border-outline-variant rounded-md',
                    )}
                  >
                    <option value="monday">
                      {t('settings.reading.monday', {}, { defaultValue: 'Monday' })}
                    </option>
                    <option value="sunday">
                      {t('settings.reading.sunday', {}, { defaultValue: 'Sunday' })}
                    </option>
                  </select>
                </label>
                <Field
                  label={t(
                    'settings.reading.dailyGoalPages',
                    {},
                    { defaultValue: 'Daily page goal' },
                  )}
                  type="number"
                  value={String(prefs.dailyGoalPages)}
                  onChange={(v) =>
                    setPrefs((p) => ({
                      ...p,
                      dailyGoalPages: Math.max(0, Math.min(2000, Number(v) || 0)),
                    }))
                  }
                />
                <Toggle
                  label={t(
                    'settings.reading.countDnf',
                    {},
                    { defaultValue: 'Count did-not-finish books in stats' },
                  )}
                  checked={prefs.countDnfInStats}
                  onChange={(v) => setPrefs((p) => ({ ...p, countDnfInStats: v }))}
                />
              </section>
            )}

            {section === 'appearance' && (
              <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
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

            {section === 'security' && (
              <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-6')}>
                <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                  {t('settings.security.heading', {}, { defaultValue: 'Account & security' })}
                </h2>

                {!isOAuth && (
                  <div className={cm.cn('space-y-2')}>
                    <h3 className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                      {t('settings.password', {}, { defaultValue: 'Password' })}
                    </h3>
                    <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                      {t(
                        'settings.passwordHint',
                        {},
                        { defaultValue: 'Update the password you use to sign in.' },
                      )}
                    </p>
                    <Button variant="outline" size="sm" onClick={() => setShowPwModal(true)}>
                      {t('settings.changePassword', {}, { defaultValue: 'Change password' })}
                    </Button>
                  </div>
                )}

                <div
                  className={cm.cn('space-y-2', cm.sp('pt', 4), 'border-t border-outline-variant')}
                >
                  <h3 className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                    {t('settings.devices', {}, { defaultValue: 'Devices' })}
                  </h3>
                  {devicesLoading ? (
                    <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                      {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
                    </p>
                  ) : devices.length === 0 ? (
                    <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                      {t('settings.noDevices', {}, { defaultValue: 'No devices registered yet.' })}
                    </p>
                  ) : (
                    <ul className={cm.cn('space-y-2')}>
                      {devices.map((device) => {
                        const isConfirming = confirmingDeviceId === device.id
                        const isRevoking = revokingDeviceId === device.id
                        const deviceLabel =
                          device.name ||
                          device.pushPlatform ||
                          t('settings.unnamedDevice', {}, { defaultValue: 'Device' })
                        return (
                          <li
                            key={device.id}
                            className={cm.cn(
                              cm.sp('px', 3),
                              cm.sp('py', 2),
                              cm.textSize('sm'),
                              'rounded-md bg-surface-container',
                            )}
                          >
                            <div
                              className={cm.flex({
                                align: 'center',
                                gap: 'sm',
                                justify: 'between',
                              })}
                            >
                              <span className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                                <span className="material-symbols-outlined text-on-surface-variant text-base">
                                  devices
                                </span>
                                <span className={cm.fontWeight('medium')}>{deviceLabel}</span>
                                {device.isCurrent ? (
                                  <span
                                    className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}
                                  >
                                    {t('settings.thisDevice', {}, { defaultValue: 'This device' })}
                                  </span>
                                ) : null}
                              </span>
                              {device.isCurrent ? null : isConfirming ? (
                                <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={isRevoking}
                                    onClick={() => setConfirmingDeviceId(null)}
                                  >
                                    {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                                  </Button>
                                  <Button
                                    color="error"
                                    size="sm"
                                    loading={isRevoking}
                                    onClick={() => revokeDevice(device.id)}
                                    data-testid="device-revoke-confirm"
                                  >
                                    {t('settings.signOutDevice', {}, { defaultValue: 'Sign out' })}
                                  </Button>
                                </span>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setConfirmingDeviceId(device.id)}
                                  data-testid="device-revoke"
                                >
                                  {t('settings.signOutDevice', {}, { defaultValue: 'Sign out' })}
                                </Button>
                              )}
                            </div>
                            {isConfirming && !device.isCurrent ? (
                              <p
                                className={cm.cn(
                                  cm.textSize('xs'),
                                  cm.sp('mt', 1),
                                  'text-on-surface-variant',
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
                        )
                      })}
                    </ul>
                  )}
                </div>

                <div
                  className={cm.cn('space-y-2', cm.sp('pt', 4), 'border-t border-outline-variant')}
                >
                  <h3 className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-error')}>
                    {t('settings.dangerZone', {}, { defaultValue: 'Danger zone' })}
                  </h3>
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                    {t(
                      'settings.deleteAccountModal.warning',
                      {},
                      {
                        defaultValue:
                          'Deleting your account permanently removes your shelves, reviews, and reading history. This cannot be undone.',
                      },
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(true)}
                    data-testid="settings-delete-account"
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      'rounded-md border border-error text-error hover:bg-error hover:text-on-error',
                    )}
                  >
                    {t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
                  </button>
                </div>
              </section>
            )}

            <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), cm.sp('mt', 4))}>
              <button
                type="button"
                onClick={save}
                disabled={!dirty || saving}
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  'rounded-md bg-primary text-on-primary disabled:opacity-50',
                )}
                data-testid="settings-save"
              >
                {saving
                  ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                  : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
              </button>
              {error ? (
                <span className={cm.cn(cm.textSize('sm'), 'text-error')}>{error}</span>
              ) : savedAt ? (
                <span
                  className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
                  data-testid="settings-saved"
                >
                  {t('common.saved', {}, { defaultValue: 'Saved' })}
                </span>
              ) : null}
            </div>
          </>
        )}
      </main>

      <Modal
        open={showPwModal}
        onClose={() => {
          setShowPwModal(false)
          resetChangePassword()
        }}
        title={t('settings.changePasswordModal.title', {}, { defaultValue: 'Change password' })}
      >
        {pwError && (
          <Alert status="error" className={cm.sp('mb', 4)}>
            {pwError.message ||
              t(
                'settings.changePasswordModal.error',
                {},
                { defaultValue: 'Password could not be changed.' },
              )}
          </Alert>
        )}
        <form onSubmit={handleChangePassword} className={cm.cn('space-y-4')}>
          <div>
            <label
              htmlFor="settings-current-pw"
              className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}
            >
              {t(
                'settings.changePasswordModal.currentPassword',
                {},
                { defaultValue: 'Current password' },
              )}
            </label>
            <Input
              id="settings-current-pw"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword((e.target as HTMLInputElement).value)}
              autoComplete="current-password"
              required
            />
          </div>
          <div>
            <label
              htmlFor="settings-new-pw"
              className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}
            >
              {t('settings.changePasswordModal.newPassword', {}, { defaultValue: 'New password' })}
            </label>
            <Input
              id="settings-new-pw"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword((e.target as HTMLInputElement).value)}
              autoComplete="new-password"
              required
            />
          </div>
          <Button type="submit" fullWidth loading={pwStatus === 'pending'}>
            {pwStatus === 'pending'
              ? t('settings.changePasswordModal.changing', {}, { defaultValue: 'Changing…' })
              : t('settings.changePassword', {}, { defaultValue: 'Change password' })}
          </Button>
        </form>
      </Modal>

      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title={t('settings.deleteAccountModal.title', {}, { defaultValue: 'Delete account' })}
      >
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mb', 4))}>
          {t(
            'settings.deleteAccountModal.warning',
            {},
            {
              defaultValue:
                'Deleting your account permanently removes your shelves, reviews, and reading history. This cannot be undone.',
            },
          )}
        </p>
        {deleteError && (
          <Alert status="error" className={cm.sp('mb', 4)}>
            {deleteError}
          </Alert>
        )}
        <form onSubmit={handleDeleteAccount} className={cm.cn('space-y-4')}>
          <div>
            <label
              htmlFor="settings-delete-pw"
              className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}
            >
              {t(
                'settings.deleteAccountModal.password',
                {},
                { defaultValue: 'Confirm your password' },
              )}
            </label>
            <Input
              id="settings-delete-pw"
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword((e.target as HTMLInputElement).value)}
              required
            />
          </div>
          <Button type="submit" color="error" fullWidth loading={deleting}>
            {deleting
              ? t('settings.deleteAccountModal.deleting', {}, { defaultValue: 'Deleting…' })
              : t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
          </Button>
        </form>
      </Modal>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  disabled,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  disabled?: boolean
}) {
  const cm = getClassMap()
  return (
    <label className="block">
      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}>
        {label}
      </span>
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={cm.cn(
          cm.sp('px', 3),
          cm.sp('py', 2),
          'w-full border border-outline-variant rounded-md disabled:opacity-50',
        )}
      />
    </label>
  )
}

function TextArea({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  const cm = getClassMap()
  return (
    <label className="block">
      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}>
        {label}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className={cm.cn(
          cm.sp('px', 3),
          cm.sp('py', 2),
          'w-full border border-outline-variant rounded-md resize-none',
        )}
      />
    </label>
  )
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  const cm = getClassMap()
  return (
    <label className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'cursor-pointer')}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={cm.cn(cm.h(4), cm.w(4))}
      />
      <span className={cm.cn(cm.textSize('sm'))}>{label}</span>
    </label>
  )
}
