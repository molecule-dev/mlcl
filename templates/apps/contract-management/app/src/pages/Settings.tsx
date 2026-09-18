import type { FormEvent } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'

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

const SECTIONS = ['profile', 'signatures', 'security', 'notifications', 'plan', 'language'] as const
type Section = (typeof SECTIONS)[number]

interface AccountUser {
  id?: string
  twoFactorEnabled?: boolean
}

interface Device {
  id: string
  name?: string
  platform?: string
  lastSeen?: string
  // `true` for the device making the current request (the API marks it). The
  // current session is not revocable here — that belongs to Sign out.
  isCurrent?: boolean
}

interface TwoFactorSetup {
  QRImageUrl?: string
  secret?: string
}

interface NotificationPreferences {
  contractSent?: boolean
  contractSigned?: boolean
  contractExpiring?: boolean
  weeklyDigest?: boolean
}

interface Profile {
  id: string
  email: string
  name: string
  company: string
  title: string
  signatureName: string
  notificationPreferences: NotificationPreferences
  theme: 'light' | 'dark' | 'system'
  planKey: string
}

const NOTIFICATION_KEYS: { key: keyof NotificationPreferences; defaultLabel: string }[] = [
  { key: 'contractSent', defaultLabel: 'Contract sent for signature' },
  { key: 'contractSigned', defaultLabel: 'Signed or declined' },
  { key: 'contractExpiring', defaultLabel: 'Expiring in next 30 days' },
  { key: 'weeklyDigest', defaultLabel: 'Weekly digest email' },
]

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const auth = useAuth<AccountUser>()
  const {
    status: pwStatus,
    error: pwError,
    changePassword,
    reset: resetChangePassword,
  } = useChangePassword()
  const { permission, requestPermission, register, unregister } = usePush()
  const [section, setSection] = useState<Section>('profile')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Editable form state. Mirrors `profile` but is what the user types into.
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [title, setTitle] = useState('')
  const [signatureName, setSignatureName] = useState('')
  const [notif, setNotif] = useState<NotificationPreferences>({})

  // Security section state (change password + 2FA + devices + delete account).
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordChanged, setPasswordChanged] = useState(false)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(Boolean(auth.user?.twoFactorEnabled))
  // Real TOTP enrollment flow (replaces the dead boolean toggle that PATCHed
  // `twoFactorEnabled` — a field the user update handler ignores).
  const [tfModal, setTfModal] = useState<null | 'enable' | 'disable'>(null)
  const [tfSetup, setTfSetup] = useState<TwoFactorSetup | null>(null)
  const [tfToken, setTfToken] = useState('')
  const [tfLoading, setTfLoading] = useState(false)
  const [tfError, setTfError] = useState('')
  const [pushEnabled, setPushEnabled] = useState(permission === 'granted')
  const [devices, setDevices] = useState<Device[]>([])
  const [devicesLoading, setDevicesLoading] = useState(true)
  const [confirmingDeviceId, setConfirmingDeviceId] = useState<string | null>(null)
  const [revokingDeviceId, setRevokingDeviceId] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get<Profile>('/api/profile/me')
      .then((res) => {
        const p = unwrapSingle<Profile>(res)
        if (cancelled || !p) return
        setProfile(p)
        setName(p.name || '')
        setEmail(p.email || '')
        setCompany(p.company || '')
        setTitle(p.title || '')
        setSignatureName(p.signatureName || p.name || '')
        setNotif(p.notificationPreferences || {})
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof Error
            ? err.message
            : t('nav.couldNotLoadProfile', {}, { defaultValue: 'Could not load profile.' }),
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  // Load the user's registered devices for the security section. The endpoint
  // is optional — render an empty list if it is unavailable. Extracted so the
  // revoke flow can refetch after a successful DELETE.
  const loadDevices = useCallback(async () => {
    setDevicesLoading(true)
    try {
      const res = await http.get('/api/devices')
      setDevices(unwrapList<Device>(res))
    } catch (_error) {
      // Devices endpoint is optional; the list simply renders empty.
    } finally {
      setDevicesLoading(false)
    }
  }, [http])

  useEffect(() => {
    void loadDevices()
  }, [loadDevices])

  // Read the persisted 2FA status from /api/users/me on mount (the canonical
  // source). The user record may be nested under `props` depending on the
  // resource serializer, so peel both envelope layers.
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
      .catch((_error: unknown) => {
        // Status read is best-effort; defaults to the value from auth state.
      })
    return () => {
      cancelled = true
    }
  }, [http])

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault()
    setPasswordChanged(false)
    try {
      await changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setPasswordChanged(true)
      resetChangePassword()
    } catch (_error) {
      // The failure is surfaced to the user via `pwError` from the hook; leaving
      // the form populated lets them correct the current password and retry.
    }
  }

  function closeTwoFactor() {
    setTfModal(null)
    setTfSetup(null)
    setTfToken('')
    setTfError('')
  }

  // Enable → request a TOTP secret + QR (`{action:'setup'}`). The QR/secret is
  // shown in a modal; the user then submits a 6-digit code to `{action:'enable'}`.
  async function startEnableTwoFactor() {
    if (!auth.user?.id) return
    setTfError('')
    setTfLoading(true)
    setTfModal('enable')
    try {
      const res = await http.post<TwoFactorSetup>(`/api/users/${auth.user.id}/verify-two-factor`, {
        action: 'setup',
      })
      const data = (res as { data?: TwoFactorSetup }).data ?? res
      setTfSetup(data as TwoFactorSetup)
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
  }

  // Verify the entered code to enable (200) or disable (current code) 2FA.
  async function submitTwoFactor(action: 'enable' | 'disable') {
    if (!auth.user?.id) return
    setTfError('')
    setTfLoading(true)
    try {
      await http.post(`/api/users/${auth.user.id}/verify-two-factor`, { action, token: tfToken })
      setTwoFactorEnabled(action === 'enable')
      closeTwoFactor()
    } catch (err) {
      setTfError(
        err instanceof Error
          ? err.message
          : t('settings.security.twoFactorInvalidCode', {}, { defaultValue: 'Invalid code.' }),
      )
    } finally {
      setTfLoading(false)
    }
  }

  // Revoke (sign out) a device. Deleting the device row triggers server-side
  // session revocation, so the device is actually signed out — then refetch.
  async function revokeDevice(id: string) {
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

  async function togglePush(next: boolean) {
    try {
      if (next) {
        await requestPermission()
        await register()
        setPushEnabled(true)
      } else {
        await unregister()
        setPushEnabled(false)
      }
    } catch (_error) {
      // Browser permission denied or service worker unavailable — the switch
      // stays in its previous visual state, no data loss.
    }
  }

  async function handleDeleteAccount(e: FormEvent) {
    e.preventDefault()
    if (!auth.user?.id) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await http.delete(`/api/users/${auth.user.id}`, { data: { password: deletePassword } })
      // Mirror the sign-out flow: clear the httpOnly `token` cookie server-side
      // (the in-memory bearer alone won't survive a reload) before dropping the
      // in-memory auth state and redirecting to the login page.
      await http
        .post('/api/users/logout', undefined, { withCredentials: true })
        .catch(() => undefined)
      await auth.logout()
      navigate('/login')
    } catch (err) {
      setDeleteError(
        err instanceof Error
          ? err.message
          : t('settings.security.deleteError', {}, { defaultValue: 'Could not delete account.' }),
      )
    } finally {
      setDeleting(false)
    }
  }

  async function saveProfile(e: FormEvent) {
    e.preventDefault()
    if (saving) return
    setError(null)
    setSaved(null)
    setSaving(true)
    try {
      const res = await http.patch<Profile>('/api/profile/me', {
        name,
        email,
        company,
        title,
      })
      const updated = unwrapSingle<Profile>(res)
      if (updated) setProfile(updated)
      setSaved(t('common.savedPeriod', {}, { defaultValue: 'Saved.' }))
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('common.couldNotSaveProfile', {}, { defaultValue: 'Could not save profile.' }),
      )
    } finally {
      setSaving(false)
    }
  }

  async function saveSignature(e: FormEvent) {
    e.preventDefault()
    if (saving) return
    setError(null)
    setSaved(null)
    setSaving(true)
    try {
      const res = await http.patch<Profile>('/api/profile/me', { signatureName })
      const updated = unwrapSingle<Profile>(res)
      if (updated) setProfile(updated)
      setSaved(t('common.savedPeriod', {}, { defaultValue: 'Saved.' }))
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('settings.saveError', {}, { defaultValue: 'Could not save signature.' }),
      )
    } finally {
      setSaving(false)
    }
  }

  async function toggleNotification(key: keyof NotificationPreferences, next: boolean) {
    setError(null)
    setSaved(null)
    setNotif((prev) => ({ ...prev, [key]: next }))
    try {
      const res = await http.patch<Profile>('/api/profile/me', {
        notificationPreferences: { [key]: next },
      })
      const updated = unwrapSingle<Profile>(res)
      if (updated) {
        setProfile(updated)
        setNotif(updated.notificationPreferences ?? {})
      }
      setSaved(t('common.savedPeriod', {}, { defaultValue: 'Saved.' }))
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(
              'settings.saveError',
              {},
              { defaultValue: 'Could not update notification preferences.' },
            ),
      )
      setNotif((prev) => ({ ...prev, [key]: !next }))
    }
  }

  if (loading) {
    return (
      <div className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant')}>
        {t('settings.loading', {}, { defaultValue: 'Loading\u2026' })}
      </div>
    )
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.grid({ cols: 12, gap: 'lg' }))}>
      <aside className={'col-span-12 md:col-span-3'}>
        <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 4))}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
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
        {error ? (
          <p
            role="alert"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              'rounded-lg bg-error/10 text-error font-semibold',
            )}
          >
            {error}
          </p>
        ) : null}
        {saved ? (
          <p
            role="status"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              'rounded-lg bg-success/10 text-success font-semibold',
            )}
          >
            {saved}
          </p>
        ) : null}

        {section === 'profile' && (
          <form onSubmit={saveProfile} className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-4')}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t('settings.profile.heading', {}, { defaultValue: 'Profile' })}
            </h2>
            <Field
              id="settings-name"
              label={t('form.fullName', {}, { defaultValue: 'Full name' })}
              value={name}
              onChange={setName}
            />
            <Field
              id="settings-email"
              label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
              value={email}
              onChange={setEmail}
              type="email"
            />
            <Field
              id="settings-company"
              label={t('form.company', {}, { defaultValue: 'Company' })}
              value={company}
              onChange={setCompany}
            />
            <Field
              id="settings-title"
              label={t('form.title', {}, { defaultValue: 'Title' })}
              value={title}
              onChange={setTitle}
            />
            <button
              type="submit"
              disabled={saving}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                'rounded-md bg-primary text-on-primary disabled:opacity-60',
              )}
            >
              {saving
                ? t('settings.saving', {}, { defaultValue: 'Saving\u2026' })
                : t('common.saveProfile', {}, { defaultValue: 'Save profile' })}
            </button>
          </form>
        )}

        {section === 'signatures' && (
          <form onSubmit={saveSignature} className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-4')}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t('settings.signatures.heading', {}, { defaultValue: 'Signature block' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'settings.signatures.body',
                {},
                {
                  defaultValue:
                    'Your typed name appears on the signature line of every contract you sign. Set it once and it auto-renders going forward.',
                },
              )}
            </p>
            <div
              className={cm.cn(
                'h-32 rounded-md bg-surface-container grid place-items-center',
                'text-on-surface-variant',
              )}
            >
              <p
                className={'font-serif italic text-2xl'}
                aria-label={t(
                  'settings.signatures.preview',
                  {},
                  { defaultValue: 'Signature preview' },
                )}
              >
                {signatureName || (profile?.name ?? '—')}
              </p>
            </div>
            <Field
              id="settings-signature-name"
              label={t('settings.signatures.nameLabel', {}, { defaultValue: 'Typed signature' })}
              value={signatureName}
              onChange={setSignatureName}
            />
            <button
              type="submit"
              disabled={saving}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                'rounded-md bg-primary text-on-primary disabled:opacity-60',
              )}
            >
              {saving
                ? t('settings.saving', {}, { defaultValue: 'Saving\u2026' })
                : t('settings.signatures.save', {}, { defaultValue: 'Save signature' })}
            </button>
          </form>
        )}

        {section === 'security' && (
          <div className={'space-y-4'}>
            <form
              onSubmit={handleChangePassword}
              className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-4')}
            >
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                {t('settings.security.changePassword', {}, { defaultValue: 'Change password' })}
              </h2>
              {pwError ? (
                <p
                  role="alert"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.textSize('sm'),
                    'rounded-lg bg-error/10 text-error font-semibold',
                  )}
                >
                  {pwError.message ||
                    t(
                      'settings.security.changePasswordError',
                      {},
                      { defaultValue: 'Could not change password.' },
                    )}
                </p>
              ) : null}
              {passwordChanged ? (
                <p
                  role="status"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.textSize('sm'),
                    'rounded-lg bg-success/10 text-success font-semibold',
                  )}
                >
                  {t(
                    'settings.security.passwordChanged',
                    {},
                    { defaultValue: 'Password changed.' },
                  )}
                </p>
              ) : null}
              <Field
                id="settings-current-password"
                label={t(
                  'settings.security.currentPassword',
                  {},
                  { defaultValue: 'Current password' },
                )}
                value={currentPassword}
                onChange={setCurrentPassword}
                type="password"
              />
              <Field
                id="settings-new-password"
                label={t('settings.security.newPassword', {}, { defaultValue: 'New password' })}
                value={newPassword}
                onChange={setNewPassword}
                type="password"
              />
              <button
                type="submit"
                disabled={pwStatus === 'pending'}
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  'rounded-md bg-primary text-on-primary disabled:opacity-60',
                )}
              >
                {pwStatus === 'pending'
                  ? t('settings.saving', {}, { defaultValue: 'Saving…' })
                  : t('settings.security.changePassword', {}, { defaultValue: 'Change password' })}
              </button>
            </form>

            <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                {t(
                  'settings.security.twoFactor',
                  {},
                  { defaultValue: 'Two-factor authentication' },
                )}
              </h2>
              <div
                className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('py', 2))}
              >
                <span className={cm.textSize('sm')}>
                  {t(
                    'settings.security.twoFactorLabel',
                    {},
                    { defaultValue: 'Require a verification code when signing in' },
                  )}
                  {twoFactorEnabled ? (
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        'text-on-surface-variant',
                        cm.sp('ml', 2),
                      )}
                    >
                      {t('settings.security.twoFactorOn', {}, { defaultValue: 'On' })}
                    </span>
                  ) : null}
                </span>
                {twoFactorEnabled ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setTfError('')
                      setTfToken('')
                      setTfModal('disable')
                    }}
                    data-mol-id="two-factor-disable"
                  >
                    {t('settings.security.twoFactorDisable', {}, { defaultValue: 'Disable' })}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={startEnableTwoFactor}
                    data-mol-id="two-factor-enable"
                  >
                    {t('settings.security.twoFactorEnable', {}, { defaultValue: 'Enable' })}
                  </Button>
                )}
              </div>
            </section>

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
              {tfModal === 'enable' && !tfSetup && tfLoading ? (
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
                </p>
              ) : null}
              {tfModal === 'enable' && tfSetup?.QRImageUrl ? (
                <div className={cm.cn(cm.sp('mb', 4), 'space-y-3')}>
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
                    className={'mx-auto max-w-xs'}
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
                  className={'space-y-4'}
                >
                  <div>
                    <label
                      htmlFor="settings-tf-token"
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
                    </label>
                    <Input
                      id="settings-tf-token"
                      type="text"
                      value={tfToken}
                      onChange={(e) => setTfToken((e.target as HTMLInputElement).value)}
                      autoComplete="one-time-code"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    color={tfModal === 'disable' ? 'error' : undefined}
                    fullWidth
                    loading={tfLoading}
                  >
                    {tfModal === 'disable'
                      ? t('settings.security.twoFactorDisable', {}, { defaultValue: 'Disable' })
                      : t(
                          'settings.security.twoFactorVerify',
                          {},
                          { defaultValue: 'Verify & enable' },
                        )}
                  </Button>
                </form>
              ) : null}
            </Modal>

            <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                {t('settings.security.devices', {}, { defaultValue: 'Active devices' })}
              </h2>
              {devicesLoading ? (
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
                </p>
              ) : devices.length === 0 ? (
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t('settings.security.noDevices', {}, { defaultValue: 'No devices registered.' })}
                </p>
              ) : (
                <ul className={'space-y-1'}>
                  {devices.map((device) => (
                    <li
                      key={device.id}
                      className={cm.cn(
                        cm.sp('py', 2),
                        'border-b border-outline-variant last:border-b-0',
                      )}
                    >
                      <div className={cm.flex({ align: 'center', justify: 'between' })}>
                        <div>
                          <span className={cm.textSize('sm')}>
                            {device.name ||
                              device.platform ||
                              t(
                                'settings.security.unknownDevice',
                                {},
                                { defaultValue: 'Unknown device' },
                              )}
                            {device.isCurrent ? (
                              <span
                                className={cm.cn(
                                  cm.textSize('xs'),
                                  'text-on-surface-variant',
                                  cm.sp('ml', 2),
                                )}
                              >
                                {t(
                                  'settings.security.thisDevice',
                                  {},
                                  { defaultValue: 'This device' },
                                )}
                              </span>
                            ) : null}
                          </span>
                          {device.platform && device.name ? (
                            <span
                              className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant block')}
                            >
                              {device.platform}
                            </span>
                          ) : null}
                        </div>
                        {device.isCurrent ? null : confirmingDeviceId === device.id ? (
                          <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-2')}>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={revokingDeviceId === device.id}
                              onClick={() => setConfirmingDeviceId(null)}
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
                              {t(
                                'settings.security.signOutDevice',
                                {},
                                { defaultValue: 'Sign out' },
                              )}
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmingDeviceId(device.id)}
                            data-mol-id="device-revoke"
                          >
                            {t('settings.security.signOutDevice', {}, { defaultValue: 'Sign out' })}
                          </Button>
                        )}
                      </div>
                      {confirmingDeviceId === device.id ? (
                        <p
                          className={cm.cn(
                            cm.textSize('xs'),
                            'text-on-surface-variant',
                            cm.sp('mt', 1),
                          )}
                        >
                          {t(
                            'settings.security.revokeDeviceWarning',
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

            <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'text-error')}>
                {t('settings.security.deleteAccount', {}, { defaultValue: 'Delete account' })}
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
              {deleteError ? (
                <p
                  role="alert"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.textSize('sm'),
                    'rounded-lg bg-error/10 text-error font-semibold',
                  )}
                >
                  {deleteError}
                </p>
              ) : null}
              {deleteOpen ? (
                <form onSubmit={handleDeleteAccount} className={'space-y-3'}>
                  <Field
                    id="settings-delete-password"
                    label={t(
                      'settings.security.confirmPassword',
                      {},
                      { defaultValue: 'Enter your password to confirm' },
                    )}
                    value={deletePassword}
                    onChange={setDeletePassword}
                    type="password"
                  />
                  <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-3')}>
                    <button
                      type="submit"
                      disabled={deleting}
                      className={cm.cn(
                        cm.sp('px', 5),
                        cm.sp('py', 2),
                        cm.fontWeight('semibold'),
                        'rounded-md bg-error text-on-error disabled:opacity-60',
                      )}
                    >
                      {deleting
                        ? t('settings.security.deleting', {}, { defaultValue: 'Deleting…' })
                        : t(
                            'settings.security.confirmDelete',
                            {},
                            { defaultValue: 'Permanently delete' },
                          )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteOpen(false)
                        setDeletePassword('')
                        setDeleteError(null)
                      }}
                      className={cm.cn(
                        cm.sp('px', 5),
                        cm.sp('py', 2),
                        cm.fontWeight('semibold'),
                        'rounded-md text-on-surface-variant hover:bg-surface-container',
                      )}
                    >
                      {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setDeleteOpen(true)}
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 2),
                    cm.fontWeight('semibold'),
                    'rounded-md border border-error text-error hover:bg-error/10',
                  )}
                >
                  {t('settings.security.deleteAccount', {}, { defaultValue: 'Delete account' })}
                </button>
              )}
            </section>
          </div>
        )}

        {section === 'notifications' && (
          <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t('nav.notificationPreferences', {}, { defaultValue: 'Notification preferences' })}
            </h2>
            <label
              htmlFor="settings-push-notifications"
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between' }),
                cm.sp('py', 2),
                'cursor-pointer border-b border-outline-variant',
              )}
            >
              <span className={cm.textSize('sm')}>
                {t(
                  'settings.notifications.push',
                  {},
                  { defaultValue: 'Push notifications on this device' },
                )}
              </span>
              <input
                id="settings-push-notifications"
                type="checkbox"
                className={'h-4 w-4'}
                checked={pushEnabled}
                onChange={(e) => togglePush(e.target.checked)}
              />
            </label>
            {NOTIFICATION_KEYS.map((n) => {
              const checked = notif[n.key] ?? true
              return (
                <label
                  key={n.key}
                  htmlFor={`settings-notif-${n.key}`}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('py', 2),
                    'cursor-pointer border-b border-outline-variant last:border-b-0',
                  )}
                >
                  <span className={cm.textSize('sm')}>
                    {t(`settings.notifications.${n.key}`, {}, { defaultValue: n.defaultLabel })}
                  </span>
                  <input
                    id={`settings-notif-${n.key}`}
                    type="checkbox"
                    className={'h-4 w-4'}
                    checked={checked}
                    onChange={(e) => toggleNotification(n.key, e.target.checked)}
                  />
                </label>
              )
            })}
          </section>
        )}

        {section === 'plan' && (
          <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t('settings.plan.heading', {}, { defaultValue: 'Plan' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'settings.plan.current',
                { plan: (profile?.planKey ?? 'starter').toUpperCase() },
                { defaultValue: 'Current plan: {{plan}}' },
              )}
            </p>
            <Link
              to="/pricing"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                'inline-block rounded-md bg-primary text-on-primary',
              )}
            >
              {t('settings.plan.compare', {}, { defaultValue: 'Compare plans' })}
            </Link>
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
      </main>
    </div>
  )
}

function Field({
  id,
  label,
  value,
  onChange,
  type = 'text',
}: {
  id?: string
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
}) {
  const cm = getClassMap()
  return (
    <label className="block" htmlFor={id}>
      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}>
        {label}
      </span>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cm.cn(
          cm.sp('px', 3),
          cm.sp('py', 2),
          'w-full border border-outline-variant rounded-md',
        )}
      />
    </label>
  )
}
