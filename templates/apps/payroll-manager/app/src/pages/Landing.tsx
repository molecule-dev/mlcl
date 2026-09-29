import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'

const FEATURES = [
  {
    key: 'speed',
    icon: 'bolt',
    iconTint: 'bg-primary-light text-primary-dark',
    defaultTitle: 'Run payroll in minutes',
    defaultBody:
      'Automate the heavy lifting. Review discrepancies instantly and process payroll across all states with a single click.',
  },
  {
    key: 'tax',
    icon: 'account_balance',
    iconTint: 'bg-secondary-light text-secondary-dark',
    defaultTitle: 'Tax filings automated',
    defaultBody:
      'We calculate, file, and pay your federal, state, and local payroll taxes automatically. Guaranteed accurate.',
  },
  {
    key: 'audit',
    icon: 'fact_check',
    iconTint: 'bg-surface-container-high text-on-surface',
    defaultTitle: 'Audit trail built in',
    defaultBody:
      'Every change is logged. Generate complete historical reports for compliance and audits effortlessly.',
  },
] as const

const STATS = [
  { value: '$2.4B', key: 'processed', defaultLabel: 'Processed' },
  { value: '12k+', key: 'employers', defaultLabel: 'Employers' },
  { value: '99.98%', key: 'uptime', defaultLabel: 'Uptime' },
  { value: '50', key: 'states', defaultLabel: 'States Covered' },
] as const

const TRUST_LOGOS = [
  { icon: 'domain', labelKey: 'landing.trustLogos.one', defaultLabel: 'Northwind' },
  { icon: 'corporate_fare', labelKey: 'landing.trustLogos.two', defaultLabel: 'Acme Corp' },
  { icon: 'apartment', labelKey: 'landing.trustLogos.three', defaultLabel: 'Globex' },
  { icon: 'business_center', labelKey: 'landing.trustLogos.four', defaultLabel: 'Initech' },
] as const

const MOCK_NAV = [
  {
    icon: 'dashboard',
    labelKey: 'landing.mockup.nav.dashboard',
    defaultLabel: 'Dashboard',
    active: true,
  },
  {
    icon: 'payments',
    labelKey: 'landing.mockup.nav.payroll',
    defaultLabel: 'Payroll',
    active: false,
  },
  {
    icon: 'people',
    labelKey: 'landing.mockup.nav.employees',
    defaultLabel: 'Employees',
    active: false,
  },
  {
    icon: 'receipt_long',
    labelKey: 'landing.mockup.nav.taxes',
    defaultLabel: 'Taxes',
    active: false,
  },
  {
    icon: 'description',
    labelKey: 'landing.mockup.nav.reports',
    defaultLabel: 'Reports',
    active: false,
  },
] as const

const MOCK_KPIS = [
  {
    icon: 'account_balance',
    labelKey: 'landing.mockup.kpi.payroll.label',
    defaultLabel: 'Total Payroll',
    value: '$142,850.00',
  },
  {
    icon: 'groups',
    labelKey: 'landing.mockup.kpi.employees.label',
    defaultLabel: 'Employees Paid',
    value: '48',
  },
  {
    icon: 'account_balance_wallet',
    labelKey: 'landing.mockup.kpi.taxes.label',
    defaultLabel: 'Taxes Withheld',
    value: '$38,452.12',
  },
] as const

const MOCK_ROWS = [
  {
    nameKey: 'landing.mockup.rows.one.name',
    defaultName: 'Sarah Jenkins',
    roleKey: 'landing.mockup.rows.one.role',
    defaultRole: 'Engineering Lead',
    gross: '$6,250.00',
    taxes: '-$1,875.00',
    net: '$4,375.00',
    ready: true,
  },
  {
    nameKey: 'landing.mockup.rows.two.name',
    defaultName: 'Marcus Chen',
    roleKey: 'landing.mockup.rows.two.role',
    defaultRole: 'Product Designer',
    gross: '$4,800.00',
    taxes: '-$1,344.00',
    net: '$3,456.00',
    ready: true,
  },
  {
    nameKey: 'landing.mockup.rows.three.name',
    defaultName: 'Elena Rodriguez',
    roleKey: 'landing.mockup.rows.three.role',
    defaultRole: 'Marketing Mgr',
    gross: '$5,100.00',
    taxes: '-$1,428.00',
    net: '$3,672.00',
    ready: true,
  },
  {
    nameKey: 'landing.mockup.rows.four.name',
    defaultName: 'David Kim',
    roleKey: 'landing.mockup.rows.four.role',
    defaultRole: 'Sales Exec',
    gross: '$7,500.00',
    taxes: '-$2,400.00',
    net: '$5,100.00',
    ready: false,
  },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-surface text-on-surface antialiased')}>
      <nav
        className={cm.cn(
          'sticky top-0 z-50 bg-surface/90 backdrop-blur-md border-b border-outline-variant shadow-sm',
        )}
      >
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            cm.sp('py', 4),
            cm.flex({ align: 'center', justify: 'between' }),
            'flex-wrap gap-x-6 gap-y-2',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }), 'min-w-0')}>
            <BrandWordmark size="lg" />
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'md' }),
                // AFTER cm.flex: twMerge keeps the last display class, so this
                // must come second or `flex` overrides `hidden` at every width.
                'hidden md:flex',
              )}
            >
              <a
                href="#features"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'whitespace-nowrap text-on-surface-variant hover:text-primary transition-colors',
                )}
              >
                {t('nav.features', {}, { defaultValue: 'Features' })}
              </a>
              <Link
                to="/pricing"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'whitespace-nowrap text-on-surface-variant hover:text-primary transition-colors',
                )}
              >
                {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
              </Link>
              <a
                href="#stats"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'whitespace-nowrap text-on-surface-variant hover:text-primary transition-colors',
                )}
              >
                {t('landing.nav.auditing', {}, { defaultValue: 'Auditing' })}
              </a>
              <Link
                to="/about"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'whitespace-nowrap text-on-surface-variant hover:text-primary transition-colors',
                )}
              >
                {t('nav.about', {}, { defaultValue: 'About' })}
              </Link>
            </div>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'min-w-0 flex-wrap')}>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('medium'),
                  'rounded-lg',
                  'whitespace-nowrap shrink-0',
                  'bg-primary text-on-primary hover:bg-primary-hover transition-colors shadow-sm',
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
                    'hidden md:block whitespace-nowrap',
                    'text-on-surface-variant hover:text-primary transition-colors',
                  )}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign In' })}
                </Link>
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.fontWeight('medium'),
                    'rounded-lg',
                    'whitespace-nowrap shrink-0',
                    'bg-primary text-on-primary hover:bg-primary-hover transition-colors shadow-sm',
                  )}
                >
                  {t('landing.getStarted', {}, { defaultValue: 'Get Started' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="pt-8">
        {/* Hero — centered, per design */}
        <section
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            'pt-16 pb-24 lg:pt-24 lg:pb-32 text-center',
          )}
        >
          <h1
            className={cm.cn(
              cm.sp('mb', 6),
              'text-5xl md:text-7xl font-black tracking-tight text-on-surface font-headline',
            )}
          >
            {t('landing.heroLine1', {}, { defaultValue: 'Every cycle,' })}{' '}
            <span className="text-primary-dark dark:text-primary">
              {t('landing.heroLine2', {}, { defaultValue: 'covered.' })}
            </span>
          </h1>
          <p
            className={cm.cn(
              cm.textSize('lg'),
              cm.sp('mb', 10),
              'md:text-2xl text-on-surface-variant max-w-3xl mx-auto leading-relaxed',
            )}
          >
            {t(
              'landing.heroSubtitle',
              { appName: APP_NAME },
              {
                defaultValue:
                  'Automated payroll, tax filings, and bulletproof compliance. Built for modern businesses that demand precise, reliable, and auditable financial operations.',
              },
            )}
          </p>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center', gap: 'md', wrap: 'wrap' }),
            )}
          >
            <Link
              to="/signup"
              className={cm.cn(
                cm.sp('px', 8),
                'py-3.5',
                cm.fontWeight('medium'),
                'rounded-lg',
                cm.textSize('lg'),
                'w-full sm:w-auto',
                'bg-primary text-on-primary hover:bg-primary-hover transition-colors shadow-sm',
              )}
            >
              {t('landing.heroCta', {}, { defaultValue: 'Start free trial' })}
            </Link>
            <Link
              to="/pricing"
              className={cm.cn(
                cm.sp('px', 8),
                'py-3.5',
                cm.fontWeight('medium'),
                'rounded-lg',
                cm.textSize('lg'),
                'w-full sm:w-auto',
                'bg-surface border border-outline-variant hover:border-on-surface-variant hover:bg-surface-container-low text-on-surface transition-colors',
              )}
            >
              {t('landing.heroCtaSecondary', {}, { defaultValue: 'See pricing' })}
            </Link>
          </div>
          <div className={cm.cn(cm.sp('mt', 16), 'pt-10 border-t border-outline-variant/60')}>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                cm.sp('mb', 6),
                'text-on-surface-variant uppercase tracking-wider',
              )}
            >
              {t(
                'landing.trustLogos.heading',
                {},
                { defaultValue: 'Trusted by fast-growing companies' },
              )}
            </p>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 'lg', wrap: 'wrap' }),
                // #475569 on #ffffff = 7.58:1 (was `opacity-50` on text: #0f172a
                // at 50% blends to #878b95 on white = 3.41:1, axe serious).
                'text-on-surface-variant grayscale',
              )}
            >
              {TRUST_LOGOS.map((logo) => (
                <div
                  key={logo.labelKey}
                  className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.fontWeight('bold'))}
                >
                  <span className={cm.cn('material-symbols-outlined text-2xl')} aria-hidden="true">
                    {logo.icon}
                  </span>
                  <span className={cm.textSize('lg')}>
                    {t(logo.labelKey, {}, { defaultValue: logo.defaultLabel })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Product mockup — sidebar + KPIs + pay-run table, per design */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'mb-32')}>
          <div
            className={cm.cn(
              'rounded-xl',
              'overflow-hidden shadow-2xl border border-outline-variant flex flex-col md:flex-row bg-surface-container-low min-h-[600px]',
            )}
          >
            {/* Sidebar */}
            <div
              className={cm.cn(
                'w-full md:w-64 flex-shrink-0 flex flex-col bg-[var(--color-sidebar)] text-white/70',
              )}
            >
              <div className={cm.cn(cm.sp('p', 4), 'border-b border-white/10')}>
                <span className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-white')}>
                  {t('landing.mockup.company', {}, { defaultValue: 'Acme Corp' })}
                </span>
              </div>
              <nav
                aria-label={t(
                  'landing.mockup.navLabel',
                  {},
                  { defaultValue: 'Product preview navigation' },
                )}
                className={cm.cn(cm.sp('p', 2), 'space-y-1 flex-1')}
              >
                {MOCK_NAV.map((item) => (
                  <span
                    key={item.labelKey}
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'sm' }),
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      'rounded-lg',
                      cm.fontWeight(item.active ? 'medium' : 'normal'),
                      item.active ? 'bg-white/10 text-white' : 'hover:bg-white/5',
                    )}
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">
                      {item.icon}
                    </span>
                    {t(item.labelKey, {}, { defaultValue: item.defaultLabel })}
                  </span>
                ))}
              </nav>
            </div>
            {/* Main content */}
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'lg' }),
                cm.sp('p', 6),
                'flex-1 bg-surface-container-low',
              )}
            >
              <div className={cm.cn(cm.flex({ justify: 'between', align: 'end' }))}>
                <div>
                  <h2
                    className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'text-on-surface')}
                  >
                    {t('landing.mockup.heading', {}, { defaultValue: 'Payroll Overview' })}
                  </h2>
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant tabular-nums')}>
                    {t('landing.mockup.period', {}, { defaultValue: 'Pay Period: Oct 1 – Oct 15' })}
                  </p>
                </div>
                <span
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    'rounded-lg',
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'bg-primary text-on-primary',
                  )}
                >
                  {t('landing.mockup.runPayroll', {}, { defaultValue: 'Run Payroll' })}
                </span>
              </div>
              <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-3')}>
                {MOCK_KPIS.map((kpi) => (
                  <div
                    key={kpi.labelKey}
                    className={cm.cn(
                      cm.sp('p', 5),
                      'rounded-lg',
                      'bg-surface border border-outline-variant shadow-sm',
                    )}
                  >
                    <p
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('medium'),
                        cm.sp('mb', 1),
                        cm.flex({ align: 'center', gap: 'xs' }),
                        'text-on-surface-variant',
                      )}
                    >
                      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                        {kpi.icon}
                      </span>
                      {t(kpi.labelKey, {}, { defaultValue: kpi.defaultLabel })}
                    </p>
                    <p
                      className={cm.cn(
                        cm.textSize('3xl'),
                        cm.fontWeight('bold'),
                        'text-on-surface tabular-nums',
                      )}
                    >
                      {kpi.value}
                    </p>
                  </div>
                ))}
              </div>
              <div
                className={cm.cn(
                  'rounded-lg',
                  'bg-surface border border-outline-variant shadow-sm overflow-hidden flex-1',
                )}
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-container-low border-b border-outline-variant text-xs uppercase tracking-wider text-on-surface-variant font-semibold">
                        <th className={cm.sp('px', 6) + ' py-3'}>
                          {t('landing.mockup.table.employee', {}, { defaultValue: 'Employee' })}
                        </th>
                        <th className={cm.sp('px', 6) + ' py-3'}>
                          {t('landing.mockup.table.role', {}, { defaultValue: 'Role' })}
                        </th>
                        <th className={cm.sp('px', 6) + ' py-3 text-right'}>
                          {t('landing.mockup.table.gross', {}, { defaultValue: 'Gross Pay' })}
                        </th>
                        <th className={cm.sp('px', 6) + ' py-3 text-right'}>
                          {t('landing.mockup.table.taxes', {}, { defaultValue: 'Taxes' })}
                        </th>
                        <th className={cm.sp('px', 6) + ' py-3 text-right'}>
                          {t('landing.mockup.table.net', {}, { defaultValue: 'Net Pay' })}
                        </th>
                        <th className={cm.sp('px', 6) + ' py-3 text-center'}>
                          {t('landing.mockup.table.status', {}, { defaultValue: 'Status' })}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="text-sm tabular-nums divide-y divide-outline-variant/60">
                      {MOCK_ROWS.map((row) => (
                        <tr key={row.nameKey} className="hover:bg-surface-container-low/60">
                          <td
                            className={
                              cm.sp('px', 6) + ' py-4 font-medium text-on-surface whitespace-nowrap'
                            }
                          >
                            {t(row.nameKey, {}, { defaultValue: row.defaultName })}
                          </td>
                          <td
                            className={
                              cm.sp('px', 6) + ' py-4 text-on-surface-variant whitespace-nowrap'
                            }
                          >
                            {t(row.roleKey, {}, { defaultValue: row.defaultRole })}
                          </td>
                          <td className={cm.sp('px', 6) + ' py-4 text-right'}>{row.gross}</td>
                          <td
                            className={cm.sp('px', 6) + ' py-4 text-right text-on-surface-variant'}
                          >
                            {row.taxes}
                          </td>
                          <td
                            className={
                              cm.sp('px', 6) + ' py-4 text-right font-medium text-on-surface'
                            }
                          >
                            {row.net}
                          </td>
                          <td className={cm.sp('px', 6) + ' py-4 text-center'}>
                            <span
                              className={cm.cn(
                                'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                                row.ready
                                  ? 'bg-secondary-light text-secondary-dark'
                                  : 'bg-surface-container-high text-on-surface-variant',
                              )}
                            >
                              {row.ready
                                ? t('landing.mockup.status.ready', {}, { defaultValue: 'Ready' })
                                : t(
                                    'landing.mockup.status.pending',
                                    {},
                                    { defaultValue: 'Pending' },
                                  )}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section
          id="features"
          className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'mb-32')}
        >
          <div className={cm.textCenter + ' ' + cm.sp('mb', 16)}>
            <h2
              className={cm.cn(
                cm.textSize('3xl'),
                'md:text-4xl font-bold text-on-surface mb-4 font-headline',
              )}
            >
              {t(
                'landing.featuresHeading',
                {},
                { defaultValue: 'Precision engineered for finance teams' },
              )}
            </h2>
            <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant max-w-2xl mx-auto')}>
              {t(
                'landing.featuresSubheading',
                {},
                {
                  defaultValue:
                    'Everything you need to run payroll accurately, on time, every time.',
                },
              )}
            </p>
          </div>
          <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-3')}>
            {FEATURES.map((f) => (
              <div
                key={f.key}
                className={cm.cn(
                  cm.sp('p', 8),
                  'rounded-xl',
                  'bg-surface border border-outline-variant shadow-sm hover:shadow-md transition-shadow',
                )}
              >
                <div
                  className={cm.cn(
                    cm.w(12),
                    cm.h(12),
                    'rounded-lg',
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.sp('mb', 6),
                    f.iconTint,
                  )}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    {f.icon}
                  </span>
                </div>
                <h3
                  className={cm.cn(
                    cm.textSize('xl'),
                    cm.fontWeight('bold'),
                    'text-on-surface mb-3',
                  )}
                >
                  {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p className={cm.cn('text-on-surface-variant leading-relaxed')}>
                  {t(`landing.feature.${f.key}.body`, {}, { defaultValue: f.defaultBody })}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Stats band */}
        <section
          id="stats"
          className={cm.cn(
            'bg-primary-light/40 border-y border-primary-light',
            cm.sp('py', 20),
            'mb-32',
          )}
        >
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6))}>
            <div
              className={cm.cn(
                cm.grid({ gap: 'lg' }),
                'grid-cols-2 md:grid-cols-4 text-center divide-x divide-primary-dark/10',
              )}
            >
              {STATS.map((stat) => (
                <div key={stat.key} className={cm.sp('px', 4)}>
                  <p
                    className={cm.cn(
                      cm.textSize('4xl'),
                      'md:text-5xl font-black text-primary-dark dark:text-primary tabular-nums mb-2 font-headline',
                    )}
                  >
                    {stat.value}
                  </p>
                  <p
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('medium'),
                      // #0a5e75 on #ecfdff (primary-light/40 over white) = 6.99:1
                      // (was /70: blends to #4e8e9e = 3.52:1, axe serious).
                      'text-primary-dark uppercase tracking-wider',
                    )}
                  >
                    {t(`landing.stats.${stat.key}`, {}, { defaultValue: stat.defaultLabel })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA strip */}
        <section className={cm.cn(cm.maxW('5xl'), cm.mxAuto, cm.sp('px', 6), 'pb-24 text-center')}>
          <h3
            className={cm.cn(
              cm.textSize('3xl'),
              cm.sp('mb', 4),
              'font-bold tracking-tight font-headline',
            )}
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
              cm.fontWeight('medium'),
              'rounded-lg',
              'bg-primary text-on-primary hover:bg-primary-hover transition-colors shadow-sm inline-flex items-center gap-2',
            )}
          >
            {t('landing.heroCta', {}, { defaultValue: 'Start free trial' })}
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              arrow_forward
            </span>
          </Link>
        </section>
      </main>

      <footer
        className={cm.cn(
          cm.sp('py', 12),
          cm.sp('px', 6),
          cm.textSize('sm'),
          'bg-surface-container-low text-on-surface-variant border-t border-outline-variant',
        )}
      >
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.flex({ direction: 'col', align: 'center', justify: 'between', gap: 'md' }),
            'gap-y-4 md:flex-row',
          )}
        >
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', gap: 'xs' }),
              'md:items-start',
            )}
          >
            <BrandWordmark as="span" size="sm" footer />
            <p>
              {t(
                'landing.copyright',
                { year: new Date().getFullYear(), app: APP_NAME },
                { defaultValue: '© {{year}} {{app}}. Precise. Reliable. Auditable.' },
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
          <nav
            aria-label={t('landing.footer.navLabel', {}, { defaultValue: 'Footer navigation' })}
            className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'flex-wrap justify-center')}
          >
            <Link to="/about" className="hover:text-primary transition-colors">
              {t('nav.about', {}, { defaultValue: 'About' })}
            </Link>
            <Link to="/privacy" className="hover:text-primary transition-colors">
              {t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
            </Link>
            <Link to="/terms" className="hover:text-primary transition-colors">
              {t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
            </Link>
            <Link to="/pricing" className="hover:text-primary transition-colors">
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}

export default Landing
