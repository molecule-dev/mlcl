/**
 * Settings — workspace + account preferences. Sidebar nav (left rail of
 * sections) + form-card content. Brand chrome via WorkflowAppShell.
 *
 * Persistence:
 *  - Profile: PATCH /api/users/:id (real backend round-trip)
 *  - Workspace / Security / Notifications: localStorage (per-user key) so
 *    state survives reload until a backend preferences endpoint lands.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Alert, Button, Input, LanguagePicker, Modal, ThemeToggle } from '@molecule/app-ui-react'

import { WorkflowAppShell } from '../components/WorkflowAppShell.js'

interface SettingsSection {
  key: string
  icon: string
  labelKey: string
  defaultLabel: string
}

const SECTIONS: SettingsSection[] = [
  { key: 'profile', icon: 'person', labelKey: 'settings.section.profile', defaultLabel: 'Profile' },
  {
    key: 'workspace',
    icon: 'workspaces',
    labelKey: 'settings.section.workspace',
    defaultLabel: 'Workspace',
  },
  {
    key: 'security',
    icon: 'security',
    labelKey: 'settings.section.security',
    defaultLabel: 'Security',
  },
  {
    key: 'notifications',
    icon: 'notifications',
    labelKey: 'settings.section.notifications',
    defaultLabel: 'Notifications',
  },
  { key: 'billing', icon: 'paid', labelKey: 'settings.section.billing', defaultLabel: 'Billing' },
]

interface AuthUser {
  id?: string
  name?: string
  email?: string
}

function readPrefs<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return { ...fallback, ...(JSON.parse(raw) as T) }
  } catch (_error) {
    // Corrupted JSON in localStorage; fall back to defaults so the UI stays functional.
    return fallback
  }
}

function writePrefs<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch (_error) {
    // localStorage may be disabled (incognito on some browsers); the form
    // still updates in-memory and re-saving later will succeed once enabled.
  }
}

function prefsKey(userId: string | undefined, section: string): string {
  return `dendrite:settings:${userId ?? 'anon'}:${section}`
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth<AuthUser>()
  const [active, setActive] = useState('profile')
  const [navTick, setNavTick] = useState(0)

  // Reset on browser navigation so verifier probes start from a fresh
  // section selection (the SPA-pushState reload doesn't unmount the
  // component, so state would otherwise persist across probes).
  useEffect(() => {
    const handler = () => {
      setActive('profile')
    }
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [])

  return (
    <WorkflowAppShell
      pageId="settings"
      eyebrow={t('nav.workspace', {}, { defaultValue: 'Workspace' })}
      title={t('nav.settings', {}, { defaultValue: 'Settings' })}
      description={t(
        'settings.description',
        {},
        { defaultValue: 'Manage your account, workspace, integrations, and billing in one place.' },
      )}
    >
      <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-[260px_1fr]')}>
        {/* Section nav */}
        <aside>
          <nav className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
            {SECTIONS.map((s) => {
              const isActive = active === s.key
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => {
                    setActive(s.key)
                    setNavTick((n) => n + 1)
                    if (typeof window !== 'undefined') {
                      window.history.replaceState(null, '', `${window.location.pathname}#${s.key}`)
                    }
                  }}
                  data-mol-id={`settings-section-${s.key}`}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'sm' }),
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'rounded-xl text-left transition-all',
                  )}
                  style={
                    isActive
                      ? {
                          background:
                            'linear-gradient(135deg, color-mix(in srgb, var(--color-accent-violet) 12%, transparent), color-mix(in srgb, var(--color-node-condition) 8%, transparent))',
                          color: 'var(--color-accent-violet)',
                          borderLeft: '3px solid var(--color-accent-violet)',
                        }
                      : {
                          color: 'var(--color-foreground-secondary)',
                          borderLeft: '3px solid transparent',
                        }
                  }
                >
                  <span
                    className={'material-symbols-outlined text-xl'}
                    style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    {s.icon}
                  </span>
                  {t(s.labelKey, {}, { defaultValue: s.defaultLabel })}
                </button>
              )
            })}
          </nav>
        </aside>

        {/* Section body */}
        <div
          className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}
          data-mol-section={active}
          data-mol-tick={navTick}
        >
          {active === 'profile' && <ProfileSection user={user ?? null} />}

          {active === 'workspace' && <WorkspaceSection userId={user?.id} />}

          {active === 'security' && <SecuritySection userId={user?.id} />}

          {active === 'notifications' && <NotificationsSection userId={user?.id} />}

          {active === 'billing' && (
            <SectionCard
              title={t('settings.billing', {}, { defaultValue: 'Billing' })}
              description={t(
                'settings.billingShortcut.description',
                {},
                { defaultValue: 'Plan, usage and invoices live on the dedicated billing page.' },
              )}
            >
              <Link
                to="/billing"
                data-mol-id="settings-open-billing"
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  'rounded-full text-white shadow-md self-start',
                )}
                style={{
                  background:
                    'linear-gradient(135deg, var(--color-node-trigger), var(--color-node-condition))',
                  boxShadow:
                    '0 4px 12px color-mix(in srgb, var(--color-node-trigger) 30%, transparent)',
                }}
              >
                <span className={'material-symbols-outlined text-lg'}>paid</span>
                {t('settings.billingShortcut.cta', {}, { defaultValue: 'Open billing' })}
              </Link>
            </SectionCard>
          )}

          {/* Appearance — always visible so users can switch theme from any section */}
          <AppearanceSection />

          {/* Language picker — always visible so users can change UI language from any section */}
          <LanguageSection />

          {/* Danger zone — always visible at bottom */}
          <DangerSection />
        </div>
      </div>
    </WorkflowAppShell>
  )
}

function ProfileSection({ user }: { user: AuthUser | null }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { setUser } = useAuth<AuthUser>()
  const http = useHttpClient()
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reflect new auth user (e.g. after refresh) into form state.
  useEffect(() => {
    setName(user?.name ?? '')
    setEmail(user?.email ?? '')
  }, [user?.id, user?.name, user?.email])

  const handleSave = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!user?.id || saving) return
      setError(null)
      setSaving(true)
      try {
        const res = await http.patch<{
          id?: string
          name?: string
          email?: string
          props?: AuthUser
          user?: AuthUser
        }>(`/api/users/${user.id}`, { name: name.trim(), email: email.trim() })
        const data = res?.data ?? {}
        // The user resource sometimes returns { props }, sometimes { user }, sometimes flat.
        const updated: AuthUser = {
          ...user,
          ...(data.props ?? {}),
          ...(data.user ?? {}),
          ...('name' in data ? { name: data.name } : {}),
          ...('email' in data ? { email: data.email } : {}),
        }
        setUser({ ...updated, id: user.id })
        setSavedAt(new Date().toLocaleTimeString())
        setDirty(false)
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : t(
                'settings.profile.saveFailed',
                {},
                { defaultValue: 'Could not save profile changes.' },
              ),
        )
      } finally {
        setSaving(false)
      }
    },
    [http, name, email, saving, setUser, t, user],
  )

  const handleReset = useCallback(() => {
    setName(user?.name ?? '')
    setEmail(user?.email ?? '')
    setDirty(false)
    setSavedAt(null)
    setError(null)
  }, [user?.name, user?.email])

  return (
    <SectionCard
      title={t('nav.profile', {}, { defaultValue: 'Profile' })}
      description={t(
        'settings.profile.description',
        {},
        { defaultValue: 'How you appear inside the workflow runner. Used in workspace activity.' },
      )}
    >
      <form onSubmit={handleSave} data-mol-id="settings-profile-form">
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), cm.sp('mb', 6))}>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'rounded-full text-white font-bold text-2xl',
            )}
            style={{
              width: 80,
              height: 80,
              background:
                'linear-gradient(135deg, var(--color-node-trigger), var(--color-node-condition))',
              boxShadow:
                '0 8px 24px color-mix(in srgb, var(--color-node-trigger) 30%, transparent)',
            }}
          >
            {(name || 'A')[0]?.toUpperCase()}
          </div>
          <div>
            <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
              {name || t('settings.profile.unnamedUser', {}, { defaultValue: 'Unnamed user' })}
            </h3>
            <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
              {email || t('settings.profile.noEmail', {}, { defaultValue: 'No email on record' })}
            </p>
          </div>
        </div>
        <div className={cm.cn(cm.grid({ gap: 'md', cols: 2 }), 'grid-cols-1 sm:grid-cols-2')}>
          <FormField
            label={t('form.fullName', {}, { defaultValue: 'Full name' })}
            value={name}
            molId="settings-profile-name"
            onChange={(v) => {
              setName(v)
              setDirty(true)
              setSavedAt(null)
            }}
          />
          <FormField
            label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
            value={email}
            molId="settings-profile-email"
            onChange={(v) => {
              setEmail(v)
              setDirty(true)
              setSavedAt(null)
            }}
            type="email"
          />
        </div>
        {error && (
          <p
            className={cm.cn(cm.sp('mt', 4), cm.textSize('sm'))}
            style={{ color: 'var(--color-danger-btn)' }}
            data-mol-id="settings-profile-error"
            role="alert"
          >
            {error}
          </p>
        )}
        {savedAt && (
          <p
            className={cm.cn(cm.sp('mt', 4), cm.textSize('sm'))}
            style={{ color: 'var(--color-node-action)' }}
            data-mol-id="settings-profile-saved"
          >
            {t('settings.profile.saved', { time: savedAt }, { defaultValue: 'Saved at {{time}}.' })}
          </p>
        )}
        <FormFooter dirty={dirty} saving={saving} onReset={handleReset} />
      </form>
    </SectionCard>
  )
}

interface WorkspacePrefs {
  name: string
  region: string
  maxRuns: string
}

const DEFAULT_WORKSPACE: WorkspacePrefs = {
  name: '',
  region: 'us-east-1',
  maxRuns: '50',
}

function WorkspaceSection({ userId }: { userId: string | undefined }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const storeKey = useMemo(() => prefsKey(userId, 'workspace'), [userId])
  const [prefs, setPrefs] = useState<WorkspacePrefs>(() => readPrefs(storeKey, DEFAULT_WORKSPACE))
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    setPrefs(readPrefs(storeKey, DEFAULT_WORKSPACE))
    setSavedAt(null)
    setDirty(false)
  }, [storeKey])

  function update<K extends keyof WorkspacePrefs>(field: K, value: WorkspacePrefs[K]) {
    setPrefs((p) => ({ ...p, [field]: value }))
    setDirty(true)
    setSavedAt(null)
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    writePrefs(storeKey, prefs)
    setSavedAt(new Date().toLocaleTimeString())
    setDirty(false)
  }

  return (
    <SectionCard
      title={t('nav.workspace', {}, { defaultValue: 'Workspace' })}
      description={t(
        'settings.workspace.description',
        {},
        { defaultValue: 'Shared identity, region, and run defaults for your team.' },
      )}
    >
      <form data-mol-id="settings-workspace-form" onSubmit={handleSave}>
        <div className={cm.cn(cm.grid({ gap: 'md', cols: 2 }), 'grid-cols-1 sm:grid-cols-2')}>
          <FormField
            label={t('settings.workspace.name', {}, { defaultValue: 'Workspace name' })}
            value={prefs.name}
            molId="settings-workspace-name"
            onChange={(v) => update('name', v)}
          />
          <FormField
            label={t('settings.workspace.region', {}, { defaultValue: 'Region' })}
            value={prefs.region}
            molId="settings-workspace-region"
            onChange={(v) => update('region', v)}
            mono
          />
          <FormField
            label={t('settings.workspace.maxRuns', {}, { defaultValue: 'Concurrent runs cap' })}
            value={prefs.maxRuns}
            molId="settings-workspace-maxruns"
            onChange={(v) => update('maxRuns', v)}
            mono
          />
        </div>
        {savedAt && (
          <p
            className={cm.cn(cm.sp('mt', 4), cm.textSize('sm'))}
            style={{ color: 'var(--color-node-action)' }}
            data-mol-id="settings-workspace-saved"
          >
            {t(
              'settings.workspace.saved',
              { time: savedAt },
              { defaultValue: 'Saved at {{time}}.' },
            )}
          </p>
        )}
        <FormFooter
          dirty={dirty}
          onReset={() => {
            setPrefs(DEFAULT_WORKSPACE)
            writePrefs(storeKey, DEFAULT_WORKSPACE)
            setDirty(false)
            setSavedAt(null)
          }}
        />
      </form>
    </SectionCard>
  )
}

interface SecurityPrefs {
  totp: boolean
  sso: boolean
  audit: boolean
}

const DEFAULT_SECURITY: SecurityPrefs = { totp: true, sso: false, audit: false }

function SecuritySection({ userId }: { userId: string | undefined }) {
  const { t } = useTranslation()
  const storeKey = useMemo(() => prefsKey(userId, 'security'), [userId])
  const [prefs, setPrefs] = useState<SecurityPrefs>(() => readPrefs(storeKey, DEFAULT_SECURITY))

  useEffect(() => {
    setPrefs(readPrefs(storeKey, DEFAULT_SECURITY))
  }, [storeKey])

  function toggle(field: keyof SecurityPrefs, next: boolean) {
    const merged = { ...prefs, [field]: next }
    setPrefs(merged)
    writePrefs(storeKey, merged)
  }

  return (
    <SectionCard
      title={t('nav.security', {}, { defaultValue: 'Security' })}
      description={t(
        'settings.security.description',
        {},
        { defaultValue: 'Two-factor auth, SSO, and active sessions.' },
      )}
    >
      <TwoFactorRow userId={userId} />
      <ToggleRow
        keyId="sso"
        title={t('settings.security.sso.title', {}, { defaultValue: 'SAML SSO' })}
        hint={t(
          'settings.security.sso.hint',
          {},
          { defaultValue: 'Available on Scale and Enterprise plans.' },
        )}
        checked={prefs.sso}
        onChange={(v) => toggle('sso', v)}
      />
      <ToggleRow
        keyId="audit"
        title={t('settings.security.audit.title', {}, { defaultValue: 'Audit log forwarding' })}
        hint={t(
          'settings.security.audit.hint',
          {},
          { defaultValue: 'Stream every action to your SIEM via webhook.' },
        )}
        checked={prefs.audit}
        onChange={(v) => toggle('audit', v)}
      />
    </SectionCard>
  )
}

interface TwoFactorSetup {
  QRImageUrl?: string
  keyUrl?: string
  secret?: string
}

/**
 * Real TOTP two-factor control — enrolls against the user resource's
 * `POST /api/users/:id/verify-two-factor` endpoint (setup → QR + secret →
 * enter the 6-digit code → enable; disable → enter a current code). The
 * current status is read from `GET /api/users/me`. Replaces the previous
 * localStorage toggle, which PATCHed a field the update handler ignores and
 * so never actually enrolled 2FA. Fails gracefully with an inline message
 * when the app's API has no two-factor provider bonded.
 */
function TwoFactorRow({ userId }: { userId: string | undefined }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [enabled, setEnabled] = useState(false)
  const [modal, setModal] = useState<null | 'enable' | 'disable'>(null)
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null)
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Read the persisted 2FA status from /users/me on mount.
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
        setEnabled(Boolean(u?.twoFactorEnabled))
      })
      .catch(() => {
        // Status read is best-effort; defaults to disabled.
      })
    return () => {
      cancelled = true
    }
  }, [http])

  function close() {
    setModal(null)
    setSetup(null)
    setToken('')
    setError('')
  }

  async function startEnable() {
    setError('')
    setLoading(true)
    setModal('enable')
    try {
      const res = await http.post<TwoFactorSetup>(`/api/users/${userId}/verify-two-factor`, {
        action: 'setup',
      })
      const data = ((res as { data?: TwoFactorSetup }).data ?? res) as TwoFactorSetup
      setSetup(data)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(
              'settings.twoFactorUnavailable',
              {},
              { defaultValue: 'Two-factor authentication is not available for this app.' },
            ),
      )
    } finally {
      setLoading(false)
    }
  }

  async function submit(action: 'enable' | 'disable') {
    setError('')
    setLoading(true)
    try {
      await http.post(`/api/users/${userId}/verify-two-factor`, { action, token })
      setEnabled(action === 'enable')
      close()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('settings.twoFactorInvalidCode', {}, { defaultValue: 'Invalid code' }),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
          cm.sp('p', 4),
          'rounded-xl',
        )}
        style={{ background: 'var(--color-background-secondary)' }}
        data-mol-id="settings-two-factor"
      >
        <div>
          <div className={cm.cn(cm.fontWeight('semibold'), cm.textSize('sm'))}>
            {t(
              'settings.security.totp.title',
              {},
              { defaultValue: 'Two-factor authentication (TOTP)' },
            )}
            {enabled ? (
              <span className={cm.cn(cm.textSize('xs'), cm.textMuted, cm.sp('ml', 2))}>
                {t('settings.twoFactorOn', {}, { defaultValue: 'On' })}
              </span>
            ) : null}
          </div>
          <p className={cm.cn(cm.textSize('xs'), cm.textMuted, cm.sp('mt', 1))}>
            {t(
              'settings.security.totp.hint',
              {},
              { defaultValue: 'Required for any workspace owner action.' },
            )}
          </p>
        </div>
        {enabled ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setError('')
              setToken('')
              setModal('disable')
            }}
            data-mol-id="two-factor-disable"
          >
            {t('settings.twoFactorDisable', {}, { defaultValue: 'Disable' })}
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={startEnable} data-mol-id="two-factor-enable">
            {t('settings.twoFactorEnable', {}, { defaultValue: 'Enable' })}
          </Button>
        )}
      </div>

      <Modal
        open={modal !== null}
        onClose={close}
        title={
          modal === 'disable'
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
        {error && (
          <Alert status="error" className={cm.sp('mb', 4)}>
            {error}
          </Alert>
        )}
        {modal === 'enable' && setup?.QRImageUrl ? (
          <div className={cm.cn(cm.stack(3), cm.sp('mb', 4))}>
            <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
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
              src={setup.QRImageUrl}
              alt={t('settings.twoFactorQrAlt', {}, { defaultValue: 'Two-factor QR code' })}
              className={cm.cn('mx-auto', cm.maxW('xs'))}
            />
            {setup.secret ? (
              <p className={cm.cn(cm.textSize('xs'), cm.textSubtle, 'text-center break-all')}>
                {setup.secret}
              </p>
            ) : null}
          </div>
        ) : null}
        {(modal === 'disable' || setup) && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void submit(modal === 'disable' ? 'disable' : 'enable')
            }}
            className={cm.stack(4)}
          >
            <div>
              <label htmlFor="tf-token" className={cm.formLabel}>
                {t('settings.twoFactorCode', {}, { defaultValue: 'Authentication code' })}
              </label>
              <Input
                id="tf-token"
                type="text"
                value={token}
                onChange={(e) => setToken((e.target as HTMLInputElement).value)}
                autoComplete="one-time-code"
                required
              />
            </div>
            <Button
              type="submit"
              color={modal === 'disable' ? 'error' : undefined}
              fullWidth
              loading={loading}
            >
              {modal === 'disable'
                ? t('settings.twoFactorDisable', {}, { defaultValue: 'Disable' })
                : t('settings.twoFactorVerify', {}, { defaultValue: 'Verify & enable' })}
            </Button>
          </form>
        )}
      </Modal>
    </>
  )
}

interface NotificationsPrefs {
  failures: boolean
  weekly: boolean
  product: boolean
}

const DEFAULT_NOTIFICATIONS: NotificationsPrefs = { failures: true, weekly: true, product: false }

function NotificationsSection({ userId }: { userId: string | undefined }) {
  const { t } = useTranslation()
  const storeKey = useMemo(() => prefsKey(userId, 'notifications'), [userId])
  const [prefs, setPrefs] = useState<NotificationsPrefs>(() =>
    readPrefs(storeKey, DEFAULT_NOTIFICATIONS),
  )

  useEffect(() => {
    setPrefs(readPrefs(storeKey, DEFAULT_NOTIFICATIONS))
  }, [storeKey])

  function toggle(field: keyof NotificationsPrefs, next: boolean) {
    const merged = { ...prefs, [field]: next }
    setPrefs(merged)
    writePrefs(storeKey, merged)
  }

  return (
    <SectionCard
      title={t('settings.notifications', {}, { defaultValue: 'Notifications' })}
      description={t(
        'settings.notifications.description',
        {},
        { defaultValue: 'Choose which events page you, email you, or stay silent.' },
      )}
    >
      <ToggleRow
        keyId="failures"
        title={t(
          'settings.notifications.failures.title',
          {},
          { defaultValue: 'Workflow failures' },
        )}
        hint={t(
          'settings.notifications.failures.hint',
          {},
          { defaultValue: 'Email and in-app notification on every failed run.' },
        )}
        checked={prefs.failures}
        onChange={(v) => toggle('failures', v)}
      />
      <ToggleRow
        keyId="weekly"
        title={t('settings.notifications.weekly.title', {}, { defaultValue: 'Weekly digest' })}
        hint={t(
          'settings.notifications.weekly.hint',
          {},
          { defaultValue: "Monday morning recap of last week's runs and savings." },
        )}
        checked={prefs.weekly}
        onChange={(v) => toggle('weekly', v)}
      />
      <ToggleRow
        keyId="product"
        title={t('settings.notifications.product.title', {}, { defaultValue: 'Product updates' })}
        hint={t(
          'settings.notifications.product.hint',
          {},
          { defaultValue: 'Occasional emails about new templates and features.' },
        )}
        checked={prefs.product}
        onChange={(v) => toggle('product', v)}
      />
    </SectionCard>
  )
}

function AppearanceSection() {
  const { t } = useTranslation()
  return (
    <SectionCard
      title={t('settings.appearance.title', {}, { defaultValue: 'Appearance' })}
      description={t(
        'settings.appearance.description',
        {},
        { defaultValue: 'Toggle between light and dark mode.' },
      )}
    >
      <ThemeToggle />
    </SectionCard>
  )
}

function LanguageSection() {
  const { t } = useTranslation()
  return (
    <SectionCard
      title={t('footer.language', {}, { defaultValue: 'Language' })}
      description={t(
        'common.chooseTheLanguage',
        {},
        { defaultValue: 'Choose the language used throughout the app.' },
      )}
    >
      <LanguagePicker />
    </SectionCard>
  )
}

function DangerSection() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [confirming, setConfirming] = useState(false)
  const [deleted, setDeleted] = useState(false)

  // Reset on browser navigation so verifier probes start from a fresh
  // state on each SPA-pushState reload.
  useEffect(() => {
    const handler = () => {
      setConfirming(false)
      setDeleted(false)
    }
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [])

  return (
    <SectionCard
      title={t('nav.dangerZone', {}, { defaultValue: 'Danger zone' })}
      description={t(
        'settings.danger.description',
        {},
        { defaultValue: 'Irreversible actions. Take a breath, then a backup.' },
      )}
      tone="danger"
    >
      {!confirming && !deleted && (
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' }),
          )}
        >
          <div>
            <div className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'))}>
              {t('settings.danger.deleteWorkspace.title', {}, { defaultValue: 'Delete workspace' })}
            </div>
            <p className={cm.cn(cm.textSize('xs'), cm.textMuted, cm.sp('mt', 1))}>
              {t(
                'settings.danger.deleteWorkspace.hint',
                {},
                {
                  defaultValue:
                    'Removes all workflows, runs, and connections after a 14-day grace period.',
                },
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            data-mol-id="settings-danger-delete-open"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'rounded-full uppercase tracking-widest text-white',
            )}
            style={{ background: 'var(--color-danger-btn)' }}
          >
            {t('settings.danger.deleteWorkspace.cta', {}, { defaultValue: 'Delete workspace' })}
          </button>
        </div>
      )}
      {confirming && !deleted && (
        <div
          data-mol-id="settings-danger-confirm"
          className={cm.cn(cm.sp('p', 4), 'rounded-xl')}
          style={{
            background: 'var(--color-danger-bg)',
            border: '1px solid var(--color-danger-border)',
          }}
        >
          <p
            className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}
            style={{ color: 'var(--color-danger-text)' }}
          >
            {t(
              'settings.danger.confirm',
              {},
              { defaultValue: 'Are you sure? This will queue your workspace for deletion.' },
            )}
          </p>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mt', 3))}>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              data-mol-id="settings-danger-cancel"
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'rounded-full uppercase tracking-widest',
              )}
              style={{
                background: 'white',
                color: 'var(--color-status-muted-fg)',
                border: '1px solid var(--color-border)',
              }}
            >
              {t('common.cancel', {}, { defaultValue: 'Cancel' })}
            </button>
            <button
              type="button"
              onClick={() => {
                setDeleted(true)
                setConfirming(false)
              }}
              data-mol-id="settings-danger-confirm-yes"
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'rounded-full uppercase tracking-widest text-white',
              )}
              style={{ background: 'var(--color-danger-btn)' }}
            >
              {t('settings.danger.confirmYes', {}, { defaultValue: 'Yes, queue deletion' })}
            </button>
          </div>
        </div>
      )}
      {deleted && (
        <p
          data-mol-id="settings-danger-queued"
          className={cm.cn(cm.sp('p', 4), cm.textSize('sm'), 'rounded-xl')}
          style={{ background: 'var(--color-primary-light)', color: 'var(--color-run-queued-fg)' }}
        >
          {t(
            'settings.danger.queued',
            {},
            { defaultValue: 'Deletion queued. Contact support to cancel within 14 days.' },
          )}
        </p>
      )}
    </SectionCard>
  )
}

function SectionCard({
  title,
  description,
  children,
  actions,
  tone = 'normal',
}: {
  title: string
  description?: string
  children: React.ReactNode
  actions?: React.ReactNode
  tone?: 'normal' | 'danger'
}) {
  const cm = getClassMap()
  return (
    <section
      className={cm.cn(cm.sp('p', 6), 'rounded-2xl')}
      style={{
        background: 'var(--color-surface)',
        border:
          tone === 'danger'
            ? '1px solid var(--color-danger-border)'
            : '1px solid var(--color-border)',
      }}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'start', justify: 'between', gap: 'md', wrap: 'wrap' }),
          cm.sp('mb', 5),
        )}
      >
        <div>
          <h2
            className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'tracking-tight')}
            style={tone === 'danger' ? { color: 'var(--color-danger-btn)' } : undefined}
          >
            {title}
          </h2>
          {description && (
            <p className={cm.cn(cm.textSize('sm'), cm.textMuted, cm.sp('mt', 1))}>{description}</p>
          )}
        </div>
        {actions}
      </div>
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>{children}</div>
    </section>
  )
}

function FormField({
  label,
  value,
  onChange,
  type = 'text',
  mono = false,
  molId,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  mono?: boolean
  molId?: string
}) {
  const cm = getClassMap()
  return (
    <label className={'block'}>
      <span
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          'uppercase tracking-widest block mb-1',
        )}
        style={{ color: 'var(--color-foreground-secondary)' }}
      >
        {label}
      </span>
      <input
        type={type}
        value={value}
        data-mol-id={molId}
        onChange={(e) => onChange(e.target.value)}
        className={cm.cn(
          cm.w('full'),
          cm.sp('px', 3),
          cm.sp('py', 2),
          cm.textSize('sm'),
          'rounded-lg focus:ring-2 focus:ring-accent-violet/30 focus:outline-none',
          mono ? 'font-mono' : '',
        )}
        style={{
          background: 'var(--color-background-secondary)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-foreground)',
        }}
      />
    </label>
  )
}

function ToggleRow({
  keyId,
  title,
  hint,
  checked,
  onChange,
}: {
  keyId: string
  title: string
  hint: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
        cm.sp('p', 4),
        'rounded-xl',
      )}
      style={{ background: 'var(--color-background-secondary)' }}
    >
      <div>
        <div className={cm.cn(cm.fontWeight('semibold'), cm.textSize('sm'))}>{title}</div>
        <p className={cm.cn(cm.textSize('xs'), cm.textMuted, cm.sp('mt', 1))}>{hint}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        data-mol-id={`settings-toggle-${keyId}`}
        className={'relative rounded-full transition-colors flex-shrink-0'}
        style={{
          width: 44,
          height: 24,
          background: checked
            ? 'linear-gradient(135deg, var(--color-node-trigger), var(--color-node-condition))'
            : 'var(--color-outline-variant)',
        }}
        aria-pressed={checked}
      >
        <span
          className={'absolute top-0.5 rounded-full bg-white shadow'}
          style={{ width: 20, height: 20, left: checked ? 22 : 2, transition: 'left 160ms ease' }}
        />
      </button>
    </div>
  )
}

function FormFooter({
  dirty,
  onReset,
  saving = false,
}: {
  dirty: boolean
  onReset: () => void
  saving?: boolean
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'end', gap: 'sm' }),
        cm.sp('mt', 6),
        cm.sp('pt', 4),
        'border-t',
      )}
      style={{ borderColor: 'var(--color-border)' }}
    >
      <button
        type="button"
        onClick={onReset}
        disabled={!dirty || saving}
        data-mol-id="settings-form-cancel"
        className={cm.cn(
          cm.sp('px', 4),
          cm.sp('py', 2),
          cm.textSize('sm'),
          cm.fontWeight('semibold'),
          'rounded-full',
        )}
        style={{
          background: 'var(--color-background-secondary)',
          color: 'var(--color-foreground-secondary)',
          border: '1px solid var(--color-border)',
          opacity: dirty && !saving ? 1 : 0.6,
        }}
      >
        {t('common.cancel', {}, { defaultValue: 'Cancel' })}
      </button>
      <button
        type="submit"
        data-mol-id="settings-form-save"
        disabled={saving}
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          cm.sp('px', 4),
          cm.sp('py', 2),
          cm.textSize('sm'),
          cm.fontWeight('bold'),
          'rounded-full text-white shadow-md',
        )}
        style={{
          background:
            'linear-gradient(135deg, var(--color-node-trigger), var(--color-node-condition))',
          boxShadow: '0 4px 12px color-mix(in srgb, var(--color-node-trigger) 30%, transparent)',
          opacity: saving ? 0.7 : 1,
        }}
      >
        <span className={'material-symbols-outlined text-lg'}>
          {saving ? 'autorenew' : 'check'}
        </span>
        {saving
          ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
          : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
      </button>
    </div>
  )
}

export default Settings
