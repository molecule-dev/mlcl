import { Link } from 'react-router'

import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'
import { CashHeroCard } from '../components/CashHeroCard.js'
import { SafeLink } from '../components/SafeLink.js'
import { loadContent } from '../config.js'

const FEATURES = [
  {
    key: 'invoicing',
    icon: 'description',
    defaultTitle: 'Polished invoices in seconds',
    defaultBody:
      'A4-formatted, branded, and emailed straight to your client. Track view + payment events end-to-end.',
  },
  {
    key: 'expenses',
    icon: 'receipt_long',
    defaultTitle: 'Expense capture made easy',
    defaultBody:
      'Snap a receipt or drag a CSV. Auto-categorize, match to bank feeds, file deductibles for tax season.',
  },
  {
    key: 'reports',
    icon: 'bar_chart',
    defaultTitle: 'Reports your accountant likes',
    defaultBody:
      'P&L, cash-flow, balance sheet, and sales-tax-by-jurisdiction — all on demand, all exportable.',
  },
  {
    key: 'reconcile',
    icon: 'fact_check',
    defaultTitle: 'Reconcile in one pass',
    defaultBody:
      'Bank feeds and payment processors auto-matched. Unmatched transactions surface with one click.',
  },
] as const

const SOCIAL_PROOF_LOGOS = ['TechCorp', 'GlobalVentures', 'Nexus', 'NovaStudios', 'BrightPath']

const SAMPLE_REVENUE = [
  { month: 'May', amountCents: 712000 },
  { month: 'Jun', amountCents: 825000 },
  { month: 'Jul', amountCents: 654000 },
  { month: 'Aug', amountCents: 890000 },
  { month: 'Sep', amountCents: 945000 },
  { month: 'Oct', amountCents: 1024000 },
  { month: 'Nov', amountCents: 982000 },
  { month: 'Dec', amountCents: 1248000 },
  { month: 'Jan', amountCents: 812000 },
  { month: 'Feb', amountCents: 945000 },
  { month: 'Mar', amountCents: 1124000 },
  { month: 'Apr', amountCents: 2270170 },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <nav
        className={cm.cn(
          'sticky top-0 z-50 bg-surface/95 backdrop-blur-md border-b border-outline-variant',
        )}
      >
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.sp('px', 8),
            cm.h(16),
            cm.flex({ align: 'center', justify: 'between' }),
            cm.mxAuto,
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'xl' }))}>
            <SafeLink to="/" className={cm.cn('shrink-0')} aria-label={APP_NAME}>
              <BrandWordmark as="span" size="lg" />
            </SafeLink>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }), cm.hiddenBelow('md'))}>
              <SafeLink
                to="/#features"
                className={cm.cn(
                  cm.fontWeight('medium'),
                  cm.textSize('sm'),
                  'text-on-surface-variant hover:text-primary transition-colors',
                )}
              >
                {t('common.whatYouGet', {}, { defaultValue: 'Features' })}
              </SafeLink>
              <SafeLink
                to="/pricing"
                className={cm.cn(
                  cm.fontWeight('medium'),
                  cm.textSize('sm'),
                  'text-on-surface-variant hover:text-primary transition-colors',
                )}
              >
                {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
              </SafeLink>
              <SafeLink
                to="/about"
                className={cm.cn(
                  cm.fontWeight('medium'),
                  cm.textSize('sm'),
                  'text-on-surface-variant hover:text-primary transition-colors',
                )}
              >
                {t('nav.about', {}, { defaultValue: 'About' })}
              </SafeLink>
            </div>
          </div>
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('medium'),
                  'bg-primary text-on-primary rounded-lg hover:bg-primary-dark transition-colors',
                )}
              >
                {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className={cm.cn(
                    cm.fontWeight('medium'),
                    'text-primary hover:text-primary-dark transition-colors',
                  )}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Log In' })}
                </Link>
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.fontWeight('medium'),
                    'bg-primary text-on-primary rounded-lg hover:bg-primary-dark transition-colors',
                  )}
                >
                  {t('common.startFreeTrial', {}, { defaultValue: 'Start Free Trial' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        <section
          className={cm.cn(
            cm.maxW('7xl'),
            cm.sp('px', 8),
            cm.sp('py', 20),
            'lg:py-32',
            cm.mxAuto,
            cm.grid({ cols: 2, gap: 'lg' }),
            'lg:items-center',
          )}
        >
          <div className={cm.cn(cm.maxW('xl'))}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.sp('mb', 4),
                'uppercase tracking-[0.3em] text-primary',
              )}
            >
              {t('landing.eyebrow', {}, { defaultValue: 'Small-business accounting, reimagined' })}
            </p>
            <h1
              className={cm.cn(
                cm.fontWeight('extrabold'),
                cm.textSize('5xl'),
                cm.sp('mb', 6),
                'lg:text-6xl text-primary leading-tight tracking-tight',
              )}
            >
              {t('landing.heroTitle', { tagline: APP_TAGLINE }, { defaultValue: '{{tagline}}.' })}
            </h1>
            <p
              className={cm.cn(
                cm.textSize('xl'),
                cm.sp('mb', 8),
                'text-on-surface-variant leading-relaxed',
              )}
            >
              {t(
                'landing.heroSubtitle',
                {},
                {
                  defaultValue:
                    'Invoicing, expenses, payments, and reports for small businesses, bookkeepers, and accountants.',
                },
              )}
            </p>
            <div className={cm.cn('flex flex-wrap', cm.flex({ gap: 'md' }))}>
              <Link
                to="/signup"
                className={cm.cn(
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  cm.textSize('lg'),
                  cm.fontWeight('medium'),
                  'bg-primary text-on-primary rounded-lg hover:bg-primary-dark transition-colors shadow-sm',
                )}
              >
                {t('landing.heroCta', {}, { defaultValue: 'Start free for 30 days' })}
              </Link>
              <Link
                to="/login"
                className={cm.cn(
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  cm.textSize('lg'),
                  cm.fontWeight('medium'),
                  'bg-surface text-primary border border-outline-variant rounded-lg hover:bg-surface-container-low transition-colors',
                )}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Log In' })}
              </Link>
            </div>
          </div>

          {/* Mock browser window — hero visual per the Stitch design */}
          <div className={cm.cn(cm.sp('py', 8), 'lg:py-0')}>
            <div
              data-mol-id="hero-preview-window"
              className={cm.cn(
                'bg-surface-container-low rounded-lg border border-outline-variant shadow-xl overflow-hidden',
              )}
            >
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('p', 3),
                  'bg-surface-container border-b border-outline-variant',
                )}
              >
                <span className="w-3 h-3 rounded-full bg-red-400" aria-hidden="true" />
                <span className="w-3 h-3 rounded-full bg-amber-400" aria-hidden="true" />
                <span className="w-3 h-3 rounded-full bg-green-400" aria-hidden="true" />
              </div>
              <div className={cm.sp('p', 6)}>
                <div className={cm.cn(cm.grid({ cols: 2, gap: 'md' }), cm.sp('mb', 6))}>
                  <div
                    className={cm.cn(
                      cm.sp('p', 4),
                      'bg-surface-container-lowest rounded-lg shadow-sm border border-outline-variant',
                    )}
                  >
                    <p
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('medium'),
                        cm.sp('mb', 1),
                        'text-on-surface-variant',
                      )}
                    >
                      {t('cashHeroCard.ytdRevenueLabel', {}, { defaultValue: 'Total Revenue' })}
                    </p>
                    <p className={cm.cn('text-2xl font-bold text-primary tabular-nums')}>$94.2K</p>
                  </div>
                  <div
                    className={cm.cn(
                      cm.sp('p', 4),
                      'bg-surface-container-lowest rounded-lg shadow-sm border border-outline-variant',
                    )}
                  >
                    <p
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('medium'),
                        cm.sp('mb', 1),
                        'text-on-surface-variant',
                      )}
                    >
                      {t('status.outstanding', {}, { defaultValue: 'Pending Invoices' })}
                    </p>
                    <p
                      className={cm.cn('text-2xl font-bold tabular-nums')}
                      style={{ color: 'var(--color-accent-text)' }}
                    >
                      $34.6K
                    </p>
                  </div>
                </div>
                <div
                  className={cm.cn(
                    cm.sp('p', 6),
                    'bg-surface-container-lowest rounded-lg shadow-sm border border-outline-variant min-h-[200px] flex flex-col justify-center items-center',
                  )}
                >
                  <span
                    className="material-symbols-outlined text-6xl mb-4 text-on-surface-variant/40"
                    aria-hidden="true"
                  >
                    receipt_long
                  </span>
                  <p className={cm.textMuted}>
                    {t(
                      'landing.invoicePreviewLabel',
                      {},
                      { defaultValue: 'Invoice Document Preview' },
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={cm.cn(cm.maxW('7xl'), cm.sp('px', 8), cm.sp('pb', 16), cm.mxAuto)}>
          <CashHeroCard
            cashOnHandCents={1842310}
            outstandingCents={3461150}
            overdueCents={802900}
            ytdRevenueCents={9421084}
            ytdProfitCents={3842330}
            revenueHistory={SAMPLE_REVENUE}
          />
        </section>

        {/* Social proof band */}
        <section
          className={cm.cn(
            'border-y border-outline-variant bg-surface-container-low',
            cm.sp('py', 12),
          )}
        >
          <div className={cm.cn(cm.maxW('7xl'), cm.sp('px', 8), cm.mxAuto, cm.textCenter)}>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                cm.textMuted,
                'uppercase tracking-wider',
                cm.sp('mb', 8),
              )}
            >
              {t(
                'landing.socialProof',
                {},
                { defaultValue: 'Trusted by 12,000+ businesses worldwide' },
              )}
            </p>
            <div
              className={cm.cn(
                cm.flex({ justify: 'center', wrap: 'wrap', gap: 'xl' }),
                'opacity-60 grayscale',
              )}
            >
              {SOCIAL_PROOF_LOGOS.map((name) => (
                <span
                  key={name}
                  className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-on-surface')}
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section
          className={cm.cn(cm.maxW('7xl'), cm.sp('px', 8), cm.sp('py', 20), cm.mxAuto)}
          id="features"
        >
          <div className={cm.cn(cm.textCenter, cm.sp('mb', 12))}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.sp('mb', 3),
                'uppercase tracking-[0.3em] text-on-surface-variant',
              )}
            >
              {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
            </p>
            <h2
              className={cm.cn(
                cm.textSize('3xl'),
                cm.fontWeight('bold'),
                'tracking-tight md:text-4xl',
              )}
            >
              {t('landing.featuresTitle', {}, { defaultValue: 'Every cent, accounted for' })}
            </h2>
          </div>
          <div className={cm.grid({ cols: 4, gap: 'md' })}>
            {FEATURES.map((f) => (
              <div
                key={f.key}
                className={cm.cn(
                  cm.sp('p', 6),
                  'bg-surface-container-lowest rounded-lg border border-outline-variant shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all',
                )}
              >
                <span
                  className={cm.cn(
                    cm.w(12),
                    cm.h(12),
                    'rounded-lg',
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.sp('mb', 5),
                    'bg-primary/10 text-primary',
                  )}
                  aria-hidden="true"
                >
                  <span className="material-symbols-outlined">{f.icon}</span>
                </span>
                <h3
                  className={cm.cn(
                    cm.textSize('lg'),
                    cm.fontWeight('semibold'),
                    cm.sp('mb', 2),
                    'tracking-tight',
                  )}
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

        <section className={cm.cn(cm.maxW('7xl'), cm.sp('px', 8), cm.sp('pb', 24), cm.mxAuto)}>
          <div
            className={cm.cn(cm.sp('p', 12), 'bg-primary rounded-lg text-center text-on-primary')}
          >
            <h2
              className={cm.cn(
                cm.textSize('3xl'),
                cm.fontWeight('bold'),
                cm.sp('mb', 4),
                'tracking-tight md:text-4xl',
              )}
            >
              {t('landing.ctaTitle', {}, { defaultValue: 'Move your books to a calmer place.' })}
            </h2>
            <p className={cm.cn(cm.textSize('lg'), cm.sp('mb', 8), 'text-on-primary/80')}>
              {t(
                'landing.ctaSubtitle',
                {},
                {
                  defaultValue:
                    'Free for 30 days. No card. Bring your accountant — they will thank you.',
                },
              )}
            </p>
            <Link
              to="/signup"
              className={cm.cn(
                cm.sp('px', 8),
                cm.sp('py', 3),
                cm.fontWeight('semibold'),
                'bg-surface-container-lowest text-primary rounded-lg hover:bg-surface-container-low transition-colors inline-block shadow-sm',
              )}
            >
              {t('common.startFreeTrial', {}, { defaultValue: 'Start free trial' })}
            </Link>
          </div>
        </section>
      </main>

      <footer className={cm.cn('bg-surface-container-low border-t border-outline-variant')}>
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.sp('px', 8),
            cm.sp('py', 12),
            cm.mxAuto,
            cm.grid({ cols: 4, gap: 'lg' }),
          )}
        >
          <div>
            <div className={cm.cn(cm.sp('mb', 4), cm.displayBlock)}>
              <BrandWordmark as="span" size="md" footer />
            </div>
            <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
              {t(
                'landing.footerTagline',
                {},
                { defaultValue: 'Precision accounting for modern businesses.' },
              )}
            </p>
          </div>
          <div>
            <h4
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                cm.sp('mb', 4),
                'text-on-surface',
              )}
            >
              {t('footer.product', {}, { defaultValue: 'Product' })}
            </h4>
            <ul className={cm.cn(cm.stack(3), cm.textSize('sm'))}>
              <li>
                <SafeLink
                  to="/pricing"
                  className={cm.cn(cm.textMuted, 'hover:text-primary transition-colors')}
                >
                  {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
                </SafeLink>
              </li>
              <li>
                <SafeLink
                  to="/about"
                  className={cm.cn(cm.textMuted, 'hover:text-primary transition-colors')}
                >
                  {t('nav.about', {}, { defaultValue: 'About' })}
                </SafeLink>
              </li>
            </ul>
          </div>
          <div>
            <h4
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                cm.sp('mb', 4),
                'text-on-surface',
              )}
            >
              {t('footer.legal', {}, { defaultValue: 'Legal' })}
            </h4>
            <div className={cm.cn(cm.stack(3), cm.textSize('sm'))}>
              <LegalModalLinks
                linkClassName={cm.cn(
                  cm.textMuted,
                  'text-left hover:text-primary transition-colors',
                )}
                appName={APP_NAME}
                loadContent={loadContent}
                privacyLabel={t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
                termsLabel={t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
              />
            </div>
          </div>
        </div>
        <div
          className={cm.cn(
            'border-t border-outline-variant',
            cm.sp('py', 6),
            cm.sp('px', 8),
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.flex({ justify: 'between', align: 'center' }),
            cm.textSize('sm'),
            cm.textMuted,
          )}
        >
          <p>
            {t(
              'common.copyrightBuiltWithMolecule',
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
