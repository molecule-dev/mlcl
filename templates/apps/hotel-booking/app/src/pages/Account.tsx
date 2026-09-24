import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Switch } from '@molecule/app-ui-react'

import { unwrapSingle } from '../lib/unwrap.js'

const SECTIONS = ['profile', 'loyalty', 'preferences'] as const
type Section = (typeof SECTIONS)[number]

interface ProfilePayload {
  id: string
  email: string | null
  name: string | null
  first_name: string
  last_name: string
  initial: string
  preferences: {
    push?: boolean
    email?: boolean
    price_drops?: boolean
  }
}

interface LoyaltyPayload {
  tier: 'basic' | 'silver' | 'gold' | 'platinum'
  tier_label: string
  points: number
  next_tier: string | null
  next_tier_points: number | null
  benefits: string[]
  nights_count: number
  year_to_date_spend_cents: number
}

export function Account() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [section, setSection] = useState<Section>('profile')
  const [profile, setProfile] = useState<ProfilePayload | null>(null)
  const [loyalty, setLoyalty] = useState<LoyaltyPayload | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [loyaltyLoading, setLoyaltyLoading] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      http.get('/api/profile/me').catch(() => null),
      http.get('/api/loyalty/me').catch(() => null),
    ]).then(([pRes, lRes]) => {
      if (cancelled) return
      const next = unwrapSingle<ProfilePayload>(pRes)
      if (!next) {
        setProfileError(
          t('account.profile.loadError', {}, { defaultValue: 'Failed to load your profile.' }),
        )
      } else {
        setProfile(next)
      }
      setLoyalty(unwrapSingle<LoyaltyPayload>(lRes))
      setProfileLoading(false)
      setLoyaltyLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [http, t])

  return (
    <div
      className={cm.cn(
        cm.maxW('5xl'),
        cm.sp('px', 6),
        cm.sp('py', 8),
        cm.mxAuto,
        cm.grid({ cols: 12, gap: 'lg' }),
      )}
    >
      <aside className={'col-span-12 md:col-span-3'}>
        <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 4))}>
          {t('settings.account', {}, { defaultValue: 'Account' })}
        </h1>
        <nav
          className={'space-y-1'}
          aria-label={t('account.navLabel', {}, { defaultValue: 'Account sections' })}
        >
          {SECTIONS.map((s) => {
            const isActive = section === s
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSection(s)}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'block w-full text-left rounded-md',
                  isActive
                    ? 'bg-primary-container text-primary'
                    : 'text-on-surface hover:bg-surface-container',
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                {t(
                  `account.section.${s}`,
                  {},
                  { defaultValue: s.charAt(0).toUpperCase() + s.slice(1) },
                )}
              </button>
            )
          })}
        </nav>
      </aside>

      <main className={'col-span-12 md:col-span-9'}>
        {section === 'profile' && (
          <ProfileSection
            profile={profile}
            loading={profileLoading}
            error={profileError}
            onUpdated={(next) => setProfile(next)}
          />
        )}

        {section === 'loyalty' && <LoyaltySection loyalty={loyalty} loading={loyaltyLoading} />}

        {section === 'preferences' && (
          <PreferencesSection profile={profile} onUpdated={(next) => setProfile(next)} />
        )}
      </main>
    </div>
  )
}

function ProfileSection({
  profile,
  loading,
  error,
  onUpdated,
}: {
  profile: ProfilePayload | null
  loading: boolean
  error: string | null
  onUpdated: (p: ProfilePayload) => void
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<Date | null>(null)

  useEffect(() => {
    if (profile && !name) setName(profile.name ?? '')
  }, [profile, name])

  useEffect(() => {
    if (profile && !email) setEmail(profile.email ?? '')
  }, [profile, email])

  if (loading) {
    return (
      <p className={cm.cn(cm.sp('py', 8), 'text-on-surface-variant')}>
        {t('account.profile.loading', {}, { defaultValue: 'Loading profile…' })}
      </p>
    )
  }
  if (error) {
    return <p className={cm.cn(cm.sp('py', 8), 'text-error')}>{error}</p>
  }
  if (!profile) {
    return (
      <p className={cm.cn(cm.sp('py', 8), 'text-on-surface-variant')}>
        {t('account.profile.signInPrompt', {}, { defaultValue: 'Sign in to view your profile.' })}
      </p>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    setSaving(true)
    setSaveError(null)
    try {
      let next: ProfilePayload = profile
      if (name !== (profile.name ?? '')) {
        const res = await http.patch('/api/profile/me', { name })
        const updated = unwrapSingle<ProfilePayload>(res)
        if (updated) next = updated
      }
      const trimmedEmail = email.trim()
      if (trimmedEmail && trimmedEmail !== (profile.email ?? '')) {
        await http.patch(`/api/users/${profile.id}`, { email: trimmedEmail })
        next = { ...next, email: trimmedEmail }
      }
      onUpdated(next)
      setSavedAt(new Date())
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setSaveError(
        t('account.profile.saveError', { message }, { defaultValue: 'Save failed: {{message}}' }),
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cm.cn(cm.sp('p', 5), 'bg-surface rounded-xl shadow-sm space-y-4')}
    >
      <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
        {t('nav.profile', {}, { defaultValue: 'Profile' })}
      </h2>
      <Field label={t('form.name', {}, { defaultValue: 'Name' })} value={name} onChange={setName} />
      <Field
        label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
        value={email}
        onChange={setEmail}
        type="email"
      />
      {saveError ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-error')} role="alert">
          {saveError}
        </p>
      ) : null}
      {savedAt ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-success')} aria-live="polite">
          {t(
            'common.savedAt',
            { time: savedAt.toLocaleTimeString() },
            { defaultValue: 'Saved at {{time}}' },
          )}
        </p>
      ) : null}
      <button
        type="submit"
        data-testid="save-profile"
        disabled={saving}
        className={cm.cn(
          cm.sp('px', 4),
          cm.sp('py', 2),
          cm.fontWeight('semibold'),
          'bg-primary text-on-primary rounded-full hover:bg-primary-hover disabled:opacity-60',
        )}
      >
        {saving
          ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
          : t('common.saveProfile', {}, { defaultValue: 'Save profile' })}
      </button>
    </form>
  )
}

function LoyaltySection({
  loyalty,
  loading,
}: {
  loyalty: LoyaltyPayload | null
  loading: boolean
}) {
  const cm = getClassMap()
  const { t } = useTranslation()

  if (loading) {
    return (
      <p className={cm.cn(cm.sp('py', 8), 'text-on-surface-variant')}>
        {t('account.loyalty.loading', {}, { defaultValue: 'Loading loyalty…' })}
      </p>
    )
  }
  if (!loyalty) {
    return (
      <p className={cm.cn(cm.sp('py', 8), 'text-on-surface-variant')}>
        {t('account.loyalty.unavailable', {}, { defaultValue: 'Loyalty information unavailable.' })}
      </p>
    )
  }

  const nextTarget = loyalty.next_tier_points ?? loyalty.points
  const progressPct =
    nextTarget > 0 ? Math.min(100, Math.round((loyalty.points / nextTarget) * 100)) : 100

  return (
    <section className={cm.cn(cm.sp('p', 5), 'bg-surface rounded-xl shadow-sm space-y-4')}>
      <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
        {t('account.loyalty.heading', {}, { defaultValue: 'Loyalty' })}
      </h2>
      <div>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('medium'),
            'uppercase tracking-wide text-on-surface-variant',
          )}
        >
          {t('account.loyalty.tier', {}, { defaultValue: 'Current tier' })}
        </p>
        <p className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))} data-testid="loyalty-tier">
          {loyalty.tier_label}
        </p>
        {loyalty.next_tier ? (
          <>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'account.loyalty.pointsTowardNext',
                {
                  points: loyalty.points,
                  next: loyalty.next_tier_points ?? 0,
                  nextTier: loyalty.next_tier,
                },
                { defaultValue: '{{points}} / {{next}} points to {{nextTier}}' },
              )}
            </p>
            <div
              className={cm.cn(
                cm.sp('mt', 2),
                'h-2 w-full bg-surface-variant rounded-full overflow-hidden',
              )}
            >
              <div
                className={'h-full bg-primary'}
                style={{ width: `${progressPct}%` }}
                aria-hidden="true"
              />
            </div>
          </>
        ) : (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('account.loyalty.maxTier', {}, { defaultValue: 'Top tier — enjoy your benefits.' })}
          </p>
        )}
        <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 2), 'text-on-surface-variant')}>
          {t(
            'account.loyalty.activitySummary',
            {
              nights: loyalty.nights_count,
              spend: `$${Math.round(loyalty.year_to_date_spend_cents / 100).toLocaleString()}`,
            },
            { defaultValue: '{{nights}} nights · {{spend}} spent this year' },
          )}
        </p>
      </div>
      <div>
        <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), cm.sp('mb', 2))}>
          {t('account.loyalty.benefitsHeading', {}, { defaultValue: 'Your benefits' })}
        </p>
        <ul className={'space-y-1 text-sm'}>
          {loyalty.benefits.map((b) => (
            <li key={b} className={cm.flex({ align: 'center', gap: 'sm' })}>
              <span className="material-symbols-outlined text-primary" aria-hidden="true">
                check_circle
              </span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function PreferencesSection({
  profile,
  onUpdated,
}: {
  profile: ProfilePayload | null
  onUpdated: (p: ProfilePayload) => void
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [push, setPush] = useState(true)
  const [email, setEmail] = useState(true)
  const [priceDrops, setPriceDrops] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<Date | null>(null)

  useEffect(() => {
    if (!profile) return
    const prefs = profile.preferences ?? {}
    setPush(prefs.push ?? true)
    setEmail(prefs.email ?? true)
    setPriceDrops(prefs.price_drops ?? true)
  }, [profile])

  if (!profile) {
    return (
      <section className={cm.cn(cm.sp('p', 5), 'bg-surface rounded-xl shadow-sm')}>
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
          {t('nav.preferences', {}, { defaultValue: 'Preferences' })}
        </h2>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 4), 'text-on-surface-variant')}>
          {t(
            'account.preferences.signInPrompt',
            {},
            { defaultValue: 'Sign in to manage your preferences.' },
          )}
        </p>
      </section>
    )
  }

  async function persist(next: { push: boolean; email: boolean; price_drops: boolean }) {
    setSaving(true)
    setError(null)
    try {
      const res = await http.patch('/api/profile/me', { preferences: next })
      const updated = unwrapSingle<ProfilePayload>(res)
      if (updated) onUpdated(updated)
      setSavedAt(new Date())
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(
        t(
          'account.preferences.saveError',
          { message },
          { defaultValue: 'Failed to save: {{message}}' },
        ),
      )
    } finally {
      setSaving(false)
    }
  }

  function update(field: 'push' | 'email' | 'price_drops', value: boolean) {
    const next = { push, email, price_drops: priceDrops, [field]: value }
    if (field === 'push') setPush(value)
    if (field === 'email') setEmail(value)
    if (field === 'price_drops') setPriceDrops(value)
    void persist(next)
  }

  return (
    <section className={cm.cn(cm.sp('p', 5), 'bg-surface rounded-xl shadow-sm space-y-4')}>
      <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
        {t('nav.preferences', {}, { defaultValue: 'Preferences' })}
      </h2>
      <Switch
        label={t('settings.pushNotifications', {}, { defaultValue: 'Push notifications' })}
        checked={push}
        onChange={(e) => update('push', (e.target as HTMLInputElement).checked)}
        disabled={saving}
        data-testid="pref-push"
      />
      <Switch
        label={t('account.preferences.email', {}, { defaultValue: 'Email updates' })}
        checked={email}
        onChange={(e) => update('email', (e.target as HTMLInputElement).checked)}
        disabled={saving}
        data-testid="pref-email"
      />
      <Switch
        label={t(
          'account.preferences.priceDrops',
          {},
          { defaultValue: 'Price-drop alerts on saved properties' },
        )}
        checked={priceDrops}
        onChange={(e) => update('price_drops', (e.target as HTMLInputElement).checked)}
        disabled={saving}
        data-testid="pref-price-drops"
      />
      {error ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-error')} role="alert">
          {error}
        </p>
      ) : null}
      {savedAt ? (
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')} aria-live="polite">
          {t(
            'common.savedAt',
            { time: savedAt.toLocaleTimeString() },
            { defaultValue: 'Saved at {{time}}' },
          )}
        </p>
      ) : null}
    </section>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
}) {
  const cm = getClassMap()
  return (
    <label className="block">
      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'block', cm.sp('mb', 1))}>
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cm.cn(
          cm.sp('px', 3),
          cm.sp('py', 2),
          'w-full border border-outline-variant rounded-md',
        )}
      />
    </label>
  )
}
