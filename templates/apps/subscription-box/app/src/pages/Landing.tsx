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
    <div className={cm.cn(cm.minH('screen'), 'bg-surface-container-low text-on-surface')}>
      <LandingTopNavBar />

      {/* Hero */}
      <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), cm.sp('py', 16))}>
        <div className={cm.cn(cm.grid({ gap: 'lg' }), 'lg:grid-cols-12')}>
          <div className={cm.cn('lg:col-span-7', cm.flex({ direction: 'col', gap: 'lg' }))}>
            <span
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.fontWeight('bold'),
                cm.roundedFull,
                'self-start text-[10px] uppercase tracking-widest bg-primary-fixed/40 text-primary',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-base')}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                star
              </span>
              {t('landing.hero.eyebrow', {}, { defaultValue: 'Curated monthly. Always personal.' })}
            </span>
            <h1
              className={cm.cn(
                'text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[0.95] text-on-surface',
              )}
            >
              {t(
                'landing.hero.headline',
                { app: APP_NAME },
                { defaultValue: 'Unbox the unexpected, every month.' },
              )}
            </h1>
            <p
              className={cm.cn(
                'text-lg md:text-xl text-on-surface-variant max-w-2xl leading-relaxed',
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
            <div className={cm.cn(cm.flex({ align: 'center', wrap: 'wrap', gap: 'sm' }))}>
              <Link
                to="/signup"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 4),
                  cm.fontWeight('bold'),
                  cm.roundedFull,
                  'text-base bg-primary text-on-primary hover:bg-primary-hover hover:shadow-xl active:scale-95 transition-all',
                )}
              >
                {t('landing.hero.ctaPrimary', {}, { defaultValue: 'Start your box →' })}
              </Link>
              <Link
                to="#tiers"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 4),
                  cm.fontWeight('bold'),
                  cm.roundedFull,
                  'text-base border-2 border-on-surface text-on-surface hover:bg-on-surface hover:text-surface transition-all',
                )}
              >
                {t('landing.hero.ctaSecondary', {}, { defaultValue: 'See tiers' })}
              </Link>
            </div>
            {/* Social proof row */}
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), cm.sp('mt', 4))}>
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

          {/* Hero side: a sample of the auth'd dashboard hero */}
          <div className={cm.cn('lg:col-span-5', cm.flex({ direction: 'col', gap: 'md' }))}>
            <NextBoxHeroCard
              boxTitle={currentSubscription.nextBoxTitle}
              boxTagline={currentSubscription.nextBoxTagline}
              shipsInDays={currentSubscription.shipsInDays}
              shipDate={currentSubscription.shipDate}
              status={currentSubscription.status}
              itemCount={currentSubscription.itemCount}
            />
            <p className={cm.cn('text-xs font-medium text-on-surface-variant text-center')}>
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

      {/* Featured editions */}
      <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), cm.sp('py', 12))}>
        <div
          className={cm.cn(
            cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' }),
            cm.sp('mb', 8),
          )}
        >
          <div>
            <span className={cm.cn('text-xs font-bold uppercase tracking-widest text-primary')}>
              {t('landing.editions.eyebrow', {}, { defaultValue: 'This season' })}
            </span>
            <h2
              className={cm.cn(
                'text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface',
              )}
            >
              {t(
                'landing.editions.heading',
                {},
                { defaultValue: 'Editions our curators are loving' },
              )}
            </h2>
          </div>
          <Link
            to="/boxes"
            className={cm.cn(
              'text-sm font-bold text-primary hover:underline decoration-2 underline-offset-4',
            )}
          >
            {t('landing.editions.viewAll', {}, { defaultValue: 'Browse all editions →' })}
          </Link>
        </div>
        <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3')}>
          {featuredThemes.map((theme) => (
            <BoxThemeCard key={theme.id} box={theme} to="/signup" />
          ))}
        </div>
      </section>

      {/* Feature triad */}
      <section
        id="features"
        className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), cm.sp('py', 16))}
      >
        <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-3')}>
          {[
            {
              icon: 'palette',
              titleKey: 'landing.feature1.title',
              titleDefault: 'Curated by makers, not algorithms',
              bodyKey: 'landing.feature1.body',
              bodyDefault:
                'Every {{appName}} edition is hand-picked by a working artist or chef who tells you the story behind each piece.',
            },
            {
              icon: 'tune',
              titleKey: 'landing.feature2.title',
              titleDefault: 'Customize without the friction',
              bodyKey: 'landing.feature2.body',
              bodyDefault:
                'Swap items, exclude what you do not want, or skip a box outright. No retention scripts, ever.',
            },
            {
              icon: 'local_shipping',
              titleKey: 'landing.feature3.title',
              titleDefault: 'Tracked end-to-end',
              bodyKey: 'landing.feature3.body',
              bodyDefault:
                'Every shipment ships in plastic-free packaging with a hand-written note and live tracking from pickup to porch.',
            },
          ].map((feat) => (
            <div
              key={feat.titleKey}
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'sm' }),
                cm.sp('p', 8),
                'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 hover:shadow-md transition-shadow',
              )}
            >
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  'w-12 h-12 rounded-xl bg-primary-fixed/30 text-primary',
                )}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-2xl')}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {feat.icon}
                </span>
              </span>
              <h3 className={cm.cn('text-lg font-extrabold tracking-tight text-on-surface')}>
                {t(feat.titleKey, {}, { defaultValue: feat.titleDefault })}
              </h3>
              <p className={cm.cn('text-sm text-on-surface-variant leading-relaxed')}>
                {t(feat.bodyKey, { appName: APP_NAME }, { defaultValue: feat.bodyDefault })}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Tier selector */}
      <section
        id="tiers"
        className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), cm.sp('py', 16))}
      >
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
            cm.sp('mb', 10),
          )}
        >
          <span className={cm.cn('text-xs font-bold uppercase tracking-widest text-primary')}>
            {t('landing.tiers.eyebrow', {}, { defaultValue: 'Pick your cadence' })}
          </span>
          <h2
            className={cm.cn(
              'text-3xl md:text-5xl font-extrabold tracking-tight text-center text-on-surface max-w-3xl',
            )}
          >
            {t(
              'landing.tiers.heading',
              {},
              { defaultValue: 'Start small, upgrade anytime, cancel just as easily.' },
            )}
          </h2>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('p', 1),
              cm.roundedFull,
              'bg-surface-container-low border border-outline-variant/30',
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
        <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-3 items-stretch')}>
          {tierPlans.map((plan) => (
            <TierPlanCard key={plan.id} plan={plan} cadence={cadence} onSelect={goToSignup} />
          ))}
        </div>
      </section>

      {/* Footer band */}
      <footer className={cm.cn('border-t border-outline-variant/30 bg-surface-container-lowest')}>
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            cm.sp('py', 12),
            cm.flex({ direction: 'col', gap: 'md' }),
            'md:flex-row md:justify-between md:items-center',
          )}
        >
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
            <span className={cm.cn('text-2xl font-extrabold tracking-tight text-on-surface')}>
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
              'text-sm font-medium',
            )}
          >
            <Link
              to="/login"
              className={cm.cn('text-on-surface-variant hover:text-on-surface transition-colors')}
            >
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </Link>
            <Link
              to="/signup"
              className={cm.cn('text-on-surface-variant hover:text-on-surface transition-colors')}
            >
              {t('auth.signup.createAccount', {}, { defaultValue: 'Create account' })}
            </Link>
            <a
              href="mailto:hello@crate.example"
              className={cm.cn('text-on-surface-variant hover:text-on-surface transition-colors')}
            >
              {t('landing.footer.contact', {}, { defaultValue: 'Talk to a curator' })}
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing
