import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

interface BearingKpiCardProps {
  label: string
  value: string
  /** Border-l-4 color. Defaults to primary; pass 'border-success' / 'border-error' / 'border-info' / 'border-warning' / 'border-tertiary' for fleet-status semantics. */
  accentColor?: string
  /** Right-side decoration: sparkline bars, an icon, etc. */
  decoration?: ReactNode
  /** Small badge below the value (change %, units, etc). */
  meta?: string
  /** Tone the value text — e.g. for "0 alerts" stays default; >0 alerts → 'text-error'. */
  valueTone?: string
}

/**
 * KPI card translated from CRM's polished pattern:
 * - white surface card, border-l-4 in stage color, soft shadow
 * - 12px uppercase 600-weight label
 * - 30px extrabold tabular-nums value
 * - small sparkline / icon / change badge in the corner
 */
export function BearingKpiCard({
  label,
  value,
  accentColor = 'border-primary',
  decoration,
  meta,
  valueTone = 'text-on-surface',
}: BearingKpiCardProps) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('p', 5),
        'bg-surface-container-lowest rounded-xl border-l-4 shadow-sm hover:shadow-md transition-shadow',
        accentColor,
      )}
    >
      <div className={cm.flex({ align: 'start', justify: 'between' })}>
        <span className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
          {label}
        </span>
        {decoration}
      </div>
      <div className={cm.cn(cm.sp('mt', 2), cm.flex({ align: 'baseline', gap: 'sm' }))}>
        <span className={cm.cn('text-3xl font-extrabold tabular-nums leading-none', valueTone)}>
          {value}
        </span>
        {meta && <span className="text-[10px] text-on-surface-variant font-medium">{meta}</span>}
      </div>
    </div>
  )
}

/** 5-bar mini sparkline matching CRM's pattern, tinted by `color`. */
export function MiniSparkline({
  color,
  values,
}: {
  color: string
  values?: ReadonlyArray<number>
}) {
  const series = values && values.length >= 5 ? values.slice(-5) : [8, 12, 20, 16, 24]
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
            opacity: 0.2 + (i / heights.length) * 0.6,
            borderRadius: '2px 2px 0 0',
          }}
        />
      ))}
    </div>
  )
}
