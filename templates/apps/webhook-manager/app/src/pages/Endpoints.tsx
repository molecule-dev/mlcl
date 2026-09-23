import { useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, BRAND_COLOR } from '../branding.js'
import { EndpointCard, type EndpointCardData } from '../components/EndpointCard.js'
import { MetricStatCard } from '../components/MetricStatCard.js'
import type { DeliveryStatus } from '../components/StatusPill.js'
import { useApi } from '../lib/useApi.js'

interface ApiWebhook {
  id: string
  user_id: string
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
  updated_at: string | null
  created_at: string
}

const FILTERS_BASE = ['all', 'live', 'retrying', 'failed', 'paused'] as const
type FilterKey = (typeof FILTERS_BASE)[number]

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

export function Endpoints() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [filter, setFilter] = useState<FilterKey>('all')
  const [query, setQuery] = useState('')

  const { data, loading, error } = useApi<ApiWebhook[]>('/webhooks?limit=200')
  const endpoints: EndpointCardData[] = useMemo(() => (data ?? []).map(adapt), [data])

  const filtered = endpoints.filter((endpoint) => {
    if (filter !== 'all' && endpoint.status !== filter) return false
    if (query.trim()) {
      const q = query.toLowerCase()
      return (
        endpoint.url.toLowerCase().includes(q) ||
        (endpoint.description ?? '').toLowerCase().includes(q) ||
        endpoint.events.some((e) => e.toLowerCase().includes(q))
      )
    }
    return true
  })

  // No forced "0.0K" at zero — plain counts render as plain numbers.
  const fmtDeliveries = (n: number): string =>
    n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : String(n)
  const totalDeliveries = endpoints.reduce((s, e) => s + e.deliveries_24h, 0)
  const totalFailures = endpoints.reduce((s, e) => s + e.failures_24h, 0)
  const successRate = totalDeliveries === 0 ? 1 : 1 - totalFailures / totalDeliveries
  const liveCount = endpoints.filter((e) => e.status === 'live').length

  const filters = FILTERS_BASE.map((key) => ({
    key,
    defaultLabel: key.charAt(0).toUpperCase() + key.slice(1),
    count: key === 'all' ? endpoints.length : endpoints.filter((e) => e.status === key).length,
  }))

  return (
    <div
      className={cm.cn(cm.sp('p', 6), 'max-w-7xl mx-auto')}
      style={{ color: 'var(--mol-color-text)' }}
    >
      <div className={cm.cn('flex items-end justify-between gap-4 flex-wrap mb-6')}>
        <div>
          <p
            className={cm.cn('font-mono text-xs font-bold uppercase tracking-widest mb-2')}
            style={{ color: BRAND_COLOR }}
          >
            {t('endpoints.eyebrow', {}, { defaultValue: 'endpoints · workspace' })}
          </p>
          <h1
            className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight')}
            style={{ color: 'var(--mol-color-text)' }}
          >
            {t('endpoints.heading', {}, { defaultValue: 'Endpoints' })}
          </h1>
          <p
            className={cm.cn('mt-2 text-sm max-w-xl')}
            style={{ color: 'var(--mol-color-text-secondary)' }}
          >
            {t(
              'endpoints.body',
              { app: APP_NAME },
              {
                defaultValue:
                  'Every URL {{app}} delivers to. Inspect health, replay failures, rotate secrets — without paging your platform team.',
              },
            )}
          </p>
        </div>
        <Link
          to="/endpoints/new"
          className={cm.cn(
            'inline-flex items-center gap-2 px-5 py-2.5 font-mono font-semibold text-sm rounded-md transition-all hover:opacity-90 shadow-lg',
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
          {t('endpoints.newEndpoint', {}, { defaultValue: 'New endpoint' })}
        </Link>
      </div>

      <div className={cm.cn('grid gap-4 mb-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}>
        <MetricStatCard
          eyebrow={t('endpoints.metric.total', {}, { defaultValue: 'Total endpoints' })}
          value={String(endpoints.length)}
          caption={t(
            'endpoints.metric.totalCaption',
            { count: liveCount },
            { defaultValue: '{{count}} live' },
          )}
          tone="primary"
          icon="cloud_sync"
        />
        <MetricStatCard
          eyebrow={t('endpoints.metric.delivered', {}, { defaultValue: 'Delivered 24h' })}
          value={fmtDeliveries(totalDeliveries)}
          caption={t(
            'endpoints.metric.deliveredCaption',
            {},
            { defaultValue: 'across all endpoints' },
          )}
          tone="success"
          icon="task_alt"
        />
        <MetricStatCard
          eyebrow={t('endpoints.metric.success', {}, { defaultValue: 'Success rate' })}
          value={(successRate * 100).toFixed(2)}
          unit="%"
          caption={t(
            'endpoints.metric.successCaption',
            { count: totalFailures },
            { defaultValue: '{{count}} failures pending retry' },
          )}
          tone={successRate >= 0.99 ? 'success' : successRate >= 0.95 ? 'warning' : 'error'}
          icon="trending_up"
        />
        <MetricStatCard
          eyebrow={t('endpoints.metric.flapping', {}, { defaultValue: 'Flapping' })}
          value={String(endpoints.filter((e) => e.status === 'failed').length)}
          caption={t(
            'endpoints.metric.flappingCaption',
            {},
            { defaultValue: 'investigate immediately' },
          )}
          tone="error"
          icon="error"
        />
      </div>

      <div
        className={cm.cn('rounded-xl p-4 mb-5 flex items-center gap-3 flex-wrap')}
        style={{
          backgroundColor: 'var(--mol-color-surface)',
          border: '1px solid var(--mol-color-border)',
        }}
      >
        <div className={cm.cn('flex items-center gap-1 flex-wrap')}>
          {filters.map((f) => {
            const active = filter === f.key
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={cm.cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-mono text-[11px] font-bold uppercase tracking-widest transition-colors',
                )}
                style={{
                  backgroundColor: active
                    ? 'color-mix(in srgb, var(--mol-color-primary) 15%, transparent)'
                    : 'transparent',
                  color: active ? 'var(--mol-color-primary)' : 'var(--mol-color-text-secondary)',
                  boxShadow: active
                    ? 'inset 0 0 0 1px color-mix(in srgb, var(--mol-color-primary) 35%, transparent)'
                    : undefined,
                }}
              >
                {t(`endpoints.filter.${f.key}`, {}, { defaultValue: f.defaultLabel })}
                <span
                  className={cm.cn(
                    'inline-flex items-center justify-center px-1 rounded text-[10px]',
                  )}
                  style={{
                    backgroundColor:
                      'color-mix(in srgb, var(--mol-color-background) 60%, transparent)',
                    color: 'var(--mol-color-text-secondary)',
                  }}
                >
                  {f.count}
                </span>
              </button>
            )
          })}
        </div>
        <div
          className={cm.cn(
            'flex-1 min-w-[200px] flex items-center gap-2 px-3 py-1.5 rounded-md focus-within:outline focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-[var(--mol-color-primary)]',
          )}
          style={{
            backgroundColor: 'color-mix(in srgb, var(--mol-color-background) 70%, transparent)',
            border: '1px solid var(--mol-color-border)',
          }}
        >
          <span
            className={cm.cn('material-symbols-outlined text-base')}
            style={{ color: 'var(--mol-color-text-secondary)' }}
            aria-hidden="true"
          >
            search
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(
              'endpoints.searchPlaceholder',
              {},
              { defaultValue: 'Search by URL, description, or event…' },
            )}
            className={cm.cn('flex-1 bg-transparent border-none outline-none text-sm font-mono')}
            style={{ color: 'var(--mol-color-text)' }}
            aria-label={t('endpoints.searchAria', {}, { defaultValue: 'Search endpoints' })}
          />
        </div>
      </div>

      {error ? (
        <div
          className={cm.cn('rounded-xl px-8 py-12 text-center')}
          style={{
            backgroundColor: 'color-mix(in srgb, var(--mol-color-error) 6%, transparent)',
            border: '1px solid color-mix(in srgb, var(--mol-color-error) 30%, transparent)',
          }}
        >
          <p
            className={cm.cn('font-mono text-sm font-bold')}
            style={{ color: 'var(--mol-color-error)' }}
          >
            {t('endpoints.error', {}, { defaultValue: 'Failed to load endpoints.' })}
          </p>
          <p
            className={cm.cn('mt-1 text-xs font-mono')}
            style={{ color: 'var(--mol-color-error)' }}
          >
            {error}
          </p>
        </div>
      ) : loading ? (
        <div
          className={cm.cn('rounded-xl px-8 py-16 text-center')}
          style={{
            backgroundColor: 'color-mix(in srgb, var(--mol-color-surface) 40%, transparent)',
            border: '1px dashed var(--mol-color-border)',
          }}
        >
          <span
            className={cm.cn('material-symbols-outlined text-4xl mb-3 inline-block animate-spin')}
            style={{ color: 'var(--mol-color-text-tertiary)' }}
            aria-hidden="true"
          >
            sync
          </span>
          <p
            className={cm.cn('font-mono text-sm')}
            style={{ color: 'var(--mol-color-text-secondary)' }}
          >
            {t('endpoints.loading', {}, { defaultValue: 'Loading endpoints…' })}
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div
          className={cm.cn('rounded-xl px-8 py-16 text-center')}
          style={{
            backgroundColor: 'color-mix(in srgb, var(--mol-color-surface) 40%, transparent)',
            border: '1px dashed var(--mol-color-border)',
          }}
        >
          <span
            className={cm.cn('material-symbols-outlined text-4xl mb-3 inline-block')}
            style={{ color: 'var(--mol-color-text-tertiary)' }}
            aria-hidden="true"
          >
            cloud_off
          </span>
          <p
            className={cm.cn('font-mono text-sm font-bold')}
            style={{ color: 'var(--mol-color-text-secondary)' }}
          >
            {endpoints.length === 0
              ? t(
                  'endpoints.emptyAll',
                  {},
                  { defaultValue: "You haven't created any endpoints yet." },
                )
              : t('endpoints.empty', {}, { defaultValue: 'No endpoints match these filters.' })}
          </p>
          <p className={cm.cn('mt-1 text-xs')} style={{ color: 'var(--mol-color-text-tertiary)' }}>
            {endpoints.length === 0
              ? t(
                  'endpoints.emptyAllHint',
                  {},
                  { defaultValue: 'Click "New endpoint" to register your first webhook URL.' },
                )
              : t(
                  'endpoints.emptyHint',
                  {},
                  { defaultValue: 'Adjust the filters above or create a new endpoint.' },
                )}
          </p>
        </div>
      ) : (
        <div className={cm.cn('flex flex-col gap-3')}>
          {filtered.map((endpoint) => (
            <EndpointCard key={endpoint.id} endpoint={endpoint} />
          ))}
        </div>
      )}
    </div>
  )
}
