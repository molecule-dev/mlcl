import { useEffect, useRef, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function formatTime(ms: number): string {
  const totalMs = Math.max(0, Math.floor(ms))
  const totalSec = Math.floor(totalMs / 1000)
  const minutes = Math.floor(totalSec / 60)
  const seconds = totalSec % 60
  const millis = totalMs % 1000
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`
}

/**
 * Sticky-bottom DAW transport bar — 48px high, dark-secondary
 * background, brand-violet play disk + record glow, monospace BPM
 * spinner, timecode display.
 *
 * Translated from music-streaming's NowPlayingBar.tsx with the cover/
 * track/like trio stripped and replaced with DAW-specific controls
 * (BPM, time-signature, transport time, loop toggle) per the Fugue
 * DESIGN.md "Transport Bar" component spec.
 */
export function TransportBar() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [isPlaying, setIsPlaying] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isLooping, setIsLooping] = useState(false)
  const [metronomeOn, setMetronomeOn] = useState(false)
  const [bpm, setBpm] = useState(120)
  const [elapsedMs, setElapsedMs] = useState(0)
  const startedAtRef = useRef<number | null>(null)
  const baseRef = useRef(0)

  useEffect(() => {
    if (!isPlaying) {
      if (startedAtRef.current !== null) {
        baseRef.current += performance.now() - startedAtRef.current
        startedAtRef.current = null
      }
      return
    }
    startedAtRef.current = performance.now()
    let raf = 0
    const tick = () => {
      if (startedAtRef.current !== null) {
        setElapsedMs(baseRef.current + (performance.now() - startedAtRef.current))
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [isPlaying])

  const handleRewind = () => {
    baseRef.current = 0
    startedAtRef.current = isPlaying ? performance.now() : null
    setElapsedMs(0)
  }

  const handleSkipForward = () => {
    baseRef.current =
      baseRef.current + (startedAtRef.current ? performance.now() - startedAtRef.current : 0) + 4000
    startedAtRef.current = isPlaying ? performance.now() : null
    setElapsedMs(baseRef.current)
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'md' }),
        cm.sp('px', 6),
        'fixed bottom-0 left-0 right-0 z-40 border-t border-outline-variant',
      )}
      style={{ backgroundColor: 'var(--color-background-secondary)', height: '72px' }}
      role="region"
      aria-label={t('transportBar.label', {}, { defaultValue: 'Transport controls' })}
    >
      <div className={cm.flex({ align: 'center', gap: 'sm' })}>
        <button
          onClick={handleRewind}
          type="button"
          aria-label={t('transportBar.previous', {}, { defaultValue: 'Rewind to start' })}
          className={cm.cn(
            cm.h(9),
            cm.w(9),
            cm.flex({ align: 'center', justify: 'center' }),
            'rounded-full text-on-surface-variant hover:text-on-surface transition-colors',
          )}
        >
          <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
            skip_previous
          </span>
        </button>
        <button
          type="button"
          onClick={() => setIsPlaying((p) => !p)}
          aria-pressed={isPlaying}
          aria-label={
            isPlaying
              ? t('common.pause', {}, { defaultValue: 'Pause' })
              : t('common.play', {}, { defaultValue: 'Play' })
          }
          className={cm.cn(
            cm.h(11),
            cm.w(11),
            cm.flex({ align: 'center', justify: 'center' }),
            'rounded-full text-white shadow-lg transition-transform hover:scale-105 active:scale-95',
          )}
          style={{
            background: isPlaying
              ? 'linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%)'
              : 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
            boxShadow: isPlaying
              ? '0 0 24px rgba(34, 211, 238, 0.5)'
              : '0 8px 24px rgba(139, 92, 246, 0.4)',
          }}
        >
          <span className={cm.cn('material-symbols-outlined text-2xl')} aria-hidden="true">
            {isPlaying ? 'pause' : 'play_arrow'}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setIsRecording((r) => !r)}
          aria-pressed={isRecording}
          aria-label={t('transportBar.record', {}, { defaultValue: 'Record' })}
          className={cm.cn(
            cm.h(9),
            cm.w(9),
            cm.flex({ align: 'center', justify: 'center' }),
            'rounded-full transition-colors',
          )}
          style={{
            color: isRecording ? '#ef4444' : 'var(--color-foreground-secondary)',
            boxShadow: isRecording ? '0 0 16px rgba(239, 68, 68, 0.5)' : undefined,
          }}
        >
          <span
            className={cm.cn('material-symbols-outlined')}
            style={{ fontVariationSettings: isRecording ? "'FILL' 1" : undefined }}
            aria-hidden="true"
          >
            fiber_manual_record
          </span>
        </button>
        <button
          onClick={handleSkipForward}
          type="button"
          aria-label={t('transportBar.next', {}, { defaultValue: 'Skip forward 4s' })}
          className={cm.cn(
            cm.h(9),
            cm.w(9),
            cm.flex({ align: 'center', justify: 'center' }),
            'rounded-full text-on-surface-variant hover:text-on-surface transition-colors',
          )}
        >
          <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
            skip_next
          </span>
        </button>
      </div>

      <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }), cm.flex1, 'min-w-0')}>
        <div className={cm.flex({ direction: 'col' })}>
          <span
            className={cm.cn(
              'text-[9px] font-black uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('transportBar.timecodeLabel', {}, { defaultValue: 'Time' })}
          </span>
          <span
            className={cm.cn('text-base font-mono tabular-nums font-semibold text-on-surface')}
            style={{ letterSpacing: '0.04em' }}
          >
            {formatTime(elapsedMs)}
          </span>
        </div>
        <div className={cm.flex({ direction: 'col' })}>
          <label
            htmlFor="transport-bpm"
            className={cm.cn(
              'text-[9px] font-black uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('transportBar.bpmLabel', {}, { defaultValue: 'BPM' })}
          </label>
          <input
            id="transport-bpm"
            type="number"
            min={20}
            max={300}
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
            className={cm.cn(
              'text-base font-mono tabular-nums font-semibold text-on-surface bg-transparent border-0 outline-none focus:bg-surface-container rounded px-1 -ml-1 w-14',
            )}
          />
        </div>
        <div className={cm.flex({ direction: 'col' })}>
          <span
            className={cm.cn(
              'text-[9px] font-black uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('transportBar.signatureLabel', {}, { defaultValue: 'Sig' })}
          </span>
          <span className={cm.cn('text-base font-mono tabular-nums font-semibold text-on-surface')}>
            4 / 4
          </span>
        </div>
      </div>

      <div className={cm.flex({ align: 'center', gap: 'sm' })}>
        <button
          type="button"
          onClick={() => setIsLooping((l) => !l)}
          aria-pressed={isLooping}
          aria-label={t('transportBar.loop', {}, { defaultValue: 'Toggle loop region' })}
          className={cm.cn(
            cm.h(9),
            cm.w(9),
            cm.flex({ align: 'center', justify: 'center' }),
            'rounded-full transition-colors',
          )}
          style={{
            color: isLooping ? 'var(--daw-secondary)' : 'var(--color-foreground-secondary)',
          }}
        >
          <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
            repeat
          </span>
        </button>
        <button
          onClick={() => setMetronomeOn((m) => !m)}
          type="button"
          aria-pressed={metronomeOn}
          aria-label={t('transportBar.metronome', {}, { defaultValue: 'Metronome' })}
          className={cm.cn(
            cm.h(9),
            cm.w(9),
            cm.flex({ align: 'center', justify: 'center' }),
            'rounded-full transition-colors',
          )}
          style={{
            color: metronomeOn ? 'var(--mol-color-info)' : 'var(--color-foreground-secondary)',
          }}
        >
          <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
            graphic_eq
          </span>
        </button>
      </div>
    </div>
  )
}
