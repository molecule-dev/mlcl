import { Link } from 'react-router'

import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
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
          'sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-outline-variant',
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
          <SafeLink to="/" className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
            <span
              className={cm.cn(
                cm.w(9),
                cm.h(9),
                'rounded-xl',
                cm.flex({ align: 'center', justify: 'center' }),
                'bg-primary text-white',
              )}
              aria-hidden="true"
            >
              <span className={cm.cn('material-symbols-outlined text-xl')}>account_balance</span>
            </span>
            <span className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tracking-tight')}>
              {APP_NAME}
            </span>
          </SafeLink>
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  'bg-primary text-on-primary rounded-full hover:bg-primary-dark transition-colors',
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
                    'bg-primary text-on-primary rounded-full hover:bg-primary-dark transition-colors',
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
        <section className={cm.cn(cm.sp('py', 24), 'relative overflow-hidden')}>
          <div className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.mxAuto, cm.textCenter)}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.sp('mb', 6),
                'uppercase tracking-[0.3em] text-primary',
              )}
            >
              {t('landing.eyebrow', {}, { defaultValue: 'Small-business accounting, reimagined' })}
            </p>
            <h1
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.sp('mb', 6),
                'text-5xl md:text-6xl lg:text-7xl tracking-tight leading-[0.95]',
              )}
            >
              {t('landing.heroTitle', { tagline: APP_TAGLINE }, { defaultValue: '{{tagline}}.' })}
            </h1>
            <p
              className={cm.cn(
                cm.textSize('lg'),
                cm.sp('mb', 10),
                cm.maxW('2xl'),
                cm.mxAuto,
                'text-on-surface-variant',
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
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 'md' }),
                cm.sp('mb', 16),
              )}
            >
              <Link
                to="/signup"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 3),
                  cm.fontWeight('semibold'),
                  'bg-primary text-on-primary rounded-full hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20',
                )}
              >
                {t('landing.heroCta', {}, { defaultValue: 'Start free for 30 days' })}
              </Link>
              <Link
                to="/login"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 3),
                  cm.fontWeight('semibold'),
                  'bg-surface-container text-on-surface rounded-full hover:bg-surface-container-high transition-colors',
                )}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
            </div>

            <div className={cm.cn(cm.maxW('5xl'), cm.mxAuto, 'text-left')}>
              <CashHeroCard
                cashOnHandCents={1842310}
                outstandingCents={3461150}
                overdueCents={802900}
                ytdRevenueCents={9421084}
                ytdProfitCents={3842330}
                revenueHistory={SAMPLE_REVENUE}
              />
            </div>
          </div>
        </section>

        <section className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.sp('py', 20), cm.mxAuto)}>
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
                  'bg-surface-container-lowest rounded-2xl border border-outline-variant hover:-translate-y-0.5 transition-transform',
                )}
              >
                <span
                  className={cm.cn(
                    cm.w(11),
                    cm.h(11),
                    'rounded-xl',
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.sp('mb', 4),
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

        <section className={cm.cn(cm.sp('py', 16), 'bg-surface-container-low')}>
          <div className={cm.cn(cm.maxW('5xl'), cm.sp('px', 6), cm.mxAuto, cm.textCenter)}>
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
            <p className={cm.cn(cm.textSize('lg'), cm.sp('mb', 8), 'text-on-surface-variant')}>
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
                'bg-primary text-on-primary rounded-full hover:bg-primary-dark transition-colors inline-block shadow-lg shadow-primary/20',
              )}
            >
              {t('common.startFreeTrial', {}, { defaultValue: 'Start free trial' })}
            </Link>
          </div>
        </section>
      </main>

      <footer
        className={cm.cn(
          cm.sp('py', 8),
          cm.textCenter,
          cm.textSize('sm'),
          'bg-surface border-t border-outline-variant text-on-surface-variant',
        )}
      >
        <nav
          data-mol-id="footer-links"
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 'lg' }),
            cm.sp('mb', 3),
            'flex-wrap',
          )}
        >
          <SafeLink
            to="/about"
            className={cm.cn(cm.fontWeight('medium'), 'hover:text-on-surface transition-colors')}
          >
            {t('nav.about', {}, { defaultValue: 'About' })}
          </SafeLink>
          <SafeLink
            to="/pricing"
            className={cm.cn(cm.fontWeight('medium'), 'hover:text-on-surface transition-colors')}
          >
            {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
          </SafeLink>
          <LegalModalLinks
            linkClassName={cm.cn(
              cm.fontWeight('medium'),
              'hover:text-on-surface transition-colors',
            )}
            appName={APP_NAME}
            loadContent={loadContent}
            privacyLabel={t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
            termsLabel={t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
          />
        </nav>
        <p>
          {t(
            'common.copyrightBuiltWithMolecule',
            { year: new Date().getFullYear(), app: APP_NAME },
            { defaultValue: '© {{year}} {{app}}. Built with Molecule.' },
          )}
        </p>
      </footer>
    </div>
  )
}
