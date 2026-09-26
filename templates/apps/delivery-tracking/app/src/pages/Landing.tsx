import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

const FEATURES = [
  {
    key: 'realtime',
    defaultTitle: 'Real-time across 200+ carriers',
    defaultBody:
      'One unified API. UPS, FedEx, USPS, DHL, regional carriers — same payload shape, no per-carrier code.',
    icon: 'public',
    tint: 'text-info',
  },
  {
    key: 'alerts',
    defaultTitle: 'Exception alerts that fire',
    defaultBody:
      'Customs holds, weather delays, address issues, attempted-but-not-delivered — all flagged before customers ask.',
    icon: 'warning',
    tint: 'text-error',
  },
  {
    key: 'webhooks',
    defaultTitle: 'Webhooks with replay',
    defaultBody:
      'Every shipment status event posted to your endpoint. Failed deliveries replay-able for 30 days.',
    icon: 'webhook',
    tint: 'text-warning',
  },
  {
    key: 'analytics',
    defaultTitle: 'Performance you can act on',
    defaultBody:
      'On-time rate, average dwell time, exception rate per carrier per route. Spot the problem; fix it.',
    icon: 'insights',
    tint: 'text-success',
  },
] as const

const STATS = [
  { key: 'shipments', defaultLabel: 'Shipments tracked', value: '120M+' },
  { key: 'carriers', defaultLabel: 'Carriers integrated', value: '247' },
  { key: 'uptime', defaultLabel: 'Uptime', value: '99.99%' },
  { key: 'companies', defaultLabel: 'Companies', value: '8,400+' },
]

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
            'flex-wrap gap-x-4 gap-y-2',
            cm.mxAuto,
          )}
        >
          <Link
            to="/"
            className={'min-w-0 whitespace-nowrap shrink-0 text-xl font-extrabold tracking-tight'}
          >
            {APP_NAME}
          </Link>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'min-w-0 flex-wrap')}>
            <Link
              to="/pricing"
              className={
                'hidden sm:inline whitespace-nowrap text-sm font-medium text-on-surface-variant hover:text-on-surface'
              }
            >
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </Link>
            <Link
              to="/about"
              className={
                'hidden sm:inline whitespace-nowrap text-sm font-medium text-on-surface-variant hover:text-on-surface'
              }
            >
              {t('nav.about', {}, { defaultValue: 'About' })}
            </Link>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                data-mol-id="nav-go-to-dashboard"
                className={
                  'whitespace-nowrap shrink-0 px-5 py-2 font-semibold bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors'
                }
              >
                {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className={
                    'whitespace-nowrap text-sm font-medium text-on-surface-variant hover:text-on-surface'
                  }
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  className={
                    'whitespace-nowrap shrink-0 px-5 py-2 font-semibold bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors'
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
        {/* Hero — light cyan radial wash with map sample on the right */}
        <section className="relative overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                'radial-gradient(circle at 25% 30%, color-mix(in srgb, var(--mol-color-info) 18%, transparent), transparent 50%),' +
                'radial-gradient(circle at 78% 60%, color-mix(in srgb, var(--mol-color-success) 12%, transparent), transparent 45%)',
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
                  {t('landing.eyebrow', {}, { defaultValue: 'Logistics ops platform · realtime' })}
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
                        "Track every package across every carrier. Flag exceptions before they become tickets. Built for ops teams who can't miss a beat.",
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

              {/* Sample tracking map card */}
              <div className={'lg:col-span-5'}>
                <div
                  className={
                    'relative overflow-hidden rounded-[2rem] text-white shadow-2xl shadow-primary/20'
                  }
                  style={{ backgroundColor: 'var(--color-navy)', minHeight: '380px' }}
                >
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage:
                        'radial-gradient(circle at 25% 50%, color-mix(in srgb, var(--mol-color-info) 50%, transparent) 0%, transparent 40%),' +
                        'radial-gradient(circle at 70% 30%, color-mix(in srgb, var(--mol-color-success) 35%, transparent) 0%, transparent 35%),' +
                        'linear-gradient(135deg, var(--color-navy) 0%, var(--color-map-bg) 100%)',
                    }}
                    aria-hidden="true"
                  />
                  <svg
                    className={'absolute inset-0 w-full h-full opacity-40'}
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M14,58 Q24,45 34,32 T54,52 Q66,32 76,28"
                      fill="none"
                      stroke="white"
                      strokeWidth="0.5"
                      strokeDasharray="2,1.5"
                    />
                  </svg>
                  {[
                    { x: 14, y: 58, colorVar: 'var(--color-status-in-transit)' },
                    { x: 34, y: 32, colorVar: 'var(--color-status-out-delivery)' },
                    { x: 54, y: 52, colorVar: 'var(--color-status-delivered)' },
                    { x: 76, y: 28, colorVar: 'var(--color-status-exception)' },
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
                        backgroundColor: pin.colorVar,
                        boxShadow: `0 0 0 6px color-mix(in srgb, ${pin.colorVar} 33%, transparent), 0 0 0 12px color-mix(in srgb, ${pin.colorVar} 10%, transparent)`,
                      }}
                      aria-hidden="true"
                    />
                  ))}

                  <div className={'relative z-10 p-7 flex flex-col justify-between min-h-[380px]'}>
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
                        Live
                      </span>
                    </div>
                    <div>
                      <p
                        className={
                          'text-[11px] font-bold uppercase tracking-widest text-cyan-300/80 mb-2'
                        }
                      >
                        4,218 packages on the move
                      </p>
                      <p className="text-3xl font-extrabold tracking-tight leading-tight">
                        94% on time
                      </p>
                      <p className={'text-xs font-mono text-white/60 tabular-nums mt-2'}>
                        1Z999AA10123456784 · ETA Tomorrow
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

        {/* Stats */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-12')}>
          <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-2 md:grid-cols-4')}>
            {STATS.map((s) => (
              <div
                key={s.key}
                className={
                  'bg-surface-container-lowest rounded-2xl p-6 text-center hover:shadow-lg transition-shadow'
                }
              >
                <p
                  className={
                    'text-3xl md:text-4xl font-extrabold tracking-tight text-primary tabular-nums'
                  }
                >
                  {s.value}
                </p>
                <p
                  className={
                    'text-xs font-bold uppercase tracking-widest text-on-surface-variant mt-2'
                  }
                >
                  {t(`landing.stat.${s.key}`, {}, { defaultValue: s.defaultLabel })}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Feature grid */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-20')}>
          <h2 className={'mb-12 text-center text-3xl md:text-4xl font-extrabold tracking-tight'}>
            {t(
              'landing.featuresHeading',
              {},
              { defaultValue: "Built for ops teams who can't miss a beat" },
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
              {t('landing.ctaHeading', {}, { defaultValue: 'Track every mile' })}
            </h3>
            <p className={'text-base text-on-surface-variant max-w-xl mx-auto mb-8'}>
              {t(
                'landing.ctaBody',
                {},
                {
                  defaultValue: 'Wire up your existing carriers in minutes. No new APIs to learn.',
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
