import { useEffect, useState } from 'react'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, Switch, ThemeToggle } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'

const SECTIONS = [
  { key: 'profile', defaultLabel: 'Profile', icon: 'person' },
  { key: 'notifications', defaultLabel: 'Notifications', icon: 'notifications' },
  { key: 'security', defaultLabel: 'Security', icon: 'shield_lock' },
  { key: 'subscription', defaultLabel: 'Plan & billing', icon: 'workspace_premium' },
] as const

interface ProfileShape {
  firstName: string
  lastName: string
  displayName: string
  bio: string
  theme?: 'light' | 'dark' | 'system'
  language?: string
  notifications: {
    newOrders: boolean
    eventReminders: boolean
    marketing: boolean
    transfers: boolean
  }
  email: string | null
}

interface BillingStatus {
  planKey: string
  category: string
  name: string
  isFree: boolean
}

interface PricingTier {
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
}

const NOTIFICATION_PREFS = [
  {
    key: 'newOrders',
    defaultLabel: 'New orders',
    defaultBody: 'When a fan buys a ticket to an event you host.',
  },
  {
    key: 'eventReminders',
    defaultLabel: 'Event reminders',
    defaultBody: '24-hour countdown for events you’re attending.',
  },
  {
    key: 'marketing',
    defaultLabel: 'Curated picks',
    defaultBody: 'Weekly digest of events near you.',
  },
  {
    key: 'transfers',
    defaultLabel: 'Transfers & refunds',
    defaultBody: 'Movement on tickets you’ve sent or received.',
  },
] as const

const EMPTY_PROFILE: ProfileShape = {
  firstName: '',
  lastName: '',
  displayName: '',
  bio: '',
  theme: 'system',
  language: 'en',
  notifications: { newOrders: true, eventReminders: true, marketing: false, transfers: true },
  email: null,
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user } = useAuth<{ id?: string; email?: string }>()
  const [active, setActive] = useState<(typeof SECTIONS)[number]['key']>('profile')
  const [profile, setProfile] = useState<ProfileShape>(EMPTY_PROFILE)
  const [profileSavedAt, setProfileSavedAt] = useState<number>(0)
  const [profileBusy, setProfileBusy] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null)
  const [savedEmail, setSavedEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Billing
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null)
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([])
  const [billingBusy, setBillingBusy] = useState(false)
  const [billingError, setBillingError] = useState<string | null>(null)
  const [billingSuccess, setBillingSuccess] = useState<string | null>(null)

  // Password change
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [pwBusy, setPwBusy] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSuccess, setPwSuccess] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const [profileRes, statusRes, tiersRes] = await Promise.all([
          http.get('/api/profile/me'),
          http.get('/api/billing/status').catch(() => ({ data: null })),
          http.get('/api/billing/tiers').catch(() => ({ data: { data: [] } })),
        ])
        if (cancelled) return
        const p = profileRes.data as ProfileShape
        setProfile({
          firstName: p.firstName ?? '',
          lastName: p.lastName ?? '',
          displayName: p.displayName ?? '',
          bio: p.bio ?? '',
          theme: p.theme ?? 'system',
          language: p.language ?? 'en',
          notifications: {
            newOrders: p.notifications?.newOrders ?? true,
            eventReminders: p.notifications?.eventReminders ?? true,
            marketing: p.notifications?.marketing ?? false,
            transfers: p.notifications?.transfers ?? true,
          },
          email: p.email ?? null,
        })
        setSavedEmail(p.email ?? null)
        setBillingStatus(statusRes.data as BillingStatus | null)
        const tiersData = tiersRes.data as { data?: PricingTier[] } | null
        setPricingTiers(tiersData?.data ?? [])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [http, profileSavedAt])

  async function saveProfile() {
    setProfileBusy(true)
    setProfileError(null)
    setProfileSuccess(null)
    try {
      const body = {
        firstName: profile.firstName,
        lastName: profile.lastName,
        displayName: profile.displayName,
        bio: profile.bio,
      }
      await http.patch('/api/profile/me', body)
      setProfileSuccess(t('settings.profileSaved', {}, { defaultValue: 'Profile saved.' }))
      setProfileSavedAt(Date.now())
    } catch (err) {
      setProfileError((err as Error).message ?? 'Could not save')
    } finally {
      setProfileBusy(false)
    }
  }

  async function saveEmail(value: string) {
    if (!user?.id) {
      setProfileError(t('settings.notSignedIn', {}, { defaultValue: 'Not signed in.' }))
      return
    }
    const next = value.trim()
    if (!next || next === (savedEmail ?? '')) return
    setProfileBusy(true)
    setProfileError(null)
    setProfileSuccess(null)
    try {
      await http.patch(`/api/users/${encodeURIComponent(user.id)}`, { email: next })
      setSavedEmail(next)
      setProfileSuccess(t('settings.emailUpdated', {}, { defaultValue: 'Email updated.' }))
    } catch (err) {
      setProfileError((err as Error).message ?? 'Could not update email')
      setProfile((prev) => ({ ...prev, email: savedEmail }))
    } finally {
      setProfileBusy(false)
    }
  }

  async function saveNotifications(patch: Partial<ProfileShape['notifications']>) {
    const next = { ...profile.notifications, ...patch }
    setProfile((prev) => ({ ...prev, notifications: next }))
    try {
      await http.patch('/api/profile/me', { notifications: patch })
    } catch (err) {
      setProfileError((err as Error).message ?? 'Could not save')
    }
  }

  async function startCheckout(stripePriceId: string) {
    setBillingBusy(true)
    setBillingError(null)
    setBillingSuccess(null)
    try {
      const res = await http.post('/api/billing/checkout', { priceId: stripePriceId })
      const data = res.data as { checkoutUrl?: string; updated?: boolean }
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
        return
      }
      if (data.updated) {
        setBillingSuccess(t('settings.planUpdated', {}, { defaultValue: 'Plan updated.' }))
      }
    } catch (err) {
      setBillingError((err as Error).message ?? 'Checkout failed')
    } finally {
      setBillingBusy(false)
    }
  }

  async function cancelPlan() {
    setBillingBusy(true)
    setBillingError(null)
    setBillingSuccess(null)
    try {
      await http.post('/api/billing/cancel', {})
      setBillingSuccess(
        t('settings.subscriptionCancelled', {}, { defaultValue: 'Subscription cancelled.' }),
      )
    } catch (err) {
      setBillingError((err as Error).message ?? 'Cancellation failed')
    } finally {
      setBillingBusy(false)
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.id) {
      setPwError(t('settings.notSignedIn', {}, { defaultValue: 'Not signed in.' }))
      return
    }
    setPwBusy(true)
    setPwError(null)
    setPwSuccess(null)
    try {
      await http.patch(`/api/users/${encodeURIComponent(user.id)}/password`, {
        currentPassword,
        newPassword,
      })
      setPwSuccess(t('settings.passwordUpdated', {}, { defaultValue: 'Password updated.' }))
      setCurrentPassword('')
      setNewPassword('')
    } catch (err) {
      setPwError((err as Error).message ?? 'Could not change password')
    } finally {
      setPwBusy(false)
    }
  }

  return (
    <div
      className={cm.cn(cm.sp('p', 8), cm.stack(8), 'max-w-6xl w-full mx-auto')}
      data-mol-id="page-settings"
    >
      <header className={cm.stack(2)}>
        <p className={cm.cn('text-xs font-black uppercase tracking-widest text-primary')}>
          {t('settings.eyebrow', { app: APP_NAME }, { defaultValue: '{{app}} · Account' })}
        </p>
        <h1 className={cm.cn('text-4xl font-extrabold tracking-tight')}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
      </header>

      <div
        className={cm.cn(
          cm.grid({ gap: 'lg' }),
          'grid-cols-1 lg:grid-cols-[260px_1fr] items-start',
        )}
      >
        {/* Side nav */}
        <aside
          className={cm.cn('p-3 rounded-2xl bg-surface border border-outline-variant/40 shadow-sm')}
        >
          <ul className={cm.stack(1)}>
            {SECTIONS.map((s) => {
              const isActive = active === s.key
              return (
                <li key={s.key}>
                  <button
                    type="button"
                    onClick={() => setActive(s.key)}
                    data-mol-id={`section-${s.key}`}
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'sm' }),
                      'w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-left transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-on-surface-variant hover:bg-surface-container-low',
                    )}
                  >
                    <span className={cm.cn('material-symbols-outlined text-lg')} aria-hidden="true">
                      {s.icon}
                    </span>
                    {t(`settings.section.${s.key}`, {}, { defaultValue: s.defaultLabel })}
                  </button>
                </li>
              )
            })}
          </ul>
        </aside>

        {/* Section content */}
        <section
          className={cm.cn(
            'p-8 rounded-2xl bg-surface border border-outline-variant/40 shadow-sm stack-y space-y-6 min-h-[420px]',
          )}
        >
          {loading ? (
            <p className={cm.textMuted}>
              {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
            </p>
          ) : null}

          {!loading && active === 'profile' ? (
            <>
              <header className={cm.stack(1)}>
                <h2 className={cm.cn('text-2xl font-extrabold tracking-tight')}>
                  {t('settings.profile.heading', {}, { defaultValue: 'Profile' })}
                </h2>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(
                    'settings.profile.body',
                    {},
                    {
                      defaultValue:
                        'How you appear to fans, organizers, and your own ticket library.',
                    },
                  )}
                </p>
              </header>
              {profileError ? (
                <p role="alert" className={cm.cn('text-error font-bold text-sm')}>
                  {profileError}
                </p>
              ) : null}
              {profileSuccess ? (
                <p
                  role="status"
                  className={cm.cn('text-success font-bold text-sm')}
                  data-mol-id="profile-success"
                >
                  {profileSuccess}
                </p>
              ) : null}
              <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-2')}>
                <label className={cm.stack(2)}>
                  <span
                    className={cm.cn(
                      'text-xs font-bold uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('form.firstName', {}, { defaultValue: 'First name' })}
                  </span>
                  <input
                    data-mol-id="profile-first-name"
                    value={profile.firstName}
                    onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                    className={cm.cn(
                      'px-4 py-3 rounded-lg bg-surface-container-low border border-outline-variant focus:border-primary focus:outline-none text-sm font-medium',
                    )}
                  />
                </label>
                <label className={cm.stack(2)}>
                  <span
                    className={cm.cn(
                      'text-xs font-bold uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('form.lastName', {}, { defaultValue: 'Last name' })}
                  </span>
                  <input
                    data-mol-id="profile-last-name"
                    value={profile.lastName}
                    onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                    className={cm.cn(
                      'px-4 py-3 rounded-lg bg-surface-container-low border border-outline-variant focus:border-primary focus:outline-none text-sm font-medium',
                    )}
                  />
                </label>
                <label className={cm.cn(cm.stack(2), 'md:col-span-2')}>
                  <span
                    className={cm.cn(
                      'text-xs font-bold uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('form.displayName', {}, { defaultValue: 'Display name' })}
                  </span>
                  <input
                    data-mol-id="profile-display-name"
                    value={profile.displayName}
                    onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                    className={cm.cn(
                      'px-4 py-3 rounded-lg bg-surface-container-low border border-outline-variant focus:border-primary focus:outline-none text-sm font-medium',
                    )}
                  />
                </label>
                <label className={cm.cn(cm.stack(2), 'md:col-span-2')}>
                  <span
                    className={cm.cn(
                      'text-xs font-bold uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
                  </span>
                  <input
                    type="email"
                    data-mol-id="profile-email"
                    autoComplete="email"
                    value={profile.email ?? ''}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    onBlur={() => saveEmail(profile.email ?? '')}
                    className={cm.cn(
                      'px-4 py-3 rounded-lg bg-surface-container-low border border-outline-variant focus:border-primary focus:outline-none text-sm font-medium',
                    )}
                  />
                </label>
                <label className={cm.cn(cm.stack(2), 'md:col-span-2')}>
                  <span
                    className={cm.cn(
                      'text-xs font-bold uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('form.bio', {}, { defaultValue: 'Bio' })}
                  </span>
                  <textarea
                    data-mol-id="profile-bio"
                    rows={3}
                    value={profile.bio}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    className={cm.cn(
                      'px-4 py-3 rounded-lg bg-surface-container-low border border-outline-variant focus:border-primary focus:outline-none text-sm font-medium',
                    )}
                  />
                </label>
              </div>
              <div className={cm.cn(cm.flex({ align: 'center', justify: 'end', gap: 'sm' }))}>
                <button
                  type="button"
                  disabled={profileBusy}
                  onClick={saveProfile}
                  data-mol-id="profile-save"
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 2.5),
                    'rounded-full text-white text-sm font-bold shadow-md shadow-primary/30 disabled:opacity-50',
                  )}
                  style={{
                    background:
                      'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                  }}
                >
                  {profileBusy
                    ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                    : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
                </button>
              </div>
              <div
                className={cm.cn(cm.sp('pt', 6), cm.stack(3), 'border-t border-outline-variant/40')}
              >
                <div className={cm.stack(1)}>
                  <h3 className={cm.cn('text-lg font-extrabold tracking-tight')}>
                    {t('footer.language', {}, { defaultValue: 'Language' })}
                  </h3>
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                    {t(
                      'common.chooseTheLanguage',
                      {},
                      { defaultValue: 'Choose the language used throughout the app.' },
                    )}
                  </p>
                </div>
                <LanguagePicker />
              </div>
            </>
          ) : null}

          {!loading && active === 'notifications' ? (
            <>
              <header className={cm.stack(1)}>
                <h2 className={cm.cn('text-2xl font-extrabold tracking-tight')}>
                  {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
                </h2>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(
                    'settings.notifications.body',
                    {},
                    { defaultValue: 'Choose which alerts you want — push, email, or both.' },
                  )}
                </p>
              </header>
              <ul className={cm.stack(3)}>
                {NOTIFICATION_PREFS.map((p) => {
                  const on = profile.notifications[p.key as keyof ProfileShape['notifications']]
                  return (
                    <li
                      key={p.key}
                      className={cm.cn(
                        'p-4 rounded-xl border border-outline-variant flex items-start gap-4',
                      )}
                    >
                      <span
                        className={cm.cn('material-symbols-outlined text-xl')}
                        style={{ color: 'var(--color-primary)' }}
                        aria-hidden="true"
                      >
                        notifications_active
                      </span>
                      <div className={cm.cn('flex-1 min-w-0 stack-y space-y-0.5')}>
                        <p className={cm.cn(cm.textSize('sm'), 'font-bold')}>
                          {t(
                            `settings.notifications.${p.key}.label`,
                            {},
                            { defaultValue: p.defaultLabel },
                          )}
                        </p>
                        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                          {t(
                            `settings.notifications.${p.key}.body`,
                            {},
                            { defaultValue: p.defaultBody },
                          )}
                        </p>
                      </div>
                      <Switch
                        checked={on}
                        onChange={(e) =>
                          saveNotifications({
                            [p.key]: (e.target as HTMLInputElement).checked,
                          } as Partial<ProfileShape['notifications']>)
                        }
                        data-mol-id={`pref-${p.key}`}
                      />
                    </li>
                  )
                })}
              </ul>
            </>
          ) : null}

          {!loading && active === 'security' ? (
            <>
              <header className={cm.stack(1)}>
                <h2 className={cm.cn('text-2xl font-extrabold tracking-tight')}>
                  {t('settings.security.heading', {}, { defaultValue: 'Security' })}
                </h2>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(
                    'settings.security.body',
                    {},
                    { defaultValue: 'Change your account password.' },
                  )}
                </p>
              </header>
              <form onSubmit={changePassword} className={cm.cn(cm.stack(3), 'max-w-md')}>
                <label className={cm.stack(2)}>
                  <span
                    className={cm.cn(
                      'text-xs font-bold uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('settings.security.current', {}, { defaultValue: 'Current password' })}
                  </span>
                  <input
                    type="password"
                    required
                    data-mol-id="security-current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className={cm.cn(
                      'px-4 py-3 rounded-lg bg-surface-container-low border border-outline-variant focus:border-primary focus:outline-none text-sm font-mono',
                    )}
                  />
                </label>
                <label className={cm.stack(2)}>
                  <span
                    className={cm.cn(
                      'text-xs font-bold uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('settings.security.new', {}, { defaultValue: 'New password' })}
                  </span>
                  <input
                    type="password"
                    required
                    data-mol-id="security-new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={cm.cn(
                      'px-4 py-3 rounded-lg bg-surface-container-low border border-outline-variant focus:border-primary focus:outline-none text-sm font-mono',
                    )}
                  />
                </label>
                {pwError ? (
                  <p role="alert" className={cm.cn('text-error font-bold text-xs')}>
                    {pwError}
                  </p>
                ) : null}
                {pwSuccess ? (
                  <p
                    role="status"
                    data-mol-id="security-success"
                    className={cm.cn('text-success font-bold text-xs')}
                  >
                    {pwSuccess}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={pwBusy}
                  data-mol-id="security-submit"
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 2.5),
                    'rounded-full text-white text-sm font-bold disabled:opacity-50 self-start',
                  )}
                  style={{
                    background:
                      'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                  }}
                >
                  {pwBusy
                    ? t('common.updatingEllipsis', {}, { defaultValue: 'Updating…' })
                    : t('settings.changePassword', {}, { defaultValue: 'Change password' })}
                </button>
              </form>
            </>
          ) : null}

          {!loading && active === 'subscription' ? (
            <>
              <header className={cm.stack(1)}>
                <h2 className={cm.cn('text-2xl font-extrabold tracking-tight')}>
                  {t('nav.planAndBilling', {}, { defaultValue: 'Plan & billing' })}
                </h2>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(
                    'settings.subscription.body',
                    {},
                    { defaultValue: 'Cancel or upgrade anytime — payments handled by Stripe.' },
                  )}
                </p>
              </header>
              {billingError ? (
                <p role="alert" className={cm.cn('text-error font-bold text-sm')}>
                  {billingError}
                </p>
              ) : null}
              {billingSuccess ? (
                <p role="status" className={cm.cn('text-success font-bold text-sm')}>
                  {billingSuccess}
                </p>
              ) : null}
              {billingStatus ? (
                <div
                  className={cm.cn(
                    'p-6 rounded-2xl text-white shadow-lg shadow-primary/30 relative overflow-hidden',
                  )}
                  style={{
                    background:
                      'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                  }}
                  data-mol-id="current-plan"
                >
                  <div
                    className={cm.cn(
                      'absolute -right-16 -bottom-16 w-48 h-48 rounded-full bg-white/10 blur-3xl',
                    )}
                    aria-hidden="true"
                  />
                  <p className={cm.cn('text-xs font-black uppercase tracking-widest opacity-80')}>
                    {t('nav.currentPlan', {}, { defaultValue: 'Current plan' })}
                  </p>
                  <p className={cm.cn('text-3xl font-extrabold tracking-tight mt-1')}>
                    {billingStatus.name}
                  </p>
                  <p className={cm.cn(cm.textSize('sm'), 'mt-2 opacity-80')}>
                    {billingStatus.isFree
                      ? t(
                          'settings.subscription.free',
                          {},
                          { defaultValue: 'Free tier — up to 5 events.' },
                        )
                      : t(
                          'settings.subscription.paid',
                          {},
                          { defaultValue: 'Active subscription' },
                        )}
                  </p>
                </div>
              ) : null}
              <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-3')}>
                {pricingTiers.map((tier) => (
                  <article
                    key={tier.key}
                    className={cm.cn(
                      'p-5 rounded-2xl border border-outline-variant stack-y space-y-3',
                    )}
                    data-mol-id={`tier-${tier.key}`}
                  >
                    <h3 className={cm.cn('text-lg font-extrabold')}>{tier.name}</h3>
                    {tier.prices.map((price) => (
                      <div
                        key={`${tier.key}-${price.period}`}
                        className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'gap-3')}
                      >
                        <span className={cm.cn('text-sm font-bold')}>{price.price}</span>
                        {price.stripePriceId ? (
                          <button
                            type="button"
                            disabled={billingBusy}
                            onClick={() =>
                              price.stripePriceId && startCheckout(price.stripePriceId)
                            }
                            data-mol-id={`tier-${tier.key}-${price.period}-buy`}
                            className={cm.cn(
                              'px-3 py-1.5 rounded-full text-white text-xs font-bold disabled:opacity-50',
                            )}
                            style={{
                              background:
                                'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                            }}
                          >
                            {billingBusy
                              ? '…'
                              : t('settings.subscription.choose', {}, { defaultValue: 'Choose' })}
                          </button>
                        ) : (
                          <span className={cm.cn('text-xs text-on-surface-variant')}>—</span>
                        )}
                      </div>
                    ))}
                  </article>
                ))}
              </div>
              {billingStatus && !billingStatus.isFree ? (
                <button
                  type="button"
                  disabled={billingBusy}
                  onClick={cancelPlan}
                  data-mol-id="cancel-plan"
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 2.5),
                    'rounded-full border border-outline-variant text-sm font-bold disabled:opacity-50 self-start',
                  )}
                >
                  {billingBusy
                    ? '…'
                    : t('settings.subscription.cancel', {}, { defaultValue: 'Cancel plan' })}
                </button>
              ) : null}
            </>
          ) : null}
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
    </div>
  )
}

export default Settings
