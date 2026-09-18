import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useAuth, useChangePassword, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

const SETTINGS_SECTIONS = [
  { to: '/settings', key: 'general', defaultLabel: 'General', icon: 'tune' },
  { to: '/settings/profile', key: 'profile', defaultLabel: 'Profile', icon: 'person' },
  { to: '/settings/billing', key: 'billing', defaultLabel: 'Billing', icon: 'credit_card' },
]

interface ProfileResponse {
  id: string
  name: string
  email: string
  preferences?: {
    currency?: string
  }
}

interface DeviceRow {
  id: string
  name?: string
  updatedAt?: string
  /** `true` for the device making the current request (the API marks it). */
  isCurrent?: boolean
}

interface TwoFactorSetup {
  QRImageUrl?: string
  secret?: string
}

function initials(name: string): string {
  if (!name.trim()) return '?'
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2)
}

export function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const auth = useAuth<{ id?: string }>()
  const navigate = useNavigate()
  const { status: pwStatus, error: pwError, changePassword, reset: resetPw } = useChangePassword()
  const [profile, setProfile] = useState<ProfileResponse | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [feedbackKind, setFeedbackKind] = useState<'success' | 'error'>('success')
  // C4 — in-app change password (POST /api/users/me/password via the auth client).
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  // C7 — device management (GET /api/devices) + per-device revoke (DELETE /api/devices/:id).
  const [devices, setDevices] = useState<DeviceRow[]>([])
  const [devicesLoading, setDevicesLoading] = useState(true)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  // C10 — delete account (DELETE /api/users/:id).
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleting, setDeleting] = useState(false)
  // Parity — real TOTP two-factor (POST /api/users/:id/verify-two-factor).
  const userId = auth.user?.id
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [tfModal, setTfModal] = useState<null | 'enable' | 'disable'>(null)
  const [tfSetup, setTfSetup] = useState<TwoFactorSetup | null>(null)
  const [tfToken, setTfToken] = useState('')
  const [tfLoading, setTfLoading] = useState(false)
  const [tfError, setTfError] = useState('')

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/profile/me')
      .then((res) => {
        if (cancelled) return
        const p = unwrapSingle<ProfileResponse>(res)
        if (p) {
          setProfile(p)
          setName(p.name ?? '')
          setEmail(p.email ?? '')
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [http])

  const loadDevices = useCallback(async () => {
    try {
      const res = await http.get('/api/devices')
      setDevices(unwrapList<DeviceRow>(res))
    } catch (_error) {
      // Devices endpoint is optional; the list renders empty when unavailable.
    } finally {
      setDevicesLoading(false)
    }
  }, [http])

  useEffect(() => {
    void loadDevices()
  }, [loadDevices])

  // Read the persisted two-factor status from GET /api/users/me on mount.
  useEffect(() => {
    let cancelled = false
    http
      .get('/api/users/me')
      .then((res) => {
        if (cancelled) return
        const u = unwrapSingle<{ twoFactorEnabled?: boolean }>(res)
        setTwoFactorEnabled(Boolean(u?.twoFactorEnabled))
      })
      .catch(() => {
        // Status read is best-effort; it defaults to disabled when unavailable.
      })
    return () => {
      cancelled = true
    }
  }, [http])

  function showFeedback(kind: 'success' | 'error', msg: string) {
    setFeedback(msg)
    setFeedbackKind(kind)
    setTimeout(() => setFeedback(null), 3500)
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    try {
      await changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      resetPw()
      showFeedback(
        'success',
        t('profile.passwordChanged', {}, { defaultValue: 'Password changed.' }),
      )
    } catch (_error) {
      // useChangePassword tracks the failure in `pwError` (shown inline); the toast
      // is a redundant, non-error-swallowing confirmation that nothing was saved.
      showFeedback(
        'error',
        t('profile.passwordChangeError', {}, { defaultValue: 'Could not change password.' }),
      )
    }
  }

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault()
    setDeleting(true)
    try {
      await http.delete(`/api/users/${auth.user?.id}`, { data: { password: deletePassword } })
      await auth.logout()
      navigate('/login')
    } catch (_error) {
      // Surface to the user via the inline feedback banner; re-enable the form.
      showFeedback(
        'error',
        t('profile.deleteError', {}, { defaultValue: 'Could not delete account.' }),
      )
      setDeleting(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await http.patch('/api/profile/me', { name, email })
      const p = unwrapSingle<ProfileResponse>(res)
      if (p) setProfile(p)
      showFeedback('success', t('profile.saved', {}, { defaultValue: 'Profile updated.' }))
    } catch (_error) {
      // error surfaced to user via showFeedback below — no additional logging needed
      showFeedback(
        'error',
        t('common.couldNotSaveProfile', {}, { defaultValue: 'Could not save profile.' }),
      )
    } finally {
      setSaving(false)
    }
  }

  async function revokeDevice(id: string) {
    setRevokingId(id)
    try {
      // The API's authorization layer revokes the device's server-side session
      // when its row is deleted, so this actually signs the device out.
      await http.delete(`/api/devices/${id}`)
      setConfirmingId(null)
      await loadDevices()
    } catch (_error) {
      // Best-effort — keep the row so the user can retry; surface the failure.
      showFeedback(
        'error',
        t('settings.revokeDeviceError', {}, { defaultValue: 'Could not sign out device.' }),
      )
    } finally {
      setRevokingId(null)
    }
  }

  const closeTwoFactor = useCallback(() => {
    setTfModal(null)
    setTfSetup(null)
    setTfToken('')
    setTfError('')
  }, [])

  useEffect(() => {
    if (tfModal === null) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeTwoFactor()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [tfModal, closeTwoFactor])

  async function startEnableTwoFactor() {
    setTfError('')
    setTfToken('')
    setTfSetup(null)
    setTfLoading(true)
    setTfModal('enable')
    try {
      const res = await http.post(`/api/users/${userId}/verify-two-factor`, { action: 'setup' })
      setTfSetup(unwrapSingle<TwoFactorSetup>(res))
    } catch (error) {
      // Graceful no-provider handling — show the reason inline in the modal.
      setTfError(
        error instanceof Error
          ? error.message
          : t(
              'settings.twoFactorUnavailable',
              {},
              { defaultValue: 'Two-factor authentication is not available for this app.' },
            ),
      )
    } finally {
      setTfLoading(false)
    }
  }

  async function submitTwoFactor(action: 'enable' | 'disable') {
    setTfError('')
    setTfLoading(true)
    try {
      await http.post(`/api/users/${userId}/verify-two-factor`, { action, token: tfToken })
      setTwoFactorEnabled(action === 'enable')
      closeTwoFactor()
    } catch (error) {
      // 403 = invalid code — surface it inline so the user can retry.
      setTfError(
        error instanceof Error
          ? error.message
          : t('settings.twoFactorInvalidCode', {}, { defaultValue: 'Invalid code' }),
      )
    } finally {
      setTfLoading(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-8 max-w-5xl mx-auto')}>
      <header>
        <p
          className={cm.cn(
            cm.fontWeight('extrabold'),
            'text-[11px] uppercase tracking-widest text-primary',
          )}
        >
          {t('settings.account', {}, { defaultValue: 'Account' })}
        </p>
        <h1
          className={cm.cn(cm.fontWeight('extrabold'), 'text-3xl md:text-4xl tracking-tight mt-1')}
        >
          {t('nav.profile', {}, { defaultValue: 'Profile' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'profile.subheading',
            { app: APP_NAME },
            { defaultValue: 'How {{app}} knows you, contacts you, and shares this household.' },
          )}
        </p>
      </header>

      <div className={cm.grid({ cols: 12, gap: 'md' })}>
        <SettingsSubNav className={cm.cn('col-span-12 md:col-span-3')} current="profile" />

        <div className={cm.cn('col-span-12 md:col-span-9 space-y-6')}>
          {feedback ? (
            <div
              role={feedbackKind === 'error' ? 'alert' : 'status'}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('sm'),
                'rounded-xl',
                feedbackKind === 'success'
                  ? 'bg-success/10 text-success border border-success/20'
                  : 'bg-error/10 text-error border border-error/20',
              )}
            >
              {feedback}
            </div>
          ) : null}

          {/* Avatar + identity card */}
          <form
            onSubmit={handleSave}
            className={cm.cn(
              cm.sp('p', 6),
              'bg-surface-container-lowest rounded-2xl shadow-sm space-y-6',
            )}
          >
            <header>
              <p
                className={cm.cn(
                  cm.fontWeight('extrabold'),
                  'text-[10px] uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('nav.identity', {}, { defaultValue: 'Identity' })}
              </p>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mt', 1))}>
                {t('profile.identityHeading', {}, { defaultValue: 'Personal information' })}
              </h2>
            </header>
            <div className={cm.flex({ align: 'center', gap: 'md' })}>
              <span
                className={cm.cn(
                  cm.w(20),
                  cm.h(20),
                  cm.roundedFull,
                  cm.flex({ align: 'center', justify: 'center' }),
                  'bg-gradient-to-br from-primary to-primary-container text-white text-3xl font-extrabold tracking-tight',
                )}
                aria-hidden="true"
              >
                {initials(profile?.name ?? name)}
              </span>
              <div>
                <p
                  className={cm.cn(cm.textSize('xl'), cm.fontWeight('extrabold'))}
                  data-testid="profile-display-name"
                >
                  {profile?.name || t('profile.unnamed', {}, { defaultValue: '(no name)' })}
                </p>
                <p
                  className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
                  data-testid="profile-display-email"
                >
                  {profile?.email || ''}
                </p>
              </div>
            </div>
            <div className={cm.cn(cm.grid({ cols: 2, gap: 'md' }))}>
              <ProfileEditField
                label={t('form.fullName', {}, { defaultValue: 'Full name' })}
                value={name}
                onChange={setName}
                id="profile-name"
              />
              <ProfileEditField
                label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
                value={email}
                onChange={setEmail}
                type="email"
                id="profile-email"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'inline-flex rounded-full bg-primary text-white hover:bg-primary/90 disabled:opacity-60 transition-colors',
              )}
            >
              {saving
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
            </button>
          </form>

          {/* Change password */}
          <section
            className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl shadow-sm')}
          >
            <header className={cm.sp('mb', 6)}>
              <p
                className={cm.cn(
                  cm.fontWeight('extrabold'),
                  'text-[10px] uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('nav.security', {}, { defaultValue: 'Security' })}
              </p>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mt', 1))}>
                {t('settings.changePassword', {}, { defaultValue: 'Change password' })}
              </h2>
            </header>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'profile.passwordBody',
                { appName: APP_NAME },
                {
                  defaultValue:
                    'Use a passphrase you have not used elsewhere. {{appName}} never stores your password in plain text.',
                },
              )}
            </p>
            <form onSubmit={handleChangePassword} className={cm.cn(cm.sp('mt', 4), 'space-y-4')}>
              {pwError ? (
                <div
                  role="alert"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.textSize('sm'),
                    'rounded-xl bg-error/10 text-error border border-error/20',
                  )}
                >
                  {pwError.message ||
                    t(
                      'settings.changePasswordModal.error',
                      {},
                      { defaultValue: 'Could not change password.' },
                    )}
                </div>
              ) : null}
              <div className={cm.cn(cm.grid({ cols: 2, gap: 'md' }))}>
                <ProfileEditField
                  label={t(
                    'settings.changePasswordModal.currentPassword',
                    {},
                    { defaultValue: 'Current password' },
                  )}
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  type="password"
                  id="current-password"
                />
                <ProfileEditField
                  label={t(
                    'settings.changePasswordModal.newPassword',
                    {},
                    { defaultValue: 'New password' },
                  )}
                  value={newPassword}
                  onChange={setNewPassword}
                  type="password"
                  id="new-password"
                />
              </div>
              <button
                type="submit"
                disabled={pwStatus === 'pending' || !currentPassword || !newPassword}
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  'inline-flex rounded-full bg-primary text-white hover:bg-primary/90 disabled:opacity-60 transition-colors',
                )}
              >
                {pwStatus === 'pending'
                  ? t('settings.changePasswordModal.changing', {}, { defaultValue: 'Changing…' })
                  : t('settings.changePassword', {}, { defaultValue: 'Change password' })}
              </button>
            </form>
            <div
              className={cm.cn(cm.sp('mt', 6), cm.sp('pt', 6), 'border-t border-outline-variant')}
            >
              <div className={cm.flex({ align: 'center', justify: 'between', gap: 'md' })}>
                <div>
                  <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
                    {t('settings.twoFactor', {}, { defaultValue: 'Two-factor authentication' })}
                    {twoFactorEnabled ? (
                      <span
                        className={cm.cn(
                          cm.sp('ml', 2),
                          cm.textSize('xs'),
                          cm.fontWeight('semibold'),
                          'text-success',
                        )}
                      >
                        {t('settings.twoFactorOn', {}, { defaultValue: 'On' })}
                      </span>
                    ) : null}
                  </p>
                  <p
                    className={cm.cn(cm.sp('mt', 1), cm.textSize('sm'), 'text-on-surface-variant')}
                  >
                    {t(
                      'profile.twoFactorBody',
                      {},
                      {
                        defaultValue:
                          'Require a one-time code from your authenticator app each time you sign in.',
                      },
                    )}
                  </p>
                </div>
                {twoFactorEnabled ? (
                  <button
                    type="button"
                    onClick={() => {
                      setTfError('')
                      setTfToken('')
                      setTfSetup(null)
                      setTfModal('disable')
                    }}
                    data-mol-id="two-factor-disable"
                    className={cm.cn(
                      cm.sp('px', 5),
                      cm.sp('py', 2),
                      cm.fontWeight('semibold'),
                      cm.textSize('sm'),
                      'inline-flex shrink-0 rounded-full border border-outline hover:bg-surface-container transition-colors',
                    )}
                  >
                    {t('settings.twoFactorDisable', {}, { defaultValue: 'Disable' })}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startEnableTwoFactor}
                    data-mol-id="two-factor-enable"
                    className={cm.cn(
                      cm.sp('px', 5),
                      cm.sp('py', 2),
                      cm.fontWeight('bold'),
                      cm.textSize('sm'),
                      'inline-flex shrink-0 rounded-full bg-primary text-white hover:bg-primary/90 transition-colors',
                    )}
                  >
                    {t('settings.twoFactorEnable', {}, { defaultValue: 'Enable' })}
                  </button>
                )}
              </div>
            </div>
            <div
              className={cm.cn(
                cm.sp('mt', 6),
                cm.sp('pt', 6),
                'border-t border-outline-variant space-y-3',
              )}
            >
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'profile.resetBody',
                  {},
                  {
                    defaultValue:
                      'Forgot your current password? We can email you a reset link instead.',
                  },
                )}
              </p>
              <Link
                to="/forgot-password"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  'inline-flex rounded-full border border-outline hover:bg-surface-container transition-colors',
                )}
              >
                {t('profile.changePasswordCta', {}, { defaultValue: 'Send password reset email' })}
              </Link>
            </div>
          </section>

          {/* Devices */}
          <section
            className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl shadow-sm')}
          >
            <header className={cm.sp('mb', 4)}>
              <p
                className={cm.cn(
                  cm.fontWeight('extrabold'),
                  'text-[10px] uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('nav.devices', {}, { defaultValue: 'Devices' })}
              </p>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mt', 1))}>
                {t('settings.devices', {}, { defaultValue: 'Your devices' })}
              </h2>
            </header>
            {devicesLoading ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
              </p>
            ) : devices.length === 0 ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t('settings.noDevices', {}, { defaultValue: 'No devices found.' })}
              </p>
            ) : (
              <ul className={cm.stack(1)}>
                {devices.map((d) => (
                  <li
                    key={d.id}
                    className={cm.cn(
                      cm.sp('py', 2),
                      'border-b border-outline-variant last:border-0',
                    )}
                  >
                    <div className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
                      <div>
                        <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                          {d.name ||
                            t('settings.unnamedDevice', {}, { defaultValue: 'Unnamed device' })}
                          {d.isCurrent ? (
                            <span
                              className={cm.cn(
                                cm.sp('ml', 2),
                                cm.textSize('xs'),
                                cm.fontWeight('semibold'),
                                'text-primary',
                              )}
                            >
                              {t('settings.thisDevice', {}, { defaultValue: 'This device' })}
                            </span>
                          ) : null}
                        </span>
                        {d.updatedAt ? (
                          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                            {new Date(d.updatedAt).toLocaleDateString()}
                          </p>
                        ) : null}
                      </div>
                      {d.isCurrent ? null : confirmingId === d.id ? (
                        <span className={cm.flex({ align: 'center', gap: 'sm' })}>
                          <button
                            type="button"
                            disabled={revokingId === d.id}
                            onClick={() => setConfirmingId(null)}
                            className={cm.cn(
                              cm.sp('px', 3),
                              cm.sp('py', 1),
                              cm.fontWeight('medium'),
                              cm.textSize('xs'),
                              'inline-flex rounded-full border border-outline hover:bg-surface-container disabled:opacity-60 transition-colors',
                            )}
                          >
                            {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                          </button>
                          <button
                            type="button"
                            disabled={revokingId === d.id}
                            onClick={() => revokeDevice(d.id)}
                            data-mol-id="device-revoke-confirm"
                            className={cm.cn(
                              cm.sp('px', 3),
                              cm.sp('py', 1),
                              cm.fontWeight('bold'),
                              cm.textSize('xs'),
                              'inline-flex rounded-full bg-error text-white hover:bg-error/90 disabled:opacity-60 transition-colors',
                            )}
                          >
                            {revokingId === d.id
                              ? t('settings.signingOutDevice', {}, { defaultValue: 'Signing out…' })
                              : t('settings.signOutDevice', {}, { defaultValue: 'Sign out' })}
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmingId(d.id)}
                          data-mol-id="device-revoke"
                          className={cm.cn(
                            cm.sp('px', 3),
                            cm.sp('py', 1),
                            cm.fontWeight('semibold'),
                            cm.textSize('xs'),
                            'inline-flex rounded-full border border-outline hover:bg-surface-container transition-colors',
                          )}
                        >
                          {t('settings.signOutDevice', {}, { defaultValue: 'Sign out' })}
                        </button>
                      )}
                    </div>
                    {confirmingId === d.id ? (
                      <p
                        className={cm.cn(
                          cm.sp('mt', 1),
                          cm.textSize('xs'),
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
                ))}
              </ul>
            )}
          </section>

          {/* Danger zone — delete account */}
          <section
            className={cm.cn(
              cm.sp('p', 6),
              'bg-surface-container-lowest rounded-2xl shadow-sm border border-error/30',
            )}
          >
            <header className={cm.sp('mb', 4)}>
              <p
                className={cm.cn(
                  cm.fontWeight('extrabold'),
                  'text-[10px] uppercase tracking-widest text-error',
                )}
              >
                {t('settings.dangerZone', {}, { defaultValue: 'Danger zone' })}
              </p>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mt', 1))}>
                {t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
              </h2>
            </header>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'settings.deleteAccountModal.warning',
                {},
                {
                  defaultValue:
                    'This permanently deletes your account and all your data. This cannot be undone.',
                },
              )}
            </p>
            {showDeleteConfirm ? (
              <form onSubmit={handleDelete} className={cm.cn(cm.sp('mt', 4), 'space-y-4')}>
                <ProfileEditField
                  label={t(
                    'settings.deleteAccountModal.password',
                    {},
                    { defaultValue: 'Confirm your password' },
                  )}
                  value={deletePassword}
                  onChange={setDeletePassword}
                  type="password"
                  id="delete-password"
                />
                <div className={cm.flex({ gap: 'sm' })}>
                  <button
                    type="submit"
                    disabled={deleting || !deletePassword}
                    className={cm.cn(
                      cm.sp('px', 5),
                      cm.sp('py', 2),
                      cm.fontWeight('bold'),
                      cm.textSize('sm'),
                      'inline-flex rounded-full bg-error text-white hover:bg-error/90 disabled:opacity-60 transition-colors',
                    )}
                    data-mol-id="user-menu-delete-account"
                  >
                    {deleting
                      ? t('settings.deleteAccountModal.deleting', {}, { defaultValue: 'Deleting…' })
                      : t('settings.confirmDelete', {}, { defaultValue: 'Permanently delete' })}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteConfirm(false)
                      setDeletePassword('')
                    }}
                    className={cm.cn(
                      cm.sp('px', 5),
                      cm.sp('py', 2),
                      cm.fontWeight('medium'),
                      cm.textSize('sm'),
                      'inline-flex rounded-full border border-outline hover:bg-surface-container transition-colors',
                    )}
                  >
                    {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className={cm.cn(
                  cm.sp('mt', 4),
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  'inline-flex rounded-full border border-error text-error hover:bg-error/10 transition-colors',
                )}
              >
                {t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
              </button>
            )}
          </section>
        </div>
      </div>

      {tfModal !== null ? (
        <div
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeTwoFactor()
          }}
          className={cm.cn(
            'fixed inset-0 z-50',
            cm.flex({ align: 'center', justify: 'center' }),
            cm.sp('p', 4),
            'bg-black/50',
          )}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-2fa-title"
            className={cm.cn(
              cm.sp('p', 6),
              'bg-surface-container-lowest rounded-2xl shadow-xl w-full max-w-md space-y-4',
            )}
          >
            <h2 id="profile-2fa-title" className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
              {tfModal === 'disable'
                ? t(
                    'settings.twoFactorDisableTitle',
                    {},
                    { defaultValue: 'Disable two-factor authentication' },
                  )
                : t(
                    'settings.twoFactorEnableTitle',
                    {},
                    { defaultValue: 'Enable two-factor authentication' },
                  )}
            </h2>
            {tfError ? (
              <div
                role="alert"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  'rounded-xl bg-error/10 text-error border border-error/20',
                )}
              >
                {tfError}
              </div>
            ) : null}
            {tfModal === 'enable' && tfLoading && !tfSetup ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
              </p>
            ) : null}
            {tfModal === 'enable' && tfSetup?.QRImageUrl ? (
              <div className={cm.stack(3)}>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(
                    'settings.twoFactorScan',
                    {},
                    {
                      defaultValue:
                        'Scan this QR code with your authenticator app, then enter the 6-digit code.',
                    },
                  )}
                </p>
                <img
                  src={tfSetup.QRImageUrl}
                  alt={t('settings.twoFactorQrAlt', {}, { defaultValue: 'Two-factor QR code' })}
                  className="mx-auto max-w-[12rem]"
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
                className="space-y-4"
              >
                <ProfileEditField
                  label={t('settings.twoFactorCode', {}, { defaultValue: 'Authentication code' })}
                  value={tfToken}
                  onChange={setTfToken}
                  id="tf-token"
                />
                <div className={cm.flex({ gap: 'sm' })}>
                  <button
                    type="submit"
                    disabled={tfLoading || !tfToken}
                    data-mol-id="two-factor-submit"
                    className={cm.cn(
                      cm.sp('px', 5),
                      cm.sp('py', 2),
                      cm.fontWeight('bold'),
                      cm.textSize('sm'),
                      'inline-flex rounded-full text-white disabled:opacity-60 transition-colors',
                      tfModal === 'disable'
                        ? 'bg-error hover:bg-error/90'
                        : 'bg-primary hover:bg-primary/90',
                    )}
                  >
                    {tfLoading
                      ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                      : tfModal === 'disable'
                        ? t('settings.twoFactorDisable', {}, { defaultValue: 'Disable' })
                        : t('settings.twoFactorVerify', {}, { defaultValue: 'Verify & enable' })}
                  </button>
                  <button
                    type="button"
                    onClick={closeTwoFactor}
                    className={cm.cn(
                      cm.sp('px', 5),
                      cm.sp('py', 2),
                      cm.fontWeight('medium'),
                      cm.textSize('sm'),
                      'inline-flex rounded-full border border-outline hover:bg-surface-container transition-colors',
                    )}
                  >
                    {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                  </button>
                </div>
              </form>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function ProfileEditField({
  label,
  value,
  onChange,
  type = 'text',
  id,
}: {
  label: string
  value: string
  onChange: (next: string) => void
  type?: string
  id: string
}) {
  const cm = getClassMap()
  return (
    <label className="block" htmlFor={id}>
      <span
        className={cm.cn(
          cm.fontWeight('extrabold'),
          'text-[10px] uppercase tracking-widest text-on-surface-variant',
        )}
      >
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
          cm.sp('mt', 1),
          cm.textSize('sm'),
          cm.fontWeight('semibold'),
          'w-full border border-outline-variant rounded-md',
        )}
      />
    </label>
  )
}

function SettingsSubNav({ current, className }: { current: string; className?: string }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <nav
      className={cm.cn(
        className,
        cm.sp('p', 2),
        'bg-surface-container-lowest rounded-2xl shadow-sm self-start sticky top-6',
      )}
    >
      <ul className={cm.stack(1)}>
        {SETTINGS_SECTIONS.map((s) => {
          const active = s.key === current
          return (
            <li key={s.key}>
              <Link
                to={s.to}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  'rounded-xl transition-colors',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-on-surface hover:bg-surface-container-low',
                )}
              >
                <span className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}>
                  {s.icon}
                </span>
                {t(`settingsSubNav.${s.key}`, {}, { defaultValue: s.defaultLabel })}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
