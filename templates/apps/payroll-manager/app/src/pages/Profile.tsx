import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useChangePassword, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Alert, Button, Input, Modal } from '@molecule/app-ui-react'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface Device {
  id: string
  name?: string
  platform?: string
  browser?: string
  os?: string
  createdAt?: string
  updatedAt?: string
  // The API marks the device making the current request; it is labelled
  // "This device" and is not revocable here (use Sign out for the current session).
  isCurrent?: boolean
}

interface TwoFactorSetup {
  QRImageUrl?: string
  keyUrl?: string
  secret?: string
}

function initials(email: string | undefined, firstName?: string, lastName?: string): string {
  if (firstName || lastName) {
    return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || '?'
  }
  if (!email) return '?'
  return email[0]?.toUpperCase() ?? '?'
}

export function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, logout } = useAuth<UserProfile>()
  const http = useHttpClient()
  const { status: pwStatus, error: pwError, changePassword, reset: resetPw } = useChangePassword()

  const userId = (user as unknown as { id?: string })?.id

  const [devices, setDevices] = useState<Device[]>([])
  const [devicesLoading, setDevicesLoading] = useState(true)
  const [confirmingDeviceId, setConfirmingDeviceId] = useState<string | null>(null)
  const [revokingDeviceId, setRevokingDeviceId] = useState<string | null>(null)

  // Real TOTP enrollment flow (POST /api/users/:id/verify-two-factor), replacing
  // the previous dead boolean toggle that PATCHed an ignored `twoFactorEnabled`.
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [tfModal, setTfModal] = useState<null | 'enable' | 'disable'>(null)
  const [tfSetup, setTfSetup] = useState<TwoFactorSetup | null>(null)
  const [tfToken, setTfToken] = useState('')
  const [tfLoading, setTfLoading] = useState(false)
  const [tfError, setTfError] = useState('')

  const [showPwModal, setShowPwModal] = useState(false)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')

  // Registered devices (GET /api/devices) — endpoint is optional; render empty if unavailable.
  const loadDevices = useCallback(async () => {
    setDevicesLoading(true)
    try {
      const res = await http.get('/api/devices')
      setDevices(unwrapList<Device>(res))
      // Devices endpoint is optional; the list renders empty when unavailable.
    } catch (_error) {
      setDevices([])
    } finally {
      setDevicesLoading(false)
    }
  }, [http])

  useEffect(() => {
    void loadDevices()
  }, [loadDevices])

  // Persisted 2FA status (GET /api/users/me) — best-effort; defaults to disabled.
  // The user record may nest fields under `props`, so read either shape.
  useEffect(() => {
    let cancelled = false
    http
      .get<{ props?: { twoFactorEnabled?: boolean }; twoFactorEnabled?: boolean }>('/api/users/me')
      .then((res) => {
        if (cancelled) return
        const body = (res as { data?: Record<string, unknown> }).data ?? res
        const me = ((body as { props?: Record<string, unknown> }).props ?? body) as {
          twoFactorEnabled?: boolean
        }
        setTwoFactorEnabled(Boolean(me?.twoFactorEnabled))
      })
      .catch(() => {
        // Status read is best-effort; defaults to disabled.
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const closeTwoFactor = () => {
    setTfModal(null)
    setTfSetup(null)
    setTfToken('')
    setTfError('')
  }

  const startEnableTwoFactor = async () => {
    if (!userId) return
    setTfError('')
    setTfLoading(true)
    setTfModal('enable')
    try {
      const res = await http.post(`/api/users/${userId}/verify-two-factor`, { action: 'setup' })
      setTfSetup(unwrapSingle<TwoFactorSetup>(res))
    } catch (err) {
      setTfError(
        err instanceof Error
          ? err.message
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

  const submitTwoFactor = async (action: 'enable' | 'disable') => {
    if (!userId) return
    setTfError('')
    setTfLoading(true)
    try {
      await http.post(`/api/users/${userId}/verify-two-factor`, { action, token: tfToken })
      setTwoFactorEnabled(action === 'enable')
      closeTwoFactor()
    } catch (err) {
      setTfError(
        err instanceof Error
          ? err.message
          : t('settings.twoFactorInvalidCode', {}, { defaultValue: 'Invalid code' }),
      )
    } finally {
      setTfLoading(false)
    }
  }

  const handleRevokeDevice = async (id: string) => {
    setRevokingDeviceId(id)
    try {
      await http.delete(`/api/devices/${id}`)
      setConfirmingDeviceId(null)
      await loadDevices()
      // Best-effort — keep the row so the user can retry the revoke.
    } catch (_error) {
      // Revoke failed; leave the row in place so the user can retry.
    } finally {
      setRevokingDeviceId(null)
    }
  }

  const onPwSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await changePassword(currentPw, newPw)
      setCurrentPw('')
      setNewPw('')
      setShowPwModal(false)
      resetPw()
      // pwError is surfaced via the hook — no additional handling needed here
    } catch (_error) {
      // pwError is set in the hook
    }
  }

  const onLogout = async () => {
    await logout()
    navigate('/login')
  }

  const display = user as (UserProfile & { firstName?: string; lastName?: string }) | null

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, cm.stack(8))}>
      <header>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('settings.account', {}, { defaultValue: 'Account' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
          {t('nav.profile', {}, { defaultValue: 'Profile' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'profile.subheading',
            {},
            { defaultValue: 'Account info, password, two-factor, and active devices.' },
          )}
        </p>
      </header>

      <section
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'lg', wrap: 'wrap' }),
          cm.sp('p', 6),
          'rounded-2xl bg-gradient-to-br from-primary-container/30 to-surface-container-lowest shadow-sm',
        )}
      >
        <div
          className={cm.cn(
            cm.w(20),
            cm.h(20),
            cm.roundedFull,
            cm.flex({ align: 'center', justify: 'center' }),
            cm.fontWeight('bold'),
            cm.textSize('2xl'),
            'text-white shadow-md bg-gradient-to-br from-primary to-secondary',
          )}
        >
          {initials(display?.email, display?.firstName, display?.lastName)}
        </div>
        <div className={cm.flex1}>
          <h2 className={cm.cn(cm.textSize('2xl'), 'font-extrabold tracking-tight')}>
            {display?.firstName || display?.lastName
              ? `${display?.firstName ?? ''} ${display?.lastName ?? ''}`.trim()
              : (display?.email ?? t('profile.guest', {}, { defaultValue: 'Guest' }))}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {display?.email ?? '—'}
          </p>
          {display?.id ? (
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.sp('mt', 1),
                'text-on-surface-variant tabular-nums',
              )}
            >
              {t('profile.id', { id: display.id.slice(0, 8) }, { defaultValue: 'User · {{id}}' })}
            </p>
          ) : null}
        </div>
        <Button variant="outline" onClick={onLogout}>
          {t('settings.logOut', {}, { defaultValue: 'Sign out' })}
        </Button>
      </section>

      <ProfileSection
        icon="lock"
        title={t('profile.security', {}, { defaultValue: 'Password & security' })}
      >
        <Row
          label={t('auth.login.password', {}, { defaultValue: 'Password' })}
          value={t('profile.passwordValue', {}, { defaultValue: 'Change your password' })}
        >
          <button
            type="button"
            onClick={() => setShowPwModal(true)}
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'text-primary hover:underline uppercase tracking-widest',
            )}
          >
            {t('profile.change', {}, { defaultValue: 'Change' })}
          </button>
        </Row>
        <Row
          label={t('settings.twoFactor', {}, { defaultValue: 'Two-factor authentication' })}
          value={
            twoFactorEnabled
              ? t('profile.twoFactorOn', {}, { defaultValue: 'Authenticator app · enabled' })
              : t('profile.twoFactorOff', {}, { defaultValue: 'Disabled' })
          }
        >
          <button
            type="button"
            onClick={() => {
              if (twoFactorEnabled) {
                setTfError('')
                setTfToken('')
                setTfModal('disable')
              } else {
                void startEnableTwoFactor()
              }
            }}
            disabled={tfLoading}
            data-mol-id={twoFactorEnabled ? 'two-factor-disable' : 'two-factor-enable'}
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'text-primary hover:underline uppercase tracking-widest disabled:opacity-50',
            )}
          >
            {twoFactorEnabled
              ? t('profile.disable', {}, { defaultValue: 'Disable' })
              : t('profile.enable', {}, { defaultValue: 'Enable' })}
          </button>
        </Row>
      </ProfileSection>

      <ProfileSection
        icon="devices"
        title={t('profile.sessions', {}, { defaultValue: 'Active devices' })}
      >
        {devicesLoading ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : devices.length === 0 ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('profile.noDevices', {}, { defaultValue: 'No active devices.' })}
          </p>
        ) : (
          devices.map((d) => {
            const platform = (d.platform || d.os || '').toLowerCase()
            const icon =
              platform.includes('iphone') || platform.includes('android')
                ? 'smartphone'
                : platform.includes('ipad') || platform.includes('tablet')
                  ? 'tablet_mac'
                  : 'computer'
            const last = d.updatedAt || d.createdAt
            return (
              <div
                key={d.id}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between' }),
                  cm.sp('py', 3),
                  'border-b border-outline-variant/40 last:border-b-0',
                )}
              >
                <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                  <span
                    className={cm.cn(cm.sp('p', 2), cm.roundedFull, 'bg-primary/10 text-primary')}
                    aria-hidden="true"
                  >
                    <span className={cm.cn(`material-symbols-outlined text-base`)}>{icon}</span>
                  </span>
                  <div>
                    <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                      {d.name ||
                        d.platform ||
                        d.os ||
                        t('profile.unknownDevice', {}, { defaultValue: 'Unknown device' })}
                      {d.isCurrent ? (
                        <span
                          className={cm.cn(
                            cm.textSize('xs'),
                            cm.sp('ml', 2),
                            'text-on-surface-variant',
                          )}
                        >
                          {t('settings.thisDevice', {}, { defaultValue: 'This device' })}
                        </span>
                      ) : null}
                    </p>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {[d.browser, last ? new Date(last).toLocaleString() : null]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                </div>
                {d.isCurrent ? null : confirmingDeviceId === d.id ? (
                  <div className={cm.flex({ align: 'center', gap: 'sm' })}>
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
                      onClick={() => handleRevokeDevice(d.id)}
                      data-mol-id="device-revoke-confirm"
                    >
                      {t('settings.signOutDevice', {}, { defaultValue: 'Sign out' })}
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmingDeviceId(d.id)}
                    data-mol-id="device-revoke"
                  >
                    {t('settings.signOutDevice', {}, { defaultValue: 'Sign out' })}
                  </Button>
                )}
              </div>
            )
          })
        )}
      </ProfileSection>

      <Modal
        open={showPwModal}
        onClose={() => {
          setShowPwModal(false)
          resetPw()
        }}
        title={t('settings.changePassword', {}, { defaultValue: 'Change password' })}
      >
        {pwError ? (
          <Alert status="error" className={cm.sp('mb', 4)}>
            {pwError.message ||
              t('profile.passwordModal.error', {}, { defaultValue: 'Could not change password.' })}
          </Alert>
        ) : null}
        <form onSubmit={onPwSubmit} className={cm.stack(4)}>
          <div>
            <label htmlFor="profile-current-pw" className={cm.formLabel}>
              {t('profile.passwordModal.currentPw', {}, { defaultValue: 'Current password' })}
            </label>
            <Input
              id="profile-current-pw"
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw((e.target as HTMLInputElement).value)}
              autoComplete="current-password"
              required
            />
          </div>
          <div>
            <label htmlFor="profile-new-pw" className={cm.formLabel}>
              {t('profile.passwordModal.newPw', {}, { defaultValue: 'New password' })}
            </label>
            <Input
              id="profile-new-pw"
              type="password"
              value={newPw}
              onChange={(e) => setNewPw((e.target as HTMLInputElement).value)}
              autoComplete="new-password"
              required
              minLength={8}
            />
          </div>
          <Button type="submit" fullWidth loading={pwStatus === 'pending'}>
            {pwStatus === 'pending'
              ? t('profile.passwordModal.changing', {}, { defaultValue: 'Changing…' })
              : t('settings.changePassword', {}, { defaultValue: 'Change password' })}
          </Button>
        </form>
      </Modal>

      <Modal
        open={tfModal !== null}
        onClose={closeTwoFactor}
        title={
          tfModal === 'disable'
            ? t(
                'settings.twoFactorDisableTitle',
                {},
                { defaultValue: 'Disable two-factor authentication' },
              )
            : t(
                'settings.twoFactorEnableTitle',
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
        {tfModal === 'enable' && tfSetup?.QRImageUrl ? (
          <div className={cm.cn(cm.stack(3), cm.sp('mb', 4))}>
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
              className={cm.cn('mx-auto block', cm.maxW('xs'))}
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
            className={cm.stack(4)}
          >
            <div>
              <label htmlFor="profile-tf-token" className={cm.formLabel}>
                {t('settings.twoFactorCode', {}, { defaultValue: 'Authentication code' })}
              </label>
              <Input
                id="profile-tf-token"
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
                ? t('settings.twoFactorDisable', {}, { defaultValue: 'Disable' })
                : t('settings.twoFactorVerify', {}, { defaultValue: 'Verify & enable' })}
            </Button>
          </form>
        ) : null}
      </Modal>
    </div>
  )
}

function ProfileSection({
  icon,
  title,
  children,
}: {
  icon: string
  title: string
  children: React.ReactNode
}) {
  const cm = getClassMap()
  return (
    <section
      className={cm.cn(
        cm.sp('p', 6),
        'rounded-2xl bg-surface-container-lowest shadow-sm space-y-3',
      )}
    >
      <header className={cm.flex({ align: 'center', gap: 'sm' })}>
        <span
          className={cm.cn(cm.sp('p', 2), cm.roundedFull, 'bg-primary/10 text-primary')}
          aria-hidden="true"
        >
          <span className={cm.cn(`material-symbols-outlined text-base`)}>{icon}</span>
        </span>
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>{title}</h2>
      </header>
      <div className={cm.stack(0)}>{children}</div>
    </section>
  )
}

function Row({
  label,
  value,
  children,
}: {
  label: string
  value: string
  children: React.ReactNode
}) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
        cm.sp('py', 3),
        'border-b border-outline-variant/40 last:border-b-0',
      )}
    >
      <div>
        <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{label}</p>
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>{value}</p>
      </div>
      {children}
    </div>
  )
}
