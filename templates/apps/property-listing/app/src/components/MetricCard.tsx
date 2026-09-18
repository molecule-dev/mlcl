import React from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function MetricCard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', gap: 'xs' }),
        cm.sp('p', 6),
        'bg-surface-container-lowest rounded-xl shadow-sm border border-border hover:shadow-md transition-shadow',
      )}
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }))}>
        <span
          className={cm.cn(
            cm.textPrimary,
            cm.sp('p', 3),
            cm.roundedFull,
            'material-symbols-outlined bg-primary-fixed/30',
          )}
          data-icon="ads_click"
        >
          ads_click
        </span>
        <span
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('px', 2),
            cm.sp('py', 1),
            'rounded-md text-error bg-error-container/50',
          )}
        >
          {t('metricCard.change', { value: '-0.5' }, { defaultValue: '{{value}}%' })}
        </span>
      </div>
      <div>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            cm.sp('mb', 1),
            'text-foreground-secondary uppercase tracking-wider',
          )}
        >
          {t('metricCard.label', {}, { defaultValue: 'Conversion Rate' })}
        </p>
        <h3 className={cm.cn(cm.textSize('3xl'), 'font-extrabold text-success tracking-tighter')}>
          {t('metricCard.value', { value: '2.1' }, { defaultValue: '{{value}}%' })}
        </h3>
      </div>
    </div>
  )
}

export default MetricCard
export { MetricCard }
