/**
 * Poll status pill — uppercase 10px tracking-widest pill keyed to the poll
 * lifecycle (live = emerald with pulsing dot, scheduled = amber, closed =
 * slate, draft = violet, archived = neutral).
 *
 * Translated from applicant-tracking's StagePill (uppercase tracking-widest
 * tag with semantic colors) and ci-cd-dashboard's StatusPill (pulsing dot
 * for the active state).
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type PollStatus = 'live' | 'scheduled' | 'closed' | 'draft' | 'archived'

const TINT: Record<PollStatus, { dot: string; bg: string; text: string; ring: string }> = {
  live: {
    dot: 'var(--mol-color-success)',
    bg: 'color-mix(in srgb, var(--mol-color-success) 15%, transparent)',
    text: 'var(--mol-color-success)',
    ring: 'color-mix(in srgb, var(--mol-color-success) 30%, transparent)',
  },
  scheduled: {
    dot: 'var(--mol-color-warning)',
    bg: 'color-mix(in srgb, var(--mol-color-warning) 15%, transparent)',
    text: 'var(--mol-color-warning)',
    ring: 'color-mix(in srgb, var(--mol-color-warning) 30%, transparent)',
  },
  closed: {
    dot: 'var(--color-outline)',
    bg: 'color-mix(in srgb, var(--color-outline) 15%, transparent)',
    text: 'var(--color-on-surface-variant)',
    ring: 'color-mix(in srgb, var(--color-outline) 30%, transparent)',
  },
  draft: {
    dot: 'var(--mol-color-primary)',
    bg: 'color-mix(in srgb, var(--mol-color-primary) 15%, transparent)',
    text: 'var(--mol-color-primary)',
    ring: 'color-mix(in srgb, var(--mol-color-primary) 30%, transparent)',
  },
  archived: {
    dot: 'var(--color-on-surface-variant)',
    bg: 'color-mix(in srgb, var(--color-on-surface-variant) 12%, transparent)',
    text: 'var(--color-on-surface-variant)',
    ring: 'color-mix(in srgb, var(--color-on-surface-variant) 25%, transparent)',
  },
}

const DEFAULT_LABEL: Record<PollStatus, string> = {
  live: 'Live',
  scheduled: 'Scheduled',
  closed: 'Closed',
  draft: 'Draft',
  archived: 'Archived',
}

interface PollStatusPillProps {
  status: PollStatus
  /** Render with thicker frame; for use at the top of detail pages. */
  emphasis?: boolean
}

export function PollStatusPill({ status, emphasis = false }: PollStatusPillProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const tint = TINT[status]
  const label = t(`pollStatusPill.${status}`, {}, { defaultValue: DEFAULT_LABEL[status] })
  const isLive = status === 'live'

  return (
    <span
      className={cm.cn(
        'inline-flex items-center gap-2 rounded-full uppercase tracking-widest',
        emphasis ? 'px-3 py-1 text-[11px] font-extrabold' : 'px-2.5 py-0.5 text-[10px] font-black',
      )}
      style={{
        backgroundColor: tint.bg,
        color: tint.text,
        boxShadow: emphasis ? `inset 0 0 0 1px ${tint.ring}` : undefined,
      }}
      data-mol-id={`poll-status-pill-${status}`}
    >
      <span
        className={cm.cn('inline-block rounded-full', isLive && 'animate-pulse')}
        style={{
          width: emphasis ? 8 : 6,
          height: emphasis ? 8 : 6,
          backgroundColor: tint.dot,
          boxShadow: isLive ? `0 0 0 3px ${tint.ring}` : undefined,
        }}
        aria-hidden="true"
      />
      {label}
    </span>
  )
}
