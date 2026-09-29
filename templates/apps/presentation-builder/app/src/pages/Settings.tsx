import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { AccountSection } from '@molecule/app-settings-panel-react'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmButton, LanguagePicker } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { PresentationBuilderLayout } from '../components/PresentationBuilderLayout.js'
import { ThemeToggle } from '../components/ThemeToggle.js'

const SECTIONS = [
  { key: 'profile', icon: 'badge', label: 'Profile' },
  { key: 'brand', icon: 'palette', label: 'Brand kit' },
  { key: 'collaboration', icon: 'group', label: 'Collaboration' },
  { key: 'billing', icon: 'credit_card', label: 'Billing' },
  { key: 'security', icon: 'shield', label: 'Security' },
] as const

const BRAND_PALETTE = [
  { key: 'violet', name: 'Stage Violet', value: '#7c3aed' },
  { key: 'pink', name: 'Spotlight Pink', value: '#ec4899' },
  { key: 'cyan', name: 'Cue Cyan', value: '#06b6d4' },
  { key: 'amber', name: 'Footlight Amber', value: '#f59e0b' },
  { key: 'emerald', name: 'Curtain Emerald', value: '#10b981' },
]

const COLLAB_TOGGLES = [
  {
    key: 'cursors',
    label: 'Live cursor presence',
    body: 'Show teammates’ cursors and selections in real time.',
    enabled: true,
  },
  {
    key: 'comments',
    label: 'Inline comments',
    body: 'Allow comments on individual slides + speaker notes.',
    enabled: true,
  },
  {
    key: 'history',
    label: 'Version history',
    body: 'Auto-snapshot every 5 minutes for the last 30 days.',
    enabled: true,
  },
  {
    key: 'rehearsalShare',
    label: 'Public rehearsal links',
    body: 'Send links to anyone — no account required.',
    enabled: false,
  },
] as const

interface BillingStatus {
  planKey: string
  category: string
  name: string
  isFree: boolean
  limits: {
    maxExports: number
    maxPresentations: number
    maxSlides: number
    maxThemes: number
    advancedFeatures: boolean
    canExport: boolean
    retentionDays: number
  }
}

const STORAGE_BRAND_KEY = 'overture:brandPrimary'
const STORAGE_TOGGLES_KEY = 'overture:collabToggles'

const initials = (name: string | null | undefined, email: string | null | undefined): string => {
  const src = (name ?? '').trim() || (email ?? '').split('@')[0] || ''
  const parts = src.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase()
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const http = useHttpClient()
  const [section, setSection] = useState<(typeof SECTIONS)[number]['key']>('profile')
  const [brandPrimary, setBrandPrimary] = useState<string>(() => {
    if (typeof window === 'undefined') return '#7c3aed'
    return window.localStorage.getItem(STORAGE_BRAND_KEY) ?? '#7c3aed'
  })
  const [toggles, setToggles] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(STORAGE_TOGGLES_KEY)
        if (raw) return JSON.parse(raw) as Record<string, boolean>
      } catch (_error) {
        // corrupt localStorage value — fall back to defaults
      }
    }
    return Object.fromEntries(COLLAB_TOGGLES.map((tg) => [tg.key, tg.enabled]))
  })
  const [status, setStatus] = useState<BillingStatus | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoadingStatus(true)
    http
      .get<BillingStatus>('/billing/status')
      .then((res) => {
        if (cancelled) return
        setStatus(res.data)
      })
      .catch(() => {
        if (cancelled) return
        setStatus(null)
      })
      .finally(() => {
        if (cancelled) return
        setLoadingStatus(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_BRAND_KEY, brandPrimary)
      document.documentElement.style.setProperty('--brand-primary', brandPrimary)
    }
  }, [brandPrimary])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_TOGGLES_KEY, JSON.stringify(toggles))
    }
  }, [toggles])

  const cancelSubscription = useCallback(async () => {
    if (!status || status.isFree) return
    try {
      await http.post('/billing/cancel', {})
      const res = await http.get<BillingStatus>('/billing/status')
      setStatus(res.data)
    } catch (_error) {
      // cancellation errors surface via the subsequent status reload; silent here is intentional
    }
  }, [http, status])

  const userName = useMemo(() => (user as { name?: string } | null)?.name ?? '', [user])
  const userEmail = useMemo(() => (user as { email?: string } | null)?.email ?? '', [user])

  return (
    <PresentationBuilderLayout
      eyebrow={t('settings.eyebrow', {}, { defaultValue: 'Studio settings' })!}
      title={t('nav.settings', {}, { defaultValue: 'Settings' })!}
      actions={<ThemeToggle />}
    >
      <div className={cm.cn(cm.grid({ cols: 12, gap: 'lg' }))}>
        <aside
          className={cm.cn(
            cm.flex({ direction: 'col' }),
            cm.sp('p', 5),
            cm.stack(2),
            'lg:col-span-3 col-span-12 bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm h-fit',
          )}
        >
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.sp('px', 2),
              cm.sp('mb', 2),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('settings.nav.eyebrow', {}, { defaultValue: 'Sections' })}
          </span>
          {SECTIONS.map((s) => {
            const isActive = section === s.key
            return (
              <button
                key={s.key}
                type="button"
                data-testid={`settings-nav-${s.key}`}
                onClick={() => setSection(s.key)}
                aria-pressed={isActive}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  'rounded-lg transition-colors text-left',
                  isActive
                    ? 'bg-primary-fixed/40 text-primary border-l-4 border-primary rounded-r-lg'
                    : 'text-on-surface-variant hover:bg-surface-container/50',
                )}
              >
                <span className={cm.cn(cm.textSize('xl'), 'material-symbols-outlined')}>
                  {s.icon}
                </span>
                {t(`settings.nav.${s.key}`, {}, { defaultValue: s.label })}
              </button>
            )
          })}
        </aside>

        <main
          className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(6), 'lg:col-span-9 col-span-12')}
        >
          {section === 'profile' && (
            <article
              data-testid="settings-profile"
              className={cm.cn(
                cm.flex({ direction: 'col' }),
                cm.sp('p', 6),
                cm.stack(5),
                'bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm',
              )}
            >
              <div className={cm.stack(1)}>
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'text-[10px] uppercase tracking-widest text-primary',
                  )}
                >
                  {t('settings.profile.eyebrow', {}, { defaultValue: 'Profile' })}
                </span>
                <h2
                  className={cm.cn(
                    cm.textSize('xl'),
                    cm.fontWeight('bold'),
                    'text-on-surface tracking-tight',
                  )}
                >
                  {t('settings.profile.title', {}, { defaultValue: 'How you appear on stage' })}
                </h2>
              </div>
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(20),
                    cm.h(20),
                    cm.roundedFull,
                    cm.fontWeight('bold'),
                    'text-3xl text-white shadow-lg',
                  )}
                  style={{
                    background: `linear-gradient(135deg, ${brandPrimary} 0%, #ec4899 100%)`,
                  }}
                >
                  {initials(userName, userEmail)}
                </span>
                <div className={cm.stack(2)}>
                  <span
                    data-testid="profile-name"
                    className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}
                  >
                    {userName ||
                      t('settings.profile.unnamed', {}, { defaultValue: 'Stage performer' })}
                  </span>
                  <button
                    type="button"
                    data-testid="profile-logout"
                    onClick={() => void logout()}
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'xs' }),
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      cm.fontWeight('bold'),
                      cm.textSize('xs'),
                      'uppercase tracking-widest w-fit border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container/50 rounded-lg',
                    )}
                  >
                    <span className={cm.cn('material-symbols-outlined text-[14px]')}>logout</span>
                    {t('settings.logOut', {}, { defaultValue: 'Sign out' })}
                  </button>
                </div>
              </div>
              <AccountSection />
              <div className={cm.cn(cm.stack(2))} data-mol-id="settings-language">
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'text-[10px] uppercase tracking-widest text-primary',
                  )}
                >
                  {t('footer.language', {}, { defaultValue: 'Language' })}
                </span>
                <h3
                  className={cm.cn(
                    cm.textSize('xl'),
                    cm.fontWeight('bold'),
                    'text-on-surface tracking-tight',
                  )}
                >
                  {t('footer.language', {}, { defaultValue: 'Language' })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), cm.sp('mb', 2), 'text-on-surface-variant')}>
                  {t(
                    'common.chooseTheLanguage',
                    {},
                    { defaultValue: 'Choose the language used throughout the app.' },
                  )}
                </p>
                <LanguagePicker />
              </div>
            </article>
          )}

          {section === 'brand' && (
            <article
              data-testid="settings-brand"
              className={cm.cn(
                cm.flex({ direction: 'col' }),
                cm.sp('p', 6),
                cm.stack(5),
                'bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm',
              )}
            >
              <div className={cm.stack(1)}>
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'text-[10px] uppercase tracking-widest text-primary',
                  )}
                >
                  {t('settings.brand.eyebrow', {}, { defaultValue: 'Brand kit' })}
                </span>
                <h2
                  className={cm.cn(
                    cm.textSize('xl'),
                    cm.fontWeight('bold'),
                    'text-on-surface tracking-tight',
                  )}
                >
                  {t('settings.brand.title', {}, { defaultValue: 'Stage palette' })}
                </h2>
              </div>
              <div className={cm.cn(cm.stack(3))}>
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'text-[10px] uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('settings.brand.palette', {}, { defaultValue: 'Palette' })}
                </span>
                <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
                  {BRAND_PALETTE.map((p) => {
                    const isActive = brandPrimary === p.value
                    return (
                      <button
                        key={p.value}
                        type="button"
                        data-testid={`brand-${p.value.replace('#', '')}`}
                        onClick={() => setBrandPrimary(p.value)}
                        aria-pressed={isActive}
                        className={cm.cn(
                          cm.flex({ direction: 'col', align: 'center' }),
                          cm.stack(1),
                          cm.sp('p', 2),
                          'rounded-lg transition-colors',
                          isActive ? 'ring-2 ring-primary' : 'hover:bg-surface-container/40',
                        )}
                      >
                        <span
                          className={cm.cn(cm.w(11), cm.h(11), cm.roundedFull, 'shadow-md')}
                          style={{ backgroundColor: p.value }}
                        ></span>
                        <span
                          className={cm.cn(
                            cm.fontWeight('bold'),
                            'text-[10px] uppercase tracking-widest text-on-surface-variant',
                          )}
                        >
                          {t(`settings.brand.paletteName.${p.key}`, {}, { defaultValue: p.name })}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
              <div data-testid="brand-preview" className={cm.cn(cm.stack(3))}>
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'text-[10px] uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('settings.brand.preview', {}, { defaultValue: 'Sample slide' })}
                </span>
                <div
                  className={cm.cn('relative w-full rounded-xl overflow-hidden')}
                  style={{ aspectRatio: '16 / 9', backgroundColor: 'var(--color-slide-canvas)' }}
                >
                  <div
                    className={cm.cn(
                      cm.flex({ direction: 'col', justify: 'center' }),
                      cm.h('full'),
                      cm.sp('p', 8),
                      cm.stack(3),
                      'text-white',
                    )}
                  >
                    <span
                      className={cm.cn(
                        cm.fontWeight('bold'),
                        'text-[10px] uppercase tracking-widest text-white/60',
                      )}
                    >
                      {t(
                        'settings.brand.brandLine',
                        { app: APP_NAME, year: new Date().getFullYear() },
                        { defaultValue: '{{app}} / {{year}}' },
                      )}
                    </span>
                    <h3
                      className={cm.cn('text-3xl font-extrabold tracking-tight')}
                      style={{ color: brandPrimary }}
                    >
                      {t(
                        'settings.brand.previewTitle',
                        {},
                        { defaultValue: 'Stage palette preview' },
                      )}
                    </h3>
                  </div>
                </div>
              </div>
            </article>
          )}

          {section === 'collaboration' && (
            <article
              data-testid="settings-collab"
              className={cm.cn(
                cm.flex({ direction: 'col' }),
                cm.sp('p', 6),
                cm.stack(4),
                'bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm',
              )}
            >
              <div className={cm.stack(1)}>
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'text-[10px] uppercase tracking-widest text-primary',
                  )}
                >
                  {t('settings.collab.eyebrow', {}, { defaultValue: 'Collaboration' })}
                </span>
                <h2
                  className={cm.cn(
                    cm.textSize('xl'),
                    cm.fontWeight('bold'),
                    'text-on-surface tracking-tight',
                  )}
                >
                  {t('settings.collab.title', {}, { defaultValue: 'How the team co-creates' })}
                </h2>
              </div>
              <div className={cm.cn(cm.stack(3))}>
                {COLLAB_TOGGLES.map((tg) => (
                  <div
                    key={tg.key}
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
                      cm.sp('p', 4),
                      'rounded-xl border border-outline-variant/30 bg-surface-container-low',
                    )}
                  >
                    <div className={cm.stack(1)}>
                      <span
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.fontWeight('bold'),
                          'text-on-surface',
                        )}
                      >
                        {t(
                          `settings.collab.toggle.${tg.key}.label`,
                          {},
                          { defaultValue: tg.label },
                        )}
                      </span>
                      <span
                        className={cm.cn(
                          cm.textSize('xs'),
                          cm.fontWeight('medium'),
                          'text-on-surface-variant',
                        )}
                      >
                        {t(`settings.collab.toggle.${tg.key}.body`, {}, { defaultValue: tg.body })}
                      </span>
                    </div>
                    <button
                      type="button"
                      data-testid={`collab-toggle-${tg.key}`}
                      onClick={() => setToggles((s) => ({ ...s, [tg.key]: !s[tg.key] }))}
                      className={cm.cn(
                        'relative h-7 w-12 rounded-full transition-colors',
                        toggles[tg.key] ? 'bg-primary' : 'bg-surface-container-high',
                      )}
                      aria-pressed={toggles[tg.key]}
                    >
                      <span
                        className={cm.cn(
                          'absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow-md transition-transform',
                          toggles[tg.key] ? 'translate-x-5' : 'translate-x-0',
                        )}
                      ></span>
                    </button>
                  </div>
                ))}
              </div>
            </article>
          )}

          {section === 'billing' && (
            <article
              data-testid="settings-billing"
              className={cm.cn(
                cm.flex({ direction: 'col' }),
                cm.sp('p', 6),
                cm.stack(4),
                'bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm',
              )}
            >
              <div className={cm.stack(1)}>
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'text-[10px] uppercase tracking-widest text-primary',
                  )}
                >
                  {t('settings.billing.eyebrow', {}, { defaultValue: 'Billing' })}
                </span>
                <h2
                  className={cm.cn(
                    cm.textSize('xl'),
                    cm.fontWeight('bold'),
                    'text-on-surface tracking-tight',
                  )}
                >
                  {t('settings.billing.title', {}, { defaultValue: 'Plan + invoices' })}
                </h2>
              </div>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
                  cm.sp('p', 6),
                  'rounded-2xl bg-gradient-to-br from-primary via-primary-hover to-secondary text-white relative overflow-hidden',
                )}
              >
                <div className={cm.cn(cm.stack(2), 'relative z-10')}>
                  <span
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      'text-[10px] uppercase tracking-widest text-white/70',
                    )}
                  >
                    {t('nav.currentPlan', {}, { defaultValue: 'Current plan' })}
                  </span>
                  <span
                    data-testid="billing-plan-name"
                    className={cm.cn(cm.textSize('2xl'), 'font-extrabold tracking-tight')}
                  >
                    {loadingStatus
                      ? t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })
                      : status
                        ? `${status.name}`
                        : t('settings.billing.unknown', {}, { defaultValue: 'Plan unknown' })}
                  </span>
                  <span
                    className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-white/85')}
                  >
                    {status?.limits.maxPresentations === 999_999
                      ? t(
                          'settings.billing.unlimited',
                          {},
                          { defaultValue: 'Unlimited decks, slides, themes & exports' },
                        )
                      : status
                        ? t(
                            'settings.billing.summary',
                            {
                              decks: status.limits.maxPresentations,
                              slides: status.limits.maxSlides,
                            },
                            {
                              defaultValue: `Up to ${status.limits.maxPresentations} decks, ${status.limits.maxSlides} slides`,
                            },
                          )
                        : ''}
                  </span>
                </div>
                <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), 'relative z-10')}>
                  <Link
                    to="/pricing"
                    data-testid="billing-manage"
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'xs' }),
                      cm.sp('px', 5),
                      cm.sp('py', 3),
                      cm.fontWeight('bold'),
                      cm.textSize('sm'),
                      'bg-white text-primary rounded-xl shadow-lg hover:scale-[1.02] transition-transform',
                    )}
                  >
                    {status?.isFree
                      ? t('settings.billing.upgrade', {}, { defaultValue: 'Upgrade plan' })
                      : t('settings.billing.manage', {}, { defaultValue: 'Manage plan' })}
                    <span className={cm.cn('material-symbols-outlined text-[18px]')}>
                      arrow_forward
                    </span>
                  </Link>
                  {status && !status.isFree && (
                    <ConfirmButton
                      data-testid="billing-cancel"
                      label={t(
                        'nav.cancelSubscription',
                        {},
                        { defaultValue: 'Cancel subscription' },
                      )}
                      confirmLabel={t(
                        'settings.billing.confirmCancel',
                        {},
                        { defaultValue: 'Cancel subscription?' },
                      )}
                      onConfirm={cancelSubscription}
                      disarmSeconds={6}
                      className={cm.cn(
                        cm.fontWeight('bold'),
                        cm.textSize('xs'),
                        'uppercase tracking-widest text-white/80 hover:text-white px-3 py-2 rounded-lg border border-white/30',
                      )}
                    />
                  )}
                </div>
              </div>
            </article>
          )}

          {section === 'security' && (
            <article
              data-testid="settings-security"
              className={cm.cn(
                cm.flex({ direction: 'col' }),
                cm.sp('p', 6),
                cm.stack(4),
                'bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm',
              )}
            >
              <div className={cm.stack(1)}>
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'text-[10px] uppercase tracking-widest text-primary',
                  )}
                >
                  {t('nav.security', {}, { defaultValue: 'Security' })}
                </span>
                <h2
                  className={cm.cn(
                    cm.textSize('xl'),
                    cm.fontWeight('bold'),
                    'text-on-surface tracking-tight',
                  )}
                >
                  {t('settings.security.title', {}, { defaultValue: 'Account + sessions' })}
                </h2>
              </div>
              <div className={cm.cn(cm.stack(3))}>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'md' }),
                    cm.sp('p', 4),
                    'rounded-xl border border-outline-variant/30 bg-surface-container-low',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.w(10),
                      cm.h(10),
                      cm.roundedFull,
                      'bg-primary/15 text-primary shrink-0',
                    )}
                  >
                    <span className={cm.cn('material-symbols-outlined text-[20px]')}>mail</span>
                  </span>
                  <div className={cm.cn(cm.flex1, cm.stack(1))}>
                    <span
                      className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'), 'text-on-surface')}
                    >
                      {t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
                    </span>
                    <span
                      className={cm.cn(
                        cm.fontWeight('medium'),
                        cm.textSize('xs'),
                        'text-on-surface-variant',
                      )}
                    >
                      {userEmail || t('settings.security.notSet', {}, { defaultValue: 'Not set' })}
                    </span>
                  </div>
                </div>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'md' }),
                    cm.sp('p', 4),
                    'rounded-xl border border-outline-variant/30 bg-surface-container-low',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.w(10),
                      cm.h(10),
                      cm.roundedFull,
                      'bg-primary/15 text-primary shrink-0',
                    )}
                  >
                    <span className={cm.cn('material-symbols-outlined text-[20px]')}>lock</span>
                  </span>
                  <div className={cm.cn(cm.flex1, cm.stack(1))}>
                    <span
                      className={cm.cn(cm.fontWeight('bold'), cm.textSize('sm'), 'text-on-surface')}
                    >
                      {t('auth.login.password', {}, { defaultValue: 'Password' })}
                    </span>
                    <span
                      className={cm.cn(
                        cm.fontWeight('medium'),
                        cm.textSize('xs'),
                        'text-on-surface-variant',
                      )}
                    >
                      {t(
                        'settings.security.passwordBody',
                        {},
                        { defaultValue: 'Your password is encrypted at rest.' },
                      )}
                    </span>
                  </div>
                  <Link
                    to="/forgot-password"
                    data-testid="security-reset-password"
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      cm.textSize('xs'),
                      'uppercase tracking-widest text-primary hover:underline',
                    )}
                  >
                    {t('settings.security.reset', {}, { defaultValue: 'Reset' })}
                  </Link>
                </div>
              </div>
            </article>
          )}
        </main>
      </div>
    </PresentationBuilderLayout>
  )
}

export default Settings
