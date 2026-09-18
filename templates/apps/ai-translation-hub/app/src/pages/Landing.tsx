import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { SafeLink } from '../components/SafeLink.js'

const FEATURES = [
  {
    key: 'ai_assist',
    defaultTitle: 'AI-assisted segments',
    defaultBody:
      'Claude + DeepL pre-fill every target segment with confidence scores, so reviewers focus on nuance — not boilerplate.',
    icon: 'auto_awesome',
    tint: 'text-primary',
  },
  {
    key: 'memory',
    defaultTitle: 'Translation memory',
    defaultBody:
      'Reuse past translations with fuzzy and exact matches, scoped per client and per project — quality compounds.',
    icon: 'storage',
    tint: 'text-secondary',
  },
  {
    key: 'glossary',
    defaultTitle: 'Domain glossary',
    defaultBody:
      'Lock terminology with approved-term checks and inline popovers — no more diverging product names across markets.',
    icon: 'menu_book',
    tint: 'text-tertiary',
  },
  {
    key: 'review',
    defaultTitle: 'Diff-aware review',
    defaultBody:
      'Side-by-side diffs, inline comments, accept/reject — the reviewer flow your linguists already wish they had.',
    icon: 'rate_review',
    tint: 'text-on-secondary-container',
  },
] as const

// Mirrors the real tier ladder in api/src/tiers.ts (Free / Pro / Team) so the
// marketing page never promises plans that Billing and /pricing don't sell.
const PRICING = [
  {
    key: 'free',
    defaultName: 'Free',
    price: '$0',
    cadence: '/mo',
    features: ['5 projects', '5 translations', 'Glossary + translation memory', '90-day retention'],
    cta: 'Start for free',
    accent: false,
  },
  {
    key: 'pro',
    defaultName: 'Pro',
    price: '$15',
    cadence: '/mo',
    features: ['500 projects', '500 translations', 'Advanced AI features', 'Export your data'],
    cta: 'Start with Pro',
    accent: true,
  },
  {
    key: 'team',
    defaultName: 'Team',
    price: '$49',
    cadence: '/mo',
    features: [
      'Unlimited projects',
      'Unlimited translations',
      'Reviewer workflow + comments',
      'No retention limit',
    ],
    cta: 'Get started',
    accent: false,
  },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      {/* TopNav */}
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
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }), 'hidden md:flex')}>
            <a
              href="#features"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant hover:text-on-surface transition-colors',
              )}
            >
              {t('nav.product', {}, { defaultValue: 'Product' })}
            </a>
            <a
              href="#languages"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant hover:text-on-surface transition-colors',
              )}
            >
              {t('landing.nav.languages', {}, { defaultValue: 'Languages' })}
            </a>
            <a
              href="#pricing"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant hover:text-on-surface transition-colors',
              )}
            >
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </a>
          </div>
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                data-mol-id="landing-go-to-dashboard"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  'rounded-full text-on-primary bg-gradient-to-br from-primary to-primary-container hover:opacity-90 transition-opacity shadow-sm shadow-primary/30',
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
                    'text-primary hover:text-primary-container',
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
                    cm.textSize('sm'),
                    'rounded-full text-on-primary bg-gradient-to-br from-primary to-primary-container hover:opacity-90 transition-opacity shadow-sm shadow-primary/30',
                  )}
                >
                  {t('common.getStarted', {}, { defaultValue: 'Get started' })}
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
            aria-hidden="true"
            className={cm.cn(
              'absolute inset-0 bg-gradient-to-br from-primary-container/40 via-surface to-tertiary-fixed/30 pointer-events-none',
            )}
          />
          <div
            aria-hidden="true"
            className={cm.cn(
              'absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full bg-primary/15 blur-[140px]',
            )}
          />
          <div
            className={cm.cn(
              cm.maxW('7xl'),
              cm.mxAuto,
              cm.sp('px', 6),
              'pt-24 pb-20 md:pt-32 md:pb-28 relative',
            )}
          >
            <div className={cm.cn('grid grid-cols-1 lg:grid-cols-12 gap-12 items-center')}>
              <div className={cm.cn('lg:col-span-7')}>
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.sp('mb', 5),
                    'font-bold uppercase tracking-widest text-primary',
                  )}
                >
                  {t('landing.eyebrow', {}, { defaultValue: 'Localization workspace' })}
                </p>
                <h1
                  className={cm.cn(
                    cm.sp('mb', 6),
                    'text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[0.95] bg-gradient-to-r from-primary via-primary-container to-tertiary bg-clip-text text-transparent',
                  )}
                >
                  {t(
                    'landing.heroTitle',
                    { tagline: APP_TAGLINE },
                    { defaultValue: '{{tagline}}.' },
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
                        'The translation workspace for high-performing localization teams. Combine AI precision with editorial layout, translation memory, and a reviewer-ready workflow.',
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
                      'rounded-full text-on-primary bg-gradient-to-br from-primary to-primary-container hover:opacity-90 transition-opacity inline-flex items-center gap-2 shadow-lg shadow-primary/20',
                    )}
                  >
                    {t('landing.heroCta', {}, { defaultValue: 'Start translating' })}
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
                      'rounded-full border border-outline-variant/40 hover:bg-surface-container-low transition-colors',
                    )}
                  >
                    {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                  </Link>
                </div>
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.sp('mt', 8),
                    'text-on-surface-variant font-mono uppercase tracking-widest',
                  )}
                >
                  {t(
                    'landing.proof',
                    {},
                    { defaultValue: 'Trusted by 200+ localization teams · 47 supported languages' },
                  )}
                </p>
              </div>

              {/* Sample translation pane — mirrors Translate page anatomy */}
              <div className={cm.cn('lg:col-span-5')}>
                <div
                  className={cm.cn(
                    'rounded-[2rem] overflow-hidden bg-surface-container-lowest shadow-2xl shadow-primary/10 border border-surface-container-high',
                  )}
                >
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between' }),
                      cm.sp('px', 5),
                      cm.sp('py', 4),
                      'border-b border-surface-container-high bg-surface-container-low',
                    )}
                  >
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        'uppercase tracking-widest font-bold text-on-surface-variant',
                      )}
                    >
                      {t('landing.demoTitle', {}, { defaultValue: 'Live preview' })}
                    </span>
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-bold',
                      )}
                    >
                      <span
                        className={cm.cn('material-symbols-outlined text-[12px]')}
                        aria-hidden="true"
                      >
                        bolt
                      </span>
                      98% AI confidence
                    </span>
                  </div>
                  <div className={cm.cn('grid grid-cols-2')}>
                    <div
                      className={cm.cn(
                        cm.sp('p', 5),
                        'bg-source-pane font-serif-content text-sm border-r border-surface-container',
                      )}
                    >
                      <p
                        className={cm.cn(
                          cm.textSize('xs'),
                          cm.sp('mb', 2),
                          'uppercase tracking-widest font-bold text-on-surface-variant',
                        )}
                      >
                        {t('landing.demoSourceLabel', {}, { defaultValue: 'Source · English' })}
                      </p>
                      <p>
                        The rapid advancement of artificial intelligence is fundamentally changing
                        how we approach complex problem-solving in software engineering.
                      </p>
                    </div>
                    <div
                      className={cm.cn(cm.sp('p', 5), 'bg-target-pane font-serif-content text-sm')}
                    >
                      <p
                        className={cm.cn(
                          cm.textSize('xs'),
                          cm.sp('mb', 2),
                          'uppercase tracking-widest font-bold text-primary',
                        )}
                      >
                        {t('landing.demoTargetLabel', {}, { defaultValue: 'Target · Spanish' })}
                      </p>
                      <p>
                        El rápido avance de la inteligencia artificial está cambiando
                        fundamentalmente cómo abordamos la resolución de problemas complejos en la
                        ingeniería de software.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section
          id="features"
          className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-24')}
        >
          <div className={cm.cn(cm.textCenter, cm.sp('mb', 16))}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.sp('mb', 3),
                'font-bold uppercase tracking-widest text-primary',
              )}
            >
              {t(
                'landing.featuresEyebrow',
                { app: APP_NAME },
                { defaultValue: `Why teams switch to ${APP_NAME}` },
              )}
            </p>
            <h2
              className={cm.cn(
                cm.textSize('4xl'),
                'font-extrabold tracking-tight max-w-2xl mx-auto',
              )}
            >
              {t(
                'landing.featuresHeading',
                {},
                { defaultValue: 'Editorial precision, AI velocity.' },
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
                  'bg-surface-container-lowest rounded-2xl hover:shadow-2xl hover:shadow-primary/5 transition-all group border border-surface-container/50',
                )}
              >
                <div
                  className={cm.cn(
                    cm.sp('p', 3),
                    'inline-flex bg-surface-container-low rounded-xl shadow-sm group-hover:scale-110 transition-transform',
                    f.tint,
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-3xl')} aria-hidden="true">
                    {f.icon}
                  </span>
                </div>
                <h3
                  className={cm.cn(
                    cm.textSize('lg'),
                    cm.sp('mt', 5),
                    cm.sp('mb', 2),
                    cm.fontWeight('bold'),
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

        {/* Languages strip */}
        <section
          id="languages"
          className={cm.cn('border-y border-outline-variant/30 bg-surface-container-low')}
        >
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), cm.sp('py', 12))}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.sp('mb', 6),
                cm.textCenter,
                'font-bold uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t(
                'landing.languagesHeading',
                {},
                { defaultValue: '47 supported languages, 12 specialty domains' },
              )}
            </p>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 'sm', wrap: 'wrap' }),
              )}
            >
              {[
                'en → es',
                'en → fr',
                'en → de',
                'en → ja',
                'en → ko',
                'en → zh-CN',
                'en → pt-BR',
                'fr → en',
                'es → en',
                'de → en',
              ].map((pair) => (
                <span
                  key={pair}
                  className={cm.cn(
                    'px-3 py-1.5 rounded-full bg-secondary-fixed/50 text-on-secondary-fixed font-mono text-xs font-medium',
                  )}
                >
                  {pair}
                </span>
              ))}
              <span
                className={cm.cn(
                  'px-3 py-1.5 rounded-full bg-primary-fixed text-on-primary-fixed font-mono text-xs font-medium',
                )}
              >
                +37 more
              </span>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-24')}>
          <div className={cm.cn(cm.textCenter, cm.sp('mb', 16))}>
            <h2
              className={cm.cn(
                cm.textSize('4xl'),
                'font-extrabold tracking-tight max-w-2xl mx-auto',
              )}
            >
              {t(
                'landing.pricingHeading',
                {},
                { defaultValue: 'Pricing that scales with your locale tree' },
              )}
            </h2>
            <p
              className={cm.cn(
                cm.textSize('base'),
                cm.sp('mt', 4),
                'text-on-surface-variant max-w-xl mx-auto',
              )}
            >
              {t(
                'landing.pricingSubheading',
                {},
                { defaultValue: 'Cancel any time. Two months free on annual billing.' },
              )}
            </p>
          </div>
          <div
            className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-3 items-stretch')}
          >
            {PRICING.map((p) => (
              <div
                key={p.key}
                className={cm.cn(
                  cm.sp('p', 8),
                  cm.flex({ direction: 'col' }),
                  'h-full rounded-[1.5rem] relative transition-transform',
                  p.accent
                    ? 'bg-surface-container-lowest border-2 border-primary/30 shadow-2xl shadow-primary/15 scale-105 z-10'
                    : 'bg-surface-container-low border border-outline-variant/15 hover:-translate-y-1',
                )}
              >
                {p.accent && (
                  <span
                    className={cm.cn(
                      'absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-gradient-to-r from-primary to-primary-container text-on-primary',
                    )}
                  >
                    {t('status.mostPopular', {}, { defaultValue: 'Most popular' })}
                  </span>
                )}
                <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), cm.sp('mb', 2))}>
                  {t(`landing.plan.${p.key}.name`, {}, { defaultValue: p.defaultName })}
                </h3>
                <div className={cm.cn(cm.flex({ align: 'baseline', gap: 'xs' }), cm.sp('mb', 6))}>
                  <span className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
                    {p.price}
                  </span>
                  {p.cadence && (
                    <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                      {p.cadence}
                    </span>
                  )}
                </div>
                <ul
                  className={cm.cn(
                    cm.flex({ direction: 'col', gap: 'sm' }),
                    cm.flex1,
                    cm.sp('mb', 8),
                  )}
                >
                  {p.features.map((f, i) => (
                    <li
                      key={i}
                      className={cm.cn(cm.flex({ align: 'start', gap: 'sm' }), cm.textSize('sm'))}
                    >
                      <span
                        className={cm.cn('material-symbols-outlined text-primary text-base mt-0.5')}
                        aria-hidden="true"
                      >
                        check_circle
                      </span>
                      <span>
                        {t(`landing.plan.${p.key}.feature.${i}`, {}, { defaultValue: f })}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.sp('py', 3),
                    cm.fontWeight('semibold'),
                    cm.textCenter,
                    cm.textSize('sm'),
                    'w-full rounded-full transition-all',
                    p.accent
                      ? 'text-on-primary bg-gradient-to-br from-primary to-primary-container hover:opacity-90 shadow-md shadow-primary/30'
                      : 'border border-outline-variant/30 text-primary hover:bg-surface-container-lowest',
                  )}
                >
                  {t(`landing.plan.${p.key}.cta`, {}, { defaultValue: p.cta })}
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* CTA strip */}
        <section
          className={cm.cn(
            'border-t border-outline-variant/30 bg-gradient-to-br from-primary-container/30 via-surface to-tertiary-fixed/20',
          )}
        >
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-16 text-center')}>
            <h3
              className={cm.cn(cm.textSize('3xl'), cm.sp('mb', 4), 'font-extrabold tracking-tight')}
            >
              {t('landing.ctaHeading', {}, { defaultValue: 'Translate your first project today' })}
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
                    'Free for 14 days. No credit card. Drop a .docx and start reviewing in minutes.',
                },
              )}
            </p>
            <Link
              to="/signup"
              className={cm.cn(
                cm.sp('px', 10),
                cm.sp('py', 4),
                cm.fontWeight('semibold'),
                'rounded-full text-on-primary bg-gradient-to-br from-primary to-primary-container hover:opacity-90 transition-opacity inline-flex items-center gap-2 shadow-lg shadow-primary/20',
              )}
            >
              {t('landing.heroCta', {}, { defaultValue: 'Start translating' })}
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
        </section>
      </main>

      <footer className={cm.cn('bg-surface-container-low border-t border-outline-variant/30')}>
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            cm.sp('py', 10),
            cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }),
          )}
        >
          <p className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight')}>{APP_NAME}</p>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              'text-on-surface-variant uppercase tracking-widest font-bold',
            )}
          >
            {t(
              'landing.copyright',
              { year: new Date().getFullYear(), app: APP_NAME, tagline: APP_TAGLINE },
              { defaultValue: '© {{year}} {{app}}. {{tagline}}.' },
            )}
          </p>
        </div>
      </footer>
    </div>
  )
}

export default Landing
export { Landing as LandingPage }
