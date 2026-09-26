/**
 * Quorum / dashboard KPI card — left accent border, uppercase tracking-widest
 * eyebrow, extrabold tabular-num value, optional trend pill and contextual
 * hint. Used on the Dashboard (active polls, votes cast, quorum %, response
 * rate) and Analytics page header strip.
 *
 * Translated from applicant-tracking's KpiCard / personal-finance's KpiCard
 * — same anatomy (border-l-4 brand accent, hover lift, font-black uppercase
 * eyebrow), recoloured to the cyan + emerald civic palette from DESIGN.md.
 */
import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

export type QuorumKpiTone = 'primary' | 'accent' | 'warning' | 'error' | 'navy'

export interface QuorumKpiTrend {
  delta: string
  direction: 'up' | 'down' | 'flat'
  tone?: 'good' | 'warn' | 'bad'
}

interface QuorumKpiCardProps {
  icon?: string
  label: string
  value: ReactNode
  trend?: QuorumKpiTrend
  hint?: string
  tone?: QuorumKpiTone
}

const TREND_TONE: Record<NonNullable<QuorumKpiTrend['tone']>, string> = {
  good: 'bg-success/10 text-success',
  warn: 'bg-warning/15 text-warning',
  bad: 'bg-error/10 text-error',
}

const TREND_ARROW: Record<QuorumKpiTrend['direction'], string> = {
  up: 'arrow_upward',
  down: 'arrow_downward',
  flat: 'remove',
}

const TONE_ACCENT: Record<QuorumKpiTone, { border: string; iconBg: string; iconFg: string }> = {
  primary: {
    border: 'var(--mol-color-info)',
    iconBg: 'color-mix(in srgb, var(--mol-color-info) 10%, transparent)',
    iconFg: 'var(--mol-color-info)',
  },
  accent: {
    border: 'var(--mol-color-success)',
    iconBg: 'color-mix(in srgb, var(--mol-color-success) 10%, transparent)',
    iconFg: 'var(--mol-color-success)',
  },
  warning: {
    border: 'var(--mol-color-warning)',
    iconBg: 'color-mix(in srgb, var(--mol-color-warning) 10%, transparent)',
    iconFg: 'var(--mol-color-warning)',
  },
  error: {
    border: 'var(--mol-color-error)',
    iconBg: 'color-mix(in srgb, var(--mol-color-error) 10%, transparent)',
    iconFg: 'var(--mol-color-error)',
  },
  navy: {
    border: 'var(--color-on-surface)',
    iconBg: 'color-mix(in srgb, var(--color-on-surface) 8%, transparent)',
    iconFg: 'var(--color-on-surface)',
  },
}

export function QuorumKpiCard({
  icon,
  label,
  value,
  trend,
  hint,
  tone = 'primary',
}: QuorumKpiCardProps) {
  const cm = getClassMap()
  const palette = TONE_ACCENT[tone]
  return (
    <div
      className={cm.cn(
        cm.sp('p', 5),
        cm.flex({ direction: 'col', gap: 'sm' }),
        'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all',
      )}
      style={{ borderLeftWidth: '4px', borderLeftColor: palette.border }}
    >
      <div className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
        <p
          className={cm.cn(
            'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {label}
        </p>
        {icon ? (
          <span
            aria-hidden="true"
            className={cm.cn(
              'grid h-9 w-9 place-items-center rounded-full material-symbols-outlined text-[18px]',
            )}
            style={{ backgroundColor: palette.iconBg, color: palette.iconFg }}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <div className={cm.flex({ align: 'baseline', gap: 'sm' })}>
        <span
          className={cm.cn(
            'font-extrabold tabular-nums tracking-tight text-on-surface',
            'text-3xl',
          )}
        >
          {value}
        </span>
        {trend ? (
          <span
            className={cm.cn(
              cm.sp('px', 2),
              'py-0.5 inline-flex items-center gap-1 rounded-full text-[10px] font-black uppercase tracking-widest',
              TREND_TONE[trend.tone ?? 'good'],
            )}
          >
            <span className="material-symbols-outlined text-[12px]" aria-hidden="true">
              {TREND_ARROW[trend.direction]}
            </span>
            {trend.delta}
          </span>
        ) : null}
      </div>
      {hint ? <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>{hint}</p> : null}
    </div>
  )
}
