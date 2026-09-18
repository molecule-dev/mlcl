import { getClassMap } from '@molecule/app-ui'

/**
 * Pulsing status dot with optional glow. Used on connection rows,
 * connection cards, the status bar, the table-browser PK column, and
 * the schema-explorer node tree.
 *
 * Translated from the `glow-green` / `glow-red` design baseline classes
 * (radial-gradient halos) into a parameterised primitive keyed off
 * Quarry's connection-state palette in DESIGN.md.
 */

export type StatusTone = 'connected' | 'disconnected' | 'slow' | 'idle' | 'readonly' | 'pk' | 'fk'

const TONE: Record<StatusTone, { dot: string; glow: string }> = {
  connected: {
    dot: 'var(--color-connected)',
    glow: 'color-mix(in srgb, var(--color-connected) 55%, transparent)',
  },
  disconnected: {
    dot: 'var(--color-disconnected)',
    glow: 'color-mix(in srgb, var(--color-disconnected) 55%, transparent)',
  },
  slow: {
    dot: 'var(--color-warn)',
    glow: 'color-mix(in srgb, var(--color-warn) 55%, transparent)',
  },
  idle: { dot: 'var(--color-nullval)', glow: 'transparent' },
  readonly: {
    dot: 'var(--mol-color-info)',
    glow: 'color-mix(in srgb, var(--mol-color-info) 55%, transparent)',
  },
  pk: {
    dot: 'var(--color-pk)',
    glow: 'color-mix(in srgb, var(--color-pk) 55%, transparent)',
  },
  fk: {
    dot: 'var(--color-fk)',
    glow: 'color-mix(in srgb, var(--color-fk) 55%, transparent)',
  },
}

interface StatusDotProps {
  tone: StatusTone
  /** Pixel diameter (default 6). */
  size?: number
  /** Disable the glow halo (e.g. inside dense tables). */
  flat?: boolean
  /** Add a subtle pulse animation (e.g. for long-running queries). */
  pulse?: boolean
  className?: string
}

export function StatusDot({
  tone,
  size = 6,
  flat = false,
  pulse = false,
  className,
}: StatusDotProps) {
  const cm = getClassMap()
  const { dot, glow } = TONE[tone]
  return (
    <span
      aria-hidden="true"
      data-mol-id={`status-dot-${tone}`}
      className={cm.cn('inline-block rounded-full shrink-0', pulse && 'animate-pulse', className)}
      style={{
        width: size,
        height: size,
        backgroundColor: dot,
        boxShadow: flat ? undefined : `0 0 ${Math.max(4, size)}px ${glow}`,
      }}
    />
  )
}
