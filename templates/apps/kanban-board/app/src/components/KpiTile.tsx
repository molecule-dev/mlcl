import type { ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * KPI tile — uppercase 10px black-tracking-widest label, 4xl-extrabold value,
 * left-border accent, hover lift. Used in triads/quads above the activity feed.
 *
 * Translated from project-management's KpiCard.tsx and crm's StatsRow tile —
 * Driftboard re-tones the accent border per metric (primary blue, emerald,
 * amber) instead of always primary.
 */
export type KpiAccent = 'primary' | 'success' | 'warning' | 'critical' | 'neutral'

interface KpiTileProps {
  icon: string
  label: string
  value: ReactNode
  delta?: string
  deltaTrend?: 'up' | 'down' | 'flat'
  accent?: KpiAccent
}

const ACCENT_BORDER: Record<KpiAccent, string> = {
  primary: 'border-primary',
  success: 'border-emerald-500',
  warning: 'border-amber-500',
  critical: 'border-error',
  neutral: 'border-outline-variant',
}

const ACCENT_ICON: Record<KpiAccent, string> = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-emerald-500/10 text-success',
  warning: 'bg-amber-500/10 text-warning',
  critical: 'bg-error/10 text-error',
  neutral: 'bg-surface-container-high text-on-surface-variant',
}

export function KpiTile({
  icon,
  label,
  value,
  delta,
  deltaTrend = 'up',
  accent = 'primary',
}: KpiTileProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const trendColor =
    deltaTrend === 'down'
      ? 'text-error'
      : deltaTrend === 'flat'
        ? 'text-on-surface-variant'
        : 'text-success'
  const trendIcon =
    deltaTrend === 'down' ? 'arrow_downward' : deltaTrend === 'flat' ? 'remove' : 'arrow_upward'

  return (
    <div
      className={cm.cn(
        cm.sp('p', 5),
        cm.flex({ direction: 'col' }),
        cm.stack(3),
        'border-l-4 rounded-xl bg-surface-container-lowest shadow-sm transition-transform hover:-translate-y-0.5',
        ACCENT_BORDER[accent],
      )}
    >
      <div className={cm.flex({ justify: 'between', align: 'center' })}>
        <span
          className={cm.cn(
            cm.w(10),
            cm.h(10),
            cm.flex({ align: 'center', justify: 'center' }),
            'rounded-lg',
            ACCENT_ICON[accent],
          )}
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
            {icon}
          </span>
        </span>
        {delta ? (
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              'text-[11px] font-black tracking-widest uppercase',
              trendColor,
            )}
          >
            <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
              {trendIcon}
            </span>
            {delta}
          </span>
        ) : null}
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
          {label}
        </p>
        <p
          className={cm.cn(
            cm.sp('mt', 1),
            'text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface',
          )}
        >
          {value}
        </p>
      </div>
      <span className="sr-only">
        {t('kpiTile.context', { label }, { defaultValue: '{{label}} metric' })}
      </span>
    </div>
  )
}

export default KpiTile
