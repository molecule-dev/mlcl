import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import type { UserProfile } from '@molecule/app-auth'
import { t as tGlobal } from '@molecule/app-i18n'
import { useAuth, useChangePassword, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import type { Person, TreePayload } from '../lib/people.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface ProfileBundle {
  name: string
  email: string
  twoFactorEnabled: boolean
  profile: Record<string, string | undefined>
  preferences: Record<string, boolean | undefined>
}

interface DeviceRow {
  id: string
  name?: string | null
  isCurrent?: boolean | null
  createdAt?: string
}

interface TwoFactorSetup {
  QRImageUrl?: string
  keyUrl?: string
  secret?: string
}

function relativeDays(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const days = Math.max(0, Math.floor((Date.now() - d.getTime()) / 86_400_000))
  if (days === 0) return tGlobal('status.today', undefined, { defaultValue: 'Today' })
  if (days === 1) return tGlobal('status.yesterday', undefined, { defaultValue: 'Yesterday' })
  return tGlobal('status.daysAgo', { days }, { defaultValue: '{{days}} days ago' })
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, logout } = useAuth<UserProfile>()
  const http = useHttpClient()
  const { status: pwStatus, error: pwError, changePassword, reset: resetPw } = useChangePassword()

  const [bundle, setBundle] = useState<ProfileBundle | null>(null)
  const [devices, setDevices] = useState<DeviceRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  // Modals
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [pwCurrent, setPwCurrent] = useState('')
  const [pwNew, setPwNew] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')

  // Two-factor (TOTP) enrollment
  const [tfModal, setTfModal] = useState<null | 'enable' | 'disable'>(null)
  const [tfSetup, setTfSetup] = useState<TwoFactorSetup | null>(null)
  const [tfToken, setTfToken] = useState('')
  const [tfLoading, setTfLoading] = useState(false)
  const [tfError, setTfError] = useState('')

  // Per-device session revocation
  const [confirmingDeviceId, setConfirmingDeviceId] = useState<string | null>(null)
  const [revokingDeviceId, setRevokingDeviceId] = useState<string | null>(null)

  const loadBundle = async () => {
    try {
      const res = await http.get('/api/profile/me')
      const b = unwrapSingle<ProfileBundle>(res)
      if (b) setBundle(b)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('settings.loadError', {}, { defaultValue: 'Failed to load settings.' }),
      )
    }
  }

  const loadDevices = async () => {
    try {
      const res = await http.get('/api/devices')
      setDevices(unwrapList<DeviceRow>(res))
    } catch (_error) {
      // devices endpoint is optional; missing data leaves the list empty — safe to ignore
    }
  }

  useEffect(() => {
    void loadBundle()
    void loadDevices()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const closeTwoFactor = () => {
    setTfModal(null)
    setTfSetup(null)
    setTfToken('')
    setTfError('')
  }

  // Real TOTP enrollment against POST /api/users/:id/verify-two-factor.
  // Enable → {action:'setup'} returns a QR code + secret to scan, then the
  // user enters a 6-digit code → {action:'enable', token}. Disable → the user
  // enters a current code → {action:'disable', token}.
  const startTwoFactorSetup = async () => {
    if (!user) return
    setTfError('')
    setTfSetup(null)
    setTfLoading(true)
    setTfModal('enable')
    try {
      const res = await http.post(`/api/users/${user.id}/verify-two-factor`, { action: 'setup' })
      const setup = unwrapSingle<TwoFactorSetup>(res)
      if (setup) setTfSetup(setup)
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

  const openTwoFactor = () => {
    setTfError('')
    setTfToken('')
    if (bundle?.twoFactorEnabled) {
      setTfModal('disable')
    } else {
      void startTwoFactorSetup()
    }
  }

  const submitTwoFactor = async (action: 'enable' | 'disable') => {
    if (!user) return
    setTfError('')
    setTfLoading(true)
    try {
      await http.post(`/api/users/${user.id}/verify-two-factor`, { action, token: tfToken })
      if (bundle) setBundle({ ...bundle, twoFactorEnabled: action === 'enable' })
      closeTwoFactor()
    } catch (err) {
      setTfError(
        err instanceof Error
          ? err.message
          : t(
              'settings.twoFactorInvalidCode',
              {},
              { defaultValue: 'Invalid code. Please try again.' },
            ),
      )
    } finally {
      setTfLoading(false)
    }
  }

  const revokeDevice = async (id: string) => {
    setRevokingDeviceId(id)
    setError(null)
    try {
      await http.delete(`/api/devices/${id}`)
      setConfirmingDeviceId(null)
      await loadDevices()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(
              'settings.deviceRevokeError',
              {},
              { defaultValue: 'Could not sign out that device.' },
            ),
      )
    } finally {
      setRevokingDeviceId(null)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await changePassword(pwCurrent, pwNew)
      setShowPasswordModal(false)
      setPwCurrent('')
      setPwNew('')
      resetPw()
    } catch (_error) {
      // error is captured in pwError from the hook and displayed in the UI — no further handling needed
    }
  }

  /** Real tree export: every person + the full relationship edge list as JSON. */
  const exportTree = async () => {
    setBusy('export')
    setError(null)
    try {
      const [peopleRes, treeRes] = await Promise.all([
        http.get('/api/people'),
        http.get('/api/tree'),
      ])
      const dump = {
        people: unwrapList<Person>(peopleRes),
        tree: unwrapSingle<TreePayload>(treeRes),
        generated_at: new Date().toISOString(),
      }
      const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${APP_NAME.toLowerCase()}-${(user?.email ?? 'export').replace(/[^a-z0-9]/gi, '_')}-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('settings.exportError', {}, { defaultValue: 'Export failed.' }),
      )
    } finally {
      setBusy(null)
    }
  }

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setBusy('delete')
    setError(null)
    try {
      await http.delete(`/api/users/${user.id}`, { data: { password: deletePassword } })
      await logout()
      navigate('/login')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('settings.deleteError', {}, { defaultValue: 'Account delete failed.' }),
      )
    } finally {
      setBusy(null)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const sessionsLine = useMemo(
    () =>
      devices.length === 1
        ? t('settings.deviceCountOne', {}, { defaultValue: '1 device' })
        : t(
            'settings.deviceCount',
            { count: devices.length },
            { defaultValue: '{{count}} devices' },
          ),
    [devices, t],
  )

  if (!bundle) {
    return (
      <div className={cm.cn(cm.maxW('5xl'), cm.mxAuto, cm.sp('p', 8))} data-mol-id="page-settings">
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      </div>
    )
  }

  const sectionTitle = (key: string, def: string): React.ReactNode => (
    <h2
      className={cm.cn(
        cm.textSize('xs'),
        cm.fontWeight('bold'),
        'uppercase tracking-widest text-on-surface-variant',
        cm.sp('mb', 3),
      )}
    >
      {t(`settings.section.${key}`, {}, { defaultValue: def })}
    </h2>
  )

  return (
    <div className={cm.cn(cm.maxW('5xl'), cm.mxAuto, cm.sp('p', 8))} data-mol-id="page-settings">
      <div className={cm.cn(cm.sp('mb', 8))}>
        <p className={cm.cn('text-[10px] font-bold uppercase tracking-widest text-primary mb-1')}>
          {t('settings.account', {}, { defaultValue: 'Account' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('settings.title', {}, { defaultValue: 'Settings' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mt', 1))}>
          {t(
            'settings.subtitle',
            {},
            { defaultValue: 'Your account, your tree, your data — nothing else.' },
          )}
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.sp('mb', 6),
            cm.textSize('sm'),
            'bg-error-container text-on-error-container rounded-xl',
          )}
        >
          {error}
        </div>
      )}

      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
        {/* Account */}
        <section
          className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl shadow-sm')}
          data-mol-id="settings-account"
        >
          {sectionTitle('profile', 'Account')}
          <dl className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 sm:grid-cols-2')}>
            <div>
              <dt
                className={cm.cn(
                  cm.textSize('xs'),
                  'text-on-surface-variant uppercase tracking-wider font-bold',
                )}
              >
                {t('settings.nameLabel', {}, { defaultValue: 'Name' })}
              </dt>
              <dd className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                {bundle.name || '—'}
              </dd>
            </div>
            <div>
              <dt
                className={cm.cn(
                  cm.textSize('xs'),
                  'text-on-surface-variant uppercase tracking-wider font-bold',
                )}
              >
                {t('settings.emailLabel', {}, { defaultValue: 'Email' })}
              </dt>
              <dd className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                {bundle.email || user?.email || '—'}
              </dd>
            </div>
          </dl>
          <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'md' }), cm.sp('mt', 4))}>
            <button
              type="button"
              data-mol-id="settings-change-password"
              onClick={() => setShowPasswordModal(true)}
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                cm.sp('px', 4),
                cm.sp('py', 2),
                'rounded-lg border border-outline-variant/50 hover:bg-surface-container transition-colors',
              )}
            >
              {t('settings.changePasswordAction', {}, { defaultValue: 'Change password' })}
            </button>
            <Link
              to="/pricing"
              data-mol-id="settings-view-plans"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                cm.sp('px', 4),
                cm.sp('py', 2),
                'rounded-lg border border-outline-variant/50 hover:bg-surface-container transition-colors inline-block',
              )}
            >
              {t('settings.viewPlans', {}, { defaultValue: 'View plans' })}
            </Link>
          </div>
        </section>

        {/* Appearance + locale */}
        <section
          className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl shadow-sm')}
          data-mol-id="settings-appearance"
        >
          {sectionTitle('appearance', 'Appearance & language')}
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }),
            )}
          >
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
              <ThemeToggle />
              <LanguagePicker />
            </div>
          </div>
        </section>

        {/* Security */}
        <section
          className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl shadow-sm')}
          data-mol-id="settings-security"
        >
          {sectionTitle('security', 'Security')}
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }),
            )}
          >
            <div>
              <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                {t('settings.twoFactor', {}, { defaultValue: 'Two-factor authentication' })}
              </p>
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {bundle.twoFactorEnabled
                  ? t('settings.twoFactorOn', {}, { defaultValue: 'Enabled' })
                  : t('settings.twoFactorOff', {}, { defaultValue: 'Disabled' })}
              </p>
            </div>
            <button
              type="button"
              data-mol-id="settings-two-factor"
              onClick={openTwoFactor}
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                cm.sp('px', 4),
                cm.sp('py', 2),
                'rounded-lg border border-outline-variant/50 hover:bg-surface-container transition-colors',
              )}
            >
              {bundle.twoFactorEnabled
                ? t('settings.twoFactorTurnOff', {}, { defaultValue: 'Disable' })
                : t('settings.twoFactorTurnOn', {}, { defaultValue: 'Enable' })}
            </button>
          </div>
        </section>

        {/* Devices */}
        <section
          className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl shadow-sm')}
          data-mol-id="settings-devices"
        >
          {sectionTitle('devices', `Devices (${sessionsLine})`)}
          {devices.length === 0 ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('settings.noDevices', {}, { defaultValue: 'No other signed-in devices.' })}
            </p>
          ) : (
            <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
              {devices.map((d) => (
                <li
                  key={d.id}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
                    cm.sp('p', 3),
                    'rounded-xl bg-surface-container-low border border-outline-variant/20',
                  )}
                >
                  <div>
                    <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                      {d.name || t('settings.unnamedDevice', {}, { defaultValue: 'This device' })}
                      {d.isCurrent && (
                        <span
                          className={cm.cn(
                            cm.sp('ml', 2),
                            'px-2 py-0.5 text-[10px] uppercase tracking-widest rounded-full',
                          )}
                          style={{
                            backgroundColor: 'var(--color-tree-root-bg)',
                            color: 'var(--color-tree-root)',
                          }}
                        >
                          {t('settings.currentDevice', {}, { defaultValue: 'Current' })}
                        </span>
                      )}
                    </p>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {t(
                        'settings.addedAgo',
                        { ago: relativeDays(d.createdAt) },
                        { defaultValue: 'Added {{ago}}' },
                      )}
                    </p>
                  </div>
                  {confirmingDeviceId === d.id ? (
                    <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                      <button
                        type="button"
                        data-mol-id={`device-revoke-confirm-${d.id}`}
                        disabled={revokingDeviceId === d.id}
                        onClick={() => void revokeDevice(d.id)}
                        className={cm.cn(
                          cm.textSize('xs'),
                          cm.fontWeight('bold'),
                          cm.sp('px', 3),
                          cm.sp('py', 1),
                          'rounded-lg bg-error-container text-on-error-container',
                        )}
                      >
                        {revokingDeviceId === d.id
                          ? t('settings.revoking', {}, { defaultValue: 'Signing out…' })
                          : t('settings.confirmRevoke', {}, { defaultValue: 'Confirm sign out' })}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingDeviceId(null)}
                        className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}
                      >
                        {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      data-mol-id={`device-revoke-${d.id}`}
                      onClick={() => setConfirmingDeviceId(d.id)}
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.fontWeight('semibold'),
                        'text-on-surface-variant hover:text-error transition-colors',
                      )}
                    >
                      {t('settings.signOutDevice', {}, { defaultValue: 'Sign out' })}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Data */}
        <section
          className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl shadow-sm')}
          data-mol-id="settings-data"
        >
          {sectionTitle('data', 'Your research data')}
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }),
            )}
          >
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.maxW('md'))}>
              {t(
                'settings.exportBody',
                {},
                {
                  defaultValue:
                    'Download every person and relationship as a JSON file — your tree, portable.',
                },
              )}
            </p>
            <button
              type="button"
              data-mol-id="settings-export"
              disabled={busy === 'export'}
              onClick={() => void exportTree()}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                cm.sp('px', 4),
                cm.sp('py', 2),
                'rounded-lg border border-outline-variant/50 hover:bg-surface-container transition-colors disabled:opacity-60',
              )}
            >
              <span className="material-symbols-outlined text-base" aria-hidden="true">
                download
              </span>
              {busy === 'export'
                ? t('settings.exporting', {}, { defaultValue: 'Exporting…' })
                : t('settings.exportAction', {}, { defaultValue: 'Export tree' })}
            </button>
          </div>
        </section>

        {/* Danger zone */}
        <section
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-2xl border border-error-container/40 bg-surface-container-lowest',
          )}
          data-mol-id="settings-danger"
        >
          {sectionTitle('danger', 'Danger zone')}
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }),
            )}
          >
            <div>
              <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                {t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
              </p>
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t(
                  'settings.deleteWarn',
                  {},
                  {
                    defaultValue:
                      'Deletes your account, every person, and every relationship. There is no undo.',
                  },
                )}
              </p>
            </div>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
              <button
                type="button"
                data-mol-id="settings-logout"
                onClick={() => void handleLogout()}
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  'rounded-lg border border-outline-variant/50 hover:bg-surface-container transition-colors',
                )}
              >
                {t('settings.logOut', {}, { defaultValue: 'Log out' })}
              </button>
              <button
                type="button"
                data-mol-id="settings-delete-account"
                onClick={() => setShowDeleteModal(true)}
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  'rounded-lg bg-error-container text-on-error-container',
                )}
              >
                {t('settings.deleteForever', {}, { defaultValue: 'Delete forever' })}
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Change password modal */}
      {showPasswordModal && (
        <div
          className={cm.cn('fixed inset-0 z-50 flex items-center justify-center p-4')}
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleChangePassword}
            className={cm.cn(cm.sp('p', 8), 'bg-surface rounded-2xl shadow-lg w-full max-w-md')}
          >
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mb', 4))}>
              {t('settings.changePasswordAction', {}, { defaultValue: 'Change password' })}
            </h2>
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
              <input
                type="password"
                data-mol-id="password-current"
                placeholder={t(
                  'settings.currentPassword',
                  {},
                  { defaultValue: 'Current password' },
                )}
                autoComplete="current-password"
                required
                value={pwCurrent}
                onChange={(e) => setPwCurrent(e.target.value)}
                className={cm.cn(
                  cm.sp('py', 3),
                  cm.sp('px', 4),
                  cm.textSize('sm'),
                  'bg-surface-container-low border-none rounded-xl',
                )}
              />
              <input
                type="password"
                data-mol-id="password-new"
                placeholder={t('settings.newPassword', {}, { defaultValue: 'New password' })}
                autoComplete="new-password"
                required
                minLength={8}
                value={pwNew}
                onChange={(e) => setPwNew(e.target.value)}
                className={cm.cn(
                  cm.sp('py', 3),
                  cm.sp('px', 4),
                  cm.textSize('sm'),
                  'bg-surface-container-low border-none rounded-xl',
                )}
              />
              {pwError && (
                <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{pwError.message}</p>
              )}
            </div>
            <div className={cm.cn(cm.flex({ justify: 'end', gap: 'md' }), cm.sp('mt', 6))}>
              <button
                type="button"
                onClick={() => {
                  setShowPasswordModal(false)
                  resetPw()
                }}
                className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}
              >
                {t('common.cancel', {}, { defaultValue: 'Cancel' })}
              </button>
              <button
                type="submit"
                disabled={pwStatus === 'pending'}
                data-mol-id="password-submit"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  'text-white rounded-lg disabled:opacity-60',
                )}
                style={{ background: 'linear-gradient(135deg, #15803d, #65a30d)' }}
              >
                {pwStatus === 'pending'
                  ? t('settings.changingPassword', {}, { defaultValue: 'Changing…' })
                  : t('settings.savePassword', {}, { defaultValue: 'Save password' })}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Two-factor modal */}
      {tfModal && (
        <div
          className={cm.cn('fixed inset-0 z-50 flex items-center justify-center p-4')}
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          role="dialog"
          aria-modal="true"
        >
          <div className={cm.cn(cm.sp('p', 8), 'bg-surface rounded-2xl shadow-lg w-full max-w-md')}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mb', 4))}>
              {tfModal === 'enable'
                ? t('settings.twoFactorEnableTitle', {}, { defaultValue: 'Enable two-factor' })
                : t('settings.twoFactorDisableTitle', {}, { defaultValue: 'Disable two-factor' })}
            </h2>
            {tfModal === 'enable' && (
              <div className={cm.cn(cm.sp('mb', 4))}>
                {tfLoading && !tfSetup ? (
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                    {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
                  </p>
                ) : tfSetup?.QRImageUrl ? (
                  <img
                    src={tfSetup.QRImageUrl}
                    alt={t('settings.twoFactorQrAlt', {}, { defaultValue: 'Two-factor QR code' })}
                    className={cm.cn(cm.sp('mb', 2), 'w-40 h-40 mx-auto')}
                  />
                ) : null}
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  {t(
                    'settings.twoFactorScanHint',
                    {},
                    {
                      defaultValue:
                        'Scan the QR code with your authenticator app, then enter the 6-digit code.',
                    },
                  )}
                </p>
              </div>
            )}
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              data-mol-id="two-factor-token"
              placeholder={t('settings.twoFactorCodePlaceholder', {}, { defaultValue: '123456' })}
              value={tfToken}
              onChange={(e) => setTfToken(e.target.value)}
              className={cm.cn(
                cm.w('full'),
                cm.sp('py', 3),
                cm.sp('px', 4),
                cm.textSize('sm'),
                'bg-surface-container-low border-none rounded-xl tabular-nums tracking-widest text-center',
              )}
            />
            {tfError && (
              <p className={cm.cn(cm.textSize('sm'), 'text-error', cm.sp('mt', 2))}>{tfError}</p>
            )}
            <div className={cm.cn(cm.flex({ justify: 'end', gap: 'md' }), cm.sp('mt', 6))}>
              <button
                type="button"
                onClick={closeTwoFactor}
                className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}
              >
                {t('common.cancel', {}, { defaultValue: 'Cancel' })}
              </button>
              <button
                type="button"
                data-mol-id="two-factor-submit"
                disabled={tfLoading || tfToken.length < 6}
                onClick={() => void submitTwoFactor(tfModal)}
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  'text-white rounded-lg disabled:opacity-60',
                )}
                style={{ background: 'linear-gradient(135deg, #15803d, #65a30d)' }}
              >
                {tfLoading
                  ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                  : tfModal === 'enable'
                    ? t('settings.twoFactorConfirm', {}, { defaultValue: 'Enable' })
                    : t('settings.twoFactorTurnOff', {}, { defaultValue: 'Disable' })}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete account modal */}
      {showDeleteModal && (
        <div
          className={cm.cn('fixed inset-0 z-50 flex items-center justify-center p-4')}
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleDelete}
            className={cm.cn(cm.sp('p', 8), 'bg-surface rounded-2xl shadow-lg w-full max-w-md')}
          >
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mb', 2))}>
              {t('settings.deleteModalTitle', {}, { defaultValue: 'Delete your account?' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mb', 4))}>
              {t(
                'settings.deleteWarn',
                {},
                {
                  defaultValue:
                    'Deletes your account, every person, and every relationship. There is no undo.',
                },
              )}
            </p>
            <input
              type="password"
              data-mol-id="delete-password"
              placeholder={t('settings.currentPassword', {}, { defaultValue: 'Current password' })}
              autoComplete="current-password"
              required
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              className={cm.cn(
                cm.w('full'),
                cm.sp('py', 3),
                cm.sp('px', 4),
                cm.textSize('sm'),
                'bg-surface-container-low border-none rounded-xl',
              )}
            />
            <div className={cm.cn(cm.flex({ justify: 'end', gap: 'md' }), cm.sp('mt', 6))}>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}
              >
                {t('common.cancel', {}, { defaultValue: 'Cancel' })}
              </button>
              <button
                type="submit"
                disabled={busy === 'delete'}
                data-mol-id="delete-account-confirm"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  'rounded-lg bg-error text-white disabled:opacity-60',
                )}
              >
                {busy === 'delete'
                  ? t('settings.deleting', {}, { defaultValue: 'Deleting…' })
                  : t('settings.deleteForever', {}, { defaultValue: 'Delete forever' })}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default Settings
export { Settings as SettingsPage }
