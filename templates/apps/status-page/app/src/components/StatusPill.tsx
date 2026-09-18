import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Status pill — uppercase mono tracking-widest tag with a status dot,
 * tinted bg/text keyed to the status semantic chain from DESIGN.md.
 * Pulses on `degraded` / `partial_outage` / `major_outage` so an active
 * incident is visually loud without screaming colour.
 *
 * Translated from ci-cd-dashboard's StatusPill (terminal-aesthetic
 * tinted pill) and recoloured to status-page's "status is sacred"
 * semantic chain (operational emerald / degraded amber / partial orange
 * / major red / maintenance indigo).
 */

export type ComponentStatus =
  | 'operational'
  | 'degraded_performance'
  | 'partial_outage'
  | 'major_outage'
  | 'under_maintenance'
  | 'unknown'

const TINT: Record<ComponentStatus, { dot: string; bg: string; text: string; ring: string }> = {
  operational: {
    dot: '#10b981',
    bg: 'rgba(16, 185, 129, 0.15)',
    text: '#6ee7b7',
    ring: 'rgba(16, 185, 129, 0.30)',
  },
  degraded_performance: {
    dot: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.15)',
    text: '#fcd34d',
    ring: 'rgba(245, 158, 11, 0.30)',
  },
  partial_outage: {
    dot: '#f97316',
    bg: 'rgba(249, 115, 22, 0.15)',
    text: '#fdba74',
    ring: 'rgba(249, 115, 22, 0.30)',
  },
  major_outage: {
    dot: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.15)',
    text: '#fca5a5',
    ring: 'rgba(239, 68, 68, 0.30)',
  },
  under_maintenance: {
    dot: '#6366f1',
    bg: 'rgba(99, 102, 241, 0.15)',
    text: '#a5b4fc',
    ring: 'rgba(99, 102, 241, 0.30)',
  },
  unknown: {
    dot: '#6b7280',
    bg: 'rgba(148, 163, 184, 0.12)',
    text: '#cbd5e1',
    ring: 'rgba(148, 163, 184, 0.25)',
  },
}

const DEFAULT_LABEL: Record<ComponentStatus, string> = {
  operational: 'Operational',
  degraded_performance: 'Degraded',
  partial_outage: 'Partial outage',
  major_outage: 'Major outage',
  under_maintenance: 'Maintenance',
  unknown: 'Unknown',
}

const ALWAYS_PULSING: ComponentStatus[] = ['degraded_performance', 'partial_outage', 'major_outage']

interface StatusPillProps {
  status: ComponentStatus
  /** Render a thicker pill — use at the top of detail pages or banner heroes. */
  emphasis?: boolean
  /** Override the default i18n label (e.g. for incident severity reuse). */
  label?: string
}

export function StatusPill({ status, emphasis = false, label }: StatusPillProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const tint = TINT[status]
  const resolved = label ?? t(`statusPill.${status}`, {}, { defaultValue: DEFAULT_LABEL[status] })
  const isPulsing = ALWAYS_PULSING.includes(status)

  return (
    <span
      className={cm.cn(
        'inline-flex items-center gap-2 rounded-full font-mono uppercase tracking-widest whitespace-nowrap',
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
        className={cm.cn('inline-block rounded-full', isPulsing && 'animate-pulse')}
        style={{
          width: emphasis ? 8 : 6,
          height: emphasis ? 8 : 6,
          backgroundColor: tint.dot,
          boxShadow: isPulsing ? `0 0 0 3px ${tint.ring}` : undefined,
        }}
        aria-hidden="true"
      />
      {resolved}
    </span>
  )
}
