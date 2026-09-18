// Pattern source: bespoke — Neuron run-history table over BotAnalyticsRecentConversationsTable.
// Authed dense table — status dot, mono run id, agent, duration, tokens, ago. Bound to /executions.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { MetricCard } from '../components/MetricCard.js'
import { PageHeader } from '../components/PageHeader.js'

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
}

interface AgentRow {
  id: string
  name?: string
}

const STATUS_DOT: Record<string, string> = {
  succeeded: 'bg-emerald-500',
  failed: 'bg-error',
  running: 'bg-secondary animate-pulse',
}

function formatRelative(iso?: string): string {
  if (!iso) return '—'
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 60_000) return `${Math.max(1, Math.floor(ms / 1000))}s ago`
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`
  return `${Math.floor(ms / 86_400_000)}d ago`
}

export function RunHistory() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [rows, setRows] = useState<ExecutionRow[]>([])
  const [agents, setAgents] = useState<AgentRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [liveTail, setLiveTail] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [execRes, agentsRes] = await Promise.all([
        http.get<ExecutionRow[]>('/executions'),
        http.get<AgentRow[]>('/agents'),
      ])
      setRows(Array.isArray(execRes.data) ? execRes.data : [])
      setAgents(Array.isArray(agentsRes.data) ? agentsRes.data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [http])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!liveTail) return
    const id = setInterval(() => {
      void refresh()
    }, 5000)
    return () => clearInterval(id)
  }, [liveTail, refresh])

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

  const cutoff = Date.now() - 24 * 60 * 60 * 1000
  const last24h = rows.filter(
    (row) => row.started_at && new Date(row.started_at).getTime() >= cutoff,
  )
  const succeeded = last24h.filter((row) => row.status === 'succeeded').length
  const successRate = last24h.length ? ((succeeded / last24h.length) * 100).toFixed(1) : '0.0'
  const durations = last24h.map((row) => row.duration_ms ?? 0).filter((d) => d > 0)
  const avgDuration = durations.length
    ? (durations.reduce((acc, n) => acc + n, 0) / durations.length / 1000).toFixed(2)
    : '0.00'
  const totalTokens = last24h.reduce(
    (acc, row) => acc + (row.total_tokens ?? row.token_count ?? 0),
    0,
  )

  return (
    <div data-mol-id="page-run-history">
      <PageHeader
        actions={
          <button
            aria-pressed={liveTail}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.textSize('xs'),
              cm.flex({ align: 'center', gap: 2 }),
              'rounded border font-mono uppercase tracking-wider transition-colors',
              liveTail
                ? 'border-secondary bg-secondary/10 text-secondary'
                : 'border-secondary/40 text-secondary hover:bg-secondary/10',
            )}
            data-mol-id="run-history-live-tail"
            onClick={() => setLiveTail((on) => !on)}
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">
              {liveTail ? 'pause_circle' : 'play_circle'}
            </span>
            {liveTail
              ? t('runHistory.pauseTail', {}, { defaultValue: 'Pause Tail' })
              : t('runHistory.liveTail', {}, { defaultValue: 'Live Tail' })}
          </button>
        }
        subtitle={t(
          'runHistory.subtitle',
          {},
          { defaultValue: 'Every agent invocation across the workspace, latest first.' },
        )}
        title={t('runHistory.title', {}, { defaultValue: 'Run History' })}
      />

      {error && (
        <p
          className={cm.cn(cm.sp('mb', 4), cm.textSize('sm'), 'text-error font-mono')}
          data-mol-id="run-history-error"
          role="alert"
        >
          {error}
        </p>
      )}

      <div className={cm.cn(cm.grid({ cols: 4, gap: 4 }), cm.sp('mb', 6))}>
        <MetricCard
          label={t('runHistory.runs24h', {}, { defaultValue: 'Runs (24h)' })}
          value={String(last24h.length)}
        />
        <MetricCard
          label={t('runHistory.successRate', {}, { defaultValue: 'Success Rate' })}
          unit="%"
          value={successRate}
        />
        <MetricCard
          label={t('runHistory.avgDuration', {}, { defaultValue: 'Avg Duration' })}
          unit={t('runHistory.unitSeconds', {}, { defaultValue: 's' })}
          value={avgDuration}
        />
        <MetricCard
          label={t('runHistory.tokens24h', {}, { defaultValue: 'Tokens (24h)' })}
          value={totalTokens.toLocaleString()}
        />
      </div>

      <div
        className={cm.cn(
          'bg-surface-container-low rounded border border-outline-variant/15 overflow-hidden',
        )}
      >
        {loading ? (
          <p
            className={cm.cn(cm.sp('py', 12), cm.textCenter, 'font-mono text-sm text-tertiary')}
            data-mol-id="run-history-loading"
          >
            {t('runHistory.loading', {}, { defaultValue: 'Loading runs…' })}
          </p>
        ) : rows.length === 0 ? (
          <p
            className={cm.cn(cm.sp('py', 12), cm.textCenter, 'font-mono text-sm text-tertiary')}
            data-mol-id="run-history-empty"
          >
            {t('runHistory.empty', {}, { defaultValue: 'No runs yet — invoke an agent.' })}
          </p>
        ) : (
          <table className={cm.cn(cm.w('full'), cm.textSize('sm'))}>
            <thead>
              <tr
                className={
                  'bg-surface-container-highest border-b border-outline-variant/15 text-left'
                }
              >
                <th
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'font-mono text-[10px] text-tertiary uppercase tracking-widest',
                  )}
                >
                  {t('runHistory.col.id', {}, { defaultValue: 'Run' })}
                </th>
                <th
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'font-mono text-[10px] text-tertiary uppercase tracking-widest',
                  )}
                >
                  {t('runHistory.col.agent', {}, { defaultValue: 'Agent' })}
                </th>
                <th
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'font-mono text-[10px] text-tertiary uppercase tracking-widest text-right',
                  )}
                >
                  {t('form.duration', {}, { defaultValue: 'Duration' })}
                </th>
                <th
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'font-mono text-[10px] text-tertiary uppercase tracking-widest text-right',
                  )}
                >
                  {t('runHistory.col.tokens', {}, { defaultValue: 'Tokens' })}
                </th>
                <th
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'font-mono text-[10px] text-tertiary uppercase tracking-widest text-right',
                  )}
                >
                  {t('form.when', {}, { defaultValue: 'When' })}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((run) => {
                const dot = STATUS_DOT[run.status ?? ''] ?? STATUS_DOT.running
                const tokens = run.total_tokens ?? run.token_count ?? 0
                return (
                  <tr
                    key={run.id}
                    className={
                      'border-b border-outline-variant/10 hover:bg-surface-container transition-colors'
                    }
                    data-mol-id="run-history-row"
                  >
                    <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                      <Link
                        className={cm.cn(cm.flex({ align: 'center', gap: 3 }), 'group')}
                        to={`/runs/${run.id}`}
                      >
                        <span className={cm.cn(cm.w(2), cm.h(2), cm.roundedFull, dot)} />
                        <span
                          className={
                            'font-mono text-on-surface group-hover:text-primary transition-colors'
                          }
                        >
                          {run.id.slice(0, 8)}
                        </span>
                      </Link>
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 3),
                        'font-headline text-on-surface',
                      )}
                    >
                      {agentNameById.get(run.agent_id) ?? run.agent_id.slice(0, 8)}
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 3),
                        'font-mono tabular-nums text-right text-on-surface',
                      )}
                    >
                      {(run.duration_ms ?? 0) > 0
                        ? `${(run.duration_ms! / 1000).toFixed(2)}s`
                        : '—'}
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 3),
                        'font-mono tabular-nums text-right text-tertiary',
                      )}
                    >
                      {tokens.toLocaleString()}
                    </td>
                    <td
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 3),
                        'font-mono text-right text-tertiary text-[11px] uppercase tracking-wider',
                      )}
                    >
                      {formatRelative(run.started_at)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default RunHistory
