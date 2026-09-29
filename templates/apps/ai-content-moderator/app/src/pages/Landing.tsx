import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_DESCRIPTION, APP_NAME } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'
import { SafeLink } from '../components/SafeLink.js'

const FEATURES = [
  {
    icon: 'smart_toy',
    titleKey: 'landing.feature.ai.title',
    titleDefault: 'AI-assisted verdicts',
    bodyKey: 'landing.feature.ai.body',
    bodyDefault:
      'Automate routine decisions and surface high-risk content for human review instantly.',
  },
  {
    icon: 'rule',
    titleKey: 'landing.feature.rules.title',
    titleDefault: 'Rule builder',
    bodyKey: 'landing.feature.rules.body',
    bodyDefault: 'Create complex moderation logic without code. Adapt to new threats in minutes.',
  },
  {
    icon: 'layers',
    titleKey: 'landing.feature.bulk.title',
    titleDefault: 'Bulk moderation',
    bodyKey: 'landing.feature.bulk.body',
    bodyDefault: 'Review and action thousands of items simultaneously with powerful filtering.',
  },
  {
    icon: 'history',
    titleKey: 'landing.feature.audit.title',
    titleDefault: 'Audit trail',
    bodyKey: 'landing.feature.audit.body',
    bodyDefault: 'Immutable logs of every decision made, by AI or human, for full accountability.',
  },
  {
    icon: 'analytics',
    titleKey: 'landing.feature.analytics.title',
    titleDefault: 'Analytics',
    bodyKey: 'landing.feature.analytics.body',
    bodyDefault: 'Deep insights into queue health, team performance, and emerging content trends.',
  },
  {
    icon: 'group_work',
    titleKey: 'landing.feature.team.title',
    titleDefault: 'Team workflows',
    bodyKey: 'landing.feature.team.body',
    bodyDefault: 'Escalation paths, specialized queues, and peer review for complex cases.',
  },
] as const

const COMPLIANCE = [
  {
    icon: 'shield',
    titleKey: 'landing.compliance.soc2.title',
    titleDefault: 'SOC 2 Type II',
    bodyKey: 'landing.compliance.soc2.body',
    bodyDefault:
      'Independently audited for security, availability, and confidentiality principles.',
  },
  {
    icon: 'lock',
    titleKey: 'landing.compliance.gdpr.title',
    titleDefault: 'GDPR',
    bodyKey: 'landing.compliance.gdpr.body',
    bodyDefault: 'Fully compliant with European data protection and privacy regulations.',
  },
  {
    icon: 'health_and_safety',
    titleKey: 'landing.compliance.hipaa.title',
    titleDefault: 'HIPAA',
    bodyKey: 'landing.compliance.hipaa.body',
    bodyDefault: 'Safeguards in place to protect sensitive patient health information.',
  },
] as const

const STATS = [
  { value: '10M+', labelKey: 'landing.stat.items', defaultLabel: 'items reviewed daily' },
  { value: '94%', labelKey: 'landing.stat.accuracy', defaultLabel: 'AI accuracy' },
  { value: '<2s', labelKey: 'landing.stat.latency', defaultLabel: 'avg verdict time' },
  { value: '200+', labelKey: 'landing.stat.customers', defaultLabel: 'enterprise customers' },
] as const

const TRUST_LOGOS = [
  { key: 'landing.trust.logo1', defaultText: 'StreamNet' },
  { key: 'landing.trust.logo2', defaultText: 'NexaCore' },
  { key: 'landing.trust.logo3', defaultText: 'SecureLink' },
  { key: 'landing.trust.logo4', defaultText: 'DataFold' },
  { key: 'landing.trust.logo5', defaultText: 'Nimbusly' },
] as const

const QUEUE_ROWS = [
  {
    line: 'w-3/4',
    pill: 'bg-custom-green/10 text-custom-green',
    accent: 'var(--color-custom-green)',
    labelKey: 'landing.mockup.approved',
    labelDefault: 'Approved',
  },
  {
    line: 'w-1/2',
    pill: 'bg-error/10 text-error',
    accent: 'var(--color-error)',
    labelKey: 'landing.mockup.rejected',
    labelDefault: 'Rejected',
  },
  {
    line: 'w-2/3',
    pill: 'bg-custom-amber/10 text-custom-amber',
    accent: 'var(--color-custom-amber)',
    labelKey: 'landing.mockup.pending',
    labelDefault: 'Pending',
  },
  {
    line: 'w-full',
    pill: 'bg-escalated/10 text-escalated',
    accent: 'var(--color-escalated)',
    labelKey: 'landing.mockup.escalated',
    labelDefault: 'Escalated',
  },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-surface text-on-surface antialiased')}>
      {/* Top navigation — dark navy band */}
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          'fixed top-0 z-50 w-full h-20 bg-navy px-6 md:px-10 text-sm font-medium',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-10')}>
          <SafeLink to="/" className={cm.cn('shrink-0')} aria-label={APP_NAME}>
            <BrandWordmark as="span" invert />
          </SafeLink>
          <nav className={cm.cn(cm.flex({ align: 'center' }), 'hidden md:flex gap-6')}>
            <a
              href="#features"
              className={cm.cn('text-navy-muted hover:text-white transition-colors')}
            >
              {t('nav.features', {}, { defaultValue: 'Product' })}
            </a>
            <a
              href="#compliance"
              className={cm.cn('text-navy-muted hover:text-white transition-colors')}
            >
              {t('landing.nav.compliance', {}, { defaultValue: 'Compliance' })}
            </a>
            <a
              href="#stats"
              className={cm.cn('text-navy-muted hover:text-white transition-colors')}
            >
              {t('landing.nav.results', {}, { defaultValue: 'Customers' })}
            </a>
            <Link
              to="/pricing"
              className={cm.cn('text-navy-muted hover:text-white transition-colors')}
            >
              {t('pricing.title', {}, { defaultValue: 'Pricing' })}
            </Link>
          </nav>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-4')}>
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className={cm.cn(
                'bg-gradient-to-br from-primary to-primary-container text-white px-5 py-2.5 rounded-lg text-sm font-semibold uppercase tracking-wider hover:opacity-90 transition-opacity',
              )}
            >
              {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className={cm.cn(
                  'hidden md:block text-white hover:text-indigo-accent-light transition-colors',
                )}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign In' })}
              </Link>
              <Link
                to="/signup"
                className={cm.cn(
                  'bg-gradient-to-br from-primary to-primary-container text-white px-5 py-2.5 rounded-lg text-sm font-semibold uppercase tracking-wider hover:opacity-90 transition-opacity',
                )}
              >
                {t('landing.nav.requestDemo', {}, { defaultValue: 'Request Demo' })}
              </Link>
            </>
          )}
        </div>
      </header>

      <main>
        {/* Hero — left copy, right moderation-queue mockup */}
        <section
          className={cm.cn(
            'pt-40 pb-24 px-6 md:px-10 bg-surface-container-lowest relative overflow-hidden',
          )}
        >
          <div
            className={cm.cn(
              cm.grid({ cols: 1, gap: 16 }),
              'lg:grid-cols-2 items-center max-w-7xl mx-auto',
            )}
          >
            <div className={cm.cn('max-w-2xl relative z-10')}>
              <h1
                className={cm.cn(
                  'font-headline text-[44px] md:text-[60px] leading-[1.1] font-black tracking-[-0.02em] text-on-surface mb-6',
                )}
              >
                {t('landing.hero.title', {}, { defaultValue: 'Signal through the noise' })}
              </h1>
              <p
                className={cm.cn(
                  'text-lg md:text-xl text-on-surface-variant leading-relaxed mb-10 max-w-lg',
                )}
              >
                {APP_DESCRIPTION}
              </p>
              <div className={cm.cn(cm.flex({}), 'flex-wrap gap-4')}>
                <Link
                  to="/signup"
                  className={cm.cn(
                    'bg-gradient-to-br from-primary to-primary-container text-white px-8 py-4 rounded-lg text-sm font-bold uppercase tracking-wider hover:opacity-90 transition-opacity shadow-[0_20px_40px_rgba(15,23,42,0.15)] flex items-center gap-2',
                  )}
                >
                  {t('landing.hero.primary', {}, { defaultValue: 'Request Demo' })}
                  <span
                    aria-hidden="true"
                    className={cm.cn('material-symbols-outlined text-[18px]')}
                  >
                    arrow_forward
                  </span>
                </Link>
                <Link
                  to="/login"
                  className={cm.cn(
                    'bg-surface-container-high text-on-surface px-8 py-4 rounded-lg text-sm font-bold uppercase tracking-wider hover:bg-surface-container-highest transition-colors',
                  )}
                >
                  {t('landing.hero.secondary', {}, { defaultValue: 'See it in action' })}
                </Link>
              </div>
            </div>
            {/* Decorative moderation-console mockup (design: abstract product preview) */}
            <div className={cm.cn('relative z-10 hidden lg:block')} aria-hidden="true">
              <div
                className={cm.cn(
                  'bg-surface-container-low rounded-xl overflow-hidden shadow-[0_20px_40px_rgba(15,23,42,0.08)] flex h-[500px] border border-outline-variant/15',
                )}
              >
                <div className={cm.cn('w-20 bg-navy flex flex-col items-center py-6 gap-6')}>
                  <div className={cm.cn('w-8 h-8 rounded bg-primary-container/30')} />
                  <div className={cm.cn('w-6 h-6 rounded-full bg-white/10 mt-4')} />
                  <div className={cm.cn('w-6 h-6 rounded-full bg-white/10')} />
                  <div className={cm.cn('w-6 h-6 rounded-full bg-white/10')} />
                </div>
                <div className={cm.cn('flex-1 bg-surface p-6 flex flex-col gap-4')}>
                  <div className={cm.cn('h-8 w-48 bg-surface-container-highest rounded-md mb-4')} />
                  {QUEUE_ROWS.map((row) => (
                    <div
                      key={row.labelKey}
                      className={cm.cn(
                        cm.accentCard({ tone: 'custom' }),
                        'h-16 bg-surface-container-lowest rounded-md flex items-center pr-4 gap-4 shadow-sm',
                      )}
                      style={{ ['--mol-accent' as string]: row.accent }}
                    >
                      <div className={cm.cn('h-10 w-10 rounded bg-surface-container-high')} />
                      <div
                        className={cm.cn(
                          `flex-1 h-4 bg-surface-container-high rounded ${row.line}`,
                        )}
                      />
                      <div
                        className={cm.cn(
                          'w-20 h-6 rounded text-[10px] font-bold uppercase flex items-center justify-center',
                          row.pill,
                        )}
                      >
                        {t(row.labelKey, {}, { defaultValue: row.labelDefault })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust strip — enterprise wordmarks */}
        <section
          className={cm.cn('py-12 bg-surface border-y border-outline-variant/15 overflow-hidden')}
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              'max-w-7xl mx-auto px-6 md:px-10 flex-wrap gap-8 opacity-60 grayscale',
            )}
          >
            {TRUST_LOGOS.map((logo) => (
              <span
                key={logo.key}
                className={cm.cn('text-xl font-black tracking-tight text-on-surface')}
              >
                {t(logo.key, {}, { defaultValue: logo.defaultText })}
              </span>
            ))}
          </div>
        </section>

        {/* Compliance */}
        <section id="compliance" className={cm.cn('py-24 px-6 md:px-10 bg-surface scroll-mt-20')}>
          <div className={cm.cn('max-w-7xl mx-auto')}>
            <div className={cm.cn('mb-16 max-w-2xl')}>
              <h2
                className={cm.cn(
                  'font-headline text-3xl font-bold tracking-tight text-on-surface mb-4',
                )}
              >
                {t(
                  'landing.compliance.heading',
                  {},
                  { defaultValue: 'Built for Enterprise Compliance' },
                )}
              </h2>
              <p className={cm.cn('text-on-surface-variant')}>
                {t(
                  'landing.compliance.subheading',
                  {},
                  {
                    defaultValue:
                      'Security and privacy are foundational. Our platform meets the most stringent global requirements.',
                  },
                )}
              </p>
            </div>
            <div className={cm.cn(cm.grid({ cols: 1, gap: 8 }), 'md:grid-cols-3')}>
              {COMPLIANCE.map((item) => (
                <div
                  key={item.titleKey}
                  className={cm.cn(
                    'bg-surface-container-lowest p-8 rounded-xl flex flex-col gap-4',
                  )}
                >
                  <div
                    className={cm.cn(
                      'h-12 w-12 rounded-full bg-primary-fixed/30 flex items-center justify-center text-primary mb-2',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cm.cn('material-symbols-outlined text-2xl fill-icon')}
                    >
                      {item.icon}
                    </span>
                  </div>
                  <h3 className={cm.cn('font-headline text-xl font-bold text-on-surface')}>
                    {t(item.titleKey, {}, { defaultValue: item.titleDefault })}
                  </h3>
                  <p className={cm.cn('text-on-surface-variant text-sm leading-relaxed')}>
                    {t(item.bodyKey, {}, { defaultValue: item.bodyDefault })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Feature grid */}
        <section
          id="features"
          className={cm.cn('py-24 px-6 md:px-10 bg-surface-container-low scroll-mt-20')}
        >
          <div className={cm.cn('max-w-7xl mx-auto')}>
            <h2
              className={cm.cn(
                'font-headline text-4xl font-black tracking-tight text-on-surface mb-16',
              )}
            >
              {t('landing.featuresHeading', {}, { defaultValue: 'The moderation workbench' })}
            </h2>
            <div className={cm.cn(cm.grid({ cols: 1, gap: 6 }), 'md:grid-cols-2 lg:grid-cols-3')}>
              {FEATURES.map((feature) => (
                <article
                  key={feature.titleKey}
                  className={cm.cn(
                    'bg-surface-container-lowest p-8 rounded-xl flex flex-col h-full hover:shadow-[0_20px_40px_rgba(15,23,42,0.04)] transition-shadow',
                  )}
                >
                  <div
                    className={cm.cn(
                      'mb-6 h-10 w-10 text-primary flex items-center justify-center bg-primary-fixed/20 rounded-lg',
                    )}
                  >
                    <span aria-hidden="true" className={cm.cn('material-symbols-outlined')}>
                      {feature.icon}
                    </span>
                  </div>
                  <h3 className={cm.cn('font-headline text-lg font-bold text-on-surface mb-2')}>
                    {t(feature.titleKey, {}, { defaultValue: feature.titleDefault })}
                  </h3>
                  <p className={cm.cn('text-on-surface-variant text-sm')}>
                    {t(feature.bodyKey, {}, { defaultValue: feature.bodyDefault })}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Stats band */}
        <section id="stats" className={cm.cn('py-20 bg-navy text-white scroll-mt-20')}>
          <div
            className={cm.cn(
              cm.grid({ cols: 2, gap: 12 }),
              'md:grid-cols-4 max-w-7xl mx-auto px-6 md:px-10 text-center md:text-left',
            )}
          >
            {STATS.map((stat) => (
              <div key={stat.value}>
                <p
                  className={cm.cn(
                    'font-headline text-4xl lg:text-5xl font-black tracking-tight mb-2 text-indigo-accent tabular-nums',
                  )}
                >
                  {stat.value}
                </p>
                <p
                  className={cm.cn(
                    'text-sm uppercase tracking-widest font-semibold text-navy-muted',
                  )}
                >
                  {t(stat.labelKey, {}, { defaultValue: stat.defaultLabel })}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Testimonial */}
        <section className={cm.cn('py-32 px-6 md:px-10 bg-surface-container-lowest')}>
          <div className={cm.cn('max-w-4xl mx-auto text-center')}>
            <span
              aria-hidden="true"
              className={cm.cn(
                'material-symbols-outlined icon-6xl text-primary-fixed mb-8 opacity-50 fill-icon',
              )}
            >
              format_quote
            </span>
            <h2
              className={cm.cn(
                'font-headline text-3xl md:text-4xl font-medium leading-tight text-on-surface mb-12',
              )}
            >
              {t(
                'landing.testimonial.quote',
                {},
                {
                  defaultValue:
                    'Sift transformed our Trust & Safety operations. What used to take a team of fifty hours now happens in real-time. The AI doesn’t just block bad content; it provides nuanced context that makes our human reviewers exponentially more effective.',
                },
              )}
            </h2>
            <div className={cm.cn(cm.flex({ direction: 'col', align: 'center' }), 'gap-4')}>
              <div
                className={cm.cn(
                  'w-16 h-16 rounded-full bg-primary-fixed/30 text-primary font-headline font-bold text-xl flex items-center justify-center',
                )}
                aria-hidden="true"
              >
                SJ
              </div>
              <div>
                <p className={cm.cn('font-bold text-on-surface')}>
                  {t('landing.testimonial.name', {}, { defaultValue: 'Sarah Jenkins' })}
                </p>
                <p className={cm.cn('text-sm text-on-surface-variant')}>
                  {t(
                    'landing.testimonial.role',
                    {},
                    { defaultValue: 'Global Head of Trust & Safety, StreamNet' },
                  )}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA band */}
        <section
          className={cm.cn('py-24 bg-gradient-to-br from-primary-container to-primary text-white')}
        >
          <div
            className={cm.cn(
              cm.flex({ justify: 'between', align: 'center' }),
              'max-w-7xl mx-auto px-6 md:px-10 flex-col md:flex-row gap-10',
            )}
          >
            <h2
              className={cm.cn(
                'font-headline text-4xl md:text-5xl font-black tracking-tight max-w-2xl text-center md:text-left',
              )}
            >
              {t('landing.cta.heading', {}, { defaultValue: 'Ready to cut review time in half?' })}
            </h2>
            <div className={cm.cn(cm.flex({}), 'flex-col sm:flex-row gap-4 shrink-0')}>
              <Link
                to="/signup"
                className={cm.cn(
                  'bg-white text-primary px-8 py-4 rounded-lg text-sm font-bold uppercase tracking-wider hover:bg-surface-container-low transition-colors shadow-[0_20px_40px_rgba(15,23,42,0.2)] text-center',
                )}
              >
                {t('landing.nav.requestDemo', {}, { defaultValue: 'Request Demo' })}
              </Link>
              <Link
                to="/login"
                className={cm.cn(
                  'bg-transparent border border-white/30 text-white px-8 py-4 rounded-lg text-sm font-bold uppercase tracking-wider hover:bg-white/10 transition-colors text-center',
                )}
              >
                {t('landing.cta.secondary', {}, { defaultValue: 'Talk to sales' })}
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer — dark navy */}
      <footer
        className={cm.cn('w-full py-20 bg-navy text-xs uppercase tracking-widest font-semibold')}
      >
        <div
          className={cm.cn(
            cm.grid({ cols: 1, gap: 12 }),
            'md:grid-cols-4 max-w-7xl mx-auto px-6 md:px-10',
          )}
        >
          <div className={cm.cn('md:col-span-2')}>
            <div className={cm.cn('mb-6')}>
              <BrandWordmark as="span" invert footer size="sm" />
            </div>
            <p
              className={cm.cn('text-navy-faint normal-case tracking-normal text-sm max-w-sm mb-6')}
            >
              {t(
                'landing.footer.copyright',
                { year: new Date().getFullYear(), appName: APP_NAME },
                {
                  defaultValue: `© ${new Date().getFullYear()} ${APP_NAME}. The Digital Curator. All rights reserved.`,
                },
              )}
            </p>
          </div>
          <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-4')}>
            <Link
              to="/about"
              className={cm.cn('text-navy-faint hover:text-indigo-accent transition-colors')}
            >
              {t('about.eyebrow', {}, { defaultValue: 'About' })}
            </Link>
            <Link
              to="/pricing"
              className={cm.cn('text-navy-faint hover:text-indigo-accent transition-colors')}
            >
              {t('pricing.title', {}, { defaultValue: 'Pricing' })}
            </Link>
          </div>
          <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-4')}>
            <Link
              to="/terms"
              className={cm.cn('text-navy-faint hover:text-indigo-accent transition-colors')}
            >
              {t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
            </Link>
            <Link
              to="/privacy"
              className={cm.cn('text-navy-faint hover:text-indigo-accent transition-colors')}
            >
              {t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
            </Link>
            <span className={cm.cn('text-navy-faint normal-case tracking-normal')}>
              {t('landing.footer.tag', {}, { defaultValue: 'Built with' })}{' '}
              <a
                href="https://molecule.dev"
                target="_blank"
                rel="noopener noreferrer"
                className={cm.cn('hover:underline text-navy-faint')}
              >
                Molecule.dev
              </a>
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing
