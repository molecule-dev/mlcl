import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { OccupancyKpiQuad } from '../components/OccupancyKpiQuad.js'
import { PortfolioHeroCard } from '../components/PortfolioHeroCard.js'

const FEATURES = [
  {
    key: 'occupancy',
    defaultTitle: 'Occupancy at a glance',
    defaultBody:
      'Live unit-by-unit status across every building. Vacancies surface before they hurt cash flow.',
    icon: 'apartment',
    tint: 'text-primary',
  },
  {
    key: 'rent_roll',
    defaultTitle: 'Rent roll on autopilot',
    defaultBody:
      'Stripe-backed payments, automated reminders, ledger-grade arrears reporting. No spreadsheets.',
    icon: 'payments',
    tint: 'text-secondary',
  },
  {
    key: 'maintenance',
    defaultTitle: 'Maintenance, sorted',
    defaultBody:
      'Tenants log requests, vendors get assigned, photos and timeline travel together. Nothing falls through.',
    icon: 'handyman',
    tint: 'text-tertiary',
  },
  {
    key: 'leases',
    defaultTitle: 'Leases that renew themselves',
    defaultBody:
      'Auto-flag expiring leases 60 days out. Send renewal docs, collect e-signatures, archive forever.',
    icon: 'description',
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
          <Link to="/" className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight')}>
            {APP_NAME}
          </Link>
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
                  {t('common.startFreeTrial', {}, { defaultValue: 'Start free trial' })}
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
              'absolute inset-0 bg-gradient-to-br from-primary-container via-surface to-surface pointer-events-none',
            )}
            aria-hidden="true"
          />
          <div
            className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-20 md:py-28 relative')}
          >
            <div className={cm.cn('grid grid-cols-1 lg:grid-cols-12 gap-12 items-center')}>
              <div className={'lg:col-span-7'}>
                <p
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.sp('mb', 4),
                    'font-bold uppercase tracking-widest text-primary',
                  )}
                >
                  {t('landing.eyebrow', {}, { defaultValue: 'For landlords & property managers' })}
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
                        '{{appName}} keeps your portfolio orderly — units, leases, rent collection, and maintenance, all in one calm place.',
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
                    {t('common.startFreeTrial', {}, { defaultValue: 'Start free trial' })}
                    <span className={'material-symbols-outlined text-base'} aria-hidden="true">
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

                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }),
                    cm.sp('mt', 10),
                  )}
                >
                  {[
                    { key: 'units', value: '14k+', defaultLabel: 'units managed' },
                    { key: 'collection', value: '99.4%', defaultLabel: 'rent collection' },
                    { key: 'response', value: '< 24h', defaultLabel: 'maintenance response' },
                  ].map((s) => (
                    <div key={s.key} className={cm.flex({ direction: 'col' })}>
                      <span className={cm.cn(cm.textSize('2xl'), 'font-extrabold tabular-nums')}>
                        {s.value}
                      </span>
                      <span
                        className={cm.cn(
                          cm.textSize('xs'),
                          cm.fontWeight('bold'),
                          'uppercase tracking-widest text-on-surface-variant',
                        )}
                      >
                        {t(`landing.stat.${s.key}`, {}, { defaultValue: s.defaultLabel })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sample dashboard hero — same gradient as the auth'd page */}
              <div className={'lg:col-span-5'}>
                <PortfolioHeroCard
                  totalCents={482900_00}
                  changeCents={12400_00}
                  history={[420, 425, 430, 428, 440, 445, 450, 455, 462, 470, 475, 482]}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Sample KPI quad */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'pb-20')}>
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('mb', 4),
              'font-bold uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('landing.sampleKpi.eyebrow', {}, { defaultValue: 'Live portfolio overview' })}
          </p>
          <OccupancyKpiQuad
            occupiedUnits={132}
            totalUnits={148}
            vacantUnits={16}
            overdueCount={4}
            leaseExpiringCount={9}
          />
        </section>

        {/* Feature grid */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-20')}>
          <h2
            className={cm.cn(
              cm.sp('mb', 12),
              cm.textCenter,
              'text-3xl md:text-4xl font-extrabold tracking-tight',
            )}
          >
            {t(
              'landing.featuresHeading',
              {},
              { defaultValue: 'Property management that respects your time' },
            )}
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
        <section className={cm.cn('border-t border-outline-variant/40')}>
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-16 text-center')}>
            <h3
              className={cm.cn(cm.textSize('3xl'), cm.sp('mb', 4), 'font-extrabold tracking-tight')}
            >
              {t('landing.ctaHeading', {}, { defaultValue: 'Bring your portfolio under one roof' })}
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
                    'Free for 30 days, no credit card required. Move your existing rent roll over in minutes.',
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
              {t('common.startFreeTrial', {}, { defaultValue: 'Start free trial' })}
              <span className={'material-symbols-outlined text-base'} aria-hidden="true">
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
            { defaultValue: '© {{year}} {{app}}. Every unit, under one roof.' },
          )}
        </p>
      </footer>
    </div>
  )
}
