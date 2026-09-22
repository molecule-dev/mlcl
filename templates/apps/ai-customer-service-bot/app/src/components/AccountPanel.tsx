/**
 * Account management panel — the user-account flows for Rapport agents.
 *
 * Mirrors the canonical `@molecule/app-settings-panel-react` sections
 * (AccountSection / AuthSection / DevicesSection / LogOutDeleteSection)
 * but is wired directly to the standard API endpoints with this app's
 * own ClassMap styling so it sits consistently inside the Settings
 * "Account" tab:
 *  - C6 name + email    → PATCH /api/users/:id (name saves on blur)
 *  - C4 password change  → useChangePassword() (canonical security route)
 *  - 2FA (TOTP)          → POST /api/users/:id/verify-two-factor (setup/enable/disable)
 *  - C5 notifications    → shared <NotificationsSection/> (usePush via @molecule/app-push)
 *  - C7 device list      → GET  /api/devices + DELETE /api/devices/:id (revoke/sign out)
 *  - C10 delete account  → DELETE /api/users/:id (password-confirm) → logout → /login
 *
 * Sign out (C9) lives in the SideNavBar and is intentionally not
 * duplicated here.
 */
import { type ReactNode, useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { del, get, patch, post } from '@molecule/app-http'
import { useAuth, useChangePassword, useTranslation } from '@molecule/app-react'
import { NotificationsSection } from '@molecule/app-settings-panel-react'
import { getClassMap } from '@molecule/app-ui'

interface AuthedUser {
  id?: string
  email?: string
  name?: string
  oauthServer?: string
}

interface DeviceRow {
  id: string
  name?: string
  platform?: string
  lastSeen?: string
  /** `true` for the device making the current request (the API marks it). */
  isCurrent?: boolean
}

interface TwoFactorSetup {
  QRImageUrl?: string
  keyUrl?: string
  secret?: string
}

const inputClass =
  'rounded-xl bg-surface-container-low border-transparent focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/30 outline-none'

function AccountModal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  const cm = getClassMap()
  const { t } = useTranslation()

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div
      data-mol-id="account-modal-backdrop"
      role="presentation"
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'center' }),
        cm.sp('p', 4),
        'fixed inset-0 z-50 bg-black/50',
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 4 }),
          cm.sp('p', 6),
          cm.w('full'),
          'max-w-md rounded-2xl bg-surface-container-lowest shadow-xl',
        )}
      >
        <div className={cm.flex({ align: 'center', justify: 'between' })}>
          <h3 className={cm.cn(cm.fontWeight('semibold'), cm.textSize('lg'), 'text-on-surface')}>
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.cancel', {}, { defaultValue: 'Cancel' })}
            className="text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function relativeSeen(value: string | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString()
}

function AccountPanel() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, logout, setUser } = useAuth<AuthedUser>()
  const {
    status: pwStatus,
    error: pwError,
    changePassword,
    reset: resetChangePassword,
  } = useChangePassword()

  const isOAuth = Boolean(user?.oauthServer)

  // C — display name (saves on blur)
  const [name, setName] = useState(user?.name ?? '')
  const [nameSaving, setNameSaving] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
  const [nameSaved, setNameSaved] = useState(false)

  // C6 — email
  const [email, setEmail] = useState(user?.email ?? '')
  const [emailSaving, setEmailSaving] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [emailSaved, setEmailSaved] = useState(false)

  // C4 — change password
  const [showPwModal, setShowPwModal] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  // 2FA — TOTP enrollment
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [tfModal, setTfModal] = useState<null | 'enable' | 'disable'>(null)
  const [tfSetup, setTfSetup] = useState<TwoFactorSetup | null>(null)
  const [tfToken, setTfToken] = useState('')
  const [tfLoading, setTfLoading] = useState(false)
  const [tfError, setTfError] = useState<string | null>(null)

  // C7 — devices
  const [devices, setDevices] = useState<DeviceRow[]>([])
  const [devicesLoading, setDevicesLoading] = useState(true)
  const [confirmingDeviceId, setConfirmingDeviceId] = useState<string | null>(null)
  const [revokingDeviceId, setRevokingDeviceId] = useState<string | null>(null)

  // C10 — delete account
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Keep the name + email fields hydrated once the auth user resolves.
  useEffect(() => {
    if (user?.name) setName((current) => current || (user.name as string))
  }, [user?.name])

  useEffect(() => {
    if (user?.email) setEmail((current) => current || (user.email as string))
  }, [user?.email])

  // Read the persisted 2FA status from /api/users/me on mount.
  useEffect(() => {
    let cancelled = false
    async function loadTwoFactor() {
      try {
        const response = await get<{
          props?: { twoFactorEnabled?: boolean }
          twoFactorEnabled?: boolean
        }>('/api/users/me')
        if (cancelled) return
        const body = response.data
        const record = body?.props ?? body
        setTwoFactorEnabled(Boolean(record?.twoFactorEnabled))
      } catch (_error) {
        // Status read is best-effort; defaults to disabled.
      }
    }
    void loadTwoFactor()
    return () => {
      cancelled = true
    }
  }, [])

  const loadDevices = useCallback(async () => {
    try {
      const response = await get<{ data: DeviceRow[] }>('/api/devices')
      setDevices(response.data?.data ?? [])
    } catch (_error) {
      // Devices endpoint is optional; the section renders empty when unavailable.
    } finally {
      setDevicesLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadDevices()
  }, [loadDevices])

  async function handleNameSave() {
    const trimmed = name.trim()
    if (trimmed === (user?.name ?? '')) return
    setNameSaving(true)
    setNameError(null)
    setNameSaved(false)
    try {
      await patch(`/api/users/${user?.id}`, { name: trimmed })
      if (user) setUser({ ...user, name: trimmed })
      setNameSaved(true)
    } catch (err) {
      setNameError(
        err instanceof Error
          ? err.message
          : t('settings.account.nameError', {}, { defaultValue: 'Failed to update name' }),
      )
      setName(user?.name ?? '')
    } finally {
      setNameSaving(false)
    }
  }

  async function handleEmailSave(e: React.FormEvent) {
    e.preventDefault()
    if (!email || email === user?.email) return
    setEmailSaving(true)
    setEmailError(null)
    setEmailSaved(false)
    try {
      await patch(`/api/users/${user?.id}`, { email })
      if (user) setUser({ ...user, email })
      setEmailSaved(true)
    } catch (err) {
      setEmailError(
        err instanceof Error
          ? err.message
          : t('settings.account.emailError', {}, { defaultValue: 'Failed to update email' }),
      )
      setEmail(user?.email ?? '')
    } finally {
      setEmailSaving(false)
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    try {
      await changePassword(currentPassword, newPassword)
      setShowPwModal(false)
      setCurrentPassword('')
      setNewPassword('')
      resetChangePassword()
    } catch (_error) {
      // Error surfaced via useChangePassword()'s `error`; keep the modal open.
    }
  }

  function closeTwoFactor() {
    setTfModal(null)
    setTfSetup(null)
    setTfToken('')
    setTfError(null)
  }

  async function startEnableTwoFactor() {
    setTfError(null)
    setTfToken('')
    setTfSetup(null)
    setTfLoading(true)
    setTfModal('enable')
    try {
      const response = await post<TwoFactorSetup>(`/api/users/${user?.id}/verify-two-factor`, {
        action: 'setup',
      })
      setTfSetup(response.data ?? null)
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

  async function submitTwoFactor(action: 'enable' | 'disable') {
    setTfError(null)
    setTfLoading(true)
    try {
      await post(`/api/users/${user?.id}/verify-two-factor`, { action, token: tfToken })
      setTwoFactorEnabled(action === 'enable')
      closeTwoFactor()
    } catch (err) {
      setTfError(
        err instanceof Error
          ? err.message
          : t('settings.security.twoFactorInvalid', {}, { defaultValue: 'Invalid code' }),
      )
    } finally {
      setTfLoading(false)
    }
  }

  async function revokeDevice(id: string) {
    setRevokingDeviceId(id)
    try {
      await del(`/api/devices/${id}`)
      setConfirmingDeviceId(null)
      await loadDevices()
    } catch (_error) {
      // Best-effort — keep the row so the user can retry the revoke.
    } finally {
      setRevokingDeviceId(null)
    }
  }

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault()
    setDeleting(true)
    setDeleteError(null)
    try {
      await del(`/api/users/${user?.id}`, { data: { password: deletePassword } })
      await logout()
      navigate('/login')
    } catch (err) {
      setDeleteError(
        err instanceof Error
          ? err.message
          : t('settings.danger.deleteError', {}, { defaultValue: 'Failed to delete account' }),
      )
    } finally {
      setDeleting(false)
    }
  }

  const headingClass = cm.cn(
    cm.fontWeight('semibold'),
    cm.textSize('lg'),
    'text-on-surface tracking-tight',
  )
  const labelClass = cm.cn(
    cm.fontWeight('semibold'),
    'text-[10px] tracking-widest uppercase text-on-surface-variant',
  )

  function renderDeviceAction(device: DeviceRow) {
    if (device.isCurrent) return null
    const revoking = revokingDeviceId === device.id
    if (confirmingDeviceId === device.id) {
      return (
        <div className={cm.flex({ align: 'center', gap: 2 })}>
          <button
            data-mol-id={`account-device-revoke-cancel-${device.id}`}
            type="button"
            disabled={revoking}
            onClick={() => setConfirmingDeviceId(null)}
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.textSize('xs'),
              cm.touchTargetCompact,
              'rounded-full bg-surface-container text-on-surface border border-outline-variant px-3 py-1.5 disabled:opacity-50',
            )}
          >
            {t('common.cancel', {}, { defaultValue: 'Cancel' })}
          </button>
          <button
            data-mol-id={`account-device-revoke-confirm-${device.id}`}
            type="button"
            disabled={revoking}
            onClick={() => void revokeDevice(device.id)}
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.textSize('xs'),
              cm.touchTargetCompact,
              'rounded-full bg-error text-on-error px-3 py-1.5 disabled:opacity-50',
            )}
          >
            {revoking
              ? t('settings.devices.signingOut', {}, { defaultValue: 'Signing out…' })
              : t('settings.devices.signOut', {}, { defaultValue: 'Sign out' })}
          </button>
        </div>
      )
    }
    return (
      <button
        data-mol-id={`account-device-revoke-${device.id}`}
        type="button"
        onClick={() => setConfirmingDeviceId(device.id)}
        className={cm.cn(
          cm.fontWeight('semibold'),
          cm.textSize('xs'),
          cm.touchTargetCompact,
          'rounded-full bg-error/10 text-error px-3 py-1.5',
        )}
      >
        {t('settings.devices.signOut', {}, { defaultValue: 'Sign out' })}
      </button>
    )
  }

  return (
    <div
      data-mol-id="settings-section-account"
      className={cm.cn(cm.flex({ direction: 'col', gap: 8 }))}
    >
      {/* C / C6 — Profile: name + email */}
      <section data-mol-id="account-profile" className={cm.flex({ direction: 'col', gap: 4 })}>
        <h2 className={headingClass}>
          {t('settings.account.title', {}, { defaultValue: 'Account' })}
        </h2>

        <div className={cm.cn(cm.flex({ direction: 'col', gap: 2 }))}>
          <label className={cm.cn(cm.flex({ direction: 'col', gap: 2 }))}>
            <span className={labelClass}>
              {t('settings.account.nameLabel', {}, { defaultValue: 'Display name' })}
            </span>
            <input
              data-mol-id="account-name-input"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setNameSaved(false)
              }}
              onBlur={() => void handleNameSave()}
              className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), cm.textSize('sm'), inputClass)}
            />
          </label>
          {nameSaving && (
            <span
              data-mol-id="account-name-saving"
              className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}
            >
              {t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })}
            </span>
          )}
          {nameSaved && (
            <span
              data-mol-id="account-name-saved"
              className={cm.cn(cm.textSize('xs'), 'text-primary')}
            >
              {t('settings.account.nameSaved', {}, { defaultValue: 'Name updated' })}
            </span>
          )}
          {nameError && (
            <span
              data-mol-id="account-name-error"
              className={cm.cn(cm.textSize('xs'), 'text-error')}
            >
              {nameError}
            </span>
          )}
        </div>

        <form onSubmit={handleEmailSave} className={cm.cn(cm.flex({ direction: 'col', gap: 3 }))}>
          <label className={cm.cn(cm.flex({ direction: 'col', gap: 2 }))}>
            <span className={labelClass}>
              {t('settings.account.emailLabel', {}, { defaultValue: 'Email address' })}
            </span>
            <input
              data-mol-id="account-email-input"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setEmailSaved(false)
              }}
              className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), cm.textSize('sm'), inputClass)}
            />
          </label>
          {emailSaved && (
            <span
              data-mol-id="account-email-saved"
              className={cm.cn(cm.textSize('xs'), 'text-primary')}
            >
              {t('settings.account.emailSaved', {}, { defaultValue: 'Email updated' })}
            </span>
          )}
          {emailError && (
            <span
              data-mol-id="account-email-error"
              className={cm.cn(cm.textSize('xs'), 'text-error')}
            >
              {emailError}
            </span>
          )}
          <button
            data-mol-id="account-email-save"
            type="submit"
            disabled={emailSaving || !email || email === user?.email}
            className={cm.cn(
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'self-start rounded-full bg-primary text-on-primary px-5 py-2 disabled:opacity-50',
            )}
          >
            {emailSaving
              ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
              : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
          </button>
        </form>
      </section>

      {/* C4 / 2FA — Security */}
      <section data-mol-id="account-security" className={cm.flex({ direction: 'col', gap: 4 })}>
        <h2 className={headingClass}>
          {t('settings.security.title', {}, { defaultValue: 'Security' })}
        </h2>
        {isOAuth ? (
          <p
            data-mol-id="account-oauth-note"
            className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
          >
            {t(
              'settings.security.oauthManaged',
              {},
              { defaultValue: 'Your password is managed by your sign-in provider.' },
            )}
          </p>
        ) : (
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 4 }))}>
            <button
              data-mol-id="account-change-password"
              type="button"
              onClick={() => setShowPwModal(true)}
              className={cm.cn(
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'self-start rounded-full bg-surface-container-low text-on-surface border border-outline-variant px-5 py-2 hover:bg-surface-container',
              )}
            >
              {t('settings.security.changePassword', {}, { defaultValue: 'Change password' })}
            </button>

            <div
              data-mol-id="account-two-factor"
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between', gap: 4 }),
                cm.sp('p', 4),
                'rounded-xl bg-surface-container-low',
              )}
            >
              <div className={cm.flex({ direction: 'col' })}>
                <span
                  className={cm.cn(cm.fontWeight('semibold'), cm.textSize('sm'), 'text-on-surface')}
                >
                  {t(
                    'settings.security.twoFactorTitle',
                    {},
                    { defaultValue: 'Two-factor authentication' },
                  )}
                  {twoFactorEnabled && (
                    <span
                      data-mol-id="account-two-factor-status"
                      className={cm.cn(cm.textSize('xs'), 'text-primary ml-2')}
                    >
                      {t('settings.security.twoFactorOn', {}, { defaultValue: 'On' })}
                    </span>
                  )}
                </span>
                <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  {t(
                    'settings.security.twoFactorDesc',
                    {},
                    {
                      defaultValue:
                        'Require a 6-digit code from an authenticator app when signing in.',
                    },
                  )}
                </span>
              </div>
              {twoFactorEnabled ? (
                <button
                  data-mol-id="account-two-factor-disable"
                  type="button"
                  onClick={() => {
                    setTfError(null)
                    setTfToken('')
                    setTfModal('disable')
                  }}
                  className={cm.cn(
                    cm.fontWeight('semibold'),
                    cm.textSize('xs'),
                    cm.touchTargetCompact,
                    'shrink-0 rounded-full bg-surface-container text-on-surface border border-outline-variant px-4 py-1.5 hover:bg-surface-container-high',
                  )}
                >
                  {t('settings.security.twoFactorDisable', {}, { defaultValue: 'Disable' })}
                </button>
              ) : (
                <button
                  data-mol-id="account-two-factor-enable"
                  type="button"
                  onClick={() => void startEnableTwoFactor()}
                  className={cm.cn(
                    cm.fontWeight('semibold'),
                    cm.textSize('xs'),
                    cm.touchTargetCompact,
                    'shrink-0 rounded-full bg-primary text-on-primary px-4 py-1.5',
                  )}
                >
                  {t('settings.security.twoFactorEnable', {}, { defaultValue: 'Enable' })}
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      {/* C5 — Push notifications (shared @molecule/app-push toggle) */}
      <section
        data-mol-id="account-notifications"
        className={cm.flex({ direction: 'col', gap: 4 })}
      >
        <NotificationsSection />
      </section>

      {/* C7 — Devices */}
      <section data-mol-id="account-devices" className={cm.flex({ direction: 'col', gap: 4 })}>
        <h2 className={headingClass}>
          {t('settings.devices.title', {}, { defaultValue: 'Devices' })}
        </h2>
        {devicesLoading ? (
          <span
            data-mol-id="account-devices-loading"
            className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
          >
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </span>
        ) : devices.length === 0 ? (
          <span
            data-mol-id="account-devices-empty"
            className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
          >
            {t('settings.devices.empty', {}, { defaultValue: 'No devices registered.' })}
          </span>
        ) : (
          <ul className={cm.cn(cm.flex({ direction: 'col', gap: 2 }))}>
            {devices.map((device) => (
              <li
                key={device.id}
                data-mol-id={`account-device-${device.id}`}
                className="rounded-xl bg-surface-container-low"
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between', gap: 3 }),
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                  )}
                >
                  <div className={cm.flex({ align: 'center', gap: 3 })}>
                    <span className="material-symbols-outlined text-on-surface-variant">
                      devices
                    </span>
                    <span className={cm.cn(cm.textSize('sm'), 'text-on-surface')}>
                      {device.name || device.platform || device.id}
                      {device.isCurrent && (
                        <span
                          data-mol-id={`account-device-current-${device.id}`}
                          className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant ml-2')}
                        >
                          {t('settings.devices.thisDevice', {}, { defaultValue: 'This device' })}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className={cm.flex({ align: 'center', gap: 3 })}>
                    {relativeSeen(device.lastSeen) && (
                      <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {relativeSeen(device.lastSeen)}
                      </span>
                    )}
                    {renderDeviceAction(device)}
                  </div>
                </div>
                {confirmingDeviceId === device.id && (
                  <p
                    data-mol-id={`account-device-revoke-warning-${device.id}`}
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.sp('px', 4),
                      cm.sp('pb', 3),
                      'text-on-surface-variant',
                    )}
                  >
                    {t(
                      'settings.devices.revokeWarning',
                      {},
                      {
                        defaultValue: "This device's access will be revoked shortly. Sign it out?",
                      },
                    )}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* C10 — Danger zone / delete account */}
      <section data-mol-id="account-danger" className={cm.flex({ direction: 'col', gap: 4 })}>
        <h2
          className={cm.cn(
            cm.fontWeight('semibold'),
            cm.textSize('lg'),
            'text-error tracking-tight',
          )}
        >
          {t('settings.danger.title', {}, { defaultValue: 'Danger zone' })}
        </h2>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'settings.danger.deleteWarning',
            {},
            {
              defaultValue:
                'This permanently deletes your account and all associated data. This cannot be undone.',
            },
          )}
        </p>
        <button
          data-mol-id="account-delete"
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className={cm.cn(
            cm.fontWeight('semibold'),
            cm.textSize('sm'),
            'self-start rounded-full bg-error/10 text-error px-5 py-2 hover:bg-error/20',
          )}
        >
          {t('settings.danger.deleteAccount', {}, { defaultValue: 'Delete account' })}
        </button>
      </section>

      {showPwModal && (
        <AccountModal
          title={t('settings.security.changePassword', {}, { defaultValue: 'Change password' })}
          onClose={() => {
            setShowPwModal(false)
            resetChangePassword()
          }}
        >
          <form
            onSubmit={handleChangePassword}
            className={cm.cn(cm.flex({ direction: 'col', gap: 4 }))}
          >
            {pwError && (
              <div
                data-mol-id="account-password-error"
                role="alert"
                className={cm.cn(cm.sp('p', 3), 'rounded-lg bg-error/10 text-error text-sm')}
              >
                {pwError.message ||
                  t(
                    'settings.security.changePasswordError',
                    {},
                    { defaultValue: 'Failed to change password' },
                  )}
              </div>
            )}
            <label className={cm.cn(cm.flex({ direction: 'col', gap: 2 }))}>
              <span
                className={cm.cn(cm.fontWeight('medium'), cm.textSize('sm'), 'text-on-surface')}
              >
                {t('settings.security.currentPassword', {}, { defaultValue: 'Current password' })}
              </span>
              <input
                data-mol-id="account-current-password"
                type="password"
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), cm.textSize('sm'), inputClass)}
              />
            </label>
            <label className={cm.cn(cm.flex({ direction: 'col', gap: 2 }))}>
              <span
                className={cm.cn(cm.fontWeight('medium'), cm.textSize('sm'), 'text-on-surface')}
              >
                {t('settings.security.newPassword', {}, { defaultValue: 'New password' })}
              </span>
              <input
                data-mol-id="account-new-password"
                type="password"
                autoComplete="new-password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), cm.textSize('sm'), inputClass)}
              />
            </label>
            <button
              data-mol-id="account-change-password-submit"
              type="submit"
              disabled={pwStatus === 'pending'}
              className={cm.cn(
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'rounded-full bg-primary text-on-primary px-5 py-2 disabled:opacity-50',
              )}
            >
              {pwStatus === 'pending'
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('settings.security.changePassword', {}, { defaultValue: 'Change password' })}
            </button>
          </form>
        </AccountModal>
      )}

      {tfModal && (
        <AccountModal
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
          onClose={closeTwoFactor}
        >
          {tfError && (
            <div
              data-mol-id="account-two-factor-error"
              role="alert"
              className={cm.cn(cm.sp('p', 3), 'rounded-lg bg-error/10 text-error text-sm')}
            >
              {tfError}
            </div>
          )}
          {tfModal === 'enable' && !tfSetup && !tfError && (
            <span
              data-mol-id="account-two-factor-loading"
              className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
            >
              {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
            </span>
          )}
          {tfModal === 'enable' && tfSetup?.QRImageUrl && (
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 3 }))}>
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
                data-mol-id="account-two-factor-qr"
                src={tfSetup.QRImageUrl}
                alt={t(
                  'settings.security.twoFactorQrAlt',
                  {},
                  { defaultValue: 'Two-factor QR code' },
                )}
                className="mx-auto max-w-[200px]"
              />
              {tfSetup.secret && (
                <p
                  data-mol-id="account-two-factor-secret"
                  className={cm.cn(
                    cm.textSize('xs'),
                    'text-on-surface-variant text-center break-all',
                  )}
                >
                  {tfSetup.secret}
                </p>
              )}
            </div>
          )}
          {(tfModal === 'disable' || tfSetup) && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                void submitTwoFactor(tfModal === 'disable' ? 'disable' : 'enable')
              }}
              className={cm.cn(cm.flex({ direction: 'col', gap: 4 }))}
            >
              <label className={cm.cn(cm.flex({ direction: 'col', gap: 2 }))}>
                <span
                  className={cm.cn(cm.fontWeight('medium'), cm.textSize('sm'), 'text-on-surface')}
                >
                  {t(
                    'settings.security.twoFactorCode',
                    {},
                    { defaultValue: 'Authentication code' },
                  )}
                </span>
                <input
                  data-mol-id="account-two-factor-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  value={tfToken}
                  onChange={(e) => setTfToken(e.target.value)}
                  className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), cm.textSize('sm'), inputClass)}
                />
              </label>
              <button
                data-mol-id="account-two-factor-submit"
                type="submit"
                disabled={tfLoading}
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  'rounded-full px-5 py-2 disabled:opacity-50',
                  tfModal === 'disable' ? 'bg-error text-on-error' : 'bg-primary text-on-primary',
                )}
              >
                {tfLoading
                  ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                  : tfModal === 'disable'
                    ? t('settings.security.twoFactorDisable', {}, { defaultValue: 'Disable' })
                    : t(
                        'settings.security.twoFactorVerify',
                        {},
                        { defaultValue: 'Verify & enable' },
                      )}
              </button>
            </form>
          )}
        </AccountModal>
      )}

      {showDeleteModal && (
        <AccountModal
          title={t('settings.danger.deleteAccount', {}, { defaultValue: 'Delete account' })}
          onClose={() => {
            setShowDeleteModal(false)
            setDeleteError(null)
            setDeletePassword('')
          }}
        >
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'settings.danger.deleteWarning',
              {},
              {
                defaultValue:
                  'This permanently deletes your account and all associated data. This cannot be undone.',
              },
            )}
          </p>
          <form onSubmit={handleDelete} className={cm.cn(cm.flex({ direction: 'col', gap: 4 }))}>
            {deleteError && (
              <div
                data-mol-id="account-delete-error"
                role="alert"
                className={cm.cn(cm.sp('p', 3), 'rounded-lg bg-error/10 text-error text-sm')}
              >
                {deleteError}
              </div>
            )}
            <label className={cm.cn(cm.flex({ direction: 'col', gap: 2 }))}>
              <span
                className={cm.cn(cm.fontWeight('medium'), cm.textSize('sm'), 'text-on-surface')}
              >
                {t('settings.danger.passwordLabel', {}, { defaultValue: 'Confirm your password' })}
              </span>
              <input
                data-mol-id="account-delete-password"
                type="password"
                autoComplete="current-password"
                required
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), cm.textSize('sm'), inputClass)}
              />
            </label>
            <button
              data-mol-id="account-delete-submit"
              type="submit"
              disabled={deleting}
              className={cm.cn(
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'rounded-full bg-error text-on-error px-5 py-2 disabled:opacity-50',
              )}
            >
              {deleting
                ? t('settings.danger.deleting', {}, { defaultValue: 'Deleting…' })
                : t('settings.danger.deleteAccount', {}, { defaultValue: 'Delete account' })}
            </button>
          </form>
        </AccountModal>
      )}
    </div>
  )
}

export default AccountPanel
export { AccountPanel }
