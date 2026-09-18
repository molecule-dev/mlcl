import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { SafeLink } from '../components/SafeLink.js'

const FEATURES = [
  {
    key: 'multi_account',
    defaultTitle: 'Multi-account view',
    defaultBody: 'See every checking, savings, and brokerage balance in one calm dashboard.',
    icon: 'account_balance',
    tint: 'text-primary',
  },
  {
    key: 'transfers',
    defaultTitle: 'Transparent transfers',
    defaultBody: 'Move money between linked accounts with fees disclosed before you confirm.',
    icon: 'swap_horiz',
    tint: 'text-secondary',
  },
  {
    key: 'statements',
    defaultTitle: 'Clean statements',
    defaultBody: 'Download PDF statements by period, search by category, export to CSV.',
    icon: 'description',
    tint: 'text-tertiary',
  },
  {
    key: 'security',
    defaultTitle: 'Audit-grade security',
    defaultBody: 'Every sign-in, transfer, and password change logged for your records.',
    icon: 'shield',
    tint: 'text-info',
  },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      {/* Top navigation */}
      <nav
        className={cm.cn(
          'sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-outline-variant/40',
        )}
      >
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.sp('px', 6),
            cm.sp('py', 4),
            cm.flex({ align: 'center', justify: 'between' }),
            cm.mxAuto,
          )}
        >
          <SafeLink to="/" className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight')}>
            {APP_NAME}
          </SafeLink>
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  'bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors',
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
                    'bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors',
                  )}
                >
                  {t('landing.getStarted', {}, { defaultValue: 'Open an account' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        {/* Hero — gradient panel with huge headline + sample balance card on the right */}
        <section className={cm.cn('relative overflow-hidden')}>
          <div
            className={cm.cn(
              'absolute inset-0 bg-gradient-to-br from-primary-container via-surface to-surface',
              'pointer-events-none',
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
              <div className={cm.cn('lg:col-span-7')}>
                <p
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.sp('mb', 4),
                    'font-bold uppercase tracking-widest text-primary',
                  )}
                >
                  {t('landing.eyebrow', {}, { defaultValue: 'Personal & business banking' })}
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
                    {},
                    {
                      defaultValue:
                        'Multi-account banking with transparent transfers and clean statements. No surprise fees, no clutter.',
                    },
                  )}
                </p>
                <div className={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>
                  <Link
                    to="/signup"
                    className={cm.cn(
                      cm.sp('px', 8),
                      cm.sp('py', 4),
                      'font-semibold bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors inline-flex items-center gap-2',
                    )}
                  >
                    {t('landing.heroCta', {}, { defaultValue: 'Open an account' })}
                    <span
                      className={cm.cn('material-symbols-outlined text-base')}
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
                      'rounded-full border border-outline-variant hover:bg-surface-container-low transition-colors',
                    )}
                  >
                    {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                  </Link>
                </div>
              </div>

              {/* Sample balance card on the right — same gradient pattern as the auth'd dashboard hero */}
              <div className={cm.cn('lg:col-span-5')}>
                <div
                  className={cm.cn(
                    cm.flex({ direction: 'col', justify: 'between' }),
                    cm.sp('p', 8),
                    'min-h-[280px] bg-gradient-to-br from-primary to-primary-container rounded-[2rem] text-white relative overflow-hidden shadow-2xl shadow-primary/20',
                  )}
                >
                  <div className={cm.cn('relative z-10')}>
                    <p
                      className={cm.cn(
                        'font-bold text-xs uppercase tracking-widest text-primary-fixed/80 mb-2',
                      )}
                    >
                      {t('landing.sampleCardLabel', {}, { defaultValue: 'Total Balance' })}
                    </p>
                    <div className={cm.flex({ align: 'baseline', gap: 'sm' })}>
                      <span
                        className={cm.cn('text-5xl font-extrabold tracking-tighter tabular-nums')}
                      >
                        $48,290.50
                      </span>
                      <span
                        className={cm.cn(
                          'px-2 py-1 rounded-full text-[11px] font-bold bg-surface/20 backdrop-blur-md inline-flex items-center gap-1',
                        )}
                      >
                        <span
                          className={cm.cn('material-symbols-outlined text-sm')}
                          aria-hidden="true"
                        >
                          trending_up
                        </span>
                        +$1,240
                      </span>
                    </div>
                  </div>
                  <div className={cm.cn('relative z-10 mt-8 h-20')}>
                    <svg
                      className={cm.cn('w-full h-full')}
                      viewBox="0 0 400 100"
                      preserveAspectRatio="none"
                    >
                      <path
                        d="M0,80 Q50,60 100,70 T200,30 T300,50 T400,10 L400,100 L0,100 Z"
                        fill="white"
                        opacity="0.3"
                      />
                      <path
                        d="M0,80 Q50,60 100,70 T200,30 T300,50 T400,10"
                        fill="none"
                        stroke="white"
                        strokeWidth="3"
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
                      'absolute right-8 top-8 w-16 h-16 rounded-full bg-primary-fixed/20 blur-xl',
                    )}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature grid — surface-container-lowest cards with icon chip pattern from polished apps */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-20')}>
          <h2
            className={cm.cn(
              cm.sp('mb', 12),
              cm.textCenter,
              'text-3xl md:text-4xl font-extrabold tracking-tight',
            )}
          >
            {t('landing.featuresHeading', {}, { defaultValue: 'Banking that respects your time' })}
          </h2>
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
                  <span className={cm.cn('material-symbols-outlined text-3xl')} aria-hidden="true">
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
        <section className={cm.cn('border-t border-outline-variant/40')}>
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-16 text-center')}>
            <h3
              className={cm.cn(cm.textSize('3xl'), cm.sp('mb', 4), 'font-extrabold tracking-tight')}
            >
              {t('landing.ctaHeading', {}, { defaultValue: 'Open your account in minutes' })}
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
                    'No paperwork, no waiting room. Get a debit card in the mail within a week.',
                },
              )}
            </p>
            <Link
              to="/signup"
              className={cm.cn(
                cm.sp('px', 10),
                cm.sp('py', 4),
                'font-semibold bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors inline-flex items-center gap-2',
              )}
            >
              {t('landing.heroCta', {}, { defaultValue: 'Open an account' })}
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
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
            { defaultValue: '© {{year}} {{app}}. Member FDIC. Equal Housing Lender.' },
          )}
        </p>
      </footer>
    </div>
  )
}
