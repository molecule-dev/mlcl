import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BRAND_COLOR } from '../branding.js'
import { MetricStatCard } from '../components/MetricStatCard.js'
import { unwrapList } from '../lib/unwrap.js'

interface TraceSummary {
  id: string
  root_service: string
  operation: string
  duration_ms: number
  status: 'ok' | 'warning' | 'error'
  started_at: string
  span_count: number
  error_count: number
}

const STATUS_TINT: Record<
  TraceSummary['status'],
  { bg: string; text: string; defaultLabel: string }
> = {
  ok: {
    bg: 'color-mix(in srgb, var(--color-success) 16%, transparent)',
    text: 'var(--color-success-light)',
    defaultLabel: 'OK',
  },
  warning: {
    bg: 'color-mix(in srgb, var(--color-severity-warn) 16%, transparent)',
    text: 'var(--color-severity-warn-light)',
    defaultLabel: 'Slow',
  },
  error: {
    bg: 'color-mix(in srgb, var(--color-severity-fatal) 16%, transparent)',
    text: 'var(--color-severity-fatal-light)',
    defaultLabel: 'Error',
  },
}

function fmtRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function fmtDur(ms: number): string {
  if (ms < 1) return '< 1ms'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

export function Traces() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [traces, setTraces] = useState<TraceSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/traces')
      .then((res) => {
        if (!cancelled) setTraces(unwrapList<TraceSummary>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('traces.loadError', {}, { defaultValue: 'Failed to load traces.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const counts = useMemo(() => {
    return traces.reduce(
      (acc, tr) => {
        acc.total += 1
        if (tr.status === 'error') acc.errors += 1
        else if (tr.status === 'warning') acc.slow += 1
        acc.totalSpans += tr.span_count
        return acc
      },
      { total: 0, errors: 0, slow: 0, totalSpans: 0 },
    )
  }, [traces])

  const p95 =
    traces.length === 0
      ? 0
      : Math.round(
          traces.map((t) => t.duration_ms).sort((a, b) => a - b)[
            Math.floor(traces.length * 0.95)
          ] || 0,
        )

  const maxDuration = Math.max(1, ...traces.map((t) => t.duration_ms))

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
      <header className={cm.cn('mb-8')}>
        <p
          className={cm.cn('font-mono text-xs font-bold uppercase tracking-widest mb-2')}
          style={{ color: BRAND_COLOR }}
        >
          {t('traces.eyebrow', {}, { defaultValue: '$ signalink traces --window=15m' })}
        </p>
        <h1
          className={cm.cn(
            cm.textSize('3xl'),
            cm.fontWeight('bold'),
            'tracking-tight text-on-surface',
          )}
        >
          {t('traces.heading', {}, { defaultValue: 'Distributed traces' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'traces.subheading',
            {},
            {
              defaultValue:
                'Recent root spans across services. Click any row to open the waterfall.',
            },
          )}
        </p>
      </header>

      <section className={cm.cn('grid gap-4 grid-cols-2 md:grid-cols-4 mb-8')}>
        <MetricStatCard
          eyebrow={t('traces.metric.total', {}, { defaultValue: 'Traces' })}
          value={counts.total.toLocaleString()}
          icon="timeline"
          tone="primary"
          caption={t('traces.metric.totalCaption', {}, { defaultValue: 'in window' })}
        />
        <MetricStatCard
          eyebrow={t('traces.metric.spans', {}, { defaultValue: 'Spans' })}
          value={counts.totalSpans.toLocaleString()}
          icon="hub"
          tone="accent"
          caption={t('traces.metric.spansCaption', {}, { defaultValue: 'rolled-up' })}
        />
        <MetricStatCard
          eyebrow={t('traces.metric.errors', {}, { defaultValue: 'Errored' })}
          value={String(counts.errors)}
          icon="error"
          tone="error"
          caption={t('traces.metric.errorsCaption', {}, { defaultValue: 'with error spans' })}
        />
        <MetricStatCard
          eyebrow={t('traces.metric.p95', {}, { defaultValue: 'p95 duration' })}
          value={p95 > 1000 ? (p95 / 1000).toFixed(2) : String(p95)}
          unit={p95 > 1000 ? 's' : 'ms'}
          icon="speed"
          tone="warning"
          caption={t('traces.metric.p95Caption', {}, { defaultValue: 'tail latency' })}
        />
      </section>

      <div
        className={cm.cn('rounded-xl overflow-hidden')}
        style={{
          backgroundColor: 'var(--color-surface-container)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div
          className={cm.cn(
            'grid grid-cols-12 gap-4 px-5 py-3 font-mono text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
          )}
          style={{
            backgroundColor: 'var(--color-background-tertiary)',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <span className={cm.cn('col-span-3')}>
            {t('traces.col.trace', {}, { defaultValue: 'Trace ID' })}
          </span>
          <span className={cm.cn('col-span-3')}>
            {t('traces.col.operation', {}, { defaultValue: 'Operation' })}
          </span>
          <span className={cm.cn('col-span-2')}>
            {t('traces.col.service', {}, { defaultValue: 'Root service' })}
          </span>
          <span className={cm.cn('col-span-1 text-right')}>
            {t('traces.col.spans', {}, { defaultValue: 'Spans' })}
          </span>
          <span className={cm.cn('col-span-2')}>
            {t('form.duration', {}, { defaultValue: 'Duration' })}
          </span>
          <span className={cm.cn('col-span-1 text-right')}>
            {t('traces.col.started', {}, { defaultValue: 'Started' })}
          </span>
        </div>

        {error ? (
          <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
        ) : loading ? (
          <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
            {t('traces.loading', {}, { defaultValue: 'Loading traces…' })}
          </p>
        ) : traces.length === 0 ? (
          <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
            {t('traces.empty', {}, { defaultValue: 'No traces in this window.' })}
          </p>
        ) : (
          <ul className={cm.cn('divide-y divide-[var(--color-border)]')}>
            {traces.map((tr) => {
              const widthPct = Math.max(8, (tr.duration_ms / maxDuration) * 100)
              const tint = STATUS_TINT[tr.status]
              return (
                <li key={tr.id}>
                  <Link
                    to={`/traces/${tr.id}`}
                    className={cm.cn(
                      'grid grid-cols-12 gap-4 px-5 py-3 items-center transition-colors hover:bg-surface-container',
                    )}
                  >
                    <span
                      className={cm.cn(
                        'col-span-3 font-mono text-xs font-bold text-on-surface truncate',
                      )}
                    >
                      {tr.id}
                    </span>
                    <span
                      className={cm.cn('col-span-3 font-mono text-xs text-on-surface truncate')}
                    >
                      {tr.operation}
                    </span>
                    <span
                      className={cm.cn('col-span-2 font-mono text-xs')}
                      style={{ color: 'var(--color-accent)' }}
                    >
                      {tr.root_service}
                    </span>
                    <span
                      className={cm.cn(
                        'col-span-1 text-right font-mono text-xs font-bold text-on-surface',
                      )}
                    >
                      {tr.span_count}
                    </span>
                    <span className={cm.cn('col-span-2 flex items-center gap-2')}>
                      <span
                        className={cm.cn('h-1.5 rounded-full')}
                        style={{
                          width: `${widthPct}%`,
                          backgroundColor:
                            tr.status === 'error'
                              ? 'var(--color-severity-fatal)'
                              : tr.status === 'warning'
                                ? 'var(--color-severity-warn)'
                                : 'var(--color-primary)',
                          opacity: 0.85,
                        }}
                        aria-hidden="true"
                      />
                      <span className={cm.cn('font-mono text-[11px] font-bold text-on-surface')}>
                        {fmtDur(tr.duration_ms)}
                      </span>
                    </span>
                    <span className={cm.cn('col-span-1 text-right')}>
                      <span
                        className={cm.cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[10px] font-black uppercase tracking-widest',
                        )}
                        style={{ backgroundColor: tint.bg, color: tint.text }}
                      >
                        {t(`traces.status.${tr.status}`, {}, { defaultValue: tint.defaultLabel })}
                      </span>
                      <p className={cm.cn('mt-1 font-mono text-[10px] text-on-surface-variant')}>
                        {fmtRelative(tr.started_at)}
                      </p>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
