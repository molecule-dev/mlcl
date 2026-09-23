import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

const SETTINGS_NAV = [
  { key: 'organization', defaultLabel: 'Organization', icon: 'corporate_fare' },
  { key: 'account', defaultLabel: 'Account', icon: 'person' },
  { key: 'language', defaultLabel: 'Language', icon: 'language' },
  { key: 'billing', defaultLabel: 'Billing', icon: 'credit_card' },
] as const

type SettingsKey = (typeof SETTINGS_NAV)[number]['key']

interface UserMe {
  props: {
    id: string
    email?: string | null
    name?: string | null
    planKey?: string | null
  }
  plan: {
    name: string
    description: string
    capabilities?: { premium?: boolean }
    isExpired?: boolean
    expiresAt?: string | null
    autoRenews?: boolean
  }
}

/**
 * Workspace settings slice served by GET/PATCH /api/settings.
 *
 * Why not `oauthData` off /api/users/me: the platform user resource NEVER
 * returns `oauthData` on reads, so organization settings persisted through
 * the user CRUD silently reset on every reload. /api/settings reads/merges
 * the stored slice server-side instead.
 */
interface WorkspaceSettings {
  org_name?: string
}

interface BillingStatus {
  planKey: string
  category: string
  name: string
  isFree: boolean
  limits: {
    maxFlags: number
    maxEnvironments: number
    maxAuditLog: number
    advancedFeatures: boolean
    canExport: boolean
    retentionDays: number
  }
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()

  const [section, setSection] = useState<SettingsKey>('organization')
  const [me, setMe] = useState<UserMe | null>(null)
  const [billing, setBilling] = useState<BillingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [orgName, setOrgName] = useState('')
  const [savingOrg, setSavingOrg] = useState(false)
  const [orgSaved, setOrgSaved] = useState(false)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [savingAccount, setSavingAccount] = useState(false)
  const [accountSaved, setAccountSaved] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const meRes = await http.get<UserMe>('/api/users/me')
        const billingRes = await http.get<BillingStatus>('/api/billing/status')
        const settingsRes = await http.get<{ settings: WorkspaceSettings }>('/api/settings')
        if (cancelled) return
        const meData = (meRes.data as UserMe) ?? null
        setMe(meData)
        setBilling((billingRes.data as BillingStatus) ?? null)
        const stored = settingsRes.data?.settings ?? {}
        setOrgName(typeof stored.org_name === 'string' ? stored.org_name : '')
        if (meData) {
          setName(typeof meData.props?.name === 'string' ? meData.props.name : '')
          setEmail(typeof meData.props?.email === 'string' ? meData.props.email : '')
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'load failed')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [http])

  const onSaveOrg = async () => {
    if (!me) return
    setSavingOrg(true)
    setOrgSaved(false)
    try {
      await http.patch('/api/settings', { org_name: orgName.trim() })
      setOrgSaved(true)
      setTimeout(() => setOrgSaved(false), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'save failed')
    } finally {
      setSavingOrg(false)
    }
  }

  const onSaveAccount = async () => {
    if (!me) return
    setSavingAccount(true)
    setAccountSaved(false)
    try {
      await http.patch('/api/users/me', { name: name.trim(), email: email.trim() })
      setAccountSaved(true)
      setTimeout(() => setAccountSaved(false), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'save failed')
    } finally {
      setSavingAccount(false)
    }
  }

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))} data-mol-id="page-settings">
      <header>
        <p
          className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest')}
          style={{ color: 'var(--color-text-link)' }}
        >
          {t('settings.kicker', {}, { defaultValue: '// /settings' })}
        </p>
        <h1 className={cm.cn('mt-1 text-3xl font-extrabold tracking-tight text-on-surface')}>
          {t('settings.heading', {}, { defaultValue: 'Workspace settings' })}
        </h1>
      </header>

      {loading ? (
        <p className={cm.textMuted}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : error ? (
        <p className={cm.cn('text-sm')} style={{ color: 'var(--color-error-chip-text)' }}>
          {t(
            'settings.error',
            { message: error },
            { defaultValue: 'Could not load settings ({{message}}).' },
          )}
        </p>
      ) : (
        <div className={cm.cn('grid gap-6 lg:grid-cols-[220px_1fr]')}>
          <nav
            className={cm.cn('rounded-xl p-2 self-start')}
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid rgba(30, 41, 59, 0.7)',
            }}
            aria-label={t('nav.settingsSections', {}, { defaultValue: 'Settings sections' })}
          >
            <ul className={cm.cn('space-y-0.5')}>
              {SETTINGS_NAV.map((item) => {
                const active = section === item.key
                return (
                  <li key={item.key}>
                    <button
                      type="button"
                      onClick={() => setSection(item.key)}
                      className={cm.cn(
                        'flex w-full items-center gap-2.5 rounded-md px-3 py-2 font-mono text-xs uppercase tracking-widest transition-colors text-left',
                      )}
                      style={
                        active
                          ? {
                              backgroundColor: 'var(--color-emerald-chip-bg)',
                              color: 'var(--color-env-filter-active-text)',
                              fontWeight: 700,
                            }
                          : { color: 'var(--color-text-muted)' }
                      }
                      data-mol-id={`settings-nav-${item.key}`}
                    >
                      <span
                        className={cm.cn('material-symbols-outlined text-[16px]')}
                        aria-hidden="true"
                      >
                        {item.icon}
                      </span>
                      {t(`settings.nav.${item.key}`, {}, { defaultValue: item.defaultLabel })}
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>

          <div className={cm.cn('space-y-6')}>
            {section === 'organization' ? (
              <section
                className={cm.cn('rounded-xl p-6')}
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid rgba(30, 41, 59, 0.7)',
                }}
                data-mol-id="settings-org-section"
              >
                <h2 className={cm.cn('text-lg font-extrabold text-on-surface')}>
                  {t('settings.org.heading', {}, { defaultValue: 'Organization' })}
                </h2>
                <p className={cm.cn('mt-1 text-sm text-on-surface-variant')}>
                  {t(
                    'settings.org.subheading',
                    {},
                    { defaultValue: 'Workspace identity, used in audit log and exports.' },
                  )}
                </p>
                <div className={cm.cn('mt-5 max-w-md')}>
                  <label
                    htmlFor="settings-org-name-input"
                    className={cm.cn(
                      'text-[10px] font-black uppercase tracking-widest text-on-surface-variant block mb-1',
                    )}
                  >
                    {t('settings.org.name', {}, { defaultValue: 'Organization name' })}
                  </label>
                  <input
                    id="settings-org-name-input"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder={t('settings.org.namePh', {}, { defaultValue: 'Your company' })}
                    className={cm.cn('h-9 w-full rounded-md px-2 font-mono text-sm')}
                    style={{
                      backgroundColor: 'var(--color-code-block)',
                      border: '1px solid rgba(30, 41, 59, 0.8)',
                      color: 'var(--color-text-code)',
                    }}
                    data-mol-id="settings-org-name-input"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void onSaveOrg()}
                  disabled={savingOrg}
                  className={cm.cn(
                    'mt-6 inline-flex items-center gap-1.5 rounded-md px-4 py-2 font-mono text-sm font-bold transition-colors disabled:opacity-50',
                  )}
                  style={{
                    backgroundColor: 'var(--color-primary)',
                    color: 'var(--color-on-primary-cta)',
                  }}
                  data-mol-id="settings-org-save"
                >
                  {savingOrg
                    ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                    : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
                </button>
                {orgSaved ? (
                  <span
                    className={cm.cn('ml-3 font-mono text-xs')}
                    style={{ color: 'var(--color-primary-hover)' }}
                  >
                    {t('common.savedPeriod', {}, { defaultValue: 'Saved.' })}
                  </span>
                ) : null}
              </section>
            ) : null}

            {section === 'account' ? (
              <section
                className={cm.cn('rounded-xl p-6')}
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid rgba(30, 41, 59, 0.7)',
                }}
                data-mol-id="settings-account-section"
              >
                <h2 className={cm.cn('text-lg font-extrabold text-on-surface')}>
                  {t('settings.account', {}, { defaultValue: 'Account' })}
                </h2>
                <p className={cm.cn('mt-1 text-sm text-on-surface-variant')}>
                  {t(
                    'settings.account.subheading',
                    {},
                    { defaultValue: 'Your personal details on this workspace.' },
                  )}
                </p>
                <dl className={cm.cn('mt-5 grid gap-4 sm:grid-cols-2')}>
                  <div>
                    <dt
                      className={cm.cn(
                        'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                      )}
                    >
                      {t('settings.account.userId', {}, { defaultValue: 'User id' })}
                    </dt>
                    <dd className={cm.cn('mt-1 font-mono text-xs text-on-surface-variant')}>
                      {me?.props.id ?? '—'}
                    </dd>
                  </div>
                </dl>
                <div className={cm.cn('mt-5 max-w-md space-y-4')}>
                  <div>
                    <label
                      htmlFor="settings-account-email-input"
                      className={cm.cn(
                        'text-[10px] font-black uppercase tracking-widest text-on-surface-variant block mb-1',
                      )}
                    >
                      {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
                    </label>
                    <input
                      id="settings-account-email-input"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={() => void onSaveAccount()}
                      autoComplete="email"
                      placeholder={t(
                        'auth.passwordPlaceholderEmail',
                        {},
                        { defaultValue: 'you@example.com' },
                      )}
                      className={cm.cn('h-9 w-full rounded-md px-2 font-mono text-sm')}
                      style={{
                        backgroundColor: 'var(--color-code-block)',
                        border: '1px solid rgba(30, 41, 59, 0.8)',
                        color: 'var(--color-text-code)',
                      }}
                      data-mol-id="settings-account-email-input"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="settings-account-name-input"
                      className={cm.cn(
                        'text-[10px] font-black uppercase tracking-widest text-on-surface-variant block mb-1',
                      )}
                    >
                      {t('form.displayName', {}, { defaultValue: 'Display name' })}
                    </label>
                    <input
                      id="settings-account-name-input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onBlur={() => void onSaveAccount()}
                      autoComplete="name"
                      placeholder={t('settings.account.namePh', {}, { defaultValue: 'Your name' })}
                      className={cm.cn('h-9 w-full rounded-md px-2 font-mono text-sm')}
                      style={{
                        backgroundColor: 'var(--color-code-block)',
                        border: '1px solid rgba(30, 41, 59, 0.8)',
                        color: 'var(--color-text-code)',
                      }}
                      data-mol-id="settings-account-name-input"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void onSaveAccount()}
                  disabled={savingAccount}
                  className={cm.cn(
                    'mt-6 inline-flex items-center gap-1.5 rounded-md px-4 py-2 font-mono text-sm font-bold transition-colors disabled:opacity-50',
                  )}
                  style={{
                    backgroundColor: 'var(--color-primary)',
                    color: 'var(--color-on-primary-cta)',
                  }}
                  data-mol-id="settings-account-save"
                >
                  {savingAccount
                    ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                    : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
                </button>
                {accountSaved ? (
                  <span
                    className={cm.cn('ml-3 font-mono text-xs')}
                    style={{ color: 'var(--color-primary-hover)' }}
                  >
                    {t('common.savedPeriod', {}, { defaultValue: 'Saved.' })}
                  </span>
                ) : null}
              </section>
            ) : null}

            {section === 'language' ? (
              <section
                className={cm.cn('rounded-xl p-6')}
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid rgba(30, 41, 59, 0.7)',
                }}
                data-mol-id="settings-language-section"
              >
                <h2 className={cm.cn('text-lg font-extrabold text-on-surface')}>
                  {t('footer.language', {}, { defaultValue: 'Language' })}
                </h2>
                <p className={cm.cn('mt-1 text-sm text-on-surface-variant')}>
                  {t(
                    'common.chooseTheLanguage',
                    {},
                    { defaultValue: 'Choose the language used throughout the app.' },
                  )}
                </p>
                <div className={cm.cn('mt-5')}>
                  <LanguagePicker />
                </div>
                <section className={cm.cn(cm.sp('p', 8), 'bg-surface-container-low rounded-xl')}>
                  <div className={cm.sp('mb', 6)}>
                    <h3
                      className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}
                    >
                      {t('nav.appearance', {}, { defaultValue: 'Appearance' })}
                    </h3>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {t(
                        'common.toggleLightDark',
                        {},
                        { defaultValue: 'Toggle between light and dark mode.' },
                      )}
                    </p>
                  </div>
                  <ThemeToggle />
                </section>
              </section>
            ) : null}

            {section === 'billing' ? (
              <section
                className={cm.cn('rounded-xl p-6')}
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid rgba(30, 41, 59, 0.7)',
                }}
                data-mol-id="settings-billing-section"
              >
                <h2 className={cm.cn('text-lg font-extrabold text-on-surface')}>
                  {t('settings.billing', {}, { defaultValue: 'Billing' })}
                </h2>
                <p className={cm.cn('mt-1 text-sm text-on-surface-variant')}>
                  {t(
                    'settings.billing.subheading',
                    {},
                    { defaultValue: 'Your current plan and limits.' },
                  )}
                </p>
                {billing ? (
                  <dl className={cm.cn('mt-5 grid gap-4 sm:grid-cols-2')}>
                    <div>
                      <dt
                        className={cm.cn(
                          'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                        )}
                      >
                        {t('nav.plan', {}, { defaultValue: 'Plan' })}
                      </dt>
                      <dd className={cm.cn('mt-1 font-mono text-base text-on-surface')}>
                        {billing.name} {billing.isFree ? '· free' : ''}
                      </dd>
                    </div>
                    <div>
                      <dt
                        className={cm.cn(
                          'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                        )}
                      >
                        {t('settings.billing.maxFlags', {}, { defaultValue: 'Flags' })}
                      </dt>
                      <dd className={cm.cn('mt-1 font-mono text-base text-on-surface')}>
                        {billing.limits.maxFlags >= 999_999 ? '∞' : billing.limits.maxFlags}
                      </dd>
                    </div>
                    <div>
                      <dt
                        className={cm.cn(
                          'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                        )}
                      >
                        {t(
                          'settings.billing.maxEnvironments',
                          {},
                          { defaultValue: 'Environments' },
                        )}
                      </dt>
                      <dd className={cm.cn('mt-1 font-mono text-base text-on-surface')}>
                        {billing.limits.maxEnvironments >= 999_999
                          ? '∞'
                          : billing.limits.maxEnvironments}
                      </dd>
                    </div>
                    <div>
                      <dt
                        className={cm.cn(
                          'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                        )}
                      >
                        {t('common.advancedFeatures', {}, { defaultValue: 'Advanced features' })}
                      </dt>
                      <dd className={cm.cn('mt-1 font-mono text-base text-on-surface')}>
                        {billing.limits.advancedFeatures ? '✓' : '—'}
                      </dd>
                    </div>
                  </dl>
                ) : null}
                <button
                  type="button"
                  onClick={() => navigate('/pricing')}
                  className={cm.cn(
                    'mt-6 inline-flex items-center gap-1.5 rounded-md px-4 py-2 font-mono text-sm font-bold transition-colors',
                  )}
                  style={{
                    backgroundColor: 'var(--color-primary)',
                    color: 'var(--color-on-primary-cta)',
                  }}
                  data-mol-id="settings-billing-upgrade"
                >
                  {billing?.isFree
                    ? t('settings.billing.upgrade', {}, { defaultValue: 'Upgrade plan' })
                    : t('settings.billing.manage', {}, { defaultValue: 'Manage plan' })}
                </button>
              </section>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
