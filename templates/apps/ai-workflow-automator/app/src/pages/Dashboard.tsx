/**
 * Dashboard — auth'd home for the workflow automator. Hero card with run
 * volume, KPI quartet, recent workflows grid, recent runs feed.
 *
 * Data source: GET /api/dashboard returns the aggregated KPIs + sparkline
 * + recent runs/workflows in a single round-trip.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { WorkflowAppShell } from '../components/WorkflowAppShell.js'
import { WorkflowCard, type WorkflowSummary } from '../components/WorkflowCard.js'
import { WorkflowHeroCard } from '../components/WorkflowHeroCard.js'
import { WorkflowStatCard } from '../components/WorkflowStatCard.js'
import { type RunStatus, WorkflowStatusBadge } from '../components/WorkflowStatusBadge.js'

interface DashboardSummary {
  runs_today: number
  success_rate: number | null
  failed_24h: number
  median_duration_ms: number | null
  p95_duration_ms: number | null
  queue_depth: number
  active_runs: number
  active_workflows: number
  total_workflows: number
  sparkline: number[]
  recent_runs: Array<{
    id: string
    workflow_id: string
    workflow_name: string
    trigger_source: string
    status: string
    started_at: string | null
    finished_at: string | null
  }>
  recent_workflows: Array<{
    id: string
    name: string
    trigger_type: string
    run_count: number
    success_rate: number | null
    last_run_at: string | null
    recent_runs: number[]
  }>
}

const TRIGGER_LABEL: Record<string, string> = {
  webhook: 'Webhook',
  manual: 'Manual',
  cron: 'Cron',
  schedule: 'Cron',
}

const TRIGGER_ICON: Record<string, string> = {
  webhook: 'webhook',
  manual: 'play_arrow',
  cron: 'schedule',
  schedule: 'schedule',
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
  return 'completed'
}

function summaryToWorkflowSummary(
  w: DashboardSummary['recent_workflows'][number],
): WorkflowSummary {
  return {
    id: w.id,
    name: w.name,
    triggerLabel: TRIGGER_LABEL[w.trigger_type] ?? 'Manual',
    triggerIcon: TRIGGER_ICON[w.trigger_type] ?? 'play_arrow',
    status: w.recent_runs.length === 0 ? 'queued' : w.recent_runs[0] === 1 ? 'completed' : 'failed',
    lastRunRelative: relativeTime(w.last_run_at),
    runCount: w.run_count,
    successRate: w.success_rate ?? 0,
    recentRuns: w.recent_runs.length > 0 ? w.recent_runs : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  }
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get<DashboardSummary>('/api/dashboard')
      .then((res) => {
        if (cancelled) return
        setSummary(res.data ?? null)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(
          e instanceof Error
            ? e.message
            : t('dashboard.error', {}, { defaultValue: 'Could not load dashboard.' }),
        )
        setSummary({
          runs_today: 0,
          success_rate: null,
          failed_24h: 0,
          median_duration_ms: null,
          p95_duration_ms: null,
          queue_depth: 0,
          active_runs: 0,
          active_workflows: 0,
          total_workflows: 0,
          sparkline: [],
          recent_runs: [],
          recent_workflows: [],
        })
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  if (summary === null) {
    return (
      <WorkflowAppShell
        pageId="dashboard"
        eyebrow={t('dashboard.eyebrow', {}, { defaultValue: 'Operations · live' })}
        title={t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}
      >
        <div
          className={cm.cn(cm.sp('p', 12), cm.textCenter, cm.textMuted)}
          data-mol-id="dashboard-loading"
        >
          {t('dashboard.loading', {}, { defaultValue: 'Loading dashboard…' })}
        </div>
      </WorkflowAppShell>
    )
  }

  const sparkline = summary.sparkline.length > 0 ? summary.sparkline : [0, 0, 0, 0, 0, 0]
  const successRateLabel =
    summary.success_rate === null ? '—' : `${summary.success_rate.toFixed(1)}%`
  const medianLabel =
    summary.median_duration_ms === null
      ? '—'
      : summary.median_duration_ms < 1000
        ? `${summary.median_duration_ms} ms`
        : `${(summary.median_duration_ms / 1000).toFixed(2)}s`

  return (
    <WorkflowAppShell
      pageId="dashboard"
      eyebrow={t('dashboard.eyebrow', {}, { defaultValue: 'Operations · live' })}
      title={t('nav.dashboard', {}, { defaultValue: 'Dashboard' })}
      description={t(
        'dashboard.description',
        { active: summary.active_workflows, failed: summary.failed_24h },
        { defaultValue: '{{active}} workflows active. {{failed}} failed in the last 24 hours.' },
      )}
    >
      {error && (
        <div
          role="alert"
          data-mol-id="dashboard-error"
          className={cm.cn(cm.sp('p', 3), cm.sp('mb', 4), cm.textSize('sm'), 'rounded-xl')}
          style={{
            background: 'var(--color-status-error-bg)',
            color: 'var(--color-status-error-fg)',
          }}
        >
          {error}
        </div>
      )}

      {/* Hero */}
      <div className={cm.sp('mb', 6)}>
        <WorkflowHeroCard
          label={t('dashboard.hero.label', {}, { defaultValue: 'Runs today' })}
          value={summary.runs_today.toLocaleString()}
          sparkline={sparkline}
          kpis={[
            {
              label: t('dashboard.hero.success', {}, { defaultValue: 'Success' }),
              value: successRateLabel,
            },
            {
              label: t('dashboard.hero.medianLatency', {}, { defaultValue: 'p50 latency' }),
              value: medianLabel,
            },
            {
              label: t('dashboard.hero.queue', {}, { defaultValue: 'Queue depth' }),
              value: String(summary.queue_depth),
            },
            {
              label: t('status.active', {}, { defaultValue: 'Active' }),
              value: String(summary.active_runs),
            },
          ]}
        />
      </div>

      {/* KPI quartet */}
      <div className={'grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-8'}>
        <WorkflowStatCard
          label={t('dashboard.kpi.activeWorkflows', {}, { defaultValue: 'Active workflows' })}
          value={String(summary.active_workflows)}
          caption={t(
            'dashboard.kpi.outOf',
            { total: summary.total_workflows },
            { defaultValue: 'of {{total}} total' },
          )}
          icon="account_tree"
          accent="var(--color-node-trigger)"
        />
        <WorkflowStatCard
          label={t('dashboard.kpi.successRate', {}, { defaultValue: 'Success rate · 24h' })}
          value={successRateLabel}
          icon="check_circle"
          accent="var(--color-node-action)"
        />
        <WorkflowStatCard
          label={t('dashboard.kpi.failedRuns', {}, { defaultValue: 'Failed · 24h' })}
          value={String(summary.failed_24h)}
          icon="error"
          accent="var(--color-status-failure)"
        />
        <WorkflowStatCard
          label={t('dashboard.kpi.avgDuration', {}, { defaultValue: 'Median duration' })}
          value={medianLabel}
          icon="speed"
          accent="var(--color-node-condition)"
        />
      </div>

      {/* Recent workflows */}
      <section className={cm.sp('mb', 8)}>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('dashboard.recentWorkflows.title', {}, { defaultValue: 'Recently run' })}
          </h2>
          <Link
            to="/workflows"
            className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'transition-colors')}
            style={{ color: 'var(--color-accent-violet)' }}
          >
            {t('common.viewAllArrow', {}, { defaultValue: 'View all →' })}
          </Link>
        </div>
        {summary.recent_workflows.length === 0 ? (
          <div
            className={cm.cn(cm.sp('p', 8), cm.textCenter, 'rounded-xl bg-surface')}
            data-mol-id="recent-workflows-empty"
            style={{ border: '1px dashed var(--color-border)' }}
          >
            <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
              {t(
                'dashboard.recentWorkflows.empty',
                {},
                { defaultValue: 'No workflows yet. Install a template or build one from scratch.' },
              )}
            </p>
            <Link
              to="/templates"
              className={cm.cn(
                cm.sp('mt', 3),
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'inline-block',
              )}
              style={{ color: 'var(--color-accent-violet)' }}
            >
              {t('dashboard.recentWorkflows.browse', {}, { defaultValue: 'Browse templates →' })}
            </Link>
          </div>
        ) : (
          <div className={'grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3'}>
            {summary.recent_workflows.map((w) => (
              <WorkflowCard key={w.id} workflow={summaryToWorkflowSummary(w)} />
            ))}
          </div>
        )}
      </section>

      {/* Recent runs feed */}
      <section>
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {t('dashboard.recentRuns.title', {}, { defaultValue: 'Recent runs' })}
          </h2>
          <Link
            to="/executions"
            className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}
            style={{ color: 'var(--color-accent-violet)' }}
          >
            {t('dashboard.recentRuns.viewAll', {}, { defaultValue: 'Open executions →' })}
          </Link>
        </div>
        {summary.recent_runs.length === 0 ? (
          <div
            className={cm.cn(cm.sp('p', 8), cm.textCenter, 'rounded-xl bg-surface')}
            data-mol-id="recent-runs-empty"
            style={{ border: '1px dashed var(--color-border)' }}
          >
            <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
              {t(
                'dashboard.recentRuns.empty',
                {},
                { defaultValue: 'No runs yet. Triggering a workflow will populate this feed.' },
              )}
            </p>
          </div>
        ) : (
          <div
            className={cm.cn('rounded-xl bg-surface overflow-hidden')}
            style={{ border: '1px solid var(--color-border)' }}
          >
            <table className={'w-full'}>
              <thead style={{ background: 'var(--color-background-secondary)' }}>
                <tr>
                  {[
                    t('dashboard.run.col.run', {}, { defaultValue: 'Run' }),
                    t('dashboard.run.col.workflow', {}, { defaultValue: 'Workflow' }),
                    t('dashboard.run.col.trigger', {}, { defaultValue: 'Trigger' }),
                    t('nav.status', {}, { defaultValue: 'Status' }),
                    t('dashboard.run.col.started', {}, { defaultValue: 'Started' }),
                  ].map((h) => (
                    <th
                      key={h}
                      className={cm.cn(
                        cm.sp('px', 5),
                        cm.sp('py', 3),
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        'uppercase tracking-widest text-left whitespace-nowrap',
                      )}
                      style={{ color: 'var(--color-foreground-secondary)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                {summary.recent_runs.map((r) => (
                  <tr key={r.id} className={'hover:bg-background/30 transition-colors'}>
                    <td
                      className={cm.cn(
                        cm.sp('px', 5),
                        cm.sp('py', 3),
                        cm.textSize('sm'),
                        'font-mono',
                      )}
                    >
                      <Link
                        to={`/executions/${r.id}`}
                        className={'hover:underline'}
                        style={{ color: 'var(--color-accent-violet)' }}
                      >
                        #{r.id.slice(0, 8)}
                      </Link>
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 5),
                        cm.sp('py', 3),
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                      )}
                    >
                      {r.workflow_name}
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 5),
                        cm.sp('py', 3),
                        cm.textSize('sm'),
                        'font-mono',
                      )}
                      style={{ color: 'var(--color-foreground-secondary)' }}
                    >
                      {r.trigger_source}
                    </td>
                    <td className={cm.cn(cm.sp('px', 5), cm.sp('py', 3))}>
                      <WorkflowStatusBadge status={statusToRunStatus(r.status)} size="sm" />
                    </td>
                    <td
                      className={cm.cn(cm.sp('px', 5), cm.sp('py', 3), cm.textSize('sm'))}
                      style={{ color: 'var(--color-foreground-secondary)' }}
                    >
                      {relativeTime(r.started_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </WorkflowAppShell>
  )
}

export default Dashboard
