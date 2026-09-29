import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import {
  useAuth,
  useChangePassword,
  useHttpClient,
  usePush,
  useTranslation,
} from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import {
  Alert,
  Button,
  Input,
  LanguagePicker,
  Modal,
  Switch,
  ThemeToggle,
} from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

const SECTIONS = ['account', 'integrations', 'api_keys', 'team', 'language'] as const
type Section = (typeof SECTIONS)[number]

interface DataSource {
  key: string
  label: string
  status: 'connected' | 'available'
}

const DATA_SOURCE_LABELS: Record<string, string> = {
  snowflake: 'Snowflake',
  bigquery: 'BigQuery',
  redshift: 'Redshift',
  postgres: 'PostgreSQL',
  s3_parquet: 'S3 Parquet',
}

interface ProfileShape {
  id?: string
  display_name: string
  email: string
  organization: string
  joined: string | null
}

interface SettingsShape {
  organization: string
  preferences: Record<string, unknown>
  integrations: Record<string, 'connected' | 'available'>
}

interface ApiKey {
  id: string
  name: string
  key_masked: string
  scopes?: string | string[]
  last_used_at?: string | null
  created_at?: string | null
  key?: string
}

interface TeamMember {
  id: string
  name: string
  email: string
  role: string
}

interface DeviceRow {
  id: string
  name?: string
  platform?: string
  lastSeen?: string
  // The API marks the device making the current request; it is labelled
  // "This device" and is not revocable here (use Sign out for the current session).
  isCurrent?: boolean
}

interface TwoFactorSetup {
  QRImageUrl?: string
  keyUrl?: string
  secret?: string
}

function isSection(value: string): value is Section {
  return (SECTIONS as readonly string[]).includes(value)
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const http = useHttpClient()
  const navigate = useNavigate()
  const location = useLocation()
  const { status: pwStatus, error: pwError, changePassword, reset: resetPw } = useChangePassword()
  const { permission, requestPermission, register, unregister } = usePush()
  const userId = (user as { id?: string } | null)?.id
  // Password / 2FA don't apply to OAuth-only accounts (matches the shared AuthSection).
  const isOAuthUser = Boolean((user as { oauthServer?: unknown } | null)?.oauthServer)
  const hashSection = location.hash.replace(/^#/, '')
  // Hash is the source of truth: navigating to `/settings` (without hash)
  // shows account, navigating to `/settings#integrations` shows integrations.
  const section: Section = isSection(hashSection) ? hashSection : 'account'

  function handleSectionClick(s: Section) {
    navigate(`/settings#${s}`)
  }

  const [sources, setSources] = useState<DataSource[]>(() =>
    Object.entries(DATA_SOURCE_LABELS).map(([key, label]) => ({
      key,
      label,
      status: 'available' as const,
    })),
  )
  const [team, setTeam] = useState<TeamMember[]>([])
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyPlaintext, setNewKeyPlaintext] = useState<string | null>(null)
  const [creatingKey, setCreatingKey] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [statusKind, setStatusKind] = useState<'success' | 'error'>('success')
  const [displayName, setDisplayName] = useState<string>('')
  const [emailValue, setEmailValue] = useState<string>('')
  const [orgValue, setOrgValue] = useState<string>('')
  const [savingAccount, setSavingAccount] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  // Real TOTP enrollment flow (POST /api/users/:id/verify-two-factor), replacing
  // the previous dead boolean toggle that PATCHed an ignored `twoFactorEnabled`.
  const [tfModal, setTfModal] = useState<null | 'enable' | 'disable'>(null)
  const [tfSetup, setTfSetup] = useState<TwoFactorSetup | null>(null)
  const [tfToken, setTfToken] = useState('')
  const [tfLoading, setTfLoading] = useState(false)
  const [tfError, setTfError] = useState('')
  const [pushEnabled, setPushEnabled] = useState(permission === 'granted')
  const [devices, setDevices] = useState<DeviceRow[]>([])
  const [devicesLoading, setDevicesLoading] = useState(true)
  const [confirmingDeviceId, setConfirmingDeviceId] = useState<string | null>(null)
  const [revokingDeviceId, setRevokingDeviceId] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  function flash(message: string, kind: 'success' | 'error' = 'success') {
    setStatusKind(kind)
    setStatusMessage(message)
    window.setTimeout(() => setStatusMessage((cur) => (cur === message ? null : cur)), 3000)
  }

  // Initial profile + settings + api_keys load. Team list is owner-only by
  // design — molecule's user resource doesn't expose `GET /api/users`, so we
  // show the current user as the workspace owner.
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const [profileRes, settingsRes, keysRes] = await Promise.all([
        http.get('/api/profile/me').catch(() => null),
        http.get('/api/settings').catch(() => null),
        http.get('/api/api_keys').catch(() => []),
      ])
      if (cancelled) return

      const profile = unwrapSingle<ProfileShape>(profileRes)
      if (profile) {
        setDisplayName(profile.display_name ?? '')
        setEmailValue(profile.email ?? '')
        setOrgValue(profile.organization ?? '')
        setTeam([
          {
            id: profile.id ?? 'me',
            name: profile.display_name || profile.email || 'Owner',
            email: profile.email,
            role: 'Owner',
          } as TeamMember,
        ])
      } else {
        setDisplayName((user as { name?: string } | null)?.name ?? '')
        setEmailValue((user as { email?: string } | null)?.email ?? '')
      }

      const settings = unwrapSingle<SettingsShape>(settingsRes)
      if (settings) {
        if (!profile) setOrgValue(settings.organization ?? '')
        setSources(
          Object.entries(DATA_SOURCE_LABELS).map(([key, label]) => ({
            key,
            label,
            status: settings.integrations?.[key] === 'connected' ? 'connected' : 'available',
          })),
        )
      }

      setApiKeys(unwrapList<ApiKey>(keysRes))
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [http, user])

  // Registered devices (GET /api/devices) — endpoint is optional; render empty if unavailable.
  const loadDevices = useCallback(async () => {
    try {
      const res = await http.get('/api/devices')
      setDevices(unwrapList<DeviceRow>(res))
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)))
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
    if (isOAuthUser) return
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
      .catch((err) => {
        logError(err instanceof Error ? err : new Error(String(err)))
      })
    return () => {
      cancelled = true
    }
  }, [http, isOAuthUser])

  async function handleConnectSource(key: string) {
    const next =
      sources.find((s) => s.key === key)?.status === 'connected' ? 'available' : 'connected'
    try {
      await http.put(`/api/settings/integrations/${key}`, { status: next })
      setSources((prev) => prev.map((s) => (s.key === key ? { ...s, status: next } : s)))
      flash(
        t(
          'settings.integrations.connected',
          { source: key },
          { defaultValue: 'Updated connection for {{source}}.' },
        ),
      )
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)))
      flash(
        t('settings.integrations.error', {}, { defaultValue: 'Could not update integration.' }),
        'error',
      )
    }
  }

  async function handleCreateKey(e: React.FormEvent) {
    e.preventDefault()
    if (!newKeyName.trim()) return
    setCreatingKey(true)
    try {
      const res = await http.post('/api/api_keys', { name: newKeyName.trim() })
      const created = unwrapSingle<ApiKey>(res)
      if (created?.key) setNewKeyPlaintext(created.key)
      const list = await http.get('/api/api_keys').catch(() => [])
      setApiKeys(unwrapList<ApiKey>(list))
      setNewKeyName('')
      flash(t('settings.apiKeys.created', {}, { defaultValue: 'New API key generated.' }))
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)))
      flash(
        t('settings.apiKeys.createError', {}, { defaultValue: 'Could not create API key.' }),
        'error',
      )
    } finally {
      setCreatingKey(false)
    }
  }

  async function handleRotateKey(id: string) {
    try {
      const res = await http.post(`/api/api_keys/${id}/rotate`, {})
      const rotated = unwrapSingle<ApiKey>(res)
      if (rotated?.key) setNewKeyPlaintext(rotated.key)
      const list = await http.get('/api/api_keys').catch(() => [])
      setApiKeys(unwrapList<ApiKey>(list))
      flash(
        t(
          'settings.apiKeys.rotated',
          {},
          { defaultValue: 'API key rotated. Update your integrations.' },
        ),
      )
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)))
      flash(
        t('settings.apiKeys.rotateError', {}, { defaultValue: 'Could not rotate API key.' }),
        'error',
      )
    }
  }

  async function handleDeleteKey(id: string) {
    try {
      await http.delete(`/api/api_keys/${id}`)
      setApiKeys((prev) => prev.filter((k) => k.id !== id))
      flash(t('settings.apiKeys.deleted', {}, { defaultValue: 'API key revoked.' }))
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)))
      flash(
        t('settings.apiKeys.deleteError', {}, { defaultValue: 'Could not revoke API key.' }),
        'error',
      )
    }
  }

  async function handleSaveAccount(e: React.FormEvent) {
    e.preventDefault()
    setSavingAccount(true)
    try {
      const res = await http.patch('/api/profile/me', {
        display_name: displayName,
        email: emailValue,
        organization: orgValue,
      })
      const fresh = unwrapSingle<ProfileShape>(res)
      if (fresh) {
        setDisplayName(fresh.display_name)
        setEmailValue(fresh.email)
        setOrgValue(fresh.organization)
      }
      flash(t('settings.account.saved', {}, { defaultValue: 'Account details saved.' }))
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)))
      flash(
        t('settings.account.saveError', {}, { defaultValue: 'Could not save account details.' }),
        'error',
      )
    } finally {
      setSavingAccount(false)
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    try {
      await changePassword(currentPassword, newPassword)
      setShowPasswordModal(false)
      setCurrentPassword('')
      setNewPassword('')
      resetPw()
      flash(t('settings.account.passwordChanged', {}, { defaultValue: 'Password changed.' }))
    } catch (_error) {
      // The error is surfaced inline in the modal via `pwError` from useChangePassword.
    }
  }

  function closeTwoFactor() {
    setTfModal(null)
    setTfSetup(null)
    setTfToken('')
    setTfError('')
  }

  async function startEnableTwoFactor() {
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
              {
                defaultValue: 'Two-factor authentication is not available for this app.',
              },
            ),
      )
    } finally {
      setTfLoading(false)
    }
  }

  async function submitTwoFactor(action: 'enable' | 'disable') {
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

  async function handleRevokeDevice(id: string) {
    setRevokingDeviceId(id)
    try {
      await http.delete(`/api/devices/${id}`)
      setConfirmingDeviceId(null)
      await loadDevices()
    } catch (err) {
      // Best-effort — keep the row so the user can retry the revoke.
      logError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setRevokingDeviceId(null)
    }
  }

  async function handleTogglePush(next: boolean) {
    try {
      if (next) {
        await requestPermission()
        await register()
        setPushEnabled(true)
      } else {
        await unregister()
        setPushEnabled(false)
      }
    } catch (err) {
      // Permission denied or service worker unavailable — leave the switch as-is.
      logError(err instanceof Error ? err : new Error(String(err)))
    }
  }

  async function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault()
    setDeleteLoading(true)
    setDeleteError('')
    try {
      await http.delete(`/api/users/${userId}`, { data: { password: deletePassword } })
      await logout()
      navigate('/login')
    } catch (err) {
      setDeleteError(
        err instanceof Error
          ? err.message
          : t('settings.failedToDeleteAccount', {}, { defaultValue: 'Could not delete account.' }),
      )
    } finally {
      setDeleteLoading(false)
    }
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
                onClick={() => handleSectionClick(s)}
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
                data-mol-id={`settings-section-${s}`}
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

      <main className={'col-span-12 md:col-span-9 space-y-4'}>
        {statusMessage ? (
          <p
            role="status"
            data-mol-id="settings-status"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              'rounded-md',
              statusKind === 'error'
                ? 'bg-error-container text-on-error-container'
                : 'bg-success-container text-on-success-container',
            )}
          >
            {statusMessage}
          </p>
        ) : null}

        {section === 'account' && (
          <>
            <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-4')}>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                {t('settings.account.heading', {}, { defaultValue: 'Account' })}
              </h2>
              <form onSubmit={handleSaveAccount} className={'space-y-4'}>
                <Field
                  label={t('form.displayName', {}, { defaultValue: 'Display name' })}
                  value={displayName}
                  onChange={setDisplayName}
                  molId="settings-display-name"
                />
                <Field
                  label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
                  type="email"
                  value={emailValue}
                  onChange={setEmailValue}
                  molId="settings-email"
                />
                <Field
                  label={t('form.organization', {}, { defaultValue: 'Organization' })}
                  value={orgValue}
                  onChange={setOrgValue}
                  placeholder={t(
                    'settings.account.orgPlaceholder',
                    {},
                    { defaultValue: 'Your team or company' },
                  )}
                  molId="settings-organization"
                />
                <button
                  type="submit"
                  disabled={savingAccount}
                  data-mol-id="settings-save-account"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.fontWeight('semibold'),
                    'bg-primary text-on-primary rounded-md disabled:opacity-50',
                  )}
                >
                  {savingAccount
                    ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                    : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
                </button>
              </form>
            </section>

            {!isOAuthUser && (
              <section
                className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-4')}
                data-mol-id="settings-security"
              >
                <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                  {t('settings.security.heading', {}, { defaultValue: 'Security' })}
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPasswordModal(true)}
                  data-mol-id="settings-change-password"
                >
                  {t('settings.changePassword', {}, { defaultValue: 'Change password' })}
                </Button>
                <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                  <span className={cm.textSize('sm')}>
                    {t('settings.twoFactor', {}, { defaultValue: 'Two-factor authentication' })}
                    {twoFactorEnabled ? (
                      <span
                        className={cm.cn(
                          cm.textSize('xs'),
                          'text-on-surface-variant',
                          cm.sp('ml', 2),
                        )}
                      >
                        {t('settings.twoFactorOn', {}, { defaultValue: 'On' })}
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
                      data-mol-id="settings-two-factor-disable"
                    >
                      {t('settings.twoFactorDisable', {}, { defaultValue: 'Disable' })}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={startEnableTwoFactor}
                      data-mol-id="settings-two-factor-enable"
                    >
                      {t('settings.twoFactorEnable', {}, { defaultValue: 'Enable' })}
                    </Button>
                  )}
                </div>
              </section>
            )}

            <section
              className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}
              data-mol-id="settings-push"
            >
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
              </h2>
              <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                <span className={cm.textSize('sm')}>
                  {t('settings.pushNotifications', {}, { defaultValue: 'Push notifications' })}
                </span>
                <Switch
                  checked={pushEnabled}
                  onChange={(e) => handleTogglePush((e.target as HTMLInputElement).checked)}
                  size="sm"
                />
              </div>
            </section>

            <section
              className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}
              data-mol-id="settings-devices"
            >
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                {t('settings.devices', {}, { defaultValue: 'Devices' })}
              </h2>
              {devicesLoading ? (
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
                </p>
              ) : devices.length === 0 ? (
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t('settings.noDevices', {}, { defaultValue: 'No devices found.' })}
                </p>
              ) : (
                <ul className={'space-y-2'}>
                  {devices.map((d) => (
                    <li
                      key={d.id}
                      data-mol-id={`settings-device-${d.id}`}
                      className={cm.cn(
                        cm.sp('py', 2),
                        'border-b border-outline-variant last:border-b-0',
                      )}
                    >
                      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                        <div>
                          <span className={cm.textSize('sm')}>
                            {d.name ||
                              d.platform ||
                              t('settings.unknown', {}, { defaultValue: 'Unknown device' })}
                            {d.isCurrent ? (
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
                          {d.lastSeen ? (
                            <span
                              className={cm.cn(
                                cm.textSize('xs'),
                                'text-on-surface-variant',
                                'block',
                              )}
                            >
                              {d.lastSeen}
                            </span>
                          ) : null}
                        </div>
                        {d.isCurrent ? null : confirmingDeviceId === d.id ? (
                          <span className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
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
                              data-mol-id={`settings-device-${d.id}-revoke-confirm`}
                            >
                              {t('settings.signOutDevice', {}, { defaultValue: 'Sign out' })}
                            </Button>
                          </span>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmingDeviceId(d.id)}
                            data-mol-id={`settings-device-${d.id}-revoke`}
                          >
                            {t('settings.signOutDevice', {}, { defaultValue: 'Sign out' })}
                          </Button>
                        )}
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

            <section
              className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}
              data-mol-id="settings-danger-zone"
            >
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'text-error')}>
                {t('settings.dangerZone', {}, { defaultValue: 'Danger zone' })}
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
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                data-mol-id="settings-delete-account"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  'bg-error text-on-error rounded-md',
                )}
              >
                {t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
              </button>
            </section>

            <Modal
              open={showPasswordModal}
              onClose={() => {
                setShowPasswordModal(false)
                resetPw()
              }}
              title={t(
                'settings.changePasswordModal.title',
                {},
                { defaultValue: 'Change password' },
              )}
            >
              {pwError ? (
                <Alert status="error" className={cm.sp('mb', 4)}>
                  {pwError.message ||
                    t(
                      'settings.changePasswordModal.error',
                      {},
                      { defaultValue: 'Could not change password.' },
                    )}
                </Alert>
              ) : null}
              <form onSubmit={handleChangePassword} className={'space-y-4'}>
                <label className={'block'}>
                  <span
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('medium'),
                      'block',
                      cm.sp('mb', 1),
                    )}
                  >
                    {t(
                      'settings.changePasswordModal.currentPassword',
                      {},
                      { defaultValue: 'Current password' },
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
                <label className={'block'}>
                  <span
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('medium'),
                      'block',
                      cm.sp('mb', 1),
                    )}
                  >
                    {t(
                      'settings.changePasswordModal.newPassword',
                      {},
                      { defaultValue: 'New password' },
                    )}
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
                      'Permanently delete your account and all associated data. This cannot be undone.',
                  },
                )}
              </p>
              {deleteError ? (
                <Alert status="error" className={cm.sp('mb', 4)}>
                  {deleteError}
                </Alert>
              ) : null}
              <form onSubmit={handleDeleteAccount} className={'space-y-4'}>
                <label className={'block'}>
                  <span
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('medium'),
                      'block',
                      cm.sp('mb', 1),
                    )}
                  >
                    {t(
                      'settings.deleteAccountModal.password',
                      {},
                      { defaultValue: 'Confirm your password' },
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
                <Button type="submit" color="error" fullWidth loading={deleteLoading}>
                  {deleteLoading
                    ? t('settings.deleteAccountModal.deleting', {}, { defaultValue: 'Deleting…' })
                    : t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
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
                      {
                        defaultValue: 'Disable two-factor authentication',
                      },
                    )
                  : t(
                      'settings.twoFactorEnableTitle',
                      {},
                      {
                        defaultValue: 'Enable two-factor authentication',
                      },
                    )
              }
            >
              {tfError ? (
                <Alert status="error" className={cm.sp('mb', 4)}>
                  {tfError}
                </Alert>
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
                  className={'space-y-4'}
                >
                  <label className={'block'}>
                    <span
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('medium'),
                        'block',
                        cm.sp('mb', 1),
                      )}
                    >
                      {t('settings.twoFactorCode', {}, { defaultValue: 'Authentication code' })}
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
                      ? t('settings.twoFactorDisable', {}, { defaultValue: 'Disable' })
                      : t('settings.twoFactorVerify', {}, { defaultValue: 'Verify & enable' })}
                  </Button>
                </form>
              ) : null}
            </Modal>
          </>
        )}

        {section === 'integrations' && (
          <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t('settings.integrations.heading', {}, { defaultValue: 'Data sources' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'settings.integrations.body',
                {},
                {
                  defaultValue:
                    'Connect a warehouse to query live data instead of uploading files.',
                },
              )}
            </p>
            <ul className={'space-y-2'}>
              {sources.map((src) => (
                <li
                  key={src.key}
                  data-mol-id={`settings-integration-${src.key}`}
                  data-status={src.status}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('py', 2),
                    'border-b border-outline-variant last:border-b-0',
                  )}
                >
                  <span className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
                    <span>{src.label}</span>
                    {src.status === 'connected' ? (
                      <span
                        className={cm.cn(
                          cm.sp('px', 2),
                          cm.textSize('xs'),
                          cm.fontWeight('semibold'),
                          cm.roundedFull,
                          'bg-success/15 text-success',
                        )}
                      >
                        {t('settings.integrations.connectedTag', {}, { defaultValue: 'connected' })}
                      </span>
                    ) : null}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleConnectSource(src.key)}
                    data-mol-id={`settings-integration-${src.key}-toggle`}
                    className={cm.cn(cm.textSize('sm'), cm.textPrimary, 'hover:underline')}
                  >
                    {src.status === 'connected'
                      ? t('common.disconnect', {}, { defaultValue: 'Disconnect' })
                      : t('common.connect', {}, { defaultValue: 'Connect' })}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {section === 'api_keys' && (
          <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-4')}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t('settings.apiKeys.heading', {}, { defaultValue: 'API keys' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'settings.apiKeys.body',
                { appName: APP_NAME },
                {
                  defaultValue:
                    'Use the {{appName}} API to embed query results into other tools. The full key is shown once.',
                },
              )}
            </p>

            <form onSubmit={handleCreateKey} className={cm.cn(cm.flex({ gap: 'sm' }))}>
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder={t(
                  'settings.apiKeys.namePlaceholder',
                  {},
                  { defaultValue: 'Key name (e.g. CI bot)' },
                )}
                data-mol-id="settings-apikey-name"
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  'flex-1 border border-outline-variant rounded-md',
                )}
              />
              <button
                type="submit"
                disabled={creatingKey || !newKeyName.trim()}
                data-mol-id="settings-apikey-create"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  'bg-primary text-on-primary rounded-md disabled:opacity-50',
                )}
              >
                {creatingKey
                  ? t('settings.apiKeys.creating', {}, { defaultValue: 'Generating…' })
                  : t('settings.apiKeys.createCta', {}, { defaultValue: 'Generate' })}
              </button>
            </form>

            {newKeyPlaintext ? (
              <div
                data-mol-id="settings-apikey-plaintext"
                className={cm.cn(
                  cm.sp('p', 3),
                  'bg-warning-container text-on-warning-container rounded-md font-mono text-xs break-all',
                )}
              >
                <p className={cm.cn(cm.fontWeight('semibold'), 'mb-1 not-italic font-sans')}>
                  {t(
                    'settings.apiKeys.copyNotice',
                    {},
                    { defaultValue: "Copy this key now — you won't see it again:" },
                  )}
                </p>
                {newKeyPlaintext}
              </div>
            ) : null}

            {apiKeys.length === 0 ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant italic')}>
                {t(
                  'settings.apiKeys.empty',
                  {},
                  { defaultValue: 'No API keys yet — generate one above.' },
                )}
              </p>
            ) : (
              <ul className={'space-y-2'}>
                {apiKeys.map((k) => (
                  <li
                    key={k.id}
                    data-mol-id={`settings-apikey-${k.id}`}
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between' }),
                      cm.sp('py', 3),
                      cm.sp('px', 3),
                      'border border-outline-variant rounded-md',
                    )}
                  >
                    <div className={'min-w-0'}>
                      <p className={cm.cn(cm.fontWeight('semibold'))}>{k.name}</p>
                      <p
                        className={cm.cn(
                          cm.textSize('xs'),
                          'text-on-surface-variant font-mono break-all',
                        )}
                      >
                        {k.key_masked}
                      </p>
                    </div>
                    <div className={cm.cn(cm.flex({ gap: 'sm' }))}>
                      <button
                        type="button"
                        onClick={() => handleRotateKey(k.id)}
                        className={cm.cn(cm.textSize('sm'), cm.textPrimary, 'hover:underline')}
                      >
                        {t('settings.apiKeys.rotateCta', {}, { defaultValue: 'Rotate' })}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteKey(k.id)}
                        className={cm.cn(cm.textSize('sm'), 'text-error hover:underline')}
                      >
                        {t('common.revoke', {}, { defaultValue: 'Revoke' })}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {section === 'language' && (
          <section
            className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}
            data-mol-id="settings-language-section"
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

        {section === 'team' && (
          <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t('nav.team', {}, { defaultValue: 'Team' })}
            </h2>
            {team.length === 0 ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'settings.team.empty',
                  {},
                  { defaultValue: 'No teammates yet — invite one to start collaborating.' },
                )}
              </p>
            ) : (
              <ul className={'space-y-2'}>
                {team.map((m) => (
                  <li
                    key={m.id}
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between' }),
                      cm.sp('py', 2),
                      'border-b border-outline-variant last:border-b-0',
                    )}
                  >
                    <div>
                      <p className={cm.fontWeight('medium')}>{m.name}</p>
                      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {m.email} · {m.role}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <section className={cm.cn(cm.sp('p', 8), 'bg-surface-container-low rounded-xl')}>
          <div className={cm.sp('mb', 6)}>
            <h3 className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}>
              {t('settings.appearance.title', {}, { defaultValue: 'Appearance' })}
            </h3>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'settings.appearance.description',
                {},
                { defaultValue: 'Toggle between light and dark mode.' },
              )}
            </p>
          </div>
          <ThemeToggle />
        </section>
      </main>
    </div>
  )
}

interface FieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  molId?: string
}

function Field({ label, value, onChange, type = 'text', placeholder, molId }: FieldProps) {
  const cm = getClassMap()
  return (
    <label className={'block'}>
      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}>
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        data-mol-id={molId}
        className={cm.cn(
          cm.sp('px', 3),
          cm.sp('py', 2),
          'w-full border border-outline-variant rounded-md',
        )}
      />
    </label>
  )
}
