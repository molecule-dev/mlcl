import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'

const FEATURES = [
  {
    key: 'live-draw',
    defaultTitle: 'Live whole-home draw',
    defaultBody: 'Watt-by-watt readings refresh every 5 seconds — circuit, room, or device.',
    icon: 'electric_meter',
    tint: 'text-primary',
  },
  {
    key: 'solar',
    defaultTitle: 'Solar + battery flow',
    defaultBody: 'Track production, self-consumption, and grid export — every flow at a glance.',
    icon: 'solar_power',
    tint: 'text-warning',
  },
  {
    key: 'cost',
    defaultTitle: 'Cost forecasting',
    defaultBody:
      'Time-of-use rate plans with peak / off-peak split — know what today will cost before it ends.',
    icon: 'savings',
    tint: 'text-success',
  },
  {
    key: 'alerts',
    defaultTitle: 'Alerts that catch spikes',
    defaultBody:
      'High-usage, low-production, peak-demand — push, email, or both, with thresholds you set.',
    icon: 'notifications_active',
    tint: 'text-error',
  },
] as const

/**
 * Marketing landing page for Voltrace.
 *
 * Catalog §1.2 + §14.x — sticky branded nav, gradient hero (§14.1) with
 * sample auth'd hero card mirror (PowerHeroCard treatment), feature quad
 * (§14.2), CTA band, brand footer.
 *
 * Pattern source: smart-home-dashboard's Landing.tsx.
 */
export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
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
          <Link
            to="/"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.textSize('xl'),
              cm.fontWeight('bold'),
              'tracking-tight',
            )}
          >
            <BrandWordmark as="span" />
          </Link>
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                data-mol-id="nav-go-to-dashboard"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  'bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors',
                )}
              >
                {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
              </Link>
            ) : (
              <>
                <Link
                  to="/pricing"
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'text-on-surface-variant hover:text-on-surface',
                  )}
                >
                  {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
                </Link>
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
                    'bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors',
                  )}
                >
                  {t(
                    'landing.getStarted',
                    { appName: APP_NAME },
                    { defaultValue: 'Plug in {{appName}}' },
                  )}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

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
                    cm.sp('mb', 6),
                    'inline-flex items-center gap-2 rounded-full border border-outline-variant/60 bg-surface/70 backdrop-blur px-4 py-1.5',
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest text-primary',
                  )}
                >
                  <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
                    bolt
                  </span>
                  {t('landing.eyebrow', {}, { defaultValue: 'Realtime energy intelligence' })}
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
                        'Live wattage, solar production, time-of-use cost, and high-usage alerts in a control-room shell built for solar homes and facility teams.',
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
                    {t(
                      'landing.heroCta',
                      { appName: APP_NAME },
                      { defaultValue: 'Plug in {{appName}}' },
                    )}
                    <span className={'material-symbols-outlined text-base'} aria-hidden="true">
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
                  {[
                    { icon: 'verified', key: 'utility', defaultLabel: 'Utility-grade meters' },
                    { icon: 'solar_power', key: 'solar', defaultLabel: 'Solar + battery' },
                    { icon: 'lock', key: 'private', defaultLabel: 'Private by default' },
                  ].map((b) => (
                    <div
                      key={b.key}
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'xs' }),
                        cm.textSize('xs'),
                        cm.fontWeight('semibold'),
                        'uppercase tracking-widest text-on-surface-variant',
                      )}
                    >
                      <span className={'material-symbols-outlined text-base'} aria-hidden="true">
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
                    'min-h-[300px] bg-gradient-to-br from-primary to-primary-container rounded-[2rem] text-white relative overflow-hidden shadow-2xl shadow-primary/30',
                  )}
                >
                  <div className={cm.cn('relative z-10')}>
                    <p
                      className={cm.cn(
                        'font-bold text-xs uppercase tracking-widest text-primary-fixed/80 mb-2',
                      )}
                    >
                      {t('landing.sampleCardLabel', {}, { defaultValue: 'Whole-home draw' })}
                    </p>
                    <div className={cm.flex({ align: 'baseline', gap: 'sm' })}>
                      <span
                        className={cm.cn(
                          'font-mono text-5xl font-extrabold tracking-tighter tabular-nums',
                        )}
                      >
                        {t('landing.sampleWatts', {}, { defaultValue: '2,140 W' })}
                      </span>
                      <span
                        className={cm.cn(
                          'px-3 py-1 rounded-full text-[11px] font-bold bg-surface/20 backdrop-blur-md inline-flex items-center gap-1',
                        )}
                      >
                        <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
                          solar_power
                        </span>
                        {t('landing.sampleSolar', {}, { defaultValue: '+3,820 W solar' })}
                      </span>
                    </div>
                    <p className={cm.cn('mt-3 text-sm font-medium text-white/90 tabular-nums')}>
                      {t(
                        'landing.sampleSummary',
                        {},
                        { defaultValue: 'Exporting 1,680 W to grid · 18.4 kWh today' },
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
                        d="M0,80 Q40,60 80,55 T160,40 T240,60 T320,30 T400,45 L400,100 L0,100 Z"
                        fill="white"
                        opacity="0.3"
                      />
                      <path
                        d="M0,80 Q40,60 80,55 T160,40 T240,60 T320,30 T400,45"
                        fill="none"
                        stroke="white"
                        strokeWidth="3"
                      />
                    </svg>
                  </div>
                  <div
                    className={cm.cn(
                      'absolute -right-16 -bottom-16 w-64 h-64 rounded-full bg-surface/10 blur-3xl',
                    )}
                    aria-hidden="true"
                  />
                  <div
                    className={cm.cn(
                      'absolute right-8 top-8 w-16 h-16 rounded-full bg-primary-fixed/20 blur-xl',
                    )}
                    aria-hidden="true"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Social-proof band — works-with integrations */}
        <section className={cm.cn('border-y border-outline-variant/40 bg-surface')}>
          <div
            className={cm.cn(
              cm.maxW('7xl'),
              cm.mxAuto,
              cm.sp('px', 6),
              cm.sp('py', 10),
              cm.textCenter,
            )}
          >
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-on-surface-variant/80',
                cm.sp('mb', 6),
              )}
            >
              {t(
                'landing.integrationsLabel',
                {},
                { defaultValue: 'Works with the gear you already own' },
              )}
            </p>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 'lg', wrap: 'wrap' }),
              )}
            >
              {[
                { icon: 'electric_meter', key: 'meters', defaultLabel: 'Utility meters' },
                { icon: 'solar_power', key: 'inverters', defaultLabel: 'Solar inverters' },
                { icon: 'battery_charging_full', key: 'batteries', defaultLabel: 'Battery stacks' },
                { icon: 'ev_station', key: 'ev', defaultLabel: 'EV chargers' },
                { icon: 'developer_board', key: 'panels', defaultLabel: 'Smart panels' },
              ].map((b) => (
                <div
                  key={b.key}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'text-on-surface-variant',
                  )}
                >
                  <span className={'material-symbols-outlined text-lg'} aria-hidden="true">
                    {b.icon}
                  </span>
                  {t(`landing.integration.${b.key}`, {}, { defaultValue: b.defaultLabel })}
                </div>
              ))}
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
              { defaultValue: 'Every watt, every minute, in one shell' },
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
                  <span className="material-symbols-outlined text-3xl" aria-hidden="true">
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

        {/* Why-choose-us — reason cards with icon tiles */}
        <section
          className={cm.cn('bg-surface-container-lowest border-y border-outline-variant/40')}
        >
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-20')}>
            <h2
              className={cm.cn(
                cm.sp('mb', 3),
                cm.textCenter,
                'text-3xl md:text-4xl font-extrabold tracking-tight',
              )}
            >
              {t(
                'landing.why.heading',
                { appName: APP_NAME },
                { defaultValue: 'Why homes and facility teams choose {{appName}}' },
              )}
            </h2>
            <p
              className={cm.cn(
                cm.textSize('lg'),
                cm.sp('mb', 12),
                cm.textCenter,
                'text-on-surface-variant max-w-2xl mx-auto',
              )}
            >
              {t(
                'landing.why.sub',
                {},
                {
                  defaultValue:
                    'Control-room accuracy without the control-room complexity — set it up once and let the watts explain themselves.',
                },
              )}
            </p>
            <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-3')}>
              {[
                {
                  icon: 'speed',
                  key: 'accuracy',
                  defaultTitle: 'Utility-grade accuracy',
                  defaultBody:
                    'Readings refresh every 5 seconds at circuit level — no estimates, no last-month surprises.',
                  tint: 'text-primary bg-surface-container',
                },
                {
                  icon: 'lock',
                  key: 'privacy',
                  defaultTitle: 'Private by default',
                  defaultBody:
                    'Your energy data stays yours — stored locally first, shared with nothing unless you say so.',
                  tint: 'text-secondary bg-secondary-container',
                },
                {
                  icon: 'savings',
                  key: 'savings',
                  defaultTitle: 'It pays for itself',
                  defaultBody:
                    'Homes on time-of-use plans typically find double-digit bill savings in the first quarter.',
                  tint: 'text-tertiary bg-tertiary-container',
                },
              ].map((r) => (
                <div
                  key={r.key}
                  className={cm.cn(
                    cm.sp('p', 8),
                    'bg-surface rounded-2xl border border-outline-variant/40 shadow-sm hover:shadow-xl hover:shadow-on-surface/5 hover:-translate-y-1 transition-all',
                  )}
                >
                  <div className={cm.cn(cm.sp('p', 3), 'inline-flex rounded-xl', r.tint)}>
                    <span className="material-symbols-outlined text-3xl" aria-hidden="true">
                      {r.icon}
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
                    {t(`landing.why.${r.key}.title`, {}, { defaultValue: r.defaultTitle })}
                  </h3>
                  <p
                    className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}
                  >
                    {t(`landing.why.${r.key}.body`, {}, { defaultValue: r.defaultBody })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={cm.cn('bg-inverse-surface text-inverse-on-surface')}>
          <div className={cm.cn(cm.maxW('4xl'), cm.mxAuto, cm.sp('px', 6), 'py-20 text-center')}>
            <h2
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
                { defaultValue: 'Pair your meter, see the watts in minutes' },
              )}
            </h2>
            <p
              className={cm.cn(cm.textSize('base'), cm.sp('mb', 8), 'max-w-xl mx-auto opacity-80')}
            >
              {t(
                'landing.ctaBody',
                { appName: APP_NAME },
                {
                  defaultValue:
                    '{{appName}} talks to most utility-grade meters, solar inverters, and battery stacks — wired or over WiFi.',
                },
              )}
            </p>
            <Link
              to="/signup"
              className={cm.cn(
                cm.sp('px', 10),
                cm.sp('py', 4),
                cm.fontWeight('semibold'),
                'bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors inline-flex items-center gap-2 shadow-lg shadow-black/20',
              )}
            >
              {t('landing.heroCta', { appName: APP_NAME }, { defaultValue: 'Plug in {{appName}}' })}
              <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
            <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 6), 'opacity-70')}>
              {t(
                'landing.ctaNote',
                {},
                { defaultValue: 'Free for one home. No credit card required.' },
              )}
            </p>
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
