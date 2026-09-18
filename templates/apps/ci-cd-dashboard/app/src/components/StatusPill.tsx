import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Pipeline status pill — bold uppercase tracking-widest tag with a left
 * status dot, frosted bg keyed to the pipeline state, and a pulsing dot
 * for `running`. Used on pipeline rows, sample cards, stage headers, and
 * the embedded landing-page demo.
 *
 * Translated from api-documentation's MethodBadgeRow tinting pattern,
 * recoloured to CI status semantics from DESIGN.md (Pipeline Running,
 * Pipeline Passed, Pipeline Failed, Pipeline Queued, Pipeline Cancelled,
 * Pipeline Skipped). Dot pulses on `running` per DESIGN.md
 * "Realtime Indicator".
 */

export type PipelineStatus =
  'queued' | 'running' | 'success' | 'failed' | 'cancelled' | 'skipped' | 'healthy' | 'degraded'

const TINT: Record<PipelineStatus, { dot: string; bg: string; text: string; ring: string }> = {
  queued: {
    dot: 'var(--color-pill-queued-dot)',
    bg: 'var(--color-pill-queued-bg)',
    text: 'var(--color-pill-queued-text)',
    ring: 'var(--color-pill-queued-ring)',
  },
  running: {
    dot: 'var(--color-pill-running-dot)',
    bg: 'var(--color-pill-running-bg)',
    text: 'var(--color-pill-running-text)',
    ring: 'var(--color-pill-running-ring)',
  },
  success: {
    dot: 'var(--color-pill-success-dot)',
    bg: 'var(--color-pill-success-bg)',
    text: 'var(--color-pill-success-text)',
    ring: 'var(--color-pill-success-ring)',
  },
  failed: {
    dot: 'var(--color-pill-failed-dot)',
    bg: 'var(--color-pill-failed-bg)',
    text: 'var(--color-pill-failed-text)',
    ring: 'var(--color-pill-failed-ring)',
  },
  cancelled: {
    dot: 'var(--color-pill-cancelled-dot)',
    bg: 'var(--color-pill-cancelled-bg)',
    text: 'var(--color-pill-cancelled-text)',
    ring: 'var(--color-pill-cancelled-ring)',
  },
  skipped: {
    dot: 'var(--color-pill-skipped-dot)',
    bg: 'var(--color-pill-skipped-bg)',
    text: 'var(--color-pill-skipped-text)',
    ring: 'var(--color-pill-skipped-ring)',
  },
  healthy: {
    dot: 'var(--color-pill-success-dot)',
    bg: 'var(--color-pill-success-bg)',
    text: 'var(--color-pill-success-text)',
    ring: 'var(--color-pill-success-ring)',
  },
  degraded: {
    dot: 'var(--color-pill-degraded-dot)',
    bg: 'var(--color-pill-degraded-bg)',
    text: 'var(--color-pill-degraded-text)',
    ring: 'var(--color-pill-degraded-ring)',
  },
}

const DEFAULT_LABEL: Record<PipelineStatus, string> = {
  queued: 'Queued',
  running: 'Running',
  success: 'Passed',
  failed: 'Failed',
  cancelled: 'Cancelled',
  skipped: 'Skipped',
  healthy: 'Healthy',
  degraded: 'Degraded',
}

interface StatusPillProps {
  status: PipelineStatus
  /** Render with a thicker frame; useful at the top of detail pages. */
  emphasis?: boolean
}

export function StatusPill({ status, emphasis = false }: StatusPillProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const tint = TINT[status]
  const label = t(`statusPill.${status}`, {}, { defaultValue: DEFAULT_LABEL[status] })
  const isRunning = status === 'running'

  return (
    <span
      className={cm.cn(
        'inline-flex items-center gap-2 rounded-full font-mono uppercase tracking-widest',
        emphasis ? 'px-3 py-1 text-[11px] font-extrabold' : 'px-2.5 py-0.5 text-[10px] font-black',
      )}
      style={{
        backgroundColor: tint.bg,
        color: tint.text,
        boxShadow: emphasis ? `inset 0 0 0 1px ${tint.ring}` : undefined,
      }}
      data-mol-id={`status-pill-${status}`}
    >
      <span
        className={cm.cn('inline-block rounded-full', isRunning && 'animate-pulse')}
        style={{
          width: emphasis ? 8 : 6,
          height: emphasis ? 8 : 6,
          backgroundColor: tint.dot,
          boxShadow: isRunning ? `0 0 0 3px ${tint.ring}` : undefined,
        }}
        aria-hidden="true"
      />
      {label}
    </span>
  )
}
