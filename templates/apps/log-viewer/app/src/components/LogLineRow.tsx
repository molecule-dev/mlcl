import { getClassMap } from '@molecule/app-ui'

import { type Severity, SeverityPill } from './SeverityPill.js'

/**
 * Terminal log line — 28px-tight monospace row with a coloured 3px left
 * border keyed to severity, fixed-width timestamp + service columns, and
 * a flex-1 message that truncates to a single line. Hover reveals a soft
 * cyan tint per DESIGN.md "Log Row Hover".
 *
 * Translated from ci-cd-dashboard's PipelineRow editorial-row treatment
 * (border-l accent + uppercase 10px column labels + hover translate)
 * compressed to log-viewer's 28px row spec from DESIGN.md "Log Line Row".
 */

const ACCENT: Record<Severity, string> = {
  fatal: 'var(--color-severity-fatal)',
  error: 'var(--color-severity-error)',
  warn: 'var(--color-severity-warn)',
  info: 'var(--color-severity-info)',
  debug: 'var(--color-severity-debug)',
  trace: 'var(--color-severity-trace)',
}

export interface LogLine {
  id: string
  timestamp: string
  service: string
  severity: Severity
  message: string
  trace_id?: string | null
}

interface LogLineRowProps {
  line: LogLine
  /** Highlight as the actively selected row. */
  selected?: boolean
  onClick?: () => void
}

function fmtTimestamp(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const hh = d.getHours().toString().padStart(2, '0')
  const mm = d.getMinutes().toString().padStart(2, '0')
  const ss = d.getSeconds().toString().padStart(2, '0')
  const ms = d.getMilliseconds().toString().padStart(3, '0')
  return `${hh}:${mm}:${ss}.${ms}`
}

export function LogLineRow({ line, selected = false, onClick }: LogLineRowProps) {
  const cm = getClassMap()
  const accent = ACCENT[line.severity]
  const interactive = !!onClick

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!interactive}
      className={cm.cn(
        'group w-full text-left flex items-center gap-3 px-3 font-mono text-[13px] leading-[28px] transition-colors',
        'border-b border-border',
        interactive
          ? 'cursor-pointer hover:bg-[color-mix(in srgb, var(--color-primary) 6%, transparent)]'
          : 'cursor-default',
        selected && 'bg-[color-mix(in srgb, var(--color-primary) 12%, transparent)]',
      )}
      style={{
        borderLeft: `3px solid ${accent}`,
      }}
      data-mol-id={`log-line-${line.id}`}
      data-severity={line.severity}
    >
      <span
        className={cm.cn('shrink-0 text-[12px]')}
        style={{
          color: 'var(--color-severity-debug)',
          width: 180,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {fmtTimestamp(line.timestamp)}
      </span>
      <span className={cm.cn('shrink-0 w-[52px]')}>
        <SeverityPill severity={line.severity} />
      </span>
      <span
        className={cm.cn('shrink-0 truncate text-[12px] font-medium')}
        style={{ color: 'var(--color-accent)', width: 140 }}
        title={line.service}
      >
        {line.service}
      </span>
      <span className={cm.cn('flex-1 truncate text-on-surface')} title={line.message}>
        {line.message}
      </span>
      {line.trace_id ? (
        <span
          className={cm.cn(
            'shrink-0 text-[11px] hidden md:inline-flex items-center gap-1 font-mono opacity-70 group-hover:opacity-100 transition-opacity',
          )}
          style={{ color: 'var(--color-severity-debug)' }}
        >
          <span className={cm.cn('material-symbols-outlined text-[12px]')} aria-hidden="true">
            timeline
          </span>
          {line.trace_id.slice(0, 8)}
        </span>
      ) : null}
    </button>
  )
}
