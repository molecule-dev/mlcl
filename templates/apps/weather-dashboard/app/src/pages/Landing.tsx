import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { LandingNav } from '../components/LandingNav.js'

const FEATURES = [
  {
    key: 'forecasts',
    defaultTitle: 'Forecasts that read the sky',
    defaultBody:
      'Hourly precision and 10-day outlooks in one editorial strip — never tap-and-pinch through a pop-up again.',
    icon: 'thermostat',
    tint: 'bg-primary/15 text-primary',
  },
  {
    key: 'radar',
    defaultTitle: 'Radar that scrubs',
    defaultBody:
      'Drag the time scrubber across rain, snow, and lightning layers; swap to satellite when the front is on the way.',
    icon: 'radar',
    tint: 'bg-secondary/15 text-secondary',
  },
  {
    key: 'alerts',
    defaultTitle: 'Alerts that respect quiet',
    defaultBody:
      'Watches, warnings, and emergencies — per-location subscriptions so the phone only buzzes when it really matters.',
    icon: 'notifications_active',
    tint: 'bg-warning/15 text-warning',
  },
  {
    key: 'trends',
    defaultTitle: 'Trends with context',
    defaultBody:
      'Compare today against the 30-year climatology, and see whether this winter is actually worse than last year.',
    icon: 'trending_up',
    tint: 'bg-accent/15 text-accent',
  },
] as const

const BADGES = [
  { icon: 'shield', key: 'secure', defaultLabel: 'Encrypted in transit' },
  { icon: 'cloud_download', key: 'cached', defaultLabel: 'Smart cached' },
  { icon: 'place', key: 'multi', defaultLabel: 'Unlimited saved locations' },
] as const

/* Decorative sample hourly strip for the hero glass card (design: 6-up strip
   with the 4PM/5PM rain cells highlighted in the primary). */
const HOURLY = [
  { key: 'now', defaultLabel: 'Now', icon: 'partly_cloudy_day', defaultTemp: '62°', rain: false },
  { key: 'h2', defaultLabel: '2 PM', icon: 'cloud', defaultTemp: '61°', rain: false },
  { key: 'h3', defaultLabel: '3 PM', icon: 'cloud', defaultTemp: '59°', rain: false },
  { key: 'h4', defaultLabel: '4 PM', icon: 'rainy', defaultTemp: '57°', rain: true },
  { key: 'h5', defaultLabel: '5 PM', icon: 'rainy', defaultTemp: '55°', rain: true },
  { key: 'h6', defaultLabel: '6 PM', icon: 'cloudy', defaultTemp: '54°', rain: false },
] as const

const STATS = [
  {
    key: 'stations',
    defaultValue: '10,000+',
    labelKey: 'weatherStations',
    defaultLabel: 'Weather Stations',
    accent: false,
  },
  {
    key: 'precision',
    defaultValue: '99.8%',
    labelKey: 'alertPrecision',
    defaultLabel: 'Alert Precision',
    accent: true,
  },
  {
    key: 'countries',
    defaultValue: '62',
    labelKey: 'countries',
    defaultLabel: 'Countries',
    accent: false,
  },
  {
    key: 'updates',
    defaultValue: '60s',
    labelKey: 'updateFrequency',
    defaultLabel: 'Update Frequency',
    accent: false,
  },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()

  // The design splits the hero headline into a light first movement and an
  // extralight, muted final word ("See what's / coming"). Splitting the
  // translated title at its last word keeps the treatment working in every
  // locale.
  const heroTitle = t(
    'landing.heroTitle',
    { tagline: APP_TAGLINE },
    { defaultValue: '{{tagline}}' },
  )
  const titleWords = heroTitle.split(' ')
  const titleTail = titleWords.pop() ?? ''
  const titleHead = titleWords.join(' ')

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <LandingNav />

      <main className={cm.cn('relative overflow-hidden')}>
        {/* Atmospheric background gradients (design: fixed cyan/navy blobs) */}
        <div className={cm.cn('fixed inset-0 -z-10 pointer-events-none')} aria-hidden="true">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-surface/50 blur-[100px]" />
        </div>

        {/* Hero */}
        <section
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            'pt-16 pb-24 md:pt-24 md:pb-32',
          )}
        >
          <div
            className={cm.cn(
              cm.grid({ gap: 'lg' }),
              'grid-cols-1 lg:grid-cols-2 gap-16 items-center',
            )}
          >
            <div className="space-y-8">
              <p
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'tracking-wide text-primary gap-2',
                )}
              >
                <span className="material-symbols-outlined text-sm" aria-hidden="true">
                  satellite_alt
                </span>
                {t('landing.eyebrow', {}, { defaultValue: 'Hyperlocal weather intelligence' })}
              </p>
              <h1 className="text-5xl md:text-7xl lg:text-[96px] font-light leading-[0.95] tracking-tight">
                {titleHead ? `${titleHead} ` : ''}
                <span className="font-extralight text-on-surface-variant">{titleTail}</span>
              </h1>
              <p
                className={cm.cn(
                  cm.textSize('lg'),
                  'text-on-surface-variant max-w-lg leading-relaxed',
                )}
              >
                {t(
                  'landing.heroSubtitle',
                  {},
                  {
                    defaultValue:
                      'Atmospheric forecasts, scrub-able radar, and severity-tinted alerts across every saved location — built for outdoor planners who want depth without the clutter.',
                  },
                )}
              </p>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }),
                  'flex-col sm:flex-row gap-4 pt-4',
                )}
              >
                <Link
                  to="/signup"
                  data-mol-id="landing-hero-signup"
                  className={cm.cn(
                    cm.sp('px', 8),
                    cm.sp('py', 4),
                    cm.fontWeight('medium'),
                    cm.textSize('lg'),
                    'bg-primary hover:bg-primary-light text-on-primary rounded-full transition-colors shadow-lg shadow-primary/25 inline-flex items-center justify-center gap-2',
                  )}
                >
                  {t('landing.heroCta', {}, { defaultValue: 'Start tracking' })}
                  <span className="material-symbols-outlined text-sm" aria-hidden="true">
                    arrow_forward
                  </span>
                </Link>
                <Link
                  to="/login"
                  data-mol-id="landing-hero-signin"
                  className={cm.cn(
                    cm.sp('px', 8),
                    cm.sp('py', 4),
                    cm.fontWeight('medium'),
                    cm.textSize('lg'),
                    'rounded-full border border-on-surface/10 hover:bg-on-surface/5 transition-colors inline-flex items-center justify-center',
                  )}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
              </div>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'lg', wrap: 'wrap' }),
                  'pt-4 gap-6',
                )}
              >
                {BADGES.map((b) => (
                  <div
                    key={b.key}
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'xs' }),
                      cm.textSize('xs'),
                      cm.fontWeight('semibold'),
                      'uppercase tracking-widest text-on-surface-variant gap-2',
                    )}
                  >
                    <span className="material-symbols-outlined text-base" aria-hidden="true">
                      {b.icon}
                    </span>
                    {t(`landing.badge.${b.key}`, {}, { defaultValue: b.defaultLabel })}
                  </div>
                ))}
              </div>
            </div>

            {/* Hero glass weather card */}
            <div className="relative">
              <div
                className="absolute -inset-4 bg-primary/20 rounded-full blur-3xl opacity-50"
                aria-hidden="true"
              />
              <div className="glass rounded-3xl p-6 md:p-8 relative overflow-hidden">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <p className="text-2xl font-semibold tracking-tight">
                      {t('landing.sampleLocation', {}, { defaultValue: 'Brooklyn, NY' })}
                    </p>
                    <p className="font-mono text-xs text-on-surface-variant mt-1">
                      {t('landing.sampleCoords', {}, { defaultValue: '40.7128° N, 74.0060° W' })}
                    </p>
                  </div>
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'xs' }),
                      'font-mono text-xs uppercase tracking-widest text-accent bg-accent/10 px-3 py-1 rounded-full gap-1.5',
                    )}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"
                      aria-hidden="true"
                    />
                    {t('landing.sampleLive', {}, { defaultValue: 'Live' })}
                  </span>
                </div>
                <div className="flex items-center gap-6 mb-8">
                  <span className="text-8xl leading-none font-extralight tracking-tighter tabular-nums">
                    {t('landing.sampleTemp', {}, { defaultValue: '64°' })}
                  </span>
                  <div className="space-y-1">
                    <span
                      className="material-symbols-outlined text-5xl text-on-surface-variant"
                      aria-hidden="true"
                    >
                      partly_cloudy_day
                    </span>
                    <p className="text-xl font-medium">
                      {t('landing.sampleCondition', {}, { defaultValue: 'Partly cloudy' })}
                    </p>
                    <p className="font-mono text-xs text-on-surface-variant">
                      {t('landing.sampleFeelsLike', {}, { defaultValue: 'Feels like 61°' })}
                    </p>
                  </div>
                </div>
                {/* Hourly strip */}
                <div
                  className={cm.cn(
                    cm.grid({ gap: 'xs' }),
                    'grid-cols-3 sm:grid-cols-6 gap-2 mb-6 bg-background/50 p-4 rounded-xl',
                  )}
                >
                  {HOURLY.map((h) => (
                    <div key={h.key} className="flex flex-col items-center gap-2">
                      <span className="font-mono text-xs text-on-surface-variant uppercase">
                        {t(`landing.sampleHour.${h.key}`, {}, { defaultValue: h.defaultLabel })}
                      </span>
                      <span
                        className={cm.cn(
                          'material-symbols-outlined text-xl',
                          h.rain ? 'text-primary' : 'text-on-surface-variant',
                        )}
                        aria-hidden="true"
                      >
                        {h.icon}
                      </span>
                      <span
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.fontWeight('medium'),
                          h.rain ? 'text-primary' : undefined,
                        )}
                      >
                        {t(`landing.sampleHourTemp.${h.key}`, {}, { defaultValue: h.defaultTemp })}
                      </span>
                    </div>
                  ))}
                </div>
                {/* Gauges */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-background/50 p-4 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-xs text-on-surface-variant mb-1 uppercase tracking-wider font-semibold">
                        {t('landing.sampleUv', {}, { defaultValue: 'UV Index' })}
                      </p>
                      <p className="font-mono text-lg font-medium text-accent">
                        {t('landing.sampleUvValue', {}, { defaultValue: '3 Moderate' })}
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-accent" aria-hidden="true">
                      light_mode
                    </span>
                  </div>
                  <div className="bg-background/50 p-4 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-xs text-on-surface-variant mb-1 uppercase tracking-wider font-semibold">
                        {t('landing.sampleHumidity', {}, { defaultValue: 'Humidity' })}
                      </p>
                      <p className="font-mono text-lg font-medium text-primary">
                        {t('landing.sampleHumidityValue', {}, { defaultValue: '72%' })}
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-primary" aria-hidden="true">
                      water_drop
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats band */}
        <section className="border-y border-outline-variant/50 bg-surface/40 backdrop-blur-sm">
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-12')}>
            <div className="grid grid-cols-2 md:grid-cols-4 md:divide-x divide-primary/20">
              {STATS.map((s) => (
                <div key={s.key} className="text-center px-4 py-4">
                  <div
                    className={cm.cn(
                      'text-4xl md:text-5xl font-extralight tracking-tight mb-2',
                      s.accent ? 'text-accent' : undefined,
                    )}
                  >
                    {t(`landing.stat.${s.key}`, {}, { defaultValue: s.defaultValue })}
                  </div>
                  <div className="font-mono text-xs text-on-surface-variant uppercase tracking-widest">
                    {t(`landing.statLabel.${s.labelKey}`, {}, { defaultValue: s.defaultLabel })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Feature grid */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-24')}>
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-light tracking-tight mb-4">
              {t(
                'landing.featuresHeading',
                {},
                { defaultValue: 'Atmospheric depth, glanceable detail' },
              )}
            </h2>
            <p className="text-on-surface-variant max-w-2xl mx-auto">
              {t(
                'landing.featuresSubheading',
                {},
                {
                  defaultValue:
                    'From hyper-local point forecasts to scrub-able radar, Tempest provides clarity in a chaotic atmosphere.',
                },
              )}
            </p>
          </div>
          <div
            className={cm.cn(
              cm.grid({ gap: 'lg' }),
              'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6',
            )}
          >
            {FEATURES.map((f) => (
              <div key={f.key} className="glass rounded-2xl p-8 flex flex-col items-start group">
                <div
                  className={cm.cn(
                    cm.w(12),
                    cm.h(12),
                    cm.roundedFull,
                    cm.flex({ align: 'center', justify: 'center' }),
                    'mb-6 group-hover:scale-110 transition-transform',
                    f.tint,
                  )}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    {f.icon}
                  </span>
                </div>
                <h3
                  className={cm.cn(
                    cm.textSize('lg'),
                    cm.sp('mb', 3),
                    cm.fontWeight('semibold'),
                    'text-on-surface',
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

        {/* Final CTA */}
        <section className={cm.cn(cm.maxW('4xl'), cm.mxAuto, cm.sp('px', 6), 'pb-24')}>
          <div className="glass rounded-3xl p-10 md:p-16 relative overflow-hidden text-center">
            <div
              className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent"
              aria-hidden="true"
            />
            <div className="relative z-10 space-y-6">
              <h2 className="text-3xl md:text-5xl font-light tracking-tight">
                {t(
                  'landing.ctaHeading',
                  {},
                  { defaultValue: 'See what is coming, before it gets here' },
                )}
              </h2>
              <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant max-w-xl mx-auto')}>
                {t(
                  'landing.ctaBody',
                  { appName: APP_NAME },
                  {
                    defaultValue:
                      'Pin every place you care about. {{appName}} keeps the radar warm and the alerts quiet until the sky actually changes.',
                  },
                )}
              </p>
              <Link
                to="/signup"
                data-mol-id="landing-final-signup"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 4),
                  cm.fontWeight('semibold'),
                  cm.textSize('lg'),
                  'bg-inverse-surface text-inverse-on-surface hover:bg-primary hover:text-on-primary rounded-full transition-colors inline-flex items-center justify-center gap-2',
                )}
              >
                {t('landing.heroCta', {}, { defaultValue: 'Start tracking' })}
                <span className="material-symbols-outlined text-sm" aria-hidden="true">
                  arrow_forward
                </span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer
        className={cm.cn('border-t border-outline-variant/50 bg-surface/60', cm.sp('py', 12))}
      >
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            cm.flex({ direction: 'col', align: 'center', justify: 'between' }),
            'flex-col md:flex-row gap-6',
          )}
        >
          <p className="text-lg font-bold tracking-tight">{APP_NAME}</p>
          <nav
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center', wrap: 'wrap' }),
              'font-mono text-xs uppercase tracking-widest gap-6',
            )}
            aria-label={t('landing.footerNav', {}, { defaultValue: 'Footer' })}
          >
            <Link
              to="/about"
              data-mol-id="landing-footer-about"
              className="text-on-surface-variant hover:text-primary transition-colors"
            >
              {t('landing.footer.about', {}, { defaultValue: 'About' })}
            </Link>
            <Link
              to="/privacy"
              data-mol-id="landing-footer-privacy"
              className="text-on-surface-variant hover:text-primary transition-colors"
            >
              {t('landing.footer.privacy', {}, { defaultValue: 'Privacy Policy' })}
            </Link>
            <Link
              to="/terms"
              data-mol-id="landing-footer-terms"
              className="text-on-surface-variant hover:text-primary transition-colors"
            >
              {t('landing.footer.terms', {}, { defaultValue: 'Terms of Service' })}
            </Link>
          </nav>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
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
