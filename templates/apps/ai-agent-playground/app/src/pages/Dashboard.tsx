// Pattern source: bespoke per Neuron DESIGN.md.
// Authed dashboard — 4-up metric bar (computed from /executions), agents grid, recent runs, log.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AgentCard, type AgentStatus } from '../components/AgentCard.js'
import { ExecutionLogPanel, type LogEntry } from '../components/ExecutionLogPanel.js'
import { MetricCard } from '../components/MetricCard.js'

interface AgentRow {
  id: string
  name?: string
  description?: string
  provider?: string
  status?: string
  run_count?: number
  last_run_at?: string | null
  updated_at?: string
}

interface ExecutionRow {
  id: string
  agent_id: string
  status?: string
  duration_ms?: number
  total_tokens?: number
  token_count?: number
  total_cost_cents?: number
  started_at?: string
  finished_at?: string
  error_message?: string | null
}

function deriveStatus(row: AgentRow): AgentStatus {
  switch ((row.status ?? '').toLowerCase()) {
    case 'archived':
      return 'paused'
    case 'failed':
      return 'failed'
    case 'running':
      return 'running'
    default:
      return row.run_count && row.run_count > 0 ? 'idle' : 'paused'
  }
}

function formatLastRun(iso?: string | null): string {
  if (!iso) return '—'
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 60_000) return 'just now'
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`
  return `${Math.floor(ms / 86_400_000)}d ago`
}

function formatNumber(n: number): string {
  return n.toLocaleString()
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [agents, setAgents] = useState<AgentRow[]>([])
  const [executions, setExecutions] = useState<ExecutionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [agentsRes, execRes] = await Promise.all([
        http.get<AgentRow[]>('/agents'),
        http.get<ExecutionRow[]>('/executions'),
      ])
      setAgents(Array.isArray(agentsRes.data) ? agentsRes.data : [])
      setExecutions(Array.isArray(execRes.data) ? execRes.data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [http])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const agentNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const row of agents) {
      map.set(
        row.id,
        row.name?.trim() || t('agents.untitled', {}, { defaultValue: 'Untitled Agent' }),
      )
    }
    return map
  }, [agents, t])

  const totals = useMemo(() => {
    const totalRuns = executions.length
    const totalTokens = executions.reduce(
      (acc, exec) => acc + (exec.total_tokens ?? exec.token_count ?? 0),
      0,
    )
    const cents = executions.reduce((acc, exec) => acc + (exec.total_cost_cents ?? 0), 0)
    const durations = executions
      .map((exec) => exec.duration_ms ?? 0)
      .filter((duration) => duration > 0)
    const avgLatency =
      durations.length === 0
        ? 0
        : Math.round(durations.reduce((acc, n) => acc + n, 0) / durations.length)
    return {
      totalRuns,
      totalTokens,
      estimatedCost: (cents / 100).toFixed(2),
      avgLatency,
    }
  }, [executions])

  const visibleAgents = useMemo(
    () =>
      agents.slice(0, 4).map((row) => ({
        id: row.id,
        name: row.name?.trim() || t('agents.untitled', {}, { defaultValue: 'Untitled Agent' }),
        description:
          row.description?.trim() ||
          t('agents.noDescription', {}, { defaultValue: 'No description yet.' }),
        provider: row.provider ?? 'anthropic',
        status: deriveStatus(row),
        lastRun: formatLastRun(row.last_run_at ?? row.updated_at),
        iconName: 'smart_toy',
      })),
    [agents, t],
  )

  const recentRuns = executions.slice(0, 5)

  const log: LogEntry[] = useMemo(
    () =>
      executions.slice(0, 10).map((exec) => ({
        timestamp: exec.started_at
          ? new Date(exec.started_at).toISOString().slice(11, 19)
          : '00:00:00',
        level: exec.status === 'failed' ? 'WARN' : exec.status === 'succeeded' ? 'SUCCESS' : 'INFO',
        message: t(
          'dashboard.logEntry',
          {
            agent: agentNameById.get(exec.agent_id) ?? exec.agent_id.slice(0, 8),
            status: exec.status ?? 'unknown',
            ms: exec.duration_ms ?? 0,
          },
          { defaultValue: '{{agent}} → {{status}} ({{ms}} ms)' },
        ),
      })),
    [executions, agentNameById, t],
  )

  return (
    <div data-mol-id="page-dashboard">
      {error && (
        <p
          className={cm.cn(cm.sp('mb', 4), cm.textSize('sm'), 'text-error font-mono')}
          data-mol-id="dashboard-error"
          role="alert"
        >
          {error}
        </p>
      )}

      <div className={cm.cn(cm.grid({ cols: 4, gap: 4 }), cm.sp('mb', 8))}>
        <MetricCard
          label={t('dashboard.totalRuns', {}, { defaultValue: 'Total Runs' })}
          value={formatNumber(totals.totalRuns)}
        />
        <MetricCard
          label={t('dashboard.tokensProcessed', {}, { defaultValue: 'Tokens Processed' })}
          value={formatNumber(totals.totalTokens)}
        />
        <MetricCard
          label={t('dashboard.estimatedCost', {}, { defaultValue: 'Estimated Cost' })}
          value={`$${totals.estimatedCost}`}
        />
        <MetricCard
          label={t('dashboard.avgLatency', {}, { defaultValue: 'Avg Latency' })}
          live
          liveLabel={t('status.live', {}, { defaultValue: 'Live' })}
          unit={t('dashboard.latencyUnit', {}, { defaultValue: 'ms' })}
          value={String(totals.avgLatency)}
        />
      </div>

      <div className={cm.cn(cm.grid({ cols: 12, gap: 6 }))}>
        <div className="col-span-8">
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}>
            <h2
              className={cm.cn(
                cm.textSize('base'),
                cm.fontWeight('medium'),
                'font-headline text-on-surface',
              )}
            >
              {t('dashboard.activeAgents', {}, { defaultValue: 'Active Agents' })}
            </h2>
            <Link
              className={cm.cn(cm.textSize('sm'), 'text-secondary font-mono hover:underline')}
              to="/agents"
            >
              {t('dashboard.viewAll', {}, { defaultValue: 'View All' })}
            </Link>
          </div>
          {loading ? (
            <p className={'font-mono text-sm text-tertiary'}>
              {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
            </p>
          ) : visibleAgents.length === 0 ? (
            <div
              className={cm.cn(
                cm.sp('py', 8),
                cm.textCenter,
                'rounded border border-dashed border-outline-variant/30 font-mono text-sm text-tertiary',
              )}
              data-mol-id="dashboard-agents-empty"
            >
              {t(
                'dashboard.noAgents',
                {},
                { defaultValue: 'No agents yet — head to Agents to start.' },
              )}
            </div>
          ) : (
            <div className={cm.cn(cm.grid({ cols: 2, gap: 4 }))}>
              {visibleAgents.map((agent) => (
                <AgentCard key={agent.id} {...agent} />
              ))}
            </div>
          )}
        </div>

        <div className={cm.cn(cm.flex({ direction: 'col' }), 'col-span-4')}>
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}>
            <h2
              className={cm.cn(
                cm.textSize('base'),
                cm.fontWeight('medium'),
                'font-headline text-on-surface',
              )}
            >
              {t('dashboard.recentRuns', {}, { defaultValue: 'Recent Runs' })}
            </h2>
          </div>
          <div
            className={cm.cn(
              cm.flex({ direction: 'col' }),
              cm.flex1,
              cm.sp('p', 4),
              'bg-surface-container-low rounded border border-outline-variant/15 space-y-2',
            )}
          >
            {recentRuns.length === 0 ? (
              <p
                className={cm.cn(cm.textSize('sm'), 'font-mono text-tertiary')}
                data-mol-id="dashboard-runs-empty"
              >
                {t('dashboard.noRuns', {}, { defaultValue: 'No recent runs.' })}
              </p>
            ) : (
              recentRuns.map((run) => (
                <Link
                  key={run.id}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('p', 3),
                    'bg-surface-container rounded hover:bg-surface-container-high transition-colors',
                    run.status === 'failed' ? 'opacity-70' : '',
                  )}
                  to={`/runs/${run.id}`}
                >
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }))}>
                    <div
                      className={cm.cn(
                        cm.w(2),
                        cm.h(2),
                        cm.roundedFull,
                        run.status === 'running'
                          ? 'bg-secondary'
                          : run.status === 'succeeded'
                            ? 'bg-emerald-500'
                            : 'bg-error',
                      )}
                    />
                    <div>
                      <div className={cm.cn(cm.textSize('xs'), 'font-mono text-on-surface')}>
                        {run.id.slice(0, 8)}
                      </div>
                      <div className={'text-[10px] text-tertiary font-headline mt-0.5'}>
                        {agentNameById.get(run.agent_id) ?? run.agent_id.slice(0, 8)}
                      </div>
                    </div>
                  </div>
                  <div className={cm.textRight}>
                    <div
                      className={cm.cn(
                        cm.textSize('xs'),
                        'font-mono tabular-nums',
                        run.status === 'failed' ? 'text-error' : 'text-on-surface',
                      )}
                    >
                      {(run.duration_ms ?? 0) > 0
                        ? `${(run.duration_ms! / 1000).toFixed(2)}s`
                        : '—'}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      <div className={cm.sp('mt', 6)}>
        <ExecutionLogPanel
          entries={log}
          live
          title={t('dashboard.liveLog', {}, { defaultValue: 'Live Execution Log' })}
        />
      </div>
    </div>
  )
}

export default Dashboard
export { Dashboard as DashboardPage }
