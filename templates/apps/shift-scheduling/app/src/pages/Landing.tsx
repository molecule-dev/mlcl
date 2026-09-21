import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

const FEATURES = [
  {
    key: 'roster',
    icon: 'calendar_month',
    defaultTitle: 'Weekly rosters',
    defaultBody:
      'A staff-by-day grid for the whole week — shift blocks with role and time range, week navigation, and one-click publish when the schedule is ready.',
  },
  {
    key: 'swaps',
    icon: 'swap_horiz',
    defaultTitle: 'Swap & drop approvals',
    defaultBody:
      'Someone offers a shift to a teammate or asks to drop it. You approve in a click and the assignment moves atomically — the server refuses double-booking outright.',
  },
  {
    key: 'open',
    icon: 'bolt',
    defaultTitle: 'Open-shift claiming',
    defaultBody:
      'Unassigned published shifts become a marketplace your team can claim. Approve the first qualified claim; the rest are declined automatically.',
  },
  {
    key: 'availability',
    icon: 'event_available',
    defaultTitle: 'Availability that warns, not blocks',
    defaultBody:
      'Recurring weekly windows plus black-out dates per person. Scheduling outside them is allowed but flagged, so surprises surface before publish — not on the floor.',
  },
] as const

const COVERAGE = [
  { name: 'Mon', count: 5, color: 'var(--color-chart-cat-1)' },
  { name: 'Tue', count: 5, color: 'var(--color-chart-cat-2)' },
  { name: 'Wed', count: 4, color: 'var(--color-chart-cat-3)' },
  { name: 'Thu', count: 4, color: 'var(--color-chart-cat-4)' },
  { name: 'Fri', count: 5, color: 'var(--color-chart-cat-5)' },
  { name: 'Sat', count: 3, color: 'var(--color-chart-cat-1)' },
  { name: 'Sun', count: 2, color: 'var(--color-chart-cat-2)' },
]

// Mirrors the live tier ladder in api/src/tiers.ts (names, prices, limits).
const PRICING = [
  {
    key: 'free',
    title: 'Free',
    price: '$0',
    blurb: 'For a first crew finding its rhythm.',
    bullets: [
      '15 staff on the roster',
      '60 shifts per week',
      '90-day data retention',
      'Rosters, swaps, open shifts',
    ],
    cta: 'Start free',
  },
  {
    key: 'pro',
    title: 'Pro',
    price: '$19',
    period: '/mo · $190/yr',
    blurb: 'For busy locations that live and die by coverage.',
    bullets: [
      'Up to 200 staff & 750 weekly shifts',
      'Advanced features — timesheet exports',
      'Data export (CSV)',
      '1-year data retention',
    ],
    cta: 'Upgrade to Pro',
    featured: true,
  },
  {
    key: 'team',
    title: 'Team',
    price: '$59',
    period: '/mo · $590/yr',
    blurb: 'For multi-site operators who never want a limit.',
    bullets: [
      'Everything in Pro',
      'Unlimited staff & weekly shifts',
      'Unlimited data retention',
      'Data export (CSV)',
    ],
    cta: 'Go Team',
  },
] as const

const SOCIAL_PROOF = [
  { defaultLabel: 'Cedar & Bean Coffee · 4 locations', key: 'cedar' },
  { defaultLabel: 'Harborside Kitchen', key: 'harborside' },
  { defaultLabel: 'Northgate Books', key: 'northgate' },
  { defaultLabel: 'Riverside Cycle Co.', key: 'riverside' },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()
  const max = Math.max(...COVERAGE.map((h) => h.count), 1)

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <nav
        className={cm.cn(
          'sticky top-0 z-50 border-b border-outline-variant/30 bg-surface/80 backdrop-blur-md',
        )}
      >
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            cm.sp('py', 4),
            cm.flex({ align: 'center', justify: 'between' }),
          )}
        >
          <Link
            to="/"
            className={cm.cn(
              cm.textSize('xl'),
              'font-extrabold tracking-tighter text-primary-dark',
            )}
          >
            {APP_NAME}
          </Link>
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            <Link
              to="/pricing"
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'inline-flex items-center rounded-lg text-on-surface-variant hover:text-on-surface transition-colors',
              )}
            >
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </Link>
            <Link
              to="/about"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'hidden sm:inline text-on-surface-variant hover:text-on-surface transition-colors',
              )}
            >
              {t('nav.about', {}, { defaultValue: 'About' })}
            </Link>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                data-mol-id="nav-go-to-dashboard"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  'rounded-lg bg-primary text-on-primary shadow-md shadow-primary/20 hover:opacity-90 transition-opacity',
                )}
              >
                {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'text-on-surface-variant hover:text-on-surface transition-colors',
                  )}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 2),
                    cm.fontWeight('bold'),
                    cm.textSize('sm'),
                    'rounded-lg bg-primary text-on-primary shadow-md shadow-primary/20 hover:opacity-90 transition-opacity',
                  )}
                >
                  {t('common.startFreeTrial', {}, { defaultValue: 'Start free trial' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        <section
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            cm.sp('py', 16),
            'relative overflow-hidden lg:py-24',
          )}
        >
          <div
            aria-hidden="true"
            className={cm.cn(
              'absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl',
            )}
          />
          <div
            aria-hidden="true"
            className={cm.cn(
              'absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-secondary-fixed/15 blur-3xl',
            )}
          />
          <div className={cm.cn('relative grid gap-12 lg:grid-cols-2 lg:items-center')}>
            <div>
              <span
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  'inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary-dark text-[10px] font-black uppercase tracking-widest',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[14px]')} aria-hidden="true">
                  bolt
                </span>
                {t('landing.eyebrow', {}, { defaultValue: 'Scheduling — without the group chat' })}
              </span>
              <h1
                className={cm.cn(
                  cm.sp('mt', 5),
                  'text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[0.95] tracking-tight text-on-surface',
                )}
              >
                {t('landing.heroTitle', { tagline: APP_TAGLINE }, { defaultValue: '{{tagline}}.' })}
              </h1>
              <p
                className={cm.cn(
                  cm.sp('mt', 6),
                  cm.textSize('lg'),
                  cm.maxW('xl'),
                  'leading-relaxed font-medium text-on-surface-variant',
                )}
              >
                {t(
                  'landing.heroSubtitle',
                  { appName: APP_NAME },
                  {
                    defaultValue:
                      '{{appName}} is a shift-scheduling workspace for hourly teams. Build the week on a roster grid, publish it, and let swaps, drops, and open-shift claims flow through approvals — not through eleven text messages.',
                  },
                )}
              </p>
              <div
                className={cm.cn(
                  cm.sp('mt', 8),
                  cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }),
                )}
              >
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.sp('px', 6),
                    cm.sp('py', 3),
                    cm.fontWeight('bold'),
                    'rounded-xl bg-primary text-on-primary shadow-md shadow-primary/20 hover:opacity-90 transition-opacity',
                  )}
                >
                  {t('landing.heroCta', {}, { defaultValue: 'Start free for 30 days' })}
                </Link>
                <Link
                  to="/dashboard"
                  className={cm.cn(
                    cm.sp('px', 6),
                    cm.sp('py', 3),
                    cm.fontWeight('semibold'),
                    'rounded-xl border border-outline-variant/30 text-on-surface hover:bg-surface-container-low transition-colors',
                  )}
                >
                  {t('landing.heroSecondary', {}, { defaultValue: 'See live demo →' })}
                </Link>
              </div>
              <p
                className={cm.cn(
                  cm.sp('mt', 4),
                  cm.textSize('xs'),
                  'font-medium text-on-surface-variant',
                )}
              >
                {t(
                  'landing.heroProof',
                  {},
                  { defaultValue: 'No credit card. Cancel anytime. CSV payroll export on Pro.' },
                )}
              </p>
            </div>

            {/* Week coverage preview card — mirrors the Dashboard coverage strip */}
            <div className={cm.cn('relative')}>
              <div
                className={cm.cn(
                  cm.sp('p', 6),
                  'rounded-[2rem] bg-gradient-to-br from-primary to-primary-container shadow-md shadow-primary/20 relative overflow-hidden',
                )}
              >
                <div
                  className={cm.cn(
                    'absolute -right-16 -top-16 h-48 w-48 rounded-full bg-surface/10 blur-3xl',
                  )}
                  aria-hidden="true"
                />
                <div
                  className={cm.cn(
                    'absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-secondary-fixed/30 blur-3xl',
                  )}
                  aria-hidden="true"
                />
                <div className={cm.cn('relative z-10')}>
                  <p
                    className={cm.cn(
                      'text-[10px] font-black uppercase tracking-widest text-on-primary/70',
                    )}
                  >
                    {t(
                      'landing.previewLabel',
                      { appName: APP_NAME },
                      { defaultValue: 'This week at {{appName}} — preview' },
                    )}
                  </p>
                  <p
                    className={cm.cn(
                      cm.sp('mt', 1),
                      'text-6xl font-extrabold tabular-nums tracking-tighter text-on-primary',
                    )}
                  >
                    28
                  </p>
                  <div
                    className={cm.cn(
                      cm.sp('mt', 3),
                      'flex flex-wrap items-baseline gap-x-5 gap-y-1',
                    )}
                  >
                    <span
                      className={cm.cn(
                        'text-[10px] font-black uppercase tracking-widest text-on-primary/70',
                      )}
                    >
                      {t('landing.preview.shifts', {}, { defaultValue: '28 shifts staffed' })}
                    </span>
                    <span
                      className={cm.cn(
                        'text-[10px] font-black uppercase tracking-widest text-on-primary/70',
                      )}
                    >
                      {t('landing.preview.open', {}, { defaultValue: '3 open shifts' })}
                    </span>
                    <span
                      className={cm.cn(
                        'text-[10px] font-black uppercase tracking-widest text-on-primary/70',
                      )}
                    >
                      {t('landing.preview.pending', {}, { defaultValue: '2 approvals waiting' })}
                    </span>
                  </div>

                  <ul className={cm.cn(cm.sp('mt', 6), cm.stack(3))}>
                    {COVERAGE.map((d) => (
                      <li key={d.name}>
                        <div
                          className={cm.cn(
                            cm.flex({ align: 'center', justify: 'between' }),
                            cm.textSize('sm'),
                            cm.sp('mb', 1),
                          )}
                        >
                          <span className={cm.cn('font-semibold text-on-primary')}>{d.name}</span>
                          <span className={cm.cn('font-bold tabular-nums text-on-primary')}>
                            {d.count}
                          </span>
                        </div>
                        <div className={cm.cn('h-2 overflow-hidden rounded-full bg-surface/15')}>
                          <div
                            className={cm.cn('h-full rounded-full')}
                            style={{
                              width: `${(d.count / max) * 100}%`,
                              backgroundColor: d.color,
                            }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), cm.sp('py', 6))}>
          <p
            className={cm.cn(
              cm.textCenter,
              'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('landing.socialEyebrow', {}, { defaultValue: 'Keeping teams on shift at' })}
          </p>
          <div
            className={cm.cn(
              cm.sp('mt', 4),
              cm.flex({ align: 'center', justify: 'center', gap: 'lg', wrap: 'wrap' }),
            )}
          >
            {SOCIAL_PROOF.map((s) => (
              <span
                key={s.key}
                className={cm.cn(
                  cm.textSize('sm'),
                  'font-bold tracking-tight text-on-surface-variant',
                )}
              >
                {t(`landing.social.${s.key}`, {}, { defaultValue: s.defaultLabel })}
              </span>
            ))}
          </div>
        </section>

        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), cm.sp('py', 16))}>
          <div className={cm.cn(cm.maxW('2xl'), cm.mxAuto, cm.textCenter, cm.sp('mb', 12))}>
            <p
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest text-primary-dark',
              )}
            >
              {t('landing.featuresEyebrow', {}, { defaultValue: 'How it works' })}
            </p>
            <h2
              className={cm.cn(
                cm.sp('mt', 3),
                cm.textSize('4xl'),
                'font-extrabold tracking-tight text-on-surface',
              )}
            >
              {t('landing.featuresHeading', {}, { defaultValue: 'Build. Publish. Breathe.' })}
            </h2>
            <p
              className={cm.cn(
                cm.sp('mt', 3),
                cm.textSize('base'),
                'font-medium text-on-surface-variant',
              )}
            >
              {t(
                'landing.featuresSubheading',
                {},
                {
                  defaultValue:
                    'Four surfaces that take a manager from a blank week to a published roster — and keep it standing when life happens.',
                },
              )}
            </p>
          </div>
          <div className={cm.grid({ cols: 4, gap: 'md' })}>
            {FEATURES.map((f) => (
              <div
                key={f.key}
                className={cm.cn(
                  cm.sp('p', 6),
                  'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 hover:-translate-y-0.5 hover:shadow-md transition-all',
                )}
              >
                <span
                  className={cm.cn(
                    cm.sp('p', 2),
                    'inline-flex rounded-lg bg-primary/10 text-primary-dark material-symbols-outlined text-[28px]',
                  )}
                  aria-hidden="true"
                >
                  {f.icon}
                </span>
                <h3
                  className={cm.cn(
                    cm.sp('mt', 4),
                    cm.textSize('lg'),
                    'font-extrabold tracking-tight text-on-surface',
                  )}
                >
                  {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p
                  className={cm.cn(
                    cm.sp('mt', 2),
                    cm.textSize('sm'),
                    'leading-relaxed text-on-surface-variant',
                  )}
                >
                  {t(`landing.feature.${f.key}.body`, {}, { defaultValue: f.defaultBody })}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), cm.sp('py', 16))}>
          <div className={cm.cn(cm.maxW('2xl'), cm.mxAuto, cm.textCenter, cm.sp('mb', 12))}>
            <p
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest text-primary-dark',
              )}
            >
              {t('landing.pricingEyebrow', {}, { defaultValue: 'Pricing' })}
            </p>
            <h2
              className={cm.cn(
                cm.sp('mt', 3),
                cm.textSize('4xl'),
                'font-extrabold tracking-tight text-on-surface',
              )}
            >
              {t('landing.pricingHeading', {}, { defaultValue: 'Plans for every crew size.' })}
            </h2>
          </div>
          <div className={cm.grid({ cols: 3, gap: 'md' })}>
            {PRICING.map((p) => {
              const featured = 'featured' in p && p.featured
              return (
                <div
                  key={p.key}
                  className={cm.cn(
                    cm.sp('p', 6),
                    'rounded-2xl border transition-all',
                    featured
                      ? 'bg-gradient-to-br from-primary to-primary-container text-on-primary border-primary shadow-md shadow-primary/20'
                      : 'bg-surface-container-lowest border-outline-variant/20 hover:-translate-y-0.5 hover:shadow-md',
                  )}
                >
                  <p
                    className={cm.cn(
                      'text-[10px] font-black uppercase tracking-widest',
                      featured ? 'text-on-primary/80' : 'text-on-surface-variant',
                    )}
                  >
                    {t(`landing.plan.${p.key}.label`, {}, { defaultValue: p.title })}
                  </p>
                  <p className={cm.cn(cm.sp('mt', 3), 'flex items-baseline gap-2')}>
                    <span
                      className={cm.cn(
                        cm.textSize('4xl'),
                        'font-extrabold tracking-tight tabular-nums',
                        featured ? 'text-on-primary' : 'text-on-surface',
                      )}
                    >
                      {p.price}
                    </span>
                    {'period' in p && p.period ? (
                      <span
                        className={cm.cn(
                          cm.textSize('sm'),
                          'font-semibold',
                          featured ? 'text-on-primary/80' : 'text-on-surface-variant',
                        )}
                      >
                        {p.period}
                      </span>
                    ) : null}
                  </p>
                  <p
                    className={cm.cn(
                      cm.sp('mt', 2),
                      cm.textSize('sm'),
                      'font-medium',
                      featured ? 'text-on-primary/80' : 'text-on-surface-variant',
                    )}
                  >
                    {t(`landing.plan.${p.key}.blurb`, {}, { defaultValue: p.blurb })}
                  </p>
                  <ul className={cm.cn(cm.sp('mt', 6), cm.stack(3))}>
                    {p.bullets.map((b, i) => (
                      <li
                        key={i}
                        className={cm.cn(
                          cm.flex({ align: 'start', gap: 'sm' }),
                          cm.textSize('sm'),
                          featured ? 'text-on-primary' : 'text-on-surface',
                        )}
                      >
                        <span
                          className={cm.cn(
                            'material-symbols-outlined text-[18px] mt-0.5',
                            featured ? 'text-on-primary/80' : 'text-primary-dark',
                          )}
                          aria-hidden="true"
                        >
                          check_circle
                        </span>
                        <span>
                          {t(`landing.plan.${p.key}.bullet${i}`, {}, { defaultValue: b })}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/signup"
                    className={cm.cn(
                      cm.sp('mt', 8),
                      cm.sp('py', 3),
                      cm.sp('px', 4),
                      cm.fontWeight('bold'),
                      cm.textSize('sm'),
                      cm.textCenter,
                      'block rounded-xl transition-all',
                      featured
                        ? 'bg-surface/95 text-primary-dark hover:bg-surface'
                        : 'bg-primary/10 text-primary-dark hover:bg-primary/15',
                    )}
                  >
                    {t(`landing.plan.${p.key}.cta`, {}, { defaultValue: p.cta })}
                  </Link>
                </div>
              )
            })}
          </div>
        </section>
      </main>

      <footer
        className={cm.cn(
          cm.sp('py', 8),
          cm.textCenter,
          cm.textSize('sm'),
          'border-t border-outline-variant/30 bg-surface-container-low text-on-surface-variant',
        )}
      >
        <nav
          className={cm.cn(
            cm.sp('mb', 3),
            cm.flex({ align: 'center', justify: 'center', gap: 'lg', wrap: 'wrap' }),
          )}
          aria-label={t('landing.footerNavLabel', {}, { defaultValue: 'Footer' })}
        >
          {(
            [
              ['/pricing', 'nav.pricing', 'Pricing'],
              ['/about', 'nav.about', 'About'],
              ['/terms', 'nav.terms', 'Terms'],
              ['/privacy', 'nav.privacy', 'Privacy'],
            ] as const
          ).map(([to, key, label]) => (
            <Link
              key={to}
              to={to}
              className={cm.cn(
                cm.sp('px', 2),
                cm.sp('py', 2),
                'inline-flex items-center rounded-lg hover:text-on-surface transition-colors',
              )}
            >
              {t(key, {}, { defaultValue: label })}
            </Link>
          ))}
        </nav>
        <p>
          {t(
            'landing.copyright',
            { year: new Date().getFullYear(), app: APP_NAME },
            { defaultValue: '© {{year}} {{app}}. Built with Molecule.' },
          )}
        </p>
      </footer>
    </div>
  )
}
