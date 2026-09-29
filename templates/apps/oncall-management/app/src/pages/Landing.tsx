import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE, BRAND_COLOR } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'
import { Footer } from '../components/Footer.js'
import { IncidentRow, type IncidentRowData } from '../components/IncidentRow.js'

const NAV_BG = 'color-mix(in srgb, var(--color-background) 88%, transparent)'

const FEATURES = [
  {
    key: 'rotations',
    span: 'md:col-span-7',
    defaultTitle: 'Zero-latency multichannel paging',
    defaultBody:
      'Weekly or daily rotations hand off on time, and pages reach phone, SMS, push, and Slack concurrently until someone acknowledges — no channel is a single point of failure.',
    icon: 'ring_volume',
    tint: 'var(--color-primary)',
    statLabel: 'delivery channels',
    statValue: '4 concurrent',
  },
  {
    key: 'escalation',
    span: 'md:col-span-5',
    defaultTitle: 'Deterministic Escalation Chains',
    defaultBody:
      "If an engineer doesn't acknowledge within 3 minutes, Klaxon triggers Tier 2 standbys, dials team leads, and automatically pulls in designated incident commanders.",
    icon: 'moving',
    tint: 'var(--color-severity-error)',
    statLabel: 'unack trigger',
    statValue: 'Tier 2 in 3m',
  },
  {
    key: 'ackResolve',
    span: 'md:col-span-5',
    defaultTitle: 'Intelligent Alert Grouping',
    defaultBody:
      'Stop 80 cascading downstream microservice alerts from exploding your phone during a network blip. Klaxon groups correlated alerts into a single cohesive root-cause thread.',
    icon: 'hub',
    tint: 'var(--color-severity-warning)',
    statLabel: 'noise reduction',
    statValue: '84 → 1',
  },
  {
    key: 'postmortems',
    span: 'md:col-span-7',
    defaultTitle: 'Automated Post-Mortem Generator',
    defaultBody:
      'When an outage is declared resolved, Klaxon pulls Datadog charts, Prometheus breach metrics, and Slack incident channel timelines directly into a structured Markdown post-mortem document.',
    icon: 'history_edu',
    tint: 'var(--color-severity-resolved)',
    statLabel: 'generated',
    statValue: 'post-mortem.md',
  },
] as const

const METRICS = [
  {
    value: '< 850ms',
    labelKey: 'metricLatency',
    labelDefault: 'average page-to-phone latency',
    color: 'var(--color-primary)',
  },
  {
    value: '99.999%',
    labelKey: 'metricUptime',
    labelDefault: 'uptime SLA guaranteed',
    color: 'var(--color-severity-resolved)',
  },
  {
    value: '4.2M+',
    labelKey: 'metricIncidents',
    labelDefault: 'incidents handled, zero drops',
    color: 'var(--color-tertiary)',
  },
  {
    value: '140+',
    labelKey: 'metricIntegrations',
    labelDefault: 'turnkey integrations',
    color: 'var(--color-text)',
  },
] as const

const ROSTER = [
  { name: 'Sarah Chen', role: 'Tier 1 Primary · Phone 1/3', badge: 'Ringing', active: true },
  { name: 'David Vance', role: 'Tier 2 Standby · Slack + Push', badge: 'Standby', active: false },
  { name: 'Marcus Ray', role: 'Sev-1 Incident Commander', badge: 'Escalation lock', active: false },
] as const

const SPARKLINE = [
  { h: 'h-[22%]', tint: 'var(--color-severity-resolved)' },
  { h: 'h-[26%]', tint: 'var(--color-severity-resolved)' },
  { h: 'h-[24%]', tint: 'var(--color-severity-resolved)' },
  { h: 'h-[29%]', tint: 'var(--color-severity-resolved)' },
  { h: 'h-[25%]', tint: 'var(--color-severity-resolved)' },
  { h: 'h-[48%]', tint: 'var(--color-severity-warning)' },
  { h: 'h-[58%]', tint: 'var(--color-severity-warning)' },
  { h: 'h-[88%]', tint: 'var(--color-severity-critical)' },
  { h: 'h-[96%]', tint: 'var(--color-severity-critical)' },
  { h: 'h-[92%]', tint: 'var(--color-severity-critical)' },
  { h: 'h-[84%]', tint: 'var(--color-severity-critical)' },
] as const

const INTEGRATIONS: { mono: string; name: string; note: string; featured?: boolean }[] = [
  { mono: 'DD', name: 'Datadog', note: 'Real-time webhook' },
  { mono: 'GF', name: 'Grafana', note: 'Unified alerts' },
  { mono: 'CW', name: 'AWS CloudWatch', note: 'SNS event bridge' },
  { mono: 'K8', name: 'Kubernetes', note: 'CRD daemonset' },
  { mono: 'SL', name: 'Slack Bot', note: 'Interactive triage' },
  { mono: 'GH', name: 'GitHub Actions', note: 'Deploy lockout' },
  { mono: 'NR', name: 'New Relic', note: 'APM ingestion' },
  { mono: 'PD', name: 'PagerDuty', note: '1-click live importer', featured: true },
]

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
    title: 'Latency Spike p99 > 1850ms (Database connection pool exhaustion)',
    severity: 'critical',
    status: 'triggered',
    service: 'postgres-primary',
    assignee: null,
    escalation_policy_name: 'Platform P1',
    escalation_level: 1,
    triggered_at: new Date(Date.now() - 4 * 60_000).toISOString(),
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

  const muted = 'color-mix(in srgb, var(--color-on-background) 60%, transparent)'

  return (
    <div
      className={cm.cn(cm.minH('screen'), 'antialiased font-body')}
      style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text)' }}
    >
      <nav
        className={cm.cn('sticky top-0 z-50 backdrop-blur-md border-b')}
        style={{ backgroundColor: NAV_BG, borderColor: 'var(--color-border)' }}
      >
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.sp('px', 6),
            'h-14 flex items-center justify-between gap-4',
            cm.mxAuto,
          )}
        >
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            <BrandWordmark />
            {/* Live SLA badge (design: nav status chip) */}
            <span
              className={cm.cn(
                'hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded border font-mono text-[10px] font-semibold tracking-wider',
              )}
              style={{
                borderColor: 'color-mix(in srgb, var(--color-severity-resolved) 30%, transparent)',
                backgroundColor:
                  'color-mix(in srgb, var(--color-severity-resolved) 10%, transparent)',
                color: 'var(--color-severity-resolved)',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ backgroundColor: 'var(--color-severity-resolved)' }}
                aria-hidden="true"
              />
              99.999% SLA
            </span>
          </div>
          <nav className={cm.cn('hidden md:flex items-center gap-6')}>
            <a
              href="#features"
              className={cm.cn(
                'font-mono text-xs font-medium hover:text-primary transition-colors',
              )}
              style={{ color: muted }}
            >
              {t('nav.features', {}, { defaultValue: 'Features' })}
            </a>
            <a
              href="#pager-demo"
              className={cm.cn(
                'font-mono text-xs font-medium flex items-center gap-1 text-primary hover:opacity-80 transition-opacity',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-sm')} aria-hidden="true">
                terminal
              </span>
              {t('landing.navPagerDemo', {}, { defaultValue: 'Pager Demo' })}
            </a>
            <a
              href="#integrations"
              className={cm.cn(
                'font-mono text-xs font-medium hover:text-primary transition-colors',
              )}
              style={{ color: muted }}
            >
              {t('landing.navIntegrations', {}, { defaultValue: 'Integrations' })}
            </a>
            <Link
              to="/pricing"
              className={cm.cn(
                'font-mono text-xs font-medium hover:text-primary transition-colors',
              )}
              style={{ color: muted }}
            >
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </Link>
          </nav>
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className={cm.cn(
                  'inline-flex items-center gap-1 px-4 py-2 font-mono font-semibold text-xs rounded shadow-sm hover:brightness-110 active:scale-95 transition-all',
                )}
                style={{ backgroundColor: BRAND_COLOR, color: 'var(--color-on-primary)' }}
                data-mol-id="nav-go-to-dashboard"
              >
                {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
                <span className={cm.cn('material-symbols-outlined text-sm')} aria-hidden="true">
                  arrow_forward
                </span>
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className={cm.cn(
                    'inline-flex items-center px-3 py-1.5 rounded font-mono text-xs font-medium transition-all hover:opacity-80 active:scale-95',
                  )}
                  style={{ color: muted }}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  className={cm.cn(
                    'inline-flex items-center gap-1 px-3.5 py-1.5 rounded font-mono font-semibold text-xs shadow-sm hover:brightness-110 active:scale-95 transition-all',
                  )}
                  style={{ backgroundColor: BRAND_COLOR, color: 'var(--color-on-primary)' }}
                >
                  {t('landing.navTrial', {}, { defaultValue: 'Start 14-day trial' })}
                  <span className={cm.cn('material-symbols-outlined text-sm')} aria-hidden="true">
                    arrow_forward
                  </span>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        {/* Hero — release pill, mono kicker, console headline (design: hero) */}
        <section className={cm.cn('relative overflow-hidden')}>
          <div
            className={cm.cn('absolute inset-0 pointer-events-none')}
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 25%, color-mix(in srgb, var(--color-primary) 12%, transparent), transparent 50%),' +
                'radial-gradient(circle at 80% 60%, color-mix(in srgb, var(--color-tertiary) 10%, transparent), transparent 45%)',
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
              'relative pt-20 pb-12 text-center',
            )}
          >
            {/* Release pill */}
            <div
              className={cm.cn(
                'inline-flex flex-wrap items-center justify-center gap-2 px-3 py-1 rounded border mb-6 font-mono text-[10px] shadow-sm',
              )}
              style={{
                borderColor: 'color-mix(in srgb, var(--color-primary-container) 40%, transparent)',
                backgroundColor:
                  'color-mix(in srgb, var(--color-surface-container-high) 80%, transparent)',
                color: 'var(--color-primary)',
              }}
            >
              <span className={cm.cn('material-symbols-outlined text-sm')} aria-hidden="true">
                bolt
              </span>
              <span className="tracking-wide">
                {t(
                  'landing.releasePill',
                  { app: APP_NAME },
                  { defaultValue: '{{app}} v3.2 released — sub-second pager delivery' },
                )}
              </span>
              <Link
                to="/about"
                className={cm.cn(
                  'inline-flex items-center gap-0.5 hover:text-primary transition-colors',
                )}
                style={{ color: muted }}
              >
                {t('landing.changelog', {}, { defaultValue: 'Changelog' })}
                <span className={cm.cn('material-symbols-outlined text-xs')} aria-hidden="true">
                  chevron_right
                </span>
              </Link>
            </div>
            <h1
              className={cm.cn(
                'text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.05] mb-5 max-w-4xl mx-auto',
              )}
              style={{ color: 'var(--color-text)' }}
            >
              {t('landing.heroTitle', { tagline: APP_TAGLINE }, { defaultValue: '{{tagline}}.' })}
            </h1>
            <p
              className={cm.cn('text-lg max-w-2xl mx-auto mb-8 leading-relaxed')}
              style={{
                color: 'color-mix(in srgb, var(--color-on-background) 80%, transparent)',
              }}
            >
              {t(
                'landing.heroSubtitle',
                {},
                {
                  defaultValue:
                    'Built for high-stakes SRE rotations, incident commanders, and engineering teams who need high-density, color-coded access to who holds the pager, what is still burning, and what was learned.',
                },
              )}
            </p>
            <div
              className={
                cm.flex({ align: 'center', justify: 'center', gap: 'md', wrap: 'wrap' }) + ' mb-10'
              }
            >
              <Link
                to="/signup"
                data-mol-id="landing-hero-primary-cta"
                className={cm.cn(
                  'inline-flex items-center gap-2 px-6 py-3 font-mono font-semibold rounded shadow-lg hover:brightness-110 active:scale-95 transition-all',
                )}
                style={{
                  backgroundColor: BRAND_COLOR,
                  color: 'var(--color-on-primary)',
                  boxShadow:
                    '0 12px 32px -10px color-mix(in srgb, var(--color-primary) 45%, transparent)',
                }}
              >
                <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                  emergency_home
                </span>
                {t('landing.heroDeploy', {}, { defaultValue: 'Deploy Klaxon' })}
              </Link>
              <a
                href="#pager-demo"
                data-mol-id="landing-hero-secondary-cta"
                className={cm.cn(
                  'inline-flex items-center gap-2 px-6 py-3 font-mono font-medium rounded border hover:opacity-80 active:scale-95 transition-all',
                )}
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-base text-primary')}
                  aria-hidden="true"
                >
                  play_arrow
                </span>
                {t('landing.heroSimulator', {}, { defaultValue: 'Test Pager Simulator' })}
              </a>
            </div>

            {/* Social proof strip */}
            <div className={cnBorderTop()} style={{ borderColor: 'var(--color-border)' }}>
              <p
                className={cm.cn('font-mono text-[10px] tracking-widest mb-4')}
                style={{ color: muted }}
              >
                {t('landing.socialProof', {}, { defaultValue: 'Trusted by on-call teams at' })}
              </p>
              <div
                className={cm.flex({ align: 'center', justify: 'center', wrap: 'wrap', gap: 'lg' })}
              >
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
          </div>
        </section>

        {/* LIVE PAGER DEMO — the showpiece console (design: pager-demo) */}
        <section
          id="pager-demo"
          className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'mt-2 mb-16 scroll-mt-20')}
        >
          <div
            className={cm.cn('rounded-lg border overflow-hidden shadow-2xl')}
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-surface-container-lowest)',
            }}
          >
            {/* Terminal header strip */}
            <div
              className={cm.cn(
                'px-4 py-2.5 border-b flex flex-wrap items-center justify-between gap-3',
              )}
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-surface-container-low)',
              }}
            >
              <div className={cm.flex({ align: 'center', gap: 'md' })}>
                <div className={cm.flex({ align: 'center', gap: 'xs' })}>
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: 'var(--color-severity-critical)' }}
                    aria-hidden="true"
                  />
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: 'var(--color-severity-warning)' }}
                    aria-hidden="true"
                  />
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: 'var(--color-severity-resolved)' }}
                    aria-hidden="true"
                  />
                </div>
                <div
                  className="h-3.5 w-px"
                  style={{ backgroundColor: 'var(--color-border)' }}
                  aria-hidden="true"
                />
                <div className={cm.flex({ align: 'center', gap: 'xs' })}>
                  <span
                    className="w-2 h-2 rounded-full animate-pulse"
                    style={{ backgroundColor: 'var(--color-severity-resolved)' }}
                    aria-hidden="true"
                  />
                  <span
                    className={cm.cn('font-mono text-[10px] font-semibold tracking-wider')}
                    style={{ color: 'var(--color-text)' }}
                  >
                    {t('landing.consoleTitle', {}, { defaultValue: 'LIVE INCIDENT FEED' })}
                  </span>
                </div>
              </div>
              <div
                className={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}
                style={{ color: muted }}
              >
                <span className={cm.cn('font-mono text-[10px] flex items-center gap-1.5')}>
                  {t('landing.consoleOncall', {}, { defaultValue: 'PRIMARY ON-CALL:' })}{' '}
                  <span className="font-semibold" style={{ color: 'var(--color-primary)' }}>
                    Sarah Chen
                  </span>
                </span>
                <span
                  className={cm.cn(
                    'hidden sm:inline-flex font-mono text-[10px] items-center gap-1.5 px-2 py-0.5 rounded border',
                  )}
                  style={{
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-severity-resolved)',
                  }}
                >
                  <span className={cm.cn('material-symbols-outlined text-xs')} aria-hidden="true">
                    network_check
                  </span>
                  14ms sync
                </span>
              </div>
            </div>

            {/* Triage workspace — stream (7) + telemetry/rotation (5) */}
            <div
              className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <div
                className={cm.cn('lg:col-span-7 p-4 md:p-6 space-y-3')}
                style={{
                  backgroundColor:
                    'color-mix(in srgb, var(--color-surface-container-lowest) 60%, transparent)',
                }}
              >
                <div
                  className={cm.flex({ align: 'center', justify: 'between' }) + ' pb-2 border-b'}
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <span
                    className={cm.cn('font-mono text-xs font-semibold tracking-wide')}
                    style={{ color: 'var(--color-text)' }}
                  >
                    {t('landing.activeQueue', {}, { defaultValue: 'ACTIVE QUEUE (2 UNRESOLVED)' })}
                  </span>
                  <span className={cm.cn('font-mono text-[10px]')} style={{ color: muted }}>
                    {t('landing.filterAll', {}, { defaultValue: 'Filter: all severities' })}
                  </span>
                </div>
                {DEMO_INCIDENTS.map((incident) => (
                  <IncidentRow key={incident.id} incident={incident} linked={false} />
                ))}
              </div>

              <div
                className={cm.cn('lg:col-span-5 p-4 md:p-6 space-y-4')}
                style={{
                  backgroundColor:
                    'color-mix(in srgb, var(--color-surface-container-low) 40%, transparent)',
                }}
              >
                {/* Escalation roster */}
                <div
                  className="rounded border p-3.5"
                  style={{
                    borderColor: 'var(--color-border)',
                    backgroundColor: 'var(--color-surface-container-low)',
                  }}
                >
                  <div className={cm.flex({ align: 'center', justify: 'between' }) + ' mb-3 gap-2'}>
                    <span
                      className={cm.cn('font-mono text-xs font-semibold flex items-center gap-1.5')}
                      style={{ color: 'var(--color-text)' }}
                    >
                      <span
                        className={cm.cn('material-symbols-outlined text-sm text-primary')}
                        aria-hidden="true"
                      >
                        contacts
                      </span>
                      {t('landing.rosterTitle', {}, { defaultValue: 'ON-CALL ESCALATION ROSTER' })}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {ROSTER.map((m) => (
                      <div
                        key={m.name}
                        className={
                          cm.flex({ align: 'center', justify: 'between' }) +
                          ' p-2 rounded border gap-2'
                        }
                        style={{
                          borderColor: m.active
                            ? 'color-mix(in srgb, var(--color-primary) 30%, transparent)'
                            : 'var(--color-border)',
                          backgroundColor: 'var(--color-surface-container)',
                        }}
                      >
                        <div className={cm.flex({ align: 'center', gap: 'xs' }) + ' min-w-0'}>
                          <span
                            className={
                              (m.active ? 'animate-pulse ' : '') + 'w-2 h-2 rounded-full shrink-0'
                            }
                            style={{
                              backgroundColor: m.active
                                ? 'var(--color-severity-warning)'
                                : 'var(--color-text-tertiary)',
                            }}
                            aria-hidden="true"
                          />
                          <div className="min-w-0">
                            <span
                              className={cm.cn('text-xs font-semibold block truncate')}
                              style={{ color: 'var(--color-text)' }}
                            >
                              {m.name}
                            </span>
                            <span
                              className={cm.cn('text-[10px] block truncate')}
                              style={{ color: muted }}
                            >
                              {m.role}
                            </span>
                          </div>
                        </div>
                        <span
                          className={cm.cn('font-mono text-[10px] font-bold shrink-0')}
                          style={{
                            color: m.active ? 'var(--color-primary)' : muted,
                          }}
                        >
                          {m.badge}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Latency sparkline */}
                <div
                  className="rounded border p-3.5"
                  style={{
                    borderColor: 'var(--color-border)',
                    backgroundColor: 'var(--color-surface-container-lowest)',
                  }}
                >
                  <div className={cm.flex({ align: 'center', justify: 'between' }) + ' mb-2'}>
                    <div>
                      <span
                        className={cm.cn('font-mono text-xs font-semibold block')}
                        style={{ color: 'var(--color-text)' }}
                      >
                        {t('landing.latencyTitle', {}, { defaultValue: 'EDGE LATENCY p99 (15m)' })}
                      </span>
                      <span
                        className={cm.cn('font-mono text-[10px]')}
                        style={{ color: 'var(--color-severity-critical)' }}
                      >
                        {t(
                          'landing.latencyBreach',
                          {},
                          { defaultValue: 'Breach: 1,850ms (SLO: 250ms)' },
                        )}
                      </span>
                    </div>
                    <span
                      className={cm.cn('material-symbols-outlined text-sm')}
                      style={{ color: muted }}
                      aria-hidden="true"
                    >
                      show_chart
                    </span>
                  </div>
                  <div
                    className="h-24 w-full flex items-end gap-1 pt-4 pb-1 px-1 border-b"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    {SPARKLINE.map((bar, i) => (
                      <div
                        key={i}
                        className={cm.cn('flex-1 rounded-t-sm transition-all', bar.h)}
                        style={{ backgroundColor: bar.tint, opacity: 0.75 }}
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                  <div
                    className={cm.flex({ justify: 'between' }) + ' text-[10px] font-mono pt-1'}
                    style={{ color: muted }}
                  >
                    <span>-15 min</span>
                    <span>-8 min</span>
                    <span style={{ color: 'var(--color-severity-critical)' }} className="font-bold">
                      {t('landing.now', {}, { defaultValue: 'Now' })}
                    </span>
                  </div>
                </div>

                {/* Hotkey legend */}
                <div
                  className="p-2.5 rounded border flex items-center justify-between font-mono text-[10px]"
                  style={{ borderColor: 'var(--color-border)', color: muted }}
                >
                  <span>{t('landing.hotkeys', {}, { defaultValue: 'Triage hotkeys:' })}</span>
                  <div className={cm.flex({ align: 'center', gap: 'md' })}>
                    <span>
                      <kbd
                        className="px-1 py-0.5 rounded font-mono"
                        style={{
                          backgroundColor: 'var(--color-surface-container-highest)',
                          color: 'var(--color-text)',
                        }}
                      >
                        A
                      </kbd>{' '}
                      {t('landing.ack', {}, { defaultValue: 'Ack' })}
                    </span>
                    <span>
                      <kbd
                        className="px-1 py-0.5 rounded font-mono"
                        style={{
                          backgroundColor: 'var(--color-surface-container-highest)',
                          color: 'var(--color-text)',
                        }}
                      >
                        E
                      </kbd>{' '}
                      {t('landing.escalate', {}, { defaultValue: 'Escalate' })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Terminal status bar */}
            <div
              className={
                cm.flex({ align: 'center', justify: 'between', wrap: 'wrap' }) +
                ' px-4 py-2 border-t gap-3'
              }
              style={{ borderColor: 'var(--color-border)', color: muted }}
            >
              <span
                className={cm.cn('font-mono text-[10px] flex items-center gap-1')}
                style={{ color: 'var(--color-severity-resolved)' }}
              >
                <span className={cm.cn('material-symbols-outlined text-xs')} aria-hidden="true">
                  sync
                </span>
                {t('landing.autoDispatch', {}, { defaultValue: 'Auto-dispatch active' })}
              </span>
              <span
                className={cm.cn('font-mono text-[10px]')}
                style={{ color: 'var(--color-primary)' }}
              >
                {t(
                  'landing.daemon',
                  { app: APP_NAME },
                  { defaultValue: '{{app}} daemon 3.2.1 · ready' },
                )}
              </span>
            </div>
          </div>
        </section>

        {/* Metrics strip */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'my-14')}>
          <div
            className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 rounded-lg border"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-surface-container-lowest)',
            }}
          >
            {METRICS.map((m, i) => (
              <div
                key={m.labelKey}
                className={'p-3' + (i < METRICS.length - 1 ? ' md:border-r' : '')}
                style={{ borderColor: 'var(--color-border)' }}
              >
                <div className="text-2xl md:text-3xl font-bold mb-0.5" style={{ color: m.color }}>
                  {m.value}
                </div>
                <div
                  className={cm.cn('font-mono text-[10px] uppercase tracking-wider')}
                  style={{ color: muted }}
                >
                  {t(
                    `landing.${m.labelKey}` as 'landing.metricLatency',
                    {},
                    { defaultValue: m.labelDefault },
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Feature bento grid */}
        <section
          id="features"
          className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-14 scroll-mt-20')}
        >
          <div className="text-center max-w-3xl mx-auto mb-12">
            <p
              className={cm.cn('font-mono text-xs font-bold uppercase tracking-widest mb-3')}
              style={{ color: 'var(--color-primary)' }}
            >
              {t('landing.featuresEyebrow', {}, { defaultValue: '// engineered for SRE sanity' })}
            </p>
            <h2
              className={cm.cn('mb-4 text-3xl md:text-4xl font-extrabold tracking-tight')}
              style={{ color: 'var(--color-text)' }}
            >
              {t(
                'landing.featuresHeading',
                {},
                { defaultValue: 'Zero dropped pages. Maximum cognitive clarity.' },
              )}
            </h2>
            <p
              className={cm.cn('text-base')}
              style={{ color: 'color-mix(in srgb, var(--color-on-background) 70%, transparent)' }}
            >
              {t(
                'landing.featuresBody',
                {},
                {
                  defaultValue:
                    'Every millisecond counts when systems fail. Klaxon removes the alerting noise, delivers guaranteed wake-ups, and auto-compiles post-mortems.',
                },
              )}
            </p>
          </div>
          <div className="grid gap-6 grid-cols-1 md:grid-cols-12">
            {FEATURES.map((f) => (
              <div
                key={f.key}
                className={cm.cn(
                  'group rounded-lg border p-6 flex flex-col justify-between transition-colors hover:opacity-90',
                  f.span,
                )}
                style={{
                  backgroundColor: 'var(--color-surface-container-low)',
                  borderColor: 'var(--color-border)',
                }}
              >
                <div>
                  <div
                    className={cm.cn(
                      'inline-flex p-3 rounded group-hover:scale-110 transition-transform',
                    )}
                    style={{
                      backgroundColor: `color-mix(in srgb, ${f.tint} 10%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${f.tint} 30%, transparent)`,
                      color: f.tint,
                    }}
                  >
                    <span
                      className={cm.cn('material-symbols-outlined text-2xl')}
                      aria-hidden="true"
                    >
                      {f.icon}
                    </span>
                  </div>
                  <h3
                    className={cm.cn('text-lg font-extrabold mt-4 mb-2')}
                    style={{ color: 'var(--color-text)' }}
                  >
                    {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                  </h3>
                  <p
                    className={cm.cn('text-sm leading-relaxed mb-4')}
                    style={{
                      color: 'color-mix(in srgb, var(--color-on-background) 70%, transparent)',
                    }}
                  >
                    {t(`landing.feature.${f.key}.body`, {}, { defaultValue: f.defaultBody })}
                  </p>
                </div>
                <div
                  className={
                    cm.flex({ align: 'center', justify: 'between' }) +
                    ' p-3 rounded border font-mono text-[10px]'
                  }
                  style={{
                    borderColor: 'var(--color-border)',
                    backgroundColor: 'var(--color-surface-container-lowest)',
                    color: muted,
                  }}
                >
                  <span className="uppercase tracking-wider">
                    {t(
                      `landing.feature.${f.key}.statLabel` as 'landing.feature.rotations.statLabel',
                      {},
                      { defaultValue: f.statLabel },
                    )}
                  </span>
                  <span className="font-bold" style={{ color: 'var(--color-primary)' }}>
                    {f.statValue}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Integration ecosystem */}
        <section
          id="integrations"
          className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-14 scroll-mt-20')}
        >
          <div
            className="p-6 md:p-8 rounded-lg border"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-surface-container-lowest)',
            }}
          >
            <div
              className={
                cm.flex({ justify: 'between', align: 'center' }) +
                ' flex-col md:flex-row gap-4 mb-8 items-start md:items-center'
              }
            >
              <div>
                <p
                  className={cm.cn(
                    'font-mono text-[10px] uppercase tracking-wider mb-1 font-semibold',
                  )}
                  style={{ color: 'var(--color-primary)' }}
                >
                  {t(
                    'landing.integrationsEyebrow',
                    {},
                    { defaultValue: '// plug-and-play connectivity' },
                  )}
                </p>
                <h2
                  className={cm.cn('text-2xl md:text-3xl font-extrabold tracking-tight')}
                  style={{ color: 'var(--color-text)' }}
                >
                  {t(
                    'landing.integrationsHeading',
                    {},
                    { defaultValue: 'Seamless integration with your observability stack' },
                  )}
                </h2>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {INTEGRATIONS.map((intg) => (
                <div
                  key={intg.mono}
                  className={
                    cm.flex({ align: 'center', gap: 'md' }) +
                    ' p-4 rounded border transition-colors'
                  }
                  style={{
                    borderColor: intg.featured
                      ? 'color-mix(in srgb, var(--color-primary) 40%, transparent)'
                      : 'var(--color-border)',
                    backgroundColor: 'var(--color-surface-container-low)',
                  }}
                >
                  <div
                    className="w-8 h-8 rounded flex items-center justify-center font-bold text-xs shrink-0"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${intg.featured ? 'var(--color-primary)' : 'var(--color-tertiary)'} 15%, transparent)`,
                      color: intg.featured ? 'var(--color-primary)' : 'var(--color-tertiary)',
                    }}
                    aria-hidden="true"
                  >
                    {intg.mono}
                  </div>
                  <div className="min-w-0">
                    <div
                      className={cm.cn('text-sm font-semibold truncate')}
                      style={{ color: 'var(--color-text)' }}
                    >
                      {intg.name}
                    </div>
                    <div
                      className={cm.cn('font-mono text-[10px] truncate')}
                      style={{
                        color: intg.featured
                          ? 'var(--color-primary)'
                          : 'var(--color-severity-resolved)',
                      }}
                    >
                      {intg.note}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section
          className={cm.cn('py-16 border-t')}
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
              style={{ color: 'var(--color-primary)' }}
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
                { defaultValue: 'No surprise telecom overages. Ever.' },
              )}
            </h2>
            <div className={cm.cn('grid gap-6 grid-cols-1 md:grid-cols-3 items-stretch')}>
              {PRICING.map((p, i) => {
                const featured = i === 1
                return (
                  <div
                    key={p.tier}
                    className={cm.cn('relative rounded-lg p-7 flex flex-col')}
                    style={{
                      backgroundColor: featured
                        ? 'var(--color-surface-container)'
                        : 'var(--color-surface-container-low)',
                      border: featured
                        ? `2px solid ${BRAND_COLOR}`
                        : '1px solid var(--color-border)',
                      boxShadow: featured
                        ? '0 18px 50px -20px color-mix(in srgb, var(--color-primary) 50%, transparent)'
                        : undefined,
                    }}
                  >
                    {featured ? (
                      <span
                        className={cm.cn(
                          'absolute -top-3 left-1/2 -translate-x-1/2 inline-flex px-3 py-0.5 rounded font-mono text-[10px] font-black uppercase tracking-widest whitespace-nowrap',
                        )}
                        style={{ backgroundColor: BRAND_COLOR, color: 'var(--color-on-primary)' }}
                      >
                        {t('status.mostPopular', {}, { defaultValue: 'Most popular' })}
                      </span>
                    ) : null}
                    <p
                      className={cm.cn('text-[10px] font-black uppercase tracking-widest')}
                      style={{
                        color: featured
                          ? 'var(--color-primary)'
                          : 'color-mix(in srgb, var(--color-on-background) 55%, transparent)',
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
                    <ul className={cm.cn('mt-5 space-y-2.5 mb-6')}>
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
                            style={{ color: 'var(--color-severity-resolved)' }}
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
                        'mt-auto block w-full text-center px-4 py-3 rounded font-mono font-semibold transition-all hover:brightness-110 active:scale-95',
                      )}
                      style={
                        featured
                          ? { backgroundColor: BRAND_COLOR, color: 'var(--color-on-primary)' }
                          : {
                              border: '1px solid var(--color-border)',
                              color: 'var(--color-text)',
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

        {/* Immediate-activation CTA banner */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'my-16')}>
          <div
            className={cnBanner()}
            style={{ borderColor: 'color-mix(in srgb, var(--color-primary) 40%, transparent)' }}
          >
            <div className="max-w-2xl text-center md:text-left">
              <span
                className={cm.cn(
                  'inline-flex items-center gap-1.5 px-2 py-0.5 rounded border font-mono text-[10px] mb-3',
                )}
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-primary) 15%, transparent)',
                  borderColor: 'color-mix(in srgb, var(--color-primary) 40%, transparent)',
                  color: 'var(--color-primary)',
                }}
              >
                <span className={cm.cn('material-symbols-outlined text-xs')} aria-hidden="true">
                  offline_bolt
                </span>
                {t(
                  'landing.trialPill',
                  {},
                  { defaultValue: '14-day fully functional trial · no credit card required' },
                )}
              </span>
              <h2
                className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight mb-3')}
                style={{ color: 'var(--color-text)' }}
              >
                {t(
                  'landing.ctaHeading',
                  { app: APP_NAME },
                  { defaultValue: 'Stop sleeping through outages. Start paging with {{app}}.' },
                )}
              </h2>
              <p
                className={cm.cn('text-base')}
                style={{
                  color: 'color-mix(in srgb, var(--color-on-background) 70%, transparent)',
                }}
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
            </div>
            <div
              className={
                cm.flex({ align: 'center', justify: 'center', gap: 'md' }) +
                ' flex-col sm:flex-row shrink-0'
              }
            >
              <Link
                to="/signup"
                data-mol-id="landing-footer-cta"
                className={cm.cn(
                  'w-full sm:w-auto text-center px-6 py-3 font-mono font-bold rounded shadow-md hover:brightness-110 active:scale-95 transition-all',
                )}
                style={{ backgroundColor: BRAND_COLOR, color: 'var(--color-on-primary)' }}
              >
                {t('common.startFree', {}, { defaultValue: 'Start free' })}
              </Link>
              <a
                href="#pager-demo"
                className={cm.cn(
                  'w-full sm:w-auto text-center px-5 py-3 font-mono font-medium rounded border hover:opacity-80 transition-all',
                )}
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              >
                {t('landing.liveSimulator', {}, { defaultValue: 'Live simulator' })}
              </a>
            </div>
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

/** Class string for the social-proof top rule (kept out of JSX noise). */
function cnBorderTop(): string {
  return 'pt-4 border-t max-w-4xl mx-auto'
}

/** Class string for the gradient CTA banner panel. */
function cnBanner(): string {
  return 'rounded-lg border p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl bg-[linear-gradient(90deg,var(--color-surface-container-low),var(--color-surface-container),var(--color-surface-container-low))]'
}

export default Landing
