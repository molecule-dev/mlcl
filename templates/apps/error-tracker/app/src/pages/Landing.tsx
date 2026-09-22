import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE, BRAND_COLOR } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { IssueRow, type IssueRowData } from '../components/IssueRow.js'

const NAV_BG = 'color-mix(in srgb, var(--color-background) 85%, transparent)'
const SURFACE_DARK = 'var(--color-background)'
const SURFACE_PANEL = 'var(--color-surface)'

const FEATURES = [
  {
    key: 'fingerprint',
    defaultTitle: 'Smart fingerprinting',
    defaultBody: 'Stack-aware grouping rolls a million events into a handful of issues.',
    icon: 'fingerprint',
    tint: 'var(--color-severity-resolved)',
  },
  {
    key: 'context',
    defaultTitle: 'Context that matters',
    defaultBody: 'Breadcrumbs, request body, release SHA, environment — every event.',
    icon: 'feed',
    tint: 'var(--color-severity-info)',
  },
  {
    key: 'releases',
    defaultTitle: 'Release tracking',
    defaultBody: 'See exactly which deploy introduced an issue and revert in one click.',
    icon: 'rocket_launch',
    tint: 'var(--color-severity-new)',
  },
  {
    key: 'alerts',
    defaultTitle: 'Alert rules that fit',
    defaultBody: 'Threshold, regression, and anomaly rules without paging the world.',
    icon: 'notifications_active',
    tint: 'var(--color-severity-error)',
  },
] as const

const PRICING = [
  {
    tier: 'free',
    price: '$0',
    defaultLabel: 'Free',
    defaultDesc: 'For solo and side projects',
    features: ['1 user', '50K events / mo', '7-day retention', 'Email alerts'],
  },
  {
    tier: 'pro',
    price: '$29',
    defaultLabel: 'Pro',
    defaultDesc: 'For teams shipping daily',
    features: ['Up to 10 users', '1M events / mo', '30-day retention', 'Slack + PagerDuty'],
  },
  {
    tier: 'team',
    price: '$99',
    defaultLabel: 'Team',
    defaultDesc: 'For platform teams',
    features: [
      'Unlimited users',
      '10M events / mo',
      '90-day retention',
      'Audit log + SAML SSO',
      '99.95% SLA',
    ],
  },
] as const

const DEMO_ISSUES: IssueRowData[] = [
  {
    id: 'demo-1',
    title: "TypeError: Cannot read properties of undefined (reading 'amount')",
    culprit: 'src/checkout/total.ts in computeTotal',
    level: 'critical',
    status: 'unresolved',
    event_count: 1247,
    user_count: 312,
    first_seen: new Date(Date.now() - 4 * 60 * 60_000).toISOString(),
    last_seen: new Date(Date.now() - 3 * 60_000).toISOString(),
    fingerprint: 'a7f3d2c1e9b04a59',
    environment: 'production',
    release: '4.2.1',
    assignee: 'Riley',
    is_regression: true,
    frequency: [3, 4, 6, 8, 12, 9, 14, 22, 28, 31, 27, 35, 42, 51, 47, 39, 44, 58, 71, 82],
  },
  {
    id: 'demo-2',
    title: 'NetworkError: Request timed out after 30000ms',
    culprit: 'src/lib/http.ts in fetchWithRetry',
    level: 'error',
    status: 'unresolved',
    event_count: 482,
    user_count: 138,
    first_seen: new Date(Date.now() - 36 * 60 * 60_000).toISOString(),
    last_seen: new Date(Date.now() - 11 * 60_000).toISOString(),
    fingerprint: '8b2e6f4d913a2c01',
    environment: 'production',
    release: '4.2.1',
    assignee: null,
    frequency: [12, 14, 11, 9, 8, 7, 9, 11, 12, 10, 9, 8, 11, 13, 12, 14, 13, 11, 10, 12],
  },
  {
    id: 'demo-3',
    title: 'NullPointerException: project.owner was null',
    culprit: 'api/handlers/projects.ts:241',
    level: 'warning',
    status: 'resolved',
    event_count: 73,
    user_count: 19,
    first_seen: new Date(Date.now() - 5 * 24 * 60 * 60_000).toISOString(),
    last_seen: new Date(Date.now() - 4 * 60 * 60_000).toISOString(),
    fingerprint: 'c14f9a3b2e80517f',
    environment: 'staging',
    release: '4.2.0',
    assignee: 'Jordan',
    frequency: [8, 6, 5, 4, 3, 4, 5, 6, 5, 4, 3, 2, 1, 1, 0, 0, 0, 0, 0, 0],
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
              <span className={cm.cn('material-symbols-outlined text-[20px]')}>bug_report</span>
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
                  className={cm.cn(
                    'inline-flex items-center px-2 py-2 text-sm font-medium transition-colors hover:opacity-80',
                  )}
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
        {/* Hero — terminal aesthetic with embedded sample */}
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
                  {t('landing.kicker', {}, { defaultValue: '$ tail -f production.log' })}
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
                        'Stack traces you can read. Releases you can blame. Alerts that fire only when it matters.',
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
                    {t('landing.socialProof', {}, { defaultValue: 'Trusted by SRE teams at' })}
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
                      {APP_NAME.toLowerCase()} · live issues
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
                    {DEMO_ISSUES.map((issue) => (
                      <IssueRow key={issue.id} issue={issue} linked={false} />
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
            {t('landing.featuresEyebrow', {}, { defaultValue: '// triage features' })}
          </p>
          <h2
            className={cm.cn(
              'mb-12 text-center text-3xl md:text-4xl font-extrabold tracking-tight',
            )}
            style={{ color: 'var(--color-text)' }}
          >
            {t('landing.featuresHeading', {}, { defaultValue: 'Built for engineers on call' })}
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
              {t('landing.pricingHeading', {}, { defaultValue: 'Pay for what you ingest' })}
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
              {t('landing.ctaHeading', {}, { defaultValue: 'Catch what breaks.' })}
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
                    'No credit card. No on-call rotation required. First stack trace ingested in under five minutes.',
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
            { defaultValue: '© {{year}} {{app}}. Catch what breaks.' },
          )}
        </p>
      </footer>
    </div>
  )
}
