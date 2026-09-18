import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { BRAND_COLOR } from '../branding.js'

const SECTIONS = ['account', 'retention', 'language', 'billing'] as const
type Section = (typeof SECTIONS)[number]

interface BillingTier {
  key: string
  name: string
  prices: { period: string; price: string; stripePriceId: string | null }[]
  limits?: {
    maxLogs?: number
    maxSavedSearches?: number
    maxSources?: number
    retentionDays?: number
  }
}

interface BillingStatus {
  planKey?: string
  category?: string
  name?: string
  isFree?: boolean
  limits?: {
    maxLogs?: number
    maxSavedSearches?: number
    maxSources?: number
    retentionDays?: number
  }
}

interface AppPrefs {
  hotRetentionDays: number
  coldRetentionDays: number
}

const DEFAULT_PREFS: AppPrefs = { hotRetentionDays: 30, coldRetentionDays: 365 }

/** 999,999 is the tier ladder's "unlimited" sentinel (see api/src/tiers.ts). */
function fmtLimit(n: number | undefined): string {
  if (n == null) return '—'
  if (n >= 999_999) return '∞'
  return n.toLocaleString()
}

function readPrefs(user: UserProfile | null | undefined): AppPrefs {
  const oauthData = (user as unknown as { oauthData?: Record<string, unknown> } | null)?.oauthData
  const lvPrefs = (oauthData?.logViewer as Partial<AppPrefs> | undefined) ?? {}
  return {
    hotRetentionDays:
      typeof lvPrefs.hotRetentionDays === 'number'
        ? lvPrefs.hotRetentionDays
        : DEFAULT_PREFS.hotRetentionDays,
    coldRetentionDays:
      typeof lvPrefs.coldRetentionDays === 'number'
        ? lvPrefs.coldRetentionDays
        : DEFAULT_PREFS.coldRetentionDays,
  }
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user, setUser } = useAuth<UserProfile>()
  const navigate = useNavigate()
  const [section, setSection] = useState<Section>('account')

  // ----- account -----
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [accountSaving, setAccountSaving] = useState(false)
  const [accountError, setAccountError] = useState<string | null>(null)
  const [accountSaved, setAccountSaved] = useState(false)

  useEffect(() => {
    setName(user?.name ?? '')
    setEmail(user?.email ?? '')
  }, [user?.id, user?.name, user?.email])

  async function saveAccount(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.id) return
    setAccountSaving(true)
    setAccountError(null)
    setAccountSaved(false)
    try {
      const res = await http.patch<{ data?: UserProfile } | UserProfile>(`/api/users/${user.id}`, {
        name,
        email,
      })
      const body = (res as { data?: { data?: UserProfile } | UserProfile }).data
      const updated =
        body && typeof body === 'object' && 'data' in body
          ? (body as { data?: UserProfile }).data
          : (body as UserProfile | undefined)
      if (updated && updated.id) {
        setUser({ ...(user as UserProfile), ...updated })
      } else {
        setUser({ ...(user as UserProfile), name, email })
      }
      setAccountSaved(true)
      setTimeout(() => setAccountSaved(false), 2500)
    } catch (err) {
      setAccountError(
        err instanceof Error
          ? err.message
          : t('settings.account.error', {}, { defaultValue: 'Failed to update account.' }),
      )
    } finally {
      setAccountSaving(false)
    }
  }

  // ----- retention prefs -----
  const [prefs, setPrefs] = useState<AppPrefs>(() => readPrefs(user))
  const [prefsSaving, setPrefsSaving] = useState(false)
  const [prefsError, setPrefsError] = useState<string | null>(null)
  const [prefsSaved, setPrefsSaved] = useState(false)

  useEffect(() => {
    setPrefs(readPrefs(user))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync prefs when user identity changes, not on every user object reference
  }, [user?.id])

  async function savePrefs(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.id) return
    setPrefsSaving(true)
    setPrefsError(null)
    setPrefsSaved(false)
    try {
      const oauthData =
        (user as unknown as { oauthData?: Record<string, unknown> } | null)?.oauthData ?? {}
      const merged = { ...oauthData, logViewer: { ...prefs } }
      await http.patch(`/api/users/${user.id}`, { oauthData: merged })
      setUser({
        ...(user as UserProfile & { oauthData?: Record<string, unknown> }),
        oauthData: merged,
      } as UserProfile)
      setPrefsSaved(true)
      setTimeout(() => setPrefsSaved(false), 2500)
    } catch (err) {
      setPrefsError(
        err instanceof Error
          ? err.message
          : t(
              'settings.retention.error',
              {},
              { defaultValue: 'Failed to save retention preferences.' },
            ),
      )
    } finally {
      setPrefsSaving(false)
    }
  }

  // ----- billing -----
  const [billing, setBilling] = useState<BillingStatus | null>(null)
  const [tiers, setTiers] = useState<BillingTier[]>([])
  const [billingError, setBillingError] = useState<string | null>(null)
  const [checkoutPending, setCheckoutPending] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      http.get<BillingStatus>('/api/billing/status'),
      http.get<{ data: BillingTier[] }>('/api/billing/tiers'),
    ])
      .then(([statusRes, tiersRes]) => {
        if (cancelled) return
        const statusBody =
          (statusRes as { data?: BillingStatus }).data ?? (statusRes as unknown as BillingStatus)
        const tiersInner = (
          tiersRes as unknown as { data?: { data?: BillingTier[] } | BillingTier[] }
        ).data
        const tiersBody = Array.isArray(tiersInner)
          ? tiersInner
          : Array.isArray((tiersInner as { data?: BillingTier[] } | undefined)?.data)
            ? (tiersInner as { data: BillingTier[] }).data
            : []
        setBilling(statusBody)
        setTiers(tiersBody)
      })
      .catch(() => {
        if (!cancelled)
          setBillingError(
            t('settings.billing.error', {}, { defaultValue: 'Failed to load billing.' }),
          )
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  async function checkoutWith(priceId: string) {
    setCheckoutPending(priceId)
    setBillingError(null)
    try {
      const res = await http.post<{ checkoutUrl?: string }>(`/api/billing/checkout`, { priceId })
      const body =
        (res as { data?: { checkoutUrl?: string } }).data ??
        (res as unknown as { checkoutUrl?: string })
      const url = body?.checkoutUrl
      if (!url)
        throw new Error(
          t('settings.billing.noUrl', {}, { defaultValue: 'No checkout URL returned.' }),
        )
      window.location.assign(url)
    } catch (err) {
      setBillingError(
        err instanceof Error
          ? err.message
          : t('settings.billing.error', {}, { defaultValue: 'Checkout failed.' }),
      )
    } finally {
      setCheckoutPending(null)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
      <header className={cm.cn('mb-6')}>
        <p
          className={cm.cn('font-mono text-xs font-bold uppercase tracking-widest mb-2')}
          style={{ color: BRAND_COLOR }}
        >
          {t('settings.eyebrow', {}, { defaultValue: '$ signalink settings' })}
        </p>
        <h1
          className={cm.cn(
            cm.textSize('3xl'),
            cm.fontWeight('bold'),
            'tracking-tight text-on-surface',
          )}
        >
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
      </header>

      <div className={cm.grid({ cols: 12, gap: 'lg' })}>
        <aside className={cm.cn('col-span-12 md:col-span-3')}>
          <nav
            className={cm.cn('space-y-1')}
            aria-label={t('nav.settingsSections', {}, { defaultValue: 'Settings sections' })}
          >
            {SECTIONS.map((s) => {
              const isActive = section === s
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSection(s)}
                  data-mol-id={`settings-tab-${s}`}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'block w-full text-left rounded-md font-mono',
                    isActive
                      ? 'bg-primary-container text-primary'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {t(
                    `settings.section.${s}`,
                    {},
                    { defaultValue: s.charAt(0).toUpperCase() + s.slice(1) },
                  )}
                </button>
              )
            })}
          </nav>
        </aside>

        <main className={cm.cn('col-span-12 md:col-span-9 space-y-4')}>
          {section === 'account' ? (
            <form
              onSubmit={saveAccount}
              data-mol-id="settings-account-form"
              className={cm.cn('rounded-xl p-6 space-y-5')}
              style={{
                backgroundColor: 'var(--color-surface-container)',
                border: '1px solid var(--color-border)',
              }}
            >
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                {t('settings.account.heading', {}, { defaultValue: 'Account' })}
              </h2>
              <div>
                <label
                  htmlFor="settings-name"
                  className={cm.cn(
                    'block text-[10px] font-black uppercase tracking-widest mb-2 font-mono text-on-surface-variant',
                  )}
                >
                  {t('form.displayName', {}, { defaultValue: 'Display name' })}
                </label>
                <input
                  id="settings-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={cm.cn('w-full py-2.5 px-3 rounded-md font-mono text-sm')}
                  style={{
                    backgroundColor: 'var(--color-input-background)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-severity-debug-light)',
                  }}
                />
              </div>
              <div>
                <label
                  htmlFor="settings-email"
                  className={cm.cn(
                    'block text-[10px] font-black uppercase tracking-widest mb-2 font-mono text-on-surface-variant',
                  )}
                >
                  {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
                </label>
                <input
                  id="settings-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={cm.cn('w-full py-2.5 px-3 rounded-md font-mono text-sm')}
                  style={{
                    backgroundColor: 'var(--color-input-background)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-severity-debug-light)',
                  }}
                />
              </div>
              {accountError ? <p className={cm.cn('text-sm text-error')}>{accountError}</p> : null}
              {accountSaved ? (
                <p className={cm.cn('text-sm')} style={{ color: BRAND_COLOR }}>
                  {t('settings.account.saved', {}, { defaultValue: 'Account saved.' })}
                </p>
              ) : null}
              <div className={cm.cn('flex items-center justify-end gap-3')}>
                <button
                  type="submit"
                  disabled={accountSaving}
                  data-mol-id="settings-account-save"
                  className={cm.cn(
                    'px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest hover:opacity-90 disabled:opacity-50',
                  )}
                  style={{ backgroundColor: BRAND_COLOR, color: 'var(--color-background)' }}
                >
                  {accountSaving
                    ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                    : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
                </button>
              </div>
            </form>
          ) : null}

          {section === 'retention' ? (
            <form
              onSubmit={savePrefs}
              data-mol-id="settings-retention-form"
              className={cm.cn('rounded-xl p-6 space-y-4')}
              style={{
                backgroundColor: 'var(--color-surface-container)',
                border: '1px solid var(--color-border)',
              }}
            >
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                {t('settings.retention.heading', {}, { defaultValue: 'Retention' })}
              </h2>
              <p className={cm.cn('text-sm text-on-surface-variant')}>
                {t(
                  'settings.retention.body',
                  {},
                  { defaultValue: 'Default per-stream retention. Override on a per-stream basis.' },
                )}
              </p>
              <div className={cm.cn('grid grid-cols-2 gap-4')}>
                <div>
                  <label
                    htmlFor="settings-hot-retention"
                    className={cm.cn(
                      'block text-[10px] font-black uppercase tracking-widest mb-2 font-mono text-on-surface-variant',
                    )}
                  >
                    {t('settings.retention.hot', {}, { defaultValue: 'Hot retention (days)' })}
                  </label>
                  <input
                    id="settings-hot-retention"
                    type="number"
                    min={1}
                    max={3650}
                    value={prefs.hotRetentionDays}
                    onChange={(e) =>
                      setPrefs({ ...prefs, hotRetentionDays: Number(e.target.value) })
                    }
                    className={cm.cn('w-full py-2.5 px-3 rounded-md font-mono text-sm')}
                    style={{
                      backgroundColor: 'var(--color-input-background)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-severity-debug-light)',
                    }}
                  />
                </div>
                <div>
                  <label
                    htmlFor="settings-cold-retention"
                    className={cm.cn(
                      'block text-[10px] font-black uppercase tracking-widest mb-2 font-mono text-on-surface-variant',
                    )}
                  >
                    {t('settings.retention.cold', {}, { defaultValue: 'Cold retention (days)' })}
                  </label>
                  <input
                    id="settings-cold-retention"
                    type="number"
                    min={1}
                    max={3650}
                    value={prefs.coldRetentionDays}
                    onChange={(e) =>
                      setPrefs({ ...prefs, coldRetentionDays: Number(e.target.value) })
                    }
                    className={cm.cn('w-full py-2.5 px-3 rounded-md font-mono text-sm')}
                    style={{
                      backgroundColor: 'var(--color-input-background)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-severity-debug-light)',
                    }}
                  />
                </div>
              </div>
              {prefsError ? <p className={cm.cn('text-sm text-error')}>{prefsError}</p> : null}
              {prefsSaved ? (
                <p className={cm.cn('text-sm')} style={{ color: BRAND_COLOR }}>
                  {t(
                    'settings.retention.saved',
                    {},
                    { defaultValue: 'Retention preferences saved.' },
                  )}
                </p>
              ) : null}
              <div className={cm.cn('flex items-center justify-end gap-3')}>
                <button
                  type="submit"
                  disabled={prefsSaving}
                  data-mol-id="settings-retention-save"
                  className={cm.cn(
                    'px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest hover:opacity-90 disabled:opacity-50',
                  )}
                  style={{ backgroundColor: BRAND_COLOR, color: 'var(--color-background)' }}
                >
                  {prefsSaving
                    ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                    : t('settings.retention.save', {}, { defaultValue: 'Save retention' })}
                </button>
              </div>
            </form>
          ) : null}

          {section === 'language' ? (
            <section
              data-mol-id="settings-language"
              className={cm.cn('rounded-xl p-6 space-y-4')}
              style={{
                backgroundColor: 'var(--color-surface-container)',
                border: '1px solid var(--color-border)',
              }}
            >
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                {t('footer.language', {}, { defaultValue: 'Language' })}
              </h2>
              <p className={cm.cn('text-sm text-on-surface-variant')}>
                {t(
                  'common.chooseTheLanguage',
                  {},
                  { defaultValue: 'Choose the language used throughout the app.' },
                )}
              </p>
              <LanguagePicker />
            </section>
          ) : null}

          {section === 'billing' ? (
            <section
              data-mol-id="settings-billing"
              className={cm.cn('rounded-xl p-6 space-y-5')}
              style={{
                backgroundColor: 'var(--color-surface-container)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div className={cm.cn('flex items-center justify-between')}>
                <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                  {t('settings.billing', {}, { defaultValue: 'Billing' })}
                </h2>
                <button
                  type="button"
                  onClick={() => navigate('/pricing')}
                  data-mol-id="settings-billing-pricing"
                  className={cm.cn(
                    'px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest border border-outline-variant hover:bg-surface-container-low',
                  )}
                >
                  {t('settings.billing.viewPricing', {}, { defaultValue: 'View all plans' })}
                </button>
              </div>
              <div>
                <p className={cm.cn('text-sm text-on-surface-variant')}>
                  {t('nav.currentPlan', {}, { defaultValue: 'Current plan' })}
                </p>
                <p
                  className={cm.cn(
                    'mt-1 font-mono text-2xl font-extrabold tracking-tighter text-on-surface',
                  )}
                >
                  {billing?.name ?? '—'}
                </p>
                {billing?.limits ? (
                  <p className={cm.cn('mt-1 text-xs text-on-surface-variant')}>
                    {t(
                      'settings.billing.limits',
                      {
                        logs: fmtLimit(billing.limits.maxLogs),
                        sources: fmtLimit(billing.limits.maxSources),
                        saved: fmtLimit(billing.limits.maxSavedSearches),
                        retention: billing.limits.retentionDays
                          ? `${billing.limits.retentionDays}d`
                          : '∞',
                      },
                      {
                        defaultValue:
                          '{{logs}} logs · {{sources}} streams · {{saved}} saved searches · {{retention}} retention',
                      },
                    )}
                  </p>
                ) : null}
              </div>
              {billingError ? <p className={cm.cn('text-sm text-error')}>{billingError}</p> : null}
              {tiers.length > 0 ? (
                <ul className={cm.cn('grid gap-3 grid-cols-1 md:grid-cols-3')}>
                  {tiers.map((tier) => {
                    const monthly = tier.prices.find((p) => p.period === 'month')
                    // `/billing/status` returns the entitlements planKey
                    // ('free' | 'stripeMonthly' | …) while tiers use category
                    // keys ('free' | 'pro' | 'team') — match on category so
                    // paid plans light up their card too.
                    const isCurrent = (billing?.category ?? billing?.planKey) === tier.key
                    return (
                      <li
                        key={tier.key}
                        className={cm.cn('rounded-md p-4')}
                        style={{
                          backgroundColor: 'var(--color-input-background)',
                          border: `1px solid ${isCurrent ? BRAND_COLOR : 'var(--color-border)'}`,
                        }}
                      >
                        <p className={cm.cn('font-mono text-sm font-bold text-on-surface')}>
                          {tier.name}
                        </p>
                        <p className={cm.cn('mt-1 font-mono text-xs text-on-surface-variant')}>
                          {monthly ? monthly.price : '—'}
                        </p>
                        {monthly?.stripePriceId && !isCurrent ? (
                          <button
                            type="button"
                            onClick={() => checkoutWith(monthly.stripePriceId as string)}
                            disabled={checkoutPending === monthly.stripePriceId}
                            data-mol-id={`settings-billing-checkout-${tier.key}`}
                            className={cm.cn(
                              'mt-3 w-full px-3 py-1.5 rounded-md font-mono text-xs font-bold uppercase tracking-widest hover:opacity-90 disabled:opacity-50',
                            )}
                            style={{
                              backgroundColor: BRAND_COLOR,
                              color: 'var(--color-background)',
                            }}
                          >
                            {checkoutPending === monthly.stripePriceId
                              ? t(
                                  'settings.billing.checkoutSubmitting',
                                  {},
                                  { defaultValue: 'Redirecting…' },
                                )
                              : t(
                                  'settings.billing.upgrade',
                                  { tier: tier.name },
                                  { defaultValue: 'Upgrade to {{tier}}' },
                                )}
                          </button>
                        ) : (
                          <p
                            className={cm.cn(
                              'mt-3 font-mono text-[10px] font-black uppercase tracking-widest',
                            )}
                            style={{
                              color: isCurrent ? BRAND_COLOR : 'var(--color-text-secondary)',
                            }}
                          >
                            {isCurrent
                              ? t('nav.currentPlan', {}, { defaultValue: 'Current plan' })
                              : t(
                                  'settings.billing.contactSales',
                                  {},
                                  { defaultValue: 'Contact sales' },
                                )}
                          </p>
                        )}
                      </li>
                    )
                  })}
                </ul>
              ) : null}
            </section>
          ) : null}

          <section
            data-mol-id="settings-appearance"
            className={cm.cn('rounded-xl p-6 space-y-4')}
            style={{
              backgroundColor: 'var(--color-surface-container)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                {t('settings.appearance.title', {}, { defaultValue: 'Appearance' })}
              </h2>
              <p className={cm.cn('text-sm text-on-surface-variant')}>
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
    </div>
  )
}
