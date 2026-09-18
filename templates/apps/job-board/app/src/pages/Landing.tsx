import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { OpportunitiesHero } from '../components/OpportunitiesHero.js'

const FEATURES = [
  {
    key: 'search',
    icon: 'search',
    defaultTitle: 'Smart job search',
    defaultBody:
      'Filter by skills, salary, location, and team size. Faceted search powered by Meilisearch surfaces the right roles in milliseconds.',
  },
  {
    key: 'pipeline',
    icon: 'view_timeline',
    defaultTitle: 'Application pipeline',
    defaultBody:
      'Track every application from submitted → reviewing → interview → offer in a single timeline. Email + push when status moves.',
  },
  {
    key: 'company',
    icon: 'apartment',
    defaultTitle: 'Company profiles',
    defaultBody:
      'Real culture, benefits, employee count, and every open role — not just a logo and a tagline. Apply with confidence.',
  },
  {
    key: 'posting',
    icon: 'edit_note',
    defaultTitle: 'One-page posting',
    defaultBody:
      'Employers publish a role in under two minutes. Stripe-backed tiers unlock higher posting limits, data export, and longer history.',
  },
] as const

const SOCIAL_PROOF = [
  { defaultLabel: 'Acuity Talent · 38 hires last quarter', key: 'acuity' },
  { defaultLabel: 'Northwind People Ops', key: 'northwind' },
  { defaultLabel: 'Polaris Recruiting Studio', key: 'polaris' },
  { defaultLabel: 'Foundry Hiring Co.', key: 'foundry' },
] as const

// Mirrors api/src/tiers.ts (Free / Pro / Team) — keep names, prices, and
// limits in sync with getPricingTiers() and the /pricing page.
const PRICING = [
  {
    key: 'free',
    title: 'Free',
    price: '$0',
    period: '/mo',
    blurb: 'Search every public role, track applications, and post your first jobs.',
    bullets: [
      'Unlimited job search',
      'Track up to 5 applications',
      'Post up to 5 jobs',
      '90 days of history',
    ],
    cta: 'Start for free',
  },
  {
    key: 'pro',
    title: 'Pro',
    price: '$15',
    period: '/mo',
    blurb: 'For employers and busy seekers who need more room to work.',
    bullets: [
      'Up to 500 job postings',
      'Up to 500 tracked applications',
      'Advanced features + data export',
      '1 year of history',
    ],
    cta: 'Upgrade to Pro',
    featured: true,
  },
  {
    key: 'team',
    title: 'Team',
    price: '$49',
    period: '/mo',
    blurb: 'For talent teams that hire at scale.',
    bullets: [
      'Everything in Pro',
      'Unlimited jobs + applications',
      'Unlimited companies',
      'Unlimited history',
    ],
    cta: 'Choose Team',
  },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      {/* Top nav */}
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
            className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tighter text-primary')}
          >
            {APP_NAME}
          </Link>
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            <Link
              to="/jobs"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'text-on-surface-variant hover:text-on-surface transition-colors',
              )}
            >
              {t('landing.browseJobs', {}, { defaultValue: 'Browse jobs' })}
            </Link>
            <Link
              to="/pricing"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'text-on-surface-variant hover:text-on-surface transition-colors',
              )}
            >
              {t('landing.pricingEyebrow', {}, { defaultValue: 'Pricing' })}
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
                  {t('common.getStarted', {}, { defaultValue: 'Get started' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        {/* Hero — split panel */}
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
            className={cm.cn(
              'absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl',
            )}
            aria-hidden="true"
          />
          <div
            className={cm.cn(
              'absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-success/15 blur-3xl',
            )}
            aria-hidden="true"
          />
          <div className={cm.cn('relative grid gap-12 lg:grid-cols-2 lg:items-center')}>
            <div>
              <span
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  'inline-flex items-center gap-2 rounded-full bg-primary/10 text-on-primary-container text-[10px] font-black uppercase tracking-widest',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[14px]')} aria-hidden="true">
                  bolt
                </span>
                {t(
                  'landing.eyebrow',
                  { tagline: APP_TAGLINE },
                  { defaultValue: 'Where talent meets momentum' },
                )}
              </span>
              <h1
                className={cm.cn(
                  cm.sp('mt', 5),
                  'text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[0.95] tracking-tight text-on-surface',
                )}
              >
                {t(
                  'landing.heroTitle',
                  {},
                  { defaultValue: 'Find the role you\u2019ve been waiting for.' },
                )}
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
                  { app: APP_NAME },
                  {
                    defaultValue:
                      '{{app}} is a curated job board for seekers and employers. Real companies, real salaries, real signal — built so the next move is the right move.',
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
                  {t('landing.heroCta', {}, { defaultValue: 'Create free account' })}
                </Link>
                <Link
                  to="/jobs"
                  className={cm.cn(
                    cm.sp('px', 6),
                    cm.sp('py', 3),
                    cm.fontWeight('semibold'),
                    'rounded-xl border border-outline-variant/30 text-on-surface hover:bg-surface-container-low transition-colors',
                  )}
                >
                  {t('landing.heroSecondary', {}, { defaultValue: 'Browse open roles \u2192' })}
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
                  {
                    defaultValue:
                      'Free to start for seekers and employers — upgrade only when you need more.',
                  },
                )}
              </p>
            </div>

            {/* Sample card mirroring auth\u2019d Dashboard hero */}
            <div className={cm.cn('relative')}>
              <OpportunitiesHero
                totalRoles={1284}
                deltaRoles={47}
                eyebrow={t(
                  'landing.previewEyebrow',
                  {},
                  { defaultValue: 'Open roles \u00b7 today' },
                )}
                heading={t(
                  'landing.previewHeading',
                  {},
                  {
                    defaultValue:
                      'Senior, mid, junior \u2014 across product, design, and engineering.',
                  },
                )}
                caption={t(
                  'landing.previewCaption',
                  {},
                  {
                    defaultValue: 'A live snapshot of what\u2019s on the board right now.',
                  },
                )}
              />
            </div>
          </div>
        </section>

        {/* Social proof strip */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), cm.sp('py', 6))}>
          <p
            className={cm.cn(
              cm.textCenter,
              'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t(
              'landing.socialEyebrow',
              { app: APP_NAME },
              { defaultValue: 'Hiring teams that post on {{app}}' },
            )}
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

        {/* Features */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), cm.sp('py', 16))}>
          <div className={cm.cn(cm.maxW('2xl'), cm.mxAuto, cm.textCenter, cm.sp('mb', 12))}>
            <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-primary')}>
              {t('landing.featuresEyebrow', {}, { defaultValue: 'How it works' })}
            </p>
            <h2
              className={cm.cn(
                cm.sp('mt', 3),
                cm.textSize('4xl'),
                'font-extrabold tracking-tight text-on-surface',
              )}
            >
              {t(
                'landing.featuresHeading',
                {},
                { defaultValue: 'Built for both sides of the table.' },
              )}
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
                    'Seekers get clean search and a clear pipeline. Employers get fast posting and qualified applicants. Everyone wins.',
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
                    'inline-flex rounded-lg bg-primary/10 text-primary material-symbols-outlined text-[28px]',
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

        {/* Pricing */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), cm.sp('py', 16))}>
          <div className={cm.cn(cm.maxW('2xl'), cm.mxAuto, cm.textCenter, cm.sp('mb', 12))}>
            <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-primary')}>
              {t('landing.pricingEyebrow', {}, { defaultValue: 'Pricing' })}
            </p>
            <h2
              className={cm.cn(
                cm.sp('mt', 3),
                cm.textSize('4xl'),
                'font-extrabold tracking-tight text-on-surface',
              )}
            >
              {t(
                'landing.pricingHeading',
                {},
                { defaultValue: 'Simple plans for every team size.' },
              )}
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
                      ? 'bg-gradient-to-br from-primary to-secondary text-on-primary border-primary shadow-md shadow-primary/20'
                      : 'bg-surface-container-lowest border-outline-variant/20 hover:-translate-y-0.5 hover:shadow-md',
                  )}
                >
                  <p
                    className={cm.cn(
                      'text-[10px] font-black uppercase tracking-widest',
                      featured ? 'text-white/80' : 'text-on-surface-variant',
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
                          featured ? 'text-white/80' : 'text-on-surface-variant',
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
                      featured ? 'text-white/80' : 'text-on-surface-variant',
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
                            featured ? 'text-white/80' : 'text-primary',
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
                        ? 'bg-surface/95 text-primary hover:bg-surface'
                        : 'bg-primary/10 text-primary hover:bg-primary/15',
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
        <p>
          {t(
            'landing.copyright',
            { year: new Date().getFullYear(), app: APP_NAME },
            { defaultValue: '\u00a9 {{year}} {{app}}. Built with Molecule.' },
          )}
        </p>
      </footer>
    </div>
  )
}
