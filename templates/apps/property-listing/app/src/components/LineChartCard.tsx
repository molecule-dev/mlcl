import React from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export function LineChartCard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        'lg:col-span-2 bg-surface-container-lowest rounded-xl shadow-sm border border-border',
      )}
      data-mol-id="line_chart_card"
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'center' }), cm.sp('mb', 8))}>
        <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-success')}>
          {t('lineChartCard.title', {}, { defaultValue: 'Property Views Over Time' })}
        </h3>
        <div className={cm.cn(cm.flex({ gap: 'md' }))}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'text-on-surface-variant',
            )}
          >
            <span className={cm.cn(cm.w(3), cm.h(3), cm.roundedFull, 'bg-primary')}></span>
            {t('lineChartCard.luxuryAssets', {}, { defaultValue: 'Luxury Assets' })}
          </span>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'text-on-surface-variant',
            )}
          >
            <span className={cm.cn(cm.w(3), cm.h(3), cm.roundedFull, 'bg-primary-fixed')}></span>
            {t('lineChartCard.commercial', {}, { defaultValue: 'Commercial' })}
          </span>
        </div>
      </div>
      <div
        className={cm.cn(
          cm.h(64),
          cm.flex({ align: 'end', justify: 'between' }),
          cm.sp('px', 8),
          cm.sp('py', 4),
          'relative w-full bg-surface-container-low rounded-lg overflow-hidden',
        )}
      >
        {/* Abstract Line Chart Visualization */}
        <div className={cm.cn(cm.flex({ align: 'end' }), 'absolute inset-0')}>
          <svg className={cm.cn('w-full h-full')} preserveAspectRatio="none" viewBox="0 0 100 100">
            <path
              d="M0,80 Q25,20 50,60 T100,30"
              fill="none"
              stroke="#003927"
              strokeLinecap="round"
              strokeWidth="3"
            ></path>
            <path
              d="M0,90 Q30,50 60,80 T100,50"
              fill="none"
              stroke="#acf1d0"
              strokeLinecap="round"
              strokeWidth="3"
            ></path>
          </svg>
        </div>
        <div className={cm.cn(cm.fontWeight('bold'), 'text-[10px] text-on-surface-variant/40')}>
          {t('common.mon', {}, { defaultValue: 'MON' })}
        </div>
        <div className={cm.cn(cm.fontWeight('bold'), 'text-[10px] text-on-surface-variant/40')}>
          {t('common.tue', {}, { defaultValue: 'TUE' })}
        </div>
        <div className={cm.cn(cm.fontWeight('bold'), 'text-[10px] text-on-surface-variant/40')}>
          {t('common.wed', {}, { defaultValue: 'WED' })}
        </div>
        <div className={cm.cn(cm.fontWeight('bold'), 'text-[10px] text-on-surface-variant/40')}>
          {t('common.thu', {}, { defaultValue: 'THU' })}
        </div>
        <div className={cm.cn(cm.fontWeight('bold'), 'text-[10px] text-on-surface-variant/40')}>
          {t('common.fri', {}, { defaultValue: 'FRI' })}
        </div>
        <div className={cm.cn(cm.fontWeight('bold'), 'text-[10px] text-on-surface-variant/40')}>
          {t('common.sat', {}, { defaultValue: 'SAT' })}
        </div>
        <div className={cm.cn(cm.fontWeight('bold'), 'text-[10px] text-on-surface-variant/40')}>
          {t('common.sun', {}, { defaultValue: 'SUN' })}
        </div>
      </div>
    </div>
  )
}

export default LineChartCard
