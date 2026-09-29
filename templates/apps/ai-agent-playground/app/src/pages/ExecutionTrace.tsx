// Pattern source: bespoke per Neuron DESIGN.md "Execution Timeline" + log panel.
// Authed run trace page — fetches /executions/:id and renders timeline + log tail.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ExecutionLogPanel, type LogEntry } from '../components/ExecutionLogPanel.js'
import { MetricCard } from '../components/MetricCard.js'
import { PageHeader } from '../components/PageHeader.js'

interface TimelineEvent {
  id: string
  type: 'start' | 'tool_call' | 'tool_result' | 'finish' | 'error'
  label: string
  timestamp: string
  durationMs?: number
  metadata?: Record<string, unknown>
}

interface ExecutionDetail {
  id: string
  agent_id: string
  status?: string
  duration_ms?: number
  total_tokens?: number
  token_count?: number
  total_cost_cents?: number
  started_at?: string
  finished_at?: string
  output?: string
  input?: string
  timeline?: TimelineEvent[]
}

const STATUS_DOT: Record<string, string> = {
  start: 'bg-secondary',
  tool_call: 'bg-primary',
  tool_result: 'bg-emerald-500',
  finish: 'bg-emerald-500',
  error: 'bg-error',
}

export function ExecutionTrace() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [execution, setExecution] = useState<ExecutionDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const res = await http.get<ExecutionDetail>(`/executions/${id}`)
      setExecution(res.data ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [http, id])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // eslint-disable-next-line react-hooks/exhaustive-deps -- timeline ?? [] creates a new array ref each render; useMemo dep identity is stable enough for this read-only display
  const timeline = execution?.timeline ?? []
  const tokens = execution?.total_tokens ?? execution?.token_count ?? 0
  const durationSeconds = execution?.duration_ms
    ? (execution.duration_ms / 1000).toFixed(2)
    : '0.00'
  const cost = execution?.total_cost_cents
    ? (execution.total_cost_cents / 100).toFixed(4)
    : '0.0000'

  const log: LogEntry[] = useMemo(
    () =>
      timeline.map((event) => ({
        timestamp: event.timestamp
          ? new Date(event.timestamp).toISOString().slice(11, 19)
          : '00:00:00',
        level: event.type === 'error' ? 'WARN' : event.type === 'finish' ? 'SUCCESS' : 'INFO',
        message: event.label,
      })),
    [timeline],
  )

  const startedLabel = execution?.started_at
    ? new Date(execution.started_at).toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
    : '—'

  return (
    <div data-mol-id="page-execution-trace">
      <PageHeader
        subtitle={t(
          'executionTrace.subtitle',
          { agent: execution?.agent_id?.slice(0, 8) ?? id ?? '' },
          { defaultValue: 'Replay every step of agent {{agent}}.' },
        )}
        title={t(
          'executionTrace.title',
          { id: id?.slice(0, 8) ?? 'run' },
          { defaultValue: 'Run · {{id}}' },
        )}
      />

      {error && (
        <p
          className={cm.cn(cm.sp('mb', 4), cm.textSize('sm'), 'text-error font-mono')}
          data-mol-id="execution-trace-error"
          role="alert"
        >
          {error}
        </p>
      )}

      <div className={cm.cn(cm.grid({ cols: 4, gap: 4 }), cm.sp('mb', 6))}>
        <MetricCard
          label={t('form.duration', {}, { defaultValue: 'Duration' })}
          unit={t('executionTrace.unitSeconds', {}, { defaultValue: 's' })}
          value={durationSeconds}
        />
        <MetricCard
          label={t('executionTrace.steps', {}, { defaultValue: 'Steps' })}
          value={String(timeline.length)}
        />
        <MetricCard
          label={t('executionTrace.tokens', {}, { defaultValue: 'Tokens' })}
          value={tokens.toLocaleString()}
        />
        <MetricCard
          label={t('executionTrace.cost', {}, { defaultValue: 'Cost' })}
          value={`$${cost}`}
        />
      </div>

      <div className={cm.cn(cm.grid({ cols: 12, gap: 6 }))}>
        <aside className="col-span-3" data-mol-id="execution-trace-run-info">
          <div
            className={cm.cn(
              cm.sp('p', 4),
              'bg-surface-container-low rounded border border-outline-variant/15',
            )}
          >
            <h2
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                cm.sp('mb', 3),
                'font-headline text-on-surface',
              )}
            >
              {t('executionTrace.runInfo', {}, { defaultValue: 'Run Info' })}
            </h2>
            <div className={cm.stack(3)}>
              <div>
                <span
                  className={
                    'block text-[10px] text-on-surface-variant uppercase tracking-wider mb-1'
                  }
                >
                  {t('executionTrace.fieldAgent', {}, { defaultValue: 'Agent' })}
                </span>
                <Link
                  className={cm.cn(
                    cm.textSize('xs'),
                    'font-mono text-primary hover:underline truncate block',
                  )}
                  data-mol-id="execution-trace-agent-link"
                  to={`/agents/${execution?.agent_id ?? ''}`}
                >
                  {execution?.agent_id?.slice(0, 8) ?? id?.slice(0, 8) ?? '—'}
                </Link>
              </div>
              <div>
                <span
                  className={
                    'block text-[10px] text-on-surface-variant uppercase tracking-wider mb-1'
                  }
                >
                  {t('runs.col.startedAt', {}, { defaultValue: 'Started' })}
                </span>
                <span className={cm.cn(cm.textSize('xs'), 'font-mono text-on-surface break-all')}>
                  {startedLabel}
                </span>
              </div>
              <div>
                <span
                  className={
                    'block text-[10px] text-on-surface-variant uppercase tracking-wider mb-1'
                  }
                >
                  {t('nav.status', {}, { defaultValue: 'Status' })}
                </span>
                <span
                  className={cm.cn(
                    cm.sp('px', 2),
                    cm.sp('py', 1),
                    cm.textSize('xs'),
                    'font-mono uppercase tracking-wider rounded border bg-surface-container',
                    execution?.status === 'failed'
                      ? 'text-error border-error/40'
                      : 'text-success border-emerald-500/40',
                  )}
                >
                  {execution?.status ?? '—'}
                </span>
              </div>
            </div>
          </div>
        </aside>

        <section className="col-span-4">
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.sp('mb', 3),
              'font-mono uppercase tracking-wider text-tertiary',
            )}
          >
            {t('executionTrace.timeline', {}, { defaultValue: 'Step Timeline' })}
          </h2>
          {loading ? (
            <p className={'font-mono text-sm text-tertiary'} data-mol-id="execution-trace-loading">
              {t('executionTrace.loading', {}, { defaultValue: 'Loading trace…' })}
            </p>
          ) : timeline.length === 0 ? (
            <p
              className={cm.cn('font-mono text-sm text-tertiary', cm.sp('py', 6))}
              data-mol-id="execution-trace-empty"
            >
              {t('executionTrace.noEvents', {}, { defaultValue: 'No timeline events recorded.' })}
            </p>
          ) : (
            <ol
              className={cm.cn(
                cm.sp('p', 4),
                'bg-surface-container-low rounded border border-outline-variant/15 space-y-3',
              )}
            >
              {timeline.map((event, idx) => (
                <li
                  key={event.id}
                  className={cm.cn(
                    cm.flex({ align: 'start', gap: 3 }),
                    cm.sp('p', 3),
                    'bg-surface-container rounded',
                  )}
                  data-mol-id="execution-trace-step"
                >
                  <div className={cm.cn(cm.flex({ direction: 'col', align: 'center' }), 'pt-1')}>
                    <span
                      className={cm.cn(
                        cm.w(2),
                        cm.h(2),
                        cm.roundedFull,
                        STATUS_DOT[event.type] ?? STATUS_DOT.start,
                      )}
                    />
                    {idx < timeline.length - 1 && (
                      <span className={'w-px h-12 bg-outline-variant/30 mt-2'} />
                    )}
                  </div>
                  <div className={cm.flex1}>
                    <div
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'between' }),
                        cm.sp('mb', 1),
                      )}
                    >
                      <span
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.fontWeight('semibold'),
                          'font-mono text-on-surface',
                        )}
                      >
                        {event.label}
                      </span>
                      <span className="font-mono text-[10px] text-tertiary tabular-nums">
                        {event.durationMs !== undefined ? `${event.durationMs}ms` : ''}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
        <aside className="col-span-5">
          <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }), cm.sp('mb', 3))}>
            <span
              className={cm.cn(
                cm.w(5),
                cm.h(5),
                cm.flex({ align: 'center', justify: 'center' }),
                'rounded bg-surface-container-highest text-tertiary',
              )}
            >
              <span className="material-symbols-outlined text-[14px]">terminal</span>
            </span>
            <h2
              className={cm.cn(
                cm.textSize('xs'),
                'font-mono uppercase tracking-wider text-tertiary',
              )}
            >
              {t('executionTrace.systemLogs', {}, { defaultValue: 'System Logs' })}
            </h2>
          </div>
          <ExecutionLogPanel entries={log} />
        </aside>
      </div>
    </div>
  )
}

export default ExecutionTrace
