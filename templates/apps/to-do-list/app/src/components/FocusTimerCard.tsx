import { useEffect, useRef, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface FocusTimerCardProps {
  /** Optional task title that's the current focus target. */
  currentTaskTitle?: string | null
  /** Goal in minutes (default 120). */
  goalMinutes?: number
  /** Pomodoro length in minutes (default 25). */
  pomodoroMinutes?: number
}

interface PersistedState {
  focusedMinutesToday: number
  /** ISO date (YYYY-MM-DD) for which `focusedMinutesToday` is recorded. */
  date: string
}

const STORAGE_KEY = 'todo.focusTimer.v1'

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function loadPersisted(): PersistedState {
  if (typeof window === 'undefined') return { focusedMinutesToday: 0, date: todayKey() }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { focusedMinutesToday: 0, date: todayKey() }
    const parsed = JSON.parse(raw) as PersistedState
    if (parsed.date !== todayKey()) return { focusedMinutesToday: 0, date: todayKey() }
    return parsed
  } catch (_error) {
    // localStorage unavailable or JSON corrupt; fall back to zero state
    return { focusedMinutesToday: 0, date: todayKey() }
  }
}

function persist(state: PersistedState): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (_error) {
    // quota exceeded; focus progress is best-effort and can be lost safely
  }
}

/**
 * Productivity-flair gradient highlight card with a focus-timer ring,
 * "in focus" task chip, and start/pause CTA. The pomodoro timer is
 * fully functional: it counts down a configurable session, persists
 * accumulated focus minutes per-day in localStorage so the ring keeps
 * its progress across reloads, and resets at midnight automatically.
 */
export function FocusTimerCard({
  currentTaskTitle,
  goalMinutes = 120,
  pomodoroMinutes = 25,
}: FocusTimerCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [persisted, setPersisted] = useState<PersistedState>(() => loadPersisted())
  const [remainingSeconds, setRemainingSeconds] = useState<number>(pomodoroMinutes * 60)
  const [isRunning, setIsRunning] = useState(false)
  const lastTickRef = useRef<number | null>(null)

  // tick: decrement remainingSeconds while running; on hitting 0,
  // commit the full pomodoroMinutes to focusedMinutesToday and stop.
  useEffect(() => {
    if (!isRunning) return
    const id = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        const next = Math.max(0, prev - 1)
        if (next === 0) {
          setIsRunning(false)
          setPersisted((prevState) => {
            const today = todayKey()
            const merged: PersistedState =
              prevState.date === today
                ? {
                    ...prevState,
                    focusedMinutesToday: prevState.focusedMinutesToday + pomodoroMinutes,
                  }
                : { date: today, focusedMinutesToday: pomodoroMinutes }
            persist(merged)
            return merged
          })
          return pomodoroMinutes * 60
        }
        return next
      })
      lastTickRef.current = Date.now()
    }, 1000)
    return () => window.clearInterval(id)
  }, [isRunning, pomodoroMinutes])

  // Reset focused minutes if we cross midnight while the page is open.
  useEffect(() => {
    const id = window.setInterval(() => {
      const today = todayKey()
      if (persisted.date !== today) {
        const reset: PersistedState = { date: today, focusedMinutesToday: 0 }
        setPersisted(reset)
        persist(reset)
      }
    }, 60_000)
    return () => window.clearInterval(id)
  }, [persisted.date])

  const focusedMinutesToday = persisted.focusedMinutesToday
  const pct =
    goalMinutes > 0 ? Math.min(100, Math.round((focusedMinutesToday / goalMinutes) * 100)) : 0
  const r = 38
  const c = 2 * Math.PI * r
  const offset = c * (1 - pct / 100)
  const mm = Math.floor(remainingSeconds / 60)
    .toString()
    .padStart(2, '0')
  const ss = (remainingSeconds % 60).toString().padStart(2, '0')

  const onToggleTimer = () => {
    setIsRunning((prev) => !prev)
  }

  const onReset = () => {
    setIsRunning(false)
    setRemainingSeconds(pomodoroMinutes * 60)
  }

  return (
    <div
      className={cm.cn(
        'relative overflow-hidden rounded-2xl p-6 text-white shadow-xl shadow-violet-500/20',
      )}
      style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #c026d3 100%)' }}
    >
      <div className={cm.cn('relative z-10')}>
        <div className={cm.flex({ align: 'center', justify: 'between' })}>
          <p className={cm.cn('text-[10px] font-bold uppercase tracking-widest opacity-90')}>
            {t('focusTimerCard.title', {}, { defaultValue: 'Focus today' })}
          </p>
          {isRunning ? (
            <span className={cm.cn('relative flex h-2.5 w-2.5')} aria-hidden="true">
              <span
                className={cm.cn(
                  'absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75 animate-ping',
                )}
              />
              <span
                className={cm.cn('relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-300')}
              />
            </span>
          ) : (
            <span
              className={cm.cn(
                'px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface/20 backdrop-blur-md',
              )}
            >
              {t('focusTimerCard.idle', {}, { defaultValue: 'Idle' })}
            </span>
          )}
        </div>

        <div className={cm.cn('flex items-center gap-5 mt-4')}>
          <div className={cm.cn('relative w-24 h-24 shrink-0')}>
            <svg
              className={cm.cn('w-full h-full -rotate-90')}
              viewBox="0 0 100 100"
              aria-hidden="true"
            >
              <circle
                cx="50"
                cy="50"
                r={r}
                fill="none"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="8"
              />
              <circle
                cx="50"
                cy="50"
                r={r}
                fill="none"
                stroke="white"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={c}
                strokeDashoffset={offset}
              />
            </svg>
            <div className={cm.cn('absolute inset-0 flex flex-col items-center justify-center')}>
              <p className={cm.cn('text-2xl font-extrabold tabular-nums')}>{focusedMinutesToday}</p>
              <p className={cm.cn('text-[8px] font-bold uppercase tracking-widest text-white/70')}>
                min
              </p>
            </div>
          </div>
          <div className={cm.cn(cm.flex1, 'min-w-0')}>
            <p
              className={cm.cn('text-3xl font-extrabold tracking-tight tabular-nums')}
              data-mol-id="focus-timer-display"
            >
              {`${mm}:${ss}`}
            </p>
            <p className={cm.cn('text-[11px] opacity-80 mt-1')}>
              {t(
                'focusTimerCard.goal',
                { used: focusedMinutesToday, goal: goalMinutes },
                { defaultValue: '{{used}} of {{goal}} min goal' },
              )}
            </p>
          </div>
        </div>

        {currentTaskTitle && (
          <div className={cm.cn('mt-4 bg-surface/15 backdrop-blur-md rounded-xl px-3 py-2')}>
            <p className={cm.cn('text-[9px] font-bold uppercase tracking-widest opacity-80')}>
              {t('focusTimerCard.inFocus', {}, { defaultValue: 'In focus' })}
            </p>
            <p className={cm.cn('text-sm font-bold line-clamp-1 mt-0.5')}>{currentTaskTitle}</p>
          </div>
        )}

        <div className={cm.cn('mt-5 flex gap-2')}>
          <button
            type="button"
            onClick={onToggleTimer}
            data-mol-id="focus-timer-toggle"
            className={cm.cn(
              'inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold bg-surface text-on-surface hover:bg-surface/90 transition-colors shadow-lg flex-1 justify-center',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              {isRunning ? 'pause' : 'play_arrow'}
            </span>
            {isRunning
              ? t('focusTimerCard.pauseCta', {}, { defaultValue: 'Pause focus' })
              : t(
                  'focusTimerCard.startCta',
                  { mins: pomodoroMinutes },
                  { defaultValue: 'Start {{mins}}-min focus' },
                )}
          </button>
          {(isRunning || remainingSeconds < pomodoroMinutes * 60) && (
            <button
              type="button"
              onClick={onReset}
              aria-label={t('focusTimerCard.resetAria', {}, { defaultValue: 'Reset focus timer' })}
              className={cm.cn(
                'inline-flex items-center justify-center w-11 h-11 rounded-full bg-surface/15 text-white hover:bg-surface/25 transition-colors',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                restart_alt
              </span>
            </button>
          )}
        </div>
      </div>

      <div
        className={cm.cn(
          'absolute -right-12 -bottom-12 w-48 h-48 rounded-full bg-surface/10 blur-3xl',
        )}
        aria-hidden="true"
      />
      <div
        className={cm.cn('absolute right-8 top-8 w-12 h-12 rounded-full bg-surface/15 blur-xl')}
        aria-hidden="true"
      />
    </div>
  )
}
