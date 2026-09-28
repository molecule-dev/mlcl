import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

const FEATURES = [
  {
    key: 'live_map',
    defaultTitle: 'Live fleet map',
    defaultBody: 'Every vehicle, every status, every minute. Auto-refresh keeps the view current.',
    icon: 'map',
  },
  {
    key: 'alerts',
    defaultTitle: 'Smart alerts',
    defaultBody: 'Low-fuel, idle-too-long, geofence breaches — escalated by severity, never noise.',
    icon: 'notifications_active',
  },
  {
    key: 'maintenance',
    defaultTitle: 'Maintenance ahead',
    defaultBody: 'Predictive scheduling by mileage and engine hours. No more surprise breakdowns.',
    icon: 'build',
  },
  {
    key: 'driver_score',
    defaultTitle: 'Driver scores',
    defaultBody:
      'Per-driver safety scoring with trip-by-trip event history and certification tracking.',
    icon: 'shield_person',
  },
] as const

/* Hero stat band (design: mono numerals over a hairline rule on navy). */
const HERO_STATS = [
  { key: 'milesTracked', value: '12M+', label: 'Miles tracked', accent: true },
  { key: 'uptime', value: '99.9%', label: 'Uptime', accent: false },
  { key: 'integrations', value: '15+', label: 'Integrations', accent: false },
] as const

/* Live-map markers (design: glowing dots with mono unit callsigns). */
const MAP_UNITS = [
  {
    id: 'UNIT-A12',
    pos: 'top-1/4 left-1/4',
    dot: 'bg-[var(--color-ops-live)]',
    glow: 'shadow-[0_0_10px_var(--color-ops-live)]',
  },
  {
    id: 'UNIT-B04',
    pos: 'top-1/2 left-2/3',
    dot: 'bg-[var(--color-brand-cyan-bright)]',
    glow: 'shadow-[0_0_10px_var(--color-brand-cyan-bright)]',
  },
  {
    id: 'UNIT-C88',
    pos: 'bottom-1/3 left-1/2',
    dot: 'bg-[var(--color-ops-marker-amber)]',
    glow: 'shadow-[0_0_10px_var(--color-ops-marker-amber)]',
  },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()
  const year = new Date().getFullYear()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <nav
        className={
          'sticky top-0 z-50 bg-[var(--color-ops-navy)] border-b border-[var(--color-ops-line)]'
        }
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
            className={
              'text-xl font-black tracking-tighter text-white uppercase flex items-baseline gap-1.5'
            }
          >
            {APP_NAME}
            <span
              className={'w-1.5 h-1.5 rounded-full bg-[var(--color-brand-cyan-bright)]'}
              aria-hidden="true"
            />
          </Link>
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                data-mol-id="landing-nav-dashboard"
                className={
                  'px-4 py-2 text-sm font-medium bg-[var(--color-brand-cyan)] hover:bg-[var(--color-brand-cyan-strong)] text-white rounded-[0.5rem] transition-colors'
                }
              >
                {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
              </Link>
            ) : (
              <>
                <Link
                  to="/pricing"
                  data-mol-id="landing-nav-pricing"
                  className={
                    'hidden md:block text-sm font-medium text-[var(--color-ops-navlink)] hover:text-white transition-colors'
                  }
                >
                  {t('landing.pricingLink', {}, { defaultValue: 'Pricing' })}
                </Link>
                <Link
                  to="/login"
                  data-mol-id="landing-nav-sign-in"
                  className={
                    'hidden md:block text-sm font-medium text-[var(--color-ops-navlink)] hover:text-white transition-colors'
                  }
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  data-mol-id="landing-nav-get-started"
                  className={
                    'flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[var(--color-brand-cyan)] hover:bg-[var(--color-brand-cyan-strong)] text-white rounded-[0.5rem] transition-colors'
                  }
                >
                  {t('landing.getStarted', {}, { defaultValue: 'Get a demo' })}
                  <span className={'material-symbols-outlined text-sm'} aria-hidden="true">
                    arrow_forward
                  </span>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        {/* Hero — navy operations console with a live-map product panel */}
        <section className="relative overflow-hidden bg-[var(--color-ops-navy)]">
          <div
            className={cm.cn(
              cm.maxW('7xl'),
              cm.mxAuto,
              cm.sp('px', 6),
              'relative z-10 py-20 md:py-24',
            )}
          >
            <div className={'grid grid-cols-1 lg:grid-cols-2 gap-16 items-center'}>
              <div className={'space-y-8'}>
                <h1
                  className={
                    'text-5xl md:text-6xl font-black leading-tight tracking-tight text-white [font-family:var(--font-headline)]'
                  }
                >
                  {t(
                    'landing.heroTitle',
                    { tagline: APP_TAGLINE },
                    { defaultValue: '{{tagline}}' },
                  )}
                </h1>
                <p className={'text-lg text-[var(--color-ops-muted)] max-w-xl leading-relaxed'}>
                  {t(
                    'landing.heroSubtitle',
                    {},
                    {
                      defaultValue:
                        "Live vehicle telemetry, smart alerts, and driver scoring — built for dispatchers who can't miss a beat.",
                    },
                  )}
                </p>
                <div className={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>
                  <Link
                    to="/signup"
                    data-mol-id="landing-hero-cta"
                    className={
                      'inline-flex items-center gap-2 px-6 py-3 font-medium bg-[var(--color-brand-cyan)] hover:bg-[var(--color-brand-cyan-strong)] text-white rounded-[0.5rem] transition-colors'
                    }
                  >
                    {t('landing.heroCta', {}, { defaultValue: 'Get a demo' })}
                    <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                      arrow_forward
                    </span>
                  </Link>
                  <Link
                    to="/login"
                    data-mol-id="landing-hero-sign-in"
                    className={
                      'px-6 py-3 font-medium border border-[var(--color-ops-line)] bg-white/5 hover:bg-white/10 text-white rounded-[0.5rem] transition-colors'
                    }
                  >
                    {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                  </Link>
                </div>
                <div
                  className={'pt-8 border-t border-[var(--color-ops-line)] grid grid-cols-3 gap-6'}
                >
                  {HERO_STATS.map((s) => (
                    <div key={s.key}>
                      <div
                        className={
                          'text-2xl font-medium tabular-nums [font-family:var(--font-data)] ' +
                          (s.accent ? 'text-[var(--color-brand-cyan-bright)]' : 'text-white')
                        }
                      >
                        {s.value}
                      </div>
                      <div
                        className={
                          'text-xs text-[var(--color-ops-faint)] uppercase tracking-wider mt-1'
                        }
                      >
                        {t(`landing.stat.${s.key}`, {}, { defaultValue: s.label })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live-map product panel */}
              <div className="relative">
                <div
                  className={
                    'absolute inset-0 bg-[var(--color-brand-cyan-bright)]/20 blur-3xl rounded-full'
                  }
                  aria-hidden="true"
                />
                <div
                  className={
                    'relative overflow-hidden rounded-[0.5rem] border border-[var(--color-ops-line)] shadow-2xl bg-[var(--color-ops-panel)] flex flex-col h-[420px] md:h-[500px]'
                  }
                >
                  <div className="bg-[var(--color-ops-navy-deep)] border-b border-[var(--color-ops-line)] p-4 flex justify-between items-center">
                    <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                      <span className={'relative flex h-2 w-2'}>
                        <span
                          className={
                            'absolute inline-flex h-full w-full rounded-full bg-[var(--color-ops-live)] opacity-75 animate-ping'
                          }
                        />
                        <span
                          className={
                            'relative inline-flex rounded-full h-2 w-2 bg-[var(--color-ops-live)]'
                          }
                        />
                      </span>
                      <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-ops-live)] [font-family:var(--font-data)]">
                        {t('landing.mockLiveOperations', {}, { defaultValue: 'Live operations' })}
                      </span>
                    </div>
                    <div className={'flex gap-2'} aria-hidden="true">
                      <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
                      <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
                      <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
                    </div>
                  </div>
                  <div className="flex-1 relative bg-[var(--color-ops-panel)]">
                    <div
                      className="landing-dot-grid absolute inset-0 opacity-30"
                      aria-hidden="true"
                    />
                    {MAP_UNITS.map((u) => (
                      <div
                        key={u.id}
                        className={`absolute ${u.pos} flex items-center justify-center`}
                      >
                        <div
                          className={`w-3 h-3 rounded-full border-2 border-[var(--color-ops-navy)] z-10 ${u.dot} ${u.glow}`}
                        />
                        <div className="absolute top-full mt-1 bg-white/5 border border-[var(--color-ops-line)] rounded px-2 py-1 text-[10px] text-white whitespace-nowrap [font-family:var(--font-data)]">
                          {u.id}
                        </div>
                      </div>
                    ))}
                    <div className="absolute top-4 right-4 w-40 bg-[var(--color-ops-navy)]/90 backdrop-blur border border-[var(--color-ops-line)] rounded-[0.5rem] p-3">
                      <div className="text-[10px] text-[var(--color-ops-muted)] uppercase tracking-wider mb-1">
                        {t('landing.mockActiveFleet', {}, { defaultValue: 'Active fleet' })}
                      </div>
                      <div className="text-xl text-white [font-family:var(--font-data)]">
                        {t('landing.mockActiveFleetValue', {}, { defaultValue: '42/45' })}
                      </div>
                      <div className="w-full bg-white/10 h-1 mt-2 rounded-[0.25rem] overflow-hidden">
                        <div className="bg-[var(--color-brand-cyan-bright)] h-full w-[93%]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature grid */}
        <section className="bg-[var(--color-features-bg)] border-t border-[var(--color-features-card-border)]">
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-24')}>
            <div className="text-center mb-16">
              <h2
                className={
                  'mb-4 text-3xl md:text-4xl font-bold tracking-tight text-[var(--color-features-heading)] [font-family:var(--font-headline)]'
                }
              >
                {t(
                  'landing.featuresHeading',
                  {},
                  { defaultValue: "Built for dispatchers who can't miss a thing" },
                )}
              </h2>
              <p className="text-[var(--color-features-body)] max-w-2xl mx-auto">
                {t(
                  'landing.featuresSubheading',
                  {},
                  {
                    defaultValue:
                      'Everything you need to monitor, optimize, and secure your fleet operations in real-time.',
                  },
                )}
              </p>
            </div>
            <div
              className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}
            >
              {FEATURES.map((f) => (
                <div
                  key={f.key}
                  className={
                    'bg-[var(--color-features-card)] p-8 rounded-[0.5rem] border border-[var(--color-features-card-border)] shadow-sm hover:shadow-md transition-shadow'
                  }
                >
                  <div
                    className={cm.cn(
                      'w-12 h-12 bg-[var(--color-features-icon-bg)] text-[var(--color-features-icon)] rounded-[0.5rem] flex items-center justify-center mb-6',
                    )}
                  >
                    <span className="material-symbols-outlined text-2xl" aria-hidden="true">
                      {f.icon}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-[var(--color-features-heading)]">
                    {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                  </h3>
                  <p className="text-sm leading-relaxed text-[var(--color-features-body)]">
                    {t(`landing.feature.${f.key}.body`, {}, { defaultValue: f.defaultBody })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Closing CTA — kept from the app (not in the design), restyled on navy */}
        <section className="bg-[var(--color-ops-navy)] border-t border-[var(--color-ops-line)]">
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-20 text-center')}>
            <h3
              className={
                'text-3xl font-bold tracking-tight mb-4 text-white [font-family:var(--font-headline)]'
              }
            >
              {t(
                'landing.ctaHeading',
                {},
                { defaultValue: 'Watch your whole fleet from one screen' },
              )}
            </h3>
            <p className="text-base text-[var(--color-ops-muted)] max-w-xl mx-auto mb-8">
              {t(
                'landing.ctaBody',
                {},
                {
                  defaultValue:
                    'Connect your existing telematics provider in minutes. No new hardware required.',
                },
              )}
            </p>
            <Link
              to="/signup"
              data-mol-id="landing-footer-cta"
              className={
                'inline-flex items-center gap-2 px-6 py-3 font-medium bg-[var(--color-brand-cyan)] hover:bg-[var(--color-brand-cyan-strong)] text-white rounded-[0.5rem] transition-colors'
              }
            >
              {t('landing.heroCta', {}, { defaultValue: 'Get a demo' })}
              <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-[var(--color-ops-navy)] border-t border-[var(--color-ops-line)]">
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            'py-12 flex flex-col md:flex-row justify-between items-center gap-6',
          )}
        >
          <div className="text-lg font-black text-white">{APP_NAME}</div>
          <div className="flex flex-wrap justify-center gap-6 text-[10px] uppercase tracking-widest text-[var(--color-ops-faint)] [font-family:var(--font-data)]">
            <Link
              to="/privacy"
              className="hover:text-white opacity-80 hover:opacity-100 transition-opacity"
            >
              {t('landing.footerPrivacy', {}, { defaultValue: 'Privacy Policy' })}
            </Link>
            <Link
              to="/terms"
              className="hover:text-white opacity-80 hover:opacity-100 transition-opacity"
            >
              {t('landing.footerTerms', {}, { defaultValue: 'Terms of Service' })}
            </Link>
            <Link
              to="/pricing"
              className="hover:text-white opacity-80 hover:opacity-100 transition-opacity"
            >
              {t('landing.pricingLink', {}, { defaultValue: 'Pricing' })}
            </Link>
          </div>
          <p className="text-[10px] uppercase tracking-widest text-[var(--color-ops-faint)] [font-family:var(--font-data)] text-center">
            {t(
              'common.copyrightAllRightsReserved',
              { year, app: APP_NAME },
              { defaultValue: '© {{year}} {{app}}. All rights reserved.' },
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
