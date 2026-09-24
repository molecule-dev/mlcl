import { useEffect, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmButton, LanguagePicker, Switch, ThemeToggle } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { type ApiSubscription, unwrapSingle } from '../lib/api.js'

interface PreferenceToggle {
  id: string
  labelKey: string
  labelDefault: string
  descriptionKey: string
  descriptionDefault: string
  defaultEnabled: boolean
}

const notificationPreferences: PreferenceToggle[] = [
  {
    id: 'shipment_updates',
    labelKey: 'settings.notifications.shipment.label',
    labelDefault: 'Shipment updates',
    descriptionKey: 'settings.notifications.shipment.description',
    descriptionDefault: 'Picked up, in transit, and delivered emails for every box.',
    defaultEnabled: true,
  },
  {
    id: 'box_curated',
    labelKey: 'settings.notifications.box.label',
    labelDefault: 'New edition previews',
    descriptionKey: 'settings.notifications.box.description',
    descriptionDefault: 'Get a peek of next month\u2019s curation 7 days before it ships.',
    defaultEnabled: true,
  },
  {
    id: 'renewal_reminder',
    labelKey: 'settings.notifications.renewal.label',
    labelDefault: 'Renewal reminders',
    descriptionKey: 'settings.notifications.renewal.description',
    descriptionDefault: 'A heads-up 3 days before your card is charged.',
    defaultEnabled: false,
  },
  {
    id: 'curator_letters',
    labelKey: 'settings.notifications.letters.label',
    labelDefault: 'Curator letters',
    descriptionKey: 'settings.notifications.letters.description',
    descriptionDefault: 'A monthly long-form note from this month\u2019s guest curator.',
    defaultEnabled: true,
  },
]

interface SubscriptionPreferences {
  address?: string
  notifications?: Record<string, boolean>
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user, setUser } = useAuth()
  const http = useHttpClient()

  const userObj = typeof user === 'object' && user ? (user as Record<string, unknown>) : null
  const userId = userObj?.id ? String(userObj.id) : null

  const [name, setName] = useState(String((userObj?.name as string) ?? ''))
  const [email, setEmail] = useState(String((userObj?.email as string) ?? ''))
  const [address, setAddress] = useState('')
  const [prefs, setPrefs] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(notificationPreferences.map((p) => [p.id, p.defaultEnabled])),
  )
  const [subscription, setSubscription] = useState<ApiSubscription | null>(null)
  const [profileFeedback, setProfileFeedback] = useState<string | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [addressFeedback, setAddressFeedback] = useState<string | null>(null)
  const [addressError, setAddressError] = useState<string | null>(null)
  const [pauseFeedback, setPauseFeedback] = useState<string | null>(null)
  const [pauseError, setPauseError] = useState<string | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingAddress, setSavingAddress] = useState(false)
  const [pausing, setPausing] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [savingPrefs, setSavingPrefs] = useState(false)

  useEffect(() => {
    if (userObj) {
      setName(String((userObj.name as string) ?? ''))
      setEmail(String((userObj.email as string) ?? ''))
    }
  }, [userObj])

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/subscriptions/mine')
      .then(unwrapSingle<ApiSubscription>)
      .then((sub) => {
        if (cancelled || !sub) return
        setSubscription(sub)
        const subPrefs = (sub.preferences ?? {}) as SubscriptionPreferences
        if (typeof subPrefs.address === 'string') setAddress(subPrefs.address)
        if (subPrefs.notifications) {
          setPrefs((prev) => ({ ...prev, ...subPrefs.notifications! }))
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [http])

  const persistPreferences = async (next: Partial<SubscriptionPreferences>) => {
    if (!subscription) return
    setSavingPrefs(true)
    const merged: SubscriptionPreferences = {
      ...(subscription.preferences as SubscriptionPreferences),
      ...next,
    }
    try {
      // useHttpClient().put() returns the HttpResponse envelope; the
      // updated subscription lives at .data, NOT on the outer object.
      // Without unwrapping, setSubscription() stores the wrapper and
      // every downstream read (preferences[], status, plan_id) breaks.
      const updated = unwrapSingle<ApiSubscription>(
        await http.put('/api/subscriptions/mine/preferences', { preferences: merged }),
      )
      if (updated) setSubscription(updated)
    } finally {
      setSavingPrefs(false)
    }
  }

  const saveProfile = async () => {
    if (!userId) return
    setSavingProfile(true)
    setProfileFeedback(null)
    setProfileError(null)
    try {
      // The auth client caches the user object in localStorage and only
      // refreshes it on login / refresh / explicit setUser(). PATCH /api/users/:id
      // hits the resource handler directly, so we must merge the updated
      // fields back into the auth-cached user, otherwise a page reload
      // re-hydrates the stale name/email from localStorage.
      // The resource update handler returns `{ props: {...} }` on success.
      // unwrapSingle peels the HttpResponse envelope but leaves the inner
      // shape intact, so we still need to read `.props` (or fall back to
      // the whole body for non-resource handlers).
      const body = unwrapSingle<{ props?: Record<string, unknown> } & Record<string, unknown>>(
        await http.patch(`/api/users/${userId}`, { name, email }),
      )
      const updated = (body?.props ?? body) as Record<string, unknown> | null
      const merged = {
        ...(userObj ?? {}),
        ...(updated ?? {}),
        name,
        email,
      }
      setUser(merged)
      track({ name: 'settings.profile_updated', properties: { userId } })
      setProfileFeedback(t('common.profileSavedPeriod', {}, { defaultValue: 'Profile saved.' }))
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : String(err))
    } finally {
      setSavingProfile(false)
    }
  }

  const saveAddress = async () => {
    setSavingAddress(true)
    setAddressFeedback(null)
    setAddressError(null)
    try {
      await persistPreferences({ address })
      track({
        name: 'settings.address_updated',
        properties: { subscriptionId: subscription?.id ?? null },
      })
      setAddressFeedback(
        subscription
          ? t('settings.address.saved', {}, { defaultValue: 'Shipping address saved.' })
          : t(
              'settings.address.noSub',
              {},
              { defaultValue: 'Subscribe first — address attaches to your subscription.' },
            ),
      )
    } catch (err) {
      setAddressError(err instanceof Error ? err.message : String(err))
    } finally {
      setSavingAddress(false)
    }
  }

  const togglePref = async (id: string) => {
    const next = { ...prefs, [id]: !prefs[id] }
    setPrefs(next)
    if (subscription) {
      try {
        await persistPreferences({ notifications: next })
        track({
          name: 'settings.notifications_changed',
          properties: { subscriptionId: subscription.id, preference: id, enabled: next[id] },
        })
      } catch (_error) {
        // intentional noop: optimistic update is rolled back; error is best-effort
        setPrefs(prefs)
      }
    }
  }

  const pauseSubscription = async () => {
    if (!subscription) return
    setPausing(true)
    setPauseFeedback(null)
    setPauseError(null)
    try {
      const updated = unwrapSingle<ApiSubscription>(
        await http.post('/api/subscriptions/mine/pause', {}),
      )
      if (updated) setSubscription(updated)
      track({
        name: 'subscription.paused',
        properties: { subscriptionId: subscription.id, planId: subscription.plan_id },
      })
      setPauseFeedback(t('settings.danger.paused', {}, { defaultValue: 'Subscription paused.' }))
    } catch (err) {
      setPauseError(err instanceof Error ? err.message : String(err))
    } finally {
      setPausing(false)
    }
  }

  const cancelSubscription = async () => {
    if (!subscription) return
    setCancelling(true)
    setPauseFeedback(null)
    setPauseError(null)
    try {
      const updated = unwrapSingle<ApiSubscription>(
        await http.post('/api/subscriptions/mine/cancel', { reason: 'user-initiated' }),
      )
      if (updated) setSubscription(updated)
      track({
        name: 'subscription.cancelled',
        properties: { subscriptionId: subscription.id, planId: subscription.plan_id },
      })
      setPauseFeedback(
        t('nav.subscriptionCancelled', {}, { defaultValue: 'Subscription cancelled.' }),
      )
    } catch (err) {
      setPauseError(err instanceof Error ? err.message : String(err))
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div
      className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }), cm.sp('py', 8))}
      data-testid="settings-page"
    >
      <div>
        <span className={cm.cn('text-xs font-bold uppercase tracking-widest text-primary')}>
          {t('nav.yourAccount', {}, { defaultValue: 'Your account' })}
        </span>
        <h1 className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface')}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
        <p className={cm.cn('text-base text-on-surface-variant max-w-2xl')}>
          {t(
            'settings.subtitle',
            { appName: APP_NAME },
            {
              defaultValue:
                'Update your profile, shipping address, and how {{appName}} reaches out.',
            },
          )}
        </p>
      </div>

      <div className={cm.cn(cm.grid({ gap: 'md' }), 'lg:grid-cols-2')}>
        <section
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'md' }),
            cm.sp('p', 8),
            'rounded-2xl bg-surface-container-lowest border border-outline-variant/30',
          )}
          data-testid="settings-profile"
        >
          <h2 className={cm.cn('text-xl font-extrabold tracking-tight text-on-surface')}>
            {t('nav.profile', {}, { defaultValue: 'Profile' })}
          </h2>
          <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
            <span
              className={cm.cn(
                'text-[10px] font-bold uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('form.displayName', {}, { defaultValue: 'Display name' })}
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="settings-name"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                'rounded-xl border border-outline-variant/40 bg-surface-container-low/50 text-sm font-medium text-on-surface focus:outline-none focus:border-primary transition-colors',
              )}
            />
          </label>
          <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
            <span
              className={cm.cn(
                'text-[10px] font-bold uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="settings-email"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                'rounded-xl border border-outline-variant/40 bg-surface-container-low/50 text-sm font-medium text-on-surface focus:outline-none focus:border-primary transition-colors',
              )}
            />
          </label>
          {profileError && (
            <p
              className={cm.cn(
                cm.sp('p', 2),
                'rounded-lg bg-error/10 text-error text-xs font-bold',
              )}
              role="alert"
              data-testid="settings-profile-error"
            >
              {profileError}
            </p>
          )}
          {profileFeedback && (
            <p
              className={cm.cn(
                cm.sp('p', 2),
                'rounded-lg bg-success-light text-success text-xs font-bold',
              )}
              role="status"
              data-testid="settings-profile-feedback"
            >
              {profileFeedback}
            </p>
          )}
          <button
            type="button"
            onClick={saveProfile}
            disabled={savingProfile}
            data-testid="settings-profile-save"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              cm.roundedFull,
              'self-start text-sm bg-primary text-on-primary hover:bg-primary-hover transition-all disabled:opacity-60',
            )}
          >
            {savingProfile
              ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
              : t('common.saveProfile', {}, { defaultValue: 'Save profile' })}
          </button>
        </section>

        <section
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'md' }),
            cm.sp('p', 8),
            'rounded-2xl bg-surface-container-lowest border border-outline-variant/30',
          )}
          data-testid="settings-address"
        >
          <h2 className={cm.cn('text-xl font-extrabold tracking-tight text-on-surface')}>
            {t('settings.address.heading', {}, { defaultValue: 'Shipping address' })}
          </h2>
          <p className={cm.cn('text-sm text-on-surface-variant')}>
            {t(
              'settings.address.subtitle',
              {},
              {
                defaultValue:
                  'We ship to a single address per subscription today. Subscribe first to attach an address.',
              },
            )}
          </p>
          <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
            <span
              className={cm.cn(
                'text-[10px] font-bold uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('form.address', {}, { defaultValue: 'Address' })}
            </span>
            <textarea
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              data-testid="settings-address-input"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 3),
                'rounded-xl border border-outline-variant/40 bg-surface-container-low/50 text-sm font-medium text-on-surface focus:outline-none focus:border-primary transition-colors resize-none',
              )}
            />
          </label>
          {addressError && (
            <p
              className={cm.cn(
                cm.sp('p', 2),
                'rounded-lg bg-error/10 text-error text-xs font-bold',
              )}
              role="alert"
              data-testid="settings-address-error"
            >
              {addressError}
            </p>
          )}
          {addressFeedback && (
            <p
              className={cm.cn(
                cm.sp('p', 2),
                'rounded-lg bg-success-light text-success text-xs font-bold',
              )}
              role="status"
              data-testid="settings-address-feedback"
            >
              {addressFeedback}
            </p>
          )}
          <button
            type="button"
            onClick={saveAddress}
            disabled={savingAddress || !subscription}
            data-testid="settings-address-save"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              cm.roundedFull,
              'self-start text-sm bg-primary text-on-primary hover:bg-primary-hover transition-all disabled:opacity-60',
            )}
          >
            {savingAddress
              ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
              : t('settings.address.save', {}, { defaultValue: 'Save address' })}
          </button>
        </section>
      </div>

      <section
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 'md' }),
          cm.sp('p', 8),
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/30',
        )}
        data-testid="settings-notifications"
      >
        <div>
          <h2 className={cm.cn('text-xl font-extrabold tracking-tight text-on-surface')}>
            {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
          </h2>
          <p className={cm.cn('text-sm text-on-surface-variant')}>
            {t(
              'settings.notifications.subtitle',
              { appName: APP_NAME },
              {
                defaultValue:
                  'Pick which signals you want from {{appName}}. Defaults are sensible.',
              },
            )}
            {savingPrefs && (
              <span className={cm.cn('ml-2 text-xs text-primary')}>
                {t('settings.notifications.saving', {}, { defaultValue: '· saving…' })}
              </span>
            )}
          </p>
        </div>
        <ul className={cm.cn(cm.flex({ direction: 'col' }), 'divide-y divide-outline-variant/30')}>
          {notificationPreferences.map((pref) => (
            <li
              key={pref.id}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
                cm.sp('py', 4),
              )}
            >
              <div className={cm.cn(cm.flex({ direction: 'col' }), 'min-w-0')}>
                <span className={cm.cn('text-base font-extrabold tracking-tight text-on-surface')}>
                  {t(pref.labelKey, {}, { defaultValue: pref.labelDefault })}
                </span>
                <span className={cm.cn('text-sm text-on-surface-variant')}>
                  {t(pref.descriptionKey, {}, { defaultValue: pref.descriptionDefault })}
                </span>
              </div>
              <Switch
                checked={prefs[pref.id]}
                onChange={() => togglePref(pref.id)}
                aria-label={t(pref.labelKey, {}, { defaultValue: pref.labelDefault })}
                data-testid={`settings-pref-${pref.id}`}
              />
            </li>
          ))}
        </ul>
      </section>

      <section
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 'md' }),
          cm.sp('p', 8),
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/30',
        )}
        data-testid="settings-language"
      >
        <div>
          <h2 className={cm.cn('text-xl font-extrabold tracking-tight text-on-surface')}>
            {t('footer.language', {}, { defaultValue: 'Language' })}
          </h2>
          <p className={cm.cn('text-sm text-on-surface-variant')}>
            {t(
              'common.chooseTheLanguage',
              {},
              { defaultValue: 'Choose the language used throughout the app.' },
            )}
          </p>
        </div>
        <LanguagePicker />
      </section>

      <section
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 'md' }),
          cm.sp('p', 8),
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/30',
        )}
        data-testid="settings-appearance"
      >
        <div>
          <h2 className={cm.cn('text-xl font-extrabold tracking-tight text-on-surface')}>
            {t('nav.appearance', {}, { defaultValue: 'Appearance' })}
          </h2>
          <p className={cm.cn('text-sm text-on-surface-variant')}>
            {t(
              'common.toggleLightDark',
              {},
              { defaultValue: 'Toggle between light and dark mode.' },
            )}
          </p>
        </div>
        <ThemeToggle />
      </section>
      <section
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 'md' }),
          cm.sp('p', 8),
          'rounded-2xl border-2 border-error/50 bg-error/5',
        )}
        data-testid="settings-danger"
      >
        <div>
          <span className={cm.cn('text-xs font-bold uppercase tracking-widest text-error')}>
            {t('nav.dangerZone', {}, { defaultValue: 'Danger zone' })}
          </span>
          <h2 className={cm.cn('text-xl font-extrabold tracking-tight text-on-surface')}>
            {t('settings.danger.heading', {}, { defaultValue: 'Pause or cancel' })}
          </h2>
          <p className={cm.cn('text-sm text-on-surface-variant max-w-2xl')}>
            {t(
              'settings.danger.subtitle',
              {},
              {
                defaultValue:
                  'Pausing keeps your tier and history intact. Cancelling stops future shipments and removes your stored payment methods at the end of the cycle.',
              },
            )}
          </p>
          {subscription && (
            <p
              className={cm.cn('text-xs font-bold text-on-surface-variant mt-2')}
              data-testid="settings-sub-status"
            >
              {t(
                'settings.danger.status',
                { status: subscription.status },
                { defaultValue: 'Subscription status: {{status}}' },
              )}
            </p>
          )}
        </div>
        {pauseError && (
          <p
            className={cm.cn(cm.sp('p', 2), 'rounded-lg bg-error/10 text-error text-xs font-bold')}
            role="alert"
            data-testid="settings-danger-error"
          >
            {pauseError}
          </p>
        )}
        {pauseFeedback && (
          <p
            className={cm.cn(
              cm.sp('p', 2),
              'rounded-lg bg-success-light text-success text-xs font-bold',
            )}
            role="status"
            data-testid="settings-danger-feedback"
          >
            {pauseFeedback}
          </p>
        )}
        <div className={cm.cn(cm.flex({ align: 'center', wrap: 'wrap', gap: 'sm' }))}>
          <button
            type="button"
            onClick={pauseSubscription}
            disabled={pausing || !subscription || subscription.status !== 'active'}
            data-testid="settings-pause"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              cm.roundedFull,
              'text-sm border-2 border-on-surface text-on-surface hover:bg-on-surface hover:text-surface transition-all disabled:opacity-60',
            )}
          >
            {pausing
              ? t('settings.danger.pausing', {}, { defaultValue: 'Pausing…' })
              : t('settings.danger.pause', {}, { defaultValue: 'Pause subscription' })}
          </button>
          <ConfirmButton
            label={t('nav.cancelSubscription', {}, { defaultValue: 'Cancel subscription' })}
            confirmLabel={t(
              'settings.danger.confirm',
              {},
              { defaultValue: 'Cancel your subscription? You can resubscribe anytime.' },
            )}
            pendingLabel={t('common.cancellingEllipsis', {}, { defaultValue: 'Cancelling…' })}
            onConfirm={cancelSubscription}
            disabled={cancelling || !subscription || subscription.status === 'cancelled'}
            disarmSeconds={6}
            data-testid="settings-cancel"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              cm.roundedFull,
              'text-sm bg-error text-on-error hover:bg-error/90 transition-all disabled:opacity-60',
            )}
          />
        </div>
      </section>
    </div>
  )
}

export default Settings
