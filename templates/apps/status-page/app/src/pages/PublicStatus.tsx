import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'
import { IncidentCard, type IncidentCardData } from '../components/IncidentCard.js'
import { ServiceRow, type ServiceRowData } from '../components/ServiceRow.js'
import type { ComponentStatus } from '../components/StatusPill.js'
import type { UptimeDay, UptimeDayStatus } from '../components/UptimeBar.js'
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

/**
 * Aggregate status → the solid banner color (design-status-page-public-status:
 * one full-width band tinted by the worst current state). Values are theme
 * tokens — no raw hex in JSX.
 */
const BANNER_BG: Record<'all_operational' | ComponentStatus, string> = {
  all_operational: 'bg-[var(--color-status-operational)]',
  operational: 'bg-[var(--color-status-operational)]',
  degraded_performance: 'bg-[var(--color-status-degraded)]',
  partial_outage: 'bg-[var(--color-status-partial)]',
  major_outage: 'bg-[var(--color-status-major)]',
  under_maintenance: 'bg-[var(--color-status-maintenance)]',
  unknown: 'bg-[var(--color-status-unknown)]',
}

/** Daily uptime roll-up ranks (worst day wins the page-level strip). */
const DAY_RANK: Record<UptimeDayStatus, number> = {
  major: 5,
  partial: 4,
  degraded: 3,
  maintenance: 2,
  unknown: 1,
  operational: 0,
  empty: -1,
}

const DAY_BG: Record<UptimeDayStatus, string> = {
  operational: 'bg-[var(--color-status-operational)]',
  degraded: 'bg-[var(--color-status-degraded)]',
  partial: 'bg-[var(--color-status-partial)]',
  major: 'bg-[var(--color-status-major)]',
  maintenance: 'bg-[var(--color-status-maintenance)]',
  unknown: 'bg-[var(--color-status-unknown)]',
  empty: 'bg-surface-container-highest',
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

function fmtRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const minutes = Math.max(0, Math.floor(ms / 60_000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
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

  // Page-level 90-day strip: per calendar day, the WORST status across all
  // services wins the bar (design: mostly-tall emerald strip with the
  // occasional shorted degraded/major day).
  const uptimeDays = useMemo<UptimeDay[]>(() => {
    const perService = services.map((s) => s.uptime90Days ?? []).filter((d) => d.length > 0)
    if (perService.length === 0) return []
    const len = Math.max(...perService.map((d) => d.length))
    const out: UptimeDay[] = []
    for (let i = 0; i < len; i++) {
      let worst: UptimeDayStatus = 'empty'
      for (const days of perService) {
        const day = days[i]
        if (!day) continue
        if (DAY_RANK[day.status] > DAY_RANK[worst]) worst = day.status
      }
      out.push({ date: perService[0][i]?.date ?? `day-${i}`, status: worst })
    }
    return out
  }, [services])

  const lastUpdatedAt = incidents[0]?.latest_update?.created_at ?? incidents[0]?.created_at ?? null
  const isAllOperational =
    totals.aggregate === 'all_operational' || totals.aggregate === 'operational'

  return (
    <div
      className={cm.cn(cm.minH('screen'), 'antialiased font-body')}
      style={{ backgroundColor: 'var(--mol-color-background)', color: 'var(--mol-color-text)' }}
      data-mol-id="page-public-status"
    >
      {/* Visually-hidden H1: the visible headline lives in the status banner,
          so without this the heading outline would skip level 1. */}
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
          <Link to="/" className={cm.cn('flex items-center gap-2')}>
            <BrandWordmark as="span" />
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
                  'px-5 py-2 font-mono font-semibold text-sm rounded-lg bg-[var(--color-status-operational)] text-[var(--color-on-status-operational)] shadow-cta-status hover:opacity-90 transition-opacity',
                )}
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
              data-mol-id="nav-subscribe"
              className={cm.cn(
                'px-5 py-2 font-mono font-semibold text-sm rounded-lg border border-[var(--color-status-operational)] text-[var(--color-status-operational)] hover:bg-[var(--color-status-operational)]/10 transition-colors',
              )}
            >
              {t('publicStatus.subscribe', {}, { defaultValue: 'Subscribe' })}
            </a>
          </div>
        </div>
      </nav>

      {/* Full-width status banner — the design's signature element. Solid
          band tinted by the worst current state, dark ink, pulsing dot. */}
      <div
        className={cm.cn(
          'w-full px-6 py-4 flex items-center justify-center gap-3',
          BANNER_BG[totals.aggregate],
          'text-[var(--color-banner-ink)]',
        )}
        data-mol-id="status-banner"
        role="status"
      >
        <span
          className={cm.cn(
            'w-3 h-3 rounded-full bg-[var(--color-banner-ink)]',
            !isAllOperational && 'animate-pulse',
          )}
          aria-hidden="true"
        />
        <h2 className="font-headline font-semibold text-lg">
          {isAllOperational
            ? t(
                'statusOverviewCard.allOperational',
                {},
                { defaultValue: 'All systems operational' },
              )
            : totals.aggregate === 'under_maintenance'
              ? t(
                  'statusOverviewCard.maintenance',
                  {},
                  { defaultValue: 'Scheduled maintenance in progress' },
                )
              : t(
                  'statusOverviewCard.issuesDetected',
                  {},
                  { defaultValue: 'Some systems are experiencing issues' },
                )}
        </h2>
      </div>

      <main
        className={cm.cn(
          'w-full max-w-[960px]',
          cm.mxAuto,
          cm.sp('px', 6),
          'py-12 flex flex-col gap-12',
        )}
      >
        {loading ? (
          <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
            {t('publicStatus.loading', {}, { defaultValue: 'Loading service health…' })}
          </p>
        ) : (
          <>
            {/* Metric summary row — the design's divided 4-up stat strip */}
            <div
              className={cm.cn(
                'rounded-lg p-5 flex flex-col md:flex-row justify-between items-center',
                'bg-surface-container border divide-y md:divide-y-0 md:divide-x',
              )}
              style={{ borderColor: 'var(--color-border-card)' }}
              data-mol-id="status-metrics"
            >
              <div className={cm.cn('flex-1 text-center py-4 md:py-0')}>
                <div className={cm.cn('font-mono font-bold text-2xl mb-1')}>
                  {overallUptime != null ? `${overallUptime.toFixed(2)}%` : '—'}
                </div>
                <div className={cm.cn('text-sm text-on-surface-variant')}>
                  {t('statusOverviewCard.uptime90', {}, { defaultValue: '90-day uptime' })}
                </div>
              </div>
              <div className={cm.cn('flex-1 text-center py-4 md:py-0')}>
                <div className={cm.cn('font-mono font-bold text-2xl mb-1')}>{services.length}</div>
                <div className={cm.cn('text-sm text-on-surface-variant')}>
                  {t('publicStatus.metrics.components', {}, { defaultValue: 'Components' })}
                </div>
              </div>
              <div className={cm.cn('flex-1 text-center py-4 md:py-0')}>
                <div className={cm.cn('font-mono font-bold text-2xl mb-1')}>
                  {totals.operational}
                  <span className={cm.cn('opacity-50')}>/{services.length}</span>
                </div>
                <div className={cm.cn('text-sm text-on-surface-variant')}>
                  {t('statusOverviewCard.servicesUp', {}, { defaultValue: 'Services up' })}
                </div>
              </div>
              <div className={cm.cn('flex-1 text-center py-4 md:py-0')}>
                <div className={cm.cn('font-mono font-bold text-2xl mb-1')}>
                  {lastUpdatedAt ? fmtRelative(lastUpdatedAt) : '—'}
                </div>
                <div className={cm.cn('text-sm text-on-surface-variant')}>
                  {t('statusOverviewCard.lastIncident', {}, { defaultValue: 'Last update' })}
                </div>
              </div>
            </div>

            {/* 90-day uptime strip — mostly-tall emerald bars, shorted on
                degraded/major days, "90 days ago → Today" rail labels */}
            {uptimeDays.length > 0 ? (
              <section className={cm.cn('flex flex-col gap-4')}>
                <div className={cm.cn(cm.flex({ align: 'end', justify: 'between' }))}>
                  <h2 className="font-headline font-semibold text-lg">
                    {t('publicStatus.uptime.heading', {}, { defaultValue: '90-Day Uptime' })}
                  </h2>
                  <span className={cm.cn('font-mono font-bold text-lg')}>
                    {overallUptime != null ? `${overallUptime.toFixed(2)}%` : '—'}
                  </span>
                </div>
                <div className="h-[34px] flex gap-[2px] items-end w-full">
                  {uptimeDays.map((day) => (
                    <div
                      key={day.date}
                      className={cm.cn(
                        'w-[3px] rounded-sm flex-grow opacity-80 hover:opacity-100 transition-opacity',
                        DAY_BG[day.status],
                        day.status === 'major'
                          ? 'h-1/2'
                          : day.status === 'degraded' || day.status === 'partial'
                            ? 'h-4/5'
                            : 'h-full',
                      )}
                      title={day.date}
                    />
                  ))}
                </div>
                <div
                  className={cm.cn(
                    'flex justify-between font-mono text-xs uppercase text-on-surface-variant',
                  )}
                >
                  <span>
                    {t('publicStatus.uptime.daysAgo', {}, { defaultValue: '90 days ago' })}
                  </span>
                  <span>{t('publicStatus.uptime.today', {}, { defaultValue: 'Today' })}</span>
                </div>
              </section>
            ) : null}

            {/* Active incidents */}
            {activeIncidents.length > 0 ? (
              <section className={cm.cn('flex flex-col gap-4')}>
                <header
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('mb', 2),
                  )}
                >
                  <h2 className="font-headline font-semibold text-xl">
                    {t('publicStatus.activeHeading', {}, { defaultValue: 'Active incidents' })}
                  </h2>
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
            <section className={cm.cn('flex flex-col gap-6')}>
              <header>
                <h2 className="font-headline font-semibold text-xl">
                  {t('publicStatus.servicesHeading', {}, { defaultValue: 'Components & services' })}
                </h2>
              </header>
              <div className={cm.cn('flex flex-col gap-6')}>
                {groupedServices.map(([group, list]) => (
                  <section
                    key={group}
                    className={cm.cn(
                      'rounded-lg overflow-hidden border border-[var(--color-border-card)] bg-[var(--color-surface-card)]',
                    )}
                  >
                    <header
                      className={cm.cn(
                        'px-5 py-3 border-b font-mono text-xs font-semibold uppercase tracking-widest text-on-surface-variant bg-surface-container/50',
                      )}
                      style={{ borderColor: 'var(--color-border-card)' }}
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
              <section className={cm.cn('flex flex-col gap-4')}>
                <header>
                  <h2 className="font-headline font-semibold text-xl">
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

            {/* Subscribe panel — the design's flat bordered widget */}
            <section
              id="subscribe"
              className={cm.cn(
                'rounded-lg p-8 border border-[var(--color-border-card)] bg-surface-container flex flex-col md:flex-row gap-8 items-center justify-between',
              )}
            >
              <div className={cm.cn('flex-1 flex flex-col gap-2')}>
                <h2 className="font-headline font-semibold text-xl">
                  {t(
                    'publicStatus.subscribeHeading',
                    {},
                    { defaultValue: 'Get every status change as it happens.' },
                  )}
                </h2>
                <p className={cm.cn('max-w-xl text-on-surface-variant text-sm')}>
                  {t(
                    'publicStatus.subscribeBody',
                    {},
                    {
                      defaultValue:
                        'Email, SMS, webhooks, RSS — pick the channel your runbook reads. Per-component subscriptions keep the noise to a minimum.',
                    },
                  )}
                </p>
              </div>
              <form
                onSubmit={handleSubscribe}
                aria-label={t(
                  'publicStatus.subscribeFormAria',
                  {},
                  { defaultValue: 'Subscribe to status updates' },
                )}
                className={cm.cn('w-full md:w-auto flex flex-col sm:flex-row gap-3')}
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
                    'flex-1 md:w-64',
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'rounded-lg font-mono text-sm bg-surface-container-lowest border border-[var(--color-border-card)] text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-[var(--color-status-operational)]',
                  )}
                  disabled={subscribeStatus.kind === 'submitting'}
                />
                <button
                  type="submit"
                  data-testid="public-subscribe-submit"
                  className={cm.cn(
                    cm.sp('px', 6),
                    cm.sp('py', 3),
                    'rounded-lg font-headline font-semibold text-sm bg-[var(--color-status-operational)] text-[var(--color-on-status-operational)] shadow-cta-status hover:opacity-90 transition-opacity flex items-center justify-center gap-2 whitespace-nowrap',
                  )}
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
                  className={cm.cn('mt-3 text-sm font-mono w-full text-[var(--color-link-hover)]')}
                >
                  {subscribeStatus.message}
                </p>
              ) : null}
              {subscribeStatus.kind === 'error' ? (
                <p
                  data-testid="public-subscribe-error"
                  role="alert"
                  className={cm.cn('mt-3 text-sm font-mono text-[var(--color-auth-error-text)]')}
                >
                  {subscribeStatus.message}
                </p>
              ) : null}
            </section>
          </>
        )}
      </main>

      <footer
        className={cm.cn('border-t')}
        style={{
          borderColor: 'var(--color-border-card)',
          color: 'var(--color-text-muted)' /* solid slate-400 — 6.9:1 on #0b1120 */,
        }}
      >
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            cm.sp('py', 12),
            cm.flex({ direction: 'col', gap: 'md' }),
            'md:flex-row md:justify-between md:items-center font-mono text-xs uppercase tracking-widest',
          )}
        >
          <p>
            {t(
              'publicStatus.footer',
              { year: new Date().getFullYear(), app: APP_NAME },
              { defaultValue: '© {{year}} {{app}}' },
            )}
            {' — Built with '}
            <a
              href="https://molecule.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline font-bold normal-case tracking-normal"
            >
              Molecule.dev
            </a>
          </p>
          <nav className={cm.cn(cm.flex({ align: 'center', gap: 'lg', wrap: 'wrap' }))}>
            <Link to="/about" className={cm.cn('hover:text-on-surface hover:underline')}>
              {t('nav.about', {}, { defaultValue: 'About' })}
            </Link>
            <Link to="/privacy" className={cm.cn('hover:text-on-surface hover:underline')}>
              {t('nav.privacy', {}, { defaultValue: 'Privacy' })}
            </Link>
            <Link to="/terms" className={cm.cn('hover:text-on-surface hover:underline')}>
              {t('nav.terms', {}, { defaultValue: 'Terms' })}
            </Link>
            <a href="#subscribe" className={cm.cn('hover:text-on-surface hover:underline')}>
              {t('publicStatus.subscribe', {}, { defaultValue: 'Subscribe' })}
            </a>
          </nav>
        </div>
      </footer>
    </div>
  )
}
