import { useEffect, useMemo, useState } from 'react'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

const SECTIONS = [
  { key: 'profile', label: 'Profile', icon: 'person' },
  { key: 'language', label: 'Language', icon: 'translate' },
  { key: 'billing', label: 'Billing', icon: 'credit_card' },
  { key: 'security', label: 'Security', icon: 'lock' },
] as const

type SectionKey = (typeof SECTIONS)[number]['key']

interface BillingStatus {
  planKey: string | null
  category: string | null
  name: string | null
  isFree: boolean
  limits: Record<string, unknown> | null
  expiresAt: string | null
  autoRenews: boolean
}

/**
 * Wire-shape returned by GET /api/billing/tiers (server side derives this
 * from getPricingTiers() in api/src/tiers.ts).
 */
interface PricingTier {
  key: 'free' | 'pro' | 'team' | string
  name: string
  prices: Array<{
    period: 'month' | 'year' | string
    price: string
    stripePriceId: string | null
  }>
  limits?: Record<string, unknown>
  description?: string
  perks?: string[]
}

interface UserShape {
  id?: string
  name?: string | null
  email?: string | null
  username?: string | null
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user, setUser } = useAuth<UserShape>()

  const [section, setSection] = useState<SectionKey>('profile')

  const [profile, setProfile] = useState<UserShape>({})
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMsg, setProfileMsg] = useState<string | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)

  const [pwCurrent, setPwCurrent] = useState('')
  const [pwNew, setPwNew] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState<string | null>(null)
  const [pwError, setPwError] = useState<string | null>(null)

  const [status, setStatus] = useState<BillingStatus | null>(null)
  const [tiers, setTiers] = useState<ReadonlyArray<PricingTier>>([])
  const [billingLoading, setBillingLoading] = useState(true)
  const [billingError, setBillingError] = useState<string | null>(null)
  const [actingTier, setActingTier] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    setProfile({
      id: user?.id ?? '',
      name: user?.name ?? '',
      email: user?.email ?? '',
      username: user?.username ?? '',
    })
  }, [user?.id, user?.name, user?.email, user?.username])

  useEffect(() => {
    let cancelled = false
    setBillingLoading(true)
    setBillingError(null)
    Promise.all([
      http.get('/api/billing/status').catch((e: unknown) => e),
      http.get('/api/billing/tiers').catch((e: unknown) => e),
    ])
      .then(([s, ts]) => {
        if (cancelled) return
        if (s instanceof Error) setBillingError(s.message)
        else setStatus(unwrapSingle<BillingStatus>(s))
        if (!(ts instanceof Error)) setTiers(unwrapList<PricingTier>(ts))
      })
      .finally(() => {
        if (!cancelled) setBillingLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, version])

  /**
   * Each tier has multiple prices (monthly / yearly). For the in-settings
   * upgrade tile we only display the monthly cell; users can switch
   * frequency from the dedicated /pricing page.
   */
  const monthlyTiers = useMemo(
    () =>
      tiers.map((tier) => {
        const monthly = tier.prices.find((p) => p.period === 'month') ?? tier.prices[0] ?? null
        return { tier, monthly }
      }),
    [tiers],
  )

  const onSaveProfile = async () => {
    if (!profile.id) return
    setSavingProfile(true)
    setProfileMsg(null)
    setProfileError(null)
    try {
      const payload: Record<string, unknown> = {}
      // Only send fields the user actually populated. The molecule user
      // PATCH handler treats `username: ''` as an attempt to clear it and
      // rejects the request with 400; we only want to send when the user
      // typed a real value.
      if ((profile.name ?? '').trim()) payload.name = profile.name
      if ((profile.username ?? '').trim()) payload.username = profile.username
      // Email is editable too: send it only when it's non-empty AND changed
      // (the user PATCH handler rejects an empty email and re-sending the
      // unchanged value is wasteful) — mirrors the shared AccountSection.
      if ((profile.email ?? '').trim() && (profile.email ?? '') !== (user?.email ?? ''))
        payload.email = profile.email
      if (Object.keys(payload).length === 0) {
        setProfileMsg(t('settings.profile.nothingToSave', {}, { defaultValue: 'Nothing to save.' }))
        return
      }
      await http.patch(`/api/users/${profile.id}`, payload)
      // Update the cached auth user so the new value shows immediately and
      // survives reload — auth client reads cached user from storage on init,
      // not the DB. Merge in only the writable string fields the user just
      // edited (the molecule update resource response wraps the updated row
      // under `body.props`, which is not the right shape to spread into the
      // auth client's flat UserShape).
      setUser({ ...(user as UserShape), ...payload } as UserShape)
      setProfileMsg(t('common.profileSavedPeriod', {}, { defaultValue: 'Profile saved.' }))
    } catch (err: unknown) {
      setProfileError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSavingProfile(false)
    }
  }

  const onSavePassword = async () => {
    if (!profile.id || !pwCurrent || !pwNew) return
    setPwSaving(true)
    setPwMsg(null)
    setPwError(null)
    try {
      await http.patch(`/api/users/${profile.id}/password`, {
        currentPassword: pwCurrent,
        newPassword: pwNew,
      })
      setPwMsg(t('auth.resetPassword.passwordUpdated', {}, { defaultValue: 'Password updated.' }))
      setPwCurrent('')
      setPwNew('')
    } catch (err: unknown) {
      setPwError(err instanceof Error ? err.message : 'Failed to update password')
    } finally {
      setPwSaving(false)
    }
  }

  const onCheckout = async (priceId: string) => {
    if (!priceId) return
    setActingTier(priceId)
    setBillingError(null)
    try {
      const res = await http.post('/api/billing/checkout', { priceId })
      const data = unwrapSingle<{
        checkoutUrl?: string
        url?: string
        redirectUrl?: string
      }>(res)
      const url = data?.checkoutUrl ?? data?.url ?? data?.redirectUrl
      if (url) {
        window.location.href = url
      } else {
        setVersion((n) => n + 1)
      }
    } catch (err: unknown) {
      setBillingError(err instanceof Error ? err.message : 'Failed to start checkout')
    } finally {
      setActingTier(null)
    }
  }

  const onCancel = async () => {
    if (
      !window.confirm(
        t(
          'settings.billing.cancelConfirm',
          {},
          { defaultValue: 'Cancel subscription at period end?' },
        ),
      )
    )
      return
    setActingTier('cancel')
    setBillingError(null)
    try {
      await http.post('/api/billing/cancel', {})
      setVersion((n) => n + 1)
    } catch (err: unknown) {
      setBillingError(err instanceof Error ? err.message : 'Failed to cancel')
    } finally {
      setActingTier(null)
    }
  }

  return (
    <div
      className={cm.cn(cm.sp('p', 8), cm.stack(6), 'max-w-[1200px] mx-auto')}
      data-test="settings-page"
    >
      <section className={cm.stack(2)}>
        <p className={cm.cn('text-[11px] uppercase tracking-widest font-bold text-blue-600')}>
          {t('nav.workspace', {}, { defaultValue: 'Workspace' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight text-on-surface')}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
      </section>

      <section className={cm.cn('grid grid-cols-1 lg:grid-cols-12 gap-6 items-start')}>
        <aside
          className={cm.cn(
            'lg:col-span-3 bg-surface rounded-2xl shadow-sm',
            cm.sp('p', 3),
            cm.stack(1),
          )}
        >
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSection(s.key)}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-lg transition-colors text-left',
                section === s.key
                  ? 'bg-blue-50 text-blue-700 border-l-[3px] border-blue-500 -ml-[3px]'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
              )}
              data-test={`settings-tab-${s.key}`}
            >
              <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>
                {s.icon}
              </span>
              {t(`settings.section.${s.key}`, {}, { defaultValue: s.label })}
            </button>
          ))}
        </aside>

        <div className={cm.cn('lg:col-span-9 grid grid-cols-1 gap-6')}>
          {section === 'profile' && (
            <Card title={t('settings.profile.title', {}, { defaultValue: 'Profile' })}>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  void onSaveProfile()
                }}
                className={cm.stack(4)}
                data-test="profile-form"
              >
                <div className={cm.cn('grid grid-cols-1 sm:grid-cols-2 gap-4')}>
                  <Field
                    label={t('form.displayName', {}, { defaultValue: 'Display name' })}
                    value={profile.name ?? ''}
                    onChange={(v) => setProfile((p) => ({ ...p, name: v }))}
                    testId="profile-name"
                  />
                  <Field
                    label={t('auth.username', {}, { defaultValue: 'Username' })}
                    value={profile.username ?? ''}
                    onChange={(v) => setProfile((p) => ({ ...p, username: v }))}
                    testId="profile-username"
                  />
                  <Field
                    label={t('settings.profile.email', {}, { defaultValue: 'Email' })}
                    type="email"
                    value={profile.email ?? ''}
                    onChange={(v) => setProfile((p) => ({ ...p, email: v }))}
                    testId="profile-email"
                  />
                </div>
                {profileError && (
                  <p className={cm.cn(cm.textSize('sm'), 'text-rose-600')}>{profileError}</p>
                )}
                {profileMsg && (
                  <p className={cm.cn(cm.textSize('sm'), 'text-emerald-600')}>{profileMsg}</p>
                )}
                <div>
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className={cm.cn(
                      cm.sp('px', 5),
                      cm.sp('py', 2.5),
                      cm.fontWeight('bold'),
                      cm.textSize('sm'),
                      'rounded-xl bg-inverse-surface text-inverse-on-surface hover:bg-inverse-surface transition-colors disabled:opacity-60',
                    )}
                    data-test="profile-save"
                  >
                    {savingProfile
                      ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                      : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
                  </button>
                </div>
              </form>
            </Card>
          )}

          {section === 'language' && (
            <Card title={t('footer.language', {}, { defaultValue: 'Language' })}>
              <p className={cm.cn(cm.textSize('sm'), cm.sp('mb', 4), 'text-on-surface-variant')}>
                {t(
                  'common.chooseTheLanguage',
                  {},
                  { defaultValue: 'Choose the language used throughout the app.' },
                )}
              </p>
              <LanguagePicker />
            </Card>
          )}

          {section === 'security' && (
            <Card title={t('settings.changePassword', {}, { defaultValue: 'Change password' })}>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  void onSavePassword()
                }}
                className={cm.stack(4)}
                data-test="password-form"
              >
                <div className={cm.cn('grid grid-cols-1 sm:grid-cols-2 gap-4')}>
                  <Field
                    label={t('settings.security.current', {}, { defaultValue: 'Current password' })}
                    value={pwCurrent}
                    onChange={setPwCurrent}
                    type="password"
                    testId="password-current"
                  />
                  <Field
                    label={t('settings.security.new', {}, { defaultValue: 'New password' })}
                    value={pwNew}
                    onChange={setPwNew}
                    type="password"
                    testId="password-new"
                  />
                </div>
                {pwError && <p className={cm.cn(cm.textSize('sm'), 'text-rose-600')}>{pwError}</p>}
                {pwMsg && <p className={cm.cn(cm.textSize('sm'), 'text-emerald-600')}>{pwMsg}</p>}
                <div>
                  <button
                    type="submit"
                    disabled={pwSaving || !pwCurrent || !pwNew}
                    className={cm.cn(
                      cm.sp('px', 5),
                      cm.sp('py', 2.5),
                      cm.fontWeight('bold'),
                      cm.textSize('sm'),
                      'rounded-xl bg-inverse-surface text-inverse-on-surface hover:bg-inverse-surface transition-colors disabled:opacity-60',
                    )}
                    data-test="password-save"
                  >
                    {pwSaving
                      ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                      : t(
                          'auth.resetPassword.updatePassword',
                          {},
                          { defaultValue: 'Update password' },
                        )}
                  </button>
                </div>
              </form>
            </Card>
          )}

          {section === 'billing' && (
            <Card title={t('nav.planAndBilling', {}, { defaultValue: 'Plan & billing' })}>
              {billingError && (
                <p
                  className={cm.cn(
                    cm.sp('p', 3),
                    cm.sp('mb', 4),
                    cm.textSize('sm'),
                    'text-rose-700 bg-rose-50 border border-rose-200 rounded-lg',
                  )}
                  data-test="billing-error"
                >
                  {billingError}
                </p>
              )}
              {billingLoading ? (
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t('settings.billing.loading', {}, { defaultValue: 'Loading billing…' })}
                </p>
              ) : (
                <div className={cm.stack(4)}>
                  <div
                    className={cm.cn(
                      cm.sp('p', 4),
                      'rounded-xl border border-outline-variant bg-surface-container',
                    )}
                    data-test="billing-status"
                  >
                    <p
                      className={cm.cn(
                        cm.textSize('xs'),
                        'uppercase tracking-widest font-bold text-on-surface-variant',
                      )}
                    >
                      {t('nav.currentPlan', {}, { defaultValue: 'Current plan' })}
                    </p>
                    <p
                      className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-on-surface')}
                    >
                      {status?.name ?? t('nav.free', {}, { defaultValue: 'Free' })}
                    </p>
                    {status?.expiresAt && (
                      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant mt-1')}>
                        {status.autoRenews
                          ? t(
                              'settings.billing.renewsOn',
                              { date: new Date(status.expiresAt).toLocaleDateString() },
                              { defaultValue: 'Renews {{date}}' },
                            )
                          : t(
                              'settings.billing.endsOn',
                              { date: new Date(status.expiresAt).toLocaleDateString() },
                              { defaultValue: 'Ends {{date}}' },
                            )}
                      </p>
                    )}
                    {!status?.isFree && (
                      <button
                        type="button"
                        onClick={onCancel}
                        disabled={actingTier === 'cancel'}
                        className={cm.cn(
                          cm.sp('mt', 3),
                          cm.sp('px', 4),
                          cm.sp('py', 2),
                          cm.textSize('xs'),
                          cm.fontWeight('bold'),
                          'rounded-full uppercase tracking-widest bg-surface border border-outline-variant text-on-surface hover:bg-surface-container disabled:opacity-60',
                        )}
                        data-test="billing-cancel"
                      >
                        {actingTier === 'cancel'
                          ? t('common.cancellingEllipsis', {}, { defaultValue: 'Cancelling…' })
                          : t(
                              'nav.cancelSubscription',
                              {},
                              { defaultValue: 'Cancel subscription' },
                            )}
                      </button>
                    )}
                  </div>

                  <div className={cm.cn('grid grid-cols-1 sm:grid-cols-3 gap-4')}>
                    {monthlyTiers.map(({ tier, monthly }) => {
                      const isFreeTier = tier.key === 'free'
                      const current =
                        (status?.category ?? null) === tier.key ||
                        (isFreeTier && (status?.isFree ?? true))
                      const stripePriceId = monthly?.stripePriceId ?? null
                      const ctaDisabled =
                        current || actingTier === stripePriceId || (!stripePriceId && !isFreeTier)
                      return (
                        <div
                          key={tier.key}
                          className={cm.cn(
                            cm.sp('p', 5),
                            cm.stack(3),
                            'rounded-xl border-2 transition-all',
                            current
                              ? 'border-blue-500 bg-blue-50/40 shadow-md'
                              : 'border-outline-variant hover:border-outline bg-surface',
                          )}
                          data-test={`billing-tier-${tier.key}`}
                        >
                          <div className={cm.flex({ justify: 'between', align: 'center' })}>
                            <h3
                              className={cm.cn(
                                cm.textSize('lg'),
                                cm.fontWeight('bold'),
                                'text-on-surface',
                              )}
                            >
                              {tier.name}
                            </h3>
                            {current && (
                              <span
                                className={cm.cn(
                                  'px-2 h-5 inline-flex items-center rounded-full text-[10px] font-black uppercase tracking-widest bg-primary text-on-primary',
                                )}
                              >
                                {t('nav.current', {}, { defaultValue: 'Current' })}
                              </span>
                            )}
                          </div>
                          <p
                            className={cm.cn(
                              cm.textSize('3xl'),
                              'font-extrabold tabular-nums font-mono text-on-surface',
                            )}
                          >
                            {monthly?.price ?? (isFreeTier ? '$0/mo' : '—')}
                          </p>
                          {tier.description && (
                            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                              {tier.description}
                            </p>
                          )}
                          {tier.perks && tier.perks.length > 0 && (
                            <ul className={cm.stack(1)}>
                              {tier.perks.map((perk) => (
                                <li
                                  key={perk}
                                  className={cm.cn(
                                    cm.flex({ align: 'center', gap: 'xs' }),
                                    cm.textSize('sm'),
                                    'text-on-surface-variant',
                                  )}
                                >
                                  <span
                                    className={cm.cn('material-symbols-outlined text-emerald-500')}
                                  >
                                    check
                                  </span>
                                  {perk}
                                </li>
                              ))}
                            </ul>
                          )}
                          {!isFreeTier && (
                            <button
                              type="button"
                              onClick={() => stripePriceId && void onCheckout(stripePriceId)}
                              disabled={ctaDisabled}
                              className={cm.cn(
                                cm.sp('mt', 2),
                                cm.sp('px', 4),
                                cm.sp('py', 2),
                                cm.fontWeight('bold'),
                                cm.textSize('sm'),
                                'rounded-xl transition-colors disabled:opacity-60',
                                current
                                  ? 'bg-surface-container text-on-surface'
                                  : 'bg-inverse-surface text-inverse-on-surface hover:bg-inverse-surface',
                              )}
                              data-test={`billing-cta-${tier.key}`}
                            >
                              {current
                                ? t('nav.currentPlan', {}, { defaultValue: 'Current plan' })
                                : actingTier === stripePriceId
                                  ? t(
                                      'settings.billing.redirecting',
                                      {},
                                      { defaultValue: 'Redirecting…' },
                                    )
                                  : t(
                                      'settings.billing.upgrade',
                                      {},
                                      { defaultValue: 'Choose plan' },
                                    )}
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      </section>
      <section className={cm.cn(cm.sp('p', 8), 'bg-surface-container-low rounded-xl')}>
        <div className={cm.sp('mb', 6)}>
          <h3 className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}>
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
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.sp('p', 6), 'bg-surface rounded-2xl shadow-sm')}>
      <h2
        className={cm.cn(
          cm.textSize('lg'),
          cm.fontWeight('bold'),
          'text-on-surface',
          cm.sp('mb', 5),
        )}
      >
        {title}
      </h2>
      {children}
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  readOnly,
  type = 'text',
  testId,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  readOnly?: boolean
  type?: string
  testId?: string
}) {
  const cm = getClassMap()
  return (
    <label className={cm.cn(cm.stack(1), cm.flex1)}>
      <span
        className={cm.cn('text-[10px] uppercase tracking-widest font-bold text-on-surface-variant')}
      >
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        data-test={testId}
        className={cm.cn(
          cm.sp('px', 4),
          cm.sp('py', 2.5),
          cm.textSize('sm'),
          'rounded-lg border border-outline-variant focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all',
          readOnly ? 'bg-surface-container text-on-surface-variant' : 'bg-surface',
        )}
      />
    </label>
  )
}

export default Settings
export { Settings as SettingsPage }
