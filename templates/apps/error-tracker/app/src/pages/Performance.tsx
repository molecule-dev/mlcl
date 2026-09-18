import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, BRAND_COLOR } from '../branding.js'
import { FrequencySparkline } from '../components/FrequencySparkline.js'
import { StatsCounterCard } from '../components/StatsCounterCard.js'

interface Summary {
  p50: number
  p95: number
  p99: number
  throughput_per_min: number
  error_rate: number
  sample_count: number
}

interface TimelinePoint {
  ts: string
  p95: number
  throughput: number
}

interface WorstTransaction {
  name: string
  p95: number
  throughput: number
  error_rate: number
  sample_count: number
}

interface PerformancePayload {
  summary: Summary
  timeline: TimelinePoint[]
  worst: WorstTransaction[]
}

function methodOf(name: string): string {
  const m = name.match(/^(GET|POST|PUT|PATCH|DELETE)\s/i)
  return m?.[1]?.toUpperCase() ?? 'GET'
}

function pathOf(name: string): string {
  return name.replace(/^(GET|POST|PUT|PATCH|DELETE)\s/i, '')
}

function fmtMs(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}s`
  return `${Math.round(n)}ms`
}

export function Performance() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [data, setData] = useState<PerformancePayload | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get<PerformancePayload>('/api/performance')
      .then((res) => {
        if (cancelled) return
        setData(res.data ?? null)
      })
      .catch(() => {
        if (!cancelled)
          setError(
            t('performance.loadError', {}, { defaultValue: "Couldn't load performance data." }),
          )
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const summary: Summary = data?.summary ?? {
    p50: 0,
    p95: 0,
    p99: 0,
    throughput_per_min: 0,
    error_rate: 0,
    sample_count: 0,
  }
  const timeline = data?.timeline ?? []
  const worst = data?.worst ?? []
  const trendValues = timeline.map((t) => t.p95)
  const errorPct = (summary.error_rate * 100).toFixed(1)

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
      <header className={cm.cn('flex items-start justify-between gap-6 flex-wrap mb-8')}>
        <div>
          <p
            className={cm.cn('font-mono text-xs font-bold uppercase tracking-widest mb-2')}
            style={{ color: BRAND_COLOR }}
          >
            {t(
              'performance.eyebrow',
              { app: APP_NAME.toLowerCase() },
              { defaultValue: '$ {{app}} performance --txn' },
            )}
          </p>
          <h1
            className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}
            style={{ color: 'var(--color-text)' }}
          >
            {t('performance.heading', {}, { defaultValue: 'Performance' })}
          </h1>
          <p
            className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1))}
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t(
              'performance.subheading',
              { count: summary.sample_count },
              { defaultValue: '{{count}} samples · last 24h' },
            )}
          </p>
        </div>
      </header>

      {error ? (
        <p
          role="alert"
          className={cm.cn('mb-4 font-mono text-xs')}
          style={{ color: 'var(--color-severity-critical)' }}
        >
          {error}
        </p>
      ) : null}

      <section className={cm.cn('grid gap-4 grid-cols-2 md:grid-cols-4 mb-8')}>
        <StatsCounterCard
          eyebrow="P50"
          value={fmtMs(summary.p50)}
          tone="primary"
          icon="speed"
          caption={t('performance.median', {}, { defaultValue: 'median latency' })}
        />
        <StatsCounterCard
          eyebrow="P95"
          value={fmtMs(summary.p95)}
          tone={summary.p95 > 1000 ? 'warning' : 'info'}
          icon="schedule"
          caption={t('performance.p95caption', {}, { defaultValue: '95th percentile' })}
        />
        <StatsCounterCard
          eyebrow="P99"
          value={fmtMs(summary.p99)}
          tone={summary.p99 > 2000 ? 'critical' : 'warning'}
          icon="bolt"
          caption={t('performance.p99caption', {}, { defaultValue: '99th percentile' })}
        />
        <StatsCounterCard
          eyebrow={t('performance.errorRate', {}, { defaultValue: 'Error %' })}
          value={`${errorPct}%`}
          tone={summary.error_rate > 0.05 ? 'critical' : 'primary'}
          icon="error"
          caption={t(
            'performance.throughputCaption',
            { rpm: summary.throughput_per_min },
            { defaultValue: '{{rpm}} req/min' },
          )}
        />
      </section>

      <section
        className={cm.cn('mb-8 rounded-2xl p-5')}
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <p
          className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest mb-3')}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {t('performance.timeline', {}, { defaultValue: '// p95 timeline · last 72 minutes' })}
        </p>
        {timeline.length === 0 ? (
          <p
            className={cm.cn('font-mono text-xs')}
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t(
              'performance.noTimeline',
              {},
              { defaultValue: 'No samples yet — make a request through your tracked app.' },
            )}
          </p>
        ) : (
          <FrequencySparkline
            values={trendValues}
            width={800}
            height={56}
            color={BRAND_COLOR}
            spikeColor="var(--color-severity-error)"
            mode="bar"
            className={cm.cn('w-full h-auto')}
            ariaLabel={t('performance.timelineAria', {}, { defaultValue: 'p95 over time' })}
          />
        )}
      </section>

      <section className={cm.cn('grid gap-6 grid-cols-1 mb-4')}>
        <div
          className={cm.cn('rounded-2xl p-5')}
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <p
            className={cm.cn('font-mono text-[10px] font-black uppercase tracking-widest mb-3')}
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t('performance.slowEndpoints', {}, { defaultValue: '// slow endpoints' })}
          </p>
          {worst.length === 0 ? (
            <p
              data-testid="performance-empty"
              className={cm.cn('font-mono text-xs')}
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t('performance.empty', {}, { defaultValue: 'No transactions captured yet.' })}
            </p>
          ) : (
            <ul
              data-testid="performance-worst"
              className={cm.cn('divide-y')}
              style={{ borderColor: 'var(--color-border-subtle)' }}
            >
              {worst.map((e) => {
                const method = methodOf(e.name)
                const path = pathOf(e.name)
                return (
                  <li key={e.name} className={cm.cn('flex items-center gap-4 py-3')}>
                    <span
                      className={cm.cn(
                        'font-mono text-[11px] font-black uppercase tracking-widest px-2 py-0.5 rounded shrink-0',
                      )}
                      style={{
                        backgroundColor:
                          method === 'GET'
                            ? 'var(--color-severity-resolved-light)'
                            : 'var(--color-severity-new-light)',
                        color:
                          method === 'GET'
                            ? 'var(--color-severity-resolved)'
                            : 'var(--color-severity-new)',
                      }}
                    >
                      {method}
                    </span>
                    <span
                      className={cm.cn('font-mono text-sm font-bold flex-1 truncate')}
                      style={{ color: 'var(--color-text)' }}
                    >
                      {path}
                    </span>
                    <span
                      className={cm.cn('font-mono text-xs tabular-nums w-20 text-right')}
                      style={{ color: 'var(--color-severity-warning)' }}
                    >
                      p95 {fmtMs(e.p95)}
                    </span>
                    <span
                      className={cm.cn(
                        'font-mono text-xs tabular-nums w-16 text-right hidden md:inline',
                      )}
                      style={{ color: 'var(--color-severity-critical)' }}
                    >
                      {(e.error_rate * 100).toFixed(1)}% err
                    </span>
                    <span
                      className={cm.cn(
                        'font-mono text-xs tabular-nums w-20 text-right hidden lg:inline',
                      )}
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {e.throughput.toLocaleString()} samples
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}
