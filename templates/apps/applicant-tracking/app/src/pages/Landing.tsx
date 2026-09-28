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

/* Decorative kanban columns for the hero board graphic (mirrors the Stitch
   design: two populated columns + one faded). Avatars are initials — no
   external images so the page renders offline. */
const BOARD_COLUMNS = [
  {
    key: 'sourced',
    name: 'Sourced',
    dotColor: 'var(--color-stage-sourced)',
    faded: false,
    candidate: {
      initials: 'ER',
      nameKey: 'landing.board.candidate1Name',
      defaultName: 'Elena R.',
      roleKey: 'landing.board.candidate1Role',
      defaultRole: 'UX Designer',
      score: '92%',
      scoreClass: 'text-tertiary',
    },
  },
  {
    key: 'screening',
    name: 'Screening',
    dotColor: 'var(--color-stage-screening)',
    faded: false,
    candidate: {
      initials: 'MT',
      nameKey: 'landing.board.candidate2Name',
      defaultName: 'Marcus T.',
      roleKey: 'landing.board.candidate2Role',
      defaultRole: 'Frontend Eng',
      score: '88%',
      scoreClass: 'text-primary',
    },
  },
  {
    key: 'interview',
    name: 'Interview',
    dotColor: 'var(--color-stage-interview)',
    faded: true,
    candidate: null,
  },
] as const

const METRICS = [
  { key: 'timeToHire', value: '4.8x', defaultLabel: 'faster time-to-hire' },
  { key: 'candidates', value: '2.3M', defaultLabel: 'candidates tracked' },
  { key: 'satisfaction', value: '96%', defaultLabel: 'recruiter satisfaction' },
] as const

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
    'text-on-surface-variant hover:text-primary transition-colors',
  )

  return (
    <div
      data-mol-id="page-landing"
      className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}
    >
      {/* Top nav */}
      <nav
        className={cm.cn(
          'sticky top-0 z-50 border-b border-outline-variant/30 bg-surface/80 backdrop-blur-xl',
        )}
      >
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 8),
            cm.sp('py', 4),
            cm.flex({ align: 'center', justify: 'between' }),
          )}
        >
          <SafeLink
            to="/"
            data-mol-id="landing-logo"
            className={cm.cn(cm.textSize('2xl'), 'font-black tracking-tighter text-on-surface')}
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
                  cm.fontWeight('medium'),
                  cm.textSize('sm'),
                  'rounded-lg bg-primary text-on-primary shadow-sm hover:opacity-90 transition-opacity',
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
                    cm.fontWeight('medium'),
                    'text-primary hover:text-on-surface transition-colors py-2',
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
                    cm.fontWeight('medium'),
                    cm.textSize('sm'),
                    'rounded-lg bg-primary text-on-primary shadow-sm hover:opacity-90 transition-opacity',
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
        {/* Hero — split panel: copy + kanban board preview */}
        <section
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 8),
            cm.sp('py', 20),
            'grid gap-16 lg:grid-cols-2 lg:items-center lg:py-32',
          )}
        >
          <div>
            <h1
              className={cm.cn(
                cm.sp('mb', 6),
                'text-5xl lg:text-7xl font-black tracking-tight leading-tight text-on-background',
              )}
            >
              {t('landing.heroTitleLeading', {}, { defaultValue: 'Hire with' })}
              <br />
              <span className="text-primary">
                {t(
                  'landing.heroTitleAccent',
                  { tagline: APP_TAGLINE },
                  { defaultValue: 'clarity' },
                )}
              </span>
            </h1>
            <p
              className={cm.cn(
                cm.textSize('xl'),
                cm.sp('mb', 10),
                'leading-relaxed text-on-surface-variant',
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
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }))}>
              <Link
                to="/signup"
                data-mol-id="landing-cta-primary"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 4),
                  cm.fontWeight('semibold'),
                  'rounded-lg bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-md hover:opacity-90 transition-opacity flex items-center gap-2',
                )}
              >
                {t('landing.heroCta', {}, { defaultValue: 'Start free for 30 days' })}
                <span className={cm.cn('material-symbols-outlined text-lg')} aria-hidden="true">
                  arrow_forward
                </span>
              </Link>
              <Link
                to="/pricing"
                data-mol-id="landing-cta-secondary"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 4),
                  cm.fontWeight('semibold'),
                  'rounded-lg bg-surface-container text-primary hover:bg-surface-container-high transition-colors flex items-center gap-2',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-lg')} aria-hidden="true">
                  play_circle
                </span>
                {t('landing.heroSecondary', {}, { defaultValue: 'See pricing' })}
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

          {/* Kanban board graphic with glass AI-insight overlay */}
          <div
            className={cm.cn(
              cm.position('relative'),
              'w-full aspect-[4/3] bg-surface-container-low rounded-xl overflow-hidden',
            )}
            style={{
              boxShadow:
                '0 12px 32px -4px color-mix(in srgb, var(--color-on-surface) 8%, transparent)',
            }}
          >
            <div
              className={cm.cn(
                cm.position('absolute'),
                cm.inset0,
                cm.sp('p', 6),
                cm.flex({ gap: 'md' }),
                'overflow-hidden',
              )}
            >
              {BOARD_COLUMNS.map((col) => (
                <div
                  key={col.key}
                  className={cm.cn(
                    cm.flex({ direction: 'col', gap: 'md' }),
                    'w-56 shrink-0',
                    col.faded ? 'opacity-50' : '',
                  )}
                >
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.sp('mb', 2))}>
                    <span
                      className={cm.cn('h-3 w-3 rounded-full')}
                      style={{ backgroundColor: col.dotColor }}
                      aria-hidden="true"
                    />
                    <span className={cm.cn(cm.fontWeight('semibold'), cm.textSize('sm'))}>
                      {t(`landing.board.col.${col.key}`, {}, { defaultValue: col.name })}
                    </span>
                  </div>
                  {col.candidate ? (
                    <div
                      className={cm.cn(
                        cm.sp('p', 4),
                        'bg-surface-container-lowest rounded-lg shadow-sm border border-outline-variant/15',
                      )}
                    >
                      <div
                        className={cm.cn(cm.flex({ gap: 'sm', align: 'center' }), cm.sp('mb', 3))}
                      >
                        <span
                          className={cm.cn(
                            'h-10 w-10 rounded-full bg-surface-variant grid place-items-center',
                            cm.textSize('xs'),
                            cm.fontWeight('bold'),
                            'text-on-surface-variant',
                          )}
                          aria-hidden="true"
                        >
                          {col.candidate.initials}
                        </span>
                        <div>
                          <div className={cm.cn(cm.fontWeight('semibold'), cm.textSize('sm'))}>
                            {t(
                              col.candidate.nameKey,
                              {},
                              { defaultValue: col.candidate.defaultName },
                            )}
                          </div>
                          <div className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                            {t(
                              col.candidate.roleKey,
                              {},
                              { defaultValue: col.candidate.defaultRole },
                            )}
                          </div>
                        </div>
                      </div>
                      <div
                        className={cm.cn(
                          cm.flex({ align: 'center', justify: 'between' }),
                          cm.sp('mt', 4),
                          cm.sp('pt', 3),
                          'border-t border-surface-container-high',
                        )}
                      >
                        <span
                          className={cm.cn(
                            cm.textSize('xs'),
                            cm.fontWeight('medium'),
                            col.candidate.scoreClass,
                          )}
                        >
                          {t('landing.board.matchScore', {}, { defaultValue: 'Match Score' })}
                        </span>
                        <span
                          className={cm.cn(
                            cm.fontWeight('bold'),
                            'tabular-nums',
                            col.candidate.scoreClass,
                          )}
                        >
                          {col.candidate.score}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            {/* Glass AI insight overlay */}
            <div
              className={cm.cn(
                cm.position('absolute'),
                'bottom-8 right-8 bg-surface-container-lowest/80 backdrop-blur-md p-5 rounded-xl border border-outline-variant/20 max-w-xs',
              )}
              style={{
                boxShadow:
                  '0 12px 32px -4px color-mix(in srgb, var(--color-on-surface) 8%, transparent)',
              }}
            >
              <div className={cm.cn(cm.flex({ align: 'start', gap: 'sm' }))}>
                <span
                  className={cm.cn('material-symbols-outlined text-secondary mt-0.5')}
                  aria-hidden="true"
                >
                  auto_awesome
                </span>
                <div>
                  <div
                    className={cm.cn(cm.fontWeight('semibold'), cm.textSize('sm'), cm.sp('mb', 1))}
                  >
                    {t('landing.board.insightTitle', {}, { defaultValue: 'AI Insight' })}
                  </div>
                  <p
                    className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant leading-relaxed')}
                  >
                    {t(
                      'landing.board.insightBody',
                      {},
                      {
                        defaultValue:
                          'Elena R. shows strong alignment with your required design system experience. Recommend advancing to interview.',
                      },
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Metrics strip */}
        <section className="bg-surface-container py-12 border-y border-outline-variant/10">
          <div
            className={cm.cn(
              cm.maxW('7xl'),
              cm.mxAuto,
              cm.sp('px', 8),
              cm.grid({ cols: 1, gap: 'lg' }),
              'md:grid-cols-3 text-center md:divide-x divide-outline-variant/20',
            )}
          >
            {METRICS.map((m) => (
              <div key={m.key} className={cm.cn('py-4 md:px-8')}>
                <div
                  className={cm.cn(
                    cm.textSize('4xl'),
                    'font-black text-primary tabular-nums',
                    cm.sp('mb', 2),
                  )}
                >
                  {m.value}
                </div>
                <div
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'text-on-surface-variant uppercase tracking-wider',
                  )}
                >
                  {t(`landing.metric.${m.key}`, {}, { defaultValue: m.defaultLabel })}
                </div>
              </div>
            ))}
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
                'font-black tracking-tight text-on-surface',
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
                  'rounded-xl bg-surface-container-lowest border border-outline-variant/20 hover:-translate-y-0.5 hover:shadow-md transition-all',
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
                    'font-bold tracking-tight text-on-surface',
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
                'font-black tracking-tight text-on-surface',
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
                    'rounded-xl border transition-all',
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
                        'font-black tracking-tight tabular-nums',
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
                      'block rounded-lg transition-all',
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

      {/* Footer — brand column + link columns */}
      <footer
        className={cm.cn(
          cm.sp('px', 8),
          cm.sp('py', 12),
          'border-t border-outline-variant/15 bg-surface-container-low mt-20',
        )}
      >
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.grid({ cols: 1, gap: 'lg' }),
            'md:grid-cols-4',
          )}
        >
          <div className="md:col-span-2">
            <div
              className={cm.cn(
                cm.textSize('xl'),
                cm.fontWeight('bold'),
                'text-on-surface',
                cm.sp('mb', 4),
              )}
            >
              {APP_NAME}
            </div>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'landing.copyright',
                { year: new Date().getFullYear(), app: APP_NAME },
                { defaultValue: '© {{year}} {{app}}' },
              )}
              {' — Built with '}
              <a
                href="https://molecule.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline font-medium"
              >
                Molecule.dev
              </a>
            </p>
          </div>
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
            <Link to="/about" data-mol-id="footer-about" className={footerLinkClass}>
              {t('nav.about', {}, { defaultValue: 'About' })}
            </Link>
            <Link to="/pricing" data-mol-id="footer-pricing" className={footerLinkClass}>
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </Link>
          </div>
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
            <LegalModalLinks
              linkClassName={footerLinkClass}
              appName={APP_NAME}
              loadContent={loadContent}
              privacyLabel={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
              termsLabel={t('nav.terms', {}, { defaultValue: 'Terms' })}
            />
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing
