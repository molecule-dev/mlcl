/**
 * Dark monospace execution log — indigo-950 surface, color-coded lines
 * (timestamp indigo, success green, error red), dashed step separators.
 *
 * Translated from helpdesk-ticketing's TicketActivityFeed dark variant +
 * the §13.6 "borderless-underline" log pattern, retuned to mono indigo.
 */
import { getClassMap } from '@molecule/app-ui'

export interface LogEntry {
  ts: string
  level: 'info' | 'success' | 'error' | 'warn'
  step?: string
  message: string
}

interface ExecutionLogPanelProps {
  entries: LogEntry[]
}

// Terminal-scoped tokens — the log surface is always dark, so these stay
// fixed across light/dark mode (the run-badge fg tokens flip per mode and
// would be unreadable on the dark surface in light mode).
const LEVEL_COLOR: Record<LogEntry['level'], string> = {
  info: 'var(--color-terminal-text)',
  success: 'var(--color-terminal-success)',
  error: 'var(--color-terminal-error)',
  warn: 'var(--color-terminal-warn)',
}

export function ExecutionLogPanel({ entries }: ExecutionLogPanelProps) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 4),
        'rounded-xl font-mono text-xs leading-relaxed overflow-x-auto',
      )}
      style={{ background: 'var(--color-terminal-bg)', color: 'var(--color-terminal-text)' }}
      data-mol-id="execution-log"
    >
      {entries.length === 0 ? (
        <div style={{ color: 'var(--color-terminal-accent)' }}>{'// No log entries'}</div>
      ) : (
        entries.map((entry, i) => {
          const showStepHeader = entry.step && (i === 0 || entries[i - 1]?.step !== entry.step)
          return (
            <div key={i}>
              {showStepHeader && (
                <div
                  className={cm.cn(
                    'uppercase tracking-widest',
                    cm.sp('mt', i === 0 ? 0 : 3),
                    cm.sp('mb', 1),
                  )}
                  style={{
                    color: 'var(--color-terminal-step)',
                    borderTop: i === 0 ? 'none' : `1px dashed var(--color-terminal-divider)`,
                    paddingTop: i === 0 ? 0 : 8,
                  }}
                >
                  ▸ {entry.step}
                </div>
              )}
              <div className="whitespace-pre-wrap">
                <span style={{ color: 'var(--color-terminal-accent)' }}>{entry.ts}</span>
                <span style={{ color: LEVEL_COLOR[entry.level] }}> [{entry.level}]</span>{' '}
                <span style={{ color: LEVEL_COLOR[entry.level] }}>{entry.message}</span>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
