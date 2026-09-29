import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'
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
            <BrandWordmark as="span" />
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
        {/* Hero — centered headline over gradient, per Stitch design */}
        <section className={cm.cn('relative overflow-hidden')}>
          <div
            aria-hidden="true"
            className={cm.cn(
              'absolute inset-0 bg-gradient-to-br from-primary-container/20 via-surface to-tertiary-fixed/20 pointer-events-none',
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
              cm.maxW('6xl'),
              cm.mxAuto,
              cm.sp('px', 6),
              'pt-24 pb-20 md:pt-32 md:pb-24 relative',
              cm.flex({ direction: 'col', align: 'center' }),
              cm.textCenter,
            )}
          >
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
                'font-display-serif text-5xl md:text-[3.5rem] font-semibold leading-[1.1] tracking-tight bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent max-w-3xl',
              )}
            >
              {t('landing.heroTitle', { tagline: APP_TAGLINE }, { defaultValue: '{{tagline}}.' })}
            </h1>
            <p
              className={cm.cn(
                cm.textSize('lg'),
                cm.sp('mb', 10),
                'text-on-surface-variant max-w-2xl leading-relaxed mx-auto',
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
            <div
              className={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap', justify: 'center' })}
            >
              <Link
                to="/signup"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 3),
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  'rounded-full text-on-primary bg-gradient-to-r from-primary to-primary-container hover:opacity-90 transition-opacity inline-flex items-center gap-2 shadow-ambient',
                )}
              >
                {t('landing.heroCta', {}, { defaultValue: 'Start translating' })}
                <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                  arrow_forward
                </span>
              </Link>
              <Link
                to="/login"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 3),
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  'rounded-full border border-outline-variant/15 text-primary hover:bg-surface-container-low transition-colors',
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
        </section>

        {/* Translation bridge demo — source ⇄ target panes with center gutter */}
        <section className={cm.cn(cm.maxW('6xl'), cm.mxAuto, cm.sp('px', 6), 'pb-24')}>
          <div className="flex flex-col md:flex-row rounded-[1.5rem] overflow-hidden shadow-ambient bg-surface-container-highest">
            <div className="flex-1 bg-surface-container-lowest p-8 flex flex-col relative group">
              <div
                className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 6))}
              >
                <span className="text-[11px] text-on-surface-variant uppercase tracking-widest font-semibold">
                  {t('landing.demoSourceLabel', {}, { defaultValue: 'Source · English' })}
                </span>
                <span
                  className={cm.cn('material-symbols-outlined text-outline-variant text-sm')}
                  aria-hidden="true"
                >
                  content_copy
                </span>
              </div>
              <p className="font-display-serif text-2xl leading-relaxed text-on-surface font-medium border-l-4 border-transparent group-focus-within:border-tertiary pl-4 outline-none transition-colors">
                {t(
                  'landing.demoSourceText',
                  {},
                  {
                    defaultValue:
                      'The rapid advancement of artificial intelligence is fundamentally changing how we approach complex problem-solving in software engineering.',
                  },
                )}
              </p>
            </div>
            <div className="w-full md:w-2 h-2 md:h-auto bg-surface-container-highest relative flex items-center justify-center">
              <div className="absolute h-full w-[2px] bg-primary-fixed-dim" />
              <div className="w-8 h-8 rounded-full bg-surface-container-lowest shadow-sm flex items-center justify-center z-10 border border-outline-variant/15">
                <span
                  className={cm.cn('material-symbols-outlined text-primary text-sm')}
                  aria-hidden="true"
                >
                  sync_alt
                </span>
              </div>
            </div>
            <div className="flex-1 bg-surface-container-lowest p-8 flex flex-col relative">
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                  cm.sp('mb', 6),
                )}
              >
                <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
                  <span className="text-[11px] text-primary uppercase tracking-widest font-semibold">
                    {t('landing.demoTargetLabel', {}, { defaultValue: 'Target · Spanish' })} →
                  </span>
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      'px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-medium flex items-center gap-1',
                    )}
                  >
                    <span
                      className={cm.cn('material-symbols-outlined text-[10px]')}
                      aria-hidden="true"
                    >
                      bolt
                    </span>
                    {t('landing.demoAiChip', {}, { defaultValue: 'AI generated' })}
                  </span>
                </div>
                <span className="text-[11px] text-tertiary font-semibold whitespace-nowrap">
                  {t('landing.demoConfidence', {}, { defaultValue: '98% confidence' })}
                </span>
              </div>
              <p className="font-display-serif text-2xl leading-relaxed text-on-surface font-medium pl-4 outline-none">
                {t(
                  'landing.demoTargetText',
                  {},
                  {
                    defaultValue:
                      'El rápido avance de la inteligencia artificial está cambiando fundamentalmente cómo abordamos la resolución de problemas complejos en la ingeniería de software.',
                  },
                )}
              </p>
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
                'font-display-serif font-semibold tracking-tight max-w-2xl mx-auto',
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
                'font-display-serif font-semibold tracking-tight max-w-2xl mx-auto',
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
                  <span
                    className={cm.cn(
                      'font-display-serif text-[2.5rem] font-semibold tracking-tight',
                    )}
                  >
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
              className={cm.cn(
                cm.textSize('3xl'),
                cm.sp('mb', 4),
                'font-display-serif font-semibold tracking-tight',
              )}
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
          <BrandWordmark as="span" footer />
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
