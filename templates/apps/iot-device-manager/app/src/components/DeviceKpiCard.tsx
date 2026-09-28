import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

interface DeviceKpiCardProps {
  label: string
  value: string
  /** Border-l-4 color class — 'border-primary' / 'border-success' / 'border-warning' / 'border-error' / 'border-on-surface-variant'. */
  accentColor?: string
  /** Right-side decoration: telemetry sparkline, signal-strength bars, etc. */
  decoration?: ReactNode
  /** Small inline meta below the value (units, change %, count). */
  meta?: string
  /** Tone the value text — e.g. >0 critical → 'text-error'. */
  valueTone?: string
}

/**
 * KPI card translated from fleet-management's BearingKpiCard:
 * white surface, inset stage accent bar, soft shadow, 11px uppercase
 * tracking-widest label, large extrabold tabular-num mono-font value
 * (suited to telemetry counts), corner sparkline / icon slot.
 */
export function DeviceKpiCard({
  label,
  value,
  accentColor = 'var(--color-primary)',
  decoration,
  meta,
  valueTone = 'text-on-surface',
}: DeviceKpiCardProps) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('p', 5),
        'bg-surface-container-lowest rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all',
        cm.accentCard({ tone: 'custom' }),
      )}
      style={{ ['--mol-accent' as string]: accentColor }}
    >
      <div className={cm.flex({ align: 'start', justify: 'between' })}>
        <span className={cm.cn(cm.accentCardLabel({ tone: 'custom' }))}>{label}</span>
        {decoration}
      </div>
      <div className={cm.cn(cm.sp('mt', 2), cm.flex({ align: 'baseline', gap: 'sm' }))}>
        <span
          className={cm.cn(
            'text-3xl font-extrabold tabular-nums leading-none font-mono',
            valueTone,
          )}
        >
          {value}
        </span>
        {meta && (
          <span className={cm.cn('text-[10px] text-on-surface-variant font-medium')}>{meta}</span>
        )}
      </div>
    </div>
  )
}

/** Telemetry sparkline (5 bars) — telemetry cyan when no color override. */
export function TelemetrySparkline({
  color = '#06b6d4',
  values,
}: {
  color?: string
  values?: ReadonlyArray<number>
}) {
  const series = values && values.length >= 5 ? values.slice(-5) : [4, 9, 14, 11, 18]
  const max = Math.max(...series)
  const heights = series.map((v) => Math.max(2, Math.round((v / max) * 24)))
  return (
    <div
      style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '24px' }}
      aria-hidden="true"
    >
      {heights.map((h, i) => (
        <div
          key={i}
          style={{
            width: '4px',
            height: `${h}px`,
            backgroundColor: color,
            opacity: 0.25 + (i / heights.length) * 0.6,
            borderRadius: '2px 2px 0 0',
          }}
        />
      ))}
    </div>
  )
}

/** 4-bar signal-strength glyph per DESIGN.md "Signal Strength Icon". */
export function SignalStrength({
  bars = 3,
  color = '#0891b2',
  dim = '#cbd5e1',
}: {
  bars?: 0 | 1 | 2 | 3 | 4
  color?: string
  dim?: string
}) {
  const heights = [4, 7, 10, 13]
  return (
    <div
      style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '13px' }}
      aria-hidden="true"
    >
      {heights.map((h, i) => (
        <div
          key={i}
          style={{
            width: '3px',
            height: `${h}px`,
            backgroundColor: i < bars ? color : dim,
            borderRadius: '1px',
          }}
        />
      ))}
    </div>
  )
}
