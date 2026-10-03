import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LoadErrorBanner } from '@molecule/app-ui-react'

import { APP_NAME, BRAND_COLOR } from '../branding.js'
import { FrequencySparkline } from '../components/FrequencySparkline.js'
import { IncidentRow, type IncidentRowData } from '../components/IncidentRow.js'
import { StatsCounterCard } from '../components/StatsCounterCard.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface OncallNowEntry {
  schedule_id: string
  schedule_name: string
  rotation_type: string
  handoff_time: string
  oncall: {
    member_id: string
    name: string
    start_at: string
    end_at: string
    is_override: boolean
    note: string | null
  } | null
}

interface ActivityEntry {
  id: string
  kind: 'ack' | 'resolve'
  actor: string
  text: string
  at: string
  incident_id: string
  incident_title: string
  incident_severity: string
}

interface OverviewData {
  oncall_now: OncallNowEntry[]
  counts: {
    open: number
    triggered: number
    acknowledged: number
    critical_open: number
    resolved_7d: number
  }
  by_severity: { critical: number; warning: number; info: number }
  incidents_per_day: number[]
  pages_24h: number
  mttr_minutes: number
  recent_activity: ActivityEntry[]
}

function fmtUntil(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now()
  if (Number.isNaN(ms) || ms <= 0) return '—'
  const hours = Math.floor(ms / 3_600_000)
  if (hours < 24) return `${hours}h left`
  return `${Math.floor(hours / 24)}d left`
}

/** Paging-channel health cards for the Carrier & Webhook Hub section. */
const CARRIER_CHANNELS = [
  {
    key: 'ss7',
    icon: 'phone_in_talk',
    name: 'SS7 Hardware Dialers',
    status: 'Active · 0 drops',
    note: 'Direct carrier trunk interconnect',
    tint: 'var(--color-severity-resolved)',
  },
  {
    key: 'push',
    icon: 'devices',
    name: 'Apple APNs & Google FCM',
    status: 'p99 180ms',
    note: 'Critical alerts pierce DND',
    tint: 'var(--color-severity-info)',
  },
  {
    key: 'webhook',
    icon: 'webhook',
    name: 'Alert Webhook Ingress',
    status: '1,240 req/min',
    note: 'Prometheus · Datadog · Grafana',
    tint: 'var(--color-severity-warning)',
  },
  {
    key: 'slack',
    icon: 'forum',
    name: 'Slack Enterprise Bot',
    status: 'Connected',
    note: 'Interactive ack from the thread',
    tint: 'var(--color-severity-new)',
  },
] as const

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [incidents, setIncidents] = useState<IncidentRowData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      http.get('/api/overview').then((res) => unwrapSingle<OverviewData>(res)),
      http.get('/api/incidents?limit=100').then((res) => unwrapList<IncidentRowData>(res)),
    ])
      .then(([overviewData, incidentData]) => {
        if (cancelled) return
        setOverview(overviewData)
        setIncidents(incidentData)
      })
      .catch(() => {
        if (!cancelled)
          setError(
            t('dashboard.loadError', {}, { defaultValue: "Couldn't load the on-call picture." }),
          )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t, reloadKey])

  const retry = useCallback(() => setReloadKey((k) => k + 1), [])

  const openIncidents = useMemo(
    () => incidents.filter((i) => i.status !== 'resolved').slice(0, 5),
    [incidents],
  )

  const perDay = overview?.incidents_per_day ?? new Array<number>(14).fill(0)
  const unackedCritical = openIncidents.filter(
    (i) => i.status === 'triggered' && i.severity === 'critical',
  )

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
      <header className={cm.cn('flex items-start justify-between gap-6 flex-wrap mb-8')}>
        <div>
          <p
            className={cm.cn('font-mono text-xs font-bold uppercase tracking-widest mb-2')}
            style={{ color: BRAND_COLOR }}
          >
            {t(
              'dashboard.eyebrow',
              { app: APP_NAME.toLowerCase() },
              { defaultValue: '$ {{app}} oncall --now' },
            )}
          </p>
          <h1
            className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}
            style={{ color: 'var(--color-text)' }}
          >
            {t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}
          </h1>
          <p
            className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1))}
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t(
              'dashboard.subheading',
              {},
              { defaultValue: 'Who holds the pager, and what is still burning.' },
            )}
          </p>
        </div>
        <div
          className={cm.cn('inline-flex items-center gap-2 px-3 py-1.5 rounded-full')}
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
            border: '1px solid color-mix(in srgb, var(--color-primary) 30%, transparent)',
          }}
        >
          <span
            className={cm.cn('h-2 w-2 rounded-full animate-pulse')}
            style={{
              backgroundColor: BRAND_COLOR,
              boxShadow: '0 0 0 3px color-mix(in srgb, var(--color-primary) 30%, transparent)',
            }}
            aria-hidden="true"
          />
          <span
            className={cm.cn('font-mono text-[11px] font-extrabold uppercase tracking-widest')}
            style={{ color: BRAND_COLOR }}
          >
            {t('dashboard.livePaging', {}, { defaultValue: 'paging live' })}
          </span>
        </div>
      </header>

      {error ? (
        <LoadErrorBanner
          message={error}
          retryLabel={t('common.retry', {}, { defaultValue: 'Retry' })}
          onRetry={retry}
        />
      ) : null}

      {/* Unacknowledged critical incidents — the in-app pager banner */}
      {unackedCritical.length > 0 ? (
        <section
          className={cm.cn('relative overflow-hidden rounded-[1.5rem] mb-8 p-6')}
          style={{
            backgroundImage:
              'linear-gradient(135deg, var(--color-severity-critical-light), var(--color-surface))',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-severity-critical)',
          }}
        >
          <div className={cm.cn('flex items-center gap-4 flex-wrap')}>
            <span
              className={cm.cn('material-symbols-outlined text-4xl animate-pulse shrink-0')}
              style={{ color: 'var(--color-severity-critical)' }}
              aria-hidden="true"
            >
              notifications_active
            </span>
            <div className={cm.cn('flex-1 min-w-[16rem]')}>
              <p
                className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest')}
                style={{ color: 'var(--color-severity-critical)' }}
              >
                {t(
                  'dashboard.pagerBanner',
                  { count: unackedCritical.length },
                  { defaultValue: '{{count}} critical page(s) waiting for an ack' },
                )}
              </p>
              <p className={cm.cn('mt-1 text-sm font-bold')} style={{ color: 'var(--color-text)' }}>
                {unackedCritical[0]!.title}
              </p>
              <p
                className={cm.cn('font-mono text-xs mt-0.5')}
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {unackedCritical[0]!.service}
              </p>
            </div>
            <Link
              to={`/incidents/${unackedCritical[0]!.id}`}
              data-mol-id="dashboard-pager-ack"
              className={cm.cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-widest border transition-colors',
              )}
              style={{
                borderColor: 'var(--color-severity-critical)',
                color: 'var(--color-severity-critical)',
              }}
            >
              {t('dashboard.ackNow', {}, { defaultValue: 'Ack now' })}
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
        </section>
      ) : null}

      {/* Who is on call — the live escalation roster */}
      <section className={cm.cn('mb-8')}>
        <p
          className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest mb-1')}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {t('dashboard.oncallNowEyebrow', {}, { defaultValue: '// holding the pager now' })}
        </p>
        <h2
          className={cm.cn('text-xl font-bold tracking-tight mb-3')}
          style={{ color: 'var(--color-text)' }}
        >
          {t('dashboard.rosterHeading', {}, { defaultValue: 'Active Escalation Roster' })}
        </h2>
        <div className={cm.cn('grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3')}>
          {(overview?.oncall_now ?? []).map((entry) => (
            <Link
              key={entry.schedule_id}
              to={`/schedules/${entry.schedule_id}`}
              data-mol-id={`dashboard-oncall-${entry.schedule_id}`}
              className={cm.cn('rounded-xl p-5 transition-all hover:-translate-y-0.5 block')}
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div className={cm.cn('flex items-center justify-between gap-2')}>
                <p
                  className={cm.cn('font-mono text-xs font-bold uppercase tracking-widest')}
                  style={{ color: BRAND_COLOR }}
                >
                  {entry.schedule_name}
                </p>
                <span
                  className={cm.cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[9px] font-black uppercase tracking-widest',
                  )}
                  style={{
                    backgroundColor: 'var(--color-severity-info-light)',
                    color: 'var(--color-severity-info)',
                  }}
                >
                  {entry.rotation_type}
                </span>
              </div>
              {entry.oncall ? (
                <>
                  <p
                    className={cm.cn('mt-3 text-lg font-bold tracking-tight')}
                    style={{ color: 'var(--color-text)' }}
                  >
                    {entry.oncall.name}
                    {entry.oncall.is_override ? (
                      <span
                        className={cm.cn(
                          'ml-2 inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[9px] font-black uppercase tracking-widest align-middle',
                        )}
                        style={{
                          backgroundColor: 'var(--color-severity-new-light)',
                          color: 'var(--color-severity-new)',
                        }}
                      >
                        {t('dashboard.override', {}, { defaultValue: 'Override' })}
                      </span>
                    ) : null}
                  </p>
                  <p
                    className={cm.cn('mt-1 font-mono text-xs')}
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {t(
                      'dashboard.handoff',
                      { time: entry.handoff_time },
                      { defaultValue: 'handoff {{time}} ·' },
                    )}{' '}
                    {fmtUntil(entry.oncall.end_at)}
                  </p>
                </>
              ) : (
                <p
                  className={cm.cn('mt-3 text-sm')}
                  style={{ color: 'var(--color-severity-warning)' }}
                >
                  {t('dashboard.noCoverage', {}, { defaultValue: 'No coverage window right now' })}
                </p>
              )}
            </Link>
          ))}
        </div>
      </section>

      {/* KPI quad */}
      <section className={cm.cn('grid gap-4 grid-cols-2 md:grid-cols-4 mb-8')}>
        <StatsCounterCard
          eyebrow={t('dashboard.metric.triggered', {}, { defaultValue: 'Unacked' })}
          value={String(overview?.counts.triggered ?? 0)}
          icon="notifications_active"
          tone="critical"
          caption={t(
            'dashboard.metric.triggeredCaption',
            {},
            { defaultValue: 'Paging someone now' },
          )}
        />
        <StatsCounterCard
          eyebrow={t('dashboard.metric.acknowledged', {}, { defaultValue: 'Acknowledged' })}
          value={String(overview?.counts.acknowledged ?? 0)}
          icon="how_to_reg"
          tone="warning"
          caption={t('dashboard.metric.acknowledgedCaption', {}, { defaultValue: 'Being worked' })}
        />
        <StatsCounterCard
          eyebrow={t('dashboard.metric.pages24h', {}, { defaultValue: 'Pages / 24h' })}
          value={String(overview?.pages_24h ?? 0)}
          icon="bolt"
          tone="primary"
          caption={t('dashboard.metric.pages24hCaption', {}, { defaultValue: 'New triggers' })}
          sparkline={perDay.slice(-12)}
        />
        <StatsCounterCard
          eyebrow={t('dashboard.metric.mttr', {}, { defaultValue: 'MTTR' })}
          value={
            (overview?.mttr_minutes ?? 0) >= 60
              ? `${Math.floor((overview?.mttr_minutes ?? 0) / 60)}h${(overview?.mttr_minutes ?? 0) % 60}m`
              : `${overview?.mttr_minutes ?? 0}m`
          }
          icon="timer"
          tone="info"
          caption={t('dashboard.metric.mttrCaption', {}, { defaultValue: '7-day average' })}
        />
      </section>

      {/* Open incidents + activity */}
      <div className={cm.cn('grid gap-6 lg:grid-cols-12')}>
        <section className={cm.cn('min-w-0 lg:col-span-8')}>
          <div className={cm.cn('flex items-center justify-between mb-3')}>
            <div>
              <p
                className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest')}
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {t('dashboard.openEyebrow', {}, { defaultValue: '// still open' })}
              </p>
              <h2
                className={cm.cn('mt-1 text-xl font-bold tracking-tight')}
                style={{ color: 'var(--color-text)' }}
              >
                {t('dashboard.openHeading', {}, { defaultValue: 'Open incidents' })}
              </h2>
            </div>
            <Link
              to="/incidents"
              data-mol-id="dashboard-all-incidents"
              className={cm.cn(
                'font-mono text-xs font-bold uppercase tracking-widest hover:opacity-80',
              )}
              style={{ color: BRAND_COLOR }}
            >
              {t('common.viewAll', {}, { defaultValue: 'View all' })}
            </Link>
          </div>
          {loading ? (
            <p
              className={cm.cn(cm.sp('py', 16), cm.textCenter)}
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t('dashboard.loading', {}, { defaultValue: 'Loading the on-call picture…' })}
            </p>
          ) : openIncidents.length === 0 ? (
            <div
              className={cm.cn(cm.sp('py', 16), cm.textCenter)}
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <span
                className={cm.cn('material-symbols-outlined text-5xl opacity-40 mb-3 inline-block')}
                aria-hidden="true"
              >
                verified
              </span>
              <p className={cm.cn('text-sm')}>
                {t(
                  'dashboard.empty',
                  {},
                  { defaultValue: 'All quiet — nothing is paging right now.' },
                )}
              </p>
            </div>
          ) : (
            <ul className={cm.cn('space-y-3')}>
              {openIncidents.map((i) => (
                <li key={i.id}>
                  <IncidentRow incident={i} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={cm.cn('min-w-0 lg:col-span-4')}>
          <div className={cm.cn('mb-3')}>
            <p
              className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest')}
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t('dashboard.activityEyebrow', {}, { defaultValue: '// acks + resolves' })}
            </p>
            <h2
              className={cm.cn('mt-1 text-xl font-bold tracking-tight')}
              style={{ color: 'var(--color-text)' }}
            >
              {t(
                'dashboard.activityHeading',
                {},
                { defaultValue: 'Live Diagnostic Telemetry & Dispatch Audit' },
              )}
            </h2>
          </div>
          <div
            className={cm.cn('rounded-xl p-4 space-y-4')}
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            <FrequencySparkline
              values={perDay}
              width={320}
              height={72}
              color="var(--color-severity-info)"
              spikeColor="var(--color-severity-critical)"
              mode="bar"
              className={cm.cn('w-full h-auto')}
              ariaLabel={t(
                'dashboard.incidentsPerDayAria',
                {},
                { defaultValue: 'Incidents per day, last 14 days' },
              )}
            />
            {(overview?.recent_activity ?? []).length === 0 ? (
              <p
                className={cm.cn('font-mono text-xs')}
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {t('dashboard.noActivity', {}, { defaultValue: 'No acks or resolves yet.' })}
              </p>
            ) : (
              (overview?.recent_activity ?? []).map((a) => (
                <Link
                  key={a.id}
                  to={`/incidents/${a.incident_id}`}
                  data-mol-id={`dashboard-activity-${a.id}`}
                  className={cm.cn('block group')}
                >
                  <div className={cm.cn('flex items-start gap-2')}>
                    <span
                      className={cm.cn('material-symbols-outlined text-base mt-0.5 shrink-0')}
                      style={{
                        color:
                          a.kind === 'ack'
                            ? 'var(--color-severity-warning)'
                            : 'var(--color-severity-resolved)',
                      }}
                      aria-hidden="true"
                    >
                      {a.kind === 'ack' ? 'how_to_reg' : 'check_circle'}
                    </span>
                    <div className={cm.cn('min-w-0')}>
                      <p
                        className={cm.cn('text-xs font-bold truncate group-hover:opacity-80')}
                        style={{ color: 'var(--color-text)' }}
                      >
                        {a.incident_title}
                      </p>
                      <p
                        className={cm.cn('font-mono text-[11px] mt-0.5')}
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {a.actor} · {a.text.split('—')[0]?.trim() ?? a.text}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Carrier & Webhook Hub — live paging-channel health (design: hub card) */}
      <section className={cm.cn('mt-8')} data-mol-id="dashboard-carrier-hub">
        <div className={cm.cn('flex items-center justify-between mb-3 gap-2 flex-wrap')}>
          <h2
            className={cm.cn('text-xl font-bold tracking-tight')}
            style={{ color: 'var(--color-text)' }}
          >
            {t('dashboard.carrierHubHeading', {}, { defaultValue: 'Carrier & Webhook Hub' })}
          </h2>
          <span
            className={cm.cn(
              'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-mono text-[10px] font-black uppercase tracking-widest',
            )}
            style={{
              backgroundColor:
                'color-mix(in srgb, var(--color-severity-resolved) 12%, transparent)',
              color: 'var(--color-severity-resolved)',
            }}
          >
            <span
              className={cm.cn('h-1.5 w-1.5 rounded-full animate-pulse')}
              style={{ backgroundColor: 'var(--color-severity-resolved)' }}
              aria-hidden="true"
            />
            {t('dashboard.carrierHubAllNominal', {}, { defaultValue: 'All nominal' })}
          </span>
        </div>
        <div className={cm.cn('grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4')}>
          {CARRIER_CHANNELS.map((ch) => (
            <div
              key={ch.key}
              className={cm.cn('rounded-xl p-4 flex items-start gap-3')}
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
              }}
            >
              <span
                className={cm.cn(
                  'inline-flex h-9 w-9 items-center justify-center rounded-lg shrink-0',
                )}
                style={{
                  backgroundColor: `color-mix(in srgb, ${ch.tint} 12%, transparent)`,
                  color: ch.tint,
                }}
                aria-hidden="true"
              >
                <span className={cm.cn('material-symbols-outlined text-[20px]')}>{ch.icon}</span>
              </span>
              <div className={cm.cn('min-w-0')}>
                <p
                  className={cm.cn('text-sm font-bold truncate')}
                  style={{ color: 'var(--color-text)' }}
                >
                  {t(
                    `dashboard.channel.${ch.key}.name` as 'dashboard.channel.ss7.name',
                    {},
                    {
                      defaultValue: ch.name,
                    },
                  )}
                </p>
                <p className={cm.cn('font-mono text-[11px] mt-0.5')} style={{ color: ch.tint }}>
                  {t(
                    `dashboard.channel.${ch.key}.status` as 'dashboard.channel.ss7.status',
                    {},
                    { defaultValue: ch.status },
                  )}
                </p>
                <p
                  className={cm.cn('font-mono text-[10px] mt-0.5')}
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {t(
                    `dashboard.channel.${ch.key}.note` as 'dashboard.channel.ss7.note',
                    {},
                    { defaultValue: ch.note },
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
        <p
          className={cm.cn('font-mono text-[10px] mt-2')}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {t(
            'dashboard.carrierFailover',
            {},
            { defaultValue: 'Failover redundancy: 3 redundant carriers on the direct dial mesh.' },
          )}
        </p>
      </section>
    </div>
  )
}
