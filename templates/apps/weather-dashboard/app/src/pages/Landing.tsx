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
    tint: 'text-primary',
  },
  {
    key: 'radar',
    defaultTitle: 'Radar that scrubs',
    defaultBody:
      'Drag the time scrubber across rain, snow, and lightning layers; swap to satellite when the front is on the way.',
    icon: 'radar',
    tint: 'text-secondary',
  },
  {
    key: 'alerts',
    defaultTitle: 'Alerts that respect quiet',
    defaultBody:
      'Watches, warnings, and emergencies — per-location subscriptions so the phone only buzzes when it really matters.',
    icon: 'notifications_active',
    tint: 'text-warning',
  },
  {
    key: 'trends',
    defaultTitle: 'Trends with context',
    defaultBody:
      'Compare today against the 30-year climatology, and see whether this winter is actually worse than last year.',
    icon: 'trending_up',
    tint: 'text-tertiary',
  },
] as const

const BADGES = [
  { icon: 'shield', key: 'secure', defaultLabel: 'Encrypted in transit' },
  { icon: 'cloud_download', key: 'cached', defaultLabel: 'Smart cached' },
  { icon: 'place', key: 'multi', defaultLabel: 'Unlimited saved locations' },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <LandingNav />

      <main>
        <section className={cm.cn('relative overflow-hidden')}>
          <div
            className={cm.cn(
              'absolute inset-0 bg-gradient-to-br from-primary-container via-surface to-surface pointer-events-none',
            )}
            aria-hidden="true"
          />
          <div
            className={cm.cn(
              'absolute -right-32 -top-24 w-[28rem] h-[28rem] rounded-full bg-primary/15 blur-3xl pointer-events-none',
            )}
            aria-hidden="true"
          />
          <div
            className={cm.cn(
              cm.maxW('7xl'),
              cm.mxAuto,
              cm.sp('px', 6),
              'py-20 md:py-28 lg:py-32 relative',
            )}
          >
            <div className={cm.cn('grid grid-cols-1 lg:grid-cols-12 gap-12 items-center')}>
              <div className={cm.cn('lg:col-span-7')}>
                <p
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.sp('mb', 4),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest text-primary',
                  )}
                >
                  {t('landing.eyebrow', {}, { defaultValue: 'Weather, calmly' })}
                </p>
                <h1
                  className={cm.cn(
                    cm.sp('mb', 6),
                    'text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[0.95]',
                  )}
                >
                  {t(
                    'landing.heroTitle',
                    { tagline: APP_TAGLINE },
                    { defaultValue: '{{tagline}}' },
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
                        'Atmospheric forecasts, scrub-able radar, and severity-tinted alerts across every saved location — built for outdoor planners who want depth without the clutter.',
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
                      'bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors inline-flex items-center gap-2',
                    )}
                  >
                    {t('landing.heroCta', {}, { defaultValue: 'Start tracking' })}
                    <span
                      className={cm.cn('material-symbols-outlined', cm.textSize('base'))}
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
                      'rounded-full border border-outline-variant hover:bg-surface-container-low transition-colors',
                    )}
                  >
                    {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                  </Link>
                </div>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'lg', wrap: 'wrap' }),
                    cm.sp('mt', 12),
                  )}
                >
                  {BADGES.map((b) => (
                    <div
                      key={b.key}
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'xs' }),
                        cm.textSize('xs'),
                        cm.fontWeight('semibold'),
                        'uppercase tracking-widest text-on-surface-variant',
                      )}
                    >
                      <span
                        className={cm.cn('material-symbols-outlined', cm.textSize('base'))}
                        aria-hidden="true"
                      >
                        {b.icon}
                      </span>
                      {t(`landing.badge.${b.key}`, {}, { defaultValue: b.defaultLabel })}
                    </div>
                  ))}
                </div>
              </div>

              <div className={cm.cn('lg:col-span-5')}>
                <div
                  className={cm.cn(
                    cm.flex({ direction: 'col', justify: 'between' }),
                    cm.sp('p', 8),
                    'min-h-[340px] bg-gradient-to-br from-primary via-primary-container to-tertiary-container rounded-[2rem] text-on-primary relative overflow-hidden shadow-2xl shadow-primary/30',
                  )}
                >
                  <div className={cm.cn('relative z-10')}>
                    <p
                      className={cm.cn(
                        'font-bold text-xs uppercase tracking-widest text-primary-fixed/80 mb-2',
                      )}
                    >
                      {t('landing.sampleEyebrow', {}, { defaultValue: 'Right now' })}
                    </p>
                    <p
                      className={cm.cn(
                        cm.fontWeight('semibold'),
                        cm.textSize('xl'),
                        'tracking-tight',
                      )}
                    >
                      {t('landing.sampleLocation', {}, { defaultValue: 'Brooklyn, NY' })}
                    </p>
                    <div
                      className={cm.cn(cm.flex({ align: 'baseline', gap: 'lg' }), cm.sp('mt', 6))}
                    >
                      <span
                        className={cm.cn('tabular-nums text-on-primary')}
                        style={{
                          fontSize: '4rem',
                          fontWeight: 200,
                          letterSpacing: '-0.03em',
                          lineHeight: 1,
                        }}
                      >
                        {t('landing.sampleTemp', {}, { defaultValue: '64°' })}
                      </span>
                      <span
                        className={cm.cn(
                          cm.flex({ align: 'center', gap: 'sm' }),
                          cm.sp('px', 3),
                          cm.sp('py', 1),
                          cm.roundedFull,
                          cm.fontWeight('semibold'),
                          cm.textSize('sm'),
                          'bg-surface/20 backdrop-blur-md',
                        )}
                      >
                        <span
                          className={cm.cn('material-symbols-outlined', cm.textSize('2xl'))}
                          style={{ fontVariationSettings: "'FILL' 1" }}
                          aria-hidden="true"
                        >
                          partly_cloudy_day
                        </span>
                        {t('landing.sampleCondition', {}, { defaultValue: 'Partly cloudy' })}
                      </span>
                    </div>
                    <p
                      className={cm.cn(
                        cm.sp('mt', 3),
                        cm.textSize('sm'),
                        cm.fontWeight('medium'),
                        'text-on-primary-container/85',
                      )}
                    >
                      {t(
                        'landing.sampleSummary',
                        {},
                        { defaultValue: 'Feels 61° · H 71° · L 58° · Updated 4m ago' },
                      )}
                    </p>
                  </div>
                  <div className={cm.cn('relative z-10 mt-8 h-20')}>
                    <svg
                      className={cm.cn(cm.w('full'), cm.h('full'))}
                      viewBox="0 0 400 100"
                      preserveAspectRatio="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M0,72 Q40,52 80,46 T160,38 T240,55 T320,28 T400,42 L400,100 L0,100 Z"
                        fill="currentColor"
                        opacity="0.25"
                      />
                      <path
                        d="M0,72 Q40,52 80,46 T160,38 T240,55 T320,28 T400,42"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <div
                    className={cm.cn(
                      'absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-surface/10 blur-3xl',
                    )}
                    aria-hidden="true"
                  />
                  <div
                    className={cm.cn(
                      'absolute right-12 top-12 w-20 h-20 rounded-full bg-tertiary-fixed/30 blur-2xl',
                    )}
                    aria-hidden="true"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-20')}>
          <h2
            className={cm.cn(
              cm.sp('mb', 12),
              cm.textCenter,
              'text-3xl md:text-4xl font-extrabold tracking-tight',
            )}
          >
            {t(
              'landing.featuresHeading',
              {},
              { defaultValue: 'Atmospheric depth, glanceable detail' },
            )}
          </h2>
          <div
            className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}
          >
            {FEATURES.map((f) => (
              <div
                key={f.key}
                className={cm.cn(
                  cm.sp('p', 6),
                  'bg-surface-container-lowest rounded-2xl hover:shadow-2xl hover:shadow-on-surface/5 transition-all group',
                )}
              >
                <div
                  className={cm.cn(
                    cm.sp('p', 3),
                    'inline-flex bg-surface rounded-xl shadow-sm group-hover:scale-110 transition-transform',
                    f.tint,
                  )}
                >
                  <span
                    className="material-symbols-outlined text-3xl"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                    aria-hidden="true"
                  >
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

        <section className={cm.cn('border-t border-outline-variant/40')}>
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-16 text-center')}>
            <h3
              className={cm.cn(
                cm.textSize('3xl'),
                cm.sp('mb', 4),
                cm.fontWeight('bold'),
                'tracking-tight',
              )}
            >
              {t(
                'landing.ctaHeading',
                {},
                { defaultValue: 'See what is coming, before it gets here' },
              )}
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
                { appName: APP_NAME },
                {
                  defaultValue:
                    'Pin every place you care about. {{appName}} keeps the radar warm and the alerts quiet until the sky actually changes.',
                },
              )}
            </p>
            <Link
              to="/signup"
              className={cm.cn(
                cm.sp('px', 10),
                cm.sp('py', 4),
                cm.fontWeight('semibold'),
                'bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors inline-flex items-center gap-2',
              )}
            >
              {t('landing.heroCta', {}, { defaultValue: 'Start tracking' })}
              <span
                className={cm.cn('material-symbols-outlined', cm.textSize('base'))}
                aria-hidden="true"
              >
                arrow_forward
              </span>
            </Link>
          </div>
        </section>
      </main>

      <footer
        className={cm.cn(
          cm.sp('py', 8),
          cm.textCenter,
          cm.textSize('sm'),
          'bg-surface text-on-surface-variant border-t border-outline-variant',
        )}
      >
        <p>
          {t(
            'landing.copyright',
            { year: new Date().getFullYear(), app: APP_NAME, tagline: APP_TAGLINE },
            { defaultValue: '© {{year}} {{app}}. {{tagline}}.' },
          )}
        </p>
      </footer>
    </div>
  )
}
