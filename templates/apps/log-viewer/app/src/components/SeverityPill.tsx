import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Severity pill — bold uppercase tracking-widest tag with a left dot,
 * frosted bg keyed to the log severity. Used on log rows, severity
 * badges, alert detail headers, and the embedded landing demo.
 *
 * Translated from ci-cd-dashboard's StatusPill recoloured to the
 * Signalink severity palette (fatal magenta-red / error orange / warn
 * amber / info cyan / debug slate / trace deep-slate). The dot pulses
 * while live tail is active per DESIGN.md "Live Tail Indicator".
 */

export type Severity = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace'

const TINT: Record<Severity, { dot: string; bg: string; text: string; ring: string }> = {
  fatal: {
    dot: 'var(--color-severity-fatal)',
    bg: 'color-mix(in srgb, var(--color-severity-fatal) 16%, transparent)',
    text: 'var(--color-severity-fatal-light)',
    ring: 'color-mix(in srgb, var(--color-severity-fatal) 40%, transparent)',
  },
  error: {
    dot: 'var(--color-severity-error)',
    bg: 'color-mix(in srgb, var(--color-severity-error) 16%, transparent)',
    text: 'var(--color-severity-error-light)',
    ring: 'color-mix(in srgb, var(--color-severity-error) 40%, transparent)',
  },
  warn: {
    dot: 'var(--color-severity-warn)',
    bg: 'color-mix(in srgb, var(--color-severity-warn) 16%, transparent)',
    text: 'var(--color-severity-warn-light)',
    ring: 'color-mix(in srgb, var(--color-severity-warn) 40%, transparent)',
  },
  info: {
    dot: 'var(--color-severity-info)',
    bg: 'color-mix(in srgb, var(--color-severity-info) 16%, transparent)',
    text: 'var(--color-severity-info-light)',
    ring: 'color-mix(in srgb, var(--color-severity-info) 40%, transparent)',
  },
  debug: {
    dot: 'var(--color-severity-debug)',
    bg: 'color-mix(in srgb, var(--color-severity-debug) 14%, transparent)',
    text: 'var(--color-severity-debug-light)',
    ring: 'color-mix(in srgb, var(--color-severity-debug) 30%, transparent)',
  },
  trace: {
    dot: 'var(--color-severity-trace)',
    bg: 'color-mix(in srgb, var(--color-severity-trace) 14%, transparent)',
    text: 'var(--color-severity-trace-light)',
    ring: 'color-mix(in srgb, var(--color-severity-trace) 30%, transparent)',
  },
}

const DEFAULT_LABEL: Record<Severity, string> = {
  fatal: 'Fatal',
  error: 'Error',
  warn: 'Warn',
  info: 'Info',
  debug: 'Debug',
  trace: 'Trace',
}

interface SeverityPillProps {
  severity: Severity
  /** Render with a thicker frame; useful at the top of detail pages. */
  emphasis?: boolean
  /** Pulse the dot — used to indicate live tail / streaming events. */
  pulse?: boolean
}

export function SeverityPill({ severity, emphasis = false, pulse = false }: SeverityPillProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const tint = TINT[severity]
  const label = t(`severityPill.${severity}`, {}, { defaultValue: DEFAULT_LABEL[severity] })

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
        className={cm.cn('inline-block rounded-full', pulse && 'animate-pulse')}
        style={{
          width: emphasis ? 8 : 6,
          height: emphasis ? 8 : 6,
          backgroundColor: tint.dot,
          boxShadow: pulse ? `0 0 0 3px ${tint.ring}` : undefined,
        }}
        aria-hidden="true"
      />
      {label}
    </span>
  )
}
