import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { BoxThemeCard } from '../components/BoxThemeCard.js'
import { LandingTopNavBar } from '../components/LandingTopNavBar.js'
import { NextBoxHeroCard } from '../components/NextBoxHeroCard.js'
import type { TierPlanCardCadence } from '../components/TierPlanCard.js'
import { TierPlanCard } from '../components/TierPlanCard.js'
import { boxThemes, currentSubscription, tierPlans } from '../lib/demoData.js'

/**
 * Marketing landing — mirrors design-subscription-box-landing.html:
 * terracotta/mint Material-3 surface, "Unbox the unexpected." gradient
 * headline, tilted next-box hero card with floating curation badge, a
 * three-step "Curation Process" band, "Current Curations" cards, and the
 * tier/pricing band. All copy stays in t(); all colors resolve through
 * theme tokens (no raw hex/rgba in JSX — gradients/shadows live in
 * index.css as .btn-gradient/.text-gradient/.ambient-shadow).
 */

const PROCESS_STEPS = [
  {
    key: 'feature1',
    icon: 'palette',
    tint: 'text-primary',
    tileHover: 'group-hover:bg-primary-fixed/40',
    titleDefault: 'Curated by makers, not algorithms',
    bodyDefault:
      'Every {{appName}} edition is hand-picked by a working artist or chef who tells you the story behind each piece.',
  },
  {
    key: 'feature2',
    icon: 'tune',
    tint: 'text-secondary',
    tileHover: 'group-hover:bg-secondary-container/40',
    titleDefault: 'Customize without the friction',
    bodyDefault:
      'Swap items, exclude what you do not want, or skip a box outright. No retention scripts, ever.',
  },
  {
    key: 'feature3',
    icon: 'local_shipping',
    tint: 'text-tertiary',
    tileHover: 'group-hover:bg-tertiary-container/40',
    titleDefault: 'Tracked end-to-end',
    bodyDefault:
      'Every shipment ships in plastic-free packaging with a hand-written note and live tracking from pickup to porch.',
  },
] as const

const EYEBROW = 'text-xs font-bold uppercase tracking-widest text-primary'

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [cadence, setCadence] = useState<TierPlanCardCadence>('monthly')

  const featuredThemes = boxThemes.slice(0, 3)
  // Marketing landing page is unauthenticated — featured-edition cards
  // and tier CTAs cannot deep-link to `/boxes/:id` (those are auth-
  // gated and the demo IDs don't match real plans). Funnel everything
  // through /signup so users actually convert.
  const goToSignup = () => navigate('/signup')

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-surface text-on-surface antialiased')}>
      <LandingTopNavBar />

      {/* Hero — copy left, tilted next-box card + floating badge right */}
      <section
        className={cm.cn(
          cm.maxW('7xl'),
          cm.mxAuto,
          cm.sp('px', 6),
          'pt-12 pb-24 relative overflow-x-clip',
        )}
      >
        <div
          className={cm.cn(
            cm.grid({ gap: 'xl' }),
            'grid-cols-1 md:grid-cols-2 md:items-center relative z-10',
          )}
        >
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }), 'relative')}>
            <div
              className="absolute -top-12 -left-12 w-24 h-24 bg-secondary-container rounded-full opacity-50 blur-2xl"
              aria-hidden="true"
            />
            <h1 className="relative z-10 font-headline text-5xl md:text-7xl font-bold tracking-tight text-on-surface leading-[1.1]">
              {t('landing.hero.headlinePrefix', {}, { defaultValue: 'Unbox the' })}
              <br />
              <span className="text-gradient italic">
                {t('landing.hero.headlineAccent', {}, { defaultValue: 'unexpected.' })}
              </span>
            </h1>
            <p
              className={cm.cn(
                'relative z-10 text-lg md:text-xl text-on-surface-variant max-w-md leading-relaxed',
              )}
            >
              {t(
                'landing.hero.subhead',
                { tagline: APP_TAGLINE, appName: APP_NAME },
                {
                  defaultValue:
                    '{{appName}} sends you a hand-picked, small-batch box of joy from independent makers. Pause anytime. Swap what you want. Keep what you love.',
                },
              )}
            </p>
            <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'md' }), 'pt-4 relative z-10')}>
              <Link
                to="/signup"
                data-mol-id="landing-hero-cta"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 4),
                  cm.fontWeight('semibold'),
                  'inline-flex items-center gap-2 rounded-xl text-white btn-gradient ambient-shadow hover:-translate-y-1 transition-transform',
                )}
              >
                {t('landing.hero.ctaPrimary', {}, { defaultValue: 'Start Your Box' })}
                <span className={cm.cn('material-symbols-outlined text-sm')} aria-hidden="true">
                  arrow_forward
                </span>
              </Link>
              <a
                href="#features"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 4),
                  cm.fontWeight('semibold'),
                  'rounded-xl bg-surface-container-lowest text-on-surface ambient-shadow hover:bg-surface-container-low transition-colors',
                )}
              >
                {t('landing.hero.ctaSecondary', {}, { defaultValue: 'How It Works' })}
              </a>
            </div>
            {/* Social proof row */}
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'relative z-10')}>
              <div className={cm.cn('flex -space-x-3')}>
                {[1, 2, 3, 4].map((i) => (
                  <img
                    key={i}
                    src={`https://i.pravatar.cc/64?img=${30 + i}`}
                    alt=""
                    className={cm.cn(
                      'w-10 h-10 rounded-full border-2 border-surface-container-lowest object-cover',
                    )}
                  />
                ))}
              </div>
              <div className={cm.cn(cm.flex({ direction: 'col' }))}>
                <span className={cm.cn('text-sm font-bold text-on-surface')}>
                  {t(
                    'landing.hero.social.count',
                    { count: '24,300' },
                    { defaultValue: 'Loved by {{count}}+ subscribers' },
                  )}
                </span>
                <span className={cm.cn('text-xs font-medium text-on-surface-variant')}>
                  ★★★★★{' '}
                  {t(
                    'landing.hero.social.rating',
                    { rating: '4.9' },
                    { defaultValue: '{{rating}} avg. unboxing rating' },
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Hero side: the member-dashboard next-box card, presented like the
              design's tilted product shot — coral halo, -2° tilt, floating
              curation badge. */}
          <div className={cm.cn('relative')}>
            <div
              className="absolute inset-0 bg-primary-container/20 rounded-full blur-3xl translate-x-1/4 translate-y-1/4"
              aria-hidden="true"
            />
            <div className="relative z-10 -rotate-2 hover:rotate-0 transition-transform duration-500 rounded-2xl shadow-2xl overflow-hidden">
              <NextBoxHeroCard
                boxTitle={currentSubscription.nextBoxTitle}
                boxTagline={currentSubscription.nextBoxTagline}
                shipsInDays={currentSubscription.shipsInDays}
                shipDate={currentSubscription.shipDate}
                status={currentSubscription.status}
                itemCount={currentSubscription.itemCount}
              />
            </div>
            <div
              className={cm.cn(
                'absolute -bottom-6 -left-2 md:-left-6 bg-surface-container-lowest p-4 rounded-xl ambient-shadow z-20 flex items-center gap-3',
              )}
            >
              <div className="flex w-12 h-12 items-center justify-center rounded-full bg-secondary-container">
                <span
                  className={cm.cn('material-symbols-outlined text-on-secondary-container')}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                  aria-hidden="true"
                >
                  star
                </span>
              </div>
              <div>
                <p className="font-headline font-bold text-on-surface">
                  {t('landing.hero.badgeTitle', {}, { defaultValue: 'Curated Monthly' })}
                </p>
                <p className="text-sm text-on-surface-variant">
                  {t('landing.hero.badgeSub', {}, { defaultValue: '4-6 premium items' })}
                </p>
              </div>
            </div>
            <p
              className={cm.cn(
                'relative z-20 mt-16 text-xs font-medium text-on-surface-variant text-center',
              )}
            >
              {t(
                'landing.hero.previewCaption',
                {},
                {
                  defaultValue:
                    'A peek at the member dashboard — countdown, contents, and tracking.',
                },
              )}
            </p>
          </div>
        </div>
      </section>

      {/* The Curation Process — the design's three-step band */}
      <section
        id="features"
        className={cm.cn(
          'bg-surface-container-low py-24 px-6 md:px-12 relative overflow-hidden scroll-mt-20',
        )}
      >
        <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto)}>
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
              cm.sp('mb', 16),
              cm.textCenter,
            )}
          >
            <h2 className="font-headline text-4xl font-bold tracking-tight text-on-surface">
              {t('landing.process.heading', {}, { defaultValue: 'The Curation Process' })}
            </h2>
            <p className={cm.cn('text-on-surface-variant max-w-xl')}>
              {t(
                'landing.process.sub',
                {},
                {
                  defaultValue:
                    'We scour the globe for the finest crafted goods, so you don’t have to.',
                },
              )}
            </p>
          </div>
          <div
            className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-3 relative z-10')}
          >
            {PROCESS_STEPS.map((step) => (
              <div
                key={step.key}
                className={cm.cn(
                  cm.flex({ direction: 'col', align: 'center' }),
                  cm.textCenter,
                  cm.sp('p', 8),
                  'group bg-surface-container-lowest rounded-xl ambient-shadow hover:-translate-y-2 transition-transform duration-300',
                )}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'w-20 h-20 bg-surface rounded-full mb-6 transition-colors',
                    step.tileHover,
                  )}
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-4xl', step.tint)}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                    aria-hidden="true"
                  >
                    {step.icon}
                  </span>
                </div>
                <h3 className="font-headline text-xl font-bold mb-3 text-on-surface">
                  {t(
                    `landing.${step.key}.title`,
                    { appName: APP_NAME },
                    { defaultValue: step.titleDefault },
                  )}
                </h3>
                <p className={cm.cn('text-sm text-on-surface-variant leading-relaxed')}>
                  {t(
                    `landing.${step.key}.body`,
                    { appName: APP_NAME },
                    { defaultValue: step.bodyDefault },
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Current Curations — featured editions */}
      <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), cm.sp('py', 24))}>
        <div
          className={cm.cn(
            cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' }),
            cm.sp('mb', 12),
          )}
        >
          <div>
            <h2 className="font-headline text-4xl font-bold tracking-tight text-on-surface">
              {t('landing.editions.heading', {}, { defaultValue: 'Current Curations' })}
            </h2>
            <p className={cm.cn('text-on-surface-variant mt-2')}>
              {t(
                'landing.editions.sub',
                {},
                { defaultValue: 'A glimpse into what’s shipping this season.' },
              )}
            </p>
          </div>
          <Link
            to="/boxes"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              'hidden md:flex text-sm font-semibold text-primary hover:underline decoration-2 underline-offset-4',
            )}
          >
            {t('landing.editions.viewAll', {}, { defaultValue: 'View all past boxes' })}
            <span className={cm.cn('material-symbols-outlined text-sm')} aria-hidden="true">
              arrow_forward
            </span>
          </Link>
        </div>
        <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3')}>
          {featuredThemes.map((theme) => (
            <BoxThemeCard key={theme.id} box={theme} to="/signup" />
          ))}
        </div>
      </section>

      {/* Tier selector — the design's "Commit to Curiosity" pricing band */}
      <section
        id="tiers"
        className={cm.cn('bg-surface-container-low py-24 px-6 md:px-12 scroll-mt-20')}
      >
        <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto)}>
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
              cm.sp('mb', 12),
            )}
          >
            <span className={EYEBROW}>
              {t('landing.tiers.eyebrow', {}, { defaultValue: 'Pick your cadence' })}
            </span>
            <h2 className="font-headline text-3xl md:text-5xl font-bold tracking-tight text-center text-on-surface max-w-3xl">
              {t('landing.tiers.heading', {}, { defaultValue: 'Commit to curiosity' })}
            </h2>
            <p className={cm.cn('text-on-surface-variant max-w-xl text-center')}>
              {t(
                'landing.tiers.sub',
                {},
                { defaultValue: 'Choose how often you want to be surprised. Cancel anytime.' },
              )}
            </p>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('p', 1),
                cm.roundedFull,
                'bg-surface-container-lowest border border-outline-variant/40 mt-2',
              )}
            >
              {(['monthly', 'annual'] as TierPlanCardCadence[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setCadence(mode)}
                  className={cm.cn(
                    cm.sp('px', 6),
                    cm.sp('py', 2),
                    cm.fontWeight('bold'),
                    cm.roundedFull,
                    'text-sm transition-all duration-200',
                    cadence === mode
                      ? 'bg-primary text-on-primary shadow-md'
                      : 'text-on-surface-variant hover:text-on-surface',
                  )}
                >
                  {t(
                    `landing.tiers.cadence.${mode}`,
                    {},
                    { defaultValue: mode === 'monthly' ? 'Monthly' : 'Annual · save 17%' },
                  )}
                </button>
              ))}
            </div>
          </div>
          <div
            className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-3 items-stretch')}
          >
            {tierPlans.map((plan) => (
              <TierPlanCard key={plan.id} plan={plan} cadence={cadence} onSelect={goToSignup} />
            ))}
          </div>
        </div>
      </section>

      {/* Footer — wordmark, uppercase links, credit line */}
      <footer className={cm.cn('bg-surface-container border-t border-outline-variant/30 mt-12')}>
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            cm.sp('py', 12),
            cm.flex({ direction: 'col', gap: 'lg' }),
            'md:flex-row md:justify-between md:items-center',
          )}
        >
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
            <span className="font-headline italic text-lg font-bold text-on-surface">
              {APP_NAME}
            </span>
            <span className={cm.cn('text-sm text-on-surface-variant')}>
              {t(
                'landing.footer.tagline',
                { tagline: APP_TAGLINE },
                { defaultValue: '{{tagline}}.' },
              )}
            </span>
          </div>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', wrap: 'wrap', gap: 'lg' }),
              'text-xs font-semibold uppercase tracking-widest',
            )}
          >
            <Link
              to="/login"
              className={cm.cn('text-on-surface-variant hover:text-primary transition-colors')}
            >
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </Link>
            <Link
              to="/signup"
              className={cm.cn('text-on-surface-variant hover:text-primary transition-colors')}
            >
              {t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
            </Link>
            <a
              href="mailto:hello@crate.example"
              className={cm.cn('text-on-surface-variant hover:text-primary transition-colors')}
            >
              {t('landing.footer.contact', {}, { defaultValue: 'Talk to a curator' })}
            </a>
          </div>
          <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-primary')}>
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
