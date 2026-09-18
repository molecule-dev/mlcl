/**
 * Executions — list of workflow runs with filter pills, sortable table,
 * and inline status badges. Brand chrome via WorkflowAppShell.
 *
 * Data source: GET /api/runs returns the user's full run history (oldest
 * 50 by default).
 */
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { WorkflowAppShell } from '../components/WorkflowAppShell.js'
import { WorkflowStatCard } from '../components/WorkflowStatCard.js'
import { type RunStatus, WorkflowStatusBadge } from '../components/WorkflowStatusBadge.js'

interface RunRow {
  id: string
  workflow_id: string
  workflow_name?: string
  trigger_source: string
  status: string
  started_at: string | null
  finished_at: string | null
}

const FILTERS: Array<{ value: RunStatus | 'all'; labelKey: string; defaultLabel: string }> = [
  { value: 'all', labelKey: 'executions.filter.all', defaultLabel: 'All' },
  { value: 'completed', labelKey: 'executions.filter.success', defaultLabel: 'Successful' },
  { value: 'failed', labelKey: 'executions.filter.failed', defaultLabel: 'Failed' },
  { value: 'running', labelKey: 'executions.filter.running', defaultLabel: 'Running' },
  { value: 'paused', labelKey: 'executions.filter.paused', defaultLabel: 'Paused' },
]

function formatDuration(startedAt: string | null, finishedAt: string | null): string {
  if (!startedAt || !finishedAt) return '—'
  const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime()
  if (ms <= 0) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function relativeTime(iso: string | null): string {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 0) return 'just now'
  if (ms < 60_000) return 'just now'
  if (ms < 3600_000) return `${Math.round(ms / 60_000)}m ago`
  if (ms < 86_400_000) return `${Math.round(ms / 3600_000)}h ago`
  return `${Math.round(ms / 86_400_000)}d ago`
}

function statusToRunStatus(status: string): RunStatus {
  if (status === 'success' || status === 'completed') return 'completed'
  if (status === 'failure' || status === 'failed') return 'failed'
  if (status === 'running') return 'running'
  if (status === 'queued') return 'queued'
  if (status === 'paused') return 'paused'
  if (status === 'skipped') return 'skipped'
  return 'completed'
}

export function Executions() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [rows, setRows] = useState<RunRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<RunStatus | 'all'>('all')

  useEffect(() => {
    const handler = () => setFilter('all')
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [])

  useEffect(() => {
    let cancelled = false
    http
      .get<RunRow[]>('/api/runs')
      .then((res) => {
        if (cancelled) return
        const arr = Array.isArray(res.data) ? res.data : []
        setRows(arr)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(
          e instanceof Error
            ? e.message
            : t('executions.error', {}, { defaultValue: 'Could not load executions.' }),
        )
        setRows([])
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const visible = useMemo(() => {
    const base = rows ?? []
    return filter === 'all' ? base : base.filter((r) => statusToRunStatus(r.status) === filter)
  }, [rows, filter])

  const successCount = (rows ?? []).filter(
    (r) => r.status === 'success' || r.status === 'completed',
  ).length
  const failedCount = (rows ?? []).filter(
    (r) => r.status === 'failure' || r.status === 'failed',
  ).length
  const finishedCount = successCount + failedCount
  const successRate = finishedCount > 0 ? Math.round((successCount / finishedCount) * 100) : null

  const durations = (rows ?? [])
    .map((r) =>
      r.started_at && r.finished_at
        ? new Date(r.finished_at).getTime() - new Date(r.started_at).getTime()
        : -1,
    )
    .filter((d) => d > 0)
    .sort((a, b) => a - b)
  const median = durations.length > 0 ? durations[Math.floor(durations.length / 2)] : null
  const medianLabel =
    median === null ? '—' : median < 1000 ? `${median} ms` : `${(median / 1000).toFixed(2)}s`

  return (
    <WorkflowAppShell
      pageId="executions"
      eyebrow={t('executions.eyebrow', {}, { defaultValue: 'Run history' })}
      title={t('executions.title', {}, { defaultValue: 'Executions' })}
      description={t(
        'executions.description',
        {},
        { defaultValue: 'Every workflow run, every retry, every step output — all observable.' },
      )}
    >
      {error && (
        <div
          role="alert"
          data-mol-id="executions-error"
          className={cm.cn(cm.sp('p', 3), cm.sp('mb', 4), cm.textSize('sm'), 'rounded-xl')}
          style={{
            background: 'var(--color-status-error-bg)',
            color: 'var(--color-status-error-fg)',
          }}
        >
          {error}
        </div>
      )}

      {/* KPI strip */}
      <div
        className={cm.cn(
          cm.grid({ gap: 'md', cols: 4 }),
          cm.sp('mb', 8),
          'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
        )}
      >
        <WorkflowStatCard
          label={t('executions.kpi.runs', {}, { defaultValue: 'Total runs' })}
          value={(rows ?? []).length.toLocaleString()}
          icon="play_arrow"
          accent="var(--color-node-trigger)"
        />
        <WorkflowStatCard
          label={t('executions.kpi.successRate', {}, { defaultValue: 'Success rate' })}
          value={successRate === null ? '—' : `${successRate}%`}
          icon="task_alt"
          accent="var(--color-node-action)"
        />
        <WorkflowStatCard
          label={t('status.failed', {}, { defaultValue: 'Failed' })}
          value={String(failedCount)}
          icon="error"
          accent="var(--color-status-failure)"
        />
        <WorkflowStatCard
          label={t('executions.kpi.median', {}, { defaultValue: 'Median duration' })}
          value={medianLabel}
          icon="speed"
          accent="var(--color-node-condition)"
        />
      </div>

      {/* Filter pills */}
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }), cm.sp('mb', 4))}>
        {FILTERS.map((f) => {
          const active = filter === f.value
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => {
                setFilter(f.value)
                if (typeof window !== 'undefined') {
                  window.history.replaceState(
                    null,
                    '',
                    `${window.location.pathname}#filter=${f.value}`,
                  )
                }
              }}
              data-mol-id={`executions-filter-${f.value}`}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'rounded-full uppercase tracking-widest transition-colors',
              )}
              style={
                active
                  ? {
                      background: 'var(--color-accent-violet-strong)',
                      color: 'white',
                      border: '1px solid var(--color-accent-violet-strong)',
                    }
                  : {
                      background: 'var(--color-surface)',
                      color: 'var(--color-foreground-secondary)',
                      border: '1px solid var(--color-border)',
                    }
              }
            >
              {t(f.labelKey, {}, { defaultValue: f.defaultLabel })}
            </button>
          )
        })}
      </div>

      {/* Run history table */}
      {rows === null ? (
        <div
          className={cm.cn(cm.sp('p', 12), cm.textCenter, cm.textMuted)}
          data-mol-id="executions-loading"
        >
          {t('executions.loading', {}, { defaultValue: 'Loading run history…' })}
        </div>
      ) : (
        <div
          className={'rounded-2xl overflow-hidden'}
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <table className={'w-full text-sm'}>
            <thead>
              <tr
                style={{
                  background: 'var(--color-background-secondary)',
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                <Th>{t('nav.status', {}, { defaultValue: 'Status' })}</Th>
                <Th>{t('executions.col.workflow', {}, { defaultValue: 'Workflow' })}</Th>
                <Th>{t('executions.col.trigger', {}, { defaultValue: 'Trigger' })}</Th>
                <Th>{t('executions.col.started', {}, { defaultValue: 'Started' })}</Th>
                <Th align="right">{t('form.duration', {}, { defaultValue: 'Duration' })}</Th>
                <Th align="right">{t('executions.col.id', {}, { defaultValue: 'Run id' })}</Th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr
                  key={row.id}
                  className={'hover:bg-background-secondary transition-colors'}
                  style={{ borderBottom: '1px solid var(--color-border)' }}
                >
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                    <WorkflowStatusBadge status={statusToRunStatus(row.status)} size="sm" />
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), cm.fontWeight('semibold'))}>
                    <Link
                      to={`/executions/${row.id}`}
                      className={'hover:underline'}
                      style={{ color: 'var(--color-foreground)' }}
                    >
                      {row.workflow_name ?? row.workflow_id}
                    </Link>
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                    <span
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.textSize('xs'),
                        cm.fontWeight('semibold'),
                        'rounded uppercase tracking-wider',
                      )}
                      style={{
                        background: 'var(--color-background-secondary)',
                        color: 'var(--color-foreground-secondary)',
                        padding: '3px 8px',
                      }}
                    >
                      {row.trigger_source}
                    </span>
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), cm.textMuted)}>
                    {relativeTime(row.started_at)}
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right font-mono')}>
                    {formatDuration(row.started_at, row.finished_at)}
                  </td>
                  <td
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      'text-right font-mono',
                      cm.textSize('xs'),
                      cm.textMuted,
                    )}
                  >
                    {row.id.slice(0, 8)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {visible.length === 0 && (
            <div
              className={cm.cn(cm.sp('p', 12), 'text-center', cm.textMuted)}
              data-mol-id="executions-empty"
            >
              {(rows ?? []).length === 0
                ? t(
                    'executions.empty.first',
                    {},
                    { defaultValue: 'No runs yet — trigger a workflow to populate this list.' },
                  )
                : t('executions.empty.filter', {}, { defaultValue: 'No runs match this filter.' })}
            </div>
          )}
        </div>
      )}
    </WorkflowAppShell>
  )
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  const cm = getClassMap()
  return (
    <th
      className={cm.cn(
        cm.sp('px', 4),
        cm.sp('py', 3),
        cm.textSize('xs'),
        cm.fontWeight('bold'),
        'uppercase tracking-widest',
        align === 'right' ? 'text-right' : 'text-left',
      )}
      style={{ color: 'var(--color-foreground-secondary)' }}
    >
      {children}
    </th>
  )
}

export default Executions
