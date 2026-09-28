import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LegalModalLinks } from '@molecule/app-legal-pages-react'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { loadContent } from '../config.js'

const NAV_LINKS = [
  { key: 'features', href: '#features', defaultLabel: 'Features' },
  { key: 'pricing', href: '/pricing', defaultLabel: 'Pricing' },
  { key: 'about', href: '/about', defaultLabel: 'About' },
] as const

const TRUST_MARKS = ['OAKWOOD', 'AVANT', 'MERIDIAN', 'STONEHURST', 'PARKLINE', 'HOMESTEAD']

const FEATURES = [
  {
    key: 'dashboard',
    defaultTitle: 'Portfolio Dashboard',
    defaultBody:
      'High-level insights and granular data perfectly balanced for strategic decision-making.',
    icon: 'dashboard',
  },
  {
    key: 'leases',
    defaultTitle: 'Lease Management',
    defaultBody:
      'Automated renewals, document storage, and digital signatures in one secure vault.',
    icon: 'description',
  },
  {
    key: 'rent_roll',
    defaultTitle: 'Rent Collection',
    defaultBody:
      'Frictionless digital payments, automatic late fee calculations, and direct deposit.',
    icon: 'payments',
  },
  {
    key: 'maintenance',
    defaultTitle: 'Maintenance Requests',
    defaultBody: 'Streamlined ticketing, vendor dispatching, and resident communication tools.',
    icon: 'build',
  },
  {
    key: 'screening',
    defaultTitle: 'Tenant Screening',
    defaultBody:
      'Comprehensive background checks, credit reports, and eviction history integration.',
    icon: 'person_search',
  },
  {
    key: 'reporting',
    defaultTitle: 'Financial Reporting',
    defaultBody: 'Tabular accuracy for ledgers, P&L statements, and tax preparation documentation.',
    icon: 'bar_chart',
  },
] as const

const RENT_ROLL_ROWS = [
  { unit: '4A', amount: '$2,450.00', pending: false },
  { unit: '7B', amount: '$3,100.00', pending: false },
  { unit: '12C', amount: '', pending: true },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()
  const monthLabel = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        'bg-background text-on-surface antialiased overflow-x-clip',
      )}
    >
      {/* Top navigation */}
      <nav
        className={cm.cn(
          'sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-outline-variant/20',
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
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'xl' }))}>
            <Link
              to="/"
              className={cm.cn(cm.textSize('2xl'), 'font-bold tracking-tighter text-primary')}
            >
              {APP_NAME}
            </Link>
            <div className={cm.cn(cm.flex({ gap: 'md' }), 'hidden md:flex')}>
              {NAV_LINKS.map((l) => (
                <Link
                  key={l.key}
                  to={l.href}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    'text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-lg transition-colors',
                  )}
                >
                  {t(`nav.${l.key}`, {}, { defaultValue: l.defaultLabel })}
                </Link>
              ))}
            </div>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2.5),
                  cm.fontWeight('semibold'),
                  'bg-primary text-on-primary rounded-xl hover:opacity-90 transition-opacity',
                )}
              >
                {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'hidden md:block text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-lg transition-colors',
                  )}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.sp('px', 5),
                    cm.sp('py', 2.5),
                    cm.fontWeight('semibold'),
                    'bg-primary text-on-primary rounded-xl hover:opacity-90 transition-opacity',
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
        {/* Hero — 60/40 split: copy left, Portfolio Overview card right */}
        <section
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            'py-20 lg:py-24 flex flex-col lg:flex-row items-center gap-12 lg:gap-16',
          )}
        >
          <div className={cm.cn('lg:w-[60%] flex flex-col gap-8')}>
            <h1 className="text-5xl lg:text-7xl font-bold font-headline text-primary tracking-tight leading-[1.1]">
              {t('landing.heroTitle', { tagline: APP_TAGLINE }, { defaultValue: '{{tagline}}' })}
            </h1>
            <p
              className={cm.cn(
                cm.textSize('xl'),
                'text-on-surface-variant max-w-2xl leading-relaxed',
              )}
            >
              {t(
                'landing.heroSubtitle',
                { appName: APP_NAME },
                {
                  defaultValue:
                    'The architectural ledger for modern property management. Streamline portfolios, elevate tenant experiences, and command your financials with institutional-grade clarity.',
                },
              )}
            </p>
            <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'md' }), 'pt-4')}>
              <Link
                to="/signup"
                data-mol-id="cta-get-started"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 4),
                  cm.fontWeight('bold'),
                  'bg-primary text-on-primary rounded-xl shadow-xl hover:opacity-90 transition-opacity inline-flex items-center',
                )}
              >
                {t('common.startFreeTrial', {}, { defaultValue: 'Start free trial' })}
              </Link>
              <Link
                to="/login"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 4),
                  cm.fontWeight('bold'),
                  'bg-surface-container-lowest text-on-surface-variant rounded-xl border border-outline-variant/15 hover:bg-surface-container-low transition-colors inline-flex items-center',
                )}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
            </div>
          </div>

          {/* Portfolio Overview sample card */}
          <div className={cm.cn('lg:w-[40%] w-full relative')}>
            <div
              className={cm.cn(
                'bg-surface-container-lowest rounded-[24px] p-6 shadow-2xl shadow-on-surface/5 border border-outline-variant/10',
              )}
              data-mol-id="portfolio-overview-card"
            >
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between' }),
                  cm.sp('mb', 6),
                  'pb-4 border-b border-surface-container-low',
                )}
              >
                <span className={cm.fontWeight('bold')}>
                  {t('landing.heroCard.title', {}, { defaultValue: 'Portfolio Overview' })}
                </span>
                <span
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'text-on-surface-variant',
                  )}
                >
                  {monthLabel}
                </span>
              </div>
              <div className={cm.cn(cm.grid({ cols: 2, gap: 'md' }), 'mb-6')}>
                <div className={cm.cn('bg-surface-container-low p-4 rounded-xl')}>
                  <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant block mb-1')}>
                    {t(
                      'landing.heroCard.totalProperties',
                      {},
                      { defaultValue: 'Total Properties' },
                    )}
                  </span>
                  <span
                    className={cm.cn(
                      cm.textSize('2xl'),
                      cm.fontWeight('bold'),
                      'text-primary tabular-nums',
                    )}
                  >
                    42
                  </span>
                </div>
                <div className={cm.cn('bg-surface-container-low p-4 rounded-xl')}>
                  <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant block mb-1')}>
                    {t('landing.heroCard.totalUnits', {}, { defaultValue: 'Total Units' })}
                  </span>
                  <span
                    className={cm.cn(
                      cm.textSize('2xl'),
                      cm.fontWeight('bold'),
                      'text-primary tabular-nums',
                    )}
                  >
                    384
                  </span>
                </div>
              </div>
              <div className={cm.cn('bg-surface-container-low rounded-xl p-4 mb-6')}>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('mb', 3),
                  )}
                >
                  <span className={cm.cn(cm.fontWeight('semibold'), cm.textSize('sm'))}>
                    {t('landing.heroCard.occupancy', {}, { defaultValue: 'Occupancy' })}
                  </span>
                  <span className={cm.cn(cm.fontWeight('bold'), 'tabular-nums text-primary')}>
                    94.2%
                  </span>
                </div>
                <div className="h-2 w-full bg-surface-variant rounded-full overflow-hidden flex">
                  <div className="h-full bg-primary w-[94.2%]" />
                </div>
              </div>
              <div>
                <span className={cm.cn(cm.fontWeight('semibold'), cm.textSize('sm'), 'block mb-3')}>
                  {t('landing.heroCard.rentRoll', {}, { defaultValue: 'Recent Rent Roll' })}
                </span>
                <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
                  {RENT_ROLL_ROWS.map((row) => (
                    <div
                      key={row.unit}
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'between' }),
                        'py-2 px-3 bg-surface rounded-lg',
                      )}
                    >
                      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                        {t(
                          'landing.heroCard.unitLabel',
                          { unit: row.unit },
                          { defaultValue: 'Unit {{unit}}' },
                        )}
                      </span>
                      {row.pending ? (
                        <span
                          className={cm.cn(
                            cm.textSize('sm'),
                            'tabular-nums font-bold text-on-surface-variant opacity-70',
                          )}
                        >
                          {t('common.pending', {}, { defaultValue: 'Pending' })}
                        </span>
                      ) : (
                        <span className={cm.cn(cm.textSize('sm'), 'tabular-nums font-bold')}>
                          {row.amount}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Decorative blur */}
            <div
              className={cm.cn(
                'absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-primary/5 rounded-full blur-[80px]',
              )}
              aria-hidden="true"
            />
          </div>
        </section>

        {/* Trust bar */}
        <section className={cm.cn('py-12 bg-surface-container-low')}>
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 8), cm.textCenter)}>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'text-on-surface-variant uppercase tracking-wider mb-8',
              )}
            >
              {t(
                'landing.trust.heading',
                { count: '2,400' },
                { defaultValue: 'Trusted by {{count}}+ property managers' },
              )}
            </p>
            <div
              className={cm.cn(
                cm.flex({ justify: 'center', wrap: 'wrap', gap: 'xl' }),
                'opacity-60',
              )}
            >
              {TRUST_MARKS.map((mark) => (
                <span
                  key={mark}
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    cm.textSize('xl'),
                    'text-primary font-headline',
                  )}
                >
                  {mark}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Features grid — left-aligned heading, 3-col cards */}
        <section
          id="features"
          className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-20 lg:py-24')}
        >
          <div className={cm.sp('mb', 12)}>
            <h2 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mb', 4))}>
              {t(
                'landing.featuresHeading',
                {},
                { defaultValue: 'Command every aspect of your portfolio' },
              )}
            </h2>
            <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant max-w-2xl')}>
              {t(
                'landing.featuresSub',
                {},
                {
                  defaultValue:
                    'A comprehensive suite designed for institutional clarity and operational excellence.',
                },
              )}
            </p>
          </div>
          <div
            className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3')}
          >
            {FEATURES.map((f) => (
              <div
                key={f.key}
                className={cm.cn(
                  cm.sp('p', 8),
                  'bg-surface-container-lowest rounded-[20px] hover:shadow-2xl hover:shadow-on-surface/5 transition-all duration-300',
                )}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.sp('mb', 6),
                    'w-12 h-12 bg-primary/10 rounded-full text-primary',
                  )}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    {f.icon}
                  </span>
                </div>
                <h3 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mb', 3))}>
                  {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p className={cm.cn('text-on-surface-variant leading-relaxed')}>
                  {t(`landing.feature.${f.key}.body`, {}, { defaultValue: f.defaultBody })}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA — deep navy panel with decorative blurs */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-20 lg:py-24')}>
          <div
            className={cm.cn(
              'bg-primary rounded-[32px] p-10 md:p-16 text-center shadow-2xl shadow-on-surface/10 relative overflow-hidden',
            )}
            data-mol-id="final-cta"
          >
            <div className={cm.cn('relative z-10')}>
              <h2
                className={cm.cn(
                  'text-4xl lg:text-5xl font-bold font-headline text-on-primary mb-6',
                )}
              >
                {t(
                  'landing.ctaHeading',
                  {},
                  { defaultValue: 'Ready to streamline your portfolio?' },
                )}
              </h2>
              <p className={cm.cn(cm.textSize('xl'), 'text-on-primary/80 max-w-2xl mx-auto mb-10')}>
                {t(
                  'landing.ctaBody',
                  { appName: APP_NAME },
                  {
                    defaultValue:
                      'Join thousands of property managers who have elevated their operations with {{appName}}.',
                  },
                )}
              </p>
              <Link
                to="/signup"
                data-mol-id="cta-start-free-trial"
                className={cm.cn(
                  cm.sp('px', 10),
                  cm.sp('py', 4),
                  cm.fontWeight('bold'),
                  'inline-block bg-surface text-primary rounded-xl shadow-lg hover:scale-105 transition-transform duration-300',
                )}
              >
                {t('common.startFreeTrial', {}, { defaultValue: 'Start free trial' })}
              </Link>
            </div>
            {/* Decorative background elements */}
            <div
              className={cm.cn(
                'absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-secondary/40 rounded-full blur-[40px] opacity-50',
              )}
              aria-hidden="true"
            />
            <div
              className={cm.cn(
                'absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-surface/10 rounded-full blur-[60px] opacity-40',
              )}
              aria-hidden="true"
            />
          </div>
        </section>
      </main>

      {/* Footer — deep navy, four columns */}
      <footer
        className={cm.cn('w-full pt-16 pb-8 bg-[var(--hs-sidebar)] text-on-primary text-sm')}
        data-mol-id="landing-footer"
      >
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 8),
            cm.sp('pt', 12),
            cm.grid({ gap: 'xl' }),
            'grid-cols-2 md:grid-cols-4 border-t border-surface/10',
          )}
        >
          <div className="col-span-2 md:col-span-1">
            <span
              className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mb', 4), 'block')}
            >
              {APP_NAME}
            </span>
            <p className={cm.cn('text-[var(--hs-sidebar-text)] mt-4 mb-6 pr-4 leading-relaxed')}>
              {t(
                'landing.footer.tagline',
                {},
                { defaultValue: 'The architectural ledger for modern property management.' },
              )}
            </p>
          </div>
          <div>
            <h4 className={cm.cn(cm.fontWeight('semibold'), cm.sp('mb', 4))}>
              {t('landing.footer.productLabel', {}, { defaultValue: 'Product' })}
            </h4>
            <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
              <li>
                <Link
                  className="text-[var(--hs-sidebar-text)] hover:text-on-primary transition-colors"
                  to="/#features"
                >
                  {t('nav.features', {}, { defaultValue: 'Features' })}
                </Link>
              </li>
              <li>
                <Link
                  className="text-[var(--hs-sidebar-text)] hover:text-on-primary transition-colors"
                  to="/pricing"
                >
                  {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
                </Link>
              </li>
              <li>
                <Link
                  className="text-[var(--hs-sidebar-text)] hover:text-on-primary transition-colors"
                  to="/signup"
                >
                  {t('common.startFreeTrial', {}, { defaultValue: 'Start free trial' })}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className={cm.cn(cm.fontWeight('semibold'), cm.sp('mb', 4))}>
              {t('landing.footer.companyLabel', {}, { defaultValue: 'Company' })}
            </h4>
            <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
              <li>
                <Link
                  className="text-[var(--hs-sidebar-text)] hover:text-on-primary transition-colors"
                  to="/about"
                >
                  {t('nav.about', {}, { defaultValue: 'About' })}
                </Link>
              </li>
              <li>
                <Link
                  className="text-[var(--hs-sidebar-text)] hover:text-on-primary transition-colors"
                  to="/login"
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className={cm.cn(cm.fontWeight('semibold'), cm.sp('mb', 4))}>
              {t('landing.footer.legalLabel', {}, { defaultValue: 'Legal' })}
            </h4>
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), 'items-start')}>
              <LegalModalLinks
                linkClassName="text-[var(--hs-sidebar-text)] hover:text-on-primary transition-colors"
                appName={APP_NAME}
                loadContent={loadContent}
                privacyLabel={t(
                  'landing.footer.privacyPolicy',
                  {},
                  { defaultValue: 'Privacy Policy' },
                )}
                termsLabel={t(
                  'landing.footer.termsOfService',
                  {},
                  { defaultValue: 'Terms of Service' },
                )}
              />
            </div>
          </div>
        </div>
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 8),
            cm.sp('mt', 12),
            cm.sp('pt', 8),
            'border-t border-surface/10',
          )}
        >
          <p className="text-[var(--hs-sidebar-text)]">
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
      </footer>
    </div>
  )
}

export default Landing
export { Landing as LandingPage }
