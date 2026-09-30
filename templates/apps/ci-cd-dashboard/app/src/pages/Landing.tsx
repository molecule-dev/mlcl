import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, BRAND_COLOR } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'
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

/* Decorative build log for the hero terminal window. Tag tones map to the
   design's log colours: [info] emerald, [step] indigo-blue, [warn] amber. */
const BUILD_LOG = [
  {
    key: 'fetch',
    tag: '[info]',
    tagTone: 'text-primary',
    tone: 'text-on-surface-variant',
    text: 'Fetching dependencies...',
  },
  {
    key: 'copy',
    tag: '[step]',
    tagTone: 'text-tertiary',
    tone: 'text-on-surface-variant',
    text: 'COPY . /app',
  },
  {
    key: 'run',
    tag: null,
    tagTone: '',
    // Same token as sibling lines, never opacity-* — 0.7 alpha blended the
    // muted tone down to ~3.9:1 on the dark terminal panel (axe color-contrast).
    tone: 'text-on-surface-variant',
    text: '=> [2/4] RUN npm ci',
  },
  {
    key: 'warn',
    tag: '[warn]',
    tagTone: 'text-warning',
    tone: 'text-warning',
    text: 'deprecated packages found',
  },
  {
    key: 'done',
    tag: '[info]',
    tagTone: 'text-primary',
    tone: 'text-on-surface-variant',
    text: 'Build complete in 12.4s',
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
          <Link to="/" className={'flex items-center gap-2 shrink-0'} aria-label={APP_NAME}>
            <BrandWordmark as="span" size="md" />
          </Link>
          <div
            className={cm.flex({ align: 'center', gap: 'lg' })}
            aria-label={t('landing.nav', {}, { defaultValue: 'Marketing navigation' })}
          >
            <a
              href="#features"
              className={
                'hidden md:inline text-sm font-medium text-primary border-b-2 border-primary pb-1 opacity-80 hover:opacity-100 transition-opacity'
              }
            >
              {t('nav.features', {}, { defaultValue: 'Features' })}
            </a>
            <Link
              to="/pipelines"
              className={
                'hidden md:inline text-sm font-medium text-on-surface-variant hover:text-primary transition-colors'
              }
            >
              {t('landing.nav.pipelines', {}, { defaultValue: 'Pipelines' })}
            </Link>
            <Link
              to="/pricing"
              className={
                'hidden md:inline text-sm font-medium text-on-surface-variant hover:text-primary transition-colors'
              }
            >
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </Link>
          </div>
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
        {/* Hero — centered stage, emerald glow, floating terminal windows */}
        <section className="relative overflow-hidden">
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
            style={{ backgroundColor: `${BRAND_COLOR}1a`, filter: 'blur(120px)' }}
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
            <div className={'text-center space-y-8 relative z-10'}>
              <div className={'space-y-4'}>
                <p
                  className={'font-mono text-sm font-bold uppercase tracking-widest mb-5'}
                  style={{ color: BRAND_COLOR }}
                >
                  {t('landing.kicker', {}, { defaultValue: '$ ./conduit deploy --safely' })}
                </p>
                <h1
                  className={
                    'text-5xl md:text-7xl font-extrabold tracking-tight leading-tight text-on-surface'
                  }
                >
                  {t('landing.heroTitle.pre', {}, { defaultValue: 'Ship with ' })}
                  <span className="text-primary">
                    {t('landing.heroTitle.accent', {}, { defaultValue: 'certainty' })}
                  </span>
                </h1>
                <p className={'text-xl text-on-surface-variant max-w-2xl mx-auto leading-relaxed'}>
                  {t(
                    'landing.heroSubtitle',
                    {},
                    {
                      defaultValue:
                        'Pipelines that finish in seconds. Logs you can read. Deploys you can trust.',
                    },
                  )}
                </p>
              </div>
              <div
                className={cm.flex({ align: 'center', justify: 'center', gap: 'md', wrap: 'wrap' })}
              >
                <Link
                  to="/signup"
                  className={
                    'inline-flex items-center gap-2 px-8 py-4 font-mono font-semibold rounded-md transition-all hover:opacity-90 shadow-xl'
                  }
                  style={{
                    backgroundColor: BRAND_COLOR,
                    color: 'var(--color-on-primary)',
                    boxShadow: '0 0 15px rgba(16, 185, 129, 0.3)',
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
              <div className={'flex flex-wrap items-center justify-center gap-x-8 gap-y-3 pt-2'}>
                <p
                  className={'text-xs font-bold uppercase tracking-widest text-on-surface-variant'}
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

            {/* Floating terminal windows — live pipeline / build log / status */}
            <div
              className={cm.cn(
                cm.grid({ gap: 'lg' }),
                'grid-cols-1 md:grid-cols-3 mt-16 relative z-10 text-left',
              )}
            >
              {/* Live pipeline window (reuses the demo rows from the auth'd hero) */}
              <div
                className={'rounded-lg shadow-lg overflow-hidden border'}
                style={{
                  backgroundColor: SURFACE_PANEL,
                  borderColor: 'var(--color-border)',
                }}
              >
                <div
                  className={'flex items-center gap-2 px-4 py-2.5 border-b'}
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <span className={'w-3 h-3 rounded-full bg-red-400/70'} aria-hidden="true" />
                  <span className={'w-3 h-3 rounded-full bg-amber-400/70'} aria-hidden="true" />
                  <span className={'w-3 h-3 rounded-full bg-emerald-400/70'} aria-hidden="true" />
                  <span
                    className={'ml-2 font-mono text-[11px] font-medium text-on-surface-variant'}
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
                    <PipelineRow key={pl.id} pipeline={pl} linked={false} dense />
                  ))}
                </div>
              </div>

              {/* Build log window */}
              <div
                className={'rounded-lg shadow-lg overflow-hidden border font-mono text-xs'}
                style={{
                  backgroundColor: 'var(--color-surface-container-low)',
                  borderColor: 'var(--color-border)',
                }}
              >
                <div
                  className={'px-4 py-2.5 border-b text-on-surface-variant'}
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  build.log
                </div>
                <div className={'p-4 space-y-1.5'}>
                  {BUILD_LOG.map((line) => (
                    <p key={line.text} className={line.tone}>
                      {line.tag ? (
                        <>
                          <span className={line.tagTone}>{line.tag}</span>{' '}
                        </>
                      ) : null}
                      {t(`landing.buildLog.${line.key}`, {}, { defaultValue: line.text })}
                    </p>
                  ))}
                </div>
              </div>

              {/* Status indicator window */}
              <div
                className={cm.cn(
                  'rounded-lg shadow-lg border p-6 flex flex-col items-center justify-center gap-4',
                )}
                style={{
                  backgroundColor: SURFACE_PANEL,
                  borderColor: 'var(--color-border)',
                }}
              >
                <div className={'relative w-16 h-16 flex items-center justify-center'}>
                  <div
                    className={'absolute inset-0 rounded-full border-4'}
                    style={{ borderColor: `${BRAND_COLOR}33` }}
                    aria-hidden="true"
                  />
                  <div
                    className={'absolute inset-2 rounded-full animate-pulse'}
                    style={{ backgroundColor: `${BRAND_COLOR}33` }}
                    aria-hidden="true"
                  />
                  <div
                    className={'w-8 h-8 rounded-full'}
                    style={{
                      backgroundColor: BRAND_COLOR,
                      boxShadow: '0 0 20px rgba(16, 185, 129, 0.5)',
                    }}
                    aria-hidden="true"
                  />
                </div>
                <div className={'text-center'}>
                  <h3 className={'font-medium text-on-surface'}>
                    {t('landing.status.title', {}, { defaultValue: 'System Operational' })}
                  </h3>
                  <p className={'font-mono text-sm text-on-surface-variant mt-1'}>
                    {t('landing.status.latency', {}, { defaultValue: 'latency: 12ms' })}
                  </p>
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
        className={'w-full py-12 border-t text-sm text-on-surface-variant'}
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)' }}
      >
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            cm.grid({ gap: 'lg' }),
            'grid-cols-1 md:grid-cols-4',
          )}
        >
          <div className={'col-span-1 md:col-span-2'}>
            <div className={'mb-4 block'}>
              <BrandWordmark as="span" size="sm" footer />
            </div>
            <p>
              {t(
                'landing.copyright',
                { year: new Date().getFullYear(), app: APP_NAME },
                { defaultValue: '© {{year}} {{app}}. Built for platform engineers.' },
              )}
            </p>
          </div>
          <div>
            <ul className={'space-y-2'}>
              <li>
                <Link to="/privacy" className={'hover:text-on-surface transition-colors'}>
                  {t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
                </Link>
              </li>
              <li>
                <Link to="/terms" className={'hover:text-on-surface transition-colors'}>
                  {t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <ul className={'space-y-2'}>
              <li>
                <Link to="/about" className={'hover:text-on-surface transition-colors'}>
                  {t('footer.security', {}, { defaultValue: 'Security' })}
                </Link>
              </li>
              <li>
                <Link to="/login" className={'hover:text-on-surface transition-colors'}>
                  {t('landing.status.title', {}, { defaultValue: 'System Operational' })}
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  )
}
