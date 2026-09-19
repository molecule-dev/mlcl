import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Incident status pill — the lifecycle half of the incident identity
 * (severity lives in SeverityPill; severity is sacred, status is a
 * workflow). triggered pulses (it is paging someone right now),
 * acknowledged is calm amber, resolved is settled green.
 */

export type IncidentStatus = 'triggered' | 'acknowledged' | 'resolved'

const TINT: Record<IncidentStatus, { dot: string; bg: string; text: string }> = {
  triggered: {
    dot: 'var(--color-severity-critical)',
    bg: 'var(--color-severity-critical-light)',
    text: 'var(--color-severity-critical)',
  },
  acknowledged: {
    dot: 'var(--color-severity-warning)',
    bg: 'var(--color-severity-warning-light)',
    text: 'var(--color-severity-warning)',
  },
  resolved: {
    dot: 'var(--color-severity-resolved)',
    bg: 'var(--color-severity-resolved-light)',
    text: 'var(--color-severity-resolved)',
  },
}

const DEFAULT_LABEL: Record<IncidentStatus, string> = {
  triggered: 'Triggered',
  acknowledged: 'Acknowledged',
  resolved: 'Resolved',
}

const PULSE: IncidentStatus[] = ['triggered']

const FALLBACK_STATUS: IncidentStatus = 'triggered'

interface StatusPillProps {
  status: IncidentStatus
  /** Render with a thicker frame; useful at the top of detail pages. */
  emphasis?: boolean
  /** Override the default localized label. */
  label?: string
}

export function StatusPill({ status, emphasis = false, label }: StatusPillProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const known = (status in TINT ? status : FALLBACK_STATUS) as IncidentStatus
  const tint = TINT[known]
  const text = label ?? t(`statusPill.${known}`, {}, { defaultValue: DEFAULT_LABEL[known] })
  const isPulsing = PULSE.includes(known)

  return (
    <span
      className={cm.cn(
        'inline-flex items-center gap-2 rounded-full font-mono uppercase tracking-widest',
        emphasis ? 'px-3 py-1 text-[11px] font-extrabold' : 'px-2.5 py-0.5 text-[10px] font-black',
      )}
      style={{
        backgroundColor: tint.bg,
        color: tint.text,
        boxShadow: emphasis ? `inset 0 0 0 1px ${tint.bg}` : undefined,
      }}
      data-mol-id={`status-pill-${status}`}
    >
      <span
        className={cm.cn('inline-block rounded-full', isPulsing && 'animate-pulse')}
        style={{
          width: emphasis ? 8 : 6,
          height: emphasis ? 8 : 6,
          backgroundColor: tint.dot,
          boxShadow: isPulsing ? `0 0 0 3px ${tint.bg}` : undefined,
        }}
        aria-hidden="true"
      />
      {text}
    </span>
  )
}
