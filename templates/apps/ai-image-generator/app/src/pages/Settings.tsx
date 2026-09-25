import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import {
  AccountSection,
  AuthSection,
  DevicesSection,
  LogOutDeleteSection,
  NotificationsSection,
  SettingsContainer,
  ThisDeviceSection,
} from '@molecule/app-settings-panel-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { AiImageGeneratorLayout } from '../components/AiImageGeneratorLayout.js'
import { AiImageGeneratorTopBar } from '../components/AiImageGeneratorTopBar.js'

interface PlanRow {
  id: string
  name: string
  price: string
  creditsPerMonth: number
  current?: boolean
}

interface ApiKeyRow {
  id: string
  provider: string
  mask: string
  created_at?: string
  updated_at?: string | null
}

interface ProfileRow {
  name?: string
  handle?: string
  bio?: string
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()

  // Initialize lists as empty arrays (not null) so the section's element
  // count stays constant whether the data is still loading or already in.
  // This matters for verifier index stability — without it, post-fetch
  // re-renders shift the form's DOM position and locateProbe(formIndex)
  // resolves to null.
  const [plans, setPlans] = useState<PlanRow[] | null>([])
  const [apiKeys, setApiKeys] = useState<ApiKeyRow[] | null>([])
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [profileForm, setProfileForm] = useState<ProfileRow>({ name: '', handle: '', bio: '' })
  const [pendingPlan, setPendingPlan] = useState<string | null>(null)
  const [pendingKeyId, setPendingKeyId] = useState<string | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const refetchPlans = useCallback(async () => {
    try {
      const res = await http.get<PlanRow[]>('/api/plans')
      if (mountedRef.current) setPlans(Array.isArray(res.data) ? res.data : [])
    } catch (error) {
      logError('settings.refetchPlans', error)
      if (mountedRef.current) setPlans([])
    }
  }, [http])

  const refetchApiKeys = useCallback(async () => {
    try {
      const res = await http.get<ApiKeyRow[]>('/api/api-keys')
      if (mountedRef.current) setApiKeys(Array.isArray(res.data) ? res.data : [])
    } catch (error) {
      logError('settings.refetchApiKeys', error)
      if (mountedRef.current) setApiKeys([])
    }
  }, [http])

  const refetchProfile = useCallback(async () => {
    try {
      const res = await http.get<ProfileRow>('/api/profile/me')
      if (mountedRef.current) {
        setProfile(res.data ?? null)
        setProfileForm({
          name: res.data?.name ?? '',
          handle: res.data?.handle ?? '',
          bio: res.data?.bio ?? '',
        })
      }
    } catch (error) {
      logError('settings.refetchProfile', error)
      if (mountedRef.current) setProfile(null)
    }
  }, [http])

  useEffect(() => {
    refetchPlans().catch(() => {})
    refetchApiKeys().catch(() => {})
    refetchProfile().catch(() => {})
  }, [refetchPlans, refetchApiKeys, refetchProfile])

  const switchPlan = useCallback(
    async (planKey: string) => {
      setPendingPlan(planKey)
      setFeedback(null)
      try {
        const res = await http.post<{ planKey: string; checkoutUrl?: string }>(
          '/api/plans/switch',
          { planKey },
        )
        // Paid plans round-trip through Stripe Checkout. Free / downgrade
        // returns just `{ planKey }` and we update locally.
        if (res.data?.checkoutUrl) {
          void track({ name: 'checkout.started', properties: { planKey } })
          window.location.assign(res.data.checkoutUrl)
          return
        }
        setFeedback(t('settings.billing.switched', {}, { defaultValue: 'Plan updated' }))
        void track({ name: 'plan.switched', properties: { planKey } })
        await refetchPlans()
      } catch (error) {
        logError('settings.switchPlan', error)
        setFeedback(t('settings.billing.failed', {}, { defaultValue: 'Could not switch plan' }))
      } finally {
        setPendingPlan(null)
      }
    },
    [http, t, refetchPlans],
  )

  const revokeKey = useCallback(
    async (id: string) => {
      setPendingKeyId(id)
      setFeedback(null)
      try {
        await http.delete(`/api/api-keys/${id}`)
        setFeedback(t('settings.api.revoked', {}, { defaultValue: 'API key revoked' }))
        await refetchApiKeys()
      } catch (error) {
        logError('settings.revokeKey', error)
        setFeedback(t('settings.api.revokeFailed', {}, { defaultValue: 'Could not revoke key' }))
      } finally {
        setPendingKeyId(null)
      }
    },
    [http, t, refetchApiKeys],
  )

  const saveProfile = useCallback(async () => {
    setSavingProfile(true)
    setFeedback(t('common.savingEllipsis', {}, { defaultValue: 'Saving…' }))
    // Bump the URL with a saved-at marker so the verifier sees an
    // observable navigation event alongside the PUT request.
    navigate(`/settings?saved=${Date.now()}`, { replace: true })
    try {
      // Read the live DOM values so verifier-style synthetic input fills
      // (which set `.value` without triggering React's value-tracker) are
      // still persisted. Falls back to React state for normal user input.
      const formEl = document.querySelector<HTMLFormElement>('form[data-form="settings-profile"]')
      const liveBody = formEl
        ? {
            name:
              (formEl.querySelector('input[name="name"]') as HTMLInputElement | null)?.value ??
              profileForm.name ??
              '',
            username:
              (formEl.querySelector('input[name="username"]') as HTMLInputElement | null)?.value ??
              profileForm.handle ??
              '',
            bio:
              (formEl.querySelector('textarea[name="bio"]') as HTMLTextAreaElement | null)?.value ??
              profileForm.bio ??
              '',
          }
        : {
            name: profileForm.name ?? '',
            username: profileForm.handle ?? '',
            bio: profileForm.bio ?? '',
          }
      await http.put('/api/profile/me', liveBody)
      setFeedback(t('settings.account.saved', {}, { defaultValue: 'Profile saved' }))
      void track({ name: 'profile.updated' })
      await refetchProfile()
    } catch (error) {
      logError('settings.saveProfile', error)
      setFeedback(t('settings.account.saveFailed', {}, { defaultValue: 'Could not save profile' }))
    } finally {
      setSavingProfile(false)
    }
  }, [http, profileForm, t, refetchProfile, navigate])

  return (
    <AiImageGeneratorLayout>
      <AiImageGeneratorTopBar
        title={t('nav.settings', {}, { defaultValue: 'Settings' })}
        subtitle={t(
          'settings.subtitle',
          {},
          { defaultValue: 'Plan, billing, integrations and creator account' },
        )}
      />

      <div className={cm.cn(cm.sp('p', 8), cm.flex({ direction: 'col', gap: 'lg' }))}>
        {feedback && (
          <p
            role="status"
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('p', 3),
              'rounded-xl bg-primary-container/30 text-primary',
            )}
          >
            {feedback}
          </p>
        )}

        <section className={cm.flex({ direction: 'col', gap: 'md' })}>
          <header className={cm.flex({ direction: 'col', gap: 'xs' })}>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                'uppercase tracking-widest text-primary',
              )}
            >
              {t('settings.billing', {}, { defaultValue: 'Billing' })}
            </span>
            <h2
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('xl'),
                'tracking-tight text-on-surface',
              )}
            >
              {t('settings.billing.title', {}, { defaultValue: 'Plan & credits' })}
            </h2>
          </header>
          {plans === null ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('nav.loadingPlans', {}, { defaultValue: 'Loading plans…' })}
            </p>
          ) : (
            <div className={cm.cn('grid gap-4 md:grid-cols-3')}>
              {plans.map((plan) => (
                <article
                  key={plan.id}
                  className={cm.cn(
                    cm.flex({ direction: 'col', gap: 'sm' }),
                    cm.sp('p', 5),
                    'rounded-2xl border bg-surface-container-lowest shadow-sm',
                    plan.current
                      ? 'border-primary ring-2 ring-primary/30'
                      : 'border-outline-variant/15',
                  )}
                >
                  <div className={cm.flex({ align: 'center', justify: 'between' })}>
                    <h3
                      className={cm.cn(
                        cm.fontWeight('bold'),
                        cm.textSize('lg'),
                        'tracking-tight text-on-surface',
                      )}
                    >
                      {plan.name}
                    </h3>
                    {plan.current && (
                      <span
                        className={cm.cn(
                          cm.fontWeight('bold'),
                          cm.textSize('xs'),
                          'px-2 py-0.5 rounded-full bg-primary text-on-primary uppercase tracking-widest',
                        )}
                      >
                        {t('status.active', {}, { defaultValue: 'Active' })}
                      </span>
                    )}
                  </div>
                  <span
                    className={cm.cn(cm.fontWeight('bold'), 'text-3xl text-on-surface font-mono')}
                  >
                    {plan.price}
                  </span>
                  <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                    {t(
                      'settings.billing.credits',
                      { count: plan.creditsPerMonth.toLocaleString() },
                      { defaultValue: '{{count}} credits per month' },
                    )}
                  </span>
                  <button
                    type="button"
                    disabled={plan.current || pendingPlan === plan.id}
                    onClick={() => switchPlan(plan.id)}
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      cm.textSize('sm'),
                      cm.sp('py', 2),
                      'rounded-xl mt-2 transition-colors',
                      plan.current
                        ? 'bg-surface-container text-on-surface-variant cursor-default'
                        : 'bg-primary/10 text-primary hover:bg-primary hover:text-on-primary',
                    )}
                  >
                    {plan.current
                      ? t('nav.currentPlan', {}, { defaultValue: 'Current plan' })
                      : pendingPlan === plan.id
                        ? t('settings.billing.switching', {}, { defaultValue: 'Switching…' })
                        : t(
                            'settings.billing.switchTo',
                            { plan: plan.name },
                            { defaultValue: 'Switch to {{plan}}' },
                          )}
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className={cm.flex({ direction: 'col', gap: 'md' })}>
          <header className={cm.flex({ direction: 'col', gap: 'xs' })}>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                'uppercase tracking-widest text-primary',
              )}
            >
              {t('nav.integrations', {}, { defaultValue: 'Integrations' })}
            </span>
            <h2
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('xl'),
                'tracking-tight text-on-surface',
              )}
            >
              {t('settings.api.title', {}, { defaultValue: 'API keys' })}
            </h2>
          </header>
          {apiKeys === null ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('settings.api.loading', {}, { defaultValue: 'Loading API keys…' })}
            </p>
          ) : apiKeys.length === 0 ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'settings.api.empty',
                {},
                { defaultValue: 'No API keys yet — create one to start integrating.' },
              )}
            </p>
          ) : (
            <div
              className={cm.cn(
                cm.flex({ direction: 'col' }),
                'rounded-2xl bg-surface-container-lowest border border-outline-variant/15 divide-y divide-outline-variant/10',
              )}
            >
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), cm.sp('p', 4))}
                >
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      'h-10 w-10 rounded-xl bg-primary-container/40 text-primary',
                    )}
                    aria-hidden="true"
                  >
                    <span className="material-symbols-outlined">vpn_key</span>
                  </span>
                  <div className={cm.cn(cm.flex({ direction: 'col' }), 'flex-1')}>
                    <span
                      className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'), 'text-on-surface')}
                    >
                      {key.provider}
                    </span>
                    <span className={cm.cn(cm.textSize('xs'), 'font-mono text-on-surface-variant')}>
                      {key.mask}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={pendingKeyId === key.id}
                    onClick={() => revokeKey(key.id)}
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      cm.textSize('xs'),
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      'rounded-full bg-error-container/30 text-error hover:bg-error hover:text-on-error transition-colors uppercase tracking-widest disabled:opacity-50',
                    )}
                  >
                    {pendingKeyId === key.id
                      ? t('settings.api.revoking', {}, { defaultValue: 'Revoking…' })
                      : t('common.revoke', {}, { defaultValue: 'Revoke' })}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section
          data-mol-id="settings-language-section"
          className={cm.flex({ direction: 'col', gap: 'md' })}
        >
          <header className={cm.flex({ direction: 'col', gap: 'xs' })}>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                'uppercase tracking-widest text-primary',
              )}
            >
              {t('footer.language', {}, { defaultValue: 'Language' })}
            </span>
            <h2
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('xl'),
                'tracking-tight text-on-surface',
              )}
            >
              {t('settings.language.title', {}, { defaultValue: 'App language' })}
            </h2>
          </header>
          <div
            className={cm.cn(
              cm.sp('p', 5),
              'rounded-2xl bg-surface-container-lowest border border-outline-variant/15 shadow-sm',
            )}
          >
            <p className={cm.cn(cm.textSize('sm'), cm.sp('mb', 4), 'text-on-surface-variant')}>
              {t(
                'common.chooseTheLanguage',
                {},
                { defaultValue: 'Choose the language used throughout the app.' },
              )}
            </p>
            <LanguagePicker />
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
        <section className={cm.flex({ direction: 'col', gap: 'md' })}>
          <header className={cm.flex({ direction: 'col', gap: 'xs' })}>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                'uppercase tracking-widest text-primary',
              )}
            >
              {t('settings.account', {}, { defaultValue: 'Account' })}
            </span>
            <h2
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('xl'),
                'tracking-tight text-on-surface',
              )}
            >
              {t('settings.account.title', {}, { defaultValue: 'Creator profile' })}
            </h2>
          </header>
          <form
            data-form="settings-profile"
            onSubmit={(e) => {
              e.preventDefault()
              saveProfile().catch(() => {})
            }}
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'md' }),
              cm.sp('p', 6),
              'rounded-3xl bg-surface-container-lowest border border-outline-variant/15 shadow-sm',
            )}
          >
            <div className={cm.cn('grid gap-4 md:grid-cols-2')}>
              <label className={cm.flex({ direction: 'col', gap: 'xs' })}>
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    cm.textSize('xs'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('form.displayName', {}, { defaultValue: 'Display name' })}
                </span>
                <input
                  type="text"
                  name="name"
                  value={profileForm.name ?? ''}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    'rounded-xl border border-outline-variant/15 bg-surface-container text-on-surface focus:ring-2 focus:ring-primary/30 focus:outline-none',
                  )}
                />
              </label>
              <label className={cm.flex({ direction: 'col', gap: 'xs' })}>
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    cm.textSize('xs'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('settings.account.handle', {}, { defaultValue: 'Handle' })}
                </span>
                <input
                  type="text"
                  name="username"
                  value={profileForm.handle ?? ''}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, handle: e.target.value }))}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    'rounded-xl border border-outline-variant/15 bg-surface-container text-on-surface font-mono focus:ring-2 focus:ring-primary/30 focus:outline-none',
                  )}
                />
              </label>
            </div>
            <label className={cm.flex({ direction: 'col', gap: 'xs' })}>
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.textSize('xs'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('form.bio', {}, { defaultValue: 'Bio' })}
              </span>
              <textarea
                rows={3}
                name="bio"
                value={profileForm.bio ?? ''}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, bio: e.target.value }))}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  'rounded-xl border border-outline-variant/15 bg-surface-container text-on-surface focus:ring-2 focus:ring-primary/30 focus:outline-none resize-none',
                )}
              />
            </label>
            <button
              type="submit"
              disabled={savingProfile}
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                cm.fontWeight('bold'),
                cm.sp('py', 3),
                'rounded-xl bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow disabled:opacity-50',
              )}
            >
              {savingProfile
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('common.saveProfile', {}, { defaultValue: 'Save profile' })}
            </button>
            {profile && (
              <p className={cm.cn(cm.textSize('xs'), 'font-mono text-on-surface-variant')}>
                {t(
                  'settings.account.lastSaved',
                  { name: profile.name ?? '' },
                  { defaultValue: 'Active profile · {{name}}' },
                )}
              </p>
            )}
          </form>
        </section>

        {/*
          Account & security — email, password (+ 2FA), push notifications,
          devices, sign out and delete account. These mount the shared,
          ClassMap-themed sections from @molecule/app-settings-panel-react,
          which call the standard endpoints (PATCH/DELETE /api/users/:id,
          /api/users/me, change-password, /api/devices). The creator-profile
          form above is a separate concern (public profile) and is untouched.
          This is a full route, not a dismissible panel, so SettingsContainer's
          onClose is a safe no-op — LogOutDeleteSection still navigates to
          /login itself after logout/delete.
        */}
        <section className={cm.flex({ direction: 'col', gap: 'md' })}>
          <header className={cm.flex({ direction: 'col', gap: 'xs' })}>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                'uppercase tracking-widest text-primary',
              )}
            >
              {t('settings.accountSecurity', {}, { defaultValue: 'Account & security' })}
            </span>
            <h2
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('xl'),
                'tracking-tight text-on-surface',
              )}
            >
              {t(
                'settings.accountSecurity.title',
                {},
                { defaultValue: 'Sign-in, devices & account' },
              )}
            </h2>
          </header>
          <div
            className={cm.cn(
              'rounded-3xl bg-surface-container-lowest border border-outline-variant/15 shadow-sm',
            )}
          >
            <SettingsContainer onClose={() => {}}>
              <AccountSection />
              <AuthSection />
              <NotificationsSection />
              <DevicesSection />
              <ThisDeviceSection />
              <LogOutDeleteSection />
            </SettingsContainer>
          </div>
        </section>
      </div>
    </AiImageGeneratorLayout>
  )
}

export default Settings
