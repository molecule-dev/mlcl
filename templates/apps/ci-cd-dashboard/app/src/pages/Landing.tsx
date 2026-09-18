import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE, BRAND_COLOR } from '../branding.js'
import type { PipelineRowData } from '../components/PipelineRow.js'
import { PipelineRow } from '../components/PipelineRow.js'

const NAV_BG = 'color-mix(in srgb, var(--color-surface) 85%, transparent)'
const SURFACE_DARK = 'var(--color-background)'
const SURFACE_PANEL = 'var(--color-surface)'

const FEATURES = [
  {
    key: 'parallel',
    defaultTitle: 'Parallel pipelines',
    defaultBody: 'Fan out tests across runners and merge results without flakiness.',
    icon: 'merge_type',
    tint: 'var(--color-pill-success-dot)',
  },
  {
    key: 'realtime',
    defaultTitle: 'Live build telemetry',
    defaultBody: 'Stream logs in real time with structured stage timing and ANSI colour.',
    icon: 'graphic_eq',
    tint: 'var(--color-pill-running-dot)',
  },
  {
    key: 'environments',
    defaultTitle: 'First-class environments',
    defaultBody: 'Promote builds across staging, preview, and prod with one click.',
    icon: 'cloud',
    tint: 'var(--color-pill-queued-dot)',
  },
  {
    key: 'insights',
    defaultTitle: 'DORA insights',
    defaultBody: 'Lead time, deploy frequency, MTTR, change failure rate — daily.',
    icon: 'bar_chart',
    tint: 'var(--color-pill-degraded-dot)',
  },
] as const

/* Mirrors the real tier ladder in api/src/tiers.ts (Free / Pro $15 / Team $49)
   so the marketing section never contradicts the live /pricing page. */
const PRICING = [
  {
    tier: 'free',
    price: '$0',
    defaultLabel: 'Free',
    defaultDesc: 'For solo and side projects',
    features: ['5 pipelines', '1,000 build min/mo', '90-day retention', 'Community support'],
  },
  {
    tier: 'pro',
    price: '$15',
    defaultLabel: 'Pro',
    defaultDesc: 'For small teams shipping daily',
    features: ['500 pipelines', 'Data export', '1-year retention', 'Priority support'],
  },
  {
    tier: 'team',
    price: '$49',
    defaultLabel: 'Team',
    defaultDesc: 'For platform teams',
    features: ['Unlimited pipelines', 'Unlimited retention', 'Data export', '99.95% SLA'],
  },
] as const

const DEMO_PIPELINES: PipelineRowData[] = [
  {
    id: 'demo-1',
    name: 'build-and-test',
    repository: 'acme-platform/api',
    branch: 'main',
    commit_sha: '8a7f3d2c1e9b04a5',
    commit_message: 'feat: idempotency keys on /checkout',
    author: 'riley@acme',
    status: 'running',
    started_at: new Date(Date.now() - 4 * 60_000).toISOString(),
    duration_seconds: null,
  },
  {
    id: 'demo-2',
    name: 'deploy-prod',
    repository: 'acme-platform/web',
    branch: 'main',
    commit_sha: 'deadbeef12345678',
    commit_message: 'feat: ship pricing page redesign',
    author: 'jordan@acme',
    status: 'success',
    started_at: new Date(Date.now() - 38 * 60_000).toISOString(),
    duration_seconds: 89,
  },
  {
    id: 'demo-3',
    name: 'deploy-staging',
    repository: 'acme-platform/api',
    branch: 'main',
    commit_sha: 'f01e2d3c4b5a6978',
    commit_message: 'chore: bump migrations runner v3.2',
    author: 'sasha@acme',
    status: 'failed',
    started_at: new Date(Date.now() - 95 * 60_000).toISOString(),
    duration_seconds: 38,
  },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div
      className={cm.cn(cm.minH('screen'), 'antialiased font-body')}
      style={{ backgroundColor: SURFACE_DARK, color: 'var(--color-on-surface)' }}
    >
      <nav
        className={'sticky top-0 z-50 backdrop-blur-md border-b'}
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
            className={
              'flex items-center gap-2 text-xl font-extrabold tracking-tight text-on-surface'
            }
          >
            <span
              className={'inline-flex h-8 w-8 items-center justify-center rounded-lg'}
              style={{ backgroundColor: BRAND_COLOR, color: 'var(--color-on-primary)' }}
              aria-hidden="true"
            >
              <span className="material-symbols-outlined text-[20px]">deployed_code</span>
            </span>
            <span>{APP_NAME}</span>
          </Link>
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            {isAuthenticated ? (
              <Link
                to="/pipelines"
                className={
                  'px-5 py-2 font-mono font-semibold text-sm rounded-md transition-all hover:opacity-90 shadow-lg'
                }
                style={{
                  backgroundColor: BRAND_COLOR,
                  color: 'var(--color-on-primary)',
                  boxShadow: '0 8px 24px -8px rgba(16, 185, 129, 0.4)',
                }}
                data-mol-id="nav-go-to-dashboard"
              >
                {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className={
                    'text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors'
                  }
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  className={
                    'px-5 py-2 font-mono font-semibold text-sm rounded-md transition-all hover:opacity-90 shadow-lg'
                  }
                  style={{
                    backgroundColor: BRAND_COLOR,
                    color: 'var(--color-on-primary)',
                    boxShadow: '0 8px 24px -8px rgba(16, 185, 129, 0.4)',
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
        <section className="relative overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 25%, rgba(16, 185, 129, 0.20), transparent 50%),' +
                'radial-gradient(circle at 80% 60%, rgba(99, 102, 241, 0.18), transparent 45%)',
            }}
            aria-hidden="true"
          />
          <div
            className="absolute inset-0 opacity-[0.07] pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
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
            <div className={'grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center'}>
              <div className={'lg:col-span-7'}>
                <p
                  className={'font-mono text-sm font-bold uppercase tracking-widest mb-5'}
                  style={{ color: BRAND_COLOR }}
                >
                  {t('landing.kicker', {}, { defaultValue: '$ ./conduit deploy --safely' })}
                </p>
                <h1
                  className={
                    'text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[0.95] mb-6 text-on-surface'
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
                        'Pipelines that finish in seconds. Logs you can read. Deploys you can trust.',
                    },
                  )}
                </p>
                <div className={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>
                  <Link
                    to="/signup"
                    className={
                      'inline-flex items-center gap-2 px-8 py-4 font-mono font-semibold rounded-md transition-all hover:opacity-90 shadow-xl'
                    }
                    style={{
                      backgroundColor: BRAND_COLOR,
                      color: 'var(--color-on-primary)',
                      boxShadow: '0 12px 32px -10px rgba(16, 185, 129, 0.45)',
                    }}
                  >
                    {t('common.startFree', {}, { defaultValue: 'Start free' })}
                    <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                      arrow_forward
                    </span>
                  </Link>
                  <Link
                    to="/login"
                    className={
                      'px-8 py-4 font-mono font-semibold rounded-md border transition-colors hover:bg-surface/5 text-on-surface'
                    }
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                  </Link>
                </div>

                {/* Social proof row */}
                <div className={'mt-10 flex flex-wrap items-center gap-x-8 gap-y-3'}>
                  <p
                    className={
                      'text-xs font-bold uppercase tracking-widest text-on-surface-variant'
                    }
                  >
                    {t('landing.socialProof', {}, { defaultValue: 'Trusted by platform teams at' })}
                  </p>
                  {['Atlas', 'Northwind', 'Stratafy', 'Helix'].map((brand) => (
                    <span
                      key={brand}
                      className={'font-mono text-sm font-bold text-on-surface-variant'}
                    >
                      {brand}
                    </span>
                  ))}
                </div>
              </div>

              {/* Embedded sample — mirrors the auth'd hero */}
              <div className={'lg:col-span-5'}>
                <div
                  className={'rounded-2xl shadow-2xl overflow-hidden border'}
                  style={{
                    backgroundColor: SURFACE_PANEL,
                    borderColor: 'rgba(30, 41, 59, 0.9)',
                    boxShadow: '0 30px 80px -30px rgba(0,0,0,0.7)',
                  }}
                >
                  {/* terminal chrome */}
                  <div
                    className={'flex items-center gap-2 px-4 py-2.5 border-b'}
                    style={{
                      borderColor: 'rgba(30, 41, 59, 0.9)',
                      backgroundColor: 'var(--color-background)',
                    }}
                  >
                    <span className={'w-3 h-3 rounded-full bg-red-400/70'} aria-hidden="true" />
                    <span className={'w-3 h-3 rounded-full bg-amber-400/70'} aria-hidden="true" />
                    <span className={'w-3 h-3 rounded-full bg-emerald-400/70'} aria-hidden="true" />
                    <span
                      className={'ml-3 font-mono text-[11px] font-medium text-on-surface-variant'}
                    >
                      conduit · live pipelines
                    </span>
                    <span className={'ml-auto inline-flex items-center gap-1.5'}>
                      <span
                        className={'inline-block h-2 w-2 rounded-full animate-pulse'}
                        style={{
                          backgroundColor: BRAND_COLOR,
                          boxShadow: `0 0 0 3px ${BRAND_COLOR}40`,
                        }}
                        aria-hidden="true"
                      />
                      <span
                        className="font-mono text-[10px] font-bold uppercase tracking-widest"
                        style={{ color: BRAND_COLOR }}
                      >
                        live
                      </span>
                    </span>
                  </div>
                  <div className={'p-4 space-y-3'}>
                    {DEMO_PIPELINES.map((pl) => (
                      <PipelineRow key={pl.id} pipeline={pl} linked={false} />
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
            className={'text-center font-mono text-xs font-bold uppercase tracking-widest mb-3'}
            style={{ color: BRAND_COLOR }}
          >
            {t('landing.featuresEyebrow', {}, { defaultValue: '// platform features' })}
          </p>
          <h2
            className={
              'mb-12 text-center text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface'
            }
          >
            {t('landing.featuresHeading', {}, { defaultValue: 'Built for shippers, by shippers' })}
          </h2>
          <div className={'grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'}>
            {FEATURES.map((f) => (
              <div
                key={f.key}
                className={
                  'group rounded-2xl p-6 transition-all hover:-translate-y-0.5 hover:shadow-xl'
                }
                style={{
                  backgroundColor: SURFACE_PANEL,
                  border: '1px solid rgba(30, 41, 59, 0.9)',
                }}
              >
                <div
                  className={
                    'inline-flex p-3 rounded-xl group-hover:scale-110 transition-transform'
                  }
                  style={{ backgroundColor: `${f.tint}22`, color: f.tint }}
                >
                  <span className="material-symbols-outlined text-3xl" aria-hidden="true">
                    {f.icon}
                  </span>
                </div>
                <h3 className={'text-lg font-extrabold mt-5 mb-2 text-on-surface'}>
                  {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p className={'text-sm text-on-surface-variant leading-relaxed'}>
                  {t(`landing.feature.${f.key}.body`, {}, { defaultValue: f.defaultBody })}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section
          className={'py-20 border-t'}
          style={{
            borderColor: 'rgba(30, 41, 59, 0.8)',
            backgroundColor: 'var(--color-background)',
          }}
        >
          <div className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.mxAuto)}>
            <p
              className={'text-center font-mono text-xs font-bold uppercase tracking-widest mb-3'}
              style={{ color: BRAND_COLOR }}
            >
              {t('landing.pricingEyebrow', {}, { defaultValue: '// $ pricing --plain' })}
            </p>
            <h2
              className={
                'text-center text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface mb-12'
              }
            >
              {t('landing.pricingHeading', {}, { defaultValue: 'Simple, predictable pricing' })}
            </h2>
            <div className={'grid gap-6 grid-cols-1 md:grid-cols-3'}>
              {PRICING.map((p, i) => {
                const featured = i === 1
                return (
                  <div
                    key={p.tier}
                    className={'relative rounded-2xl p-7 transition-all hover:-translate-y-1'}
                    style={{
                      backgroundColor: SURFACE_PANEL,
                      border: featured
                        ? `2px solid ${BRAND_COLOR}`
                        : '1px solid rgba(30, 41, 59, 0.9)',
                      boxShadow: featured ? `0 18px 50px -20px ${BRAND_COLOR}80` : undefined,
                    }}
                  >
                    {featured ? (
                      <span
                        className={
                          'absolute -top-3 left-1/2 -translate-x-1/2 inline-flex px-3 py-0.5 rounded-full font-mono text-[10px] font-black uppercase tracking-widest'
                        }
                        style={{ backgroundColor: BRAND_COLOR, color: 'var(--color-on-primary)' }}
                      >
                        {t('status.mostPopular', {}, { defaultValue: 'Most popular' })}
                      </span>
                    ) : null}
                    <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                      {t(`landing.pricing.${p.tier}.label`, {}, { defaultValue: p.defaultLabel })}
                    </p>
                    <p className={'mt-3 font-mono'}>
                      <span className="text-5xl font-extrabold tracking-tighter text-on-surface">
                        {p.price}
                      </span>
                      <span className={'ml-1 text-sm font-medium text-on-surface-variant'}>
                        /mo
                      </span>
                    </p>
                    <p className={'mt-2 text-sm text-on-surface-variant'}>
                      {t(`landing.pricing.${p.tier}.desc`, {}, { defaultValue: p.defaultDesc })}
                    </p>
                    <ul className={'mt-5 space-y-2.5'}>
                      {p.features.map((f, fi) => (
                        <li key={f} className={'flex items-center gap-2.5 text-sm text-on-surface'}>
                          <span
                            className={'material-symbols-outlined text-base shrink-0'}
                            style={{ color: BRAND_COLOR }}
                            aria-hidden="true"
                          >
                            check_circle
                          </span>
                          <span>
                            {t(`landing.pricing.${p.tier}.feature${fi}`, {}, { defaultValue: f })}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <Link
                      to="/signup"
                      className={
                        'mt-6 block w-full text-center px-4 py-3 rounded-md font-mono font-semibold transition-colors'
                      }
                      style={
                        featured
                          ? { backgroundColor: BRAND_COLOR, color: 'var(--color-on-primary)' }
                          : {
                              border: '1px solid var(--color-border)',
                              color: 'var(--color-on-surface)',
                            }
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
        <section className={'border-t'} style={{ borderColor: 'rgba(30, 41, 59, 0.8)' }}>
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-16 text-center')}>
            <h3
              className={'text-3xl md:text-4xl font-extrabold tracking-tight mb-4 text-on-surface'}
            >
              {t('landing.ctaHeading', {}, { defaultValue: 'Ship with certainty.' })}
            </h3>
            <p className={'text-base text-on-surface-variant max-w-xl mx-auto mb-8'}>
              {t(
                'landing.ctaBody',
                {},
                {
                  defaultValue:
                    'No credit card. No platform engineer required. Get the first pipeline green in five minutes.',
                },
              )}
            </p>
            <Link
              to="/signup"
              className={
                'inline-flex items-center gap-2 px-10 py-4 font-mono font-semibold rounded-md transition-all hover:opacity-90 shadow-xl'
              }
              style={{
                backgroundColor: BRAND_COLOR,
                color: 'var(--color-on-primary)',
                boxShadow: '0 12px 32px -10px rgba(16, 185, 129, 0.45)',
              }}
            >
              {t('common.startFree', {}, { defaultValue: 'Start free' })}
              <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
        </section>
      </main>

      <footer
        className={'py-8 text-center text-sm border-t'}
        style={{ borderColor: 'rgba(30, 41, 59, 0.8)', color: 'var(--color-on-surface-variant)' }}
      >
        <p>
          {t(
            'landing.copyright',
            { year: new Date().getFullYear(), app: APP_NAME },
            { defaultValue: '© {{year}} {{app}}. Ship with certainty.' },
          )}
        </p>
      </footer>
    </div>
  )
}
