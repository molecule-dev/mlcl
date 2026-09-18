import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import type { UserProfile } from '@molecule/app-auth'
import {
  useAuth,
  useChangePassword,
  useHttpClient,
  usePush,
  useTranslation,
} from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Alert, Button, Input, Modal, Spinner, Switch } from '@molecule/app-ui-react'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

/**
 * Logged-in user account fields. Extends the shared `UserProfile` with the
 * optional security flags the standard `api-resource-user` understands.
 */
type AccountUser = UserProfile & {
  oauthServer?: string | null
  twoFactorEnabled?: boolean | null
}

interface Device {
  id: string
  name?: string | null
  platform?: string | null
  /** `true` for the device making the current request (the API marks it). */
  isCurrent?: boolean | null
}

/** Two-factor enrollment payload returned by the `setup` action. */
interface TwoFactorSetup {
  QRImageUrl?: string
  secret?: string
}

/**
 * Personal-account management for the signed-in user, wired to the standard
 * molecule endpoints (`/api/users/:id`, `/api/users/me`, `/api/devices`):
 *
 * - Profile (C6): edit email + display name → PATCH `/api/users/:id`
 * - Security (C4): change-password modal + real TOTP two-factor enrollment
 *   (`POST /api/users/:id/verify-two-factor` setup → QR/secret → enable, and
 *   code-confirmed disable); hidden for OAuth-only accounts
 * - Notifications (C5): browser push subscription toggle via `@molecule/app-push`
 * - Devices (C7): list registered devices from GET `/api/devices`, with a
 *   per-device revoke (`DELETE /api/devices/:id`) that signs the device out
 *   server-side; the current device is labelled and not revocable here
 * - Delete account (C10): password-confirm modal → DELETE `/api/users/:id`
 *
 * Sign out (C9) already lives in `UserMenu`, so it is intentionally not
 * duplicated here.
 */
export function AccountSettings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { user, setUser, logout } = useAuth<AccountUser>()

  // C6 — profile
  const [email, setEmail] = useState(user?.email ?? '')
  const [name, setName] = useState(user?.name ?? '')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileError, setProfileError] = useState('')

  // C4 — change password
  const { status: pwStatus, error: pwError, changePassword, reset: resetPw } = useChangePassword()
  const [showPwModal, setShowPwModal] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  // C4 — two-factor (real TOTP enrollment via verify-two-factor)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean>(Boolean(user?.twoFactorEnabled))
  const [tfModal, setTfModal] = useState<null | 'enable' | 'disable'>(null)
  const [tfSetup, setTfSetup] = useState<TwoFactorSetup | null>(null)
  const [tfToken, setTfToken] = useState('')
  const [tfLoading, setTfLoading] = useState(false)
  const [tfError, setTfError] = useState('')

  // C5 — push notifications
  const { permission, requestPermission, register, unregister } = usePush({ checkOnMount: true })
  const [pushEnabled, setPushEnabled] = useState(false)

  // C7 — devices
  const [devices, setDevices] = useState<Device[]>([])
  const [devicesLoading, setDevicesLoading] = useState(true)
  const [confirmingDeviceId, setConfirmingDeviceId] = useState<string | null>(null)
  const [revokingDeviceId, setRevokingDeviceId] = useState<string | null>(null)

  // C10 — delete account
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const isOAuthOnly = Boolean(user?.oauthServer)

  // Refresh the canonical user record on mount and seed the form + auth cache.
  useEffect(() => {
    let cancelled = false
    http
      .get('/api/users/me')
      .then((res) => {
        if (cancelled) return
        const fresh = unwrapSingle<AccountUser>(res)
        if (fresh && fresh.id) {
          setUser(fresh)
          setEmail(fresh.email ?? '')
          setName(fresh.name ?? '')
          setTwoFactorEnabled(Boolean(fresh.twoFactorEnabled))
        }
      })
      .catch(() => {
        // Best-effort refresh; the cached profile remains the fallback.
      })
    return () => {
      cancelled = true
    }
  }, [http, setUser])

  // Load registered devices (optional endpoint; renders empty if unavailable).
  const loadDevices = useCallback(async () => {
    try {
      const res = await http.get('/api/devices')
      setDevices(unwrapList<Device>(res))
    } catch (_error) {
      // Devices endpoint is optional; the section renders empty when absent.
    } finally {
      setDevicesLoading(false)
    }
  }, [http])

  useEffect(() => {
    void loadDevices()
  }, [loadDevices])

  // Keep the push toggle in sync with the live browser permission.
  useEffect(() => {
    setPushEnabled(permission === 'granted')
  }, [permission])

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setProfileSaving(true)
    setProfileError('')
    try {
      await http.patch(`/api/users/${user.id}`, { email, name })
      setUser({ ...user, email, name })
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 2000)
    } catch (err) {
      setProfileError(
        err instanceof Error
          ? err.message
          : t('settings.account.saveError', {}, { defaultValue: 'Failed to update profile.' }),
      )
    } finally {
      setProfileSaving(false)
    }
  }

  async function submitChangePassword(e: React.FormEvent) {
    e.preventDefault()
    try {
      await changePassword(currentPassword, newPassword)
      setShowPwModal(false)
      setCurrentPassword('')
      setNewPassword('')
      resetPw()
    } catch (_error) {
      // Error is surfaced via `pwError` from the hook; keep the modal open.
    }
  }

  // C7 — revoke (sign out) a device. Deleting the device row makes the API
  // reject that device's session server-side, so it is actually signed out.
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

  function closeTwoFactor() {
    setTfModal(null)
    setTfSetup(null)
    setTfToken('')
    setTfError('')
  }

  // Enable → POST {action:'setup'} returns a QR code + secret to scan into an
  // authenticator app; the user then submits a 6-digit code to confirm.
  async function startEnableTwoFactor() {
    if (!user) return
    setTfError('')
    setTfToken('')
    setTfSetup(null)
    setTfLoading(true)
    setTfModal('enable')
    try {
      const res = await http.post(`/api/users/${user.id}/verify-two-factor`, { action: 'setup' })
      setTfSetup(unwrapSingle<TwoFactorSetup>(res) ?? {})
    } catch (err) {
      setTfError(
        err instanceof Error
          ? err.message
          : t(
              'settings.account.twoFactorUnavailable',
              {},
              { defaultValue: 'Two-factor authentication is not available for this app.' },
            ),
      )
    } finally {
      setTfLoading(false)
    }
  }

  // Submit a 6-digit code to enable (action:'enable') or disable
  // (action:'disable') two-factor. 403 surfaces as an invalid-code error.
  async function submitTwoFactor(action: 'enable' | 'disable') {
    if (!user) return
    setTfError('')
    setTfLoading(true)
    try {
      await http.post(`/api/users/${user.id}/verify-two-factor`, { action, token: tfToken })
      setTwoFactorEnabled(action === 'enable')
      setUser({ ...user, twoFactorEnabled: action === 'enable' })
      closeTwoFactor()
    } catch (err) {
      setTfError(
        err instanceof Error
          ? err.message
          : t('settings.account.twoFactorInvalidCode', {}, { defaultValue: 'Invalid code' }),
      )
    } finally {
      setTfLoading(false)
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
      // Permission denied or service worker unavailable; switch stays as-is.
    }
  }

  async function deleteAccount(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setDeleting(true)
    setDeleteError('')
    try {
      await http.delete(`/api/users/${user.id}`, { data: { password: deletePassword } })
      await logout()
      navigate('/login')
    } catch (err) {
      setDeleteError(
        err instanceof Error
          ? err.message
          : t('settings.account.deleteError', {}, { defaultValue: 'Failed to delete account.' }),
      )
    } finally {
      setDeleting(false)
    }
  }

  const labelClass = cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))
  const cardClass = cm.cn(cm.card(), cm.sp('p', 5), 'space-y-4')
  const headingClass = cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))

  return (
    <>
      {/* C6 — profile */}
      <form onSubmit={saveProfile} className={cardClass}>
        <h2 className={headingClass}>
          {t('settings.account.heading', {}, { defaultValue: 'Your account' })}
        </h2>
        <div className={cm.cn(cm.grid({ cols: 2, gap: 'md' }))}>
          <label className="block">
            <span className={labelClass}>
              {t('settings.account.name', {}, { defaultValue: 'Display name' })}
            </span>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName((e.target as HTMLInputElement).value)}
            />
          </label>
          <label className="block">
            <span className={labelClass}>
              {t('settings.account.email', {}, { defaultValue: 'Email' })}
            </span>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
            />
          </label>
        </div>
        {profileError ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{profileError}</p>
        ) : null}
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'md', justify: 'between' }))}>
          {profileSaved ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-success')}>
              {t('common.savedPeriod', {}, { defaultValue: 'Saved.' })}
            </p>
          ) : (
            <span aria-hidden="true" />
          )}
          <Button type="submit" loading={profileSaving}>
            {profileSaving
              ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
              : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
          </Button>
        </div>
      </form>

      {/* C4 — security (hidden for OAuth-only accounts) */}
      {isOAuthOnly ? null : (
        <section className={cardClass}>
          <h2 className={headingClass}>
            {t('settings.account.security', {}, { defaultValue: 'Security' })}
          </h2>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md', justify: 'between' }))}>
            <span className={cm.textSize('sm')}>
              {t('settings.account.password', {}, { defaultValue: 'Password' })}
            </span>
            <Button variant="outline" size="sm" onClick={() => setShowPwModal(true)}>
              {t('settings.account.changePassword', {}, { defaultValue: 'Change password' })}
            </Button>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md', justify: 'between' }))}>
            <span className={cm.textSize('sm')}>
              {t('settings.account.twoFactor', {}, { defaultValue: 'Two-factor authentication' })}
              {twoFactorEnabled ? (
                <span
                  className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', cm.sp('ml', 2))}
                >
                  {t('settings.account.twoFactorOn', {}, { defaultValue: 'On' })}
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
                  setTfSetup(null)
                  setTfModal('disable')
                }}
              >
                {t('settings.account.twoFactorDisable', {}, { defaultValue: 'Disable' })}
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={startEnableTwoFactor}>
                {t('settings.account.twoFactorEnable', {}, { defaultValue: 'Enable' })}
              </Button>
            )}
          </div>
        </section>
      )}

      {/* C5 — push notifications */}
      <section className={cardClass}>
        <h2 className={headingClass}>
          {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
        </h2>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'md', justify: 'between' }))}>
          <span className={cm.textSize('sm')}>
            {t(
              'settings.account.pushNotifications',
              {},
              { defaultValue: 'Push notifications on this device' },
            )}
          </span>
          <Switch
            checked={pushEnabled}
            onChange={(e) => togglePush((e.target as HTMLInputElement).checked)}
            size="sm"
          />
        </div>
      </section>

      {/* C7 — devices */}
      <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <h2 className={headingClass}>
            {t('settings.account.devices', {}, { defaultValue: 'Devices' })}
          </h2>
          {devicesLoading ? <Spinner size="xs" /> : null}
        </div>
        {!devicesLoading && devices.length === 0 ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('settings.account.noDevices', {}, { defaultValue: 'No devices registered yet.' })}
          </p>
        ) : (
          <ul className={cm.cn('space-y-2')}>
            {devices.map((device) => (
              <li
                key={device.id}
                className={cm.cn(
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'border-b border-outline-variant last:border-b-0',
                )}
              >
                <div className={cm.cn(cm.flex({ align: 'center', gap: 'md', justify: 'between' }))}>
                  <div>
                    <span>
                      {device.name ||
                        device.platform ||
                        t('settings.account.unknownDevice', {}, { defaultValue: 'Unknown device' })}
                      {device.isCurrent ? (
                        <span
                          className={cm.cn(
                            cm.textSize('xs'),
                            'text-on-surface-variant',
                            cm.sp('ml', 2),
                          )}
                        >
                          {t('settings.account.thisDevice', {}, { defaultValue: 'This device' })}
                        </span>
                      ) : null}
                    </span>
                    {device.platform && device.name ? (
                      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {device.platform}
                      </p>
                    ) : null}
                  </div>
                  {device.isCurrent ? null : confirmingDeviceId === device.id ? (
                    <span className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
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
                      >
                        {t('settings.account.signOutDevice', {}, { defaultValue: 'Sign out' })}
                      </Button>
                    </span>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmingDeviceId(device.id)}
                    >
                      {t('settings.account.signOutDevice', {}, { defaultValue: 'Sign out' })}
                    </Button>
                  )}
                </div>
                {confirmingDeviceId === device.id ? (
                  <p
                    className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', cm.sp('mt', 1))}
                  >
                    {t(
                      'settings.account.revokeDeviceWarning',
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
        )}
      </section>

      {/* C10 — delete account */}
      <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
        <h2 className={headingClass}>
          {t('settings.account.dangerZone', {}, { defaultValue: 'Danger zone' })}
        </h2>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'settings.account.deleteDescription',
            {},
            { defaultValue: 'Permanently delete your account and all associated data.' },
          )}
        </p>
        <div className={cm.cn(cm.flex({ justify: 'start' }))}>
          <Button color="error" variant="outline" onClick={() => setShowDeleteModal(true)}>
            {t('settings.account.deleteAccount', {}, { defaultValue: 'Delete account' })}
          </Button>
        </div>
      </section>

      {/* C4 — change-password modal */}
      <Modal
        open={showPwModal}
        onClose={() => {
          setShowPwModal(false)
          resetPw()
        }}
        title={t('settings.account.changePassword', {}, { defaultValue: 'Change password' })}
      >
        {pwError ? (
          <Alert status="error" className={cm.sp('mb', 4)}>
            {pwError.message ||
              t(
                'settings.account.passwordError',
                {},
                { defaultValue: 'Failed to change password.' },
              )}
          </Alert>
        ) : null}
        <form onSubmit={submitChangePassword} className={cm.cn('space-y-4')}>
          <div>
            <label htmlFor="account-current-pw" className={labelClass}>
              {t('settings.account.currentPassword', {}, { defaultValue: 'Current password' })}
            </label>
            <Input
              id="account-current-pw"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword((e.target as HTMLInputElement).value)}
              autoComplete="current-password"
              required
            />
          </div>
          <div>
            <label htmlFor="account-new-pw" className={labelClass}>
              {t('settings.account.newPassword', {}, { defaultValue: 'New password' })}
            </label>
            <Input
              id="account-new-pw"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword((e.target as HTMLInputElement).value)}
              autoComplete="new-password"
              required
            />
          </div>
          <Button type="submit" fullWidth loading={pwStatus === 'pending'}>
            {pwStatus === 'pending'
              ? t('settings.account.changingPassword', {}, { defaultValue: 'Changing…' })
              : t('settings.account.changePassword', {}, { defaultValue: 'Change password' })}
          </Button>
        </form>
      </Modal>

      {/* C10 — delete-account confirm modal */}
      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title={t('settings.account.deleteAccount', {}, { defaultValue: 'Delete account' })}
      >
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mb', 4))}>
          {t(
            'settings.account.deleteWarning',
            {},
            {
              defaultValue:
                'This permanently deletes your account and cannot be undone. Enter your password to confirm.',
            },
          )}
        </p>
        {deleteError ? (
          <Alert status="error" className={cm.sp('mb', 4)}>
            {deleteError}
          </Alert>
        ) : null}
        <form onSubmit={deleteAccount} className={cm.cn('space-y-4')}>
          <div>
            <label htmlFor="account-delete-pw" className={labelClass}>
              {t('settings.account.password', {}, { defaultValue: 'Password' })}
            </label>
            <Input
              id="account-delete-pw"
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword((e.target as HTMLInputElement).value)}
              autoComplete="current-password"
              required
            />
          </div>
          <Button type="submit" color="error" fullWidth loading={deleting}>
            {deleting
              ? t('settings.account.deleting', {}, { defaultValue: 'Deleting…' })
              : t('settings.account.deleteAccount', {}, { defaultValue: 'Delete account' })}
          </Button>
        </form>
      </Modal>

      {/* C4 — two-factor enrollment modal (real TOTP flow) */}
      <Modal
        open={tfModal !== null}
        onClose={closeTwoFactor}
        title={
          tfModal === 'disable'
            ? t(
                'settings.account.twoFactorDisableTitle',
                {},
                { defaultValue: 'Disable two-factor authentication' },
              )
            : t(
                'settings.account.twoFactorEnableTitle',
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
          <div className={cm.cn(cm.flex({ justify: 'center' }), cm.sp('py', 4))}>
            <Spinner size="sm" />
          </div>
        ) : null}
        {tfModal === 'enable' && tfSetup?.QRImageUrl ? (
          <div className={cm.cn('space-y-3', cm.sp('mb', 4))}>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'settings.account.twoFactorScan',
                {},
                {
                  defaultValue:
                    'Scan this QR code with your authenticator app, then enter the 6-digit code.',
                },
              )}
            </p>
            <img
              src={tfSetup.QRImageUrl}
              alt={t('settings.account.twoFactorQrAlt', {}, { defaultValue: 'Two-factor QR code' })}
              className={cm.cn('mx-auto', cm.maxW('xs'))}
            />
            {tfSetup.secret ? (
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  'text-on-surface-variant',
                  'text-center break-all',
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
            <div>
              <label htmlFor="account-tf-token" className={labelClass}>
                {t('settings.account.twoFactorCode', {}, { defaultValue: 'Authentication code' })}
              </label>
              <Input
                id="account-tf-token"
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
                ? t('settings.account.twoFactorDisable', {}, { defaultValue: 'Disable' })
                : t('settings.account.twoFactorVerify', {}, { defaultValue: 'Verify & enable' })}
            </Button>
          </form>
        ) : null}
      </Modal>
    </>
  )
}
