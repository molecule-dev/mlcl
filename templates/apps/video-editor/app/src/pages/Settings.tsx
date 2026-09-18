import { type FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { RushesLayout } from '../components/RushesLayout.js'
import { StudioStatTile } from '../components/StudioStatTile.js'

interface AccountUser {
  id?: string | null
  email?: string | null
  name?: string | null
  oauthServer?: string | null
}

interface BillingStatus {
  planKey?: string | null
  category?: string | null
  name?: string | null
  isFree?: boolean | null
}
interface BillingPrice {
  period?: 'month' | 'year' | string
  price?: string | null
  stripePriceId?: string | null
}
interface BillingTier {
  key?: string | null
  name?: string | null
  prices?: BillingPrice[]
  features?: string[] | null
}

interface AssetRow {
  id: string
  size_bytes?: number | string | null
}
interface ProjectRow {
  id: string
}
interface ExportRow {
  id: string
}

function arrayFrom<T>(res: unknown): T[] {
  const d = (res as { data?: unknown })?.data
  if (Array.isArray(d)) return d as T[]
  if (Array.isArray(res)) return res as T[]
  return []
}

interface NavItem {
  id: 'profile' | 'preferences' | 'storage' | 'billing'
  icon: string
  label: string
  defaultLabel: string
}

const NAV: NavItem[] = [
  { id: 'profile', icon: 'person', label: 'settings.nav.profile', defaultLabel: 'Profile' },
  {
    id: 'preferences',
    icon: 'tune',
    label: 'settings.nav.preferences',
    defaultLabel: 'Preferences',
  },
  { id: 'storage', icon: 'hard_drive', label: 'settings.nav.storage', defaultLabel: 'Storage' },
  { id: 'billing', icon: 'credit_card', label: 'settings.nav.billing', defaultLabel: 'Billing' },
]

function formatGB(bytes: number): string {
  if (!bytes) return '0'
  return (bytes / 1024 / 1024 / 1024).toFixed(2)
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user, logout, refresh, setUser } = useAuth<AccountUser>() as {
    user: AccountUser | null
    logout: () => Promise<void> | void
    refresh?: () => Promise<unknown> | unknown
    setUser?: (u: AccountUser | null) => void
  }
  const http = useHttpClient()
  const navigate = useNavigate()
  const [section, setSection] = useState<NavItem['id']>('profile')

  // Password change calls the user resource directly (PATCH /users/:id/password)
  // because the molecule auth client's default changePasswordEndpoint
  // (POST /users/password) is not wired in this template's router.
  const [pwBusy, setPwBusy] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)
  const resetPw = () => {
    setPwError(null)
    setPwBusy(false)
  }

  // Profile editing
  const [displayName, setDisplayName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileSaved, setProfileSaved] = useState(false)

  useEffect(() => {
    setDisplayName(user?.name ?? '')
    setEmail(user?.email ?? '')
  }, [user?.id, user?.name, user?.email])

  // Password change
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)

  // Delete account
  const [showDelete, setShowDelete] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Storage
  const [assets, setAssets] = useState<AssetRow[]>([])
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [exports, setExports] = useState<ExportRow[]>([])

  // Billing
  const [billing, setBilling] = useState<BillingStatus | null>(null)
  const [tiers, setTiers] = useState<BillingTier[]>([])
  const [billingLoading, setBillingLoading] = useState(false)
  const [billingError, setBillingError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function loadStats() {
      try {
        const [aRes, pRes, eRes] = await Promise.all([
          http.get('/api/assets').catch(() => null),
          http.get('/api/projects').catch(() => null),
          http.get('/api/exports').catch(() => null),
        ])
        if (cancelled) return
        setAssets(arrayFrom<AssetRow>(aRes))
        setProjects(arrayFrom<ProjectRow>(pRes))
        setExports(arrayFrom<ExportRow>(eRes))
      } catch (_error) {
        // non-fatal — stats section is informational; page still renders
      }
    }
    loadStats()
    return () => {
      cancelled = true
    }
  }, [http])

  useEffect(() => {
    if (section !== 'billing') return
    let cancelled = false
    async function loadBilling() {
      setBillingLoading(true)
      setBillingError(null)
      try {
        const [sRes, tRes] = await Promise.all([
          http.get('/api/billing/status').catch(() => null),
          http.get('/api/billing/tiers').catch(() => null),
        ])
        if (cancelled) return
        // http.get returns { data, status, ... } where `data` is the parsed JSON.
        // Some endpoints further wrap as { data: [...] }, so unwrap once if so.
        const statusBody = (sRes as { data?: unknown } | null)?.data ?? sRes
        setBilling((statusBody ?? null) as BillingStatus | null)
        const tiersBody = (tRes as { data?: unknown } | null)?.data ?? tRes
        const tiersData = tiersBody as { data?: BillingTier[] } | BillingTier[] | null
        const list = Array.isArray(tiersData)
          ? tiersData
          : (tiersData as { data?: BillingTier[] } | null)?.data
        setTiers(Array.isArray(list) ? (list as BillingTier[]) : [])
      } catch (err) {
        if (!cancelled)
          setBillingError(err instanceof Error ? err.message : 'Failed to load billing.')
      } finally {
        if (!cancelled) setBillingLoading(false)
      }
    }
    loadBilling()
    return () => {
      cancelled = true
    }
  }, [section, http])

  async function handleProfileSave(e: FormEvent) {
    e.preventDefault()
    if (!user?.id) return
    setProfileSaving(true)
    setProfileError(null)
    setProfileSaved(false)
    try {
      const payload: Record<string, string> = {}
      if (displayName !== (user.name ?? '')) payload.name = displayName
      if (email !== (user.email ?? '')) payload.email = email
      if (Object.keys(payload).length === 0) {
        setProfileSaved(true)
        return
      }
      await http.patch(`/api/users/${user.id}`, payload)
      // The auth client caches the user in localStorage; re-fetch and store
      // it so name/email updates are visible immediately and survive reload.
      try {
        const meRes = await http.get(`/api/users/${user.id}`)
        const meBody = ((meRes as { data?: unknown } | null)?.data ?? meRes) as
          { props?: AccountUser } | AccountUser | null
        const fresh =
          (meBody as { props?: AccountUser } | null)?.props ?? (meBody as AccountUser | null)
        if (fresh && typeof setUser === 'function') {
          setUser({ ...(user ?? {}), ...fresh })
        }
      } catch (_error) {
        // best-effort — user cache update is non-fatal; profile save already succeeded
      }
      if (typeof refresh === 'function') {
        try {
          await refresh()
        } catch (_error) {
          // non-fatal — auth refresh failure doesn't roll back the profile save
        }
      }
      setProfileSaved(true)
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Failed to update profile.')
    } finally {
      setProfileSaving(false)
    }
  }

  async function handlePasswordChange(e: FormEvent) {
    e.preventDefault()
    if (!user?.id) return
    setPwSuccess(false)
    setPwError(null)
    setPwBusy(true)
    try {
      await http.patch(`/api/users/${user.id}/password`, { currentPassword, newPassword })
      setCurrentPassword('')
      setNewPassword('')
      setShowPasswordForm(false)
      setPwSuccess(true)
    } catch (err) {
      setPwError(err instanceof Error ? err.message : 'Failed to change password.')
    } finally {
      setPwBusy(false)
    }
  }

  async function handleDelete(e: FormEvent) {
    e.preventDefault()
    if (!user?.id) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await http.delete(`/api/users/${user.id}`, { data: { password: deletePassword } } as never)
      if (typeof logout === 'function') await logout()
      navigate('/login')
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete account.')
    } finally {
      setDeleting(false)
    }
  }

  async function handleCheckout(priceId: string) {
    if (busy || !priceId) return
    setBusy(true)
    setBillingError(null)
    try {
      const res = await http.post('/api/billing/checkout', { priceId })
      const body = ((res as { data?: unknown } | null)?.data ?? res) as {
        checkoutUrl?: string
        url?: string
      } | null
      const url = body?.checkoutUrl ?? body?.url
      if (url) {
        window.location.assign(url)
        return
      }
      setBillingError('No checkout URL returned.')
    } catch (err) {
      setBillingError(err instanceof Error ? err.message : 'Checkout failed.')
    } finally {
      setBusy(false)
    }
  }

  async function handleCancel() {
    if (busy) return
    if (
      !confirm(
        t(
          'settings.billing.confirmCancel',
          {},
          { defaultValue: 'Cancel subscription at period end?' },
        ),
      )
    )
      return
    setBusy(true)
    setBillingError(null)
    try {
      await http.post('/api/billing/cancel', {})
      const sRes = await http.get('/api/billing/status').catch(() => null)
      const statusBody = (sRes as { data?: unknown } | null)?.data ?? sRes
      setBilling((statusBody ?? null) as BillingStatus | null)
    } catch (err) {
      setBillingError(err instanceof Error ? err.message : 'Cancel failed.')
    } finally {
      setBusy(false)
    }
  }

  const totalBytes = assets.reduce((s, a) => {
    const b = typeof a.size_bytes === 'string' ? Number(a.size_bytes) : (a.size_bytes ?? 0)
    return s + (Number.isFinite(b) ? (b as number) : 0)
  }, 0)

  const isOAuth = Boolean(user?.oauthServer)
  const currentPlanName = billing?.name ?? 'Free'
  const currentPlanKey = billing?.planKey ?? 'free'

  return (
    <RushesLayout
      title={t('nav.settings', {}, { defaultValue: 'Settings' })}
      breadcrumb="// account"
    >
      <div className={cm.stack(6)}>
        <header>
          <h2
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('bold'),
              'text-[var(--video-text-primary)] tracking-tight',
            )}
          >
            {t('settings.heading', {}, { defaultValue: 'Account & studio settings' })}
          </h2>
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('mt', 1),
              'text-[var(--video-text-muted-alt)]',
            )}
          >
            {t(
              'settings.subhead',
              {},
              {
                defaultValue:
                  'Profile, editor preferences, storage, and billing — all in one place.',
              },
            )}
          </p>
        </header>

        <div className={cm.cn('grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6')}>
          <nav className={cm.cn(cm.stack(1))}>
            {NAV.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                data-mol-id={`settings-${item.id}`}
                aria-pressed={section === item.id}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 3 }),
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'rounded-md transition-colors text-left',
                  section === item.id
                    ? 'bg-[var(--video-cta-from)]/15 text-[var(--video-link)] border-l-2 border-[var(--video-cta-from)]'
                    : 'text-[var(--video-text-muted-alt)] hover:bg-[var(--video-panel-bg-alt)] hover:text-[var(--video-text-primary)]',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[18px]')}>{item.icon}</span>
                <span className={cm.fontWeight('medium')}>
                  {t(item.label, {}, { defaultValue: item.defaultLabel })}
                </span>
              </button>
            ))}
          </nav>

          <section className={cm.cn(cm.stack(6))}>
            {section === 'profile' && (
              <div
                data-mol-id="settings-profile-panel"
                className={cm.cn(
                  cm.sp('p', 6),
                  cm.stack(5),
                  'rounded-xl bg-[var(--video-panel-bg)] border border-[var(--video-border-subtle)]',
                )}
              >
                <h3
                  className={cm.cn(
                    cm.textSize('lg'),
                    cm.fontWeight('semibold'),
                    'text-[var(--video-text-primary)]',
                  )}
                >
                  {t('nav.profile', {}, { defaultValue: 'Profile' })}
                </h3>
                <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }))}>
                  <div
                    className={cm.cn(
                      'w-16 h-16 rounded-full bg-gradient-to-br from-[var(--video-cta-from)] to-[var(--video-cta-to)] text-white flex items-center justify-center text-2xl font-bold',
                    )}
                  >
                    {(user?.name?.[0] ?? user?.email?.[0] ?? 'R').toUpperCase()}
                  </div>
                  <div className={cm.stack(1)}>
                    <p
                      data-mol-id="settings-name"
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('medium'),
                        'text-[var(--video-text-primary)]',
                      )}
                    >
                      {user?.name ?? user?.email ?? 'Editor'}
                    </p>
                    <p
                      data-mol-id="settings-email"
                      className={cm.cn(
                        'font-mono text-[11px] uppercase tracking-widest text-[var(--video-link)]',
                      )}
                    >
                      {user?.email ?? '—'}
                    </p>
                  </div>
                </div>
                <form onSubmit={handleProfileSave} className={cm.stack(4)}>
                  {profileError && (
                    <p
                      role="alert"
                      data-mol-id="profile-error"
                      className={cm.cn(
                        cm.textSize('sm'),
                        'text-[var(--video-error-text)] font-mono',
                      )}
                    >
                      {profileError}
                    </p>
                  )}
                  {profileSaved && !profileError && (
                    <p
                      data-mol-id="profile-saved"
                      className={cm.cn(
                        cm.textSize('sm'),
                        'text-[var(--video-secondary)] font-mono',
                      )}
                    >
                      {t('common.profileSavedPeriod', {}, { defaultValue: 'Profile saved.' })}
                    </p>
                  )}
                  <div className={cm.cn('grid grid-cols-1 md:grid-cols-2 gap-4')}>
                    <label className={cm.stack(1)}>
                      <span
                        className={cm.cn(
                          'font-mono text-[10px] uppercase tracking-widest text-[var(--video-text-dim)]',
                        )}
                      >
                        {t('form.displayName', {}, { defaultValue: 'Display name' })}
                      </span>
                      <input
                        data-mol-id="profile-name-input"
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className={cm.cn(
                          cm.sp('px', 3),
                          cm.sp('py', 2),
                          cm.textSize('sm'),
                          'rounded-md bg-[var(--video-input-bg)] border border-[var(--video-border-subtle)] text-[var(--video-text-primary)] focus:border-[var(--video-cta-from)] outline-none',
                        )}
                      />
                    </label>
                    <label className={cm.stack(1)}>
                      <span
                        className={cm.cn(
                          'font-mono text-[10px] uppercase tracking-widest text-[var(--video-text-dim)]',
                        )}
                      >
                        {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
                      </span>
                      <input
                        data-mol-id="profile-email-input"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={cm.cn(
                          cm.sp('px', 3),
                          cm.sp('py', 2),
                          cm.textSize('sm'),
                          'rounded-md bg-[var(--video-input-bg)] border border-[var(--video-border-subtle)] text-[var(--video-text-primary)] focus:border-[var(--video-cta-from)] outline-none',
                        )}
                      />
                    </label>
                  </div>
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }))}>
                    <button
                      type="submit"
                      data-mol-id="profile-save"
                      disabled={profileSaving}
                      className={cm.cn(
                        cm.fontWeight('semibold'),
                        cm.sp('px', 4),
                        cm.sp('py', 2),
                        cm.textSize('sm'),
                        'rounded-lg bg-gradient-to-r from-[var(--video-cta-from)] to-[var(--video-cta-to)] text-white hover:opacity-90 transition-opacity disabled:opacity-50',
                      )}
                    >
                      {profileSaving
                        ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                        : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
                    </button>
                  </div>
                </form>

                {!isOAuth && (
                  <div className={cm.stack(3)}>
                    <h4
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        'text-[var(--video-text-primary)]',
                      )}
                    >
                      {t('auth.login.password', {}, { defaultValue: 'Password' })}
                    </h4>
                    {pwSuccess && (
                      <p
                        data-mol-id="password-success"
                        className={cm.cn(
                          cm.textSize('sm'),
                          'text-[var(--video-secondary)] font-mono',
                        )}
                      >
                        {t(
                          'auth.resetPassword.passwordUpdated',
                          {},
                          { defaultValue: 'Password updated.' },
                        )}
                      </p>
                    )}
                    {!showPasswordForm ? (
                      <button
                        type="button"
                        data-mol-id="password-toggle"
                        onClick={() => {
                          setShowPasswordForm(true)
                          setPwSuccess(false)
                          resetPw()
                        }}
                        className={cm.cn(
                          cm.fontWeight('medium'),
                          cm.sp('px', 4),
                          cm.sp('py', 2),
                          cm.textSize('sm'),
                          'self-start rounded-lg border border-[var(--video-border-subtle)] text-[var(--video-link)] hover:border-[var(--video-cta-from)]/40 transition-colors',
                        )}
                      >
                        {t('settings.changePassword', {}, { defaultValue: 'Change password' })}
                      </button>
                    ) : (
                      <form onSubmit={handlePasswordChange} className={cm.stack(3)}>
                        {pwError && (
                          <p
                            role="alert"
                            data-mol-id="password-error"
                            className={cm.cn(
                              cm.textSize('sm'),
                              'text-[var(--video-error-text)] font-mono',
                            )}
                          >
                            {pwError}
                          </p>
                        )}
                        <label className={cm.stack(1)}>
                          <span
                            className={cm.cn(
                              'font-mono text-[10px] uppercase tracking-widest text-[var(--video-text-dim)]',
                            )}
                          >
                            {t(
                              'settings.password.current',
                              {},
                              { defaultValue: 'Current password' },
                            )}
                          </span>
                          <input
                            data-mol-id="password-current"
                            type="password"
                            autoComplete="current-password"
                            required
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className={cm.cn(
                              cm.sp('px', 3),
                              cm.sp('py', 2),
                              cm.textSize('sm'),
                              'rounded-md bg-[var(--video-input-bg)] border border-[var(--video-border-subtle)] text-[var(--video-text-primary)] focus:border-[var(--video-cta-from)] outline-none',
                            )}
                          />
                        </label>
                        <label className={cm.stack(1)}>
                          <span
                            className={cm.cn(
                              'font-mono text-[10px] uppercase tracking-widest text-[var(--video-text-dim)]',
                            )}
                          >
                            {t('settings.password.new', {}, { defaultValue: 'New password' })}
                          </span>
                          <input
                            data-mol-id="password-new"
                            type="password"
                            autoComplete="new-password"
                            required
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className={cm.cn(
                              cm.sp('px', 3),
                              cm.sp('py', 2),
                              cm.textSize('sm'),
                              'rounded-md bg-[var(--video-input-bg)] border border-[var(--video-border-subtle)] text-[var(--video-text-primary)] focus:border-[var(--video-cta-from)] outline-none',
                            )}
                          />
                        </label>
                        <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }))}>
                          <button
                            type="submit"
                            data-mol-id="password-submit"
                            disabled={pwBusy}
                            className={cm.cn(
                              cm.fontWeight('semibold'),
                              cm.sp('px', 4),
                              cm.sp('py', 2),
                              cm.textSize('sm'),
                              'rounded-lg bg-gradient-to-r from-[var(--video-cta-from)] to-[var(--video-cta-to)] text-white hover:opacity-90 disabled:opacity-50',
                            )}
                          >
                            {pwBusy
                              ? t('common.updatingEllipsis', {}, { defaultValue: 'Updating…' })
                              : t(
                                  'auth.resetPassword.updatePassword',
                                  {},
                                  { defaultValue: 'Update password' },
                                )}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowPasswordForm(false)
                              resetPw()
                            }}
                            className={cm.cn(
                              cm.sp('px', 3),
                              cm.sp('py', 2),
                              cm.textSize('sm'),
                              'text-[var(--video-text-muted-alt)] hover:text-[var(--video-text-primary)]',
                            )}
                          >
                            {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                <div
                  className={cm.cn(
                    cm.sp('pt', 4),
                    cm.stack(3),
                    'border-t border-[var(--video-border-subtle)]',
                  )}
                >
                  <h4
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      'text-[var(--video-error-text)]',
                    )}
                  >
                    {t('nav.dangerZone', {}, { defaultValue: 'Danger zone' })}
                  </h4>
                  {!showDelete ? (
                    <button
                      type="button"
                      data-mol-id="delete-account-toggle"
                      onClick={() => setShowDelete(true)}
                      className={cm.cn(
                        cm.fontWeight('medium'),
                        cm.sp('px', 4),
                        cm.sp('py', 2),
                        cm.textSize('sm'),
                        'self-start rounded-lg border border-[var(--video-error-text)]/40 text-[var(--video-error-text)] hover:bg-[var(--video-error-text)]/10 transition-colors',
                      )}
                    >
                      {t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
                    </button>
                  ) : (
                    <form onSubmit={handleDelete} className={cm.stack(3)}>
                      <p className={cm.cn(cm.textSize('xs'), 'text-[var(--video-text-muted-alt)]')}>
                        {t(
                          'settings.danger.warning',
                          {},
                          {
                            defaultValue:
                              'This permanently removes your projects, assets, and exports. This cannot be undone.',
                          },
                        )}
                      </p>
                      {deleteError && (
                        <p
                          role="alert"
                          data-mol-id="delete-error"
                          className={cm.cn(
                            cm.textSize('sm'),
                            'text-[var(--video-error-text)] font-mono',
                          )}
                        >
                          {deleteError}
                        </p>
                      )}
                      {!isOAuth && (
                        <label className={cm.stack(1)}>
                          <span
                            className={cm.cn(
                              'font-mono text-[10px] uppercase tracking-widest text-[var(--video-text-dim)]',
                            )}
                          >
                            {t(
                              'settings.danger.confirmPassword',
                              {},
                              { defaultValue: 'Confirm with current password' },
                            )}
                          </span>
                          <input
                            data-mol-id="delete-password"
                            type="password"
                            required
                            value={deletePassword}
                            onChange={(e) => setDeletePassword(e.target.value)}
                            className={cm.cn(
                              cm.sp('px', 3),
                              cm.sp('py', 2),
                              cm.textSize('sm'),
                              'rounded-md bg-[var(--video-input-bg)] border border-[var(--video-error-text)]/40 text-[var(--video-text-primary)] focus:border-[var(--video-error-text)] outline-none',
                            )}
                          />
                        </label>
                      )}
                      <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }))}>
                        <button
                          type="submit"
                          data-mol-id="delete-confirm"
                          disabled={deleting}
                          className={cm.cn(
                            cm.fontWeight('semibold'),
                            cm.sp('px', 4),
                            cm.sp('py', 2),
                            cm.textSize('sm'),
                            'rounded-lg bg-[var(--video-danger)] text-white hover:bg-[var(--video-danger)] transition-colors disabled:opacity-50',
                          )}
                        >
                          {deleting
                            ? t('common.deletingEllipsis', {}, { defaultValue: 'Deleting…' })
                            : t('settings.danger.confirm', {}, { defaultValue: 'Delete forever' })}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowDelete(false)
                            setDeletePassword('')
                            setDeleteError(null)
                          }}
                          className={cm.cn(
                            cm.sp('px', 3),
                            cm.sp('py', 2),
                            cm.textSize('sm'),
                            'text-[var(--video-text-muted-alt)] hover:text-[var(--video-text-primary)]',
                          )}
                        >
                          {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}

            {section === 'preferences' && (
              <div className={cm.cn(cm.stack(5))}>
                <div
                  className={cm.cn(
                    cm.sp('p', 6),
                    cm.stack(5),
                    'rounded-xl bg-[var(--video-panel-bg)] border border-[var(--video-border-subtle)]',
                  )}
                >
                  <h3
                    className={cm.cn(
                      cm.textSize('lg'),
                      cm.fontWeight('semibold'),
                      'text-[var(--video-text-primary)]',
                    )}
                  >
                    {t('settings.prefs.heading', {}, { defaultValue: 'Editor preferences' })}
                  </h3>
                  <p className={cm.cn(cm.textSize('xs'), 'text-[var(--video-text-muted-alt)]')}>
                    {t(
                      'settings.prefs.note',
                      {},
                      {
                        defaultValue: 'Per-user editor preferences land in v2 of the editor bond.',
                      },
                    )}
                  </p>
                  <div className={cm.cn(cm.stack(3))}>
                    <Toggle
                      label={t('settings.prefs.snap', {}, { defaultValue: 'Snap clips to grid' })}
                      hint={t(
                        'settings.prefs.snapHint',
                        {},
                        { defaultValue: 'Snap to nearest frame on drag.' },
                      )}
                      active
                    />
                    <Toggle
                      label={t(
                        'settings.prefs.ripple',
                        {},
                        { defaultValue: 'Magnetic ripple edits' },
                      )}
                      hint={t(
                        'settings.prefs.rippleHint',
                        {},
                        { defaultValue: 'Adjacent clips shift when one is trimmed.' },
                      )}
                      active
                    />
                    <Toggle
                      label={t(
                        'settings.prefs.proxy',
                        {},
                        { defaultValue: 'Render proxies for 4K source' },
                      )}
                      hint={t(
                        'settings.prefs.proxyHint',
                        {},
                        { defaultValue: 'Speeds up scrubbing on heavy timelines.' },
                      )}
                    />
                    <Toggle
                      label={t(
                        'settings.prefs.autoBackup',
                        {},
                        { defaultValue: 'Auto-backup every 60s' },
                      )}
                      hint={t(
                        'settings.prefs.autoBackupHint',
                        { appName: APP_NAME },
                        { defaultValue: 'A copy is sent to {{appName}} cloud each minute.' },
                      )}
                      active
                    />
                  </div>
                </div>
                <section
                  className={cm.cn(
                    cm.sp('p', 6),
                    cm.stack(3),
                    'rounded-xl bg-[var(--video-panel-bg)] border border-[var(--video-border-subtle)]',
                  )}
                >
                  <h3
                    className={cm.cn(
                      cm.textSize('lg'),
                      cm.fontWeight('semibold'),
                      'text-[var(--video-text-primary)]',
                    )}
                  >
                    {t('footer.language', {}, { defaultValue: 'Language' })}
                  </h3>
                  <p className={cm.cn(cm.textSize('xs'), 'text-[var(--video-text-muted-alt)]')}>
                    {t(
                      'common.chooseTheLanguage',
                      {},
                      { defaultValue: 'Choose the language used throughout the app.' },
                    )}
                  </p>
                  <LanguagePicker />
                </section>
                <section
                  className={cm.cn(
                    cm.sp('p', 6),
                    cm.stack(3),
                    'rounded-xl bg-[var(--video-panel-bg)] border border-[var(--video-border-subtle)]',
                  )}
                >
                  <h3
                    className={cm.cn(
                      cm.textSize('lg'),
                      cm.fontWeight('semibold'),
                      'text-[var(--video-text-primary)]',
                    )}
                  >
                    {t('nav.appearance', {}, { defaultValue: 'Appearance' })}
                  </h3>
                  <p className={cm.cn(cm.textSize('xs'), 'text-[var(--video-text-muted-alt)]')}>
                    {t(
                      'common.toggleLightDark',
                      {},
                      { defaultValue: 'Toggle between light and dark mode.' },
                    )}
                  </p>
                  <ThemeToggle />
                </section>
              </div>
            )}

            {section === 'storage' && (
              <div data-mol-id="settings-storage-panel" className={cm.cn(cm.stack(4))}>
                <div className={cm.cn('grid grid-cols-2 lg:grid-cols-4 gap-4')}>
                  <StudioStatTile
                    label={t('settings.storage.used', {}, { defaultValue: 'Used' })}
                    value={formatGB(totalBytes)}
                    unit="GB"
                    accent="violet"
                    icon="hard_drive"
                  />
                  <StudioStatTile
                    label={t('settings.storage.assets', {}, { defaultValue: 'Assets' })}
                    value={String(assets.length)}
                    accent="cyan"
                    icon="video_library"
                  />
                  <StudioStatTile
                    label={t('nav.projects', {}, { defaultValue: 'Projects' })}
                    value={String(projects.length)}
                    accent="pink"
                    icon="folder"
                  />
                  <StudioStatTile
                    label={t('settings.storage.exports', {}, { defaultValue: 'Exports' })}
                    value={String(exports.length)}
                    unit="files"
                    accent="amber"
                    icon="movie"
                  />
                </div>
              </div>
            )}

            {section === 'billing' && (
              <div
                data-mol-id="settings-billing-panel"
                className={cm.cn(
                  cm.sp('p', 6),
                  cm.stack(5),
                  'rounded-xl bg-[var(--video-panel-bg)] border border-[var(--video-border-subtle)]',
                )}
              >
                <h3
                  className={cm.cn(
                    cm.textSize('lg'),
                    cm.fontWeight('semibold'),
                    'text-[var(--video-text-primary)]',
                  )}
                >
                  {t('nav.subscription', {}, { defaultValue: 'Subscription' })}
                </h3>
                {billingError && (
                  <p
                    role="alert"
                    data-mol-id="billing-error"
                    className={cm.cn(cm.textSize('sm'), 'text-[var(--video-error-text)] font-mono')}
                  >
                    {billingError}
                  </p>
                )}
                {billingLoading ? (
                  <p className={cm.cn(cm.textSize('sm'), 'text-[var(--video-text-muted-alt)]')}>
                    {t('settings.billing.loading', {}, { defaultValue: 'Loading billing…' })}
                  </p>
                ) : (
                  <>
                    <div
                      className={cm.cn(
                        cm.sp('p', 5),
                        'rounded-lg bg-gradient-to-br from-[var(--video-cta-from)]/20 to-[var(--video-cta-to)]/15 border border-[var(--video-cta-from)]/40',
                      )}
                    >
                      <p
                        className={cm.cn(
                          'font-mono text-[10px] uppercase tracking-widest text-[var(--video-link)]',
                        )}
                      >
                        {t('nav.currentPlan', {}, { defaultValue: 'Current plan' })}
                      </p>
                      <p
                        data-mol-id="billing-tier"
                        className={cm.cn(
                          cm.textSize('2xl'),
                          cm.fontWeight('bold'),
                          cm.sp('mt', 1),
                          'text-[var(--video-text-primary)]',
                        )}
                      >
                        {currentPlanName}
                      </p>
                      <p
                        data-mol-id="billing-status"
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.sp('mt', 1),
                          'text-[var(--video-text-muted-alt)]',
                        )}
                      >
                        {billing?.isFree
                          ? t(
                              'settings.billing.noSubscription',
                              {},
                              { defaultValue: 'No active subscription' },
                            )
                          : t(
                              'nav.cancelSubscription',
                              { plan: currentPlanName },
                              { defaultValue: `Active on ${currentPlanName}` },
                            )}
                      </p>
                      {!billing?.isFree && (
                        <button
                          type="button"
                          data-mol-id="billing-cancel"
                          onClick={handleCancel}
                          disabled={busy}
                          className={cm.cn(
                            cm.fontWeight('medium'),
                            cm.sp('mt', 4),
                            cm.sp('px', 4),
                            cm.sp('py', 2),
                            cm.textSize('sm'),
                            'rounded-lg border border-[var(--video-border-subtle)] hover:border-[var(--video-error-text)]/40 text-[var(--video-error-text)] transition-colors disabled:opacity-50',
                          )}
                        >
                          {t(
                            'settings.billing.cancel',
                            {},
                            { defaultValue: 'Cancel subscription' },
                          )}
                        </button>
                      )}
                    </div>
                    {tiers.length > 0 && (
                      <div className={cm.cn(cm.stack(3))}>
                        <h4
                          className={cm.cn(
                            cm.textSize('sm'),
                            cm.fontWeight('semibold'),
                            'text-[var(--video-text-primary)]',
                          )}
                        >
                          {t('settings.billing.upgrade', {}, { defaultValue: 'Available plans' })}
                        </h4>
                        <ul
                          className={cm.cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3')}
                          data-mol-id="billing-tiers"
                        >
                          {tiers.map((tier) => {
                            const tierKey = tier.key ?? tier.name ?? 'unknown'
                            const monthly = tier.prices?.find((p) => p.period === 'month')
                            const yearly = tier.prices?.find((p) => p.period === 'year')
                            const isCurrent =
                              currentPlanKey === tierKey ||
                              (tierKey === 'pro' &&
                                (currentPlanKey === 'stripeMonthly' ||
                                  currentPlanKey === 'stripeYearly')) ||
                              (tierKey === 'team' &&
                                (currentPlanKey === 'teamMonthly' ||
                                  currentPlanKey === 'teamYearly')) ||
                              (tierKey === 'free' && currentPlanKey === 'free')
                            return (
                              <li
                                key={tierKey}
                                className={cm.cn(
                                  cm.sp('p', 4),
                                  cm.stack(2),
                                  'rounded-md bg-[var(--video-input-bg)] border border-[var(--video-border-subtle)]',
                                )}
                              >
                                <p
                                  className={cm.cn(
                                    cm.textSize('sm'),
                                    cm.fontWeight('semibold'),
                                    'text-[var(--video-text-primary)]',
                                  )}
                                >
                                  {tier.name ?? tierKey}
                                </p>
                                <p
                                  className={cm.cn(
                                    cm.textSize('xs'),
                                    'text-[var(--video-text-muted-alt)] font-mono',
                                  )}
                                >
                                  {monthly?.price ?? t('nav.free', {}, { defaultValue: 'Free' })}
                                </p>
                                {yearly?.price && (
                                  <p
                                    className={cm.cn(
                                      cm.textSize('xs'),
                                      'text-[var(--video-text-dim)] font-mono',
                                    )}
                                  >
                                    {yearly.price}
                                  </p>
                                )}
                                {tier.features && tier.features.length > 0 && (
                                  <ul
                                    className={cm.cn(
                                      cm.textSize('xs'),
                                      'text-[var(--video-text-muted-alt)]',
                                    )}
                                  >
                                    {tier.features.slice(0, 3).map((f) => (
                                      <li key={f}>· {f}</li>
                                    ))}
                                  </ul>
                                )}
                                {isCurrent ? (
                                  <span
                                    data-mol-id={`billing-current-${tierKey}`}
                                    className={cm.cn(
                                      'font-mono text-[10px] uppercase tracking-widest text-[var(--video-secondary)]',
                                    )}
                                  >
                                    {t('nav.current', {}, { defaultValue: 'Current' })}
                                  </span>
                                ) : (
                                  <div
                                    className={cm.cn(
                                      cm.flex({ direction: 'col', gap: 2 }),
                                      cm.sp('mt', 2),
                                    )}
                                  >
                                    {monthly?.stripePriceId && (
                                      <button
                                        type="button"
                                        data-mol-id={`billing-checkout-${tierKey}-monthly`}
                                        onClick={() => handleCheckout(monthly.stripePriceId!)}
                                        disabled={busy}
                                        className={cm.cn(
                                          cm.fontWeight('semibold'),
                                          cm.sp('px', 3),
                                          cm.sp('py', 1),
                                          cm.textSize('xs'),
                                          'rounded-md bg-gradient-to-r from-[var(--video-cta-from)] to-[var(--video-cta-to)] text-white hover:opacity-90 disabled:opacity-50',
                                        )}
                                      >
                                        {t(
                                          'settings.billing.upgradeMonthly',
                                          {},
                                          { defaultValue: 'Upgrade monthly' },
                                        )}
                                      </button>
                                    )}
                                    {yearly?.stripePriceId && (
                                      <button
                                        type="button"
                                        data-mol-id={`billing-checkout-${tierKey}-yearly`}
                                        onClick={() => handleCheckout(yearly.stripePriceId!)}
                                        disabled={busy}
                                        className={cm.cn(
                                          cm.fontWeight('medium'),
                                          cm.sp('px', 3),
                                          cm.sp('py', 1),
                                          cm.textSize('xs'),
                                          'rounded-md border border-[var(--video-cta-from)]/40 text-[var(--video-link)] hover:bg-[var(--video-cta-from)]/10 disabled:opacity-50',
                                        )}
                                      >
                                        {t(
                                          'settings.billing.upgradeYearly',
                                          {},
                                          { defaultValue: 'Upgrade yearly' },
                                        )}
                                      </button>
                                    )}
                                  </div>
                                )}
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </RushesLayout>
  )
}

interface ToggleProps {
  label: string
  hint: string
  active?: boolean
}
function Toggle({ label, hint, active = false }: ToggleProps) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between', gap: 4 }),
        cm.sp('p', 4),
        'rounded-md bg-[var(--video-input-bg)] border border-[var(--video-border-subtle)]',
      )}
    >
      <div className={cm.stack(0)}>
        <p
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            'text-[var(--video-text-primary)]',
          )}
        >
          {label}
        </p>
        <p className={cm.cn(cm.textSize('xs'), 'text-[var(--video-text-muted-alt)]')}>{hint}</p>
      </div>
      <span
        className={cm.cn(
          'w-10 h-6 rounded-full relative transition-colors',
          active
            ? 'bg-gradient-to-r from-[var(--video-cta-from)] to-[var(--video-cta-to)]'
            : 'bg-[var(--video-border-subtle)]',
        )}
      >
        <span
          className={cm.cn(
            'absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform',
            active ? 'translate-x-4' : 'translate-x-0.5',
          )}
        />
      </span>
    </div>
  )
}

export default Settings
