import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, BRAND_COLOR } from '../branding.js'
import { DeliveryRow, type DeliveryRowData } from '../components/DeliveryRow.js'
import { MetricStatCard } from '../components/MetricStatCard.js'
import { useApi } from '../lib/useApi.js'

const PANEL_BG = 'var(--mol-color-surface)'
const PANEL_BORDER = 'var(--mol-color-border)'

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

const FILTERS = [
  { key: 'all', defaultLabel: 'All', match: () => true },
  {
    key: '2xx',
    defaultLabel: '2xx',
    match: (d: ApiDelivery) => d.status_code >= 200 && d.status_code < 300,
  },
  {
    key: '4xx',
    defaultLabel: '4xx',
    match: (d: ApiDelivery) => d.status_code >= 400 && d.status_code < 500,
  },
  {
    key: '5xx',
    defaultLabel: '5xx',
    match: (d: ApiDelivery) => d.status_code >= 500,
  },
  {
    key: 'retried',
    defaultLabel: 'Retried',
    match: (d: ApiDelivery) => (d.retry_count ?? 0) > 0,
  },
] as const

type FilterKey = (typeof FILTERS)[number]['key']

const adapt = (d: ApiDelivery): DeliveryRowData => ({
  id: d.id,
  method: (d.method as 'POST') ?? 'POST',
  url: d.url,
  status_code: d.status_code,
  status_text: d.status_text,
  duration_ms: d.duration_ms,
  event_type: d.event_type,
  retry_count: d.retry_count,
  delivered_at: d.delivered_at ?? d.created_at,
})

export function Deliveries() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [filter, setFilter] = useState<FilterKey>('all')
  const [query, setQuery] = useState('')
  const [params] = useSearchParams()
  const webhookFilter = params.get('webhook')

  const path = webhookFilter
    ? `/deliveries?webhook_id=${webhookFilter}&limit=500`
    : '/deliveries?limit=500'
  const { data, loading, error } = useApi<ApiDelivery[]>(path)
  const deliveries = useMemo(() => data ?? [], [data])
  const matcher = FILTERS.find((f) => f.key === filter)?.match ?? (() => true)
  const filtered = deliveries
    .filter((d) => matcher(d))
    .filter((d) => {
      if (!query.trim()) return true
      const q = query.toLowerCase()
      return (
        (d.url ?? '').toLowerCase().includes(q) ||
        (d.event_type ?? '').toLowerCase().includes(q) ||
        d.id.toLowerCase().includes(q)
      )
    })

  const totals = useMemo(() => {
    const t2xx = deliveries.filter((d) => d.status_code >= 200 && d.status_code < 300).length
    const t4xx = deliveries.filter((d) => d.status_code >= 400 && d.status_code < 500).length
    const t5xx = deliveries.filter((d) => d.status_code >= 500).length
    const tRetried = deliveries.filter((d) => (d.retry_count ?? 0) > 0).length
    return { t2xx, t4xx, t5xx, tRetried, total: deliveries.length }
  }, [deliveries])

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
            {t('deliveries.eyebrow', {}, { defaultValue: 'log · live tail' })}
          </p>
          <h1
            className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight')}
            style={{ color: 'var(--mol-color-text)' }}
          >
            {t('deliveries.heading', {}, { defaultValue: 'Deliveries' })}
          </h1>
          <p
            className={cm.cn('mt-2 text-sm max-w-xl')}
            style={{ color: 'var(--mol-color-text-secondary)' }}
          >
            {webhookFilter
              ? t(
                  'deliveries.bodyFiltered',
                  {},
                  { defaultValue: 'Filtered to deliveries for a single endpoint.' },
                )
              : t(
                  'deliveries.body',
                  { app: APP_NAME },
                  {
                    defaultValue:
                      'Every payload {{app}} has dispatched. Filter by status family, retry attempts, or event — replay or inspect any row.',
                  },
                )}
          </p>
        </div>
      </div>

      <div className={cm.cn('grid gap-4 mb-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}>
        <MetricStatCard
          eyebrow={t('deliveries.metric.total', {}, { defaultValue: 'Total · 24h' })}
          value={String(totals.total)}
          tone="primary"
          icon="send"
        />
        <MetricStatCard
          eyebrow={t('deliveries.metric.delivered', {}, { defaultValue: 'Delivered (2xx)' })}
          value={String(totals.t2xx)}
          tone="success"
          icon="task_alt"
        />
        <MetricStatCard
          eyebrow={t('deliveries.metric.retried', {}, { defaultValue: 'Retried' })}
          value={String(totals.tRetried)}
          tone="warning"
          icon="autorenew"
        />
        <MetricStatCard
          eyebrow={t('deliveries.metric.failed', {}, { defaultValue: 'Failed (5xx)' })}
          value={String(totals.t5xx)}
          tone={totals.t5xx > 0 ? 'error' : 'success'}
          icon="error"
        />
      </div>

      <div
        className={cm.cn('rounded-xl p-4 mb-5 flex items-center gap-3 flex-wrap')}
        style={{ backgroundColor: PANEL_BG, border: `1px solid ${PANEL_BORDER}` }}
      >
        <div className={cm.cn('flex items-center gap-1 flex-wrap')}>
          {FILTERS.map((f) => {
            const active = filter === f.key
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={cm.cn(
                  'inline-flex items-center px-3 py-1.5 rounded-md font-mono text-[11px] font-bold uppercase tracking-widest transition-colors',
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
                {t(`deliveries.filter.${f.key}`, {}, { defaultValue: f.defaultLabel })}
              </button>
            )
          })}
        </div>
        <div
          className={cm.cn('flex-1 min-w-[200px] flex items-center gap-2 px-3 py-1.5 rounded-md')}
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
              'deliveries.searchPlaceholder',
              {},
              { defaultValue: 'Search by URL, event, or delivery id…' },
            )}
            className={cm.cn('flex-1 bg-transparent border-none outline-none text-sm font-mono')}
            style={{ color: 'var(--mol-color-text)' }}
            aria-label={t('deliveries.searchAria', {}, { defaultValue: 'Search deliveries' })}
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
            {t('deliveries.error', {}, { defaultValue: 'Failed to load deliveries.' })}
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
          className={cm.cn('rounded-xl px-8 py-12 text-center')}
          style={{
            backgroundColor: 'color-mix(in srgb, var(--mol-color-surface) 40%, transparent)',
            border: '1px dashed var(--mol-color-border)',
          }}
        >
          <p
            className={cm.cn('font-mono text-sm')}
            style={{ color: 'var(--mol-color-text-secondary)' }}
          >
            {t('deliveries.loading', {}, { defaultValue: 'Loading deliveries…' })}
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
            inbox
          </span>
          <p
            className={cm.cn('font-mono text-sm font-bold')}
            style={{ color: 'var(--mol-color-text-secondary)' }}
          >
            {deliveries.length === 0
              ? t(
                  'deliveries.emptyAll',
                  {},
                  {
                    defaultValue:
                      'No deliveries yet — fire a test from any endpoint to see one here.',
                  },
                )
              : t('deliveries.empty', {}, { defaultValue: 'No deliveries match this filter.' })}
          </p>
        </div>
      ) : (
        <div className={cm.cn('flex flex-col gap-2')}>
          {filtered.map((d) => (
            <DeliveryRow key={d.id} delivery={adapt(d)} to={`/deliveries/${d.id}`} />
          ))}
        </div>
      )}
    </div>
  )
}
