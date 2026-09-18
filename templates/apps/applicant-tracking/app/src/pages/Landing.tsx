import { Link } from 'react-router'

import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { SafeLink } from '../components/SafeLink.js'
import { loadContent } from '../config.js'

const FEATURES = [
  {
    key: 'pipeline',
    icon: 'view_kanban',
    defaultTitle: 'Visual hiring pipeline',
    defaultBody:
      'Drag candidates between stages — Sourced → Screening → Interview → Offer → Hired. Stage colors keep the board readable at a glance.',
  },
  {
    key: 'screening',
    icon: 'psychology',
    defaultTitle: 'AI-assisted screening',
    defaultBody:
      'Resumes parsed and scored against job requirements. Top matches surface in seconds — explainable breakdowns by criterion.',
  },
  {
    key: 'interviews',
    icon: 'event',
    defaultTitle: 'Interview scheduling',
    defaultBody:
      'Calendar invites, scorecards, and consolidated panel feedback in one thread. Time-zone aware. Conflict-checked.',
  },
  {
    key: 'fairness',
    icon: 'balance',
    defaultTitle: 'Fairness pulse',
    defaultBody:
      'Anonymous demographic tracking surfaces stage-by-stage equity gaps before they become patterns.',
  },
] as const

const STAGES = [
  { name: 'Sourced', count: 124, color: 'var(--color-stage-sourced)' },
  { name: 'Screening', count: 62, color: 'var(--color-stage-screening)' },
  { name: 'Interview', count: 28, color: 'var(--color-stage-interview)' },
  { name: 'Offer', count: 4, color: 'var(--color-stage-offer)' },
  { name: 'Hired', count: 2, color: 'var(--color-stage-hired)' },
]

const PRICING = [
  {
    key: 'free',
    title: 'Free',
    price: 'Free',
    blurb: 'For small teams hiring up to 5 roles at a time.',
    bullets: ['5 active jobs', 'Pipeline kanban', 'Basic AI screening', 'Email support'],
    cta: 'Start free',
  },
  {
    key: 'pro',
    title: 'Pro',
    price: '$15',
    period: '/seat / mo',
    blurb: 'For growing teams running multiple pipelines.',
    bullets: [
      'Up to 500 jobs and candidates',
      'AI screening with explainability',
      'Interview scorecards + panel feedback',
      'Fairness pulse analytics',
    ],
    cta: 'Start 30-day trial',
    featured: true,
  },
  {
    key: 'team',
    title: 'Team',
    price: '$49',
    period: '/seat / mo',
    blurb: 'For talent orgs that need governance + integrations.',
    bullets: [
      'Everything in Pro',
      'Unlimited jobs and candidates',
      'Unlimited data retention',
      'LinkedIn / job-board integrations',
    ],
    cta: 'Start with Team',
  },
] as const

const SOCIAL_PROOF = [
  { defaultLabel: 'Acuity Talent · 38 hires last quarter', key: 'acuity' },
  { defaultLabel: 'Northwind People Ops', key: 'northwind' },
  { defaultLabel: 'Polaris Recruiting Studio', key: 'polaris' },
  { defaultLabel: 'Foundry Hiring Co.', key: 'foundry' },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()
  const footerLinkClass = cm.cn(
    cm.textSize('sm'),
    cm.fontWeight('semibold'),
    'hover:text-primary transition-colors',
  )

  return (
    <div
      data-mol-id="page-landing"
      className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}
    >
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
          <SafeLink
            to="/"
            data-mol-id="landing-logo"
            className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tighter text-primary')}
          >
            {APP_NAME}
          </SafeLink>
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                data-mol-id="landing-dashboard"
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
                  data-mol-id="landing-signin"
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
                  data-mol-id="landing-signup"
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
        {/* Hero — split panel: copy + pipeline preview */}
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
                  'inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[14px]')} aria-hidden="true">
                  bolt
                </span>
                {t('landing.eyebrow', {}, { defaultValue: 'AI-assisted hiring · v2' })}
              </span>
              <h1
                className={cm.cn(
                  cm.sp('mt', 5),
                  'text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[0.95] tracking-tight text-on-surface',
                )}
              >
                {t(
                  'landing.heroTitle',
                  { tagline: APP_TAGLINE },
                  { defaultValue: 'Hire with clarity.' },
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
                  {},
                  {
                    defaultValue:
                      'A clean kanban pipeline, AI screening that explains itself, and fairness analytics by stage. Built for recruiters and hiring managers who want signal — not noise.',
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
                  data-mol-id="landing-cta-primary"
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
                  to="/pricing"
                  data-mol-id="landing-cta-secondary"
                  className={cm.cn(
                    cm.sp('px', 6),
                    cm.sp('py', 3),
                    cm.fontWeight('semibold'),
                    'rounded-xl border border-outline-variant/30 text-on-surface hover:bg-surface-container-low transition-colors',
                  )}
                >
                  {t('landing.heroSecondary', {}, { defaultValue: 'See pricing →' })}
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
                  { defaultValue: 'No credit card. Cancel anytime. SSO available on Pro.' },
                )}
              </p>
            </div>

            {/* Pipeline preview card — gradient hero (mirrors the auth'd PipelineFunnelHero) */}
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
                    {t('landing.previewLabel', {}, { defaultValue: 'Pipeline · Engineering' })}
                  </p>
                  <h3 className={cm.cn(cm.sp('mt', 1), 'text-2xl font-extrabold text-on-primary')}>
                    {t('landing.previewHeading', {}, { defaultValue: 'Senior Backend Engineer' })}
                  </h3>

                  <ul className={cm.cn(cm.sp('mt', 6), cm.stack(3))}>
                    {STAGES.map((s) => {
                      const max = STAGES[0].count
                      return (
                        <li key={s.name}>
                          <div
                            className={cm.cn(
                              cm.flex({ align: 'center', justify: 'between' }),
                              cm.textSize('sm'),
                              cm.sp('mb', 1),
                            )}
                          >
                            <span className={cm.cn('font-semibold text-on-primary')}>{s.name}</span>
                            <span className={cm.cn('font-bold tabular-nums text-on-primary')}>
                              {s.count}
                            </span>
                          </div>
                          <div className={cm.cn('h-2 overflow-hidden rounded-full bg-surface/15')}>
                            <div
                              className={cm.cn('h-full rounded-full')}
                              style={{
                                width: `${(s.count / max) * 100}%`,
                                backgroundColor: s.color,
                              }}
                            />
                          </div>
                        </li>
                      )
                    })}
                  </ul>

                  <div
                    className={cm.cn(
                      cm.sp('mt', 6),
                      cm.sp('p', 4),
                      'rounded-xl bg-surface/10 backdrop-blur-md border border-surface/10',
                    )}
                  >
                    <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                      <span
                        className={cm.cn(
                          'grid h-9 w-9 place-items-center rounded-full bg-surface/20 font-bold text-on-primary',
                        )}
                      >
                        M
                      </span>
                      <div className={cm.cn('min-w-0 flex-1')}>
                        <p className={cm.cn('font-semibold text-on-primary')}>Maya Chen</p>
                        <p className={cm.cn('text-[11px] text-on-primary/70')}>
                          Interview · 4d in stage · LinkedIn
                        </p>
                      </div>
                      <span
                        className={cm.cn(
                          cm.sp('px', 2),
                          cm.sp('py', 1),
                          'rounded-full bg-green-500/20 text-[10px] font-black uppercase tracking-widest text-on-primary',
                        )}
                      >
                        AI 92
                      </span>
                    </div>
                  </div>
                </div>
              </div>
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
            {t('landing.socialEyebrow', {}, { defaultValue: 'Used by hiring teams at' })}
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
              {t('landing.featuresHeading', {}, { defaultValue: 'Signal — not spreadsheets.' })}
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
                    'Four pillars that take a hiring loop from messy threads to one clean board.',
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
              {t('landing.pricingHeading', {}, { defaultValue: 'Plans for every team size.' })}
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
                            featured ? 'text-on-primary/80' : 'text-primary',
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
          cm.sp('px', 6),
          cm.sp('py', 8),
          cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
          cm.textSize('sm'),
          'border-t border-outline-variant/30 bg-surface-container-low text-on-surface-variant',
        )}
      >
        <nav
          className={cm.cn(
            cm.flex({ wrap: 'wrap', align: 'center', justify: 'center', gap: 'md' }),
          )}
        >
          <Link to="/about" data-mol-id="footer-about" className={footerLinkClass}>
            {t('nav.about', {}, { defaultValue: 'About' })}
          </Link>
          <LegalModalLinks
            linkClassName={footerLinkClass}
            appName={APP_NAME}
            loadContent={loadContent}
            privacyLabel={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
            termsLabel={t('nav.terms', {}, { defaultValue: 'Terms' })}
          />
        </nav>
        <p className={cm.textCenter}>
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
