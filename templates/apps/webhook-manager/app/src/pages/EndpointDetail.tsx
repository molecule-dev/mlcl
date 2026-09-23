import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { getClient as getHttpClient } from '@molecule/app-http'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, BRAND_COLOR } from '../branding.js'
import { DeliveryRow } from '../components/DeliveryRow.js'
import { DeliverySparkline } from '../components/DeliverySparkline.js'
import { MetricStatCard } from '../components/MetricStatCard.js'
import { PayloadViewer } from '../components/PayloadViewer.js'
import { type DeliveryStatus, StatusPill } from '../components/StatusPill.js'
import { fmtRelative } from '../lib/format.js'
import { useApi } from '../lib/useApi.js'

const PANEL_BORDER = 'var(--mol-color-border)'
const PANEL_BG = 'var(--mol-color-surface)'

interface ApiWebhook {
  id: string
  name: string
  description: string | null
  url: string
  content_type: string
  events: unknown
  secret_masked: string | null
  retry_count: number
  is_active: boolean
  last_delivered_at: string | null
  success_rate_24h: number | string | null
  deliveries_24h: number
  failures_24h: number
  p95_latency_ms: number
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
  request_body: string
  response_body: string
  delivered_at: string | null
  created_at: string
}

const parseJsonArray = <T,>(v: unknown, fallback: T[]): T[] => {
  if (Array.isArray(v)) return v as T[]
  if (typeof v !== 'string') return fallback
  try {
    const p = JSON.parse(v)
    return Array.isArray(p) ? (p as T[]) : fallback
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

export function EndpointDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [secretRevealed, setSecretRevealed] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionStatus, setActionStatus] = useState<string | null>(null)

  const {
    data: webhook,
    loading,
    error,
    refetch,
  } = useApi<ApiWebhook>(id ? `/webhooks/${id}` : null)
  const { data: deliveries, refetch: refetchDeliveries } = useApi<ApiDelivery[]>(
    id ? `/deliveries?webhook_id=${id}&limit=10` : null,
  )

  const events = useMemo(
    () => (webhook ? parseJsonArray<string>(webhook.events, []) : []),
    [webhook],
  )
  const sparkline = useMemo(
    () => (webhook ? parseJsonArray<number>(webhook.sparkline, []) : []),
    [webhook],
  )

  const sendTest = async () => {
    if (!id) return
    setActionError(null)
    setActionStatus('sending')
    try {
      const client = getHttpClient()
      await client.post(`/webhooks/${id}/test`, { event_type: 'test' })
      track({ name: 'endpoint.tested', properties: { webhook_id: id } })
      setActionStatus('sent')
      refetchDeliveries()
    } catch (err) {
      setActionStatus(null)
      setActionError(err instanceof Error ? err.message : 'Test send failed')
    }
  }

  const togglePause = async () => {
    if (!id || !webhook) return
    setActionError(null)
    try {
      const client = getHttpClient()
      await client.put(`/webhooks/${id}`, { is_active: !webhook.is_active })
      track({
        name: webhook.is_active ? 'webhook.paused' : 'webhook.resumed',
        properties: { webhook_id: id },
      })
      refetch()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Toggle failed')
    }
  }

  const removeEndpoint = async () => {
    if (!id) return
    if (
      !window.confirm(
        t(
          'endpointDetail.confirmDelete',
          {},
          { defaultValue: 'Delete this endpoint? This cannot be undone.' },
        ),
      )
    )
      return
    setActionError(null)
    try {
      const client = getHttpClient()
      await client.delete(`/webhooks/${id}`)
      track({ name: 'webhook.deleted', properties: { webhook_id: id } })
      navigate('/endpoints')
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  if (loading) {
    return (
      <div
        className={cm.cn(cm.sp('p', 6), 'max-w-7xl mx-auto')}
        style={{ color: 'var(--mol-color-text-secondary)' }}
      >
        <p className={cm.cn('font-mono text-sm')}>
          {t('endpointDetail.loading', {}, { defaultValue: 'Loading endpoint…' })}
        </p>
      </div>
    )
  }

  if (error || !webhook) {
    return (
      <div
        className={cm.cn(cm.sp('p', 6), 'max-w-3xl mx-auto')}
        style={{ color: 'var(--mol-color-error)' }}
      >
        <p className={cm.cn('font-mono text-sm')}>
          {t('endpointDetail.notFound', {}, { defaultValue: 'Endpoint not found.' })}
        </p>
        <Link to="/endpoints" className={cm.cn('mt-2 inline-block underline')}>
          {t('endpointDetail.backLink', {}, { defaultValue: '← Back to endpoints' })}
        </Link>
      </div>
    )
  }

  const status = deriveStatus(webhook)
  const successRate =
    typeof webhook.success_rate_24h === 'number'
      ? webhook.success_rate_24h * 100
      : webhook.success_rate_24h
        ? Number(webhook.success_rate_24h) * 100
        : webhook.deliveries_24h > 0
          ? (1 - webhook.failures_24h / webhook.deliveries_24h) * 100
          : 100
  const samplePayload = deliveries?.[0]?.request_body
    ? safeParse(deliveries[0].request_body)
    : { event: 'awaiting first delivery', endpoint_id: webhook.id }

  return (
    <div
      className={cm.cn(cm.sp('p', 6), 'max-w-7xl mx-auto')}
      style={{ color: 'var(--mol-color-text)' }}
    >
      <div
        className={cm.cn('mb-2 flex items-center gap-2 text-xs font-mono')}
        style={{ color: 'var(--mol-color-text-tertiary)' }}
      >
        <Link to="/endpoints" className={cm.cn('hover:underline')}>
          {t('endpointDetail.crumbEndpoints', {}, { defaultValue: 'endpoints' })}
        </Link>
        <span aria-hidden="true">/</span>
        <span style={{ color: 'var(--mol-color-text-secondary)' }}>{webhook.id.slice(0, 8)}</span>
      </div>

      {/* Stack below md: a squeezed flex-1 column wraps the URL/title behind
          the action buttons at phone widths. */}
      <div
        className={cm.cn(
          'flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-4 flex-wrap mb-6',
        )}
      >
        <div className={cm.cn('min-w-0')}>
          <div className={cm.cn('flex items-center gap-2 flex-wrap mb-2')}>
            <StatusPill
              status={status}
              pulse={status === 'live'}
              label={status.toUpperCase()}
              emphasis
            />
            <span
              className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest')}
              style={{ color: 'var(--mol-color-text-secondary)' }}
            >
              {webhook.name || 'endpoint'}
            </span>
          </div>
          <h1
            className={cm.cn(
              'font-mono text-2xl md:text-3xl font-extrabold tracking-tight truncate',
            )}
            style={{ color: 'var(--mol-color-text)' }}
            title={webhook.url}
          >
            {webhook.url}
          </h1>
          <p className={cm.cn('mt-1 text-sm')} style={{ color: 'var(--mol-color-text-secondary)' }}>
            {webhook.description ||
              t('endpointDetail.subtitleNone', {}, { defaultValue: 'No description provided.' })}
          </p>
        </div>
        <div className={cm.cn('flex items-center gap-2 flex-wrap')}>
          <button
            type="button"
            onClick={sendTest}
            disabled={actionStatus === 'sending'}
            className={cm.cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-md font-mono font-semibold text-sm transition-colors disabled:opacity-50',
            )}
            style={{
              border: '1px solid var(--mol-color-border)',
              color: 'var(--mol-color-text)',
            }}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              science
            </span>
            {actionStatus === 'sending'
              ? t('common.sendingEllipsis', {}, { defaultValue: 'Sending…' })
              : actionStatus === 'sent'
                ? t('endpointDetail.sent', {}, { defaultValue: 'Sent ✓' })
                : t('endpointDetail.sendTest', {}, { defaultValue: 'Send test' })}
          </button>
          <button
            type="button"
            onClick={togglePause}
            className={cm.cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-md font-mono font-semibold text-sm transition-colors',
            )}
            style={{
              border: '1px solid var(--mol-color-border)',
              color: webhook.is_active ? 'var(--mol-color-warning)' : 'var(--mol-color-success)',
            }}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              {webhook.is_active ? 'pause_circle' : 'play_circle'}
            </span>
            {webhook.is_active
              ? t('common.pause', {}, { defaultValue: 'Pause' })
              : t('common.resume', {}, { defaultValue: 'Resume' })}
          </button>
          <button
            type="button"
            onClick={removeEndpoint}
            className={cm.cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-md font-mono font-semibold text-sm transition-colors',
            )}
            style={{
              border: '1px solid color-mix(in srgb, var(--mol-color-error) 30%, transparent)',
              color: 'var(--mol-color-error)',
            }}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              delete
            </span>
            {t('common.delete', {}, { defaultValue: 'Delete' })}
          </button>
        </div>
      </div>

      {actionError && (
        <p
          className={cm.cn('mb-4 text-xs font-mono')}
          style={{ color: 'var(--mol-color-error)' }}
          role="alert"
        >
          {actionError}
        </p>
      )}

      <div className={cm.cn('grid gap-4 mb-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}>
        <MetricStatCard
          eyebrow={t('endpointDetail.metric.delivered', {}, { defaultValue: 'Delivered 24h' })}
          value={String(webhook.deliveries_24h)}
          caption={t(
            'endpointDetail.metric.deliveredCaption',
            { count: events.length },
            { defaultValue: 'from {{count}} event types' },
          )}
          tone={webhook.deliveries_24h > 0 ? 'success' : 'info'}
          icon="task_alt"
          sparkline={sparkline.length ? sparkline : undefined}
        />
        <MetricStatCard
          eyebrow={t('endpointDetail.metric.successRate', {}, { defaultValue: 'Success rate' })}
          value={successRate.toFixed(2)}
          unit="%"
          caption={t(
            'endpointDetail.metric.successRateCaption',
            { ms: webhook.p95_latency_ms },
            { defaultValue: 'p95 latency {{ms}}ms' },
          )}
          tone={successRate >= 99 ? 'success' : successRate >= 95 ? 'warning' : 'error'}
          icon="trending_up"
        />
        <MetricStatCard
          eyebrow={t('status.failed', {}, { defaultValue: 'Failed' })}
          value={String(webhook.failures_24h)}
          caption={t(
            'endpointDetail.metric.failuresCaption',
            { retries: webhook.retry_count },
            { defaultValue: 'retries: {{retries}}' },
          )}
          tone={webhook.failures_24h > 0 ? 'error' : 'success'}
          icon="error"
        />
        <MetricStatCard
          eyebrow={t('endpointDetail.metric.lastDelivery', {}, { defaultValue: 'Last delivery' })}
          value={webhook.last_delivered_at ? fmtRelative(webhook.last_delivered_at) : 'never'}
          caption={
            deliveries && deliveries[0]
              ? `${deliveries[0].duration_ms}ms · ${deliveries[0].status_code}`
              : t(
                  'endpointDetail.metric.lastDeliveryCaption.none',
                  {},
                  { defaultValue: 'awaiting first event' },
                )
          }
          tone="info"
          icon="schedule"
        />
      </div>

      <div className={cm.cn('grid gap-6 lg:grid-cols-12')}>
        <section className={cm.cn('lg:col-span-7 flex flex-col gap-6')}>
          {sparkline.length > 0 && (
            <div
              className={cm.cn('rounded-xl p-5')}
              style={{ backgroundColor: PANEL_BG, border: `1px solid ${PANEL_BORDER}` }}
            >
              <h2
                className={cm.cn('text-base font-extrabold tracking-tight mb-1')}
                style={{ color: 'var(--mol-color-text)' }}
              >
                {t('endpointDetail.deliveryTrend', {}, { defaultValue: 'Throughput · 24h' })}
              </h2>
              <p className={cm.cn('text-xs')} style={{ color: 'var(--mol-color-text-tertiary)' }}>
                {t(
                  'endpointDetail.deliveryTrendSub',
                  {},
                  { defaultValue: 'deliveries / hour, log scale' },
                )}
              </p>
              <DeliverySparkline
                values={sparkline}
                width={520}
                height={140}
                stroke="var(--mol-color-primary)"
                strokeWidth={2}
                ariaLabel="Throughput last 24h"
                className={cm.cn('w-full mt-2')}
              />
            </div>
          )}

          <div>
            <div className={cm.cn('flex items-end justify-between mb-4')}>
              <div>
                <h2
                  className={cm.cn('text-lg font-extrabold tracking-tight')}
                  style={{ color: 'var(--mol-color-text)' }}
                >
                  {t('endpointDetail.recentDeliveries', {}, { defaultValue: 'Recent deliveries' })}
                </h2>
                <p className={cm.cn('text-xs')} style={{ color: 'var(--mol-color-text-tertiary)' }}>
                  {t(
                    'endpointDetail.recentDeliveriesSub',
                    {},
                    { defaultValue: 'Latest payloads sent to this endpoint' },
                  )}
                </p>
              </div>
              <Link
                to={`/deliveries?webhook=${webhook.id}`}
                className={cm.cn('font-mono text-xs font-bold tracking-wider hover:underline')}
                style={{ color: BRAND_COLOR }}
              >
                {t('endpointDetail.viewAll', {}, { defaultValue: 'view all →' })}
              </Link>
            </div>
            <div className={cm.cn('flex flex-col gap-3')}>
              {!deliveries || deliveries.length === 0 ? (
                <div
                  className={cm.cn('rounded-xl px-6 py-10 text-center')}
                  style={{
                    backgroundColor:
                      'color-mix(in srgb, var(--mol-color-surface) 40%, transparent)',
                    border: '1px dashed var(--mol-color-border)',
                  }}
                >
                  <p
                    className={cm.cn('font-mono text-sm')}
                    style={{ color: 'var(--mol-color-text-secondary)' }}
                  >
                    {t(
                      'endpointDetail.noDeliveries',
                      {},
                      { defaultValue: 'No deliveries yet — click "Send test" to fire one.' },
                    )}
                  </p>
                </div>
              ) : (
                deliveries.map((d) => (
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
          </div>
        </section>

        <aside className={cm.cn('lg:col-span-5 flex flex-col gap-6')}>
          <div
            className={cm.cn('rounded-xl p-5')}
            style={{ backgroundColor: PANEL_BG, border: `1px solid ${PANEL_BORDER}` }}
          >
            <h2
              className={cm.cn('text-base font-extrabold tracking-tight mb-3')}
              style={{ color: 'var(--mol-color-text)' }}
            >
              {t('endpointDetail.signing', {}, { defaultValue: 'Signing secret' })}
            </h2>
            <div
              className={cm.cn('flex items-center gap-2 rounded-md px-3 py-2 font-mono text-sm')}
              style={{
                backgroundColor: 'var(--mol-color-background)',
                border: '1px solid var(--mol-color-border)',
                color: 'var(--mol-color-text)',
              }}
            >
              <span className={cm.cn('truncate')}>
                {secretRevealed
                  ? webhook.secret_masked || '(no secret rotated yet)'
                  : 'whsec_••••••••••••••••'}
              </span>
              <button
                type="button"
                onClick={() => setSecretRevealed((v) => !v)}
                className={cm.cn('ml-auto opacity-80 hover:opacity-100')}
                style={{ color: 'var(--mol-color-text-secondary)' }}
                aria-label={
                  secretRevealed
                    ? t('endpointDetail.hideSecret', {}, { defaultValue: 'Hide secret' })
                    : t('endpointDetail.showSecret', {}, { defaultValue: 'Reveal secret' })
                }
              >
                <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                  {secretRevealed ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            <p
              className={cm.cn('mt-3 text-xs')}
              style={{ color: 'var(--mol-color-text-tertiary)' }}
            >
              {t(
                'endpointDetail.signingHelp',
                { app: APP_NAME },
                {
                  defaultValue:
                    'Verify the X-{{app}}-Signature header against this secret. Only the masked form is shown.',
                },
              )}
            </p>
          </div>

          <div
            className={cm.cn('rounded-xl p-5')}
            style={{ backgroundColor: PANEL_BG, border: `1px solid ${PANEL_BORDER}` }}
          >
            <h2
              className={cm.cn('text-base font-extrabold tracking-tight mb-3')}
              style={{ color: 'var(--mol-color-text)' }}
            >
              {t('endpointDetail.subscriptions', {}, { defaultValue: 'Subscribed events' })}
            </h2>
            {events.length === 0 ? (
              <p
                className={cm.cn('text-xs font-mono')}
                style={{ color: 'var(--mol-color-text-tertiary)' }}
              >
                {t(
                  'endpointDetail.subscriptionsEmpty',
                  {},
                  { defaultValue: 'No event subscriptions configured.' },
                )}
              </p>
            ) : (
              <ul className={cm.cn('flex flex-col gap-2')}>
                {events.map((event) => (
                  <li
                    key={event}
                    className={cm.cn(
                      'flex items-center justify-between gap-2 px-3 py-2 rounded-md',
                    )}
                    style={{
                      backgroundColor:
                        'color-mix(in srgb, var(--mol-color-background) 60%, transparent)',
                      border: '1px solid var(--mol-color-border)',
                    }}
                  >
                    <span
                      className={cm.cn('font-mono text-xs font-semibold')}
                      style={{ color: 'var(--mol-color-text-secondary)' }}
                    >
                      {event}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={cm.cn('flex flex-col gap-3')}>
            <h2
              className={cm.cn('text-base font-extrabold tracking-tight')}
              style={{ color: 'var(--mol-color-text)' }}
            >
              {t('endpointDetail.lastPayload', {}, { defaultValue: 'Last payload sent' })}
            </h2>
            <PayloadViewer
              value={samplePayload as Record<string, unknown>}
              eyebrow="// last payload"
              contentType="application/json"
            />
          </div>
        </aside>
      </div>
    </div>
  )
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s)
  } catch (_error) {
    // not valid JSON — return wrapped raw string as fallback
    return { raw: s }
  }
}
