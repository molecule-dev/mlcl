import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { MetricStatCard } from '../components/MetricStatCard.js'
import { RequestRow, type RequestRowData } from '../components/RequestRow.js'
import { type PylonStatus, statusFromCode } from '../components/StatusPill.js'

type Bucket = 'all' | 'success' | 'redirect' | 'clientError' | 'serverError'

const VALID_BUCKETS: Bucket[] = ['all', 'success', 'redirect', 'clientError', 'serverError']

function bucketFromHash(hash: string): Bucket {
  const c = hash.replace(/^#/, '') as Bucket
  return VALID_BUCKETS.includes(c) ? c : 'all'
}

interface HistoryRow {
  id: string
  method?: string
  url?: string
  status_code?: number
  response_body?: string
  response_headers?: string
  duration_ms?: number
  created_at?: string
  error?: string | null
}

function statusTextFromCode(code: number): string {
  if (code >= 500) return 'Server Error'
  if (code >= 400) return 'Client Error'
  if (code >= 300) return 'Redirect'
  if (code >= 200) return 'OK'
  if (code === 0) return 'Failed'
  return ''
}

function bucketize(rows: RequestRowData[]): Record<PylonStatus, number> {
  const bucket: Partial<Record<PylonStatus, number>> = {}
  for (const r of rows) {
    const family = statusFromCode(r.status_code)
    bucket[family] = (bucket[family] ?? 0) + 1
  }
  return bucket as Record<PylonStatus, number>
}

const FILTERS: { key: Bucket; defaultLabel: string }[] = [
  { key: 'all', defaultLabel: 'All' },
  { key: 'success', defaultLabel: '2xx' },
  { key: 'redirect', defaultLabel: '3xx' },
  { key: 'clientError', defaultLabel: '4xx' },
  { key: 'serverError', defaultLabel: '5xx' },
]

function toRequestRow(r: HistoryRow): RequestRowData {
  const code = r.status_code ?? 0
  return {
    id: r.id,
    method: (r.method ?? 'GET') as RequestRowData['method'],
    url: r.url ?? '',
    status_code: code,
    status_text: statusTextFromCode(code),
    duration_ms: r.duration_ms ?? 0,
    size_bytes: r.response_body ? r.response_body.length : 0,
    ran_at: r.created_at ?? new Date().toISOString(),
  }
}

export function History() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const location = useLocation()
  const navigate = useNavigate()
  const filter = bucketFromHash(location.hash)
  const setFilter = (bucket: Bucket) => {
    navigate(`${location.pathname}#${bucket}`, { replace: false })
  }
  const [rows, setRows] = useState<RequestRowData[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get<HistoryRow[]>('/api/history?limit=50')
      .then((res) => {
        if (cancelled) return
        const arr = Array.isArray(res.data) ? res.data : []
        setRows(arr.map(toRequestRow))
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(
          e instanceof Error
            ? e.message
            : t('history.fetchError', {}, { defaultValue: 'Could not load history.' }),
        )
        setRows([])
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const counts = useMemo(() => bucketize(rows ?? []), [rows])
  const visible = useMemo(
    () =>
      filter === 'all'
        ? (rows ?? [])
        : (rows ?? []).filter((r) => statusFromCode(r.status_code) === filter),
    [filter, rows],
  )
  const avgLatency =
    rows && rows.length > 0
      ? Math.round(rows.reduce((acc, r) => acc + r.duration_ms, 0) / rows.length)
      : 0

  return (
    <div className={cm.cn('p-6')}>
      <header className={cm.cn('flex items-start justify-between gap-6 flex-wrap mb-6')}>
        <div>
          <p
            className={cm.cn('font-mono text-xs font-bold uppercase tracking-widest mb-2')}
            style={{ color: 'var(--color-primary)' }}
          >
            {t('history.eyebrow', {}, { defaultValue: '$ pylon history --tail' })}
          </p>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('history.heading', {}, { defaultValue: 'Run history' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'history.subheading',
              {},
              {
                defaultValue:
                  'Every request fired in this workspace, with status, latency, and payload size.',
              },
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
              backgroundColor: 'var(--color-primary)',
              boxShadow: '0 0 0 3px color-mix(in srgb, var(--color-primary) 30%, transparent)',
            }}
            aria-hidden="true"
          />
          <span
            className={cm.cn('font-mono text-[11px] font-extrabold uppercase tracking-widest')}
            style={{ color: 'var(--color-primary)' }}
          >
            {t('history.realtime', {}, { defaultValue: 'realtime' })}
          </span>
        </div>
      </header>

      <section className={cm.cn('grid gap-4 grid-cols-2 md:grid-cols-4 mb-6')}>
        <MetricStatCard
          eyebrow={t('history.metric.total', {}, { defaultValue: 'Last 50' })}
          value={String(rows?.length ?? 0)}
          icon="history"
          tone="primary"
        />
        <MetricStatCard
          eyebrow={t('history.metric.success', {}, { defaultValue: '2xx' })}
          value={String(counts.success ?? 0)}
          icon="check_circle"
          tone="success"
        />
        <MetricStatCard
          eyebrow={t('history.metric.errors', {}, { defaultValue: '4xx + 5xx' })}
          value={String((counts.clientError ?? 0) + (counts.serverError ?? 0))}
          icon="error"
          tone={(counts.clientError ?? 0) + (counts.serverError ?? 0) > 0 ? 'warning' : 'neutral'}
        />
        <MetricStatCard
          eyebrow={t('history.metric.avgLatency', {}, { defaultValue: 'Avg latency' })}
          value={String(avgLatency)}
          unit="ms"
          icon="speed"
          tone={avgLatency < 200 ? 'success' : avgLatency < 500 ? 'warning' : 'error'}
          sparkline={(rows ?? []).map((r) => r.duration_ms).reverse()}
        />
      </section>

      <div className={cm.cn('flex flex-wrap items-center gap-2 mb-4')}>
        {FILTERS.map((f) => {
          const active = filter === f.key
          const count = f.key === 'all' ? (rows?.length ?? 0) : (counts[f.key as PylonStatus] ?? 0)
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cm.cn(
                'inline-flex items-center gap-2 px-3 py-1.5 rounded-full font-mono text-xs font-bold uppercase tracking-widest transition-colors',
              )}
              style={{
                backgroundColor: active
                  ? 'color-mix(in srgb, var(--color-primary) 20%, transparent)'
                  : 'color-mix(in srgb, var(--color-surface-elevated) 60%, transparent)',
                color: active ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                border: `1px solid ${active ? 'color-mix(in srgb, var(--color-primary) 40%, transparent)' : 'var(--color-border)'}`,
              }}
              data-mol-id={`history-filter-${f.key}`}
            >
              {t(`history.filter.${f.key}`, {}, { defaultValue: f.defaultLabel })}
              <span className={cm.cn('opacity-70')}>{count}</span>
            </button>
          )
        })}
      </div>

      {rows === null ? (
        <p
          className={cm.cn('text-sm py-8 text-center')}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {t('history.loading', {}, { defaultValue: 'Loading history…' })}
        </p>
      ) : error ? (
        <p className={cm.cn('text-sm py-8 text-center')} style={{ color: 'var(--color-error)' }}>
          {error}
        </p>
      ) : visible.length === 0 ? (
        <div
          className={cm.cn('py-16 text-center')}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <span
            className={cm.cn('material-symbols-outlined text-5xl opacity-40 mb-3 inline-block')}
            aria-hidden="true"
          >
            history_toggle_off
          </span>
          <p className={cm.cn('text-sm')}>
            {t(
              'history.empty',
              {},
              {
                defaultValue: 'Nothing here yet — fire your first request from the Workspace tab.',
              },
            )}
          </p>
        </div>
      ) : (
        <ul className={cm.cn('space-y-2.5')}>
          {visible.map((req) => (
            <li key={req.id}>
              <RequestRow request={req} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
