/**
 * Workflows — list/grid of all workflows with status, search, and filter.
 *
 * Data source: GET /api/workflows returns the user's workflows enriched
 * with their `last_run` row.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { WorkflowAppShell } from '../components/WorkflowAppShell.js'
import { WorkflowCard, type WorkflowSummary } from '../components/WorkflowCard.js'
import type { RunStatus } from '../components/WorkflowStatusBadge.js'

interface WorkflowRow {
  id: string
  name: string
  description?: string
  trigger_type: 'manual' | 'webhook' | 'cron' | 'schedule'
  cron_expression?: string | null
  enabled?: boolean
  run_count?: number
  success_count?: number
  failure_count?: number
  last_run_at?: string | null
  last_run?: {
    status?: string
    started_at?: string
    finished_at?: string
  } | null
}

const TRIGGER_LABEL: Record<WorkflowRow['trigger_type'], string> = {
  webhook: 'Webhook',
  manual: 'Manual',
  cron: 'Cron',
  schedule: 'Cron',
}

const TRIGGER_ICON: Record<WorkflowRow['trigger_type'], string> = {
  webhook: 'webhook',
  manual: 'play_arrow',
  cron: 'schedule',
  schedule: 'schedule',
}

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 0) return 'just now'
  if (ms < 60_000) return 'just now'
  if (ms < 3600_000) return `${Math.round(ms / 60_000)}m ago`
  if (ms < 86_400_000) return `${Math.round(ms / 3600_000)}h ago`
  return `${Math.round(ms / 86_400_000)}d ago`
}

function statusFromRow(row: WorkflowRow): RunStatus {
  const last = row.last_run?.status ?? 'queued'
  if (!row.enabled) return 'paused'
  if (last === 'success' || last === 'completed') return 'completed'
  if (last === 'failure' || last === 'failed') return 'failed'
  if (last === 'running') return 'running'
  if (last === 'paused') return 'paused'
  if (last === 'queued') return 'queued'
  return 'queued'
}

function rowToSummary(row: WorkflowRow): WorkflowSummary {
  const total = (row.success_count ?? 0) + (row.failure_count ?? 0)
  const successRate = total > 0 ? Math.round(((row.success_count ?? 0) / total) * 100) : 100
  return {
    id: row.id,
    name: row.name,
    triggerLabel: TRIGGER_LABEL[row.trigger_type] ?? 'Manual',
    triggerIcon: TRIGGER_ICON[row.trigger_type] ?? 'play_arrow',
    status: statusFromRow(row),
    lastRunRelative: relativeTime(row.last_run_at ?? row.last_run?.started_at ?? null),
    runCount: row.run_count ?? 0,
    successRate,
    recentRuns: undefined,
  }
}

const FILTERS = ['all', 'running', 'completed', 'failed', 'paused'] as const

export function Workflows() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [rows, setRows] = useState<WorkflowRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all')

  // Reset transient filter on browser navigation.
  useEffect(() => {
    const handler = () => setFilter('all')
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [])

  useEffect(() => {
    let cancelled = false
    http
      .get<WorkflowRow[]>('/api/workflows')
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
            : t('workflows.error', {}, { defaultValue: 'Could not load workflows.' }),
        )
        setRows([])
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const summaries = useMemo(() => (rows ?? []).map(rowToSummary), [rows])

  const filtered = useMemo(
    () =>
      summaries.filter((w) => {
        const matchesQuery = query === '' || w.name.toLowerCase().includes(query.toLowerCase())
        const matchesFilter = filter === 'all' || w.status === filter
        return matchesQuery && matchesFilter
      }),
    [summaries, query, filter],
  )

  return (
    <WorkflowAppShell
      pageId="workflows"
      eyebrow={t(
        'workflows.eyebrow',
        { count: summaries.length },
        { defaultValue: 'Library · {{count}} total' },
      )}
      title={t('workflows.title', {}, { defaultValue: 'Workflows' })}
      description={t(
        'workflows.description',
        {},
        {
          defaultValue:
            'Every automation in your workspace, with health and recent activity at a glance.',
        },
      )}
      actions={
        <Link
          to="/templates"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'rounded-full text-white shadow-md transition-all hover:-translate-y-0.5',
          )}
          style={{
            background:
              'linear-gradient(135deg, var(--color-node-trigger), var(--color-node-condition))',
            boxShadow: '0 4px 12px color-mix(in srgb, var(--color-node-trigger) 30%, transparent)',
          }}
        >
          <span className={'material-symbols-outlined text-lg'}>add</span>
          {t('workflows.newFromTemplate', {}, { defaultValue: 'New from template' })}
        </Link>
      }
    >
      {error && (
        <div
          role="alert"
          data-mol-id="workflows-error"
          className={cm.cn(cm.sp('p', 3), cm.sp('mb', 4), cm.textSize('sm'), 'rounded-xl')}
          style={{
            background: 'var(--color-status-error-bg)',
            color: 'var(--color-status-error-fg)',
          }}
        >
          {error}
        </div>
      )}

      {/* Filter row */}
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
          cm.sp('mb', 6),
          'flex-wrap',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'flex-wrap')}>
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => {
                setFilter(f)
                if (typeof window !== 'undefined') {
                  window.history.replaceState(null, '', `${window.location.pathname}#filter=${f}`)
                }
              }}
              data-mol-id={`workflow-filter-${f}`}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'rounded-full uppercase tracking-widest transition-colors',
              )}
              style={{
                background: filter === f ? 'var(--color-accent-violet)' : 'var(--color-surface)',
                color: filter === f ? 'white' : 'var(--color-foreground-secondary)',
                border: '1px solid var(--color-border)',
              }}
            >
              {t(`workflows.filter.${f}`, {}, { defaultValue: f })}
            </button>
          ))}
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 4),
            'rounded-full bg-surface',
          )}
          style={{ border: '1px solid var(--color-border)' }}
        >
          <span
            className={cm.cn('material-symbols-outlined', cm.textSize('lg'))}
            style={{ color: 'var(--color-foreground-secondary)' }}
          >
            search
          </span>
          <input
            type="search"
            data-mol-id="workflows-search"
            placeholder={t(
              'workflows.searchPlaceholder',
              {},
              { defaultValue: 'Search workflows…' },
            )}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={cm.cn(
              cm.sp('py', 2),
              cm.textSize('sm'),
              'bg-transparent border-0 focus:ring-0 focus:outline-none w-64',
            )}
          />
        </div>
      </div>

      {rows === null ? (
        <div
          className={cm.cn(cm.sp('p', 12), cm.textCenter, cm.textMuted)}
          data-mol-id="workflows-loading"
        >
          {t('workflows.loading', {}, { defaultValue: 'Loading workflows…' })}
        </div>
      ) : filtered.length === 0 ? (
        <div
          className={cm.cn(cm.sp('p', 12), cm.textCenter, 'rounded-xl bg-surface')}
          data-mol-id="workflows-empty"
          style={{ border: '1px dashed var(--color-border)' }}
        >
          <span
            className={cm.cn('material-symbols-outlined text-5xl', cm.sp('mb', 3))}
            style={{ color: 'var(--color-accent-violet-light)' }}
          >
            account_tree
          </span>
          <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
            {summaries.length === 0
              ? t('workflows.empty.firstTitle', {}, { defaultValue: 'No workflows yet' })
              : t('workflows.empty.title', {}, { defaultValue: 'No workflows match' })}
          </h3>
          <p className={cm.cn(cm.textSize('sm'), cm.textMuted, cm.sp('mt', 2))}>
            {summaries.length === 0
              ? t(
                  'workflows.empty.firstBody',
                  {},
                  { defaultValue: 'Install a template to get started in seconds.' },
                )
              : t(
                  'workflows.empty.body',
                  {},
                  { defaultValue: 'Try clearing the filter or starting from a template.' },
                )}
          </p>
          <Link
            to="/templates"
            className={cm.cn(
              cm.sp('mt', 4),
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'inline-block',
            )}
            style={{ color: 'var(--color-accent-violet)' }}
          >
            {t('workflows.browseTemplates', {}, { defaultValue: 'Browse templates →' })}
          </Link>
        </div>
      ) : (
        <div className={'grid gap-5 grid-cols-1 md:grid-cols-2 xl:grid-cols-3'}>
          {filtered.map((wf) => (
            <WorkflowCard key={wf.id} workflow={wf} />
          ))}
        </div>
      )}
    </WorkflowAppShell>
  )
}

export default Workflows
