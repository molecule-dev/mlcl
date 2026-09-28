import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, BRAND_COLOR } from '../branding.js'
import { type LogLine, LogLineRow } from '../components/LogLineRow.js'

const FEATURES = [
  {
    key: 'search',
    defaultTitle: 'Sub-second search',
    defaultBody:
      'Run regex, structured filters, and free-text in one query bar across petabytes of logs.',
    icon: 'manage_search',
    tint: 'var(--color-primary)',
  },
  {
    key: 'tracing',
    defaultTitle: 'Distributed tracing',
    defaultBody: 'Pivot from any log line to the full trace waterfall in one click.',
    icon: 'timeline',
    tint: 'var(--color-accent)',
  },
  {
    key: 'realtime',
    defaultTitle: 'Live tail without lag',
    defaultBody: 'Stream logs from every cluster in real time with structured severity colours.',
    icon: 'graphic_eq',
    tint: 'var(--color-success)',
  },
  {
    key: 'alerts',
    defaultTitle: 'Pattern-based alerts',
    defaultBody: 'Trigger pages when a stack trace, threshold, or rate condition fires.',
    icon: 'notifications_active',
    tint: 'var(--color-severity-error)',
  },
] as const

/** Static mono demo pinned to the bottom of each landing feature card. */
function FeatureDemo({ kind }: { kind: 'search' | 'tracing' | 'realtime' | 'alerts' }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  if (kind === 'search') {
    return (
      <div
        className={cm.cn('mt-auto rounded p-4 font-mono text-xs overflow-hidden border')}
        style={{
          backgroundColor: 'var(--color-background)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className={cm.cn('mb-1')} style={{ color: 'var(--color-accent)' }}>
          {t('landing.demoQuerySelect', {}, { defaultValue: 'SELECT * FROM logs' })}
        </div>
        <div className={cm.cn('mb-1')} style={{ color: 'var(--color-primary)' }}>
          {t(
            'landing.demoQueryWhere',
            {},
            { defaultValue: "WHERE severity IN ('ERROR', 'FATAL')" },
          )}
        </div>
        <div className={cm.cn('text-on-surface-variant')}>
          {t('landing.demoQuerySince', {}, { defaultValue: 'AND timestamp >= NOW() - 1h' })}
        </div>
      </div>
    )
  }
  if (kind === 'tracing') {
    return (
      <div className={cm.cn('mt-auto flex flex-col gap-2')}>
        <div
          className={cm.cn('flex items-center gap-3 rounded border p-2')}
          style={{ backgroundColor: 'var(--color-background)', borderColor: 'var(--color-border)' }}
        >
          <span
            className={cm.cn('material-symbols-outlined text-sm text-on-surface-variant')}
            aria-hidden="true"
          >
            api
          </span>
          <div
            className={cm.cn('h-1 rounded w-1/3')}
            style={{ backgroundColor: 'var(--color-primary)' }}
          />
          <span className={cm.cn('ml-auto font-mono text-xs text-on-surface-variant')}>12ms</span>
        </div>
        <div
          className={cm.cn('flex items-center gap-3 rounded border p-2 ml-4')}
          style={{ backgroundColor: 'var(--color-background)', borderColor: 'var(--color-border)' }}
        >
          <span
            className={cm.cn('material-symbols-outlined text-sm text-on-surface-variant')}
            aria-hidden="true"
          >
            database
          </span>
          <div
            className={cm.cn('h-1 rounded w-1/4')}
            style={{ backgroundColor: 'var(--color-accent)' }}
          />
          <span className={cm.cn('ml-auto font-mono text-xs text-on-surface-variant')}>8ms</span>
        </div>
      </div>
    )
  }
  if (kind === 'realtime') {
    return (
      <div
        className={cm.cn('mt-auto rounded border p-4 font-mono text-xs')}
        style={{
          backgroundColor: 'var(--color-background)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className={cm.cn('flex items-center gap-2')}>
          <span
            className={cm.cn('inline-block h-2 w-2 rounded-full animate-pulse')}
            style={{ backgroundColor: 'var(--color-success)' }}
            aria-hidden="true"
          />
          <span className={cm.cn('font-bold uppercase tracking-widest text-success')}>
            {t('landing.demoLiveBadge', {}, { defaultValue: 'live' })}
          </span>
          <span className={cm.cn('ml-auto text-on-surface-variant')}>
            {t('landing.demoTailRate', {}, { defaultValue: '2.4k lines/s' })}
          </span>
        </div>
      </div>
    )
  }
  return (
    <div
      className={cm.cn('mt-auto rounded border p-4 font-mono text-xs relative overflow-hidden')}
      style={{
        backgroundColor: 'var(--color-background)',
        borderColor: 'color-mix(in srgb, var(--color-severity-error) 30%, transparent)',
      }}
    >
      <div
        className={cm.cn('absolute left-0 top-0 bottom-0 w-1')}
        style={{ backgroundColor: 'var(--color-severity-error)' }}
        aria-hidden="true"
      />
      <div className={cm.cn('flex justify-between items-center mb-2')}>
        <span className={cm.cn('font-bold')} style={{ color: 'var(--color-severity-error)' }}>
          {t('landing.demoAlertTitle', {}, { defaultValue: 'ALERT: Spike in 500s' })}
        </span>
        <span className={cm.cn('text-on-surface-variant')}>
          {t('landing.demoAlertAge', {}, { defaultValue: '1m ago' })}
        </span>
      </div>
      <div className={cm.cn('text-on-surface-variant')}>
        {t('landing.demoAlertThreshold', {}, { defaultValue: 'Threshold: > 5% error rate' })}
      </div>
      <div className={cm.cn('text-on-surface-variant')}>
        {t('landing.demoAlertCurrent', {}, { defaultValue: 'Current: ' })}
        <span className={cm.cn('text-on-surface')}>12.4%</span>
      </div>
    </div>
  )
}

// Mirrors the real tier ladder in api/src/tiers.ts (names, prices, limits) —
// the /pricing page renders the same tiers from GET /api/billing/tiers.
const PRICING = [
  {
    tier: 'free',
    price: '$0',
    defaultLabel: 'Free',
    defaultDesc: 'For solo and side projects',
    features: [
      { key: 'logs', defaultText: '10,000 log lines' },
      { key: 'streams', defaultText: '12 streams' },
      { key: 'saved', defaultText: '10 saved searches' },
      { key: 'retention', defaultText: '90-day retention' },
    ],
  },
  {
    tier: 'pro',
    price: '$15',
    defaultLabel: 'Pro',
    defaultDesc: 'For shipping teams',
    features: [
      { key: 'logs', defaultText: '100,000 log lines' },
      { key: 'streams', defaultText: '500 streams' },
      { key: 'saved', defaultText: '500 saved searches' },
      { key: 'retention', defaultText: '365-day retention' },
      { key: 'advanced', defaultText: 'Advanced features + data export' },
    ],
  },
  {
    tier: 'team',
    price: '$49',
    defaultLabel: 'Team',
    defaultDesc: 'For platform reliability teams',
    features: [
      { key: 'logs', defaultText: 'Unlimited log lines' },
      { key: 'streams', defaultText: 'Unlimited streams & saved searches' },
      { key: 'retention', defaultText: 'Unlimited retention' },
      { key: 'advanced', defaultText: 'Advanced features + data export' },
    ],
  },
] as const

const DEMO_LINES: LogLine[] = [
  {
    id: 'demo-1',
    timestamp: '2026-04-30T13:42:01.182Z',
    service: 'api-gateway',
    severity: 'fatal',
    message: 'panic: nil pointer dereference in handlers/checkout.go:142',
    trace_id: 'trc-b8d4f1a3',
  },
  {
    id: 'demo-2',
    timestamp: '2026-04-30T13:42:00.901Z',
    service: 'checkout',
    severity: 'error',
    message: 'stripe: charge failed — card_declined',
    trace_id: 'trc-b8d4f1a3',
  },
  {
    id: 'demo-3',
    timestamp: '2026-04-30T13:41:59.553Z',
    service: 'checkout',
    severity: 'warn',
    message: 'retrying upstream charge after backoff (attempt 3/5)',
    trace_id: 'trc-b8d4f1a3',
  },
  {
    id: 'demo-4',
    timestamp: '2026-04-30T13:41:58.214Z',
    service: 'auth-service',
    severity: 'info',
    message: 'session refreshed for user_id=usr_4f2e91a iat=1714485518',
    trace_id: 'trc-19e2c7da',
  },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div
      className={cm.cn(cm.minH('screen'), 'antialiased font-body')}
      style={{
        backgroundColor: 'var(--color-background)',
        color: 'var(--color-severity-debug-light)',
      }}
    >
      <nav
        className={cm.cn('sticky top-0 z-50 backdrop-blur-md border-b')}
        style={{
          backgroundColor: 'color-mix(in srgb, var(--color-background) 85%, transparent)',
          borderColor: 'var(--color-border)',
        }}
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
              'flex items-center gap-2 text-xl font-extrabold tracking-tight text-on-surface',
            )}
          >
            <span
              className={cm.cn('inline-flex h-8 w-8 items-center justify-center rounded-lg')}
              style={{ backgroundColor: BRAND_COLOR, color: 'var(--color-background)' }}
              aria-hidden="true"
            >
              <span className={cm.cn('material-symbols-outlined text-[20px]')}>graphic_eq</span>
            </span>
            <span>{APP_NAME}</span>
          </Link>
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            <Link
              to="/pricing"
              data-mol-id="landing-nav-pricing"
              className={cm.cn(
                'hidden sm:inline text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors',
              )}
            >
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </Link>
            <Link
              to="/about"
              data-mol-id="landing-nav-about"
              className={cm.cn(
                'hidden sm:inline text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors',
              )}
            >
              {t('nav.about', {}, { defaultValue: 'About' })}
            </Link>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                data-mol-id="landing-nav-dashboard"
                className={cm.cn(
                  'px-5 py-2 font-semibold text-sm rounded transition-all hover:opacity-90 shadow-lg',
                )}
                style={{
                  backgroundColor: BRAND_COLOR,
                  color: 'var(--color-background)',
                  boxShadow:
                    '0 8px 24px -8px color-mix(in srgb, var(--color-primary) 45%, transparent)',
                }}
              >
                {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className={cm.cn(
                    'text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors',
                  )}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  className={cm.cn(
                    'px-5 py-2 font-semibold text-sm rounded transition-all hover:opacity-90 shadow-lg',
                  )}
                  style={{
                    backgroundColor: BRAND_COLOR,
                    color: 'var(--color-background)',
                    boxShadow:
                      '0 8px 24px -8px color-mix(in srgb, var(--color-primary) 45%, transparent)',
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
        {/* Hero */}
        <section className={cm.cn('relative overflow-hidden')}>
          <div
            className={cm.cn('absolute inset-0 pointer-events-none')}
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 25%, color-mix(in srgb, var(--color-primary) 20%, transparent), transparent 50%),' +
                'radial-gradient(circle at 80% 60%, color-mix(in srgb, var(--color-accent) 18%, transparent), transparent 45%)',
            }}
            aria-hidden="true"
          />
          <div
            className={cm.cn('absolute inset-0 opacity-[0.07] pointer-events-none')}
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
            <div
              className={cm.cn('grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center')}
            >
              <div className={cm.cn('lg:col-span-7')}>
                {/* Release-note pill — mono tag + muted note */}
                <div
                  className={cm.cn(
                    'inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface border w-fit mb-5',
                  )}
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <span className={cm.cn('font-mono text-xs')} style={{ color: BRAND_COLOR }}>
                    {t('landing.kicker', {}, { defaultValue: '$ tail -f /var/log/everything' })}
                  </span>
                  <span className={cm.cn('text-xs text-on-surface-variant')}>
                    {t('landing.kickerNote', {}, { defaultValue: 'Improved query performance' })}
                  </span>
                </div>
                <h1
                  className={cm.cn(
                    'text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[0.95] mb-6 text-on-surface',
                  )}
                >
                  {t('landing.heroTitle', {}, { defaultValue: 'Every signal, instantly' })}{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[color:var(--color-primary)] to-[color:var(--color-hero-gradient-to)]">
                    {t('landing.heroTitleAccent', {}, { defaultValue: 'traced.' })}
                  </span>
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
                        'Search billions of structured log lines, pivot to traces, and ship the fix before the page even goes out.',
                    },
                  )}
                </p>
                <div className={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>
                  <Link
                    to="/signup"
                    className={cm.cn(
                      'inline-flex items-center gap-2 px-6 py-3 font-semibold text-lg rounded transition-all hover:opacity-90 shadow-xl',
                    )}
                    style={{
                      backgroundColor: BRAND_COLOR,
                      color: 'var(--color-background)',
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
                      'inline-flex items-center gap-2 px-6 py-3 font-semibold text-lg rounded border transition-colors hover:bg-surface-container text-on-surface',
                    )}
                    style={{ borderColor: 'var(--color-outline)' }}
                  >
                    {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                  </Link>
                </div>

                <div className={cm.cn('mt-10 flex flex-wrap items-center gap-x-8 gap-y-3')}>
                  <p
                    className={cm.cn(
                      'text-xs font-bold uppercase tracking-widest text-on-surface-variant opacity-60',
                    )}
                  >
                    {t('landing.socialProof', {}, { defaultValue: 'Trusted by SRE teams at' })}
                  </p>
                  {['Atlas', 'Northwind', 'Stratafy', 'Helix'].map((brand) => (
                    <span
                      key={brand}
                      className={cm.cn('font-mono text-sm font-bold text-on-surface-variant')}
                    >
                      {brand}
                    </span>
                  ))}
                </div>
              </div>

              {/* Embedded sample — mirrors the auth'd live tail */}
              <div className={cm.cn('lg:col-span-5')}>
                <div
                  className={cm.cn('rounded shadow-2xl overflow-hidden border')}
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    borderColor: 'var(--color-border)',
                    boxShadow: '0 30px 80px -30px rgba(0,0,0,0.7)',
                  }}
                >
                  <div
                    className={cm.cn('flex items-center gap-2 px-4 py-2.5 border-b')}
                    style={{
                      borderColor: 'var(--color-border)',
                      backgroundColor: 'var(--color-background)',
                    }}
                  >
                    <span
                      className={cm.cn('w-3 h-3 rounded-full bg-red-400/70')}
                      aria-hidden="true"
                    />
                    <span
                      className={cm.cn('w-3 h-3 rounded-full bg-amber-400/70')}
                      aria-hidden="true"
                    />
                    <span
                      className={cm.cn('w-3 h-3 rounded-full bg-emerald-400/70')}
                      aria-hidden="true"
                    />
                    <span
                      className={cm.cn(
                        'ml-3 font-mono text-[11px] font-medium text-on-surface-variant opacity-60',
                      )}
                    >
                      {t(
                        'landing.demoWindowTitle',
                        {},
                        { defaultValue: 'signalink · live tail · prod-app' },
                      )}
                    </span>
                    <span className={cm.cn('ml-auto inline-flex items-center gap-1.5')}>
                      <span
                        className={cm.cn('inline-block h-2 w-2 rounded-full animate-pulse')}
                        style={{
                          backgroundColor: 'var(--color-live-tail-active)',
                          boxShadow:
                            '0 0 0 3px color-mix(in srgb, var(--color-success) 30%, transparent)',
                        }}
                        aria-hidden="true"
                      />
                      <span
                        className={cm.cn(
                          'font-mono text-[10px] font-bold uppercase tracking-widest text-success',
                        )}
                      >
                        {t('landing.demoLiveBadge', {}, { defaultValue: 'live' })}
                      </span>
                    </span>
                  </div>
                  <div className={cm.cn('py-1')}>
                    {DEMO_LINES.map((line) => (
                      <LogLineRow key={line.id} line={line} />
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
            {t('landing.featuresEyebrow', {}, { defaultValue: '// observability primitives' })}
          </p>
          <h2
            className={cm.cn(
              'mb-12 text-center text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface',
            )}
          >
            {t('landing.featuresHeading', {}, { defaultValue: 'Built for incident command' })}
          </h2>
          <div className={cm.cn('grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}>
            {FEATURES.map((f) => (
              <div
                key={f.key}
                className={cm.cn(
                  'group rounded p-6 flex flex-col gap-6 transition-all hover:-translate-y-0.5 hover:shadow-xl border',
                )}
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                }}
              >
                <div
                  className={cm.cn(
                    'inline-flex p-3 rounded border group-hover:scale-110 transition-transform w-fit',
                  )}
                  style={{
                    backgroundColor: `color-mix(in srgb, ${f.tint} 13%, transparent)`,
                    color: f.tint,
                  }}
                >
                  <span className={cm.cn('material-symbols-outlined text-2xl')} aria-hidden="true">
                    {f.icon}
                  </span>
                </div>
                <div>
                  <h3 className={cm.cn('text-xl font-bold mb-2 text-on-surface')}>
                    {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                  </h3>
                  <p className={cm.cn('text-sm text-on-surface-variant leading-relaxed')}>
                    {t(`landing.feature.${f.key}.body`, {}, { defaultValue: f.defaultBody })}
                  </p>
                </div>
                <FeatureDemo kind={f.key} />
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section
          className={cm.cn('py-20 border-t')}
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-background)',
          }}
        >
          <div className={cm.cn(cm.maxW('7xl'), cm.sp('px', 6), cm.mxAuto)}>
            <p
              className={cm.cn(
                'text-center font-mono text-xs font-bold uppercase tracking-widest mb-3',
              )}
              style={{ color: BRAND_COLOR }}
            >
              {t('landing.pricingEyebrow', {}, { defaultValue: '// pricing' })}
            </p>
            <h2
              className={cm.cn(
                'text-center text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface mb-12',
              )}
            >
              {t(
                'landing.pricingHeading',
                {},
                { defaultValue: 'Predictable pricing, no log rotation surprises' },
              )}
            </h2>
            <div className={cm.cn('grid gap-6 grid-cols-1 md:grid-cols-3')}>
              {PRICING.map((p, i) => {
                const featured = i === 1
                return (
                  <div
                    key={p.tier}
                    className={cm.cn('relative rounded p-7 transition-all hover:-translate-y-1')}
                    style={{
                      backgroundColor: 'var(--color-surface)',
                      border: featured
                        ? '2px solid var(--color-primary)'
                        : '1px solid var(--color-border)',
                      boxShadow: featured
                        ? '0 18px 50px -20px color-mix(in srgb, var(--color-primary) 50%, transparent)'
                        : undefined,
                    }}
                  >
                    {featured ? (
                      <span
                        className={cm.cn(
                          'absolute -top-3 left-1/2 -translate-x-1/2 inline-flex px-3 py-0.5 rounded-full font-mono text-[10px] font-black uppercase tracking-widest',
                        )}
                        style={{ backgroundColor: BRAND_COLOR, color: 'var(--color-background)' }}
                      >
                        {t('status.mostPopular', {}, { defaultValue: 'Most popular' })}
                      </span>
                    ) : null}
                    <p
                      className={cm.cn(
                        'text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60',
                      )}
                    >
                      {t(`landing.pricing.${p.tier}.label`, {}, { defaultValue: p.defaultLabel })}
                    </p>
                    <p className={cm.cn('mt-3 font-mono')}>
                      <span
                        className={cm.cn(
                          'text-5xl font-extrabold tracking-tighter text-on-surface',
                        )}
                      >
                        {p.price}
                      </span>
                      <span
                        className={cm.cn(
                          'ml-1 text-sm font-medium text-on-surface-variant opacity-60',
                        )}
                      >
                        /mo
                      </span>
                    </p>
                    <p className={cm.cn('mt-2 text-sm text-on-surface-variant')}>
                      {t(`landing.pricing.${p.tier}.desc`, {}, { defaultValue: p.defaultDesc })}
                    </p>
                    <ul className={cm.cn('mt-5 space-y-2.5')}>
                      {p.features.map((f) => (
                        <li
                          key={f.key}
                          className={cm.cn('flex items-center gap-2.5 text-sm text-on-surface')}
                        >
                          <span
                            className={cm.cn('material-symbols-outlined text-base shrink-0')}
                            style={{ color: BRAND_COLOR }}
                            aria-hidden="true"
                          >
                            check_circle
                          </span>
                          <span>
                            {t(
                              `landing.pricing.${p.tier}.feature.${f.key}`,
                              {},
                              { defaultValue: f.defaultText },
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <Link
                      to="/signup"
                      className={cm.cn(
                        'mt-6 block w-full text-center px-4 py-3 rounded font-semibold transition-colors',
                      )}
                      style={
                        featured
                          ? {
                              backgroundColor: 'var(--color-primary)',
                              color: 'var(--color-background)',
                            }
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
        <section className={cm.cn('border-t')} style={{ borderColor: 'var(--color-border)' }}>
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-16 text-center')}>
            <h3
              className={cm.cn(
                'text-3xl md:text-4xl font-extrabold tracking-tight mb-4 text-on-surface',
              )}
            >
              {t('landing.ctaHeading', {}, { defaultValue: 'Trace it. Fix it. Move on.' })}
            </h3>
            <p className={cm.cn('text-base text-on-surface-variant max-w-xl mx-auto mb-8')}>
              {t(
                'landing.ctaBody',
                {},
                {
                  defaultValue:
                    'No agents to install. No retention tiers to puzzle over. Point your fluent-bit at us and start querying in five minutes.',
                },
              )}
            </p>
            <Link
              to="/signup"
              className={cm.cn(
                'inline-flex items-center gap-2 px-10 py-4 font-semibold rounded transition-all hover:opacity-90 shadow-xl',
              )}
              style={{
                backgroundColor: BRAND_COLOR,
                color: 'var(--color-background)',
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
        {/* Metrics band — "Trusted by platform teams" stat tiles */}
        <section
          className={cm.cn('border-t py-20')}
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)' }}
        >
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6))}>
            <h3
              className={cm.cn(
                'text-center font-medium mb-12 uppercase tracking-widest text-sm text-on-surface-variant',
              )}
            >
              {t('landing.metricsHeading', {}, { defaultValue: 'Trusted by platform teams' })}
            </h3>
            <div className={cm.cn('grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8')}>
              {(
                [
                  { value: '99.995%', key: 'uptime', defaultLabel: 'Uptime', accent: false },
                  {
                    value: '12ms',
                    key: 'latency',
                    defaultLabel: 'p99 Query Latency',
                    accent: true,
                  },
                  { value: '14PB+', key: 'indexed', defaultLabel: 'Indexed Daily', accent: false },
                  { value: '48s', key: 'mttr', defaultLabel: 'Average MTTR', accent: true },
                ] as const
              ).map((m) => (
                <div
                  key={m.key}
                  className={cm.cn('flex flex-col items-center justify-center p-6 rounded border')}
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--color-surface) 50%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--color-border) 50%, transparent)',
                  }}
                >
                  <span
                    className={cm.cn('text-3xl md:text-4xl font-bold font-mono mb-2')}
                    style={{ color: m.accent ? 'var(--color-primary)' : undefined }}
                  >
                    {m.value}
                  </span>
                  <span className={cm.cn('text-sm text-on-surface-variant')}>
                    {t(`landing.metric.${m.key}`, {}, { defaultValue: m.defaultLabel })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer
        className={cm.cn('py-12 border-t')}
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-footer-bg, var(--color-background))',
          color: 'var(--color-text-tertiary)',
        }}
      >
        <div
          className={cm.cn(
            cm.maxW('5xl'),
            cm.mxAuto,
            cm.sp('px', 8),
            cm.flex({ direction: 'col', justify: 'between', align: 'center', gap: 'md' }),
            'md:flex-row gap-6',
          )}
        >
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'xs' }),
              'items-center md:items-start',
            )}
          >
            <span className={cm.cn('text-lg font-black text-on-surface')}>{APP_NAME}</span>
            <span
              className={cm.cn(
                'font-mono text-xs uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t(
                'landing.copyright',
                { year: new Date().getFullYear(), app: APP_NAME },
                { defaultValue: '\u00a9 {{year}} {{app}} \u2014 Precise Clinical Observability' },
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
            </span>
          </div>
          <div
            className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'flex-wrap justify-center')}
          >
            <Link
              to="/about"
              className={cm.cn(
                'font-mono text-xs uppercase tracking-widest hover:text-on-surface transition-colors',
              )}
            >
              {t('nav.about', {}, { defaultValue: 'About' })}
            </Link>
            <Link
              to="/pricing"
              className={cm.cn(
                'font-mono text-xs uppercase tracking-widest hover:text-on-surface transition-colors',
              )}
            >
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </Link>
            <Link
              to="/terms"
              className={cm.cn(
                'font-mono text-xs uppercase tracking-widest hover:text-on-surface transition-colors',
              )}
            >
              {t('nav.terms', {}, { defaultValue: 'Terms' })}
            </Link>
            <Link
              to="/privacy"
              className={cm.cn(
                'font-mono text-xs uppercase tracking-widest hover:text-on-surface transition-colors',
              )}
            >
              {t('nav.privacy', {}, { defaultValue: 'Privacy' })}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
