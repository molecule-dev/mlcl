import { useEffect, useState } from 'react'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

const SECTIONS = ['profile', 'wanderClub', 'payments', 'preferences'] as const
type Section = (typeof SECTIONS)[number]

interface PaymentMethod {
  id: string
  brand: 'visa' | 'mastercard' | 'amex' | 'discover'
  last4: string
  isDefault: boolean
}

interface AccountProfile {
  id: string
  email: string | null
  firstName: string
  lastName: string
  phone: string
  loyalty: {
    tier: string
    points: number
    next_tier: string
    next_tier_points: number
    benefits: string[]
  }
  preferences: {
    pushEnabled: boolean
    emailEnabled: boolean
    priceDropAlerts: boolean
  }
  paymentMethods: PaymentMethod[]
}

export function Account() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [section, setSection] = useState<Section>('profile')
  const [profile, setProfile] = useState<AccountProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/profile/me')
      .then((res) => {
        if (!cancelled) setProfile(unwrapSingle<AccountProfile>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('nav.failedToLoadProfile', {}, { defaultValue: 'Failed to load profile.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  async function patchProfile(patch: Partial<AccountProfile>) {
    if (!profile) return
    const next = { ...profile, ...patch }
    setProfile(next)
    try {
      const res = await http.patch('/api/profile/me', patch)
      const fresh = unwrapSingle<AccountProfile>(res)
      if (fresh) setProfile(fresh)
      setSavedAt(Date.now())
    } catch (error) {
      logError('account.patchProfile', error)
      setProfile(profile)
      setError(t('common.couldNotSaveChanges', {}, { defaultValue: 'Could not save changes.' }))
    }
  }

  async function patchEmail(email: string) {
    if (!profile) return
    const trimmed = email.trim()
    if (!trimmed || trimmed === (profile.email ?? '')) return
    const previous = profile
    setProfile({ ...profile, email: trimmed })
    try {
      await http.patch(`/api/users/${profile.id}`, { email: trimmed })
      setSavedAt(Date.now())
    } catch (error) {
      logError('account.patchEmail', error)
      setProfile(previous)
      setError(t('common.couldNotSaveChanges', {}, { defaultValue: 'Could not save changes.' }))
    }
  }

  async function patchPreferences(prefs: Partial<AccountProfile['preferences']>) {
    if (!profile) return
    const next = { ...profile, preferences: { ...profile.preferences, ...prefs } }
    setProfile(next)
    try {
      const res = await http.patch('/api/profile/me', { preferences: prefs })
      const fresh = unwrapSingle<AccountProfile>(res)
      if (fresh) setProfile(fresh)
      setSavedAt(Date.now())
    } catch (error) {
      logError('account.patchPreferences', error)
      setProfile(profile)
    }
  }

  async function addPaymentMethod() {
    if (!profile) return
    const last4 = String(Math.floor(1000 + Math.random() * 9000))
    try {
      const res = await http.post('/api/profile/payment-methods', {
        brand: 'visa',
        last4,
        setDefault: profile.paymentMethods.length === 0,
      })
      const fresh = unwrapSingle<{ data?: AccountProfile } | AccountProfile>(res)
      const profileFromResp =
        fresh && typeof fresh === 'object' && 'data' in fresh && fresh.data
          ? (fresh.data as AccountProfile)
          : (fresh as AccountProfile)
      if (profileFromResp) setProfile(profileFromResp)
    } catch (error) {
      logError('account.addPaymentMethod', error)
      setError(t('account.addPaymentError', {}, { defaultValue: 'Could not add payment method.' }))
    }
  }

  async function removePayment(paymentId: string) {
    if (!profile) return
    const previous = profile.paymentMethods
    setProfile({ ...profile, paymentMethods: previous.filter((p) => p.id !== paymentId) })
    try {
      const res = await http.delete(`/api/profile/payment-methods/${paymentId}`)
      const fresh = unwrapSingle<{ data?: AccountProfile } | AccountProfile>(res)
      const profileFromResp =
        fresh && typeof fresh === 'object' && 'data' in fresh && fresh.data
          ? (fresh.data as AccountProfile)
          : (fresh as AccountProfile)
      if (profileFromResp) setProfile(profileFromResp)
    } catch (error) {
      logError('account.removePayment', error)
      setProfile({ ...profile, paymentMethods: previous })
      setError(
        t('account.removePaymentError', {}, { defaultValue: 'Could not remove payment method.' }),
      )
    }
  }

  return (
    <div className={cm.cn(cm.maxW('6xl'), cm.sp('px', 6), cm.sp('py', 8), cm.mxAuto)}>
      <header className={cm.sp('mb', 6)}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-[0.25em] text-primary',
          )}
        >
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </p>
        <h1
          className={cm.cn(
            cm.textSize('4xl'),
            cm.fontWeight('extrabold'),
            cm.sp('mt', 2),
            'leading-tight tracking-tight',
          )}
          style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
        >
          {t('settings.account', {}, { defaultValue: 'Account' })}
        </h1>
        {savedAt ? (
          <p
            data-testid="account-saved"
            className={cm.cn(cm.textSize('xs'), cm.sp('mt', 2), 'text-success font-semibold')}
          >
            {t('common.savedPeriod', {}, { defaultValue: 'Saved.' })}
          </p>
        ) : null}
        {error ? (
          <p
            data-testid="account-error"
            className={cm.cn(cm.textSize('xs'), cm.sp('mt', 2), 'text-error font-semibold')}
          >
            {error}
          </p>
        ) : null}
      </header>

      {loading || !profile ? (
        <p className={cm.cn(cm.sp('py', 12), 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : (
        <div className={cm.cn('grid grid-cols-12 gap-8')}>
          <aside className={'col-span-12 md:col-span-3'}>
            <nav
              className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}
              aria-label={t('account.navLabel', {}, { defaultValue: 'Account sections' })}
            >
              {SECTIONS.map((s) => {
                const isActive = section === s
                const labels: Record<Section, string> = {
                  profile: 'Profile',
                  wanderClub: 'Wander Club',
                  payments: 'Payment methods',
                  preferences: 'Preferences',
                }
                return (
                  <button
                    key={s}
                    type="button"
                    data-testid={`account-section-${s}`}
                    onClick={() => setSection(s)}
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      'block w-full text-left rounded-xl transition-colors',
                      isActive
                        ? 'bg-primary-container text-primary'
                        : 'text-on-surface hover:bg-surface-container',
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {t(`account.section.${s}`, {}, { defaultValue: labels[s] })}
                  </button>
                )
              })}
            </nav>
          </aside>

          <main className={'col-span-12 md:col-span-9 space-y-6'}>
            {section === 'profile' && (
              <ProfileSection profile={profile} onPatch={patchProfile} onPatchEmail={patchEmail} />
            )}

            {section === 'wanderClub' && (
              <section
                data-testid="account-wander-club"
                className={cm.cn(
                  cm.sp('p', 8),
                  'rounded-[2rem] bg-gradient-to-br from-primary to-primary-container text-white relative overflow-hidden',
                )}
              >
                <div
                  className={cm.cn(
                    cm.w(48),
                    cm.h(48),
                    cm.roundedFull,
                    'absolute -right-16 -bottom-16 bg-accent/40 blur-3xl',
                  )}
                  aria-hidden="true"
                />
                <div className="relative z-10">
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'uppercase tracking-[0.25em] text-accent',
                    )}
                  >
                    {t('account.loyalty.tier', {}, { defaultValue: 'Current tier' })}
                  </p>
                  <p
                    className={cm.cn(
                      cm.textSize('5xl'),
                      cm.fontWeight('extrabold'),
                      cm.sp('mt', 2),
                      'tracking-tight',
                    )}
                    style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
                  >
                    {profile.loyalty.tier}
                  </p>
                  <p
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.sp('mt', 2),
                      'text-white/85 tabular-nums',
                    )}
                  >
                    {t(
                      'account.loyalty.pointsTowardNext',
                      {
                        points: profile.loyalty.points.toLocaleString(),
                        next: profile.loyalty.next_tier_points.toLocaleString(),
                        nextTier: profile.loyalty.next_tier,
                      },
                      { defaultValue: '{{points}} of {{next}} miles to {{nextTier}}' },
                    )}
                  </p>
                  <div
                    className={cm.cn(
                      cm.sp('mt', 4),
                      'h-2 w-full bg-surface/20 rounded-full overflow-hidden',
                    )}
                  >
                    <div
                      data-testid="loyalty-progress"
                      className={'h-full bg-accent'}
                      style={{
                        width: `${Math.min(100, Math.round((profile.loyalty.points / profile.loyalty.next_tier_points) * 100))}%`,
                      }}
                      aria-hidden="true"
                    />
                  </div>
                  <ul className={cm.cn(cm.sp('mt', 6), cm.flex({ direction: 'col', gap: 'sm' }))}>
                    {profile.loyalty.benefits.map((b) => (
                      <li
                        key={b}
                        className={cm.cn(
                          cm.flex({ align: 'center', gap: 'sm' }),
                          cm.textSize('sm'),
                          'text-white',
                        )}
                      >
                        <span
                          className="material-symbols-outlined text-accent"
                          aria-hidden="true"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          check_circle
                        </span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}

            {section === 'payments' && (
              <section className={'space-y-3'}>
                <h2
                  className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}
                  style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
                >
                  {t('account.payments.heading', {}, { defaultValue: 'Payment methods' })}
                </h2>
                {profile.paymentMethods.length === 0 ? (
                  <p
                    className={cm.cn(
                      cm.sp('p', 5),
                      'bg-surface rounded-2xl text-on-surface-variant',
                    )}
                  >
                    {t(
                      'account.payments.empty',
                      {},
                      { defaultValue: 'No payment methods saved yet.' },
                    )}
                  </p>
                ) : null}
                {profile.paymentMethods.map((p) => (
                  <div
                    key={p.id}
                    data-testid={`account-payment-${p.id}`}
                    className={cm.cn(
                      cm.sp('p', 5),
                      cm.flex({ align: 'center', justify: 'between' }),
                      'bg-surface rounded-2xl shadow-sm border-l-4 border-primary',
                    )}
                  >
                    <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                      <span className="material-symbols-outlined text-primary" aria-hidden="true">
                        credit_card
                      </span>
                      <p className={cm.fontWeight('semibold')}>
                        {p.brand.toUpperCase()} •••• {p.last4}
                        {p.isDefault ? (
                          <span
                            className={cm.cn(
                              cm.sp('ml', 2),
                              cm.sp('px', 2),
                              cm.sp('py', 1),
                              cm.textSize('xs'),
                              cm.fontWeight('bold'),
                              'rounded-full bg-primary-container text-primary uppercase tracking-widest',
                            )}
                          >
                            {t('account.defaultBadge', {}, { defaultValue: 'Default' })}
                          </span>
                        ) : null}
                      </p>
                    </div>
                    <button
                      type="button"
                      data-testid={`account-payment-remove-${p.id}`}
                      onClick={() => removePayment(p.id)}
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        'text-primary hover:underline',
                      )}
                    >
                      {t('common.remove', {}, { defaultValue: 'Remove' })}
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  data-testid="account-add-payment"
                  onClick={addPaymentMethod}
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 3),
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'border border-dashed border-outline rounded-2xl hover:bg-surface-container w-full text-on-surface-variant',
                  )}
                >
                  + {t('account.addPaymentCta', {}, { defaultValue: 'Add payment method' })}
                </button>
              </section>
            )}

            {section === 'preferences' && (
              <PreferencesSection preferences={profile.preferences} onPatch={patchPreferences} />
            )}
          </main>
        </div>
      )}
    </div>
  )
}

function ProfileSection({
  profile,
  onPatch,
  onPatchEmail,
}: {
  profile: AccountProfile
  onPatch: (patch: Partial<AccountProfile>) => Promise<void>
  onPatchEmail: (email: string) => Promise<void>
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [firstName, setFirstName] = useState(profile.firstName)
  const [lastName, setLastName] = useState(profile.lastName)
  const [email, setEmail] = useState(profile.email ?? '')
  const [phone, setPhone] = useState(profile.phone)

  return (
    <section
      className={cm.cn(
        cm.sp('p', 6),
        'bg-surface rounded-2xl shadow-sm border-l-4 border-primary space-y-4',
      )}
    >
      <h2
        className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}
        style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
      >
        {t('nav.profile', {}, { defaultValue: 'Profile' })}
      </h2>
      <div className={cm.cn('grid grid-cols-1 md:grid-cols-2 gap-3')}>
        <Field
          id="account-first-name"
          label={t('form.firstName', {}, { defaultValue: 'First name' })}
          value={firstName}
          onChange={setFirstName}
          onBlur={() => firstName !== profile.firstName && onPatch({ firstName })}
        />
        <Field
          id="account-last-name"
          label={t('form.lastName', {}, { defaultValue: 'Last name' })}
          value={lastName}
          onChange={setLastName}
          onBlur={() => lastName !== profile.lastName && onPatch({ lastName })}
        />
        <Field
          id="account-email"
          label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
          value={email}
          onChange={setEmail}
          onBlur={() => email.trim() !== (profile.email ?? '') && onPatchEmail(email)}
          type="email"
        />
        <Field
          id="account-phone"
          label={t('form.phone', {}, { defaultValue: 'Phone' })}
          value={phone}
          onChange={setPhone}
          onBlur={() => phone !== profile.phone && onPatch({ phone })}
          type="tel"
        />
      </div>
    </section>
  )
}

function Field({
  id,
  label,
  value,
  onChange,
  onBlur,
  type = 'text',
  readOnly = false,
}: {
  id?: string
  label: string
  value: string
  onChange: (v: string) => void
  onBlur?: () => void
  type?: string
  readOnly?: boolean
}) {
  const cm = getClassMap()
  return (
    <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
      <span
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          'uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {label}
      </span>
      <input
        id={id}
        type={type}
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className={cm.cn(
          cm.sp('px', 4),
          cm.sp('py', 3),
          cm.fontWeight('semibold'),
          'bg-surface-container-low rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors',
        )}
      />
    </label>
  )
}

function PreferencesSection({
  preferences,
  onPatch,
}: {
  preferences: AccountProfile['preferences']
  onPatch: (prefs: Partial<AccountProfile['preferences']>) => Promise<void>
}) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <section
      className={cm.cn(
        cm.sp('p', 6),
        'bg-surface rounded-2xl shadow-sm border-l-4 border-accent space-y-4',
      )}
    >
      <h2
        className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}
        style={{ fontFamily: '"DM Sans", -apple-system, sans-serif' }}
      >
        {t('nav.preferences', {}, { defaultValue: 'Preferences' })}
      </h2>
      <Toggle
        testId="pref-push"
        label={t('settings.pushNotifications', {}, { defaultValue: 'Push notifications' })}
        checked={preferences.pushEnabled}
        onChange={(v) => onPatch({ pushEnabled: v })}
      />
      <Toggle
        testId="pref-email"
        label={t('account.preferences.email', {}, { defaultValue: 'Email updates' })}
        checked={preferences.emailEnabled}
        onChange={(v) => onPatch({ emailEnabled: v })}
      />
      <Toggle
        testId="pref-price-drops"
        label={t(
          'account.preferences.priceDrops',
          {},
          { defaultValue: 'Price-drop alerts on saved properties' },
        )}
        checked={preferences.priceDropAlerts}
        onChange={(v) => onPatch({ priceDropAlerts: v })}
      />
    </section>
  )
}

function Toggle({
  testId,
  label,
  checked,
  onChange,
}: {
  testId: string
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  const cm = getClassMap()
  return (
    <label className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'cursor-pointer')}>
      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{label}</span>
      <button
        type="button"
        data-testid={testId}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cm.cn(
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
          checked ? 'bg-primary' : 'bg-outline-variant',
        )}
      >
        <span
          className={cm.cn(
            'inline-block h-4 w-4 rounded-full bg-on-primary transition-transform',
            checked ? 'translate-x-6' : 'translate-x-1',
          )}
        />
      </button>
    </label>
  )
}
