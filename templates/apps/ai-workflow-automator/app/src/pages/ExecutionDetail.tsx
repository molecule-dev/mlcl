/**
 * ExecutionDetail — single-run forensic view: header bar with status,
 * KPI tiles, step timeline, input/output JSON dumps, and the dark log panel.
 *
 * Data source: GET /api/runs/:id returns the run + parsed step_results
 * + workflow_name. The "Replay" button POSTs /api/workflows/:wf_id/trigger
 * to start a fresh run.
 */
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ExecutionLogPanel, type LogEntry } from '../components/ExecutionLogPanel.js'
import { WorkflowAppShell } from '../components/WorkflowAppShell.js'
import { WorkflowStatCard } from '../components/WorkflowStatCard.js'
import { type RunStatus, WorkflowStatusBadge } from '../components/WorkflowStatusBadge.js'

interface StepResult {
  step_id?: string
  type: string
  status: string
  output?: string
  error?: string
}

interface RunDetail {
  id: string
  workflow_id: string
  workflow_name?: string
  trigger_source: string
  status: string
  started_at: string | null
  finished_at: string | null
  step_results: StepResult[]
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

function durationLabel(start: string | null, end: string | null): string {
  if (!start || !end) return '—'
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (ms < 0) return '—'
  if (ms < 1000) return `${ms} ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function stepIcon(type: string): string {
  if (type === 'http') return 'language'
  if (type === 'ai') return 'psychology'
  if (type === 'email') return 'mail'
  if (type === 'condition') return 'rule'
  return 'bolt'
}

function stepKind(type: string): 'trigger' | 'condition' | 'action' {
  if (type === 'condition') return 'condition'
  return 'action'
}

function buildLog(run: RunDetail): LogEntry[] {
  const entries: LogEntry[] = []
  if (run.started_at) {
    entries.push({
      ts: run.started_at,
      level: 'info',
      step: 'run',
      message: `Run ${run.id.slice(0, 12)} started via ${run.trigger_source}.`,
    })
  }
  for (const step of run.step_results) {
    const ts = run.finished_at ?? run.started_at ?? new Date().toISOString()
    if (step.status === 'success') {
      entries.push({
        ts,
        level: 'success',
        step: step.type,
        message: step.output ? String(step.output).slice(0, 200) : `${step.type} step succeeded`,
      })
    } else if (step.status === 'failure') {
      entries.push({
        ts,
        level: 'error',
        step: step.type,
        message: step.error ?? `${step.type} step failed`,
      })
    } else {
      entries.push({
        ts,
        level: 'info',
        step: step.type,
        message: `${step.type} ${step.status}`,
      })
    }
  }
  if (run.finished_at) {
    entries.push({
      ts: run.finished_at,
      level: run.status === 'failure' || run.status === 'failed' ? 'error' : 'success',
      step: 'run',
      message: `Run finished with status ${run.status}.`,
    })
  }
  return entries
}

export function ExecutionDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const params = useParams<{ id: string }>()
  const navigate = useNavigate()
  const http = useHttpClient()
  const runId = params.id ?? ''
  const [run, setRun] = useState<RunDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [replaying, setReplaying] = useState(false)
  const [replayMessage, setReplayMessage] = useState<string | null>(null)
  const [reloadCounter, setReloadCounter] = useState(0)

  useEffect(() => {
    if (!runId) return
    let cancelled = false
    setRun(null)
    setError(null)
    http
      .get<RunDetail>(`/api/runs/${runId}`)
      .then((res) => {
        if (cancelled) return
        const body = res.data
        if (body) {
          setRun({
            ...body,
            step_results: Array.isArray(body.step_results) ? body.step_results : [],
          })
        } else {
          setError(t('executionDetail.notFound', {}, { defaultValue: 'Run not found.' }))
        }
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(
          e instanceof Error
            ? e.message
            : t('executionDetail.error', {}, { defaultValue: 'Could not load this run.' }),
        )
      })
    return () => {
      cancelled = true
    }
  }, [http, runId, t, reloadCounter])

  const handleReplay = useCallback(async () => {
    if (!run) return
    setReplaying(true)
    setReplayMessage(null)
    try {
      const res = await http.post<{ id?: string }>(`/api/workflows/${run.workflow_id}/trigger`, {})
      const newId = res.data?.id
      if (newId) {
        navigate(`/executions/${newId}`)
      } else {
        setReplayMessage(t('executionDetail.replayQueued', {}, { defaultValue: 'Replay queued.' }))
        setReloadCounter((n) => n + 1)
      }
    } catch (e) {
      setReplayMessage(
        e instanceof Error
          ? e.message
          : t('executionDetail.replayFailed', {}, { defaultValue: 'Replay failed.' }),
      )
    } finally {
      setReplaying(false)
    }
  }, [run, http, navigate, t])

  if (!runId) {
    return (
      <WorkflowAppShell
        pageId="execution-detail"
        title={t('executionDetail.title', {}, { defaultValue: 'Run forensics' })}
      >
        <p className={cm.cn(cm.sp('p', 8), cm.textCenter, cm.textMuted)}>
          {t('executionDetail.missingId', {}, { defaultValue: 'No run id in the URL.' })}
        </p>
      </WorkflowAppShell>
    )
  }

  if (error && !run) {
    return (
      <WorkflowAppShell
        pageId="execution-detail"
        title={t('executionDetail.title', {}, { defaultValue: 'Run forensics' })}
      >
        <div
          role="alert"
          data-mol-id="executiondetail-error"
          className={cm.cn(cm.sp('p', 4), cm.textSize('sm'), 'rounded-xl')}
          style={{
            background: 'var(--color-status-error-bg)',
            color: 'var(--color-status-error-fg)',
          }}
        >
          {error}
        </div>
        <Link
          to="/executions"
          className={cm.cn(
            cm.sp('mt', 4),
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'inline-block',
          )}
          style={{ color: 'var(--color-accent-violet)' }}
        >
          {t('executionDetail.backToList', {}, { defaultValue: 'Back to executions' })}
        </Link>
      </WorkflowAppShell>
    )
  }

  if (!run) {
    return (
      <WorkflowAppShell
        pageId="execution-detail"
        title={t('executionDetail.title', {}, { defaultValue: 'Run forensics' })}
      >
        <div
          className={cm.cn(cm.sp('p', 12), cm.textCenter, cm.textMuted)}
          data-mol-id="executiondetail-loading"
        >
          {t('executionDetail.loading', {}, { defaultValue: 'Loading run…' })}
        </div>
      </WorkflowAppShell>
    )
  }

  const finishedSteps = run.step_results.filter(
    (s) => s.status === 'success' || s.status === 'failure',
  )
  const log = buildLog(run)

  return (
    <WorkflowAppShell
      pageId="execution-detail"
      eyebrow={t('executionDetail.eyebrow', {}, { defaultValue: 'Run forensics' })}
      title={run.workflow_name ?? t('executionDetail.title', {}, { defaultValue: 'Run forensics' })}
      description={t(
        'executionDetail.description',
        {},
        { defaultValue: 'Step-by-step execution trace with input, output, and log evidence.' },
      )}
      actions={
        <>
          <Link
            to="/executions"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'rounded-full uppercase tracking-widest',
            )}
            style={{
              background: 'var(--color-surface)',
              color: 'var(--color-foreground-secondary)',
              border: '1px solid var(--color-border)',
            }}
          >
            <span className={'material-symbols-outlined text-base'}>arrow_back</span>
            {t('executionDetail.back', {}, { defaultValue: 'All runs' })}
          </Link>
          <button
            type="button"
            onClick={() => void handleReplay()}
            disabled={replaying}
            data-mol-id="executiondetail-replay"
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
              boxShadow:
                '0 4px 12px color-mix(in srgb, var(--color-node-trigger) 30%, transparent)',
              opacity: replaying ? 0.7 : 1,
            }}
          >
            <span className={'material-symbols-outlined text-lg'}>refresh</span>
            {replaying
              ? t('executionDetail.replaying', {}, { defaultValue: 'Queueing…' })
              : t('executionDetail.replay', {}, { defaultValue: 'Replay' })}
          </button>
        </>
      }
    >
      {replayMessage && (
        <div
          role="status"
          data-mol-id="executiondetail-replay-message"
          className={cm.cn(cm.sp('p', 3), cm.sp('mb', 4), cm.textSize('sm'), 'rounded-xl')}
          style={{
            background: 'var(--color-surface-hover)',
            color: 'var(--color-feedback-success-text)',
          }}
        >
          {replayMessage}
        </div>
      )}

      {/* Run header card */}
      <div
        className={cm.cn(cm.sp('p', 6), cm.sp('mb', 6), 'rounded-2xl')}
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }))}>
          <WorkflowStatusBadge status={statusToRunStatus(run.status)} size="md" />
          <div
            className={'font-mono text-sm'}
            style={{ color: 'var(--color-foreground-secondary)' }}
          >
            {run.id}
          </div>
          {run.started_at && (
            <div
              className={cm.textSize('sm')}
              style={{ color: 'var(--color-foreground-secondary)' }}
            >
              ·{' '}
              {t(
                'executionDetail.startedAt',
                { when: new Date(run.started_at).toUTCString() },
                { defaultValue: 'Started {{when}}' },
              )}
            </div>
          )}
        </div>
      </div>

      {/* KPI strip */}
      <div
        className={cm.cn(
          cm.grid({ gap: 'md', cols: 4 }),
          cm.sp('mb', 8),
          'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
        )}
      >
        <WorkflowStatCard
          label={t('executionDetail.kpi.duration', {}, { defaultValue: 'Total duration' })}
          value={durationLabel(run.started_at, run.finished_at)}
          icon="timer"
          accent="var(--color-node-condition)"
        />
        <WorkflowStatCard
          label={t('executionDetail.kpi.steps', {}, { defaultValue: 'Steps executed' })}
          value={`${finishedSteps.length} / ${run.step_results.length}`}
          icon="account_tree"
          accent="var(--color-node-trigger)"
        />
        <WorkflowStatCard
          label={t('executionDetail.kpi.trigger', {}, { defaultValue: 'Trigger source' })}
          value={run.trigger_source}
          icon="bolt"
          accent="var(--color-node-action)"
        />
        <WorkflowStatCard
          label={t('executionDetail.kpi.status', {}, { defaultValue: 'Final status' })}
          value={run.status}
          icon={
            run.status === 'failure' || run.status === 'failed'
              ? 'error'
              : run.status === 'success' || run.status === 'completed'
                ? 'check_circle'
                : 'pending'
          }
          accent="var(--color-run-queued-dot)"
        />
      </div>

      {/* Two-column: step timeline + side IO */}
      <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-3', cm.sp('mb', 8))}>
        {/* Step timeline */}
        <div className={'lg:col-span-2'}>
          <SectionTitle
            eyebrow={t('executionDetail.section.steps', {}, { defaultValue: 'Step-by-step' })}
          />
          {run.step_results.length === 0 ? (
            <p
              className={cm.cn(cm.textSize('sm'), cm.textMuted, cm.sp('p', 4), 'rounded-xl')}
              style={{ background: 'var(--color-background-secondary)' }}
              data-mol-id="executiondetail-no-steps"
            >
              {t(
                'executionDetail.noSteps',
                {},
                { defaultValue: 'This run had no steps recorded.' },
              )}
            </p>
          ) : (
            <ol className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
              {run.step_results.map((step, i) => (
                <li
                  key={step.step_id ?? i}
                  className={cm.cn(
                    cm.flex({ align: 'start', gap: 'md' }),
                    cm.sp('p', 4),
                    'rounded-2xl',
                  )}
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      'rounded-xl flex-shrink-0',
                    )}
                    style={{
                      width: 40,
                      height: 40,
                      background:
                        stepKind(step.type) === 'condition'
                          ? 'var(--color-node-condition)'
                          : step.status === 'failure'
                            ? 'var(--color-run-failed-dot)'
                            : 'var(--color-node-action)',
                    }}
                  >
                    <span
                      className={'material-symbols-outlined text-xl'}
                      style={{ color: 'white', fontVariationSettings: "'FILL' 1" }}
                    >
                      {stepIcon(step.type)}
                    </span>
                  </div>
                  <div className={'flex-1 min-w-0'}>
                    <div
                      className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'sm' }))}
                    >
                      <div className={cm.cn(cm.fontWeight('bold'), cm.textSize('base'))}>
                        {t(
                          'executionDetail.stepName',
                          { type: step.type, n: i + 1 },
                          { defaultValue: 'Step {{n}} · {{type}}' },
                        )}
                      </div>
                      <WorkflowStatusBadge status={statusToRunStatus(step.status)} size="sm" />
                    </div>
                    {step.output && (
                      <div className={cm.cn(cm.textSize('xs'), 'font-mono mt-1', cm.textMuted)}>
                        {String(step.output).slice(0, 200)}
                      </div>
                    )}
                    {step.error && (
                      <div
                        className={cm.cn(cm.textSize('xs'), 'font-mono mt-1')}
                        style={{ color: 'var(--color-status-error-fg)' }}
                      >
                        {step.error}
                      </div>
                    )}
                    <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mt', 2))}>
                      <span
                        className={cm.cn(
                          cm.textSize('xs'),
                          'uppercase tracking-widest',
                          cm.fontWeight('bold'),
                        )}
                        style={{ color: 'var(--color-foreground-secondary)' }}
                      >
                        {stepKind(step.type)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Run-meta panels */}
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
          <SectionTitle
            eyebrow={t('executionDetail.section.meta', {}, { defaultValue: 'Run metadata' })}
          />
          <pre
            className={cm.cn(
              cm.sp('p', 4),
              'rounded-xl text-xs font-mono leading-relaxed overflow-x-auto',
            )}
            style={{
              background: 'var(--color-background-secondary)',
              color: 'var(--color-foreground)',
              border: '1px solid var(--color-border)',
            }}
          >
            {JSON.stringify(
              {
                run_id: run.id,
                workflow_id: run.workflow_id,
                trigger_source: run.trigger_source,
                started_at: run.started_at,
                finished_at: run.finished_at,
                status: run.status,
              },
              null,
              2,
            )}
          </pre>
          <SectionTitle
            eyebrow={t('executionDetail.section.output', {}, { defaultValue: 'Step outputs' })}
          />
          <pre
            className={cm.cn(
              cm.sp('p', 4),
              'rounded-xl text-xs font-mono leading-relaxed overflow-x-auto',
            )}
            style={{
              background: 'var(--color-surface-hover)',
              color: 'var(--color-feedback-success-text)',
              border: '1px solid var(--color-feedback-success-border)',
            }}
          >
            {JSON.stringify(run.step_results, null, 2)}
          </pre>
        </div>
      </div>

      {/* Log panel */}
      <SectionTitle
        eyebrow={t('executionDetail.section.log', {}, { defaultValue: 'Execution log' })}
      />
      {log.length === 0 ? (
        <p
          className={cm.cn(cm.textSize('sm'), cm.textMuted, cm.sp('p', 4), 'rounded-xl')}
          style={{ background: 'var(--color-background-secondary)' }}
          data-mol-id="executiondetail-no-log"
        >
          {t('executionDetail.noLog', {}, { defaultValue: 'No log entries yet.' })}
        </p>
      ) : (
        <ExecutionLogPanel entries={log} />
      )}
    </WorkflowAppShell>
  )
}

function SectionTitle({ eyebrow }: { eyebrow: string }) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.textSize('xs'),
        cm.fontWeight('bold'),
        'uppercase tracking-widest',
        cm.sp('mb', 3),
      )}
      style={{ color: 'var(--color-secondary)' }}
    >
      {eyebrow}
    </div>
  )
}

export default ExecutionDetail
