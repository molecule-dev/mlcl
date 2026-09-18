import { useEffect, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Countdown timer — DD:HH:MM:SS in monospace on a dark bar, urgent red pulse
 * once below the urgentBelowMs threshold.
 *
 * Translated from the timer-strip pattern in the Stitch Gavl baseline; the
 * dark `bg-timer` bar comes from DESIGN.md "Timer Bar". Used in auction cards,
 * detail bid panels, and the watchlist live tile.
 */
interface CountdownTimerProps {
  endsAtIso: string
  size?: 'sm' | 'md' | 'lg'
  urgentBelowMs?: number
  showLabel?: boolean
  variant?: 'overlay' | 'inline'
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

function diff(endIso: string): { d: number; h: number; m: number; s: number; total: number } {
  const total = Math.max(0, new Date(endIso).getTime() - Date.now())
  const s = Math.floor(total / 1000)
  return {
    d: Math.floor(s / 86_400),
    h: Math.floor((s % 86_400) / 3_600),
    m: Math.floor((s % 3_600) / 60),
    s: s % 60,
    total,
  }
}

export function CountdownTimer({
  endsAtIso,
  size = 'md',
  urgentBelowMs = 5 * 60 * 1000,
  showLabel = true,
  variant = 'inline',
}: CountdownTimerProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [tick, setTick] = useState(() => diff(endsAtIso))

  useEffect(() => {
    const id = window.setInterval(() => setTick(diff(endsAtIso)), 1000)
    return () => window.clearInterval(id)
  }, [endsAtIso])

  const urgent = tick.total > 0 && tick.total < urgentBelowMs
  const ended = tick.total <= 0
  const text = ended
    ? t('countdownTimer.ended', {}, { defaultValue: 'Ended' })
    : `${pad(tick.d)}:${pad(tick.h)}:${pad(tick.m)}:${pad(tick.s)}`

  const sizeClass = size === 'lg' ? 'text-xl' : size === 'sm' ? 'text-xs' : 'text-sm'
  const padClass = variant === 'overlay' ? 'px-3 py-2' : size === 'lg' ? 'px-4 py-2' : 'px-3 py-1.5'

  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'xs' }),
        padClass,
        sizeClass,
        'rounded-md font-mono tracking-widest tabular-nums text-white',
      )}
      style={{
        backgroundColor: ended
          ? 'var(--mol-color-text-secondary)'
          : urgent
            ? 'var(--color-urgent)'
            : 'var(--color-timer)',
      }}
    >
      <span
        className={cm.cn(
          'material-symbols-outlined',
          size === 'lg' ? 'text-base' : 'text-sm',
          urgent && !ended ? 'animate-pulse' : '',
        )}
        aria-hidden="true"
      >
        timer
      </span>
      <span className={cm.cn('font-medium')}>{text}</span>
      {showLabel && !ended ? (
        <span
          className={cm.cn(
            'uppercase tracking-wider opacity-70 ml-1',
            size === 'sm' ? 'text-[9px]' : 'text-[10px]',
          )}
        >
          {urgent
            ? t('countdownTimer.endingSoon', {}, { defaultValue: 'Ending' })
            : t('status.live', {}, { defaultValue: 'Live' })}
        </span>
      ) : null}
    </div>
  )
}

export default CountdownTimer
