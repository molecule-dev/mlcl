/**
 * Dashboard KPI card — the shared inset accent bar with the eyebrow in its
 * color, extrabold tabular-num value, optional trend pill and contextual hint.
 *
 * Translated from personal-finance's KpiCard / crm's KpiCard — same anatomy
 * (brand accent bar, hover lift, uppercase eyebrow).
 */
import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

export interface KpiTrend {
  delta: string
  direction: 'up' | 'down' | 'flat'
  tone?: 'good' | 'warn' | 'bad'
}

interface KpiTileProps {
  icon?: string
  label: string
  value: ReactNode
  trend?: KpiTrend
  hint?: string
}

const TREND_TONE: Record<NonNullable<KpiTrend['tone']>, string> = {
  good: 'bg-success/10 text-success',
  warn: 'bg-warning/15 text-warning',
  bad: 'bg-error/10 text-error',
}

const TREND_ARROW: Record<KpiTrend['direction'], string> = {
  up: 'arrow_upward',
  down: 'arrow_downward',
  flat: 'remove',
}

export function KpiTile({ icon, label, value, trend, hint }: KpiTileProps) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 5),
        cm.flex({ direction: 'col', gap: 'sm' }),
        cm.accentCard({ tone: 'primary' }),
        'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all',
      )}
    >
      <header className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
        <p className={cm.accentCardLabel({ tone: 'primary' })}>{label}</p>
        {icon ? (
          <span
            aria-hidden="true"
            className={cm.cn(
              'grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary material-symbols-outlined text-[18px]',
            )}
          >
            {icon}
          </span>
        ) : null}
      </header>
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
            <span className={cm.cn('material-symbols-outlined text-[12px]')} aria-hidden="true">
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
