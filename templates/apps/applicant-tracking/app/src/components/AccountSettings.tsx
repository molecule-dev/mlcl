import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import type { UserProfile } from '@molecule/app-auth'
import {
  useAuth,
  useAuthClient,
  useChangePassword,
  useHttpClient,
  usePush,
  useTranslation,
} from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Alert, Button, Flex, Input, Modal, Spinner, Switch } from '@molecule/app-ui-react'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

/**
 * Account management surface for the signed-in recruiter — composes the
 * standard user-account flows (display name + email, password, real TOTP
 * two-factor, push prefs, device revocation, delete account) that wire to the
 * canonical `/api/users/*` + `/api/devices` endpoints. Sign out lives in the
 * sidebar `UserMenu` and is not duplicated here. Rendered as the "Account"
 * tab of the Settings page.
 */
export function AccountSettings() {
  return (
    <>
      <AccountEmailCard />
      <SecurityCard />
      <PushNotificationsCard />
      <DevicesCard />
      <DangerZoneCard />
    </>
  )
}

const cardClass = (cm: ReturnType<typeof getClassMap>) =>
  cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')
const headingClass = (cm: ReturnType<typeof getClassMap>) =>
  cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))

function AccountEmailCard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const authClient = useAuthClient<UserProfile>()
  const http = useHttpClient()

  const cachedUser = authClient.getState().user
  const [email, setEmail] = useState(cachedUser?.email ?? '')
  const [name, setName] = useState(cachedUser?.name ?? '')
  const [saving, setSaving] = useState(false)
  const [savingName, setSavingName] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // Refresh the canonical user record on mount so the field reflects the
  // latest server email and the auth cache stays warm. Best-effort: if the
  // endpoint is unavailable the cached email remains the fallback.
  useEffect(() => {
    let cancelled = false
    http
      .get('/api/users/me')
      .then((res) => {
        if (cancelled) return
        const next = unwrapSingle<UserProfile>(res)
        if (next && typeof next === 'object' && next.id) {
          authClient.setUser(next)
          setEmail((curr) => (curr === (cachedUser?.email ?? '') ? (next.email ?? curr) : curr))
          setName((curr) => (curr === (cachedUser?.name ?? '') ? (next.name ?? curr) : curr))
        }
      })
      .catch(() => {
        /* refresh is best-effort; the cached email is the fallback */
      })
    return () => {
      cancelled = true
    }
  }, [http, authClient, cachedUser?.email, cachedUser?.name])

  async function handleSave() {
    const current = authClient.getState().user
    if (!email || email === current?.email || !current?.id) return
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      await http.patch(`/api/users/${current.id}`, { email })
      authClient.setUser({ ...current, email })
      setSaved(true)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('settings.failedToUpdateEmail', {}, { defaultValue: 'Could not update email.' }),
      )
      setEmail(current.email ?? '')
    } finally {
      setSaving(false)
    }
  }

  // The user resource's update handler accepts `name`; persist it on blur so
  // an edit is saved without an extra button (mirrors the shared AccountSection).
  async function handleSaveName() {
    const current = authClient.getState().user
    if (name === (current?.name ?? '') || !current?.id) return
    setSavingName(true)
    setNameError(null)
    try {
      await http.patch(`/api/users/${current.id}`, { name })
      authClient.setUser({ ...current, name })
    } catch (err) {
      setNameError(
        err instanceof Error
          ? err.message
          : t('settings.failedToUpdateName', {}, { defaultValue: 'Could not update name.' }),
      )
      setName(current.name ?? '')
    } finally {
      setSavingName(false)
    }
  }

  return (
    <section className={cardClass(cm)} data-mol-id="settings-account-email">
      <Flex align="center" gap="sm">
        <h2 className={headingClass(cm)}>
          {t('settings.account', {}, { defaultValue: 'Account' })}
        </h2>
        {saving || savingName ? <Spinner size="xs" /> : null}
      </Flex>
      <div className={cm.cn('space-y-1', 'max-w-md')}>
        <label
          htmlFor="settings-account-name-input"
          className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-on-surface-variant')}
        >
          {t('settings.name', {}, { defaultValue: 'Name' })}
        </label>
        <Input
          id="settings-account-name-input"
          data-mol-id="settings-account-name-input"
          type="text"
          value={name}
          autoComplete="name"
          onChange={(e) => {
            setName((e.target as HTMLInputElement).value)
            setNameError(null)
          }}
          onBlur={handleSaveName}
        />
        {nameError ? <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{nameError}</p> : null}
      </div>
      <div className={cm.cn('space-y-1', 'max-w-md')}>
        <label
          htmlFor="settings-account-email-input"
          className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-on-surface-variant')}
        >
          {t('settings.email', {}, { defaultValue: 'Email address' })}
        </label>
        <Input
          id="settings-account-email-input"
          data-mol-id="settings-account-email-input"
          type="email"
          value={email}
          autoComplete="email"
          onChange={(e) => {
            setEmail((e.target as HTMLInputElement).value)
            setSaved(false)
            setError(null)
          }}
        />
      </div>
      {error ? <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{error}</p> : null}
      <Flex align="center" gap="sm">
        <Button
          variant="outline"
          size="sm"
          data-mol-id="settings-account-email-save"
          loading={saving}
          onClick={handleSave}
        >
          {t('settings.saveEmail', {}, { defaultValue: 'Save email' })}
        </Button>
        {saved ? (
          <span className={cm.cn(cm.textSize('sm'), 'text-success')}>
            {t('common.savedPeriod', {}, { defaultValue: 'Saved.' })}
          </span>
        ) : null}
      </Flex>
    </section>
  )
}

interface TwoFactorSetup {
  QRImageUrl?: string
  keyUrl?: string
  secret?: string
}

function SecurityCard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth<UserProfile>()
  const http = useHttpClient()
  const { status, error, changePassword, reset } = useChangePassword()

  const userId = user?.id
  const isOAuth = Boolean((user as unknown as Record<string, unknown>)?.oauthServer)

  const [open, setOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [tfModal, setTfModal] = useState<null | 'enable' | 'disable'>(null)
  const [tfSetup, setTfSetup] = useState<TwoFactorSetup | null>(null)
  const [tfToken, setTfToken] = useState('')
  const [tfLoading, setTfLoading] = useState(false)
  const [tfError, setTfError] = useState<string | null>(null)

  // Read the persisted 2FA status from /users/me on mount. Skipped for
  // OAuth-only accounts, which don't use password / TOTP auth.
  useEffect(() => {
    if (isOAuth) return
    let cancelled = false
    http
      .get('/api/users/me')
      .then((res) => {
        if (cancelled) return
        const me = unwrapSingle<{
          twoFactorEnabled?: boolean
          props?: { twoFactorEnabled?: boolean }
        }>(res)
        setTwoFactorEnabled(Boolean(me?.twoFactorEnabled ?? me?.props?.twoFactorEnabled))
      })
      .catch(() => {
        /* status read is best-effort; defaults to disabled */
      })
    return () => {
      cancelled = true
    }
  }, [http, isOAuth])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await changePassword(currentPassword, newPassword)
      setOpen(false)
      setCurrentPassword('')
      setNewPassword('')
      reset()
    } catch (_error) {
      // Error is surfaced via the hook's `error` state inside the modal;
      // keep the modal open so the user can retry.
    }
  }

  function closeTf() {
    setTfModal(null)
    setTfSetup(null)
    setTfToken('')
    setTfError(null)
  }

  // Enable → request a TOTP secret + QR (`{action:'setup'}`); the user then
  // scans it and submits a 6-digit code (`{action:'enable', token}`).
  async function startEnable() {
    setTfError(null)
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

  // Submit the entered code to finish enabling or to disable 2FA. A 403 from
  // the endpoint (invalid code) surfaces inline so the user can retry.
  async function submitTf(action: 'enable' | 'disable') {
    setTfError(null)
    setTfLoading(true)
    try {
      await http.post(`/api/users/${userId}/verify-two-factor`, { action, token: tfToken })
      setTwoFactorEnabled(action === 'enable')
      closeTf()
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

  return (
    <section className={cardClass(cm)} data-mol-id="settings-account-security">
      <h2 className={headingClass(cm)}>
        {t('settings.authentication', {}, { defaultValue: 'Security' })}
      </h2>
      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
        {t(
          'settings.passwordHelp',
          {},
          { defaultValue: 'Update the password you use to sign in.' },
        )}
      </p>
      <Button
        variant="outline"
        size="sm"
        data-mol-id="settings-account-change-password"
        onClick={() => setOpen(true)}
      >
        {t('settings.changePassword', {}, { defaultValue: 'Change password' })}
      </Button>

      {isOAuth ? null : (
        <Flex align="center" justify="between">
          <span className={cm.cn(cm.textSize('sm'))}>
            {t('settings.twoFactor', {}, { defaultValue: 'Two-factor authentication' })}
            {twoFactorEnabled ? (
              <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', cm.sp('ml', 2))}>
                {t('settings.twoFactorOn', {}, { defaultValue: 'On' })}
              </span>
            ) : null}
          </span>
          {twoFactorEnabled ? (
            <Button
              variant="outline"
              size="sm"
              data-mol-id="settings-two-factor-disable"
              onClick={() => {
                setTfError(null)
                setTfToken('')
                setTfModal('disable')
              }}
            >
              {t('settings.twoFactorDisable', {}, { defaultValue: 'Disable' })}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              data-mol-id="settings-two-factor-enable"
              onClick={startEnable}
            >
              {t('settings.twoFactorEnable', {}, { defaultValue: 'Enable' })}
            </Button>
          )}
        </Flex>
      )}

      <Modal
        open={open}
        onClose={() => {
          setOpen(false)
          reset()
        }}
        title={t('settings.changePasswordModal.title', {}, { defaultValue: 'Change password' })}
      >
        {error ? (
          <Alert status="error" className={cm.sp('mb', 4)}>
            {error.message ||
              t(
                'settings.changePasswordModal.error',
                {},
                { defaultValue: 'Could not change password.' },
              )}
          </Alert>
        ) : null}
        <form onSubmit={handleSubmit} className={cm.cn('space-y-4')}>
          <div className={cm.cn('space-y-1')}>
            <label
              htmlFor="settings-current-password"
              className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}
            >
              {t(
                'settings.changePasswordModal.currentPassword',
                {},
                { defaultValue: 'Current password' },
              )}
            </label>
            <Input
              id="settings-current-password"
              type="password"
              value={currentPassword}
              autoComplete="current-password"
              required
              onChange={(e) => setCurrentPassword((e.target as HTMLInputElement).value)}
            />
          </div>
          <div className={cm.cn('space-y-1')}>
            <label
              htmlFor="settings-new-password"
              className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}
            >
              {t('settings.changePasswordModal.newPassword', {}, { defaultValue: 'New password' })}
            </label>
            <Input
              id="settings-new-password"
              type="password"
              value={newPassword}
              autoComplete="new-password"
              required
              onChange={(e) => setNewPassword((e.target as HTMLInputElement).value)}
            />
          </div>
          <Button
            type="submit"
            fullWidth
            loading={status === 'pending'}
            data-mol-id="settings-account-change-password-submit"
          >
            {status === 'pending'
              ? t('settings.changePasswordModal.changing', {}, { defaultValue: 'Changing…' })
              : t('settings.changePassword', {}, { defaultValue: 'Change password' })}
          </Button>
        </form>
      </Modal>

      <Modal
        open={tfModal !== null}
        onClose={closeTf}
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
        {tfModal === 'enable' && !tfSetup && tfLoading && !tfError ? (
          <Flex align="center" justify="center" className={cm.sp('py', 4)}>
            <Spinner size="sm" />
          </Flex>
        ) : null}
        {tfModal === 'enable' && tfSetup?.QRImageUrl ? (
          <div className={cm.cn('space-y-3', cm.sp('mb', 4))}>
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
              className={cm.cn('mx-auto', 'max-w-xs')}
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
              void submitTf(tfModal === 'disable' ? 'disable' : 'enable')
            }}
            className={cm.cn('space-y-4')}
          >
            <div className={cm.cn('space-y-1')}>
              <label
                htmlFor="settings-two-factor-token"
                className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}
              >
                {t('settings.twoFactorCode', {}, { defaultValue: 'Authentication code' })}
              </label>
              <Input
                id="settings-two-factor-token"
                data-mol-id="settings-two-factor-token"
                type="text"
                value={tfToken}
                autoComplete="one-time-code"
                required
                onChange={(e) => setTfToken((e.target as HTMLInputElement).value)}
              />
            </div>
            <Button
              type="submit"
              color={tfModal === 'disable' ? 'error' : undefined}
              fullWidth
              loading={tfLoading}
              data-mol-id="settings-two-factor-submit"
            >
              {tfModal === 'disable'
                ? t('settings.twoFactorDisable', {}, { defaultValue: 'Disable' })
                : t('settings.twoFactorVerify', {}, { defaultValue: 'Verify & enable' })}
            </Button>
          </form>
        ) : null}
      </Modal>
    </section>
  )
}

function PushNotificationsCard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { permission, requestPermission, register, unregister } = usePush()
  const [enabled, setEnabled] = useState(permission === 'granted')

  async function handleToggle(next: boolean) {
    try {
      if (next) {
        await requestPermission()
        await register()
        setEnabled(true)
      } else {
        await unregister()
        setEnabled(false)
      }
    } catch (_error) {
      // Permission denied or service worker unavailable — the switch simply
      // stays in its previous visual state. No data loss, no broken state.
    }
  }

  return (
    <section className={cardClass(cm)} data-mol-id="settings-account-push">
      <h2 className={headingClass(cm)}>
        {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
      </h2>
      <Flex align="center" justify="between">
        <span className={cm.cn(cm.textSize('sm'))}>
          {t('settings.pushNotifications', {}, { defaultValue: 'Push notifications' })}
        </span>
        <Switch
          checked={enabled}
          size="sm"
          data-mol-id="settings-account-push-toggle"
          onChange={(e) => handleToggle((e.target as HTMLInputElement).checked)}
        />
      </Flex>
    </section>
  )
}

interface Device {
  id: string
  name?: string
  platform?: string
  lastSeen?: string
  /** `true` for the device making the current request (the API marks it). */
  isCurrent?: boolean
}

function DevicesCard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [devices, setDevices] = useState<Device[] | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await http.get('/api/devices')
      setDevices(unwrapList<Device>(res))
    } catch (_error) {
      // Devices endpoint is optional; render the empty state when unavailable.
      setDevices([])
    }
  }, [http])

  useEffect(() => {
    load()
  }, [load])

  // Revoking deletes the device row; the API enforces server-side session
  // revocation, so the removed device is actually signed out. Refetch on
  // success so the list reflects the change.
  async function revoke(id: string) {
    setRevokingId(id)
    try {
      await http.delete(`/api/devices/${id}`)
      setConfirmingId(null)
      await load()
    } catch (_error) {
      // Best-effort — keep the row so the user can retry the revoke.
    } finally {
      setRevokingId(null)
    }
  }

  // Trailing control per row: the current device isn't revocable here (use
  // Sign out for the current session); other devices get an inline confirm
  // before the revoke fires.
  function trailing(device: Device) {
    if (device.isCurrent) return null
    if (confirmingId === device.id) {
      return (
        <Flex align="center" gap="sm">
          <Button
            variant="ghost"
            size="sm"
            disabled={revokingId === device.id}
            onClick={() => setConfirmingId(null)}
          >
            {t('common.cancel', {}, { defaultValue: 'Cancel' })}
          </Button>
          <Button
            color="error"
            size="sm"
            loading={revokingId === device.id}
            data-mol-id="settings-device-revoke-confirm"
            onClick={() => revoke(device.id)}
          >
            {t('settings.signOutDevice', {}, { defaultValue: 'Sign out' })}
          </Button>
        </Flex>
      )
    }
    return (
      <Button
        variant="ghost"
        size="sm"
        data-mol-id="settings-device-revoke"
        onClick={() => setConfirmingId(device.id)}
      >
        {t('settings.signOutDevice', {}, { defaultValue: 'Sign out' })}
      </Button>
    )
  }

  return (
    <section className={cardClass(cm)} data-mol-id="settings-account-devices">
      <Flex align="center" gap="sm">
        <h2 className={headingClass(cm)}>
          {t('settings.devices', {}, { defaultValue: 'Devices' })}
        </h2>
        {devices === null ? <Spinner size="xs" /> : null}
      </Flex>
      {devices === null ? null : devices.length === 0 ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('settings.noDevices', {}, { defaultValue: 'No registered devices.' })}
        </p>
      ) : (
        <ul className={cm.cn('space-y-2')}>
          {devices.map((device) => (
            <li
              key={device.id}
              className={cm.cn(cm.sp('py', 2), 'border-b border-outline-variant last:border-b-0')}
            >
              <Flex align="center" justify="between">
                <div>
                  <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                    {device.name ||
                      device.platform ||
                      t('settings.unknownDevice', {}, { defaultValue: 'Unknown device' })}
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
                  {device.name && device.platform ? (
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {device.platform}
                    </p>
                  ) : null}
                </div>
                {trailing(device)}
              </Flex>
              {confirmingId === device.id ? (
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', cm.sp('mt', 1))}>
                  {t(
                    'settings.revokeDeviceWarning',
                    {},
                    { defaultValue: "This device's access will be revoked shortly. Sign it out?" },
                  )}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function DangerZoneCard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, logout } = useAuth<UserProfile>()
  const http = useHttpClient()

  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await http.delete(`/api/users/${user?.id}`, { data: { password } })
      await logout()
      navigate('/login')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('settings.failedToDeleteAccount', {}, { defaultValue: 'Could not delete account.' }),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <section
      className={cm.cn(cm.sp('p', 5), 'space-y-3 rounded-xl border border-error/40 bg-error/5')}
      data-mol-id="settings-account-delete"
    >
      <h2 className={cm.cn(headingClass(cm), 'text-error')}>
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
        color="error"
        variant="outline"
        size="sm"
        data-mol-id="settings-account-delete-trigger"
        onClick={() => setOpen(true)}
      >
        {t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
      </Button>

      <Modal
        open={open}
        onClose={() => {
          setOpen(false)
          setError(null)
        }}
        title={t('settings.deleteAccountModal.title', {}, { defaultValue: 'Delete account' })}
      >
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mb', 4))}>
          {t(
            'settings.deleteAccountModal.confirm',
            {},
            { defaultValue: 'Enter your password to confirm. This action is permanent.' },
          )}
        </p>
        {error ? (
          <Alert status="error" className={cm.sp('mb', 4)}>
            {error}
          </Alert>
        ) : null}
        <form onSubmit={handleDelete} className={cm.cn('space-y-4')}>
          <div className={cm.cn('space-y-1')}>
            <label
              htmlFor="settings-delete-password"
              className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}
            >
              {t('settings.deleteAccountModal.password', {}, { defaultValue: 'Password' })}
            </label>
            <Input
              id="settings-delete-password"
              type="password"
              value={password}
              autoComplete="current-password"
              required
              onChange={(e) => setPassword((e.target as HTMLInputElement).value)}
            />
          </div>
          <Button
            type="submit"
            color="error"
            fullWidth
            loading={loading}
            data-mol-id="settings-account-delete-submit"
          >
            {loading
              ? t('settings.deleteAccountModal.deleting', {}, { defaultValue: 'Deleting…' })
              : t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
          </Button>
        </form>
      </Modal>
    </section>
  )
}
