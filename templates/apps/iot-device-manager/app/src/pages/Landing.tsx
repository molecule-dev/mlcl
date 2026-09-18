import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

const FEATURES = [
  {
    key: 'telemetry',
    defaultTitle: 'Live telemetry',
    defaultBody:
      'Every signal, every device, every minute. MQTT ingest and 5-second auto-refresh keep the fleet in view.',
    icon: 'sensors',
    tint: 'text-info',
  },
  {
    key: 'commands',
    defaultTitle: 'Remote commands',
    defaultBody:
      'One-shot commands or scheduled campaigns. Acknowledge tracking and timeout retries are built in.',
    icon: 'terminal',
    tint: 'text-secondary',
  },
  {
    key: 'firmware',
    defaultTitle: 'Firmware orchestration',
    defaultBody:
      'Stable, beta, canary channels with phased rollouts and per-cohort failure cutoffs that auto-rollback.',
    icon: 'system_update',
    tint: 'text-success',
  },
  {
    key: 'alerts',
    defaultTitle: 'Smart alerts',
    defaultBody:
      'Threshold breaches, signal drift, geofence and battery — escalated by severity, never noise.',
    icon: 'notifications_active',
    tint: 'text-error',
  },
] as const

/**
 * Public marketing landing — Catalog §14.1 nav + §1.2 editorial hero +
 * embedded sample of the auth'd FleetTelemetryHero so logged-out
 * visitors see the inside of the app.
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
          <Link to="/" className={cm.cn('text-xl font-extrabold tracking-tight')}>
            {APP_NAME}
          </Link>
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            <Link
              to="/pricing"
              className={cm.cn('text-sm font-medium text-on-surface-variant hover:text-on-surface')}
            >
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </Link>
            <Link
              to="/about"
              className={cm.cn('text-sm font-medium text-on-surface-variant hover:text-on-surface')}
            >
              {t('about.eyebrow', {}, { defaultValue: 'About' })}
            </Link>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className={cm.cn(
                  'px-5 py-2 font-semibold text-white rounded-full hover:opacity-90 transition-opacity',
                )}
                style={{
                  background:
                    'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                }}
              >
                {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className={cm.cn(
                    'text-sm font-medium text-on-surface-variant hover:text-on-surface',
                  )}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  className={cm.cn(
                    'px-5 py-2 font-semibold text-white rounded-full hover:opacity-90 transition-opacity',
                  )}
                  style={{
                    background:
                      'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                  }}
                >
                  {t('landing.getStarted', {}, { defaultValue: 'Get a demo' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        <section className={cm.cn('relative overflow-hidden')}>
          <div
            className={cm.cn('absolute inset-0 pointer-events-none')}
            style={{
              backgroundImage:
                'radial-gradient(circle at 30% 30%, rgba(8, 145, 178, 0.18), transparent 50%),' +
                'radial-gradient(circle at 75% 60%, rgba(99, 102, 241, 0.12), transparent 45%)',
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
            <div className={cm.cn('grid grid-cols-1 lg:grid-cols-12 gap-12 items-center')}>
              <div className={cm.cn('lg:col-span-7')}>
                <p
                  className={cm.cn('text-sm font-bold uppercase tracking-widest text-primary mb-4')}
                >
                  {t('landing.eyebrow', {}, { defaultValue: 'IoT command center' })}
                </p>
                <h1
                  className={cm.cn(
                    'text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[0.95] mb-6',
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
                    'text-lg text-on-surface-variant max-w-xl leading-relaxed mb-10',
                  )}
                >
                  {t(
                    'landing.heroSubtitle',
                    {},
                    {
                      defaultValue:
                        'Live device telemetry, remote commands, firmware campaigns, and smart alerts — built for ops teams orchestrating fleets of thousands.',
                    },
                  )}
                </p>
                <div className={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>
                  <Link
                    to="/signup"
                    className={cm.cn(
                      'inline-flex items-center gap-2 px-8 py-4 font-semibold text-white rounded-full hover:opacity-90 transition-opacity',
                    )}
                    style={{
                      background:
                        'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                    }}
                  >
                    {t('landing.heroCta', {}, { defaultValue: 'Get a demo' })}
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
                      'px-8 py-4 font-semibold rounded-full border border-outline-variant hover:bg-surface-container-low transition-colors',
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
                    {
                      value: '1.2M+',
                      label: t('landing.metric.devices', {}, { defaultValue: 'Devices online' }),
                    },
                    {
                      value: '99.99%',
                      label: t('landing.metric.uptime', {}, { defaultValue: 'Ingest uptime' }),
                    },
                    {
                      value: '< 200ms',
                      label: t('landing.metric.latency', {}, { defaultValue: 'Command latency' }),
                    },
                  ].map((stat) => (
                    <div key={stat.label}>
                      <p
                        className={cm.cn(
                          'text-2xl font-extrabold tracking-tight font-mono tabular-nums',
                        )}
                      >
                        {stat.value}
                      </p>
                      <p
                        className={cm.cn(
                          'text-xs uppercase tracking-widest text-on-surface-variant font-semibold mt-1',
                        )}
                      >
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className={cm.cn('lg:col-span-5')}>
                <div
                  className={cm.cn(
                    'relative overflow-hidden rounded-[2rem] text-white shadow-2xl shadow-primary/20',
                  )}
                  style={{ backgroundColor: '#0c1222', minHeight: '340px' }}
                >
                  <div
                    className={cm.cn('absolute inset-0')}
                    style={{
                      backgroundImage:
                        'radial-gradient(circle at 25% 50%, rgba(6, 182, 212, 0.45) 0%, transparent 40%),' +
                        'radial-gradient(circle at 70% 30%, rgba(99, 102, 241, 0.35) 0%, transparent 35%),' +
                        // Console-navy per DESIGN.md — fixed (NOT var(--color-text), which
                        // flips light in dark mode and would put white text on white).
                        'linear-gradient(135deg, #0c1222 0%, #1a2332 100%)',
                    }}
                    aria-hidden="true"
                  />
                  {[
                    { x: 18, y: 30, color: '#06b6d4' },
                    { x: 32, y: 56, color: '#10b981' },
                    { x: 46, y: 32, color: '#06b6d4' },
                    { x: 60, y: 60, color: '#f59e0b' },
                    { x: 74, y: 28, color: '#ef4444' },
                    { x: 86, y: 56, color: '#06b6d4' },
                  ].map((pin, i) => (
                    <span
                      key={i}
                      className={cm.cn('absolute')}
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
                  <div
                    className={cm.cn(
                      'relative z-10 p-7 flex flex-col justify-between min-h-[340px]',
                    )}
                  >
                    <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                      <span className={cm.cn('relative flex h-3 w-3')} aria-hidden="true">
                        <span
                          className={cm.cn(
                            'absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping',
                          )}
                        />
                        <span
                          className={cm.cn(
                            'relative inline-flex rounded-full h-3 w-3 bg-emerald-400',
                          )}
                        />
                      </span>
                      <span
                        className={cm.cn(
                          'text-[11px] font-bold uppercase tracking-widest text-emerald-300',
                        )}
                      >
                        {t('landing.mock.liveLabel', {}, { defaultValue: 'Live · MQTT' })}
                      </span>
                    </div>
                    <div>
                      <p
                        className={cm.cn(
                          'text-[11px] font-bold uppercase tracking-widest text-cyan-300/80 mb-2',
                        )}
                      >
                        {t(
                          'landing.mock.deviceCount',
                          {},
                          { defaultValue: '1,248 devices · 6 fleets' },
                        )}
                      </p>
                      <p
                        className={cm.cn(
                          'text-3xl font-extrabold tracking-tight leading-tight font-mono',
                        )}
                      >
                        {t('landing.mock.throughput', {}, { defaultValue: '4,218 msg/min' })}
                      </p>
                    </div>
                  </div>
                  <div
                    className={cm.cn(
                      'absolute -right-16 -bottom-16 w-48 h-48 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none',
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
              'mb-12 text-center text-3xl md:text-4xl font-extrabold tracking-tight',
            )}
          >
            {t(
              'landing.featuresHeading',
              {},
              { defaultValue: "Built for ops teams that can't miss a signal" },
            )}
          </h2>
          <div
            className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}
          >
            {FEATURES.map((f) => (
              <div
                key={f.key}
                className={cm.cn(
                  'bg-surface-container-lowest rounded-2xl p-6 hover:shadow-2xl hover:shadow-on-surface/5 transition-all group',
                )}
              >
                <div
                  className={cm.cn(
                    'inline-flex p-3 bg-surface rounded-xl shadow-sm group-hover:scale-110 transition-transform',
                    f.tint,
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-3xl')} aria-hidden="true">
                    {f.icon}
                  </span>
                </div>
                <h3 className={cm.cn('text-lg font-bold mt-5 mb-2')}>
                  {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p className={cm.cn('text-sm text-on-surface-variant leading-relaxed')}>
                  {t(`landing.feature.${f.key}.body`, {}, { defaultValue: f.defaultBody })}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className={cm.cn('border-t border-outline-variant/40')}>
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-16 text-center')}>
            <h3 className={cm.cn('text-3xl font-extrabold tracking-tight mb-4')}>
              {t(
                'landing.ctaHeading',
                {},
                { defaultValue: 'Watch the whole fleet from one screen' },
              )}
            </h3>
            <p className={cm.cn('text-base text-on-surface-variant max-w-xl mx-auto mb-8')}>
              {t(
                'landing.ctaBody',
                {},
                {
                  defaultValue:
                    'Connect any MQTT broker or HTTP endpoint in minutes. No agent, no rebuilding firmware.',
                },
              )}
            </p>
            <Link
              to="/signup"
              className={cm.cn(
                'inline-flex items-center gap-2 px-10 py-4 font-semibold text-white rounded-full hover:opacity-90 transition-opacity',
              )}
              style={{
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
              }}
            >
              {t('landing.heroCta', {}, { defaultValue: 'Get a demo' })}
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
        </section>
      </main>

      <footer
        className={cm.cn(
          'py-8 text-center text-sm bg-surface text-on-surface-variant border-t border-outline-variant',
        )}
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
