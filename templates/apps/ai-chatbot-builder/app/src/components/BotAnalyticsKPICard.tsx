import React from 'react'

import { getClassMap } from '@molecule/app-ui'

interface BotAnalyticsKPICardProps {
  icon: string
  iconBgClass: string
  iconTextClass: string
  badgeIcon?: string
  badgeText?: string
  label: string
  value: string
}

function BotAnalyticsKPICard({
  icon,
  iconBgClass,
  iconTextClass,
  badgeIcon,
  badgeText,
  label,
  value,
}: BotAnalyticsKPICardProps) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'glass-card rounded-[1.5rem] border border-surface/40 shadow-sm',
      )}
      data-mol-id="kpi-1"
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 4))}>
        <div className={cm.cn('p-3', iconBgClass, 'rounded-2xl', iconTextClass)}>
          <span
            className={cm.cn('material-symbols-outlined')}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {icon}
          </span>
        </div>
        {badgeIcon && badgeText ? (
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.sp('py', 1),
              cm.roundedFull,
              cm.flex({ align: 'center' }),
              'px-2.5 bg-success-light text-success gap-1',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[14px]')}>{badgeIcon}</span>
            {badgeText}
          </span>
        ) : null}
      </div>
      <p
        className={cm.cn(
          cm.textSize('sm'),
          cm.fontWeight('medium'),
          cm.sp('mb', 1),
          'text-outline',
        )}
      >
        {label}
      </p>
      <h3 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'text-on-surface')}>
        {value}
      </h3>
    </div>
  )
}

export default BotAnalyticsKPICard
export { BotAnalyticsKPICard }
