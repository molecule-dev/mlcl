import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { MetricStatCard } from '../components/MetricStatCard.js'
import { PipelineRow, type PipelineRowData } from '../components/PipelineRow.js'
import { unwrapList } from '../lib/unwrap.js'

type StatusFilter = 'all' | 'running' | 'success' | 'failed' | 'queued'

function bucketCounts(pipelines: PipelineRowData[]) {
  return pipelines.reduce(
    (acc, p) => {
      acc.total += 1
      if (p.status === 'running') acc.running += 1
      else if (p.status === 'queued') acc.queued += 1
      else if (p.status === 'success') acc.success += 1
      else if (p.status === 'failed') acc.failed += 1
      return acc
    },
    { total: 0, running: 0, queued: 0, success: 0, failed: 0 },
  )
}

export function Pipelines() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [pipelines, setPipelines] = useState<PipelineRowData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<StatusFilter>('all')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/pipelines')
      .then((res) => {
        if (!cancelled) setPipelines(unwrapList<PipelineRowData>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('pipelines.loadError', {}, { defaultValue: 'Failed to load pipelines.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const counts = useMemo(() => bucketCounts(pipelines), [pipelines])
  const successRate = counts.total === 0 ? 0 : Math.round((counts.success / counts.total) * 100)
  const visible = useMemo(
    () => (filter === 'all' ? pipelines : pipelines.filter((p) => p.status === filter)),
    [filter, pipelines],
  )

  const filters: { key: StatusFilter; label: string; count?: number }[] = [
    { key: 'all', label: t('status.all', {}, { defaultValue: 'All' }), count: counts.total },
    {
      key: 'running',
      label: t('pipelines.filter.running', {}, { defaultValue: 'Running' }),
      count: counts.running,
    },
    {
      key: 'queued',
      label: t('status.queued', {}, { defaultValue: 'Queued' }),
      count: counts.queued,
    },
    {
      key: 'success',
      label: t('pipelines.filter.success', {}, { defaultValue: 'Passed' }),
      count: counts.success,
    },
    {
      key: 'failed',
      label: t('status.failed', {}, { defaultValue: 'Failed' }),
      count: counts.failed,
    },
  ]

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
      <header className={'flex items-start justify-between gap-6 flex-wrap mb-8'}>
        <div>
          <p className={'font-mono text-xs font-bold uppercase tracking-widest text-primary mb-2'}>
            {t('pipelines.eyebrow', {}, { defaultValue: '$ conduit pipelines --watch' })}
          </p>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('pipelines.heading', {}, { defaultValue: 'Pipelines' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'pipelines.subheading',
              {},
              { defaultValue: 'Live updates from every watched repository.' },
            )}
          </p>
        </div>
        <div
          className={'inline-flex items-center gap-2 px-3 py-1.5 rounded-full'}
          style={{
            backgroundColor: 'rgba(16, 185, 129, 0.10)',
            border: '1px solid rgba(16, 185, 129, 0.30)',
          }}
        >
          <span
            className={'h-2 w-2 rounded-full bg-success animate-pulse'}
            style={{ boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.30)' }}
            aria-hidden="true"
          />
          <span className="font-mono text-[11px] font-extrabold uppercase tracking-widest text-success">
            {t('pipelines.realtimeOn', {}, { defaultValue: 'realtime' })}
          </span>
        </div>
      </header>

      <section className={'grid gap-4 grid-cols-2 md:grid-cols-4 mb-8'}>
        <MetricStatCard
          eyebrow={t('pipelines.metric.running', {}, { defaultValue: 'Running' })}
          value={String(counts.running)}
          icon="autorenew"
          tone="info"
          caption={t('pipelines.metric.runningCaption', {}, { defaultValue: 'In flight now' })}
        />
        <MetricStatCard
          eyebrow={t('status.queued', {}, { defaultValue: 'Queued' })}
          value={String(counts.queued)}
          icon="hourglass_empty"
          tone="warning"
          caption={t('pipelines.metric.queuedCaption', {}, { defaultValue: 'Waiting for runner' })}
        />
        <MetricStatCard
          eyebrow={t('pipelines.metric.successRate', {}, { defaultValue: 'Success rate' })}
          value={`${successRate}`}
          unit="%"
          icon="check_circle"
          tone="success"
          caption={t(
            'pipelines.metric.successCaption',
            { count: counts.success, total: counts.total },
            { defaultValue: '{{count}} of {{total}} runs' },
          )}
        />
        <MetricStatCard
          eyebrow={t('status.failed', {}, { defaultValue: 'Failed' })}
          value={String(counts.failed)}
          icon="error"
          tone="error"
          caption={t('pipelines.metric.failedCaption', {}, { defaultValue: 'In the last hour' })}
        />
      </section>

      <div className={'flex flex-wrap items-center gap-2 mb-4'}>
        {filters.map((f) => {
          const active = filter === f.key
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={
                'inline-flex items-center gap-2 px-3 py-1.5 rounded-full font-mono text-xs font-bold uppercase tracking-widest transition-colors'
              }
              style={{
                backgroundColor: active ? 'rgba(16, 185, 129, 0.20)' : 'rgba(30, 34, 53, 0.6)',
                color: active
                  ? 'var(--color-on-primary-container)'
                  : 'var(--color-on-surface-variant)',
                border: `1px solid ${active ? 'rgba(16, 185, 129, 0.40)' : 'rgba(30, 41, 59, 0.8)'}`,
              }}
              data-mol-id={`pipelines-filter-${f.key}`}
            >
              {f.label}
              {typeof f.count === 'number' ? <span className="opacity-70">{f.count}</span> : null}
            </button>
          )
        })}
      </div>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('pipelines.loading', {}, { defaultValue: 'Loading pipelines…' })}
        </p>
      ) : visible.length === 0 ? (
        <div className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          <span
            className={'material-symbols-outlined text-5xl opacity-40 mb-3 inline-block'}
            aria-hidden="true"
          >
            playlist_remove
          </span>
          <p className={'text-sm'}>
            {t('pipelines.empty', {}, { defaultValue: 'No pipelines match this filter.' })}
          </p>
        </div>
      ) : (
        <ul className={'space-y-3'}>
          {visible.map((p) => (
            <li key={p.id}>
              <PipelineRow pipeline={p} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
