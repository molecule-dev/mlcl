import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE } from '../branding.js'
import { SafeLink } from '../components/SafeLink.js'

const FEATURES = [
  {
    icon: 'inventory_2',
    titleKey: 'landing.feature.queue.title',
    titleDefault: 'Unified review queue',
    bodyKey: 'landing.feature.queue.body',
    bodyDefault:
      'Pull every flagged item from every surface into one prioritised, keyboard-driven queue.',
  },
  {
    icon: 'smart_toy',
    titleKey: 'landing.feature.ai.title',
    titleDefault: 'AI confidence with reasoning',
    bodyKey: 'landing.feature.ai.body',
    bodyDefault:
      'See not just a verdict but the reasoning, categories and policy violations behind it.',
  },
  {
    icon: 'rule',
    titleKey: 'landing.feature.rules.title',
    titleDefault: 'Visual rule builder',
    bodyKey: 'landing.feature.rules.body',
    bodyDefault:
      'Compose AND/OR conditions, preview matches against historical content, and ship in minutes.',
  },
  {
    icon: 'analytics',
    titleKey: 'landing.feature.analytics.title',
    titleDefault: 'Compliance-ready analytics',
    bodyKey: 'landing.feature.analytics.body',
    bodyDefault:
      'Track verdict trends, AI accuracy and reviewer throughput with audit-ready exports.',
  },
] as const

const STATS = [
  { value: '6.2M', labelKey: 'landing.stat.items', defaultLabel: 'items reviewed weekly' },
  { value: '94.3%', labelKey: 'landing.stat.accuracy', defaultLabel: 'AI verdict accuracy' },
  { value: '<3s', labelKey: 'landing.stat.latency', defaultLabel: 'median time to verdict' },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 8),
          cm.sp('py', 5),
          'border-b border-surface-container/60',
        )}
      >
        <SafeLink to="/" className={cm.cn(cm.flex({ align: 'center' }), 'gap-2')}>
          <span className={cm.cn('text-xl font-black tracking-tighter text-on-surface uppercase')}>
            {APP_NAME}
          </span>
          <span
            className={cm.cn(
              'text-[10px] uppercase tracking-widest font-bold text-on-surface-variant hidden sm:inline',
            )}
          >
            {APP_TAGLINE}
          </span>
        </SafeLink>
        <nav className={cm.cn(cm.flex({ align: 'center' }), 'gap-4 text-sm font-medium')}>
          <a
            href="#features"
            className={cm.cn(
              'hidden md:inline text-on-surface-variant hover:text-primary transition-colors',
            )}
          >
            {t('nav.features', {}, { defaultValue: 'Features' })}
          </a>
          <a
            href="#stats"
            className={cm.cn(
              'hidden md:inline text-on-surface-variant hover:text-primary transition-colors',
            )}
          >
            {t('landing.nav.results', {}, { defaultValue: 'Results' })}
          </a>
          <Link
            to="/pricing"
            className={cm.cn(
              'hidden md:inline text-on-surface-variant hover:text-primary transition-colors',
            )}
          >
            {t('pricing.title', {}, { defaultValue: 'Pricing' })}
          </Link>
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className={cm.cn(
                'bg-gradient-to-br from-primary to-primary-container text-white font-bold text-xs uppercase tracking-wide px-4 py-2 rounded-lg hover:shadow-[0_8px_16px_rgba(249,115,22,0.2)] transition-all',
              )}
            >
              {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className={cm.cn('text-on-surface hover:text-primary transition-colors')}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
              <Link
                to="/signup"
                className={cm.cn(
                  'bg-gradient-to-br from-primary to-primary-container text-white font-bold text-xs uppercase tracking-wide px-4 py-2 rounded-lg hover:shadow-[0_8px_16px_rgba(249,115,22,0.2)] transition-all',
                )}
              >
                {t('landing.nav.requestAccess', {}, { defaultValue: 'Request access' })}
              </Link>
            </>
          )}
        </nav>
      </header>

      <main>
        <section className={cm.cn(cm.sp('px', 8), cm.sp('py', 16), 'relative overflow-hidden')}>
          <div className={cm.cn('max-w-5xl mx-auto text-center relative z-10')}>
            <span
              className={cm.cn(
                'inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-6',
              )}
            >
              <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-[14px]')}>
                shield
              </span>
              {t('landing.eyebrow', {}, { defaultValue: 'Trust & safety, finally calm' })}
            </span>
            <h1
              className={cm.cn(
                'font-headline text-5xl md:text-6xl font-black tracking-tighter text-on-surface mb-6',
              )}
            >
              {t(
                'landing.hero.title',
                {},
                { defaultValue: 'Signal through the noise of online content.' },
              )}
            </h1>
            <p
              className={cm.cn(
                'text-lg md:text-xl text-on-surface-variant max-w-2xl mx-auto mb-10 leading-relaxed',
              )}
            >
              {APP_DESCRIPTION}
            </p>
            <div className={cm.cn(cm.flex({ justify: 'center' }), 'gap-3 flex-wrap')}>
              <Link
                to="/signup"
                className={cm.cn(
                  'bg-gradient-to-br from-primary to-primary-container text-white font-bold text-sm uppercase tracking-wide px-6 py-4 rounded-lg hover:shadow-[0_8px_16px_rgba(249,115,22,0.2)] transition-all',
                )}
              >
                {t('landing.hero.primary', {}, { defaultValue: 'Start your trial' })}
              </Link>
              <Link
                to="/login"
                className={cm.cn(
                  'border border-outline-variant text-on-surface font-bold text-sm uppercase tracking-wide px-6 py-4 rounded-lg hover:bg-surface-container-low transition-colors',
                )}
              >
                {t('landing.hero.secondary', {}, { defaultValue: 'Sign in to console' })}
              </Link>
            </div>
          </div>
          <div
            className={cm.cn(
              'absolute -top-40 left-1/2 -translate-x-1/2 w-[640px] h-[640px] rounded-full blur-3xl pointer-events-none',
            )}
            style={{
              background:
                'radial-gradient(closest-side, color-mix(in srgb, var(--color-primary) 18%, transparent), transparent)',
            }}
            aria-hidden="true"
          />
        </section>

        <section
          id="stats"
          className={cm.cn(
            cm.sp('px', 8),
            cm.sp('py', 12),
            'border-y border-surface-container/60 bg-surface-container-lowest',
          )}
        >
          <div className={cm.cn(cm.grid({ cols: 3, gap: 8 }), 'max-w-5xl mx-auto text-center')}>
            {STATS.map((stat) => (
              <div key={stat.value}>
                <p
                  className={cm.cn(
                    'font-headline text-5xl font-extrabold tracking-tighter text-primary tabular-nums',
                  )}
                >
                  {stat.value}
                </p>
                <p
                  className={cm.cn(
                    'mt-2 text-xs uppercase tracking-widest font-bold text-on-surface-variant',
                  )}
                >
                  {t(stat.labelKey, {}, { defaultValue: stat.defaultLabel })}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section id="features" className={cm.cn(cm.sp('px', 8), cm.sp('py', 20))}>
          <div className={cm.cn('max-w-5xl mx-auto')}>
            <p className={cm.cn('text-xs uppercase tracking-widest font-bold text-primary mb-3')}>
              {t(
                'landing.featuresEyebrow',
                { appName: APP_NAME },
                { defaultValue: 'How {{appName}} works' },
              )}
            </p>
            <h2
              className={cm.cn(
                'font-headline text-4xl font-bold tracking-tight text-on-surface mb-12 max-w-2xl',
              )}
            >
              {t(
                'landing.featuresHeading',
                {},
                { defaultValue: 'Built for teams that review thousands of items per day.' },
              )}
            </h2>
            <div className={cm.cn(cm.grid({ cols: 2, gap: 6 }))}>
              {FEATURES.map((feature) => (
                <article
                  key={feature.titleKey}
                  className={cm.cn(
                    'rounded-xl bg-surface-container-lowest p-6 shadow-sm border border-surface-container/40',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cm.cn(
                      'material-symbols-outlined text-primary bg-primary/10 p-3 rounded-full text-[24px] inline-block mb-4',
                    )}
                  >
                    {feature.icon}
                  </span>
                  <h3
                    className={cm.cn(
                      'font-headline text-xl font-bold tracking-tight text-on-surface mb-2',
                    )}
                  >
                    {t(feature.titleKey, {}, { defaultValue: feature.titleDefault })}
                  </h3>
                  <p className={cm.cn('text-sm text-on-surface-variant leading-relaxed')}>
                    {t(feature.bodyKey, {}, { defaultValue: feature.bodyDefault })}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={cm.cn(cm.sp('px', 8), cm.sp('py', 20))}>
          <div
            className={cm.cn(
              'max-w-3xl mx-auto rounded-2xl bg-gradient-to-br from-primary to-primary-container p-12 text-center text-white shadow-xl relative overflow-hidden',
            )}
          >
            <h2 className={cm.cn('font-headline text-3xl font-bold tracking-tight mb-3')}>
              {t(
                'landing.cta.heading',
                {},
                { defaultValue: 'Ready to give moderators their day back?' },
              )}
            </h2>
            <p className={cm.cn('text-white/80 mb-6')}>
              {t(
                'landing.cta.body',
                { appName: APP_NAME },
                {
                  defaultValue:
                    'Spin up the {{appName}} console with sample data in minutes. No credit card required.',
                },
              )}
            </p>
            <Link
              to="/signup"
              className={cm.cn(
                'inline-flex items-center gap-2 bg-surface text-primary font-bold text-sm uppercase tracking-wide px-6 py-4 rounded-lg hover:bg-surface/90 transition-colors',
              )}
            >
              {t('auth.signup.createYourAccount', {}, { defaultValue: 'Create your account' })}
              <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-[18px]')}>
                arrow_forward
              </span>
            </Link>
            <div
              className={cm.cn(
                'absolute -right-32 -bottom-32 w-[420px] h-[420px] rounded-full bg-surface/10 blur-3xl pointer-events-none',
              )}
              aria-hidden="true"
            />
          </div>
        </section>
      </main>

      <footer
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 8),
          cm.sp('py', 6),
          'border-t border-surface-container/60 text-xs text-on-surface-variant gap-4 flex-wrap',
        )}
      >
        <span>
          © {new Date().getFullYear()} {APP_NAME}
        </span>
        <nav
          className={cm.cn(cm.flex({ align: 'center' }), 'gap-4')}
          aria-label={t('footer.legalNav', {}, { defaultValue: 'Footer' })}
        >
          <Link to="/about" className={cm.cn('hover:text-primary transition-colors')}>
            {t('about.eyebrow', {}, { defaultValue: 'About' })}
          </Link>
          <Link to="/pricing" className={cm.cn('hover:text-primary transition-colors')}>
            {t('pricing.title', {}, { defaultValue: 'Pricing' })}
          </Link>
          <Link to="/terms" className={cm.cn('hover:text-primary transition-colors')}>
            {t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
          </Link>
          <Link to="/privacy" className={cm.cn('hover:text-primary transition-colors')}>
            {t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
          </Link>
        </nav>
        <span>{t('landing.footer.tag', {}, { defaultValue: 'Built with Molecule.dev' })}</span>
      </footer>
    </div>
  )
}

export default Landing
