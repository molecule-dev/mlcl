import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_TAGLINE } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'
import { Footer } from '../components/Footer.js'

const FEATURES = [
  {
    key: 'library',
    defaultTitle: '50 million songs',
    defaultBody:
      'Major labels, indies, and global imports. The catalog you actually want, ad-free.',
    icon: 'library_music',
  },
  {
    key: 'curated',
    defaultTitle: 'Curated for your week',
    defaultBody: 'Daily Mix, Discover Weekly, Release Radar. Your taste, learned every day.',
    icon: 'auto_awesome',
  },
  {
    key: 'lossless',
    defaultTitle: 'Lossless audio',
    defaultBody: 'FLAC quality on every device. Spatial audio in supported tracks.',
    icon: 'graphic_eq',
  },
  {
    key: 'social',
    defaultTitle: 'Listen together',
    defaultBody: "Live-sync your queue with friends. See what they're hearing right now.",
    icon: 'group',
  },
] as const

const STATS = [
  { key: 'songs', defaultLabel: 'Songs', value: '50M+' },
  { key: 'playlists', defaultLabel: 'Playlists made', value: '4.2B' },
  { key: 'listeners', defaultLabel: 'Active listeners', value: '180M' },
  { key: 'genres', defaultLabel: 'Genres covered', value: '700+' },
]

const FREE_FEATURES = [
  { key: 'f1', defaultText: 'Ad-supported listening' },
  { key: 'f2', defaultText: 'Standard audio quality' },
  { key: 'f3', defaultText: 'Mobile shuffle play' },
] as const

const PREMIUM_FEATURES = [
  { key: 'p1', defaultText: 'Ad-free music listening' },
  { key: 'p2', defaultText: 'Lossless audio quality' },
  { key: 'p3', defaultText: 'Offline downloads' },
  { key: 'p4', defaultText: 'Unlimited skips' },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  const pillCta =
    'px-8 py-4 font-bold text-sm tracking-widest uppercase rounded-full transition-all duration-300'

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <nav
        className={cm.cn(
          'sticky top-0 z-50 bg-surface/70 backdrop-blur-xl shadow-[0_32px_48px_-12px_color-mix(in_oklab,var(--color-primary)_4%,transparent)]',
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
          <BrandWordmark size="lg" />
          <div className={cm.flex({ align: 'center', gap: 'lg' })}>
            <Link
              to="/pricing"
              className="hidden text-sm font-medium uppercase tracking-widest text-on-surface-variant transition-colors hover:text-on-surface md:block"
            >
              {t('landing.pricingLink', {}, { defaultValue: 'Pricing' })}
            </Link>
            {isAuthenticated ? (
              <Link
                to="/home"
                data-mol-id="landing-go-dashboard"
                className={cm.cn(
                  pillCta,
                  'px-6 py-2 bg-primary-container text-on-primary-container hover:opacity-90',
                )}
              >
                {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden text-sm font-medium uppercase tracking-widest text-on-surface-variant transition-colors hover:text-on-surface md:block"
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  data-mol-id="landing-try-free"
                  className={cm.cn(
                    pillCta,
                    'px-6 py-2 bg-primary-container text-on-primary-container hover:opacity-90',
                  )}
                >
                  {t('landing.getStarted', {}, { defaultValue: 'Try free' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        {/* Hero — centered over a violet radial glow with floating cover shapes */}
        <section className="relative flex min-h-[560px] items-center justify-center overflow-hidden bg-surface-container-lowest md:min-h-[720px]">
          <div
            className="absolute inset-0 bg-[radial-gradient(circle_at_center,color-mix(in_oklab,var(--color-primary)_40%,transparent)_0%,var(--color-surface-container-lowest)_70%)]"
            aria-hidden="true"
          />
          <div
            className="absolute top-20 right-20 h-64 w-64 rotate-12 rounded-lg bg-primary-container opacity-20 blur-xl"
            aria-hidden="true"
          />
          <div
            className="absolute bottom-20 left-20 h-48 w-48 -rotate-6 rounded-lg bg-secondary opacity-10 blur-lg"
            aria-hidden="true"
          />
          <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
            <h1 className="mb-10 text-5xl font-black leading-tight tracking-tight text-on-surface md:text-6xl lg:text-[72px]">
              {t('landing.heroTitle', { tagline: APP_TAGLINE }, { defaultValue: '{{tagline}}' })}
            </h1>
            <div
              className={cm.cn(
                cm.flex({ gap: 'md', wrap: 'wrap' }),
                'flex-col items-center justify-center sm:flex-row',
              )}
            >
              <Link
                to="/signup"
                data-mol-id="landing-hero-signup"
                className={cm.cn(
                  pillCta,
                  'w-full bg-primary-container text-on-primary-container hover:opacity-90 sm:w-auto',
                )}
              >
                {t('landing.heroCta', {}, { defaultValue: 'Start listening — free for 30 days' })}
              </Link>
              <Link
                to="/pricing"
                data-mol-id="landing-hero-premium"
                className={cm.cn(
                  pillCta,
                  'w-full border border-outline-variant text-on-surface hover:bg-surface-bright sm:w-auto',
                )}
              >
                {t('landing.heroPremiumCta', {}, { defaultValue: 'Try premium 30 days' })}
              </Link>
            </div>
          </div>
        </section>

        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-12')}>
          <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-2 md:grid-cols-4')}>
            {STATS.map((s) => (
              <div
                key={s.key}
                className={cm.cn(
                  'rounded-xl bg-surface-container p-6 text-center hover:shadow-lg transition-shadow',
                )}
              >
                <p
                  className={cm.cn(
                    'text-3xl md:text-4xl font-black tracking-tight text-primary tabular-nums',
                  )}
                >
                  {s.value}
                </p>
                <p
                  className={cm.cn(
                    'text-xs font-bold uppercase tracking-widest text-on-surface-variant mt-2',
                  )}
                >
                  {t(`landing.stat.${s.key}`, {}, { defaultValue: s.defaultLabel })}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Feature cards — Sonic Noir surface-container panels with filled icons */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-20')}>
          <h2 className={cm.cn('mb-12 text-center text-3xl md:text-4xl font-black tracking-tight')}>
            {t(
              'landing.featuresHeading',
              {},
              { defaultValue: 'Built for people who actually listen' },
            )}
          </h2>
          <div
            className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}
          >
            {FEATURES.map((f) => (
              <div
                key={f.key}
                className={cm.cn(
                  'group relative overflow-hidden rounded-xl bg-surface-container p-8 transition-all',
                )}
              >
                <div
                  className={cm.cn(
                    'absolute inset-0 bg-gradient-to-br from-primary-container/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100',
                  )}
                  aria-hidden="true"
                />
                <span
                  className="material-symbols-outlined relative mb-6 block text-4xl text-primary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                  aria-hidden="true"
                >
                  {f.icon}
                </span>
                <h3 className="relative mb-2 text-xl font-bold">
                  {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p className="relative text-sm leading-relaxed text-on-surface-variant">
                  {t(`landing.feature.${f.key}.body`, {}, { defaultValue: f.defaultBody })}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing — Free + glowing-border Premium per the Stitch design */}
        <section className="bg-surface-container-lowest">
          <div className={cm.cn(cm.maxW('4xl'), cm.mxAuto, cm.sp('px', 6), 'py-24')}>
            <h2 className="mb-16 text-center text-4xl font-black tracking-tight md:text-5xl">
              {t('landing.pricing.heading', {}, { defaultValue: 'Choose your frequency.' })}
            </h2>
            <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-2')}>
              <div className="rounded-xl border border-outline-variant/15 bg-surface-container p-10">
                <div className="mb-2 text-sm font-bold uppercase tracking-widest text-on-surface-variant">
                  {t('landing.pricing.free', {}, { defaultValue: 'Free' })}
                </div>
                <div className="mb-8 text-5xl font-black">
                  $0
                  <span className="text-lg font-medium text-on-surface-variant">
                    {t('landing.pricing.perMonth', {}, { defaultValue: '/mo' })}
                  </span>
                </div>
                <ul className="mb-10 space-y-4 text-on-surface-variant">
                  {FREE_FEATURES.map((f) => (
                    <li key={f.key} className={cm.flex({ align: 'center', gap: 'sm' })}>
                      <span
                        className="material-symbols-outlined text-sm text-primary"
                        aria-hidden="true"
                      >
                        check
                      </span>
                      {t(`landing.pricing.${f.key}`, {}, { defaultValue: f.defaultText })}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/signup"
                  data-mol-id="landing-pricing-free"
                  className={cm.cn(
                    pillCta,
                    'block w-full border border-outline-variant text-center text-on-surface hover:bg-surface-bright',
                  )}
                >
                  {t('landing.pricing.freeCta', {}, { defaultValue: 'Get Free' })}
                </Link>
              </div>
              <div className="glowing-border relative overflow-hidden rounded-xl bg-surface-container-high p-10">
                <div className="absolute top-0 right-0 rounded-bl-lg bg-primary-container px-4 py-1 text-xs font-bold uppercase tracking-widest text-on-primary-container">
                  {t('landing.pricing.popular', {}, { defaultValue: 'Popular' })}
                </div>
                <div className="mb-2 text-sm font-bold uppercase tracking-widest text-primary">
                  {t('landing.pricing.premium', {}, { defaultValue: 'Premium' })}
                </div>
                <div className="mb-8 text-5xl font-black">
                  $9.99
                  <span className="text-lg font-medium text-on-surface-variant">
                    {t('landing.pricing.perMonth', {}, { defaultValue: '/mo' })}
                  </span>
                </div>
                <ul className="mb-10 space-y-4 text-on-surface">
                  {PREMIUM_FEATURES.map((f) => (
                    <li key={f.key} className={cm.flex({ align: 'center', gap: 'sm' })}>
                      <span
                        className="material-symbols-outlined text-sm text-primary"
                        aria-hidden="true"
                      >
                        check
                      </span>
                      {t(`landing.pricing.${f.key}`, {}, { defaultValue: f.defaultText })}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/signup"
                  data-mol-id="landing-pricing-premium"
                  className={cm.cn(
                    pillCta,
                    'block w-full bg-primary-container text-center text-on-primary-container hover:opacity-90',
                  )}
                >
                  {t('landing.pricing.premiumCta', {}, { defaultValue: 'Get Premium' })}
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className={cm.cn('border-t border-outline-variant/40')}>
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-16 text-center')}>
            <h3 className={cm.cn('text-3xl font-black tracking-tight mb-4')}>
              {t('landing.ctaHeading', {}, { defaultValue: 'Find your next favorite track' })}
            </h3>
            <p className={cm.cn('text-base text-on-surface-variant max-w-xl mx-auto mb-8')}>
              {t(
                'landing.ctaBody',
                {},
                { defaultValue: 'Free for 30 days. No ads. Cancel anytime.' },
              )}
            </p>
            <Link
              to="/signup"
              data-mol-id="landing-final-cta"
              className={cm.cn(
                'inline-flex items-center justify-center gap-2 px-10 py-4 font-bold text-sm tracking-widest uppercase bg-primary-container text-on-primary-container rounded-full hover:opacity-90 transition-all',
              )}
            >
              {t('landing.heroCta', {}, { defaultValue: 'Start listening — free for 30 days' })}
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default Landing
