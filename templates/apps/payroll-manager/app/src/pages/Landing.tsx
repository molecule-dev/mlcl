import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

const FEATURES = [
  {
    key: 'compliantRuns',
    defaultTitle: 'Compliant pay runs',
    defaultBody: 'Federal, state, and local taxes calculated and filed on time, every cycle.',
    icon: 'verified',
    tint: 'text-primary',
  },
  {
    key: 'employeeProfiles',
    defaultTitle: 'Employee profiles',
    defaultBody: 'Pay rates, withholdings, deductions, and history kept in one secure place.',
    icon: 'group',
    tint: 'text-secondary',
  },
  {
    key: 'auditTrail',
    defaultTitle: 'Audit-grade trail',
    defaultBody: 'Every approval, edit, and tax filing logged with the actor and timestamp.',
    icon: 'shield',
    tint: 'text-tertiary',
  },
  {
    key: 'reports',
    defaultTitle: 'Reports for finance',
    defaultBody: 'Headcount, payroll spend, and tax breakdowns ready for the close every month.',
    icon: 'insights',
    tint: 'text-info',
  },
] as const

const TRUST = [
  { key: 'employers', defaultLabel: '900+ employers', icon: 'business' },
  { key: 'cycles', defaultLabel: '12k cycles run', icon: 'event_repeat' },
  { key: 'compliance', defaultLabel: '50-state filings', icon: 'public' },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <nav
        className={cm.cn(
          'sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-outline-variant/40',
        )}
      >
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            cm.sp('py', 4),
            cm.flex({ align: 'center', justify: 'between' }),
            'flex-wrap gap-x-4 gap-y-2',
          )}
        >
          <Link
            to="/"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.textSize('xl'),
              'min-w-0 whitespace-nowrap shrink-0',
              'font-extrabold tracking-tight',
            )}
          >
            <span
              className={cm.cn(
                cm.w(8),
                cm.h(8),
                cm.roundedFull,
                cm.flex({ align: 'center', justify: 'center' }),
                'bg-gradient-to-br from-primary to-secondary text-white shadow-md',
              )}
              aria-hidden="true"
            >
              <span
                className={cm.cn(`material-symbols-outlined text-lg`)}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                receipt_long
              </span>
            </span>
            {APP_NAME}
          </Link>
          <div
            className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'min-w-0 flex-wrap gap-y-2')}
          >
            <Link
              to="/pricing"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'hidden sm:inline whitespace-nowrap',
                'text-on-surface-variant hover:text-on-surface',
              )}
            >
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </Link>
            <Link
              to="/about"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'hidden sm:inline whitespace-nowrap',
                'text-on-surface-variant hover:text-on-surface',
              )}
            >
              {t('nav.about', {}, { defaultValue: 'About' })}
            </Link>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  cm.roundedFull,
                  'whitespace-nowrap shrink-0',
                  'bg-primary text-on-primary hover:bg-primary/90 transition-colors',
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
                    cm.fontWeight('medium'),
                    'whitespace-nowrap',
                    'text-on-surface-variant hover:text-on-surface',
                  )}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 2),
                    cm.fontWeight('semibold'),
                    cm.roundedFull,
                    'whitespace-nowrap shrink-0',
                    'bg-primary text-on-primary hover:bg-primary/90 transition-colors',
                  )}
                >
                  {t('landing.getStarted', {}, { defaultValue: 'Start a trial' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        {/* Hero */}
        <section className={cm.cn('relative overflow-hidden')}>
          <div
            className={cm.cn(
              'absolute inset-0 bg-gradient-to-br from-primary-container/40 via-surface to-surface pointer-events-none',
            )}
            aria-hidden="true"
          />
          <div
            className={cm.cn(
              cm.maxW('7xl'),
              cm.mxAuto,
              cm.sp('px', 6),
              'py-20 md:py-28 lg:py-32 relative',
            )}
          >
            <div className={cm.cn('grid grid-cols-1 lg:grid-cols-12 gap-12 items-center')}>
              <div className={cm.cn(`lg:col-span-7`)}>
                <p
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.sp('mb', 4),
                    'font-bold uppercase tracking-widest text-primary',
                  )}
                >
                  {t('landing.eyebrow', {}, { defaultValue: 'Payroll for SMBs' })}
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
                    'text-on-surface-variant max-w-xl leading-relaxed',
                  )}
                >
                  {t(
                    'landing.heroSubtitle',
                    { appName: APP_NAME },
                    {
                      defaultValue:
                        '{{appName}} is precise, reliable payroll for HR and finance operators. Run biweekly cycles, file taxes, and keep an audit-grade trail — without the spreadsheets.',
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
                      cm.roundedFull,
                      'bg-primary text-on-primary hover:bg-primary/90 transition-colors inline-flex items-center gap-2',
                    )}
                  >
                    {t('landing.heroCta', {}, { defaultValue: 'Start a free trial' })}
                    <span
                      className={cm.cn(`material-symbols-outlined text-base`)}
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
                      cm.roundedFull,
                      'border border-outline-variant hover:bg-surface-container-low transition-colors',
                    )}
                  >
                    {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                  </Link>
                </div>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'lg', wrap: 'wrap' }),
                    cm.sp('mt', 10),
                  )}
                >
                  {TRUST.map((item) => (
                    <div
                      key={item.key}
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'xs' }),
                        cm.textSize('sm'),
                        'text-on-surface-variant',
                      )}
                    >
                      <span
                        className={cm.cn(`material-symbols-outlined text-base text-primary`)}
                        aria-hidden="true"
                      >
                        {item.icon}
                      </span>
                      <span className="font-semibold">
                        {t(`landing.trust.${item.key}`, {}, { defaultValue: item.defaultLabel })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sample hero card — same gradient/shape as auth'd PayrollHeroCard */}
              <div className={cm.cn(`lg:col-span-5`)}>
                <div
                  className={cm.cn(
                    cm.flex({ direction: 'col', justify: 'between' }),
                    cm.sp('p', 8),
                    'min-h-[300px] rounded-[2rem] text-white relative overflow-hidden shadow-2xl shadow-primary/30 bg-gradient-to-br from-primary to-secondary',
                  )}
                >
                  <div className="relative z-10">
                    <p
                      className={cm.cn(
                        `font-bold text-xs uppercase tracking-widest text-white/80 mb-2`,
                      )}
                    >
                      {t('landing.sampleEyebrow', {}, { defaultValue: 'Next pay run · Apr 30' })}
                    </p>
                    <div className={cm.flex({ align: 'baseline', gap: 'sm', wrap: 'wrap' })}>
                      <span className="text-5xl font-extrabold tracking-tighter tabular-nums">
                        $184,250
                      </span>
                      <span
                        className={cm.cn(
                          `px-3 py-1 rounded-full text-xs font-bold bg-surface/20 backdrop-blur-md inline-flex items-center gap-1`,
                        )}
                      >
                        <span
                          className={cm.cn(`material-symbols-outlined text-sm`)}
                          aria-hidden="true"
                        >
                          trending_up
                        </span>
                        +$3,420
                      </span>
                    </div>
                    <div className={cm.cn(`mt-6 flex items-center gap-3`)}>
                      <span
                        className={cm.cn(
                          `inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-surface/15 backdrop-blur-md`,
                        )}
                      >
                        <span
                          className={cm.cn(`material-symbols-outlined text-sm`)}
                          aria-hidden="true"
                        >
                          group
                        </span>
                        42 employees
                      </span>
                      <span
                        className={cm.cn(
                          `inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-surface/15 backdrop-blur-md`,
                        )}
                      >
                        <span
                          className={cm.cn(`material-symbols-outlined text-sm`)}
                          aria-hidden="true"
                        >
                          verified
                        </span>
                        Compliant
                      </span>
                    </div>
                  </div>
                  <div className={cm.cn(`relative z-10 mt-6 h-20`)}>
                    <svg
                      className={cm.cn(`w-full h-full`)}
                      viewBox="0 0 400 100"
                      preserveAspectRatio="none"
                    >
                      <path
                        d="M0,80 Q50,55 100,65 T200,40 T300,30 T400,15 L400,100 L0,100 Z"
                        fill="white"
                        opacity="0.3"
                      />
                      <path
                        d="M0,80 Q50,55 100,65 T200,40 T300,30 T400,15"
                        fill="none"
                        stroke="white"
                        strokeWidth="3"
                      />
                    </svg>
                  </div>
                  <div
                    className={cm.cn(
                      `absolute -right-20 -bottom-20 w-64 h-64 rounded-full bg-surface/10 blur-3xl`,
                    )}
                  />
                  <div
                    className={cm.cn(
                      `absolute right-8 top-8 w-16 h-16 rounded-full bg-surface/15 blur-xl`,
                    )}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-20')}>
          <div className={cm.cn(cm.maxW('2xl'), cm.mxAuto, cm.textCenter, cm.sp('mb', 12))}>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.sp('mb', 3),
                'font-bold uppercase tracking-widest text-primary',
              )}
            >
              {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
            </p>
            <h2 className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight')}>
              {t(
                'landing.featuresHeading',
                {},
                { defaultValue: 'Payroll that is precise, reliable, composed' },
              )}
            </h2>
          </div>
          <div
            className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}
          >
            {FEATURES.map((f) => (
              <div
                key={f.key}
                className={cm.cn(
                  cm.sp('p', 6),
                  'bg-surface-container-lowest rounded-2xl hover:shadow-2xl hover:shadow-on-surface/5 transition-all group',
                )}
              >
                <div
                  className={cm.cn(
                    cm.sp('p', 3),
                    'inline-flex bg-surface rounded-xl shadow-sm group-hover:scale-110 transition-transform',
                    f.tint,
                  )}
                >
                  <span className="material-symbols-outlined text-3xl" aria-hidden="true">
                    {f.icon}
                  </span>
                </div>
                <h3
                  className={cm.cn(cm.textSize('lg'), cm.sp('mt', 5), cm.sp('mb', 2), 'font-bold')}
                >
                  {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
                  {t(`landing.feature.${f.key}.body`, {}, { defaultValue: f.defaultBody })}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA strip */}
        <section
          className={cm.cn('border-t border-outline-variant/40 bg-surface-container-low/40')}
        >
          <div className={cm.cn(cm.maxW('5xl'), cm.mxAuto, cm.sp('px', 6), 'py-16 text-center')}>
            <h3
              className={cm.cn(cm.textSize('3xl'), cm.sp('mb', 4), 'font-extrabold tracking-tight')}
            >
              {t(
                'landing.ctaHeading',
                { appName: APP_NAME },
                { defaultValue: 'Run your next cycle on {{appName}}' },
              )}
            </h3>
            <p
              className={cm.cn(
                cm.textSize('base'),
                cm.sp('mb', 8),
                'text-on-surface-variant max-w-xl mx-auto',
              )}
            >
              {t(
                'landing.ctaBody',
                {},
                {
                  defaultValue:
                    'Free for 30 days. No credit card. Switch any time without losing your audit trail.',
                },
              )}
            </p>
            <Link
              to="/signup"
              className={cm.cn(
                cm.sp('px', 10),
                cm.sp('py', 4),
                cm.fontWeight('semibold'),
                cm.roundedFull,
                'bg-primary text-on-primary hover:bg-primary/90 transition-colors inline-flex items-center gap-2',
              )}
            >
              {t('landing.heroCta', {}, { defaultValue: 'Start a free trial' })}
              <span className={cm.cn(`material-symbols-outlined text-base`)} aria-hidden="true">
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
          'bg-surface text-on-surface-variant border-t border-outline-variant',
        )}
      >
        <p>
          {t(
            'landing.copyright',
            { year: new Date().getFullYear(), app: APP_NAME },
            { defaultValue: '© {{year}} {{app}}. Precise, reliable, composed.' },
          )}
        </p>
        <p
          className={cm.cn(
            cm.sp('mt', 2),
            cm.flex({ align: 'center', justify: 'center', gap: 'md' }),
          )}
        >
          <Link to="/about" className={cm.cn('hover:text-on-surface transition-colors')}>
            {t('nav.about', {}, { defaultValue: 'About' })}
          </Link>
          <Link to="/pricing" className={cm.cn('hover:text-on-surface transition-colors')}>
            {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
          </Link>
          <Link to="/terms" className={cm.cn('hover:text-on-surface transition-colors')}>
            {t('nav.terms', {}, { defaultValue: 'Terms' })}
          </Link>
          <Link to="/privacy" className={cm.cn('hover:text-on-surface transition-colors')}>
            {t('nav.privacy', {}, { defaultValue: 'Privacy' })}
          </Link>
        </p>
      </footer>
    </div>
  )
}
