import { getClassMap } from '@molecule/app-ui'

interface WaveformBarsProps {
  /** How many bars to render. Defaults to 40 (inline). */
  count?: number
  /** Variant — `inline` is short, `tall` is the recording-view height. */
  variant?: 'inline' | 'tall'
  /** Whether bars should pulse to convey live audio. */
  active?: boolean
  className?: string
}

const HEIGHTS_INLINE = [4, 8, 12, 6, 16, 10, 20, 14, 8, 12, 6, 16, 4, 10, 20, 14]
const HEIGHTS_TALL = [12, 28, 44, 22, 56, 36, 72, 50, 28, 44, 22, 56, 12, 36, 72, 50]

/**
 * WaveformBars — decorative gradient waveform.
 *
 * 40-bar (inline) or 64-bar (tall) gradient strip. Heights are stable
 * pseudo-random so the waveform looks "spoken" without animating layout.
 * `active` adds a subtle pulse without recomputing heights every frame.
 */
export function WaveformBars({
  count = 40,
  variant = 'inline',
  active = false,
  className,
}: WaveformBarsProps) {
  const cm = getClassMap()
  const heights = variant === 'tall' ? HEIGHTS_TALL : HEIGHTS_INLINE
  const trackHeight = variant === 'tall' ? 'h-24' : 'h-12'
  return (
    <div
      aria-hidden="true"
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
        trackHeight,
        active ? 'animate-pulse' : '',
        className ?? '',
      )}
    >
      {Array.from({ length: count }).map((_, i) => {
        const h = heights[i % heights.length]
        return (
          <span
            key={i}
            style={{ height: `${h}px`, width: '3px' }}
            className={cm.cn(cm.roundedFull, 'bg-gradient-to-t from-primary to-secondary')}
          />
        )
      })}
    </div>
  )
}
