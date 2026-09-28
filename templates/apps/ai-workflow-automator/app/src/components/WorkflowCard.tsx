/**
 * Workflow list item — status accent stripe (left edge), name + trigger eyebrow,
 * last-run timestamp, run-count + success-rate footer with mini histogram.
 *
 * Translated from project-management's KanbanCard.tsx + personal-finance's
 * AccountRecentTransactions row treatment, retuned to Dendrite's purple/cyan.
 */
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { type RunStatus, WorkflowStatusBadge } from './WorkflowStatusBadge.js'

export interface WorkflowSummary {
  id: string
  name: string
  triggerLabel: string
  triggerIcon: string
  status: RunStatus
  lastRunRelative: string
  runCount: number
  successRate: number
  /** Last ~12 runs as a 0–1 success share for the mini histogram. */
  recentRuns?: number[]
}

interface WorkflowCardProps {
  workflow: WorkflowSummary
}

const STATUS_BORDER: Record<RunStatus, string> = {
  running: 'var(--color-run-running-dot)',
  completed: 'var(--color-run-completed-dot)',
  failed: 'var(--color-run-failed-dot)',
  queued: 'var(--color-run-queued-dot)',
  paused: 'var(--color-run-paused-dot)',
  skipped: 'var(--color-run-skipped-dot)',
}

export function WorkflowCard({ workflow }: WorkflowCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const accent = STATUS_BORDER[workflow.status]
  const runs = workflow.recentRuns ?? []

  return (
    <Link
      to={`/workflows/${workflow.id}`}
      className={cm.cn(
        cm.flex({ direction: 'col', gap: 'sm' }),
        cm.sp('p', 5),
        cm.accentCard({ tone: 'custom' }),
        'rounded-xl bg-surface shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md group',
      )}
      style={{
        border: '1px solid var(--color-border)',
        // The status accent bar (DESIGN.md → "Accent bars") reads this variable.
        ['--mol-accent' as string]: accent,
      }}
    >
      <div className={cm.cn(cm.flex({ align: 'start', justify: 'between', gap: 'sm' }))}>
        <div className={'min-w-0 flex-1'}>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.accentCardLabel({ tone: 'custom' }),
              cm.sp('mb', 1),
            )}
          >
            <span className={cm.cn('material-symbols-outlined', cm.textSize('sm'))}>
              {workflow.triggerIcon}
            </span>
            {workflow.triggerLabel}
          </div>
          <h3
            className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'), 'truncate')}
            style={{ color: 'var(--color-foreground)' }}
          >
            {workflow.name}
          </h3>
        </div>
        <WorkflowStatusBadge status={workflow.status} size="sm" />
      </div>

      <div
        className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.textSize('xs'), cm.textMuted)}
      >
        <span className={cm.cn('material-symbols-outlined', cm.textSize('sm'))}>schedule</span>
        {t(
          'workflowCard.lastRun',
          { when: workflow.lastRunRelative },
          { defaultValue: 'Last run {{when}}' },
        )}
      </div>

      {/* Sparkline mini-histogram */}
      {runs.length > 0 && (
        <div className={cm.cn(cm.flex({ align: 'end', gap: 'xs' }), 'h-8 mt-1')}>
          {runs.map((value, i) => (
            <span
              key={i}
              className={'rounded-sm flex-1 transition-all group-hover:opacity-90'}
              style={{
                height: `${Math.max(8, Math.round(value * 100))}%`,
                background:
                  value > 0.95
                    ? 'var(--color-run-completed-dot)'
                    : value > 0.5
                      ? 'var(--color-run-running-dot)'
                      : 'var(--color-run-failed-dot)',
                opacity: 0.7,
              }}
            />
          ))}
        </div>
      )}

      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('pt', 3),
          cm.textSize('xs'),
        )}
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        <span className={cm.textMuted}>
          {t('workflowCard.runs', { count: workflow.runCount }, { defaultValue: '{{count}} runs' })}
        </span>
        <span
          className={cm.fontWeight('bold')}
          style={{
            color:
              workflow.successRate >= 95
                ? 'var(--color-run-completed-dot)'
                : workflow.successRate >= 80
                  ? 'var(--color-primary)'
                  : 'var(--color-run-failed-dot)',
          }}
        >
          {t(
            'workflowCard.success',
            { rate: workflow.successRate },
            { defaultValue: '{{rate}}% success' },
          )}
        </span>
      </div>
    </Link>
  )
}
