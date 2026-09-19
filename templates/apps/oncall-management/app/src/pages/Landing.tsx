import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE, BRAND_COLOR } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { IncidentRow, type IncidentRowData } from '../components/IncidentRow.js'

const NAV_BG = 'color-mix(in srgb, var(--color-background) 85%, transparent)'
const SURFACE_DARK = 'var(--color-background)'
const SURFACE_PANEL = 'var(--color-surface)'

const FEATURES = [
  {
    key: 'rotations',
    defaultTitle: 'Rotation schedules',
    defaultBody:
      'Weekly or daily rotations with handoff times, coverage calendars, and holiday overrides.',
    icon: 'event_repeat',
    tint: 'var(--color-severity-resolved)',
  },
  {
    key: 'escalation',
    defaultTitle: 'Escalation ladders',
    defaultBody: 'Notify a responder, wait N minutes, page the next layer — then the channel.',
    icon: 'moving',
    tint: 'var(--color-severity-info)',
  },
  {
    key: 'ackResolve',
    defaultTitle: 'Ack → resolve workflow',
    defaultBody:
      'Every page is a tracked incident: trigger, acknowledge, resolve — with a full timeline.',
    icon: 'notifications_active',
    tint: 'var(--color-severity-error)',
  },
  {
    key: 'postmortems',
    defaultTitle: 'Blameless postmortems',
    defaultBody:
      'Contributing factors and action items with owners, so the same page never fires twice.',
    icon: 'history_edu',
    tint: 'var(--color-severity-new)',
  },
] as const

const PRICING = [
  {
    tier: 'free',
    price: '$0',
    defaultLabel: 'Free',
    defaultDesc: 'For solo maintainers',
    features: ['1 user', '5 schedules', 'In-app paging', '90-day retention'],
  },
  {
    tier: 'pro',
    price: '$15',
    defaultLabel: 'Pro',
    defaultDesc: 'For teams that ship daily',
    features: [
      'Up to 10 responders',
      '500 schedules + policies',
      'Postmortems + MTTR stats',
      '365-day retention',
    ],
  },
  {
    tier: 'team',
    price: '$49',
    defaultLabel: 'Team',
    defaultDesc: 'For platform orgs',
    features: [
      'Unlimited responders',
      'Unlimited everything',
      'Priority paging support',
      'Data export',
    ],
  },
] as const

const DEMO_INCIDENTS: IncidentRowData[] = [
  {
    id: 'demo-1',
    title: 'Checkout API returning 503 for all requests',
    severity: 'critical',
    status: 'triggered',
    service: 'checkout-api',
    assignee: null,
    escalation_policy_name: 'Platform P1',
    escalation_level: 0,
    triggered_at: new Date(Date.now() - 9 * 60_000).toISOString(),
  },
  {
    id: 'demo-2',
    title: 'Payment authorization latency above 4s',
    severity: 'critical',
    status: 'acknowledged',
    service: 'payments-web',
    assignee: 'Morgan',
    escalation_policy_name: 'Platform P1',
    escalation_level: 1,
    triggered_at: new Date(Date.now() - 75 * 60_000).toISOString(),
    acked_at: new Date(Date.now() - 52 * 60_000).toISOString(),
  },
  {
    id: 'demo-3',
    title: 'Login throttling misconfigured for SSO users',
    severity: 'warning',
    status: 'resolved',
    service: 'auth-api',
    assignee: 'Jordan',
    escalation_policy_name: 'Services P2',
    escalation_level: 0,
    triggered_at: new Date(Date.now() - 26 * 60 * 60_000).toISOString(),
    acked_at: new Date(Date.now() - 25 * 60 * 60_000).toISOString(),
    resolved_at: new Date(Date.now() - 23 * 60 * 60_000).toISOString(),
  },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div
      className={cm.cn(cm.minH('screen'), 'antialiased font-body')}
      style={{ backgroundColor: SURFACE_DARK, color: 'var(--color-text)' }}
    >
      <nav
        className={cm.cn('sticky top-0 z-50 backdrop-blur-md border-b')}
        style={{ backgroundColor: NAV_BG, borderColor: 'var(--color-border)' }}
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
            className={cm.cn('flex items-center gap-2 text-xl font-extrabold tracking-tight')}
            style={{ color: 'var(--color-text)' }}
          >
            <span
              className={cm.cn('inline-flex h-8 w-8 items-center justify-center rounded-lg')}
              style={{ backgroundColor: BRAND_COLOR, color: 'var(--color-on-primary)' }}
              aria-hidden="true"
            >
              <span className={cm.cn('material-symbols-outlined text-[20px]')}>
                notifications_active
              </span>
            </span>
            <span>{APP_NAME}</span>
          </Link>
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className={cm.cn(
                  'px-5 py-2 font-mono font-semibold text-sm rounded-md transition-all hover:opacity-90 shadow-lg',
                )}
                style={{
                  backgroundColor: BRAND_COLOR,
                  color: 'var(--color-on-primary)',
                  boxShadow:
                    '0 8px 24px -8px color-mix(in srgb, var(--color-primary) 40%, transparent)',
                }}
                data-mol-id="nav-go-to-dashboard"
              >
                {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className={cm.cn('text-sm font-medium transition-colors hover:opacity-80')}
                  style={{
                    color: 'color-mix(in srgb, var(--color-on-background) 75%, transparent)',
                  }}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  className={cm.cn(
                    'px-5 py-2 font-mono font-semibold text-sm rounded-md transition-all hover:opacity-90 shadow-lg',
                  )}
                  style={{
                    backgroundColor: BRAND_COLOR,
                    color: 'var(--color-on-primary)',
                    boxShadow:
                      '0 8px 24px -8px color-mix(in srgb, var(--color-primary) 40%, transparent)',
                  }}
                >
                  {t('common.startFree', {}, { defaultValue: 'Start free' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        {/* Hero — ops-console aesthetic with embedded live pager */}
        <section className={cm.cn('relative overflow-hidden')}>
          <div
            className={cm.cn('absolute inset-0 pointer-events-none')}
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 25%, color-mix(in srgb, var(--color-primary) 20%, transparent), transparent 50%),' +
                'radial-gradient(circle at 80% 60%, color-mix(in srgb, var(--color-error) 14%, transparent), transparent 45%)',
            }}
            aria-hidden="true"
          />
          <div
            className={cm.cn('absolute inset-0 opacity-[0.07] pointer-events-none')}
            style={{
              backgroundImage:
                'linear-gradient(color-mix(in srgb, var(--color-on-background) 50%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--color-on-background) 50%, transparent) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
            aria-hidden="true"
          />
          <div
            className={cm.cn(
              cm.maxW('7xl'),
              cm.mxAuto,
              cm.sp('px', 6),
              'relative py-20 md:py-24 lg:py-28',
            )}
          >
            <div
              className={cm.cn('grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center')}
            >
              <div className={cm.cn('lg:col-span-7')}>
                <p
                  className={cm.cn('font-mono text-sm font-bold uppercase tracking-widest mb-5')}
                  style={{ color: BRAND_COLOR }}
                >
                  {t('landing.kicker', {}, { defaultValue: '$ klaxon page --oncall primary' })}
                </p>
                <h1
                  className={cm.cn(
                    'text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[0.95] mb-6',
                  )}
                  style={{ color: 'var(--color-text)' }}
                >
                  {t(
                    'landing.heroTitle',
                    { tagline: APP_TAGLINE },
                    { defaultValue: '{{tagline}}.' },
                  )}
                </h1>
                <p
                  className={cm.cn('text-lg max-w-xl leading-relaxed mb-10')}
                  style={{
                    color: 'color-mix(in srgb, var(--color-on-background) 75%, transparent)',
                  }}
                >
                  {t(
                    'landing.heroSubtitle',
                    {},
                    {
                      defaultValue:
                        'Rotations that hand off on time. Escalation ladders that never give up. Incidents that get acked, resolved, and written up.',
                    },
                  )}
                </p>
                <div className={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>
                  <Link
                    to="/signup"
                    className={cm.cn(
                      'inline-flex items-center gap-2 px-8 py-4 font-mono font-semibold rounded-md transition-all hover:opacity-90 shadow-xl',
                    )}
                    style={{
                      backgroundColor: BRAND_COLOR,
                      color: 'var(--color-on-primary)',
                      boxShadow:
                        '0 12px 32px -10px color-mix(in srgb, var(--color-primary) 45%, transparent)',
                    }}
                  >
                    {t('common.startFree', {}, { defaultValue: 'Start free' })}
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
                      'px-8 py-4 font-mono font-semibold rounded-md border transition-colors hover:bg-surface/5',
                    )}
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                  >
                    {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                  </Link>
                </div>

                <div className={cm.cn('mt-10 flex flex-wrap items-center gap-x-8 gap-y-3')}>
                  <p
                    className={cm.cn('text-xs font-bold uppercase tracking-widest')}
                    style={{
                      color: 'color-mix(in srgb, var(--color-on-background) 40%, transparent)',
                    }}
                  >
                    {t('landing.socialProof', {}, { defaultValue: 'Trusted by on-call teams at' })}
                  </p>
                  {['Atlas', 'Northwind', 'Stratafy', 'Helix'].map((brand) => (
                    <span
                      key={brand}
                      className={cm.cn('font-mono text-sm font-bold')}
                      style={{
                        color: 'color-mix(in srgb, var(--color-on-background) 55%, transparent)',
                      }}
                    >
                      {brand}
                    </span>
                  ))}
                </div>
              </div>

              {/* Embedded sample — mirrors the auth'd hero */}
              <div className={cm.cn('lg:col-span-5')}>
                <div
                  className={cm.cn('rounded-2xl shadow-2xl overflow-hidden border')}
                  style={{
                    backgroundColor: SURFACE_PANEL,
                    borderColor: 'var(--color-border)',
                    boxShadow: '0 30px 80px -30px rgba(0,0,0,0.7)',
                  }}
                >
                  <div
                    className={cm.cn('flex items-center gap-2 px-4 py-2.5 border-b')}
                    style={{
                      borderColor: 'var(--color-border)',
                      backgroundColor: 'var(--color-code-block)',
                    }}
                  >
                    <span
                      className={cm.cn('w-3 h-3 rounded-full')}
                      style={{ backgroundColor: 'rgba(239, 68, 68, 0.7)' }}
                      aria-hidden="true"
                    />
                    <span
                      className={cm.cn('w-3 h-3 rounded-full')}
                      style={{ backgroundColor: 'rgba(234, 179, 8, 0.7)' }}
                      aria-hidden="true"
                    />
                    <span
                      className={cm.cn('w-3 h-3 rounded-full')}
                      style={{
                        backgroundColor:
                          'color-mix(in srgb, var(--color-primary) 70%, transparent)',
                      }}
                      aria-hidden="true"
                    />
                    <span
                      className={cm.cn('ml-3 font-mono text-[11px] font-medium')}
                      style={{
                        color: 'color-mix(in srgb, var(--color-on-background) 60%, transparent)',
                      }}
                    >
                      {APP_NAME.toLowerCase()} · live pager
                    </span>
                    <span className={cm.cn('ml-auto inline-flex items-center gap-1.5')}>
                      <span
                        className={cm.cn('inline-block h-2 w-2 rounded-full animate-pulse')}
                        style={{
                          backgroundColor: BRAND_COLOR,
                          boxShadow: `0 0 0 3px ${BRAND_COLOR}40`,
                        }}
                        aria-hidden="true"
                      />
                      <span
                        className={cm.cn(
                          'font-mono text-[10px] font-bold uppercase tracking-widest',
                        )}
                        style={{ color: BRAND_COLOR }}
                      >
                        live
                      </span>
                    </span>
                  </div>
                  <div className={cm.cn('p-4 space-y-3')}>
                    {DEMO_INCIDENTS.map((incident) => (
                      <IncidentRow key={incident.id} incident={incident} linked={false} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature grid */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-20')}>
          <p
            className={cm.cn(
              'text-center font-mono text-xs font-bold uppercase tracking-widest mb-3',
            )}
            style={{ color: BRAND_COLOR }}
          >
            {t('landing.featuresEyebrow', {}, { defaultValue: '// on-call features' })}
          </p>
          <h2
            className={cm.cn(
              'mb-12 text-center text-3xl md:text-4xl font-extrabold tracking-tight',
            )}
            style={{ color: 'var(--color-text)' }}
          >
            {t(
              'landing.featuresHeading',
              {},
              { defaultValue: 'Built for the people holding the pager' },
            )}
          </h2>
          <div className={cm.cn('grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}>
            {FEATURES.map((f) => (
              <div
                key={f.key}
                className={cm.cn(
                  'group rounded-2xl p-6 transition-all hover:-translate-y-0.5 hover:shadow-xl',
                )}
                style={{
                  backgroundColor: SURFACE_PANEL,
                  border: '1px solid var(--color-border)',
                }}
              >
                <div
                  className={cm.cn(
                    'inline-flex p-3 rounded-xl group-hover:scale-110 transition-transform',
                  )}
                  style={{ backgroundColor: `${f.tint}22`, color: f.tint }}
                >
                  <span className={cm.cn('material-symbols-outlined text-3xl')} aria-hidden="true">
                    {f.icon}
                  </span>
                </div>
                <h3
                  className={cm.cn('text-lg font-extrabold mt-5 mb-2')}
                  style={{ color: 'var(--color-text)' }}
                >
                  {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p
                  className={cm.cn('text-sm leading-relaxed')}
                  style={{
                    color: 'color-mix(in srgb, var(--color-on-background) 70%, transparent)',
                  }}
                >
                  {t(`landing.feature.${f.key}.body`, {}, { defaultValue: f.defaultBody })}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section
          className={cm.cn('py-20 border-t')}
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-code-block)',
          }}
        >
          <div className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.mxAuto)}>
            <p
              className={cm.cn(
                'text-center font-mono text-xs font-bold uppercase tracking-widest mb-3',
              )}
              style={{ color: BRAND_COLOR }}
            >
              {t('landing.pricingEyebrow', {}, { defaultValue: '// $ pricing --plain' })}
            </p>
            <h2
              className={cm.cn(
                'text-center text-3xl md:text-4xl font-extrabold tracking-tight mb-12',
              )}
              style={{ color: 'var(--color-text)' }}
            >
              {t(
                'landing.pricingHeading',
                {},
                { defaultValue: 'Pay for the pager, not the noise' },
              )}
            </h2>
            <div className={cm.cn('grid gap-6 grid-cols-1 md:grid-cols-3')}>
              {PRICING.map((p, i) => {
                const featured = i === 1
                return (
                  <div
                    key={p.tier}
                    className={cm.cn(
                      'relative rounded-2xl p-7 transition-all hover:-translate-y-1',
                    )}
                    style={{
                      backgroundColor: SURFACE_PANEL,
                      border: featured
                        ? `2px solid ${BRAND_COLOR}`
                        : '1px solid var(--color-border)',
                      boxShadow: featured ? `0 18px 50px -20px ${BRAND_COLOR}80` : undefined,
                    }}
                  >
                    {featured ? (
                      <span
                        className={cm.cn(
                          'absolute -top-3 left-1/2 -translate-x-1/2 inline-flex px-3 py-0.5 rounded-full font-mono text-[10px] font-black uppercase tracking-widest',
                        )}
                        style={{ backgroundColor: BRAND_COLOR, color: 'var(--color-on-primary)' }}
                      >
                        {t('status.mostPopular', {}, { defaultValue: 'Most popular' })}
                      </span>
                    ) : null}
                    <p
                      className={cm.cn('text-[10px] font-black uppercase tracking-widest')}
                      style={{
                        color: 'color-mix(in srgb, var(--color-on-background) 55%, transparent)',
                      }}
                    >
                      {t(`landing.pricing.${p.tier}.label`, {}, { defaultValue: p.defaultLabel })}
                    </p>
                    <p className={cm.cn('mt-3 font-mono')}>
                      <span
                        className={cm.cn('text-5xl font-extrabold tracking-tighter')}
                        style={{ color: 'var(--color-text)' }}
                      >
                        {p.price}
                      </span>
                      <span
                        className={cm.cn('ml-1 text-sm font-medium')}
                        style={{
                          color: 'color-mix(in srgb, var(--color-on-background) 55%, transparent)',
                        }}
                      >
                        /mo
                      </span>
                    </p>
                    <p
                      className={cm.cn('mt-2 text-sm')}
                      style={{
                        color: 'color-mix(in srgb, var(--color-on-background) 65%, transparent)',
                      }}
                    >
                      {t(`landing.pricing.${p.tier}.desc`, {}, { defaultValue: p.defaultDesc })}
                    </p>
                    <ul className={cm.cn('mt-5 space-y-2.5')}>
                      {p.features.map((f) => (
                        <li
                          key={f}
                          className={cm.cn('flex items-center gap-2.5 text-sm')}
                          style={{
                            color:
                              'color-mix(in srgb, var(--color-on-background) 85%, transparent)',
                          }}
                        >
                          <span
                            className={cm.cn('material-symbols-outlined text-base shrink-0')}
                            style={{ color: BRAND_COLOR }}
                            aria-hidden="true"
                          >
                            check_circle
                          </span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Link
                      to="/signup"
                      className={cm.cn(
                        'mt-6 block w-full text-center px-4 py-3 rounded-md font-mono font-semibold transition-colors',
                      )}
                      style={
                        featured
                          ? { backgroundColor: BRAND_COLOR, color: 'var(--color-on-primary)' }
                          : { border: '1px solid var(--color-border)', color: 'var(--color-text)' }
                      }
                    >
                      {t('landing.choosePlan', {}, { defaultValue: 'Choose plan' })}
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className={cm.cn('border-t')} style={{ borderColor: 'var(--color-border)' }}>
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-16 text-center')}>
            <h3
              className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight mb-4')}
              style={{ color: 'var(--color-text)' }}
            >
              {t('landing.ctaHeading', {}, { defaultValue: 'Never miss a page.' })}
            </h3>
            <p
              className={cm.cn('text-base max-w-xl mx-auto mb-8')}
              style={{ color: 'color-mix(in srgb, var(--color-on-background) 70%, transparent)' }}
            >
              {t(
                'landing.ctaBody',
                {},
                {
                  defaultValue:
                    'No credit card. First rotation live in under five minutes — and the pager stays in-app while you try it.',
                },
              )}
            </p>
            <Link
              to="/signup"
              className={cm.cn(
                'inline-flex items-center gap-2 px-10 py-4 font-mono font-semibold rounded-md transition-all hover:opacity-90 shadow-xl',
              )}
              style={{
                backgroundColor: BRAND_COLOR,
                color: 'var(--color-on-primary)',
                boxShadow:
                  '0 12px 32px -10px color-mix(in srgb, var(--color-primary) 45%, transparent)',
              }}
            >
              {t('common.startFree', {}, { defaultValue: 'Start free' })}
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
        </section>
      </main>

      <footer
        className={cm.cn('py-8 text-center text-sm border-t')}
        style={{
          borderColor: 'var(--color-border)',
          color: 'color-mix(in srgb, var(--color-on-background) 55%, transparent)',
        }}
      >
        {/* Shared footer — About/Privacy/Terms links, language picker, version. */}
        <Footer />
        <p className={cm.cn('mt-4')}>
          {t(
            'landing.copyright',
            { year: new Date().getFullYear(), app: APP_NAME },
            { defaultValue: '© {{year}} {{app}}. Never miss a page.' },
          )}
        </p>
      </footer>
    </div>
  )
}
