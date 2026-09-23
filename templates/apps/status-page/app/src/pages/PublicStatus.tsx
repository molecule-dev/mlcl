import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE, BRAND_COLOR } from '../branding.js'
import { IncidentCard, type IncidentCardData } from '../components/IncidentCard.js'
import { ServiceRow, type ServiceRowData } from '../components/ServiceRow.js'
import { StatusOverviewCard } from '../components/StatusOverviewCard.js'
import type { ComponentStatus } from '../components/StatusPill.js'
import { aggregateUptimePct, generateUptime90 } from '../lib/sampleUptime.js'
import { unwrapList } from '../lib/unwrap.js'

interface RawComponent {
  id: string
  name: string
  description?: string | null
  group?: string | null
  status: ComponentStatus
  monitor_url?: string | null
  uptime_pct_90?: number | null
}

interface RawIncident {
  id: string
  title: string
  message?: string | null
  impact: 'minor' | 'major' | 'critical' | 'maintenance'
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved'
  affected_components?: string[]
  created_at: string
  resolved_at?: string | null
  latest_update?: {
    status: 'investigating' | 'identified' | 'monitoring' | 'resolved'
    message: string
    created_at: string
  } | null
}

const STATUS_RANK: Record<ComponentStatus, number> = {
  operational: 0,
  under_maintenance: 1,
  degraded_performance: 2,
  partial_outage: 3,
  major_outage: 4,
  unknown: -1,
}

function aggregate(components: RawComponent[]): {
  aggregate: 'all_operational' | ComponentStatus
  operational: number
} {
  if (components.length === 0) return { aggregate: 'unknown', operational: 0 }
  let worst: ComponentStatus = 'operational'
  let operational = 0
  for (const c of components) {
    if (c.status === 'operational') operational += 1
    if (STATUS_RANK[c.status] > STATUS_RANK[worst]) worst = c.status
  }
  return { aggregate: worst === 'operational' ? 'all_operational' : worst, operational }
}

export function PublicStatusPage() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const isAuthenticated = useIsAuthenticated()

  const [components, setComponents] = useState<RawComponent[]>([])
  const [incidents, setIncidents] = useState<RawIncident[]>([])
  const [loading, setLoading] = useState(true)
  const [subscribeEmail, setSubscribeEmail] = useState('')
  const [subscribeStatus, setSubscribeStatus] = useState<
    | { kind: 'idle' }
    | { kind: 'submitting' }
    | { kind: 'success'; message: string }
    | { kind: 'error'; message: string }
  >({ kind: 'idle' })
  const subscribeInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get('/api/public/components').catch(() => ({ data: [] })),
      http.get('/api/public/incidents').catch(() => ({ data: [] })),
    ]).then(([cRes, iRes]) => {
      if (cancelled) return
      setComponents(unwrapList<RawComponent>(cRes))
      setIncidents(unwrapList<RawIncident>(iRes))
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [http])

  async function handleSubscribe(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const email = subscribeEmail.trim()
    if (!email) {
      setSubscribeStatus({
        kind: 'error',
        message: t(
          'publicStatus.subscribeMissing',
          {},
          { defaultValue: 'Enter an email to subscribe.' },
        ),
      })
      subscribeInputRef.current?.focus()
      return
    }
    setSubscribeStatus({ kind: 'submitting' })
    try {
      await http.post('/api/public/subscribers', {
        email,
        channel: 'email',
        notification_type: 'all',
      })
      track({ name: 'subscriber.added', properties: { channel: 'email', source: 'public' } })
      setSubscribeStatus({
        kind: 'success',
        message: t(
          'publicStatus.subscribeSuccess',
          { email },
          { defaultValue: 'Subscribed {{email}} — confirmation email on its way.' },
        ),
      })
      setSubscribeEmail('')
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setSubscribeStatus({
        kind: 'error',
        message: t(
          'publicStatus.subscribeError',
          { error: message },
          { defaultValue: 'Could not subscribe: {{error}}' },
        ),
      })
    }
  }

  const services = useMemo<ServiceRowData[]>(() => {
    return components.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description ?? null,
      group: c.group ?? null,
      status: c.status,
      monitor_url: c.monitor_url ?? null,
      uptime90Days: generateUptime90(c.id, c.status === 'operational' ? 'operational' : 'degraded'),
      uptimePct90: c.uptime_pct_90 ?? null,
    }))
  }, [components])

  const totals = useMemo(() => aggregate(components), [components])

  const groupedServices = useMemo(() => {
    const groups = new Map<string, ServiceRowData[]>()
    for (const s of services) {
      const g = s.group || 'platform'
      if (!groups.has(g)) groups.set(g, [])
      groups.get(g)!.push(s)
    }
    return Array.from(groups.entries())
  }, [services])

  const activeIncidents = useMemo(
    () => incidents.filter((i) => i.status !== 'resolved').slice(0, 4),
    [incidents],
  )

  const recentIncidents = useMemo(
    () => incidents.filter((i) => i.status === 'resolved').slice(0, 4),
    [incidents],
  )

  const overallUptime = useMemo(() => {
    if (services.length === 0) return null
    const days = services.flatMap((s) => s.uptime90Days ?? [])
    return aggregateUptimePct(days)
  }, [services])

  const lastUpdatedAt = incidents[0]?.latest_update?.created_at ?? incidents[0]?.created_at ?? null

  return (
    <div
      className={cm.cn(cm.minH('screen'), 'antialiased font-body')}
      style={{ backgroundColor: 'var(--mol-color-background)', color: 'var(--mol-color-text)' }}
      data-mol-id="page-public-status"
    >
      {/* Visually-hidden H1: the page's visible hero headline is the
          StatusOverviewCard's h2, so without this the heading outline
          starts at h2 and skips level 1. */}
      <h1 className="sr-only">
        {t('publicStatus.pageTitle', { app: APP_NAME }, { defaultValue: '{{app}} status page' })}
      </h1>
      {/* Top nav bar */}
      <nav
        className={cm.cn('sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b')}
        style={{ borderColor: 'var(--color-border-card)' }}
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
          >
            <span
              className={cm.cn('inline-flex h-8 w-8 items-center justify-center rounded-lg')}
              style={{ backgroundColor: BRAND_COLOR, color: 'var(--color-auth-on-primary)' }}
              aria-hidden="true"
            >
              <span className={cm.cn('material-symbols-outlined text-[20px]')}>graphic_eq</span>
            </span>
            <span>{APP_NAME}</span>
            <span
              className={cm.cn(
                'ml-2 hidden md:inline font-mono text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {APP_TAGLINE}
            </span>
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
                  color: 'var(--color-auth-on-primary)',
                  boxShadow: '0 8px 24px -8px rgba(16, 185, 129, 0.4)',
                }}
              >
                {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
              </Link>
            ) : (
              <Link
                to="/login"
                className={cm.cn(
                  // Inline padding gives the text link a ~40px tall tap
                  // target on touch screens without changing its visual size.
                  'inline-flex items-center px-2 py-2 -my-2 text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors',
                )}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
            )}
            <a
              href="#subscribe"
              className={cm.cn(
                'px-5 py-2 font-mono font-semibold text-sm rounded-md transition-all hover:opacity-90 shadow-lg',
              )}
              style={{
                backgroundColor: BRAND_COLOR,
                color: 'var(--color-auth-on-primary)',
                boxShadow: '0 8px 24px -8px rgba(16, 185, 129, 0.4)',
              }}
            >
              {t('publicStatus.subscribe', {}, { defaultValue: 'Subscribe' })}
            </a>
          </div>
        </div>
      </nav>

      <main className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'pt-10 pb-24')}>
        {loading ? (
          <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
            {t('publicStatus.loading', {}, { defaultValue: 'Loading service health…' })}
          </p>
        ) : (
          <>
            {/* Hero status card */}
            <StatusOverviewCard
              status={totals.aggregate}
              totalServices={services.length}
              operationalServices={totals.operational}
              uptimePct90={overallUptime}
              lastUpdatedAt={lastUpdatedAt}
            />

            {/* Active incidents */}
            {activeIncidents.length > 0 ? (
              <section className={cm.cn('mt-10')}>
                <header
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('mb', 4),
                  )}
                >
                  <div>
                    <p
                      className={cm.cn(
                        'font-mono text-xs font-bold uppercase tracking-widest text-primary',
                      )}
                    >
                      {t(
                        'publicStatus.activeEyebrow',
                        {},
                        { defaultValue: 'live · investigating' },
                      )}
                    </p>
                    <h2 className={cm.cn('text-2xl md:text-3xl font-extrabold tracking-tight')}>
                      {t('publicStatus.activeHeading', {}, { defaultValue: 'Active incidents' })}
                    </h2>
                  </div>
                  <Link
                    to="/incidents"
                    className={cm.cn(
                      'font-mono text-xs font-bold uppercase tracking-widest text-primary hover:opacity-80',
                    )}
                  >
                    {t('common.viewAllArrow', {}, { defaultValue: 'View all →' })}
                  </Link>
                </header>
                <ul className={cm.cn('space-y-3')}>
                  {activeIncidents.map((i) => (
                    <li key={i.id}>
                      <IncidentCard incident={i as IncidentCardData} linked={false} />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {/* Component status by group */}
            <section className={cm.cn('mt-10')}>
              <header className={cm.cn(cm.sp('mb', 4))}>
                <p
                  className={cm.cn(
                    'font-mono text-xs font-bold uppercase tracking-widest text-primary',
                  )}
                >
                  {t('publicStatus.servicesEyebrow', {}, { defaultValue: '// service health' })}
                </p>
                <h2 className={cm.cn('text-2xl md:text-3xl font-extrabold tracking-tight')}>
                  {t('publicStatus.servicesHeading', {}, { defaultValue: 'Components & services' })}
                </h2>
              </header>
              <div className={cm.cn('space-y-6')}>
                {groupedServices.map(([group, list]) => (
                  <section
                    key={group}
                    className={cm.cn('rounded-2xl overflow-hidden')}
                    style={{
                      backgroundColor: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid var(--color-border-card)',
                    }}
                  >
                    <header
                      className={cm.cn(
                        'px-5 py-3 border-b font-mono text-[10px] font-black uppercase tracking-widest',
                      )}
                      style={{
                        borderColor: 'var(--color-border-card)',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      {t(
                        `publicStatus.group.${group}`,
                        { count: list.length },
                        { defaultValue: '{{count}} ' + group + ' services' },
                      )}
                    </header>
                    <ul className={cm.cn('p-3 space-y-3')}>
                      {list.map((s) => (
                        <li key={s.id}>
                          <ServiceRow service={s} linked={false} />
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </section>

            {/* Recent resolved incidents */}
            {recentIncidents.length > 0 ? (
              <section className={cm.cn('mt-10')}>
                <header className={cm.cn(cm.sp('mb', 4))}>
                  <p
                    className={cm.cn(
                      'font-mono text-xs font-bold uppercase tracking-widest text-primary',
                    )}
                  >
                    {t('publicStatus.recentEyebrow', {}, { defaultValue: '// recent history' })}
                  </p>
                  <h2 className={cm.cn('text-2xl md:text-3xl font-extrabold tracking-tight')}>
                    {t('publicStatus.recentHeading', {}, { defaultValue: 'Recently resolved' })}
                  </h2>
                </header>
                <ul className={cm.cn('grid gap-3 grid-cols-1 lg:grid-cols-2')}>
                  {recentIncidents.map((i) => (
                    <li key={i.id}>
                      <IncidentCard incident={i as IncidentCardData} linked={false} />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {/* Subscribe panel */}
            <section
              id="subscribe"
              className={cm.cn('mt-12 rounded-2xl p-8 md:p-10 relative overflow-hidden')}
              style={{
                backgroundImage:
                  'linear-gradient(135deg, rgba(16, 185, 129, 0.20), rgba(99, 102, 241, 0.20))',
                border: '1px solid var(--color-border-card)',
              }}
            >
              <div
                className={cm.cn(
                  'absolute -right-20 -bottom-24 h-72 w-72 rounded-full blur-3xl pointer-events-none',
                )}
                style={{ backgroundColor: 'rgba(16, 185, 129, 0.30)' }}
                aria-hidden="true"
              />
              <p
                className={cm.cn(
                  'font-mono text-xs font-black uppercase tracking-widest text-primary',
                )}
              >
                {t('publicStatus.subscribeEyebrow', {}, { defaultValue: '// stay informed' })}
              </p>
              <h2 className={cm.cn('mt-2 text-3xl md:text-4xl font-extrabold tracking-tight')}>
                {t(
                  'publicStatus.subscribeHeading',
                  {},
                  { defaultValue: 'Get every status change as it happens.' },
                )}
              </h2>
              <p className={cm.cn('mt-2 max-w-xl text-on-surface-variant')}>
                {t(
                  'publicStatus.subscribeBody',
                  {},
                  {
                    defaultValue:
                      'Email, SMS, webhooks, RSS — pick the channel your runbook reads. Per-component subscriptions keep the noise to a minimum.',
                  },
                )}
              </p>
              <form
                onSubmit={handleSubscribe}
                aria-label={t(
                  'publicStatus.subscribeFormAria',
                  {},
                  { defaultValue: 'Subscribe to status updates' },
                )}
                className={cm.cn('mt-6 flex flex-col sm:flex-row gap-3 max-w-xl')}
              >
                <label className={cm.cn('sr-only')} htmlFor="public-subscribe-email">
                  {t('auth.emailAddress', {}, { defaultValue: 'Email address' })}
                </label>
                <input
                  id="public-subscribe-email"
                  data-testid="public-subscribe-email"
                  ref={subscribeInputRef}
                  type="email"
                  required
                  autoComplete="email"
                  value={subscribeEmail}
                  onChange={(e) => setSubscribeEmail(e.target.value)}
                  placeholder={t(
                    'publicStatus.subscribePlaceholder',
                    {},
                    { defaultValue: 'you@team.example' },
                  )}
                  className={cm.cn(
                    'flex-1',
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'rounded-md font-mono text-sm',
                  )}
                  style={{
                    backgroundColor: 'rgba(11, 17, 32, 0.6)',
                    border: '1px solid var(--color-border-card)',
                    color: 'var(--mol-color-text)',
                  }}
                  disabled={subscribeStatus.kind === 'submitting'}
                />
                <button
                  type="submit"
                  data-testid="public-subscribe-submit"
                  className={cm.cn(
                    cm.sp('px', 6),
                    cm.sp('py', 3),
                    'rounded-md font-mono font-bold transition-all hover:opacity-90',
                  )}
                  style={{
                    backgroundColor: BRAND_COLOR,
                    color: 'var(--color-auth-on-primary)',
                    boxShadow: '0 12px 28px -12px rgba(16, 185, 129, 0.6)',
                  }}
                  disabled={subscribeStatus.kind === 'submitting'}
                >
                  {subscribeStatus.kind === 'submitting'
                    ? t('publicStatus.subscribeSubmitting', {}, { defaultValue: 'Subscribing…' })
                    : t('publicStatus.subscribeCta', {}, { defaultValue: 'Subscribe' })}
                </button>
              </form>
              {subscribeStatus.kind === 'success' ? (
                <p
                  data-testid="public-subscribe-success"
                  role="status"
                  aria-live="polite"
                  className={cm.cn('mt-3 text-sm font-mono')}
                  style={{ color: 'var(--color-link-hover)' }}
                >
                  {subscribeStatus.message}
                </p>
              ) : null}
              {subscribeStatus.kind === 'error' ? (
                <p
                  data-testid="public-subscribe-error"
                  role="alert"
                  className={cm.cn('mt-3 text-sm font-mono')}
                  style={{ color: 'var(--color-auth-error-text)' }}
                >
                  {subscribeStatus.message}
                </p>
              ) : null}
              <p className={cm.cn('mt-3 text-xs font-mono text-on-surface-variant')}>
                {t(
                  'publicStatus.subscribeChannels',
                  {},
                  { defaultValue: 'email · sms · webhook · rss · slack' },
                )}
              </p>
            </section>
          </>
        )}
      </main>

      <footer
        className={cm.cn('py-8 text-center text-sm border-t')}
        style={{
          borderColor: 'var(--color-border-card)',
          color:
            '#94a3b8' /* de-alpha'd — rgba(…,0.7) was 4.15:1 on #0b1120 (fail); solid slate-400 = 6.9:1 */,
        }}
      >
        <p className={cm.cn('font-mono')}>
          {t(
            'publicStatus.footer',
            { year: 2026, app: APP_NAME },
            { defaultValue: '© {{year}} {{app}} · {{app}} keeps every second accountable.' },
          )}
        </p>
      </footer>
    </div>
  )
}
