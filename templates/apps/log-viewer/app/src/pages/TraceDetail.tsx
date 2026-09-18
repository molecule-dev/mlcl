import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BRAND_COLOR } from '../branding.js'
import { type LogLine, LogLineRow } from '../components/LogLineRow.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

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

interface SampleSpan {
  name: string
  service: string
  duration_ms: number
  start_offset_ms: number
  status: 'ok' | 'warning' | 'error'
}

const SAMPLE_SPANS: SampleSpan[] = [
  {
    name: 'POST /v1/checkout',
    service: 'api-gateway',
    duration_ms: 3122,
    start_offset_ms: 0,
    status: 'error',
  },
  {
    name: 'auth.session.verify',
    service: 'auth-service',
    duration_ms: 18,
    start_offset_ms: 12,
    status: 'ok',
  },
  { name: 'cart.read', service: 'checkout', duration_ms: 42, start_offset_ms: 36, status: 'ok' },
  {
    name: 'pricing.calculate',
    service: 'checkout',
    duration_ms: 88,
    start_offset_ms: 80,
    status: 'ok',
  },
  {
    name: 'inventory.reserve',
    service: 'checkout',
    duration_ms: 124,
    start_offset_ms: 170,
    status: 'warning',
  },
  {
    name: 'stripe.charges.create',
    service: 'checkout',
    duration_ms: 3001,
    start_offset_ms: 295,
    status: 'error',
  },
  {
    name: 'fraud.score',
    service: 'auth-service',
    duration_ms: 86,
    start_offset_ms: 295,
    status: 'ok',
  },
  {
    name: 'session.update',
    service: 'auth-service',
    duration_ms: 22,
    start_offset_ms: 3210,
    status: 'ok',
  },
  {
    name: 'metrics.emit',
    service: 'data-pipeline',
    duration_ms: 8,
    start_offset_ms: 3232,
    status: 'ok',
  },
]

const STATUS_ACCENT: Record<TraceSummary['status'], string> = {
  ok: 'var(--color-success)',
  warning: 'var(--color-severity-warn)',
  error: 'var(--color-severity-fatal)',
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

export function TraceDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const [trace, setTrace] = useState<TraceSummary | null>(null)
  const [logs, setLogs] = useState<LogLine[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([http.get(`/api/traces/${id}`), http.get('/api/logs')])
      .then(([traceRes, logsRes]) => {
        if (cancelled) return
        setTrace(unwrapSingle<TraceSummary>(traceRes))
        const all = unwrapList<LogLine>(logsRes)
        setLogs(all.filter((l) => l.trace_id === id))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('traceDetail.loadError', {}, { defaultValue: 'Failed to load trace.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, http, t])

  const totalMs =
    trace?.duration_ms ?? Math.max(...SAMPLE_SPANS.map((s) => s.start_offset_ms + s.duration_ms))
  const accent = trace ? STATUS_ACCENT[trace.status] : 'var(--color-primary)'

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
      <Link
        to="/traces"
        className={cm.cn(
          'inline-flex items-center gap-1 text-xs font-mono uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors',
        )}
      >
        <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
          arrow_back
        </span>
        {t('traceDetail.back', {}, { defaultValue: 'All traces' })}
      </Link>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), 'text-on-surface-variant')}>
          {t('traceDetail.loading', {}, { defaultValue: 'Loading trace…' })}
        </p>
      ) : !trace ? (
        <p className={cm.cn(cm.sp('py', 16), 'text-on-surface-variant')}>
          {t('traceDetail.notFound', {}, { defaultValue: 'Trace not found.' })}
        </p>
      ) : (
        <>
          {/* Hero */}
          <header
            className={cm.cn('relative overflow-hidden rounded-[1.5rem] mt-4 p-6 md:p-8')}
            style={{
              backgroundImage: `linear-gradient(135deg, color-mix(in srgb, ${accent} 20%, transparent), color-mix(in srgb, var(--color-accent) 15%, transparent))`,
              backgroundColor: 'var(--color-background-tertiary)',
              border: '1px solid var(--color-border)',
            }}
            data-mol-id="trace-detail-hero"
          >
            <div
              className={cm.cn(
                'absolute -right-16 -bottom-20 h-56 w-56 rounded-full blur-3xl pointer-events-none',
              )}
              style={{ backgroundColor: `color-mix(in srgb, ${accent} 33%, transparent)` }}
              aria-hidden="true"
            />
            <div className={cm.cn('relative')}>
              <p
                className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest')}
                style={{ color: accent }}
              >
                {t('traceDetail.eyebrow', { id: trace.id }, { defaultValue: 'trace · {{id}}' })}
              </p>
              <h1
                className={cm.cn(
                  'mt-2 font-mono text-3xl md:text-4xl font-extrabold tracking-tighter text-on-surface',
                )}
              >
                {trace.operation}
              </h1>
              <p
                className={cm.cn('mt-1 font-mono text-sm font-semibold')}
                style={{ color: 'var(--color-accent)' }}
              >
                {trace.root_service}
              </p>

              <div className={cm.cn('mt-5 flex flex-wrap items-center gap-x-6 gap-y-3')}>
                <div>
                  <p
                    className={cm.cn(
                      'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('form.duration', {}, { defaultValue: 'Duration' })}
                  </p>
                  <p className={cm.cn('mt-0.5 font-mono text-2xl font-extrabold text-on-surface')}>
                    {fmtDur(trace.duration_ms)}
                  </p>
                </div>
                <div>
                  <p
                    className={cm.cn(
                      'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('traceDetail.spans', {}, { defaultValue: 'Spans' })}
                  </p>
                  <p className={cm.cn('mt-0.5 font-mono text-2xl font-extrabold text-on-surface')}>
                    {trace.span_count}
                  </p>
                </div>
                <div>
                  <p
                    className={cm.cn(
                      'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('traceDetail.errors', {}, { defaultValue: 'Errors' })}
                  </p>
                  <p
                    className={cm.cn('mt-0.5 font-mono text-2xl font-extrabold')}
                    style={{
                      color:
                        trace.error_count > 0
                          ? 'var(--color-severity-fatal-light)'
                          : 'var(--color-success-light)',
                    }}
                  >
                    {trace.error_count}
                  </p>
                </div>
                <div>
                  <p
                    className={cm.cn(
                      'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('traceDetail.started', {}, { defaultValue: 'Started' })}
                  </p>
                  <p className={cm.cn('mt-0.5 font-mono text-sm font-semibold text-on-surface')}>
                    {fmtRelative(trace.started_at)}
                  </p>
                </div>
              </div>
            </div>
          </header>

          {/* Span waterfall */}
          <section className={cm.cn('mt-8')}>
            <h2
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-3',
              )}
            >
              {t('traceDetail.waterfall', {}, { defaultValue: 'Span waterfall' })}
            </h2>
            <ul
              className={cm.cn('rounded-xl overflow-hidden')}
              style={{
                backgroundColor: 'var(--color-surface-container)',
                border: '1px solid var(--color-border)',
              }}
            >
              {SAMPLE_SPANS.map((sp, i) => {
                const startPct = (sp.start_offset_ms / totalMs) * 100
                const widthPct = Math.max(1, (sp.duration_ms / totalMs) * 100)
                const accentColor = STATUS_ACCENT[sp.status]
                return (
                  <li
                    key={i}
                    className={cm.cn(
                      'grid grid-cols-12 gap-3 items-center px-4 py-2 border-b last:border-0',
                    )}
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <span
                      className={cm.cn(
                        'col-span-3 font-mono text-xs font-bold text-on-surface truncate',
                      )}
                    >
                      {sp.name}
                    </span>
                    <span
                      className={cm.cn('col-span-2 font-mono text-[11px]')}
                      style={{ color: 'var(--color-accent)' }}
                    >
                      {sp.service}
                    </span>
                    <span className={cm.cn('col-span-6 relative h-2.5')}>
                      <span
                        className={cm.cn('absolute inset-y-0 rounded')}
                        style={{
                          left: `${startPct}%`,
                          width: `${widthPct}%`,
                          backgroundColor: accentColor,
                          opacity: 0.85,
                        }}
                        aria-hidden="true"
                      />
                    </span>
                    <span
                      className={cm.cn(
                        'col-span-1 text-right font-mono text-[11px] font-bold text-on-surface',
                      )}
                    >
                      {fmtDur(sp.duration_ms)}
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>

          {/* Linked logs */}
          {logs.length > 0 ? (
            <section className={cm.cn('mt-8')}>
              <h2
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-3',
                )}
              >
                {t(
                  'traceDetail.linkedLogs',
                  { count: logs.length },
                  { defaultValue: 'Linked log lines · {{count}}' },
                )}
              </h2>
              <div
                className={cm.cn('rounded-xl overflow-hidden')}
                style={{
                  backgroundColor: 'var(--color-background)',
                  border: '1px solid var(--color-border)',
                }}
              >
                {logs.map((line) => (
                  <LogLineRow key={line.id} line={line} />
                ))}
              </div>
            </section>
          ) : (
            <p className={cm.cn('mt-8 text-sm text-on-surface-variant')}>
              {t('traceDetail.noLogs', {}, { defaultValue: 'No log lines link to this trace.' })}{' '}
              <Link
                to="/search"
                className={cm.cn('font-bold hover:underline')}
                style={{ color: BRAND_COLOR }}
              >
                {t('traceDetail.searchAll', {}, { defaultValue: 'Open log search →' })}
              </Link>
            </p>
          )}
        </>
      )}
    </div>
  )
}
