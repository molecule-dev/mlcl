import { useMemo } from 'react'
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, BRAND_COLOR } from '../branding.js'
import { DeliveryRow } from '../components/DeliveryRow.js'
import { DeliverySparkline } from '../components/DeliverySparkline.js'
import { EndpointCard, type EndpointCardData } from '../components/EndpointCard.js'
import { MetricStatCard } from '../components/MetricStatCard.js'
import { type DeliveryStatus, StatusPill } from '../components/StatusPill.js'
import { useApi } from '../lib/useApi.js'

interface ApiWebhook {
  id: string
  name: string
  description: string | null
  url: string
  events: unknown
  is_active: boolean
  retry_count: number
  last_delivered_at: string | null
  success_rate_24h: number | string | null
  deliveries_24h: number
  failures_24h: number
  sparkline: unknown
  created_at: string
}

interface ApiDelivery {
  id: string
  webhook_id: string
  event_type: string
  method: string
  url: string
  status: string
  status_code: number
  status_text: string
  duration_ms: number
  retry_count: number
  delivered_at: string | null
  created_at: string
}

const parseJsonArray = <T,>(v: unknown, fallback: T[]): T[] => {
  if (Array.isArray(v)) return v as T[]
  if (typeof v !== 'string') return fallback
  try {
    const parsed = JSON.parse(v)
    return Array.isArray(parsed) ? (parsed as T[]) : fallback
  } catch (_error) {
    // invalid JSON — return fallback value
    return fallback
  }
}

const deriveStatus = (w: ApiWebhook): DeliveryStatus => {
  if (!w.is_active) return 'paused'
  const total = w.deliveries_24h ?? 0
  const fails = w.failures_24h ?? 0
  if (total === 0 && fails === 0) return 'live'
  const rate = total > 0 ? 1 - fails / total : 1
  if (rate < 0.7) return 'failed'
  if (rate < 0.99) return 'retrying'
  return 'live'
}

const adapt = (w: ApiWebhook): EndpointCardData => ({
  id: w.id,
  url: w.url,
  description: w.description ?? w.name,
  status: deriveStatus(w),
  success_rate_24h:
    typeof w.success_rate_24h === 'number'
      ? w.success_rate_24h
      : typeof w.success_rate_24h === 'string'
        ? Number(w.success_rate_24h)
        : 1,
  deliveries_24h: w.deliveries_24h ?? 0,
  failures_24h: w.failures_24h ?? 0,
  events: parseJsonArray<string>(w.events, []),
  last_delivered_at: w.last_delivered_at ?? undefined,
  sparkline: parseJsonArray<number>(w.sparkline, []),
})

const calcSparkline = (deliveries: ApiDelivery[]): { delivered: number[]; failures: number[] } => {
  // Bucket recent deliveries into 24 hourly buckets, oldest → newest.
  const now = Date.now()
  const buckets = Array.from({ length: 24 }, () => ({ delivered: 0, failed: 0 }))
  for (const d of deliveries) {
    const ts = new Date(d.delivered_at ?? d.created_at).getTime()
    const ageHours = (now - ts) / 3_600_000
    if (ageHours < 0 || ageHours >= 24) continue
    const bucketIdx = 23 - Math.floor(ageHours)
    if (d.status_code >= 200 && d.status_code < 300) buckets[bucketIdx].delivered += 1
    else buckets[bucketIdx].failed += 1
  }
  return {
    delivered: buckets.map((b) => b.delivered),
    failures: buckets.map((b) => b.failed),
  }
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()

  const { data: webhooksData } = useApi<ApiWebhook[]>('/webhooks?limit=200')
  const { data: deliveriesData } = useApi<ApiDelivery[]>('/deliveries?limit=200')

  const webhooks = useMemo(() => webhooksData ?? [], [webhooksData])
  const deliveries = useMemo(() => deliveriesData ?? [], [deliveriesData])

  const last24hDeliveries = useMemo(() => {
    const cutoff = Date.now() - 24 * 3_600_000
    return deliveries.filter((d) => {
      const ts = new Date(d.delivered_at ?? d.created_at).getTime()
      return ts >= cutoff
    })
  }, [deliveries])

  const totalDelivered = last24hDeliveries.filter(
    (d) => d.status_code >= 200 && d.status_code < 300,
  ).length
  const totalFailed = last24hDeliveries.filter(
    (d) => d.status_code === 0 || d.status_code >= 400,
  ).length
  const totalAll = last24hDeliveries.length
  const firstTrySuccessRate =
    totalAll === 0
      ? 100
      : (last24hDeliveries.filter(
          (d) => d.status_code >= 200 && d.status_code < 300 && (d.retry_count ?? 0) === 0,
        ).length /
          totalAll) *
        100
  const inRetryQueue = deliveries.filter(
    (d) => d.status === 'queued' || d.status === 'delivering',
  ).length
  const sortedLatencies = last24hDeliveries.map((d) => d.duration_ms || 0).sort((a, b) => a - b)
  const p50 =
    sortedLatencies.length > 0 ? sortedLatencies[Math.floor(sortedLatencies.length / 2)] : 0
  const p99 =
    sortedLatencies.length > 0
      ? sortedLatencies[
          Math.min(sortedLatencies.length - 1, Math.floor(sortedLatencies.length * 0.99))
        ]
      : 0
  const liveCount = webhooks.filter((w) => w.is_active).length

  const { delivered: deliveredTrend, failures: failureTrend } = calcSparkline(deliveries)

  const recentDeliveries = useMemo(() => deliveries.slice(0, 5), [deliveries])

  const topEndpoints: EndpointCardData[] = useMemo(() => {
    const adapted = webhooks.map(adapt)
    return adapted
      .slice()
      .sort((a, b) => (b.deliveries_24h || 0) - (a.deliveries_24h || 0))
      .slice(0, 3)
  }, [webhooks])

  const fmtNumber = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : String(n)

  return (
    <div
      className={cm.cn(cm.sp('p', 6), 'max-w-7xl mx-auto')}
      style={{ color: 'var(--mol-color-text)' }}
      data-mol-id="dashboard-root"
    >
      <div className={cm.cn('flex items-end justify-between gap-4 flex-wrap mb-6')}>
        <div>
          <p
            className={cm.cn('font-mono text-xs font-bold uppercase tracking-widest mb-2')}
            style={{ color: BRAND_COLOR }}
          >
            {t(
              'dashboard.eyebrow',
              { app: APP_NAME },
              { defaultValue: '{{app}} · live control plane' },
            )}
          </p>
          <h1
            className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight')}
            style={{ color: 'var(--mol-color-text)' }}
          >
            {t('dashboard.heading', {}, { defaultValue: 'Every payload, accounted for.' })}
          </h1>
          <p
            className={cm.cn('mt-2 text-sm max-w-xl')}
            style={{ color: 'var(--mol-color-text-secondary)' }}
          >
            {t(
              'dashboard.body',
              {},
              {
                defaultValue:
                  'Live throughput, retries in flight, and the endpoints that just hiccupped — across every workspace you operate.',
              },
            )}
          </p>
        </div>
        <div className={cm.cn('flex items-center gap-2')}>
          <StatusPill
            status={liveCount > 0 ? 'live' : 'paused'}
            pulse={liveCount > 0}
            label={liveCount > 0 ? 'ALL SYSTEMS LIVE' : 'NO ACTIVE ENDPOINTS'}
            emphasis
          />
          <Link
            to="/endpoints/new"
            className={cm.cn(
              'inline-flex items-center gap-2 px-4 py-2 font-mono font-semibold text-sm rounded-md transition-all hover:opacity-90 shadow-lg',
            )}
            style={{
              backgroundColor: BRAND_COLOR,
              color: 'var(--color-on-primary)',
              boxShadow:
                '0 8px 24px -8px color-mix(in srgb, var(--mol-color-primary) 40%, transparent)',
            }}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              add
            </span>
            {t('dashboard.newEndpoint', {}, { defaultValue: 'New endpoint' })}
          </Link>
        </div>
      </div>

      <div
        className={cm.cn('relative overflow-hidden rounded-2xl mb-6 px-8 py-9 text-white')}
        style={{
          background:
            'linear-gradient(135deg, var(--mol-color-primary-dark) 0%, var(--mol-color-primary) 35%, var(--mol-color-primary-light) 100%)',
          boxShadow: '0 30px 80px -30px rgba(16, 185, 129, 0.45)',
        }}
        data-mol-id="dashboard-hero"
      >
        <div
          className={cm.cn('absolute -right-24 -top-24 w-80 h-80 rounded-full pointer-events-none')}
          style={{ backgroundColor: 'rgba(255,255,255,0.18)', filter: 'blur(60px)' }}
          aria-hidden="true"
        />
        <div
          className={cm.cn(
            'absolute -left-20 -bottom-28 w-72 h-72 rounded-full pointer-events-none',
          )}
          style={{ backgroundColor: 'rgba(99, 102, 241, 0.32)', filter: 'blur(80px)' }}
          aria-hidden="true"
        />

        <div className={cm.cn('relative grid gap-8 md:grid-cols-12 items-end')}>
          <div className={cm.cn('md:col-span-7')}>
            <p
              className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest mb-3')}
              style={{ color: 'rgba(255,255,255,0.85)' }}
            >
              {t('dashboard.heroEyebrow', {}, { defaultValue: '24h delivered · all endpoints' })}
            </p>
            <div className={cm.cn('flex items-baseline gap-3')}>
              <span
                className={cm.cn(
                  'font-mono text-6xl md:text-7xl font-extrabold tracking-tighter leading-none',
                )}
                style={{ color: '#f8fafc' }}
                data-mol-id="dashboard-total-delivered"
              >
                {totalDelivered.toLocaleString()}
              </span>
              <span
                className={cm.cn(
                  'inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold backdrop-blur-md',
                )}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.20)',
                  color: '#f8fafc',
                  border: '1px solid rgba(255,255,255,0.35)',
                }}
              >
                <span className={cm.cn('material-symbols-outlined text-sm')} aria-hidden="true">
                  bolt
                </span>
                {totalAll === 0
                  ? t('dashboard.heroBadgeEmpty', {}, { defaultValue: 'awaiting first delivery' })
                  : t(
                      'dashboard.heroBadgeLive',
                      { count: liveCount },
                      { defaultValue: '{{count}} live endpoints' },
                    )}
              </span>
            </div>
            <p className={cm.cn('mt-3 text-sm')} style={{ color: 'rgba(255,255,255,0.85)' }}>
              {t(
                'dashboard.heroSubcaption',
                { p50, rate: firstTrySuccessRate.toFixed(1), endpoints: webhooks.length },
                {
                  defaultValue:
                    'Median latency {{p50}}ms · {{rate}}% delivered first try · {{endpoints}} endpoints registered',
                },
              )}
            </p>

            <div className={cm.cn('mt-6 flex items-center gap-3 flex-wrap')}>
              <Link
                to="/deliveries"
                className={cm.cn(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-md font-mono font-semibold text-sm transition-all hover:opacity-90',
                )}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.95)',
                  color: '#065f46',
                }}
              >
                <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                  send
                </span>
                {t('dashboard.viewDeliveries', {}, { defaultValue: 'Open delivery log' })}
              </Link>
              <Link
                to="/audit"
                className={cm.cn(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-md font-mono font-semibold text-sm transition-colors',
                )}
                style={{
                  border: '1px solid rgba(255,255,255,0.4)',
                  color: '#f8fafc',
                }}
              >
                <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                  lock_clock
                </span>
                {t('dashboard.viewAudit', {}, { defaultValue: 'View audit log' })}
              </Link>
            </div>
          </div>
          <div className={cm.cn('md:col-span-5')}>
            <DeliverySparkline
              values={deliveredTrend.length ? deliveredTrend : [0, 0, 0, 0, 0]}
              width={420}
              height={120}
              stroke="var(--mol-color-text)"
              fill="var(--mol-color-text)"
              strokeWidth={2.25}
              showLastDot={true}
              ariaLabel="Delivery throughput last 24h"
              className={cm.cn('w-full')}
            />
            <DeliverySparkline
              values={failureTrend.length ? failureTrend : [0, 0, 0, 0, 0]}
              width={420}
              height={48}
              stroke="rgba(252, 165, 165, 0.95)"
              fill="rgba(252, 165, 165, 0.95)"
              strokeWidth={1.75}
              showLastDot={false}
              ariaLabel="Failures last 24h"
              className={cm.cn('w-full mt-1')}
            />
            <p
              className={cm.cn('mt-1 font-mono text-[10px] font-black uppercase tracking-widest')}
              style={{ color: 'rgba(255,255,255,0.7)' }}
            >
              {t(
                'dashboard.sparklineLegend',
                {},
                { defaultValue: 'delivered · failed · 24h trend' },
              )}
            </p>
          </div>
        </div>
      </div>

      <div className={cm.cn('grid gap-4 mb-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}>
        <MetricStatCard
          eyebrow={t('dashboard.metric.delivered', {}, { defaultValue: 'Delivered' })}
          value={fmtNumber(totalDelivered)}
          unit="payloads"
          caption={t(
            'dashboard.metric.deliveredCaption',
            { rate: firstTrySuccessRate.toFixed(1) },
            { defaultValue: '{{rate}}% on first try' },
          )}
          tone="success"
          icon="task_alt"
          sparkline={deliveredTrend.length ? deliveredTrend : undefined}
        />
        <MetricStatCard
          eyebrow={t('status.failed', {}, { defaultValue: 'Failed' })}
          value={String(totalFailed)}
          unit="deliveries"
          caption={t(
            'dashboard.metric.failuresCaption',
            { count: webhooks.filter((w) => deriveStatus(w) === 'failed').length },
            { defaultValue: '{{count}} endpoints flapping' },
          )}
          tone={totalFailed > 0 ? 'error' : 'success'}
          icon="error"
          sparkline={failureTrend.length ? failureTrend : undefined}
        />
        <MetricStatCard
          eyebrow={t('dashboard.metric.latency', {}, { defaultValue: 'p50 latency' })}
          value={String(p50)}
          unit="ms"
          caption={t(
            'dashboard.metric.latencyCaption',
            { p99 },
            { defaultValue: 'p99 {{p99}}ms · stable' },
          )}
          tone="info"
          icon="speed"
        />
        <MetricStatCard
          eyebrow={t('dashboard.metric.queue', {}, { defaultValue: 'In retry queue' })}
          value={String(inRetryQueue)}
          unit="payloads"
          caption={t(
            'dashboard.metric.queueCaption',
            {},
            { defaultValue: 'queued for next sweep' },
          )}
          tone={inRetryQueue > 0 ? 'warning' : 'neutral'}
          icon="autorenew"
        />
      </div>

      <div className={cm.cn('grid gap-6 lg:grid-cols-12')}>
        <section className={cm.cn('lg:col-span-7')}>
          <div className={cm.cn('flex items-end justify-between mb-4')}>
            <div>
              <h2
                className={cm.cn('text-lg font-extrabold tracking-tight')}
                style={{ color: 'var(--mol-color-text)' }}
              >
                {t('dashboard.recentTitle', {}, { defaultValue: 'Recent deliveries' })}
              </h2>
              <p className={cm.cn('text-xs')} style={{ color: 'var(--mol-color-text-tertiary)' }}>
                {t(
                  'dashboard.recentSubtitle',
                  {},
                  { defaultValue: 'Last hour across every endpoint' },
                )}
              </p>
            </div>
            <Link
              to="/deliveries"
              className={cm.cn('font-mono text-xs font-bold tracking-wider hover:underline')}
              style={{ color: BRAND_COLOR }}
            >
              {t('dashboard.viewAll', {}, { defaultValue: 'view all →' })}
            </Link>
          </div>
          <div className={cm.cn('flex flex-col gap-3')} data-mol-id="dashboard-recent-deliveries">
            {recentDeliveries.length === 0 ? (
              <div
                className={cm.cn('rounded-xl px-6 py-10 text-center')}
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--mol-color-surface) 40%, transparent)',
                  border: '1px dashed var(--mol-color-border)',
                }}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-4xl mb-2 inline-block')}
                  style={{ color: 'var(--mol-color-text-tertiary)' }}
                  aria-hidden="true"
                >
                  send
                </span>
                <p
                  className={cm.cn('font-mono text-sm font-bold')}
                  style={{ color: 'var(--mol-color-text-secondary)' }}
                >
                  {t('dashboard.recentEmpty', {}, { defaultValue: 'No deliveries yet.' })}
                </p>
                <p
                  className={cm.cn('text-xs mt-1')}
                  style={{ color: 'var(--mol-color-text-tertiary)' }}
                >
                  {t(
                    'dashboard.recentEmptyHint',
                    {},
                    {
                      defaultValue:
                        'Create an endpoint and click "Send test" to fire your first payload.',
                    },
                  )}
                </p>
              </div>
            ) : (
              recentDeliveries.map((d) => (
                <DeliveryRow
                  key={d.id}
                  delivery={{
                    id: d.id,
                    method: (d.method as 'POST') ?? 'POST',
                    url: d.url,
                    status_code: d.status_code,
                    status_text: d.status_text,
                    duration_ms: d.duration_ms,
                    event_type: d.event_type,
                    retry_count: d.retry_count,
                    delivered_at: d.delivered_at ?? d.created_at,
                  }}
                  to={`/deliveries/${d.id}`}
                />
              ))
            )}
          </div>
        </section>

        <section className={cm.cn('lg:col-span-5')}>
          <div className={cm.cn('flex items-end justify-between mb-4')}>
            <div>
              <h2
                className={cm.cn('text-lg font-extrabold tracking-tight')}
                style={{ color: 'var(--mol-color-text)' }}
              >
                {t('dashboard.topEndpoints', {}, { defaultValue: 'Top endpoints' })}
              </h2>
              <p className={cm.cn('text-xs')} style={{ color: 'var(--mol-color-text-tertiary)' }}>
                {t(
                  'dashboard.topEndpointsSubtitle',
                  {},
                  { defaultValue: 'By volume in the last 24h' },
                )}
              </p>
            </div>
            <Link
              to="/endpoints"
              className={cm.cn('font-mono text-xs font-bold tracking-wider hover:underline')}
              style={{ color: BRAND_COLOR }}
            >
              {t('dashboard.viewAllEndpoints', {}, { defaultValue: 'all endpoints →' })}
            </Link>
          </div>
          <div className={cm.cn('flex flex-col gap-3')} data-mol-id="dashboard-top-endpoints">
            {topEndpoints.length === 0 ? (
              <div
                className={cm.cn('rounded-xl px-6 py-10 text-center')}
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--mol-color-surface) 40%, transparent)',
                  border: '1px dashed var(--mol-color-border)',
                }}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-4xl mb-2 inline-block')}
                  style={{ color: 'var(--mol-color-text-tertiary)' }}
                  aria-hidden="true"
                >
                  cloud_off
                </span>
                <p
                  className={cm.cn('font-mono text-sm font-bold')}
                  style={{ color: 'var(--mol-color-text-secondary)' }}
                >
                  {t('dashboard.endpointsEmpty', {}, { defaultValue: 'No endpoints yet.' })}
                </p>
                <Link
                  to="/endpoints/new"
                  className={cm.cn(
                    'mt-2 inline-block font-mono text-xs font-bold tracking-wider hover:underline',
                  )}
                  style={{ color: BRAND_COLOR }}
                >
                  {t('dashboard.endpointsEmptyCta', {}, { defaultValue: 'create your first →' })}
                </Link>
              </div>
            ) : (
              topEndpoints.map((endpoint) => <EndpointCard key={endpoint.id} endpoint={endpoint} />)
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
