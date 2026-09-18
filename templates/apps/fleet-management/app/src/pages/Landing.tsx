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
    tint: 'text-info',
  },
  {
    key: 'alerts',
    defaultTitle: 'Smart alerts',
    defaultBody: 'Low-fuel, idle-too-long, geofence breaches — escalated by severity, never noise.',
    icon: 'notifications_active',
    tint: 'text-error',
  },
  {
    key: 'maintenance',
    defaultTitle: 'Maintenance ahead',
    defaultBody: 'Predictive scheduling by mileage and engine hours. No more surprise breakdowns.',
    icon: 'build',
    tint: 'text-warning',
  },
  {
    key: 'driver_score',
    defaultTitle: 'Driver scores',
    defaultBody:
      'Per-driver safety scoring with trip-by-trip event history and certification tracking.',
    icon: 'shield_person',
    tint: 'text-success',
  },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <nav
        className={
          'sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-outline-variant/40'
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
          <Link to="/" className={'text-xl font-extrabold tracking-tight'}>
            {APP_NAME}
          </Link>
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className={
                  'px-5 py-2 font-semibold bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors'
                }
              >
                {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
              </Link>
            ) : (
              <>
                <Link
                  to="/pricing"
                  className={'text-sm font-medium text-on-surface-variant hover:text-on-surface'}
                >
                  {t('landing.pricingLink', {}, { defaultValue: 'Pricing' })}
                </Link>
                <Link
                  to="/login"
                  className={'text-sm font-medium text-on-surface-variant hover:text-on-surface'}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  className={
                    'px-5 py-2 font-semibold bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors'
                  }
                >
                  {t('landing.getStarted', {}, { defaultValue: 'Get a demo' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        <section className="relative overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                'radial-gradient(circle at 30% 30%, rgba(8, 145, 178, 0.15), transparent 50%), radial-gradient(circle at 75% 60%, rgba(16, 185, 129, 0.10), transparent 45%)',
            }}
            aria-hidden="true"
          />
          <div
            className={cm.cn(
              cm.maxW('7xl'),
              cm.mxAuto,
              cm.sp('px', 6),
              'relative py-20 md:py-28 lg:py-32',
            )}
          >
            <div className={'grid grid-cols-1 lg:grid-cols-12 gap-12 items-center'}>
              <div className={'lg:col-span-7'}>
                <p className={'text-sm font-bold uppercase tracking-widest text-primary mb-4'}>
                  {t('landing.eyebrow', {}, { defaultValue: 'Fleet operations command center' })}
                </p>
                <h1
                  className={
                    'text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[0.95] mb-6'
                  }
                >
                  {t(
                    'landing.heroTitle',
                    { tagline: APP_TAGLINE },
                    { defaultValue: '{{tagline}}' },
                  )}
                </h1>
                <p className={'text-lg text-on-surface-variant max-w-xl leading-relaxed mb-10'}>
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
                    className={
                      'inline-flex items-center gap-2 px-8 py-4 font-semibold bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors'
                    }
                  >
                    {t('landing.heroCta', {}, { defaultValue: 'Get a demo' })}
                    <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                      arrow_forward
                    </span>
                  </Link>
                  <Link
                    to="/login"
                    className={
                      'px-8 py-4 font-semibold rounded-full border border-outline-variant hover:bg-surface-container-low transition-colors'
                    }
                  >
                    {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                  </Link>
                </div>
              </div>

              <div className={'lg:col-span-5'}>
                <div
                  className={
                    'relative overflow-hidden rounded-[2rem] text-white shadow-2xl shadow-primary/20'
                  }
                  style={{ backgroundColor: 'var(--color-map-bg)', minHeight: '320px' }}
                >
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage:
                        'radial-gradient(circle at 25% 50%, rgba(8, 145, 178, 0.45) 0%, transparent 40%),' +
                        'radial-gradient(circle at 70% 30%, rgba(16, 185, 129, 0.35) 0%, transparent 35%),' +
                        'linear-gradient(135deg, var(--color-map-bg) 0%, #162a44 100%)',
                    }}
                    aria-hidden="true"
                  />
                  {[
                    { x: 18, y: 30, color: '#0891b2' },
                    { x: 32, y: 56, color: '#10b981' },
                    { x: 46, y: 32, color: '#0891b2' },
                    { x: 60, y: 60, color: '#f59e0b' },
                    { x: 74, y: 28, color: '#dc2626' },
                    { x: 86, y: 56, color: '#0891b2' },
                  ].map((pin, i) => (
                    <span
                      key={i}
                      className="absolute"
                      style={{
                        left: `${pin.x}%`,
                        top: `${pin.y}%`,
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: pin.color,
                        boxShadow: `0 0 0 6px ${pin.color}33, 0 0 0 12px ${pin.color}1a`,
                      }}
                      aria-hidden="true"
                    />
                  ))}
                  <div className={'relative z-10 p-7 flex flex-col justify-between min-h-[320px]'}>
                    <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                      <span className={'relative flex h-3 w-3'}>
                        <span
                          className={
                            'absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping'
                          }
                        />
                        <span
                          className={'relative inline-flex rounded-full h-3 w-3 bg-emerald-400'}
                        />
                      </span>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-300">
                        {t('landing.mockLive', {}, { defaultValue: 'Live' })}
                      </span>
                    </div>
                    <div>
                      <p
                        className={
                          'text-[11px] font-bold uppercase tracking-widest text-cyan-300/80 mb-2'
                        }
                      >
                        {t(
                          'landing.mockFleetSummary',
                          {},
                          { defaultValue: '12 vehicles · 8 drivers' },
                        )}
                      </p>
                      <p className="text-3xl font-extrabold tracking-tight leading-tight">
                        {t('landing.mockMilesToday', {}, { defaultValue: '4,218 mi today' })}
                      </p>
                    </div>
                  </div>
                  <div
                    className={
                      'absolute -right-16 -bottom-16 w-48 h-48 rounded-full bg-cyan-500/20 blur-3xl'
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-20')}>
          <h2 className={'mb-12 text-center text-3xl md:text-4xl font-extrabold tracking-tight'}>
            {t(
              'landing.featuresHeading',
              {},
              { defaultValue: "Built for dispatchers who can't miss a thing" },
            )}
          </h2>
          <div
            className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}
          >
            {FEATURES.map((f) => (
              <div
                key={f.key}
                className={
                  'bg-surface-container-lowest rounded-2xl p-6 hover:shadow-2xl hover:shadow-on-surface/5 transition-all group'
                }
              >
                <div
                  className={cm.cn(
                    'inline-flex p-3 bg-surface rounded-xl shadow-sm group-hover:scale-110 transition-transform',
                    f.tint,
                  )}
                >
                  <span className="material-symbols-outlined text-3xl" aria-hidden="true">
                    {f.icon}
                  </span>
                </div>
                <h3 className={'text-lg font-bold mt-5 mb-2'}>
                  {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p className={'text-sm text-on-surface-variant leading-relaxed'}>
                  {t(`landing.feature.${f.key}.body`, {}, { defaultValue: f.defaultBody })}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className={'border-t border-outline-variant/40'}>
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-16 text-center')}>
            <h3 className={'text-3xl font-extrabold tracking-tight mb-4'}>
              {t(
                'landing.ctaHeading',
                {},
                { defaultValue: 'Watch your whole fleet from one screen' },
              )}
            </h3>
            <p className={'text-base text-on-surface-variant max-w-xl mx-auto mb-8'}>
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
              className={
                'inline-flex items-center gap-2 px-10 py-4 font-semibold bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors'
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

      <footer
        className={
          'py-8 text-center text-sm bg-surface text-on-surface-variant border-t border-outline-variant'
        }
      >
        <p>
          {t(
            'common.copyrightBuiltWithMolecule',
            { year: new Date().getFullYear(), app: APP_NAME },
            { defaultValue: '© {{year}} {{app}}. Built with Molecule.' },
          )}
        </p>
      </footer>
    </div>
  )
}
