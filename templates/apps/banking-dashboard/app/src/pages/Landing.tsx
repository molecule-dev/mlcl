import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'
import { SafeLink } from '../components/SafeLink.js'

const FEATURES = [
  {
    key: 'multi_account',
    defaultTitle: 'Unified accounts',
    defaultBody:
      'Consolidate balances, track liabilities, and manage global liquidity from a single, unfragmented view.',
    icon: 'account_balance',
  },
  {
    key: 'transfers',
    defaultTitle: 'Instant transfers',
    defaultBody:
      'Move money between linked accounts with sub-second latency and fees disclosed before you confirm.',
    icon: 'bolt',
  },
  {
    key: 'statements',
    defaultTitle: 'Intelligent insights',
    defaultBody:
      'Clean statements, cash-flow forecasting, and category search — reporting without the wall of red flags.',
    icon: 'insights',
  },
  {
    key: 'security',
    defaultTitle: 'Audit-grade security',
    defaultBody: 'Every sign-in, transfer, and password change logged for your records.',
    icon: 'shield',
  },
] as const

const STATS = [
  { value: '$4.2B', labelKey: 'landing.stat.volume', defaultLabel: 'Moved daily' },
  { value: '2.1M', labelKey: 'landing.stat.members', defaultLabel: 'Active members' },
  { value: '99.99%', labelKey: 'landing.stat.uptime', defaultLabel: 'Uptime SLA' },
  { value: 'SOC 2', labelKey: 'landing.stat.soc2', defaultLabel: 'Type II Certified' },
] as const

const TRUST_CHIPS = [
  { icon: 'shield', labelKey: 'landing.trust.security', defaultLabel: 'Bank-grade security' },
  { icon: 'verified', labelKey: 'landing.trust.fdic', defaultLabel: 'FDIC Insured' },
] as const

const NAVY_LINK_COLUMNS = [
  {
    headingKey: 'footer.product',
    headingDefault: 'Product',
    links: [
      { labelKey: 'nav.features', labelDefault: 'Features', to: '/#features' },
      { labelKey: 'nav.pricing', labelDefault: 'Pricing', to: '/pricing' },
      { labelKey: 'landing.nav.security', labelDefault: 'Security', to: '/about' },
    ],
  },
  {
    headingKey: 'footer.company',
    headingDefault: 'Company',
    links: [
      { labelKey: 'about.eyebrow', labelDefault: 'About', to: '/about' },
      { labelKey: 'auth.login.signInButton', labelDefault: 'Sign in', to: '/login' },
    ],
  },
  {
    headingKey: 'footer.legal',
    headingDefault: 'Legal',
    links: [
      { labelKey: 'footer.termsOfService', labelDefault: 'Terms', to: '/terms' },
      { labelKey: 'footer.privacyPolicy', labelDefault: 'Privacy', to: '/privacy' },
    ],
  },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      {/* Top navigation — glass bar over the page */}
      <nav className={cm.cn('fixed top-0 z-50 w-full bg-surface/80 backdrop-blur-md shadow-sm')}>
        <div
          className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'h-20 px-6 md:px-8')}
        >
          <SafeLink
            to="/"
            className={cm.cn(cm.textSize('2xl'), 'font-bold tracking-tighter text-primary')}
          >
            <BrandWordmark as="span" />
          </SafeLink>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }), 'hidden md:flex')}>
            <a
              href="#features"
              className={cm.cn(
                cm.textSize('sm'),
                'text-on-surface-variant hover:text-primary transition-colors',
              )}
            >
              {t('nav.features', {}, { defaultValue: 'Products' })}
            </a>
            <a
              href="#stats"
              className={cm.cn(
                cm.textSize('sm'),
                'text-on-surface-variant hover:text-primary transition-colors',
              )}
            >
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </a>
            <a
              href="#features"
              className={cm.cn(
                cm.textSize('sm'),
                'text-on-surface-variant hover:text-primary transition-colors',
              )}
            >
              {t('landing.nav.security', {}, { defaultValue: 'Security' })}
            </a>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'hidden md:flex')}>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className={cm.cn(
                  cm.sp('px', 5),
                  'py-2.5',
                  cm.fontWeight('medium'),
                  cm.textSize('sm'),
                  'bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-lg hover:opacity-90 transition-opacity',
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
                    'text-on-surface-variant hover:text-primary transition-colors',
                  )}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign In' })}
                </Link>
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.sp('px', 5),
                    'py-2.5',
                    cm.fontWeight('medium'),
                    cm.textSize('sm'),
                    'bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-lg hover:opacity-90 transition-opacity',
                  )}
                >
                  {t('landing.getStarted', {}, { defaultValue: 'Open Account' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className={cm.cn('pt-32')}>
        {/* Hero — left copy + trust chips, right floating portfolio mockup */}
        <section
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            'mb-24 md:mb-32 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center',
          )}
        >
          <div className={cm.cn('w-full space-y-8 lg:pr-12')}>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-primary',
              )}
            >
              {t('landing.eyebrow', {}, { defaultValue: 'Personal & business banking' })}
            </p>
            <h1
              className={cm.cn(
                'text-5xl lg:text-7xl font-bold tracking-tight text-on-surface leading-tight',
              )}
            >
              {t('landing.heroTitle', {}, { defaultValue: 'Money in motion, always clear.' })}
            </h1>
            <p
              className={cm.cn(
                cm.textSize('lg'),
                'text-on-surface-variant leading-relaxed max-w-xl',
              )}
            >
              {t(
                'landing.heroSubtitle',
                {},
                {
                  defaultValue:
                    'The architectural ledger for modern institutions. Unified accounts, instant transfers, and intelligent insights with zero visual clutter.',
                },
              )}
            </p>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }), 'pt-2')}>
              <Link
                to="/signup"
                className={cm.cn(
                  cm.sp('px', 8),
                  'py-3.5 font-medium bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-lg hover:opacity-90 transition-opacity shadow-[0px_12px_32px_rgba(13,27,42,0.06)] inline-flex items-center gap-2',
                )}
              >
                {t('landing.heroCta', {}, { defaultValue: 'Open an Account' })}
                <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                  arrow_forward
                </span>
              </Link>
              <Link
                to="/login"
                className={cm.cn(
                  'py-3.5 px-8 rounded-lg font-medium text-secondary hover:bg-surface-container-low transition-colors flex items-center gap-2',
                )}
              >
                {t('landing.heroSecondary', {}, { defaultValue: 'See how it works' })}
                <span className={cm.cn('material-symbols-outlined text-sm')} aria-hidden="true">
                  arrow_forward
                </span>
              </Link>
            </div>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'lg', wrap: 'wrap' }),
                'pt-4 text-on-surface-variant opacity-70',
              )}
            >
              {TRUST_CHIPS.map((chip) => (
                <div key={chip.icon} className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                  <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-xl')}>
                    {chip.icon}
                  </span>
                  <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                    {t(chip.labelKey, {}, { defaultValue: chip.defaultLabel })}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Floating portfolio mockup (decorative) */}
          <div className={cm.cn('w-full relative')} aria-hidden="true">
            <div
              className={cm.cn(
                'relative w-full aspect-[4/3] rounded-xl overflow-hidden shadow-[0px_12px_32px_rgba(13,27,42,0.06)] bg-surface-container-lowest border border-outline-variant/15 flex flex-col',
              )}
            >
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between' }),
                  'h-16 border-b border-surface-container-low flex-shrink-0 px-6 bg-surface-container-lowest',
                )}
              >
                <div className={cm.cn(cm.textSize('lg'), 'font-bold text-on-surface')}>
                  {t('landing.mockup.title', {}, { defaultValue: 'Portfolio Overview' })}
                </div>
                <div className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t('landing.mockup.range', {}, { defaultValue: 'Last 30 Days' })}
                </div>
              </div>
              <div className={cm.cn('flex-grow p-8 bg-surface relative flex flex-col gap-6')}>
                <div
                  className={cm.cn(
                    'bg-surface-container-lowest p-6 rounded-lg shadow-sm border border-outline-variant/15 w-2/3',
                  )}
                >
                  <div className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mb-2')}>
                    {t('landing.sampleCardLabel', {}, { defaultValue: 'Total Balance' })}
                  </div>
                  <div
                    className={cm.cn(
                      'text-4xl font-bold text-on-surface tabular-nums tracking-tight',
                    )}
                  >
                    $12,450,000.00
                  </div>
                  <div
                    className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'mt-2 text-primary')}
                  >
                    <span className={cm.cn('material-symbols-outlined text-sm')} aria-hidden="true">
                      trending_up
                    </span>
                    <span
                      className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'tabular-nums')}
                    >
                      +2.4%
                    </span>
                  </div>
                </div>
                <div className={cm.cn('absolute bottom-0 left-0 w-full h-48 bg-primary-fixed/20')}>
                  <svg
                    className={cm.cn('w-full h-full text-primary-container')}
                    preserveAspectRatio="none"
                    viewBox="0 0 100 100"
                  >
                    <path
                      d="M0,100 L0,70 Q20,50 40,65 T80,40 T100,20 L100,100 Z"
                      fill="currentColor"
                      opacity="0.12"
                    />
                    <path
                      d="M0,70 Q20,50 40,65 T80,40 T100,20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats strip */}
        <section
          id="stats"
          className={cm.cn('bg-surface-container-low py-16 mb-24 md:mb-32 scroll-mt-24')}
        >
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6))}>
            <div className={cm.cn(cm.grid({ cols: 2, gap: 12 }), 'md:grid-cols-4')}>
              {STATS.map((stat) => (
                <div key={stat.value} className={cm.cn('space-y-2')}>
                  <div
                    className={cm.cn(
                      'text-4xl font-bold text-primary tabular-nums tracking-tighter',
                    )}
                  >
                    {stat.value}
                  </div>
                  <div className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant font-medium')}>
                    {t(stat.labelKey, {}, { defaultValue: stat.defaultLabel })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Feature grid */}
        <section
          id="features"
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            'mb-24 md:mb-32 scroll-mt-24',
          )}
        >
          <div className={cm.cn(cm.textCenter, 'mb-16 space-y-4')}>
            <h2 className={cm.cn(cm.textSize('3xl'), 'font-bold text-on-surface')}>
              {t('landing.featuresHeading', {}, { defaultValue: 'Engineered for clarity' })}
            </h2>
            <p className={cm.cn('text-on-surface-variant max-w-2xl mx-auto')}>
              {t(
                'landing.featuresSubheading',
                {},
                {
                  defaultValue:
                    'Complex financial logistics distilled into a seamless, high-performance interface.',
                },
              )}
            </p>
          </div>
          <div
            className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}
          >
            {FEATURES.map((f) => (
              <div
                key={f.key}
                className={cm.cn(
                  cm.sp('p', 8),
                  cm.flex({ direction: 'col' }),
                  'bg-surface-container-lowest rounded-xl shadow-[0px_12px_32px_rgba(13,27,42,0.06)] border border-outline-variant/15',
                )}
              >
                <div
                  className={cm.cn(
                    'w-12 h-12 bg-surface-container-low rounded-lg flex items-center justify-center mb-6 text-primary',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cm.cn('material-symbols-outlined text-3xl fill-icon')}
                  >
                    {f.icon}
                  </span>
                </div>
                <h3
                  className={cm.cn(cm.textSize('xl'), cm.sp('mb', 3), 'font-bold text-on-surface')}
                >
                  {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.sp('mb', 8),
                    'text-on-surface-variant leading-relaxed flex-grow',
                  )}
                >
                  {t(`landing.feature.${f.key}.body`, {}, { defaultValue: f.defaultBody })}
                </p>
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'text-secondary hover:opacity-80 transition-opacity',
                  )}
                >
                  {t('landing.feature.learnMore', {}, { defaultValue: 'Learn more' })}
                  <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-sm')}>
                    chevron_right
                  </span>
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* CTA strip */}
        <section className={cm.cn('border-t border-outline-variant/40')}>
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-16 text-center')}>
            <h3 className={cm.cn(cm.textSize('3xl'), cm.sp('mb', 4), 'font-bold tracking-tight')}>
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
                'py-3.5 font-medium bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-lg hover:opacity-90 transition-opacity inline-flex items-center gap-2',
              )}
            >
              {t('landing.heroCta', {}, { defaultValue: 'Open an Account' })}
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer — dark navy band */}
      <footer className={cm.cn('w-full bg-navy text-sm leading-relaxed')}>
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.grid({ cols: 2, gap: 12 }),
            'md:grid-cols-4 py-16 px-6 md:px-8',
          )}
        >
          <div className={cm.cn('col-span-2 md:col-span-1')}>
            <div className={cm.cn('mb-6')}>
              <BrandWordmark as="span" invert footer size="sm" />
            </div>
            <p className={cm.cn('text-navy-muted mt-4')}>
              {t(
                'landing.copyright',
                { year: new Date().getFullYear(), app: APP_NAME },
                { defaultValue: '© {{year}} {{app}}. Member FDIC. Equal Housing Lender.' },
              )}
            </p>
          </div>
          {NAVY_LINK_COLUMNS.map((column) => (
            <div key={column.headingKey}>
              <h4 className={cm.cn('text-white font-medium mb-4')}>
                {t(column.headingKey, {}, { defaultValue: column.headingDefault })}
              </h4>
              <ul className={cm.cn('space-y-3')}>
                {column.links.map((link) => (
                  <li key={link.to + link.labelKey}>
                    <Link
                      to={link.to}
                      className={cm.cn('text-navy-muted hover:text-white transition-colors')}
                    >
                      {t(link.labelKey, {}, { defaultValue: link.labelDefault })}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </footer>
    </div>
  )
}

export default Landing
