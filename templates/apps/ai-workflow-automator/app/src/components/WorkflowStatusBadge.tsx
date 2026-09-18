/**
 * Pill-shaped status badge keyed to Dendrite's run-state palette
 * (running/cyan, completed/green, failed/red, queued/amber, paused/gray,
 * skipped/slate). Running variant has a pulsing dot per DESIGN.md.
 *
 * Translated from helpdesk-ticketing's TicketStatusPill.tsx, retuned to the
 * Dendrite semantic palette with mono-font pulsing dot.
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type RunStatus = 'running' | 'completed' | 'failed' | 'queued' | 'paused' | 'skipped'

interface StatusVisuals {
  bg: string
  text: string
  dot: string
  defaultLabel: string
}

const VISUALS: Record<RunStatus, StatusVisuals> = {
  running: {
    bg: 'var(--color-run-running-bg)',
    text: 'var(--color-run-running-fg)',
    dot: 'var(--color-run-running-dot)',
    defaultLabel: 'Running',
  },
  completed: {
    bg: 'var(--color-run-completed-bg)',
    text: 'var(--color-run-completed-fg)',
    dot: 'var(--color-run-completed-dot)',
    defaultLabel: 'Completed',
  },
  failed: {
    bg: 'var(--color-run-failed-bg)',
    text: 'var(--color-run-failed-fg)',
    dot: 'var(--color-run-failed-dot)',
    defaultLabel: 'Failed',
  },
  queued: {
    bg: 'var(--color-run-queued-bg)',
    text: 'var(--color-run-queued-fg)',
    dot: 'var(--color-run-queued-dot)',
    defaultLabel: 'Queued',
  },
  paused: {
    bg: 'var(--color-run-paused-bg)',
    text: 'var(--color-run-paused-fg)',
    dot: 'var(--color-run-paused-dot)',
    defaultLabel: 'Paused',
  },
  skipped: {
    bg: 'var(--color-run-skipped-bg)',
    text: 'var(--color-run-skipped-fg)',
    dot: 'var(--color-run-skipped-dot)',
    defaultLabel: 'Skipped',
  },
}

interface WorkflowStatusBadgeProps {
  status: RunStatus
  /** Override the displayed text. Defaults to the i18n label for the status. */
  label?: string
  size?: 'sm' | 'md'
}

export function WorkflowStatusBadge({ status, label, size = 'md' }: WorkflowStatusBadgeProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const v = VISUALS[status]
  const text = label ?? t(`workflowStatusBadge.${status}`, {}, { defaultValue: v.defaultLabel })

  return (
    <span
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'xs' }),
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-[11px]',
        cm.fontWeight('bold'),
        'rounded-full uppercase tracking-widest whitespace-nowrap',
      )}
      style={{ background: v.bg, color: v.text }}
    >
      <span
        className={status === 'running' ? 'pulse-dot rounded-full' : 'rounded-full'}
        style={{
          width: size === 'sm' ? 5 : 6,
          height: size === 'sm' ? 5 : 6,
          background: v.dot,
          display: 'inline-block',
        }}
        aria-hidden
      />
      {text}
    </span>
  )
}
