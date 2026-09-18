/**
 * Pulsing red recording-status pill — the brand's signature element per
 * DESIGN.md ("Recording indicator pulses red with rgba(239,68,68,0.25) glow").
 *
 * Translated from team-chat's StatusPill but recolored for the broadcast-
 * indicator role and tweaked with an expanding-ring animation built from
 * stacked spans (no extra CSS file required).
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export type RecordingIndicatorState = 'live' | 'processing' | 'ready' | 'idle' | 'paused'

interface RecordingIndicatorProps {
  state: RecordingIndicatorState
  label?: string
  size?: 'sm' | 'md' | 'lg'
}

const dotColor: Record<RecordingIndicatorState, string> = {
  live: 'bg-red-500',
  processing: 'bg-amber-500',
  ready: 'bg-emerald-500',
  idle: 'bg-slate-400',
  paused: 'bg-cyan-400',
}

const ringColor: Record<RecordingIndicatorState, string> = {
  live: 'bg-red-500/30',
  processing: 'bg-amber-500/30',
  ready: 'bg-emerald-500/30',
  idle: 'bg-slate-400/30',
  paused: 'bg-cyan-400/30',
}

const tintBg: Record<RecordingIndicatorState, string> = {
  live: 'bg-error-light text-error ring-red-100',
  processing: 'bg-warning-light text-warning ring-amber-100',
  ready: 'bg-success-light text-success ring-emerald-100',
  idle: 'bg-surface-secondary text-foreground-secondary ring-border',
  paused: 'bg-cyan-50 text-cyan-700 ring-cyan-100',
}

export function RecordingIndicator({ state, label, size = 'md' }: RecordingIndicatorProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const text =
    label ??
    t(
      `recording.indicator.${state}`,
      {},
      {
        defaultValue:
          state === 'live'
            ? 'Recording'
            : state === 'processing'
              ? 'Processing'
              : state === 'paused'
                ? 'Paused'
                : state === 'idle'
                  ? 'Ready to record'
                  : 'Ready',
      },
    )

  const padX = size === 'sm' ? 2 : size === 'lg' ? 4 : 3
  const fontSize = size === 'sm' ? 'text-[10px]' : size === 'lg' ? 'text-sm' : 'text-xs'
  const dot = size === 'sm' ? 'w-1.5 h-1.5' : size === 'lg' ? 'w-3 h-3' : 'w-2 h-2'

  return (
    <span
      className={cm.cn(
        cm.flex({ align: 'center', gap: 2 }),
        cm.sp('px', padX),
        cm.sp('py', 1),
        cm.fontWeight('bold'),
        'rounded-full uppercase tracking-[0.2em] ring-1 transition-colors',
        fontSize,
        tintBg[state],
      )}
    >
      <span className={cm.cn('relative inline-flex', dot)}>
        <span
          aria-hidden="true"
          className={cm.cn(
            'absolute inline-flex h-full w-full rounded-full opacity-75',
            ringColor[state],
            state === 'live' && 'animate-ping',
          )}
        />
        <span className={cm.cn('relative inline-flex rounded-full', dot, dotColor[state])} />
      </span>
      <span>{text}</span>
    </span>
  )
}
