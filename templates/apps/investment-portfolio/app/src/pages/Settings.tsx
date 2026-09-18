import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import {
  useAuth,
  useChangePassword,
  useHttpClient,
  useTranslation,
  useUser,
} from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Alert, Button, Input, LanguagePicker, Modal, ThemeToggle } from '@molecule/app-ui-react'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

const SECTIONS = [
  'profile',
  'security',
  'linked_accounts',
  'tax_lots',
  'notifications',
  'devices',
  'appearance',
  'language',
] as const
type Section = (typeof SECTIONS)[number]

interface UserShape {
  id?: string
  name?: string | null
  email?: string | null
  username?: string | null
}

interface DeviceShape {
  id: string
  name?: string | null
  platform?: string | null
  lastSeen?: string | null
  /** `true` for the device making the current request (the API marks it). */
  isCurrent?: boolean
}

interface UserSettings {
  advisor_email?: string | null
  tax_method?: 'FIFO' | 'LIFO' | 'SpecID' | string | null
}

interface NotificationPrefs {
  price_alerts: boolean
  rebalance_drift: boolean
  dividends_paid: boolean
  tax_docs_ready: boolean
}

const DEFAULT_PREFS: NotificationPrefs = {
  price_alerts: true,
  rebalance_drift: true,
  dividends_paid: true,
  tax_docs_ready: true,
}

const TAX_OPTIONS: NonNullable<UserSettings['tax_method']>[] = ['FIFO', 'LIFO', 'SpecID']

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const user = useUser<UserShape>()
  const { setUser, logout } = useAuth<UserShape>()
  const navigate = useNavigate()
  const { status: pwStatus, error: pwError, changePassword, reset: resetPw } = useChangePassword()
  const [section, setSection] = useState<Section>('profile')

  // Profile state
  const [profileName, setProfileName] = useState('')
  const [profileEmail, setProfileEmail] = useState('')
  const [advisorEmail, setAdvisorEmail] = useState('')
  const [taxMethod, setTaxMethod] = useState<'FIFO' | 'LIFO' | 'SpecID'>('FIFO')
  const [profileBusy, setProfileBusy] = useState(false)
  const [profileMsg, setProfileMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  // Notification prefs state
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS)
  const [prefsBusy, setPrefsBusy] = useState<keyof NotificationPrefs | null>(null)
  const [prefsMsg, setPrefsMsg] = useState<string | null>(null)

  // Security: change-password modal
  const [showPwModal, setShowPwModal] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  // Security: two-factor (TOTP) enrollment flow
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [tfModal, setTfModal] = useState<null | 'enable' | 'disable'>(null)
  const [tfSetup, setTfSetup] = useState<{ QRImageUrl?: string; secret?: string } | null>(null)
  const [tfToken, setTfToken] = useState('')
  const [tfLoading, setTfLoading] = useState(false)
  const [tfError, setTfError] = useState('')

  // Security: delete-account modal
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  // Devices
  const [devices, setDevices] = useState<DeviceShape[]>([])
  const [devicesLoading, setDevicesLoading] = useState(true)
  const [confirmingDeviceId, setConfirmingDeviceId] = useState<string | null>(null)
  const [revokingDeviceId, setRevokingDeviceId] = useState<string | null>(null)

  useEffect(() => {
    setProfileName(user?.name ?? '')
    setProfileEmail(user?.email ?? '')
  }, [user])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      http.get('/api/user-settings').catch(() => null),
      http.get('/api/notification-preferences').catch(() => null),
    ]).then(([settingsRes, prefsRes]) => {
      if (cancelled) return
      const settings = unwrapSingle<UserSettings>(settingsRes)
      if (settings) {
        setAdvisorEmail(settings.advisor_email ?? '')
        const tm = settings.tax_method as 'FIFO' | 'LIFO' | 'SpecID' | undefined
        if (tm && TAX_OPTIONS.includes(tm)) setTaxMethod(tm)
      }
      const p = unwrapSingle<NotificationPrefs>(prefsRes)
      if (p) {
        setPrefs({
          price_alerts: Boolean(p.price_alerts),
          rebalance_drift: Boolean(p.rebalance_drift),
          dividends_paid: Boolean(p.dividends_paid),
          tax_docs_ready: Boolean(p.tax_docs_ready),
        })
      }
    })
    return () => {
      cancelled = true
    }
  }, [http])

  // Load the user's registered devices (GET /api/devices). Exposed as a
  // callback so a successful revoke can refetch the list.
  const loadDevices = useCallback(async () => {
    try {
      const res = await http.get('/api/devices')
      setDevices(unwrapList<DeviceShape>(res))
    } catch (_error) {
      // Devices endpoint is best-effort; the list renders empty when unavailable.
    } finally {
      setDevicesLoading(false)
    }
  }, [http])

  useEffect(() => {
    loadDevices()
  }, [loadDevices])

  // Read the persisted two-factor status from /api/users/me on mount.
  useEffect(() => {
    let cancelled = false
    http
      .get<{ props?: { twoFactorEnabled?: boolean }; twoFactorEnabled?: boolean }>('/api/users/me')
      .then((res) => {
        if (cancelled) return
        const body = (res as { data?: Record<string, unknown> }).data ?? res
        const u = ((body as { props?: Record<string, unknown> }).props ?? body) as {
          twoFactorEnabled?: boolean
        }
        setTwoFactorEnabled(Boolean(u?.twoFactorEnabled))
      })
      .catch(() => {
        // Status read is best-effort; defaults to disabled.
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const saveProfile = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (profileBusy) return
      setProfileBusy(true)
      setProfileMsg(null)
      try {
        await Promise.all([
          http.patch('/api/users/me', { name: profileName, email: profileEmail }),
          http.put('/api/user-settings', { advisor_email: advisorEmail, tax_method: taxMethod }),
        ])
        // Sync the auth bond's cached user (drives the header avatar and
        // every `useUser()` consumer) so the new name/email survive reload.
        setUser({ ...(user ?? {}), name: profileName, email: profileEmail })
        setProfileMsg({
          kind: 'ok',
          text: t('common.profileSavedPeriod', {}, { defaultValue: 'Profile saved.' }),
        })
      } catch (err) {
        const text = err instanceof Error ? err.message : String(err)
        setProfileMsg({
          kind: 'err',
          text:
            text ||
            t('common.couldNotSaveProfile', {}, { defaultValue: 'Could not save profile.' }),
        })
      } finally {
        setProfileBusy(false)
      }
    },
    [profileBusy, http, profileName, profileEmail, advisorEmail, taxMethod, setUser, user, t],
  )

  const togglePref = useCallback(
    async (key: keyof NotificationPrefs) => {
      if (prefsBusy) return
      const next = { ...prefs, [key]: !prefs[key] }
      setPrefs(next)
      setPrefsBusy(key)
      setPrefsMsg(null)
      try {
        await http.put('/api/notification-preferences', { [key]: next[key] })
      } catch (err) {
        setPrefs(prefs)
        const text = err instanceof Error ? err.message : String(err)
        setPrefsMsg(
          text ||
            t('settings.notifications.error', {}, { defaultValue: 'Could not update preference.' }),
        )
      } finally {
        setPrefsBusy(null)
      }
    },
    [http, prefs, prefsBusy, t],
  )

  const handleChangePassword = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      try {
        await changePassword(currentPassword, newPassword)
        setShowPwModal(false)
        setCurrentPassword('')
        setNewPassword('')
        resetPw()
      } catch (_error) {
        // The error is surfaced via useChangePassword's `error` state in the modal;
        // re-throwing here would only leave the modal open with no added benefit.
      }
    },
    [changePassword, currentPassword, newPassword, resetPw],
  )

  const closeTwoFactor = useCallback(() => {
    setTfModal(null)
    setTfSetup(null)
    setTfToken('')
    setTfError('')
  }, [])

  // Begin enrollment: POST {action:'setup'} returns a QR code + secret to
  // scan into an authenticator app. The user then enters the 6-digit code.
  const startEnableTwoFactor = useCallback(async () => {
    setTfError('')
    setTfLoading(true)
    setTfModal('enable')
    try {
      const res = await http.post<{ QRImageUrl?: string; secret?: string }>(
        `/api/users/${user?.id}/verify-two-factor`,
        { action: 'setup' },
      )
      const data = ((res as { data?: { QRImageUrl?: string; secret?: string } }).data ?? res) as {
        QRImageUrl?: string
        secret?: string
      }
      setTfSetup(data)
    } catch (err) {
      setTfError(
        err instanceof Error
          ? err.message
          : t(
              'settings.security.twoFactorUnavailable',
              {},
              { defaultValue: 'Two-factor authentication is not available for this app.' },
            ),
      )
    } finally {
      setTfLoading(false)
    }
  }, [http, user?.id, t])

  // Confirm a 6-digit code to enable (200) or disable the second factor.
  const submitTwoFactor = useCallback(
    async (action: 'enable' | 'disable') => {
      setTfError('')
      setTfLoading(true)
      try {
        await http.post(`/api/users/${user?.id}/verify-two-factor`, { action, token: tfToken })
        setTwoFactorEnabled(action === 'enable')
        closeTwoFactor()
      } catch (err) {
        setTfError(
          err instanceof Error
            ? err.message
            : t('settings.security.twoFactorInvalidCode', {}, { defaultValue: 'Invalid code' }),
        )
      } finally {
        setTfLoading(false)
      }
    },
    [http, user?.id, tfToken, closeTwoFactor, t],
  )

  // Revoke (sign out) a device: DELETE /api/devices/:id then refetch. The
  // API enforces server-side session revocation when the row is deleted.
  const revokeDevice = useCallback(
    async (id: string) => {
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
    },
    [http, loadDevices],
  )

  const handleDeleteAccount = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (deleteLoading) return
      setDeleteLoading(true)
      setDeleteError('')
      try {
        await http.delete(`/api/users/${user?.id}`, { data: { password: deletePassword } })
        await logout()
        navigate('/login')
      } catch (err) {
        const text = err instanceof Error ? err.message : String(err)
        setDeleteError(
          text ||
            t('settings.security.deleteError', {}, { defaultValue: 'Could not delete account.' }),
        )
      } finally {
        setDeleteLoading(false)
      }
    },
    [deleteLoading, http, user?.id, deletePassword, logout, navigate, t],
  )

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
                  { defaultValue: s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) },
                )}
              </button>
            )
          })}
        </nav>
      </aside>

      <main className={cm.cn('col-span-12 md:col-span-9 space-y-4')}>
        {section === 'profile' && (
          <form onSubmit={saveProfile} className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-4')}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t('settings.profile.heading', {}, { defaultValue: 'Profile' })}
            </h2>
            <Field
              label={t('form.fullName', {}, { defaultValue: 'Full name' })}
              value={profileName}
              onChange={setProfileName}
            />
            <Field
              label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
              value={profileEmail}
              onChange={setProfileEmail}
              type="email"
            />
            <Field
              label={t(
                'settings.profile.advisor',
                {},
                { defaultValue: 'Advisor email (optional)' },
              )}
              value={advisorEmail}
              onChange={setAdvisorEmail}
              type="email"
            />
            <div className={cm.flex({ align: 'center', justify: 'between', gap: 'md' })}>
              <button
                type="submit"
                disabled={profileBusy}
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  'bg-primary text-on-primary rounded-md disabled:opacity-50',
                )}
              >
                {profileBusy
                  ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                  : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
              </button>
              {profileMsg ? (
                <p
                  className={cm.cn(
                    cm.textSize('sm'),
                    profileMsg.kind === 'ok' ? 'text-success' : 'text-error',
                  )}
                >
                  {profileMsg.text}
                </p>
              ) : null}
            </div>
          </form>
        )}

        {section === 'security' && (
          <>
            <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-4')}>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                {t('settings.security.heading', {}, { defaultValue: 'Security' })}
              </h2>
              <div className={cm.flex({ align: 'center', justify: 'between', gap: 'md' })}>
                <div>
                  <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                    {t('settings.security.password', {}, { defaultValue: 'Password' })}
                  </p>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {t(
                      'settings.security.passwordHint',
                      {},
                      { defaultValue: 'Change the password you use to sign in.' },
                    )}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowPwModal(true)}>
                  {t('settings.security.changePassword', {}, { defaultValue: 'Change password' })}
                </Button>
              </div>
              <div className={cm.flex({ align: 'center', justify: 'between', gap: 'md' })}>
                <div>
                  <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                    {t(
                      'settings.security.twoFactor',
                      {},
                      { defaultValue: 'Two-factor authentication' },
                    )}
                    {twoFactorEnabled ? (
                      <span className={cm.cn(cm.textSize('xs'), 'text-success', cm.sp('ml', 2))}>
                        {t('settings.security.twoFactorOn', {}, { defaultValue: 'On' })}
                      </span>
                    ) : null}
                  </p>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {t(
                      'settings.security.twoFactorHint',
                      {},
                      { defaultValue: 'Add an extra layer of protection to your account.' },
                    )}
                  </p>
                </div>
                {twoFactorEnabled ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setTfError('')
                      setTfToken('')
                      setTfModal('disable')
                    }}
                  >
                    {t('settings.security.twoFactorDisable', {}, { defaultValue: 'Disable' })}
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={startEnableTwoFactor}>
                    {t('settings.security.twoFactorEnable', {}, { defaultValue: 'Enable' })}
                  </Button>
                )}
              </div>
            </section>

            <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'text-error')}>
                {t('settings.security.deleteHeading', {}, { defaultValue: 'Delete account' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'settings.security.deleteWarning',
                  {},
                  {
                    defaultValue:
                      'Permanently delete your account and all associated data. This cannot be undone.',
                  },
                )}
              </p>
              <div>
                <Button color="error" size="sm" onClick={() => setShowDeleteModal(true)}>
                  {t('settings.security.deleteAccount', {}, { defaultValue: 'Delete account' })}
                </Button>
              </div>
            </section>
          </>
        )}

        {section === 'tax_lots' && (
          <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t('settings.tax.heading', {}, { defaultValue: 'Tax lot accounting' })}
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
                {t('settings.tax.method', {}, { defaultValue: 'Default method' })}
              </span>
              <div className={cm.cn(cm.flex({ gap: 'sm' }))}>
                {TAX_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setTaxMethod(opt as 'FIFO' | 'LIFO' | 'SpecID')}
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      cm.textSize('sm'),
                      cm.fontWeight('medium'),
                      'rounded-md border',
                      taxMethod === opt
                        ? 'bg-primary-container text-primary-dark border-primary/40'
                        : 'border-outline-variant text-on-surface-variant hover:bg-surface-container',
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </label>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'settings.tax.note',
                {},
                {
                  defaultValue:
                    'FIFO sells oldest lots first. LIFO uses newest. SpecID picks specific lots per sale.',
                },
              )}
            </p>
            <button
              type="button"
              disabled={profileBusy}
              onClick={async () => {
                setProfileBusy(true)
                setProfileMsg(null)
                try {
                  await http.put('/api/user-settings', { tax_method: taxMethod })
                  setProfileMsg({
                    kind: 'ok',
                    text: t('settings.tax.saved', {}, { defaultValue: 'Tax method saved.' }),
                  })
                } catch (err) {
                  const text = err instanceof Error ? err.message : String(err)
                  setProfileMsg({
                    kind: 'err',
                    text:
                      text ||
                      t('settings.tax.error', {}, { defaultValue: 'Could not update tax method.' }),
                  })
                } finally {
                  setProfileBusy(false)
                }
              }}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                'bg-primary text-on-primary rounded-md disabled:opacity-50',
              )}
            >
              {profileBusy
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('settings.tax.save', {}, { defaultValue: 'Save method' })}
            </button>
            {profileMsg ? (
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  profileMsg.kind === 'ok' ? 'text-success' : 'text-error',
                )}
              >
                {profileMsg.text}
              </p>
            ) : null}
          </section>
        )}

        {section === 'linked_accounts' && (
          <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t('settings.linked.heading', {}, { defaultValue: 'Linked brokerage accounts' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'settings.linked.body',
                {},
                {
                  defaultValue:
                    'Brokerage syncing requires a third-party connector (Plaid, Yodlee, etc.). Configure your provider in your environment to enable auto-import.',
                },
              )}
            </p>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t('settings.linked.placeholder', {}, { defaultValue: 'No accounts linked yet.' })}
            </p>
          </section>
        )}

        {section === 'notifications' && (
          <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t('nav.notificationPreferences', {}, { defaultValue: 'Notification preferences' })}
            </h2>
            {(
              [
                {
                  key: 'price_alerts',
                  label: t(
                    'settings.notifications.priceAlerts',
                    {},
                    { defaultValue: 'Price alerts' },
                  ),
                },
                {
                  key: 'rebalance_drift',
                  label: t(
                    'settings.notifications.rebalanceDrift',
                    {},
                    { defaultValue: 'Rebalance drift' },
                  ),
                },
                {
                  key: 'dividends_paid',
                  label: t(
                    'settings.notifications.dividendsPaid',
                    {},
                    { defaultValue: 'Dividends paid' },
                  ),
                },
                {
                  key: 'tax_docs_ready',
                  label: t(
                    'settings.notifications.taxDocsReady',
                    {},
                    { defaultValue: 'Tax docs ready' },
                  ),
                },
              ] as { key: keyof NotificationPrefs; label: string }[]
            ).map((n) => (
              <label
                key={n.key}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between' }),
                  'cursor-pointer',
                )}
              >
                <span className={cm.textSize('sm')}>{n.label}</span>
                <input
                  type="checkbox"
                  checked={prefs[n.key]}
                  disabled={prefsBusy === n.key}
                  onChange={() => togglePref(n.key)}
                  className={cm.cn('h-4 w-4')}
                />
              </label>
            ))}
            {prefsMsg ? <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{prefsMsg}</p> : null}
          </section>
        )}

        {section === 'devices' && (
          <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t('settings.devices.heading', {}, { defaultValue: 'Devices' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'settings.devices.body',
                {},
                { defaultValue: 'Devices currently signed in to your account.' },
              )}
            </p>
            {devicesLoading ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
              </p>
            ) : devices.length > 0 ? (
              <ul className={cm.cn('space-y-2')}>
                {devices.map((d) => (
                  <li key={d.id} className={cm.cn(cm.sp('py', 1))}>
                    <div
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
                        cm.textSize('sm'),
                      )}
                    >
                      <span>
                        {d.name ||
                          d.platform ||
                          t('settings.devices.unknown', {}, { defaultValue: 'Unknown device' })}
                        {d.isCurrent ? (
                          <span
                            className={cm.cn(
                              cm.textSize('xs'),
                              'text-on-surface-variant',
                              cm.sp('ml', 2),
                            )}
                          >
                            {t('settings.devices.thisDevice', {}, { defaultValue: 'This device' })}
                          </span>
                        ) : null}
                      </span>
                      <span className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                        {d.lastSeen ? (
                          <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                            {new Date(d.lastSeen).toLocaleDateString()}
                          </span>
                        ) : null}
                        {!d.isCurrent ? (
                          confirmingDeviceId === d.id ? (
                            <span className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={revokingDeviceId === d.id}
                                onClick={() => setConfirmingDeviceId(null)}
                              >
                                {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                              </Button>
                              <Button
                                color="error"
                                size="sm"
                                loading={revokingDeviceId === d.id}
                                onClick={() => revokeDevice(d.id)}
                              >
                                {t('settings.devices.signOut', {}, { defaultValue: 'Sign out' })}
                              </Button>
                            </span>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setConfirmingDeviceId(d.id)}
                            >
                              {t('settings.devices.signOut', {}, { defaultValue: 'Sign out' })}
                            </Button>
                          )
                        ) : null}
                      </span>
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
                          'settings.devices.revokeWarning',
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
            ) : (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t('settings.devices.empty', {}, { defaultValue: 'No devices found.' })}
              </p>
            )}
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

        <Modal
          open={showPwModal}
          onClose={() => {
            setShowPwModal(false)
            resetPw()
          }}
          title={t(
            'settings.security.changePasswordTitle',
            {},
            { defaultValue: 'Change password' },
          )}
        >
          {pwError ? (
            <Alert status="error" className={cm.sp('mb', 4)}>
              {pwError.message ||
                t(
                  'settings.security.passwordError',
                  {},
                  { defaultValue: 'Could not change password.' },
                )}
            </Alert>
          ) : null}
          <form onSubmit={handleChangePassword} className={cm.cn('space-y-4')}>
            <label className={cm.cn('block')}>
              <span
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'block',
                  cm.sp('mb', 1),
                )}
              >
                {t('settings.security.currentPassword', {}, { defaultValue: 'Current password' })}
              </span>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword((e.target as HTMLInputElement).value)}
                autoComplete="current-password"
                required
              />
            </label>
            <label className={cm.cn('block')}>
              <span
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'block',
                  cm.sp('mb', 1),
                )}
              >
                {t('settings.security.newPassword', {}, { defaultValue: 'New password' })}
              </span>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword((e.target as HTMLInputElement).value)}
                autoComplete="new-password"
                required
              />
            </label>
            <Button type="submit" fullWidth loading={pwStatus === 'pending'}>
              {pwStatus === 'pending'
                ? t('settings.security.changing', {}, { defaultValue: 'Changing…' })
                : t('settings.security.changePassword', {}, { defaultValue: 'Change password' })}
            </Button>
          </form>
        </Modal>

        <Modal
          open={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title={t('settings.security.deleteAccount', {}, { defaultValue: 'Delete account' })}
        >
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mb', 4))}>
            {t(
              'settings.security.deleteModalWarning',
              {},
              {
                defaultValue:
                  'This permanently deletes your account and data. Enter your password to confirm.',
              },
            )}
          </p>
          {deleteError ? (
            <Alert status="error" className={cm.sp('mb', 4)}>
              {deleteError}
            </Alert>
          ) : null}
          <form onSubmit={handleDeleteAccount} className={cm.cn('space-y-4')}>
            <label className={cm.cn('block')}>
              <span
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'block',
                  cm.sp('mb', 1),
                )}
              >
                {t('settings.security.confirmPassword', {}, { defaultValue: 'Password' })}
              </span>
              <Input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword((e.target as HTMLInputElement).value)}
                autoComplete="current-password"
                required
              />
            </label>
            <Button type="submit" color="error" fullWidth loading={deleteLoading}>
              {deleteLoading
                ? t('settings.security.deleting', {}, { defaultValue: 'Deleting…' })
                : t('settings.security.deleteAccount', {}, { defaultValue: 'Delete account' })}
            </Button>
          </form>
        </Modal>

        <Modal
          open={tfModal !== null}
          onClose={closeTwoFactor}
          title={
            tfModal === 'disable'
              ? t(
                  'settings.security.twoFactorDisableTitle',
                  {},
                  { defaultValue: 'Disable two-factor authentication' },
                )
              : t(
                  'settings.security.twoFactorEnableTitle',
                  {},
                  { defaultValue: 'Enable two-factor authentication' },
                )
          }
        >
          {tfError ? (
            <Alert status="error" className={cm.sp('mb', 4)}>
              {tfError}
            </Alert>
          ) : null}
          {tfModal === 'enable' && tfLoading && !tfSetup ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
            </p>
          ) : null}
          {tfModal === 'enable' && tfSetup?.QRImageUrl ? (
            <div className={cm.cn('space-y-3', cm.sp('mb', 4))}>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'settings.security.twoFactorScan',
                  {},
                  {
                    defaultValue:
                      'Scan this QR code with your authenticator app, then enter the 6-digit code.',
                  },
                )}
              </p>
              <img
                src={tfSetup.QRImageUrl}
                alt={t(
                  'settings.security.twoFactorQrAlt',
                  {},
                  { defaultValue: 'Two-factor QR code' },
                )}
                className={cm.cn('mx-auto max-w-xs')}
              />
              {tfSetup.secret ? (
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    'text-on-surface-variant text-center break-all',
                  )}
                >
                  {tfSetup.secret}
                </p>
              ) : null}
            </div>
          ) : null}
          {tfModal === 'disable' || tfSetup ? (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                void submitTwoFactor(tfModal === 'disable' ? 'disable' : 'enable')
              }}
              className={cm.cn('space-y-4')}
            >
              <label className={cm.cn('block')}>
                <span
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'block',
                    cm.sp('mb', 1),
                  )}
                >
                  {t(
                    'settings.security.twoFactorCode',
                    {},
                    { defaultValue: 'Authentication code' },
                  )}
                </span>
                <Input
                  type="text"
                  value={tfToken}
                  onChange={(e) => setTfToken((e.target as HTMLInputElement).value)}
                  autoComplete="one-time-code"
                  required
                />
              </label>
              <Button
                type="submit"
                color={tfModal === 'disable' ? 'error' : undefined}
                fullWidth
                loading={tfLoading}
              >
                {tfModal === 'disable'
                  ? t('settings.security.twoFactorDisable', {}, { defaultValue: 'Disable' })
                  : t('settings.security.twoFactorVerify', {}, { defaultValue: 'Verify & enable' })}
              </Button>
            </form>
          ) : null}
        </Modal>
      </main>
    </div>
  )
}

interface FieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
}

function Field({ label, value, onChange, type = 'text' }: FieldProps) {
  const cm = getClassMap()
  return (
    <label className={cm.cn('block')}>
      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}>
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cm.cn(
          cm.sp('px', 3),
          cm.sp('py', 2),
          'w-full border border-outline-variant rounded-md focus:ring-2 focus:ring-primary/20 outline-none',
        )}
      />
    </label>
  )
}
