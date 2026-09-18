import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Severity pill — bold uppercase tracking-widest tag with a left status dot
 * keyed to the issue's severity. Severity is sacred per DESIGN.md
 * (critical / error / warning / info / resolved / ignored / new). Used on
 * dashboard issue rows, the issue detail header, alert rules, and the
 * embedded landing demo.
 *
 * Translated from ci-cd-dashboard's StatusPill (frosted bg + dot pulse for
 * realtime states) recoloured to error-tracker severity semantics.
 */

export type Severity =
  | 'critical'
  | 'fatal'
  | 'error'
  | 'warning'
  | 'info'
  | 'debug'
  | 'resolved'
  | 'ignored'
  | 'unresolved'
  | 'new'

const TINT: Record<Severity, { dot: string; bg: string; text: string; ring: string }> = {
  critical: {
    dot: 'var(--color-severity-critical)',
    bg: 'var(--color-severity-critical-light)',
    text: 'var(--color-severity-critical)',
    ring: 'var(--color-severity-critical-light)',
  },
  fatal: {
    dot: 'var(--color-severity-critical)',
    bg: 'var(--color-severity-critical-light)',
    text: 'var(--color-severity-critical)',
    ring: 'var(--color-severity-critical-light)',
  },
  error: {
    dot: 'var(--color-severity-error)',
    bg: 'var(--color-severity-error-light)',
    text: 'var(--color-severity-error)',
    ring: 'var(--color-severity-error-light)',
  },
  warning: {
    dot: 'var(--color-severity-warning)',
    bg: 'var(--color-severity-warning-light)',
    text: 'var(--color-severity-warning)',
    ring: 'var(--color-severity-warning-light)',
  },
  info: {
    dot: 'var(--color-severity-info)',
    bg: 'var(--color-severity-info-light)',
    text: 'var(--color-severity-info)',
    ring: 'var(--color-severity-info-light)',
  },
  debug: {
    dot: 'var(--color-severity-muted)',
    bg: 'color-mix(in srgb, var(--color-severity-muted) 12%, transparent)',
    text: 'var(--color-text-secondary)',
    ring: 'color-mix(in srgb, var(--color-severity-muted) 25%, transparent)',
  },
  resolved: {
    dot: 'var(--color-severity-resolved)',
    bg: 'var(--color-severity-resolved-light)',
    text: 'var(--color-severity-resolved)',
    ring: 'var(--color-severity-resolved-light)',
  },
  unresolved: {
    dot: 'var(--color-severity-critical)',
    bg: 'var(--color-severity-critical-light)',
    text: 'var(--color-severity-critical)',
    ring: 'var(--color-severity-critical-light)',
  },
  ignored: {
    dot: 'var(--color-severity-muted)',
    bg: 'color-mix(in srgb, var(--color-severity-muted) 12%, transparent)',
    text: 'var(--color-text-secondary)',
    ring: 'color-mix(in srgb, var(--color-severity-muted) 25%, transparent)',
  },
  new: {
    dot: 'var(--color-severity-new)',
    bg: 'var(--color-severity-new-light)',
    text: 'var(--color-severity-new)',
    ring: 'var(--color-severity-new-light)',
  },
}

const DEFAULT_LABEL: Record<Severity, string> = {
  critical: 'Critical',
  fatal: 'Fatal',
  error: 'Error',
  warning: 'Warning',
  info: 'Info',
  debug: 'Debug',
  resolved: 'Resolved',
  unresolved: 'Unresolved',
  ignored: 'Ignored',
  new: 'New',
}

const PULSE: Severity[] = ['critical', 'fatal', 'unresolved', 'new']

const FALLBACK_SEVERITY: Severity = 'info'

interface SeverityPillProps {
  severity: Severity
  /** Render with a thicker frame; useful at the top of detail pages. */
  emphasis?: boolean
  /** Override the default localized label. */
  label?: string
}

export function SeverityPill({ severity, emphasis = false, label }: SeverityPillProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const known = (severity in TINT ? severity : FALLBACK_SEVERITY) as Severity
  const tint = TINT[known]
  const text = label ?? t(`severityPill.${known}`, {}, { defaultValue: DEFAULT_LABEL[known] })
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
        boxShadow: emphasis ? `inset 0 0 0 1px ${tint.ring}` : undefined,
      }}
      data-mol-id={`severity-pill-${severity}`}
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
      {text}
    </span>
  )
}
