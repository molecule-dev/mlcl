import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { NotificationsSection } from '@molecule/app-settings-panel-react'
import { getClassMap } from '@molecule/app-ui'

interface UserProfile {
  id: string
  name?: string | null
  email?: string | null
  role?: string | null
  timezone?: string | null
  twoFactorEnabled?: boolean | null
}

interface DeviceRow {
  id: string
  name?: string | null
  platform?: string | null
  lastSeen?: string | null
  isCurrent?: boolean | null
}

export function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const userId =
    (user as { props?: { id?: string }; id?: string } | null)?.props?.id ??
    (user as { id?: string } | null)?.id ??
    null

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [draft, setDraft] = useState({ name: '', email: '', timezone: '' })
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [pwOpen, setPwOpen] = useState(false)
  const [pwDraft, setPwDraft] = useState({ current: '', next: '', confirm: '' })
  const [pwSubmitting, setPwSubmitting] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSuccess, setPwSuccess] = useState(false)

  const [twoFAMode, setTwoFAMode] = useState<null | 'enable' | 'disable'>(null)
  const [twoFASetup, setTwoFASetup] = useState<{ QRImageUrl?: string; secret?: string } | null>(
    null,
  )
  const [twoFACode, setTwoFACode] = useState('')
  const [twoFASubmitting, setTwoFASubmitting] = useState(false)
  const [twoFAError, setTwoFAError] = useState<string | null>(null)

  const [devices, setDevices] = useState<DeviceRow[]>([])
  const [devicesLoading, setDevicesLoading] = useState(true)
  const [confirmingDeviceId, setConfirmingDeviceId] = useState<string | null>(null)
  const [revokingDeviceId, setRevokingDeviceId] = useState<string | null>(null)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!userId) return
    http
      .get<{ props?: UserProfile } | UserProfile>(`/api/users/${userId}`)
      .then((res) => {
        if (cancelled) return
        const data = (res?.data ?? {}) as { props?: UserProfile } | UserProfile
        const next = ('props' in data ? data.props : data) as UserProfile | undefined
        if (next) {
          setProfile(next)
          setDraft({
            name: next.name ?? '',
            email: next.email ?? '',
            timezone: next.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
          })
        }
      })
      .catch(() => null)
    return () => {
      cancelled = true
    }
  }, [http, userId])

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    setSaving(true)
    setSavedAt(null)
    setSaveError(null)
    try {
      const trimmedEmail = draft.email.trim()
      const body: { name: string; email?: string; timezone: string | null } = {
        name: draft.name.trim(),
        timezone: draft.timezone || null,
      }
      // Only send a non-empty email — the user resource rejects a blank email,
      // mirroring the shared AccountSection's empty-email guard.
      if (trimmedEmail) body.email = trimmedEmail
      await http.patch(`/api/users/${userId}`, body)
      setSavedAt(new Date().toISOString())
      setProfile((p) =>
        p
          ? {
              ...p,
              name: draft.name.trim(),
              ...(trimmedEmail ? { email: trimmedEmail } : {}),
              timezone: draft.timezone || null,
            }
          : p,
      )
    } catch (err) {
      setSaveError(
        (err as Error)?.message ??
          t('common.couldNotSaveProfile', {}, { defaultValue: 'Could not save profile.' }),
      )
    } finally {
      setSaving(false)
    }
  }

  async function submitChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwError(null)
    setPwSuccess(false)
    if (pwDraft.next.length < 8) {
      setPwError(
        t(
          'profile.security.pwTooShort',
          {},
          { defaultValue: 'New password must be at least 8 characters.' },
        ),
      )
      return
    }
    if (pwDraft.next !== pwDraft.confirm) {
      setPwError(
        t(
          'profile.security.pwMismatch',
          {},
          { defaultValue: 'New password and confirmation must match.' },
        ),
      )
      return
    }
    if (!userId) return
    setPwSubmitting(true)
    try {
      await http.patch(`/api/users/${userId}/password`, {
        currentPassword: pwDraft.current,
        newPassword: pwDraft.next,
      })
      setPwSuccess(true)
      setPwDraft({ current: '', next: '', confirm: '' })
    } catch (err) {
      setPwError(
        (err as Error)?.message ??
          t('profile.security.pwFailed', {}, { defaultValue: 'Could not change password.' }),
      )
    } finally {
      setPwSubmitting(false)
    }
  }

  function closeTwoFA() {
    setTwoFAMode(null)
    setTwoFASetup(null)
    setTwoFACode('')
    setTwoFAError(null)
  }

  // Enable → request a TOTP secret + QR (`{action:'setup'}`), then the user
  // scans it and confirms with a 6-digit code (`{action:'enable', token}`).
  async function startEnable2FA() {
    if (!userId) return
    setTwoFAError(null)
    setTwoFACode('')
    setTwoFASetup(null)
    setTwoFAMode('enable')
    setTwoFASubmitting(true)
    try {
      const res = await http.post<{ QRImageUrl?: string; secret?: string }>(
        `/api/users/${userId}/verify-two-factor`,
        { action: 'setup' },
      )
      const data = (res?.data ?? res) as { QRImageUrl?: string; secret?: string }
      setTwoFASetup(data ?? null)
    } catch (err) {
      setTwoFAError(
        (err as Error)?.message ??
          t(
            'profile.security.twoFaUnavailable',
            {},
            { defaultValue: 'Two-factor authentication is not available for this app.' },
          ),
      )
    } finally {
      setTwoFASubmitting(false)
    }
  }

  function startDisable2FA() {
    setTwoFAError(null)
    setTwoFACode('')
    setTwoFASetup(null)
    setTwoFAMode('disable')
  }

  async function submitTwoFA(e: React.FormEvent) {
    e.preventDefault()
    setTwoFAError(null)
    if (!userId) return
    const action = twoFAMode === 'disable' ? 'disable' : 'enable'
    setTwoFASubmitting(true)
    try {
      await http.post(`/api/users/${userId}/verify-two-factor`, { action, token: twoFACode })
      setProfile((p) => (p ? { ...p, twoFactorEnabled: action === 'enable' } : p))
      closeTwoFA()
    } catch (err) {
      setTwoFAError(
        (err as Error)?.message ??
          t('profile.security.twoFaFailed', {}, { defaultValue: 'Could not verify code.' }),
      )
    } finally {
      setTwoFASubmitting(false)
    }
  }

  const loadDevices = useCallback(() => {
    setDevicesLoading(true)
    return http
      .get<{ data?: DeviceRow[] } | DeviceRow[]>('/api/devices')
      .then((res) => {
        const body = (res?.data ?? []) as { data?: DeviceRow[] } | DeviceRow[]
        const list = Array.isArray(body) ? body : (body.data ?? [])
        setDevices(list)
      })
      .catch(() => null)
      .finally(() => setDevicesLoading(false))
  }, [http])

  useEffect(() => {
    void loadDevices()
  }, [loadDevices])

  // Revoke (sign out) a device: deleting the device row makes the API reject
  // that device's session, so it is actually signed out — then refetch.
  async function revokeDevice(id: string) {
    setRevokingDeviceId(id)
    try {
      await http.delete(`/api/devices/${id}`)
      setConfirmingDeviceId(null)
      await loadDevices()
    } catch (_err) {
      // Best-effort — keep the row so the user can retry the revoke.
    } finally {
      setRevokingDeviceId(null)
    }
  }

  function renderDeviceControl(device: DeviceRow) {
    // The current session is signed out via Sign out, not revoked here.
    if (device.isCurrent) return null
    if (confirmingDeviceId === device.id) {
      return (
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <button
            type="button"
            data-mol-id="button-device-revoke-cancel"
            disabled={revokingDeviceId === device.id}
            onClick={() => setConfirmingDeviceId(null)}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.textSize('xs'),
              'rounded-md border border-outline-variant disabled:opacity-50',
            )}
          >
            {t('common.cancel', {}, { defaultValue: 'Cancel' })}
          </button>
          <button
            type="button"
            data-mol-id="device-revoke-confirm"
            disabled={revokingDeviceId === device.id}
            onClick={() => revokeDevice(device.id)}
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'rounded-md bg-error text-on-error disabled:opacity-50',
            )}
          >
            {revokingDeviceId === device.id
              ? t('profile.devices.signingOut', {}, { defaultValue: 'Signing out…' })
              : t('settings.signOutDevice', {}, { defaultValue: 'Sign out' })}
          </button>
        </div>
      )
    }
    return (
      <button
        type="button"
        data-mol-id="device-revoke"
        onClick={() => setConfirmingDeviceId(device.id)}
        className={cm.cn(
          cm.sp('px', 3),
          cm.sp('py', 1),
          cm.textSize('xs'),
          cm.fontWeight('medium'),
          'rounded-md border border-outline-variant',
        )}
      >
        {t('settings.signOutDevice', {}, { defaultValue: 'Sign out' })}
      </button>
    )
  }

  async function deleteAccount(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    setDeleteSubmitting(true)
    setDeleteError(null)
    try {
      await http.delete(`/api/users/${userId}`, { data: { password: deletePassword } })
      await logout()
      navigate('/login')
    } catch (err) {
      setDeleteError(
        (err as Error)?.message ??
          t('settings.failedToDeleteAccount', {}, { defaultValue: 'Could not delete account.' }),
      )
      setDeleteSubmitting(false)
    }
  }

  let twoFASubmitLabel: string
  if (twoFAMode === 'disable') {
    twoFASubmitLabel = twoFASubmitting
      ? t('profile.security.twoFaDisabling', {}, { defaultValue: 'Disabling…' })
      : t('profile.security.twoFaDisable', {}, { defaultValue: 'Disable' })
  } else {
    twoFASubmitLabel = twoFASubmitting
      ? t('profile.security.twoFaVerifying', {}, { defaultValue: 'Verifying…' })
      : t('profile.security.twoFaVerify', {}, { defaultValue: 'Verify and enable' })
  }
  const twoFACodeFormVisible = twoFAMode === 'disable' || (twoFAMode === 'enable' && !!twoFASetup)

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('2xl'), cm.mxAuto, 'space-y-6')}>
      <header>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 2),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('nav.yourAccount', {}, { defaultValue: 'Your account' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('nav.profile', {}, { defaultValue: 'Profile' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mt', 1))}>
          {t(
            'profile.subheading',
            {},
            { defaultValue: 'Identity and security settings for this workspace.' },
          )}
        </p>
      </header>

      <form
        onSubmit={saveProfile}
        className={cm.cn(cm.card(), cm.sp('p', 6), 'space-y-4')}
        data-mol-id="form-identity"
      >
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
          {t('nav.identity', {}, { defaultValue: 'Identity' })}
        </h2>
        <Field
          label={t('form.displayName', {}, { defaultValue: 'Display name' })}
          dataId="input-name"
          value={draft.name}
          onChange={(v) => setDraft((d) => ({ ...d, name: v }))}
        />
        <Field
          label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          type="email"
          dataId="input-email"
          value={draft.email}
          onChange={(v) => setDraft((d) => ({ ...d, email: v }))}
        />
        <Field
          label={t('form.timezone', {}, { defaultValue: 'Timezone' })}
          dataId="input-timezone"
          value={draft.timezone}
          onChange={(v) => setDraft((d) => ({ ...d, timezone: v }))}
        />
        {saveError ? <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{saveError}</p> : null}
        {savedAt ? (
          <p className={cm.cn(cm.textSize('xs'), 'text-success')} data-mol-id="profile-saved-pill">
            {t(
              'common.savedAt',
              { time: new Date(savedAt).toLocaleTimeString() },
              { defaultValue: 'Saved at {{time}}' },
            )}
          </p>
        ) : null}
        <div className={cm.flex({ justify: 'end' })}>
          <button
            type="submit"
            data-mol-id="button-save-profile"
            disabled={saving}
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
      </form>

      <section className={cm.cn(cm.card(), cm.sp('p', 6), 'space-y-4')}>
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
          {t('nav.security', {}, { defaultValue: 'Security' })}
        </h2>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {profile?.twoFactorEnabled
            ? t(
                'profile.security.twoFaOn',
                {},
                { defaultValue: 'Two-factor authentication is enabled on this account.' },
              )
            : t(
                'profile.security.body',
                {},
                { defaultValue: 'Change password, manage API keys and 2FA.' },
              )}
        </p>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <button
            type="button"
            data-mol-id="button-change-password"
            onClick={() => {
              setPwOpen(true)
              setPwError(null)
              setPwSuccess(false)
            }}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'border border-outline-variant rounded-md',
            )}
          >
            {t('settings.changePassword', {}, { defaultValue: 'Change password' })}
          </button>
          {profile?.twoFactorEnabled ? (
            <button
              type="button"
              data-mol-id="button-disable-2fa"
              onClick={startDisable2FA}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'border border-outline-variant rounded-md',
              )}
            >
              {t('profile.security.disable2fa', {}, { defaultValue: 'Disable 2FA' })}
            </button>
          ) : (
            <button
              type="button"
              data-mol-id="button-enable-2fa"
              onClick={startEnable2FA}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'border border-outline-variant rounded-md',
              )}
            >
              {t('profile.security.enable2fa', {}, { defaultValue: 'Enable 2FA' })}
            </button>
          )}
        </div>
      </section>

      <section
        className={cm.cn(cm.card(), cm.sp('p', 6), 'space-y-4')}
        data-mol-id="section-notifications"
      >
        <NotificationsSection />
      </section>

      <section
        className={cm.cn(cm.card(), cm.sp('p', 6), 'space-y-4')}
        data-mol-id="section-devices"
      >
        <div>
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
            {t('settings.devices', {}, { defaultValue: 'Devices' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mt', 1))}>
            {t(
              'profile.devices.subheading',
              {},
              { defaultValue: 'Devices currently registered to your account.' },
            )}
          </p>
        </div>
        {devicesLoading ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : devices.length > 0 ? (
          <ul className={'space-y-2'} data-mol-id="list-devices">
            {devices.map((device) => (
              <li
                key={device.id}
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.sp('py', 2),
                  cm.sp('px', 3),
                  'rounded-md border border-outline-variant',
                )}
              >
                <div className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
                  <div>
                    <span className={cm.fontWeight('medium')}>
                      {device.name ||
                        device.platform ||
                        t('profile.devices.unnamed', {}, { defaultValue: 'Unnamed device' })}
                      {device.isCurrent ? (
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
                    {device.lastSeen ? (
                      <div className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {new Date(device.lastSeen).toLocaleString()}
                      </div>
                    ) : null}
                  </div>
                  {renderDeviceControl(device)}
                </div>
                {confirmingDeviceId === device.id ? (
                  <p
                    className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', cm.sp('mt', 2))}
                    data-mol-id="device-revoke-warning"
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
          <p
            className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
            data-mol-id="devices-empty"
          >
            {t('settings.noDevices', {}, { defaultValue: 'No registered devices.' })}
          </p>
        )}
      </section>

      <section
        className={cm.cn(cm.card(), cm.sp('p', 6), 'space-y-4 border border-error')}
        data-mol-id="section-danger-zone"
      >
        <div>
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'text-error')}>
            {t('profile.dangerZone.title', {}, { defaultValue: 'Danger zone' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mt', 1))}>
            {t(
              'settings.deleteAccountConfirm',
              {},
              { defaultValue: 'Are you sure? This action cannot be undone.' },
            )}
          </p>
        </div>
        <div className={cm.flex({ justify: 'start' })}>
          <button
            type="button"
            data-mol-id="button-delete-account"
            onClick={() => {
              setDeleteOpen(true)
              setDeleteError(null)
              setDeletePassword('')
            }}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'rounded-md border border-error text-error',
            )}
          >
            {t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
          </button>
        </div>
      </section>

      {pwOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          data-mol-id="dialog-change-password"
          className={cm.cn(cm.overlay, cm.flex({ align: 'center', justify: 'center' }), 'z-50')}
        >
          <form
            onSubmit={submitChangePassword}
            className={cm.cn(cm.card(), cm.sp('p', 6), cm.maxW('md'), 'w-full space-y-4')}
          >
            <header>
              <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
                {t('settings.changePassword', {}, { defaultValue: 'Change password' })}
              </h2>
            </header>
            <Field
              label={t('profile.security.pwCurrent', {}, { defaultValue: 'Current password' })}
              type="password"
              dataId="input-pw-current"
              value={pwDraft.current}
              onChange={(v) => setPwDraft((d) => ({ ...d, current: v }))}
              required
            />
            <Field
              label={t('profile.security.pwNew', {}, { defaultValue: 'New password' })}
              type="password"
              dataId="input-pw-new"
              value={pwDraft.next}
              onChange={(v) => setPwDraft((d) => ({ ...d, next: v }))}
              required
            />
            <Field
              label={t(
                'auth.signup.confirmNewPassword',
                {},
                { defaultValue: 'Confirm new password' },
              )}
              type="password"
              dataId="input-pw-confirm"
              value={pwDraft.confirm}
              onChange={(v) => setPwDraft((d) => ({ ...d, confirm: v }))}
              required
            />
            {pwError ? <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{pwError}</p> : null}
            {pwSuccess ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-success')} data-mol-id="pw-changed">
                {t(
                  'profile.security.pwChanged',
                  {},
                  { defaultValue: 'Password changed successfully.' },
                )}
              </p>
            ) : null}
            <footer className={cm.cn(cm.flex({ justify: 'end', gap: 'sm' }), cm.sp('pt', 2))}>
              <button
                type="button"
                data-mol-id="button-pw-cancel"
                onClick={() => {
                  setPwOpen(false)
                  setPwError(null)
                  setPwSuccess(false)
                }}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'rounded-md border border-outline-variant',
                )}
              >
                {t('common.cancel', {}, { defaultValue: 'Cancel' })}
              </button>
              <button
                type="submit"
                data-mol-id="button-pw-submit"
                disabled={pwSubmitting}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'bg-primary text-on-primary rounded-md disabled:opacity-50',
                )}
              >
                {pwSubmitting
                  ? t('common.updatingEllipsis', {}, { defaultValue: 'Updating…' })
                  : t('auth.resetPassword.updatePassword', {}, { defaultValue: 'Update password' })}
              </button>
            </footer>
          </form>
        </div>
      ) : null}

      {twoFAMode !== null ? (
        <div
          role="dialog"
          aria-modal="true"
          data-mol-id="dialog-2fa"
          className={cm.cn(cm.overlay, cm.flex({ align: 'center', justify: 'center' }), 'z-50')}
        >
          <form
            onSubmit={submitTwoFA}
            className={cm.cn(cm.card(), cm.sp('p', 6), cm.maxW('md'), 'w-full space-y-4')}
          >
            <header>
              <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
                {twoFAMode === 'disable'
                  ? t(
                      'profile.security.twoFaDisableTitle',
                      {},
                      { defaultValue: 'Disable two-factor authentication' },
                    )
                  : t(
                      'profile.security.twoFaEnableTitle',
                      {},
                      { defaultValue: 'Enable two-factor authentication' },
                    )}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mt', 1))}>
                {twoFAMode === 'disable'
                  ? t(
                      'profile.security.twoFaDisableIntro',
                      {},
                      {
                        defaultValue:
                          'Enter a current code from your authenticator app to disable two-factor authentication.',
                      },
                    )
                  : t(
                      'profile.security.twoFaIntro',
                      {},
                      {
                        defaultValue:
                          'Scan the QR code in your authenticator app, then enter the 6-digit code below to verify.',
                      },
                    )}
              </p>
            </header>

            {twoFAError ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-error')} data-mol-id="2fa-error">
                {twoFAError}
              </p>
            ) : null}

            {twoFAMode === 'enable' && !twoFASetup && !twoFAError ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
              </p>
            ) : null}

            {twoFAMode === 'enable' && twoFASetup?.QRImageUrl ? (
              <div className={'space-y-3'}>
                <img
                  src={twoFASetup.QRImageUrl}
                  alt={t('profile.security.twoFaQrAlt', {}, { defaultValue: 'Two-factor QR code' })}
                  className={cm.cn('mx-auto', cm.maxW('xs'))}
                />
                {twoFASetup.secret ? (
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      'text-on-surface-variant text-center break-all',
                    )}
                    data-mol-id="2fa-secret"
                  >
                    {twoFASetup.secret}
                  </p>
                ) : null}
              </div>
            ) : null}

            {twoFACodeFormVisible ? (
              <Field
                label={t('profile.security.twoFaCode', {}, { defaultValue: '6-digit code' })}
                dataId="input-2fa-code"
                value={twoFACode}
                onChange={(v) => setTwoFACode(v.replace(/\D/g, '').slice(0, 6))}
                pattern="\d{6}"
                required
              />
            ) : null}

            <footer className={cm.cn(cm.flex({ justify: 'end', gap: 'sm' }), cm.sp('pt', 2))}>
              <button
                type="button"
                data-mol-id="button-2fa-cancel"
                onClick={closeTwoFA}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'rounded-md border border-outline-variant',
                )}
              >
                {t('common.cancel', {}, { defaultValue: 'Cancel' })}
              </button>
              {twoFACodeFormVisible ? (
                <button
                  type="submit"
                  data-mol-id="button-2fa-submit"
                  disabled={twoFASubmitting || twoFACode.length !== 6}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'rounded-md disabled:opacity-50',
                    twoFAMode === 'disable'
                      ? 'bg-error text-on-error'
                      : 'bg-primary text-on-primary',
                  )}
                >
                  {twoFASubmitLabel}
                </button>
              ) : null}
            </footer>
          </form>
        </div>
      ) : null}

      {deleteOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          data-mol-id="dialog-delete-account"
          className={cm.cn(cm.overlay, cm.flex({ align: 'center', justify: 'center' }), 'z-50')}
        >
          <form
            onSubmit={deleteAccount}
            className={cm.cn(cm.card(), cm.sp('p', 6), cm.maxW('md'), 'w-full space-y-4')}
          >
            <header>
              <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-error')}>
                {t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mt', 1))}>
                {t(
                  'profile.dangerZone.modalWarning',
                  {},
                  {
                    defaultValue:
                      'This permanently deletes your account and all associated data. Enter your password to confirm.',
                  },
                )}
              </p>
            </header>
            <Field
              label={t('profile.security.pwCurrent', {}, { defaultValue: 'Current password' })}
              type="password"
              dataId="input-delete-password"
              value={deletePassword}
              onChange={(v) => setDeletePassword(v)}
              required
            />
            {deleteError ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{deleteError}</p>
            ) : null}
            <footer className={cm.cn(cm.flex({ justify: 'end', gap: 'sm' }), cm.sp('pt', 2))}>
              <button
                type="button"
                data-mol-id="button-delete-cancel"
                onClick={() => {
                  setDeleteOpen(false)
                  setDeleteError(null)
                }}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'rounded-md border border-outline-variant',
                )}
              >
                {t('common.cancel', {}, { defaultValue: 'Cancel' })}
              </button>
              <button
                type="submit"
                data-mol-id="button-delete-confirm"
                disabled={deleteSubmitting || !deletePassword}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'rounded-md bg-error text-on-error disabled:opacity-50',
                )}
              >
                {deleteSubmitting
                  ? t('settings.deleteAccountModal.deleting', {}, { defaultValue: 'Deleting…' })
                  : t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
              </button>
            </footer>
          </form>
        </div>
      ) : null}
    </div>
  )
}

interface FieldProps {
  label: string
  value: string
  dataId?: string
  type?: string
  readOnly?: boolean
  required?: boolean
  pattern?: string
  onChange?: (v: string) => void
}

function Field({
  label,
  value,
  dataId,
  type = 'text',
  readOnly,
  required,
  pattern,
  onChange,
}: FieldProps) {
  const cm = getClassMap()
  return (
    <label className="block">
      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}>
        {label}
      </span>
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        required={required}
        pattern={pattern}
        data-mol-id={dataId}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className={cm.cn(
          cm.sp('px', 3),
          cm.sp('py', 2),
          'w-full border border-outline-variant rounded-md bg-surface text-on-surface',
          readOnly ? 'opacity-70 cursor-not-allowed' : '',
        )}
      />
    </label>
  )
}
