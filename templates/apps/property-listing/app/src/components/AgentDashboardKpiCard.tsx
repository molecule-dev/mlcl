import React from 'react'

import { getClassMap } from '@molecule/app-ui'

export interface AgentDashboardKpiCardProps {
  title: string
  value: string
  trendLabel: string
  trendIcon: string
  trendColorClass: string
}

export default function AgentDashboardKpiCard({
  title,
  value,
  trendLabel,
  trendIcon,
  trendColorClass,
}: AgentDashboardKpiCardProps) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', gap: 'xs' }),
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-xl shadow-sm border border-border hover:shadow-md transition-shadow',
      )}
      data-mol-id="kpi_1"
    >
      <span
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('semibold'),
          'text-foreground-secondary uppercase tracking-wider',
        )}
      >
        {title}
      </span>
      <div className={cm.flex({ align: 'end', justify: 'between' })}>
        <span className={cm.cn(cm.textSize('3xl'), 'font-extrabold text-success tracking-tighter')}>
          {value}
        </span>
        <span
          className={cm.cn(
            trendColorClass,
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('px', 2),
            cm.sp('py', 1),
            cm.flex({ align: 'center', gap: 'xs' }),
            'rounded-md',
          )}
        >
          {trendLabel}
          <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>{trendIcon}</span>
        </span>
      </div>
    </div>
  )
}
export { AgentDashboardKpiCard }
