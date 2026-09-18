// Pattern source: bespoke per Neuron DESIGN.md "Execution Log Entry".
// Terminal-styled scrolling panel with timestamp, level chip, and on-surface message.
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS'

export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
}

interface ExecutionLogPanelProps {
  entries: LogEntry[]
  live?: boolean
  title?: string
}

const LEVEL_COLOR: Record<LogLevel, string> = {
  INFO: 'text-secondary',
  WARN: 'text-primary',
  ERROR: 'text-error',
  SUCCESS: 'text-success',
}

export function ExecutionLogPanel({ entries, live = false, title }: ExecutionLogPanelProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const heading = title ?? t('executionLog.title', {}, { defaultValue: 'Live Execution Log' })

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        'bg-background rounded border border-outline-variant/15 overflow-hidden',
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 4),
          cm.sp('py', 2),
          'bg-surface-container-highest border-b border-surface/5',
        )}
      >
        <span
          className={cm.cn(cm.textSize('xs'), 'font-mono text-tertiary uppercase tracking-wider')}
        >
          {heading}
        </span>
        {live && (
          <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
            <span
              className={cm.cn(cm.w(2), cm.h(2), cm.roundedFull, 'bg-secondary animate-pulse')}
            />
          </div>
        )}
      </div>
      <div
        className={cm.cn(
          cm.sp('p', 4),
          cm.textSize('xs'),
          'font-mono space-y-1 overflow-y-auto max-h-[260px]',
        )}
      >
        {entries.map((entry, idx) => (
          <div
            key={`${entry.timestamp}-${idx}`}
            className={cm.cn(
              cm.flex({}),
              cm.sp('px', 2),
              idx % 2 === 0
                ? 'hover:bg-surface/5 py-0.5 rounded transition-colors'
                : 'bg-surface-container-lowest py-0.5 rounded',
            )}
          >
            <span className={cm.cn(cm.shrink0, 'w-[80px] text-tertiary tabular-nums')}>
              {entry.timestamp}
            </span>
            <span className={cm.cn(cm.sp('mr', 2), LEVEL_COLOR[entry.level])}>[{entry.level}]</span>
            <span className="text-on-surface">{entry.message}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ExecutionLogPanel
