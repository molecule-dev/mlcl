import { Link } from 'react-router'

import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { PublicTopNav } from '../components/PublicTopNav.js'
import { loadContent } from '../config.js'

const FEATURES = [
  {
    key: 'one_click',
    defaultTitle: 'One-click timer',
    defaultBody:
      'Start tracking on any project from any screen — keyboard shortcuts and a sticky timer bar mean you never lose a billable minute.',
    icon: 'timer',
    accent: 'text-success',
    chip: 'bg-success-light',
  },
  {
    key: 'projects',
    defaultTitle: 'Projects with budgets',
    defaultBody:
      'Color-coded projects, hourly rates, and live budget burn-down so you know the moment a scope creep starts costing you.',
    icon: 'folder_open',
    accent: 'text-blue-600',
    chip: 'bg-blue-50',
  },
  {
    key: 'reports',
    defaultTitle: 'Reports clients love',
    defaultBody:
      'Drill-down by project, client, or tag. Export CSV in one click. Send a report your client can actually skim.',
    icon: 'analytics',
    accent: 'text-violet-600',
    chip: 'bg-violet-50',
  },
  {
    key: 'invoices',
    defaultTitle: 'Invoices, automatically',
    defaultBody:
      'Tracked hours roll up into Stripe-backed invoices with one tap. Send, mark paid, and get back to work.',
    icon: 'receipt_long',
    accent: 'text-warning',
    chip: 'bg-warning-light',
  },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-surface-secondary text-foreground antialiased')}>
      {/* Top navigation */}
      <PublicTopNav />

      <main>
        {/* Hero — gradient panel + sample tracked-today card mirroring the auth'd hero */}
        <section className={cm.cn('relative overflow-hidden')}>
          <div
            className={cm.cn(
              'absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-emerald-50 pointer-events-none',
            )}
            aria-hidden="true"
          />
          <div
            className={cm.cn(
              cm.maxW('7xl'),
              cm.mxAuto,
              cm.sp('px', 6),
              'relative py-20 md:py-28 lg:py-32',
            )}
          >
            <div className={cm.cn('grid grid-cols-1 lg:grid-cols-12 gap-12 items-center')}>
              <div className={cm.cn('lg:col-span-7')}>
                <p
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.sp('mb', 4),
                    'font-bold uppercase tracking-widest text-blue-600',
                  )}
                >
                  {t('landing.eyebrow', {}, { defaultValue: 'Time tracking for billable work' })}
                </p>
                <h1
                  className={cm.cn(
                    cm.sp('mb', 6),
                    'text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[0.95]',
                  )}
                >
                  {t(
                    'landing.heroTitle',
                    { tagline: APP_TAGLINE },
                    { defaultValue: '{{tagline}}' },
                  )}
                </h1>
                <p
                  className={cm.cn(
                    cm.textSize('lg'),
                    cm.sp('mb', 10),
                    'text-foreground-secondary max-w-xl leading-relaxed',
                  )}
                >
                  {t(
                    'landing.heroSubtitle',
                    {},
                    {
                      defaultValue:
                        'Track billable hours across clients, watch budgets in real-time, and turn every minute into a Stripe-backed invoice. Built for freelancers, consultants, and agencies.',
                    },
                  )}
                </p>
                <div className={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>
                  <Link
                    to="/signup"
                    className={cm.cn(
                      cm.sp('px', 8),
                      cm.sp('py', 4),
                      cm.fontWeight('semibold'),
                      'bg-gradient-to-br from-blue-600 to-emerald-500 text-white rounded-full shadow-lg hover:shadow-xl transition-all inline-flex items-center gap-2',
                    )}
                  >
                    {t('landing.heroCta', {}, { defaultValue: 'Start tracking — free' })}
                    <span
                      className={cm.cn(cm.textSize('base'), 'material-symbols-outlined')}
                      aria-hidden="true"
                    >
                      arrow_forward
                    </span>
                  </Link>
                  <Link
                    to="/login"
                    className={cm.cn(
                      cm.sp('px', 8),
                      cm.sp('py', 4),
                      cm.fontWeight('semibold'),
                      'rounded-full border border-border-secondary text-foreground hover:bg-surface transition-colors',
                    )}
                  >
                    {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                  </Link>
                </div>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xl', wrap: 'wrap' }),
                    cm.sp('mt', 12),
                  )}
                >
                  <div className={cm.flex({ align: 'center', gap: 'xs' })}>
                    <span className={cm.cn('material-symbols-outlined text-success')}>
                      check_circle
                    </span>
                    <span
                      className={cm.cn(cm.textSize('sm'), 'text-foreground-secondary font-medium')}
                    >
                      {t(
                        'landing.proof.freeTier',
                        {},
                        { defaultValue: 'Free for up to 3 projects' },
                      )}
                    </span>
                  </div>
                  <div className={cm.flex({ align: 'center', gap: 'xs' })}>
                    <span className={cm.cn('material-symbols-outlined text-success')}>
                      check_circle
                    </span>
                    <span
                      className={cm.cn(cm.textSize('sm'), 'text-foreground-secondary font-medium')}
                    >
                      {t('landing.proof.noCard', {}, { defaultValue: 'No credit card required' })}
                    </span>
                  </div>
                  <div className={cm.flex({ align: 'center', gap: 'xs' })}>
                    <span className={cm.cn('material-symbols-outlined text-success')}>
                      check_circle
                    </span>
                    <span
                      className={cm.cn(cm.textSize('sm'), 'text-foreground-secondary font-medium')}
                    >
                      {t('landing.proof.export', {}, { defaultValue: 'CSV export anytime' })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sample tracked-today card — mirrors the auth'd dashboard hero */}
              <div className={cm.cn('lg:col-span-5')}>
                <div
                  className={cm.cn(
                    cm.flex({ direction: 'col', justify: 'between' }),
                    cm.sp('p', 8),
                    'min-h-[320px] bg-gradient-to-br from-blue-600 via-blue-700 to-emerald-600 rounded-[2rem] text-white relative overflow-hidden shadow-2xl shadow-blue-500/20',
                  )}
                >
                  <div className={cm.cn('relative z-10')}>
                    <p
                      className={cm.cn(
                        'font-bold text-xs uppercase tracking-widest text-blue-100/80 mb-2',
                      )}
                    >
                      {t('landing.sampleCardLabel', {}, { defaultValue: 'Tracked today' })}
                    </p>
                    <div className={cm.flex({ align: 'baseline', gap: 'sm' })}>
                      <span
                        className={cm.cn(
                          'text-6xl font-extrabold tracking-tighter font-mono tabular-nums',
                        )}
                      >
                        06:42:18
                      </span>
                    </div>
                    <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.sp('mt', 3))}>
                      <span
                        className={cm.cn(
                          cm.flex({ align: 'center', gap: 'xs' }),
                          cm.sp('px', 3),
                          cm.sp('py', 1),
                          cm.roundedFull,
                          cm.textSize('xs'),
                          cm.fontWeight('bold'),
                          'bg-surface/20 backdrop-blur-md',
                        )}
                      >
                        <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
                          trending_up
                        </span>
                        +12.4% vs last week
                      </span>
                      <span
                        className={cm.cn(
                          cm.flex({ align: 'center', gap: 'xs' }),
                          cm.sp('px', 3),
                          cm.sp('py', 1),
                          cm.roundedFull,
                          cm.textSize('xs'),
                          cm.fontWeight('bold'),
                          'bg-surface/20 backdrop-blur-md',
                        )}
                      >
                        <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
                          attach_money
                        </span>
                        $603 billable
                      </span>
                    </div>
                  </div>
                  <div className={cm.cn('relative z-10 mt-8 h-24')}>
                    <svg
                      className={cm.cn('w-full h-full')}
                      viewBox="0 0 400 100"
                      preserveAspectRatio="none"
                    >
                      <path
                        d="M0,80 L57,55 L114,68 L171,32 L228,48 L285,18 L342,38 L400,12 L400,100 L0,100 Z"
                        fill="white"
                        opacity="0.2"
                      />
                      <polyline
                        points="0,80 57,55 114,68 171,32 228,48 285,18 342,38 400,12"
                        fill="none"
                        stroke="white"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div
                    className={cm.cn(
                      'absolute -right-16 -bottom-16 w-64 h-64 rounded-full bg-surface/10 blur-3xl',
                    )}
                  />
                  <div
                    className={cm.cn(
                      'absolute right-8 top-8 w-16 h-16 rounded-full bg-emerald-300/30 blur-xl',
                    )}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature grid */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-20')}>
          <h2
            className={cm.cn(
              cm.sp('mb', 4),
              cm.textCenter,
              'text-3xl md:text-4xl font-extrabold tracking-tight',
            )}
          >
            {t('landing.featuresHeading', {}, { defaultValue: 'Built for billable work' })}
          </h2>
          <p
            className={cm.cn(
              cm.sp('mb', 12),
              cm.textCenter,
              cm.textSize('lg'),
              'text-foreground-secondary max-w-2xl mx-auto',
            )}
          >
            {t(
              'landing.featuresBody',
              {},
              {
                defaultValue:
                  'From the first click of the timer to the final invoice — every step is built around the way independents actually work.',
              },
            )}
          </p>
          <div
            className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}
          >
            {FEATURES.map((f) => (
              <div
                key={f.key}
                className={cm.cn(
                  cm.sp('p', 6),
                  'bg-surface rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group',
                )}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.sp('p', 3),
                    cm.w(12),
                    cm.h(12),
                    'rounded-xl shadow-sm group-hover:scale-110 transition-transform',
                    f.chip,
                    f.accent,
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-2xl')} aria-hidden="true">
                    {f.icon}
                  </span>
                </div>
                <h3
                  className={cm.cn(
                    cm.textSize('lg'),
                    cm.sp('mt', 5),
                    cm.sp('mb', 2),
                    'font-bold text-foreground',
                  )}
                >
                  {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p
                  className={cm.cn(cm.textSize('sm'), 'text-foreground-secondary leading-relaxed')}
                >
                  {t(`landing.feature.${f.key}.body`, {}, { defaultValue: f.defaultBody })}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Social proof — testimonial strip */}
        <section
          className={cm.cn(
            'py-20 bg-gradient-to-br from-blue-50 to-emerald-50/40 border-y border-border/60',
          )}
        >
          <div className={cm.cn(cm.maxW('5xl'), cm.mxAuto, cm.sp('px', 6), cm.textCenter)}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                'font-bold uppercase tracking-widest text-blue-600 mb-6',
              )}
            >
              {t('landing.testimonial.eyebrow', {}, { defaultValue: 'Trusted by independents' })}
            </p>
            <p
              className={cm.cn(
                'text-2xl md:text-3xl font-extrabold tracking-tight text-foreground leading-snug max-w-3xl mx-auto',
              )}
            >
              {t(
                'landing.testimonial.quote',
                {},
                {
                  defaultValue:
                    "\u201cI moved off Toggl in 30 minutes. The budget burn-down alone has paid for itself \u2014 I've stopped under-quoting two weeks running.\u201d",
                },
              )}
            </p>
            <p
              className={cm.cn(cm.sp('mt', 6), cm.textSize('sm'), 'font-semibold text-foreground')}
            >
              {t(
                'landing.testimonial.attribution',
                {},
                { defaultValue: 'Maya R. · Brand strategist, Brooklyn' },
              )}
            </p>
          </div>
        </section>

        {/* CTA strip */}
        <section className={cm.cn('border-t border-border/60')}>
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-20 text-center')}>
            <h3
              className={cm.cn(
                cm.textSize('3xl'),
                cm.sp('mb', 4),
                'font-extrabold tracking-tight text-foreground',
              )}
            >
              {t('landing.ctaHeading', {}, { defaultValue: 'Start tracking in under a minute' })}
            </h3>
            <p
              className={cm.cn(
                cm.textSize('base'),
                cm.sp('mb', 8),
                'text-foreground-secondary max-w-xl mx-auto',
              )}
            >
              {t(
                'landing.ctaBody',
                {},
                { defaultValue: 'Free for up to 3 projects. Upgrade when your client list does.' },
              )}
            </p>
            <Link
              to="/signup"
              className={cm.cn(
                cm.sp('px', 10),
                cm.sp('py', 4),
                cm.fontWeight('semibold'),
                'bg-gradient-to-br from-blue-600 to-emerald-500 text-white rounded-full shadow-lg hover:shadow-xl transition-all inline-flex items-center gap-2',
              )}
            >
              {t('landing.heroCta', {}, { defaultValue: 'Start tracking — free' })}
              <span
                className={cm.cn(cm.textSize('base'), 'material-symbols-outlined')}
                aria-hidden="true"
              >
                arrow_forward
              </span>
            </Link>
          </div>
        </section>
      </main>

      <footer
        className={cm.cn(
          cm.sp('py', 8),
          cm.textCenter,
          cm.textSize('sm'),
          'bg-surface text-foreground-secondary border-t border-border/60',
        )}
      >
        <p>
          {t(
            'landing.copyright',
            { year: new Date().getFullYear(), app: APP_NAME },
            { defaultValue: '© {{year}} {{app}}. Every second, accounted for.' },
          )}
        </p>
        {/* Privacy/Terms open IN-PLACE modals (bonded legal HTML pre-loaded
            via loadContent); the standalone /privacy and /terms routes remain
            for deep links. */}
        <nav
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 'md' }),
            cm.sp('mt', 3),
          )}
        >
          <LegalModalLinks
            linkClassName={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'hover:text-blue-600 transition-colors',
            )}
            appName={APP_NAME}
            loadContent={loadContent}
            privacyLabel={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
            termsLabel={t('nav.terms', {}, { defaultValue: 'Terms' })}
          />
        </nav>
      </footer>
    </div>
  )
}

export default Landing
export { Landing as LandingPage }
