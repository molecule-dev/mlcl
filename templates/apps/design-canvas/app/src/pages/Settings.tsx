import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker } from '@molecule/app-ui-react'

import { themeProvider } from '../bonds/index.js'
import { APP_NAME } from '../branding.js'
import { DesignCanvasLayout } from '../components/DesignCanvasLayout.js'

const SECTIONS = [
  { id: 'profile', label: 'Profile', icon: 'badge' },
  { id: 'workspace', label: 'Workspace', icon: 'corporate_fare' },
  { id: 'appearance', label: 'Appearance', icon: 'palette' },
  { id: 'language', label: 'Language', icon: 'translate' },
  { id: 'notifications', label: 'Notifications', icon: 'notifications' },
  { id: 'integrations', label: 'Integrations', icon: 'extension' },
  { id: 'billing', label: 'Billing', icon: 'credit_card' },
  { id: 'security', label: 'Security', icon: 'shield' },
] as const

type SectionId = (typeof SECTIONS)[number]['id']

interface ProfilePrefs {
  displayName?: string
  bio?: string
  location?: string
  pronouns?: string
  publicUrl?: string
  cursorColor?: string
  theme?: 'light' | 'dark' | 'system'
  notifyMentions?: boolean
  notifyInvites?: boolean
  notifyComments?: boolean
  notifyDigest?: boolean
}

interface ProfileResponse {
  id: string
  name: string | null
  email: string | null
  username: string | null
  planKey: string
  prefs: ProfilePrefs
}

/**
 * Shape returned by GET /api/billing/tiers (createBillingRouter →
 * `{ data: getPricingTiers() }`): each tier carries a `key` (NOT `planKey`)
 * and display-string prices (`price: '$15/mo'`), with `stripePriceId` null on
 * unconfigured tiers.
 */
interface PriceTier {
  key: string
  name: string
  prices: Array<{
    period?: string
    price?: string
    stripePriceId?: string | null
  }>
}

interface BillingStatus {
  planKey: string
  category: string
  name: string
  limits: Record<string, unknown>
  isFree: boolean
}

const NOTIFICATION_PREFS: Array<{
  key: 'notifyMentions' | 'notifyInvites' | 'notifyComments' | 'notifyDigest'
  label: string
  body: string
}> = [
  {
    key: 'notifyMentions',
    label: 'Mentions on canvas',
    body: 'In-app + emailed when someone @-mentions you.',
  },
  {
    key: 'notifyInvites',
    label: 'Workspace invitations',
    body: 'Notified when invited to a project or team.',
  },
  {
    key: 'notifyComments',
    label: 'Comments on shared projects',
    body: 'Threaded replies on canvases you collaborate on.',
  },
  {
    key: 'notifyDigest',
    label: 'Weekly designer digest',
    body: 'A Monday digest of activity across your workspace.',
  },
]

/**
 * Apply a theme choice through the app's theme bond so the CSS-variable
 * palette, `data-mol-mode` attribute, persistence, and the header
 * ThemeToggle all stay in sync. 'system' resolves via prefers-color-scheme.
 */
function applyTheme(theme: 'light' | 'dark' | 'system') {
  const prefersDark =
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false
  const resolved = theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme
  themeProvider.setTheme(resolved)
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [active, setActive] = useState<SectionId>('profile')

  const [profile, setProfile] = useState<ProfileResponse | null>(null)
  const [draft, setDraft] = useState<ProfilePrefs & { name?: string }>({})
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileStatus, setProfileStatus] = useState<string | null>(null)

  const [savingTheme, setSavingTheme] = useState<string | null>(null)
  const [themeStatus, setThemeStatus] = useState<string | null>(null)

  const [savingNotifs, setSavingNotifs] = useState<string | null>(null)
  const [notifStatus, setNotifStatus] = useState<string | null>(null)

  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null)
  const [tiers, setTiers] = useState<PriceTier[]>([])
  const [billingError, setBillingError] = useState<string | null>(null)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/profile/me')
      .then((resp) => {
        if (cancelled) return
        const prof = ((resp as { data?: unknown }).data ?? null) as ProfileResponse | null
        if (prof) {
          setProfile(prof)
          setDraft({
            name: prof.name ?? '',
            displayName: prof.prefs?.displayName ?? '',
            bio: prof.prefs?.bio ?? '',
            location: prof.prefs?.location ?? '',
            pronouns: prof.prefs?.pronouns ?? '',
            publicUrl: prof.prefs?.publicUrl ?? '',
            cursorColor: prof.prefs?.cursorColor ?? '#7c3aed',
            theme: prof.prefs?.theme ?? 'system',
            notifyMentions: prof.prefs?.notifyMentions ?? true,
            notifyInvites: prof.prefs?.notifyInvites ?? true,
            notifyComments: prof.prefs?.notifyComments ?? true,
            notifyDigest: prof.prefs?.notifyDigest ?? false,
          })
          if (prof.prefs?.theme) applyTheme(prof.prefs.theme)
        }
      })
      .catch(() => {
        if (!cancelled) setProfile(null)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  useEffect(() => {
    if (active !== 'billing') return
    let cancelled = false
    setBillingError(null)
    Promise.all([http.get('/api/billing/status'), http.get('/api/billing/tiers')])
      .then(([statusResp, tiersResp]) => {
        if (cancelled) return
        const s = ((statusResp as { data?: unknown }).data ?? null) as BillingStatus | null
        const tr = ((tiersResp as { data?: { data?: PriceTier[] } }).data?.data ??
          []) as PriceTier[]
        setBillingStatus(s)
        setTiers(tr)
      })
      .catch((err) => {
        if (cancelled) return
        setBillingError((err as { message?: string }).message ?? 'Could not load billing')
      })
    return () => {
      cancelled = true
    }
  }, [active, http])

  const saveProfile = async () => {
    setSavingProfile(true)
    setProfileStatus(null)
    try {
      const resp = await http.patch('/api/profile/me', {
        name: draft.name || undefined,
        prefs: {
          displayName: draft.displayName,
          bio: draft.bio,
          location: draft.location,
          pronouns: draft.pronouns,
          publicUrl: draft.publicUrl,
          cursorColor: draft.cursorColor,
        },
      })
      const updated = ((resp as { data?: unknown }).data ?? null) as ProfileResponse | null
      if (updated) setProfile(updated)
      setProfileStatus(
        t(
          'common.savedAt',
          { time: new Date().toLocaleTimeString() },
          {
            defaultValue: 'Saved at {{time}}',
          },
        )!,
      )
    } catch (_error) {
      // save failure shown to user via setProfileStatus below
      setProfileStatus(t('settings.saveFailed', {}, { defaultValue: 'Could not save changes' })!)
    } finally {
      setSavingProfile(false)
    }
  }

  const saveTheme = async (theme: 'light' | 'dark' | 'system') => {
    setSavingTheme(theme)
    setThemeStatus(null)
    setDraft((d) => ({ ...d, theme }))
    applyTheme(theme)
    try {
      await http.patch('/api/profile/me', { prefs: { theme } })
      setThemeStatus(
        t('settings.themeSaved', { theme }, { defaultValue: 'Theme set to {{theme}}' })!,
      )
    } catch (_error) {
      // theme save failure shown to user via setThemeStatus below
      setThemeStatus(t('settings.saveFailed', {}, { defaultValue: 'Could not save theme' })!)
    } finally {
      setSavingTheme(null)
    }
  }

  const toggleNotif = async (key: keyof ProfilePrefs, value: boolean) => {
    setSavingNotifs(String(key))
    setNotifStatus(null)
    setDraft((d) => ({ ...d, [key]: value }))
    try {
      await http.patch('/api/profile/me', { prefs: { [key]: value } })
      setNotifStatus(t('settings.notifSaved', {}, { defaultValue: 'Preference updated' })!)
    } catch (_error) {
      // notification preference save failure: revert optimistic toggle and show error
      setDraft((d) => ({ ...d, [key]: !value }))
      setNotifStatus(t('settings.saveFailed', {}, { defaultValue: 'Could not save change' })!)
    } finally {
      setSavingNotifs(null)
    }
  }

  const startCheckout = async (priceId: string) => {
    setCheckoutLoading(priceId)
    setBillingError(null)
    try {
      const resp = await http.post('/api/billing/checkout', { priceId })
      const data = (resp as { data?: { checkoutUrl?: string; updated?: boolean } }).data ?? {}
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else if (data.updated) {
        const status = await http.get('/api/billing/status')
        const s = ((status as { data?: unknown }).data ?? null) as BillingStatus | null
        setBillingStatus(s)
      }
    } catch (err) {
      setBillingError(((err as { message?: string }).message ?? null) || 'Could not start checkout')
    } finally {
      setCheckoutLoading(null)
    }
  }

  const cancelPlan = async () => {
    setCancelling(true)
    setBillingError(null)
    try {
      await http.post('/api/billing/cancel', {})
      const status = await http.get('/api/billing/status')
      const s = ((status as { data?: unknown }).data ?? null) as BillingStatus | null
      setBillingStatus(s)
    } catch (err) {
      setBillingError(((err as { message?: string }).message ?? null) || 'Could not cancel')
    } finally {
      setCancelling(false)
    }
  }

  const themeChoices = useMemo(
    () =>
      [
        { id: 'light', label: 'Light', preview: '#ffffff', dotGrid: '#e9e5f5' },
        { id: 'dark', label: 'Dark', preview: '#18122b', dotGrid: '#362c52' },
        { id: 'system', label: 'Match system', preview: '#7c3aed', dotGrid: '#ec4899' },
      ] as const,
    [],
  )

  return (
    <DesignCanvasLayout
      eyebrow={t('settings.eyebrow', {}, { defaultValue: 'Account preferences' })}
      title={t('nav.settings', {}, { defaultValue: 'Settings' })}
    >
      <div className={cm.cn(cm.grid({ cols: 12, gap: 'lg' }))}>
        <aside className={cm.cn('col-span-3', cm.stack(1), 'sticky top-24 self-start')}>
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActive(s.id)}
              data-mol-id={`settings-section-${s.id}`}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('px', 4),
                cm.sp('py', 3),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                active === s.id
                  ? 'bg-primary-fixed/40 text-on-primary-container border-l-4 border-primary rounded-r-lg'
                  : 'text-on-surface-variant hover:bg-surface-container/60 rounded-lg transition-colors',
              )}
            >
              <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>
                {s.icon}
              </span>
              {t(`settings.section.${s.id}`, {}, { defaultValue: s.label })}
            </button>
          ))}
        </aside>

        <section className={cm.cn('col-span-9', cm.stack(6))} data-mol-id="settings-content">
          {active === 'profile' && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                void saveProfile()
              }}
              data-mol-id="settings-profile-form"
              className={cm.cn(
                cm.sp('p', 6),
                cm.stack(4),
                'bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm',
              )}
            >
              <h2 className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight')}>
                {t('settings.profile.title', {}, { defaultValue: 'Public designer card' })}
              </h2>

              {[
                { key: 'displayName', label: 'Display name', placeholder: 'Mara Vieira' },
                { key: 'pronouns', label: 'Pronouns', placeholder: 'she/her' },
                { key: 'bio', label: 'Public bio', placeholder: 'Senior product designer.' },
                { key: 'location', label: 'Location', placeholder: 'Lisbon · GMT+1' },
                { key: 'publicUrl', label: 'Public URL', placeholder: 'mara.studio' },
              ].map((f) => (
                <label key={f.key} className={cm.cn(cm.stack(2))}>
                  <span
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      cm.textSize('xs'),
                      'uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t(`settings.profile.${f.key}`, {}, { defaultValue: f.label })}
                  </span>
                  <input
                    type="text"
                    name={f.key}
                    data-mol-id={`settings-profile-${f.key}`}
                    placeholder={f.placeholder}
                    value={((draft as Record<string, unknown>)[f.key] as string) ?? ''}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        [f.key]: e.target.value,
                        ...(f.key === 'displayName' ? { name: e.target.value } : {}),
                      }))
                    }
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      cm.fontWeight('medium'),
                      cm.textSize('sm'),
                      'bg-surface-container-low rounded-xl border border-outline-variant/40 focus:bg-surface focus:ring-2 focus:ring-primary/30 transition-all outline-none',
                    )}
                  />
                </label>
              ))}

              <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                <button
                  type="submit"
                  disabled={savingProfile}
                  data-mol-id="settings-profile-save"
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 3),
                    cm.fontWeight('bold'),
                    cm.textSize('sm'),
                    cm.flex({ align: 'center', gap: 'xs' }),
                    'w-fit bg-gradient-to-br from-primary to-secondary text-white rounded-xl shadow-md shadow-primary/30 hover:scale-[1.02] transition-transform disabled:opacity-60',
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-[18px]')}>save</span>
                  {savingProfile
                    ? t('settings.saving', {}, { defaultValue: 'Saving…' })
                    : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
                </button>
                {profileStatus && (
                  <span
                    data-mol-id="settings-profile-status"
                    className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
                  >
                    {profileStatus}
                  </span>
                )}
              </div>
            </form>
          )}

          {active === 'appearance' && (
            <div
              className={cm.cn(
                cm.sp('p', 6),
                cm.stack(4),
                'bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm',
              )}
              data-mol-id="settings-appearance"
            >
              <h2 className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight')}>
                {t('settings.appearance.title', {}, { defaultValue: 'Theme & canvas' })}
              </h2>
              <div className={cm.cn(cm.grid({ cols: 3, gap: 'lg' }))}>
                {themeChoices.map((opt) => {
                  const selected = (draft.theme ?? 'system') === opt.id
                  const isSaving = savingTheme === opt.id
                  return (
                    <button
                      onClick={() => void saveTheme(opt.id)}
                      key={opt.id}
                      type="button"
                      data-mol-id={`settings-theme-${opt.id}`}
                      disabled={isSaving}
                      className={cm.cn(
                        cm.sp('p', 5),
                        cm.stack(3),
                        cm.flex({ align: 'center' }),
                        'rounded-2xl border-2 transition-colors',
                        selected
                          ? 'border-primary bg-primary-fixed/20'
                          : 'border-outline-variant/30 hover:border-primary',
                      )}
                    >
                      <div
                        className={cm.cn(cm.w('full'), cm.h(20), 'rounded-xl')}
                        style={{
                          backgroundColor: opt.preview,
                          backgroundImage: `radial-gradient(circle, ${opt.dotGrid} 1px, transparent 1px)`,
                          backgroundSize: '12px 12px',
                        }}
                      ></div>
                      <span className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'))}>
                        {t(`settings.appearance.${opt.id}`, {}, { defaultValue: opt.label })}
                      </span>
                      {selected && (
                        <span
                          className={cm.cn(
                            cm.textSize('xs'),
                            cm.fontWeight('bold'),
                            'text-primary uppercase tracking-widest',
                          )}
                        >
                          {t('settings.appearance.active', {}, { defaultValue: 'Active' })}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
              {themeStatus && (
                <p
                  data-mol-id="settings-theme-status"
                  className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
                >
                  {themeStatus}
                </p>
              )}
            </div>
          )}

          {active === 'language' && (
            <div
              className={cm.cn(
                cm.sp('p', 6),
                cm.stack(4),
                'bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm',
              )}
              data-mol-id="settings-language"
            >
              <h2 className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight')}>
                {t('footer.language', {}, { defaultValue: 'Language' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'common.chooseTheLanguage',
                  {},
                  { defaultValue: 'Choose the language used throughout the app.' },
                )}
              </p>
              <LanguagePicker />
            </div>
          )}

          {active === 'notifications' && (
            <div
              className={cm.cn(
                cm.sp('p', 6),
                cm.stack(3),
                'bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm',
              )}
              data-mol-id="settings-notifications"
            >
              <h2 className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight')}>
                {t('nav.notificationPreferences', {}, { defaultValue: 'Notification preferences' })}
              </h2>
              {NOTIFICATION_PREFS.map((p) => {
                const checked = ((draft as Record<string, unknown>)[p.key] as boolean) ?? false
                return (
                  <label
                    key={p.key}
                    data-mol-id={`settings-notif-${p.key}`}
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between' }),
                      cm.sp('py', 3),
                      'border-b border-outline-variant/20',
                    )}
                  >
                    <span className={cm.stack(1)}>
                      <span
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.fontWeight('semibold'),
                          'text-on-surface',
                        )}
                      >
                        {t(`settings.pref.${p.key}.label`, {}, { defaultValue: p.label })}
                      </span>
                      <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {t(`settings.pref.${p.key}.body`, {}, { defaultValue: p.body })}
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={savingNotifs === p.key}
                      onChange={(e) => void toggleNotif(p.key, e.target.checked)}
                      className={cm.cn(cm.w(5), cm.h(5), 'accent-primary')}
                    />
                  </label>
                )
              })}
              {notifStatus && (
                <p
                  data-mol-id="settings-notif-status"
                  className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
                >
                  {notifStatus}
                </p>
              )}
            </div>
          )}

          {active === 'billing' && (
            <div
              className={cm.cn(
                cm.sp('p', 6),
                cm.stack(5),
                'bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm',
              )}
              data-mol-id="settings-billing"
            >
              <h2 className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight')}>
                {t('settings.billing.title', {}, { defaultValue: 'Billing & plan' })}
              </h2>
              {billingError && (
                <p
                  data-mol-id="settings-billing-error"
                  className={cm.cn(cm.textSize('sm'), 'text-error')}
                >
                  {billingError}
                </p>
              )}
              {billingStatus && (
                <article
                  data-mol-id="settings-billing-status"
                  className={cm.cn(
                    cm.sp('p', 4),
                    cm.stack(2),
                    'rounded-xl bg-surface-container-low border border-outline-variant/40',
                  )}
                >
                  <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), 'uppercase')}>
                    {t('nav.currentPlan', {}, { defaultValue: 'Current plan' })}
                  </span>
                  <span className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
                    {billingStatus.name} ({billingStatus.planKey})
                  </span>
                </article>
              )}
              <div className={cm.cn(cm.grid({ cols: 3, gap: 'md' }))}>
                {tiers.map((tier) => (
                  <article
                    key={tier.key}
                    data-mol-id={`settings-billing-tier-${tier.key}`}
                    className={cm.cn(
                      cm.sp('p', 5),
                      cm.stack(3),
                      'rounded-2xl border border-outline-variant/30 bg-surface-container-low',
                    )}
                  >
                    <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>{tier.name}</h3>
                    {tier.prices.map((price, idx) => (
                      <div key={`${tier.key}-${idx}`} className={cm.cn(cm.stack(2))}>
                        <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                          {price.price ?? '—'}
                        </span>
                        {price.stripePriceId && (
                          <button
                            type="button"
                            onClick={() => void startCheckout(price.stripePriceId!)}
                            disabled={checkoutLoading === price.stripePriceId}
                            data-mol-id={`settings-billing-checkout-${tier.key}-${idx}`}
                            className={cm.cn(
                              cm.sp('px', 3),
                              cm.sp('py', 2),
                              cm.fontWeight('bold'),
                              cm.textSize('xs'),
                              'rounded-lg bg-primary text-white hover:bg-primary-hover disabled:opacity-60',
                            )}
                          >
                            {checkoutLoading === price.stripePriceId
                              ? t('common.startingEllipsis', {}, { defaultValue: 'Starting…' })
                              : billingStatus?.planKey === tier.key
                                ? t('nav.currentPlan', {}, { defaultValue: 'Current plan' })
                                : t(
                                    'settings.billing.upgradeCta',
                                    {},
                                    { defaultValue: 'Switch plan' },
                                  )}
                          </button>
                        )}
                      </div>
                    ))}
                  </article>
                ))}
              </div>
              {billingStatus && !billingStatus.isFree && (
                <button
                  type="button"
                  onClick={() => void cancelPlan()}
                  disabled={cancelling}
                  data-mol-id="settings-billing-cancel"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.fontWeight('bold'),
                    'rounded-lg w-fit bg-surface-container text-on-surface hover:bg-surface-container-high disabled:opacity-60',
                  )}
                >
                  {cancelling
                    ? t('common.cancellingEllipsis', {}, { defaultValue: 'Cancelling…' })
                    : t('nav.cancelSubscription', {}, { defaultValue: 'Cancel subscription' })}
                </button>
              )}
            </div>
          )}

          {active === 'integrations' && (
            <div
              className={cm.cn(
                cm.sp('p', 6),
                cm.stack(3),
                'bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm',
              )}
              data-mol-id="settings-integrations"
            >
              <h2 className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight')}>
                {t('settings.integrations.title', {}, { defaultValue: 'Connected apps' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'settings.integrations.body',
                  { appName: APP_NAME },
                  {
                    defaultValue:
                      'Hook {{appName}} into the tools your team already uses. Connect from your account dashboard once these are turned on.',
                  },
                )}
              </p>
            </div>
          )}

          {(active === 'workspace' || active === 'security') && (
            <div
              className={cm.cn(
                cm.sp('p', 8),
                cm.textCenter,
                cm.stack(3),
                'bg-surface-container-lowest rounded-2xl border border-dashed border-outline-variant/40 text-on-surface-variant',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[40px] text-primary')}>
                {SECTIONS.find((s) => s.id === active)?.icon}
              </span>
              <p className={cm.cn(cm.fontWeight('semibold'))}>
                {t(
                  `settings.${active}.body`,
                  { appName: APP_NAME },
                  {
                    defaultValue:
                      active === 'workspace'
                        ? 'Workspace controls (SSO, audit log, seats) live in the {{appName}} admin console.'
                        : 'Security controls (2FA, sessions, app passwords) ship in the next sweep.',
                  },
                )}
              </p>
            </div>
          )}
        </section>
      </div>
      <span data-mol-id="settings-profile-id" hidden>
        {profile?.id ?? ''}
      </span>
    </DesignCanvasLayout>
  )
}

export default Settings
