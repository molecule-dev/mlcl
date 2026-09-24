import { type FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmButton, LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { SecretsManagerLayout } from '../components/SecretsManagerLayout.js'
import { SecretStatusPill, type SecretStatusTone } from '../components/SecretStatusPill.js'

interface UserMe {
  props: {
    id: string
    name?: string | null
    email?: string | null
  }
}

interface AppSettings {
  settings: {
    org: {
      name: string
    }
  }
}

interface BillingStatus {
  planKey: string
  category: string
  name: string
  isFree: boolean
  limits: {
    maxSecrets: number
    maxAccessPolicies: number
    maxAuditLog: number
    advancedFeatures: boolean
    canExport: boolean
    retentionDays: number
  }
}

const formatNum = (n: number): string => (n >= 999_999 ? '∞' : n.toLocaleString())

const tone = (free: boolean): SecretStatusTone => (free ? 'masked' : 'active')

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [me, setMe] = useState<UserMe | null>(null)
  const [billing, setBilling] = useState<BillingStatus | null>(null)
  const [orgName, setOrgName] = useState('')
  const [accountName, setAccountName] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingOrg, setSavingOrg] = useState(false)
  const [savingAccount, setSavingAccount] = useState(false)
  const [orgSavedAt, setOrgSavedAt] = useState<number | null>(null)
  const [accountSavedAt, setAccountSavedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reload = async () => {
    try {
      const [meRes, billingRes, settingsRes] = await Promise.all([
        http.get<UserMe>('/api/users/me'),
        http.get<BillingStatus>('/api/billing/status'),
        // Org prefs come from the app-owned server-side slice — the platform
        // user resource never returns `oauthData` on reads, so a write via
        // PATCH /api/users/:id would silently evaporate on the next load.
        http.get<AppSettings>('/api/settings/me'),
      ])
      const meData = (meRes.data as UserMe) ?? null
      setMe(meData)
      setBilling((billingRes.data as BillingStatus) ?? null)
      const slice = (settingsRes.data as AppSettings | undefined)?.settings
      setOrgName(typeof slice?.org?.name === 'string' ? slice.org.name : '')
      setAccountName(typeof meData?.props?.name === 'string' ? meData.props.name : '')
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'load failed')
    }
  }

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        await reload()
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http])

  const saveOrg = async (e: FormEvent) => {
    e.preventDefault()
    setSavingOrg(true)
    try {
      // Server-side slice channel: merged + readable back (see
      // api/src/handlers/settings.ts for why oauthData via /users/:id fails).
      await http.patch('/api/settings/me', { org: { name: orgName.trim() } })
      setOrgSavedAt(Date.now())
      void track({ name: 'settings.updated', properties: { section: 'org' } })
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'org save failed')
    } finally {
      setSavingOrg(false)
    }
  }

  const saveAccount = async (e: FormEvent) => {
    e.preventDefault()
    if (!me) return
    setSavingAccount(true)
    try {
      await http.patch(`/api/users/${me.props.id}`, { name: accountName.trim() })
      setAccountSavedAt(Date.now())
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'account save failed')
    } finally {
      setSavingAccount(false)
    }
  }

  const cancelSubscription = async () => {
    try {
      await http.post('/api/billing/cancel', {})
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'cancel failed')
    }
  }

  return (
    <SecretsManagerLayout>
      <div className={cm.cn('flex flex-col gap-6 p-6 pb-12 md:p-8')}>
        <header className={cm.cn('flex flex-col gap-2')}>
          <span className={cm.cn('font-mono text-[11px] uppercase tracking-widest text-muted')}>
            {t('settings.kicker', {}, { defaultValue: 'Workspace · acme' })}
          </span>
          <h1 className={cm.cn('font-headline text-3xl font-extrabold tracking-tight text-text')}>
            {t('nav.settings', {}, { defaultValue: 'Settings' })}
          </h1>
          <p className={cm.cn('font-body text-sm text-muted')}>
            {t(
              'settings.subheading',
              {},
              {
                defaultValue:
                  'Workspace and account controls. Per-vault overrides live on each vault.',
              },
            )}
          </p>
        </header>

        {loading ? (
          <div
            data-mol-id="settings-loading"
            className={cm.cn(
              'rounded-lg border border-border bg-surface p-6 font-mono text-xs text-muted',
            )}
          >
            {t('settings.loading', {}, { defaultValue: 'Loading settings…' })}
          </div>
        ) : (
          <div className={cm.cn('grid gap-5 lg:grid-cols-2')}>
            <section className={cm.cn('flex flex-col gap-5')}>
              <form
                onSubmit={saveOrg}
                className={cm.cn(
                  'flex flex-col gap-3 rounded-xl border border-border bg-surface p-5',
                )}
              >
                <header className={cm.cn('flex items-center justify-between')}>
                  <h2 className={cm.cn('font-headline text-base font-semibold text-text')}>
                    {t('settings.org.title', {}, { defaultValue: 'Organisation' })}
                  </h2>
                  <span aria-hidden="true" className="material-symbols-outlined text-muted">
                    business
                  </span>
                </header>
                <p className={cm.cn('font-body text-sm text-muted')}>
                  {t(
                    'settings.org.description',
                    {},
                    { defaultValue: 'Display name shown to teammates and on invoices.' },
                  )}
                </p>
                <label
                  className={cm.cn(
                    'flex flex-col gap-1 font-mono text-[10px] uppercase tracking-widest text-muted',
                  )}
                >
                  {t('settings.org.name', {}, { defaultValue: 'Organisation name' })}
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    data-mol-id="settings-org-name"
                    className={cm.cn(
                      'h-9 rounded-md border border-border bg-background px-3 font-mono text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
                    )}
                  />
                </label>
                <button
                  type="submit"
                  disabled={savingOrg}
                  data-mol-id="settings-org-save"
                  className={cm.cn(
                    'inline-flex h-8 w-fit items-center gap-1 rounded bg-primary px-3 font-headline text-xs font-bold text-on-primary transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50',
                  )}
                >
                  {savingOrg
                    ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                    : t('common.save', {}, { defaultValue: 'Save' })}
                </button>
                {orgSavedAt ? (
                  <p
                    data-mol-id="settings-org-saved"
                    className={cm.cn('font-mono text-[11px] text-primary')}
                  >
                    {t('common.savedPeriod', {}, { defaultValue: 'Saved.' })}
                  </p>
                ) : null}
              </form>

              <form
                onSubmit={saveAccount}
                className={cm.cn(
                  'flex flex-col gap-3 rounded-xl border border-border bg-surface p-5',
                )}
              >
                <header className={cm.cn('flex items-center justify-between')}>
                  <h2 className={cm.cn('font-headline text-base font-semibold text-text')}>
                    {t('settings.account', {}, { defaultValue: 'Account' })}
                  </h2>
                  <span aria-hidden="true" className="material-symbols-outlined text-muted">
                    person
                  </span>
                </header>
                <p className={cm.cn('font-body text-sm text-muted')}>
                  {t(
                    'settings.account.description',
                    {},
                    { defaultValue: 'Your personal display name.' },
                  )}
                </p>
                <label
                  className={cm.cn(
                    'flex flex-col gap-1 font-mono text-[10px] uppercase tracking-widest text-muted',
                  )}
                >
                  {t('form.displayName', {}, { defaultValue: 'Display name' })}
                  <input
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    data-mol-id="settings-account-name"
                    className={cm.cn(
                      'h-9 rounded-md border border-border bg-background px-3 font-mono text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
                    )}
                  />
                </label>
                <button
                  type="submit"
                  disabled={savingAccount}
                  data-mol-id="settings-account-save"
                  className={cm.cn(
                    'inline-flex h-8 w-fit items-center gap-1 rounded bg-primary px-3 font-headline text-xs font-bold text-on-primary transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50',
                  )}
                >
                  {savingAccount
                    ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                    : t('common.save', {}, { defaultValue: 'Save' })}
                </button>
                {accountSavedAt ? (
                  <p
                    data-mol-id="settings-account-saved"
                    className={cm.cn('font-mono text-[11px] text-primary')}
                  >
                    {t('common.savedPeriod', {}, { defaultValue: 'Saved.' })}
                  </p>
                ) : null}
              </form>
            </section>

            <section className={cm.cn('flex flex-col gap-5')}>
              <article
                className={cm.cn(
                  'flex flex-col gap-3 rounded-xl border border-border bg-surface p-5',
                )}
              >
                <header className={cm.cn('flex items-center justify-between')}>
                  <h2 className={cm.cn('font-headline text-base font-semibold text-text')}>
                    {t('nav.planAndBilling', {}, { defaultValue: 'Plan & billing' })}
                  </h2>
                  <span aria-hidden="true" className="material-symbols-outlined text-muted">
                    receipt_long
                  </span>
                </header>
                {billing ? (
                  <>
                    <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                      <SecretStatusPill tone={tone(billing.isFree)} label={billing.name} compact />
                      <span
                        data-mol-id="settings-billing-plan"
                        className={cm.cn('font-mono text-xs text-muted uppercase tracking-widest')}
                      >
                        {billing.planKey}
                      </span>
                    </div>
                    <ul className={cm.cn('grid grid-cols-2 gap-2 font-mono text-xs text-text')}>
                      <li>
                        <span className={cm.cn('text-muted')}>
                          {t('settings.billing.maxSecrets', {}, { defaultValue: 'Secrets' })}:
                        </span>{' '}
                        {formatNum(billing.limits.maxSecrets)}
                      </li>
                      <li>
                        <span className={cm.cn('text-muted')}>
                          {t('settings.billing.maxPolicies', {}, { defaultValue: 'Policies' })}:
                        </span>{' '}
                        {formatNum(billing.limits.maxAccessPolicies)}
                      </li>
                      <li>
                        <span className={cm.cn('text-muted')}>
                          {t('settings.billing.maxAudit', {}, { defaultValue: 'Audit' })}:
                        </span>{' '}
                        {formatNum(billing.limits.maxAuditLog)}
                      </li>
                      <li>
                        <span className={cm.cn('text-muted')}>
                          {t('settings.billing.retention', {}, { defaultValue: 'Retention' })}:
                        </span>{' '}
                        {billing.limits.retentionDays} d
                      </li>
                      <li>
                        <span className={cm.cn('text-muted')}>
                          {t('settings.billing.advanced', {}, { defaultValue: 'Advanced' })}:
                        </span>{' '}
                        {billing.limits.advancedFeatures ? '✓' : '—'}
                      </li>
                      <li>
                        <span className={cm.cn('text-muted')}>
                          {t('common.export', {}, { defaultValue: 'Export' })}:
                        </span>{' '}
                        {billing.limits.canExport ? '✓' : '—'}
                      </li>
                    </ul>
                    <div className={cm.cn('flex items-center gap-2')}>
                      <Link
                        to="/pricing"
                        data-mol-id="settings-billing-upgrade"
                        className={cm.cn(
                          'inline-flex h-8 items-center gap-1 rounded bg-primary px-3 font-headline text-xs font-bold text-on-primary transition-colors hover:bg-primary/90',
                        )}
                      >
                        <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
                          trending_up
                        </span>
                        {billing.isFree
                          ? t('settings.upgrade', {}, { defaultValue: 'Upgrade' })
                          : t('common.manage', {}, { defaultValue: 'Manage' })}
                      </Link>
                      {!billing.isFree ? (
                        // Two-step destructive confirm (arm → the old
                        // window.confirm copy → commit, 6s auto-disarm,
                        // Escape, aria-live) replacing window.confirm.
                        <ConfirmButton
                          label={t(
                            'nav.cancelSubscription',
                            {},
                            { defaultValue: 'Cancel subscription' },
                          )}
                          confirmLabel={t(
                            'settings.cancelConfirm',
                            {},
                            {
                              defaultValue:
                                'Cancel your subscription? You will keep access until the end of the billing period.',
                            },
                          )}
                          onConfirm={cancelSubscription}
                          color="error"
                          size="sm"
                          disarmSeconds={6}
                          data-mol-id="settings-billing-cancel"
                        />
                      ) : null}
                    </div>
                  </>
                ) : (
                  <p className={cm.cn('font-mono text-xs text-muted')}>
                    {t('settings.billing.unknown', {}, { defaultValue: 'Plan info unavailable.' })}
                  </p>
                )}
              </article>

              <article
                className={cm.cn(
                  'flex flex-col gap-3 rounded-xl border border-border bg-surface p-5',
                )}
              >
                <header className={cm.cn('flex items-center justify-between')}>
                  <h2 className={cm.cn('font-headline text-base font-semibold text-text')}>
                    {t('footer.language', {}, { defaultValue: 'Language' })}
                  </h2>
                  <span aria-hidden="true" className="material-symbols-outlined text-muted">
                    language
                  </span>
                </header>
                <p className={cm.cn('font-body text-sm text-muted')}>
                  {t(
                    'common.chooseTheLanguage',
                    {},
                    { defaultValue: 'Choose the language used throughout the app.' },
                  )}
                </p>
                <LanguagePicker />
              </article>

              {error ? (
                <p data-mol-id="settings-error" className={cm.cn('font-mono text-xs text-error')}>
                  {error}
                </p>
              ) : null}
            </section>
            <article
              className={cm.cn(
                'flex flex-col gap-3 rounded-xl border border-border bg-surface p-5',
              )}
            >
              <header className={cm.cn('flex items-center justify-between')}>
                <h2 className={cm.cn('font-headline text-base font-semibold text-text')}>
                  {t('nav.appearance', {}, { defaultValue: 'Appearance' })}
                </h2>
                <span aria-hidden="true" className="material-symbols-outlined text-muted">
                  dark_mode
                </span>
              </header>
              <p className={cm.cn('font-body text-sm text-muted')}>
                {t(
                  'common.toggleLightDark',
                  {},
                  { defaultValue: 'Toggle between light and dark mode.' },
                )}
              </p>
              <ThemeToggle />
            </article>
          </div>
        )}
      </div>
    </SecretsManagerLayout>
  )
}

export default Settings
