import React from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function AgentDashboardPerformanceChart() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <section
      className={cm.cn(
        cm.flex({ direction: 'col', gap: 'lg' }),
        cm.sp('p', 8),
        'col-span-12 lg:col-span-8 bg-surface-container-lowest rounded-xl shadow-sm border border-border',
      )}
      data-mol-id="performance_chart_card"
    >
      <div className={cm.flex({ align: 'center', justify: 'between' })}>
        <div>
          <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-success')}>
            {t(
              'agentDashboardPerformanceChart.title',
              {},
              { defaultValue: 'Performance Overview' },
            )}
          </h3>
          <p className={cm.cn(cm.textSize('sm'), 'text-foreground-secondary')}>
            {t(
              'agentDashboardPerformanceChart.subtitle',
              { months: 6 },
              { defaultValue: 'Listings vs Closings - Last {{months}} Months' },
            )}
          </p>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'gap-1.5 text-success',
            )}
          >
            <span className={cm.cn(cm.roundedFull, 'w-2.5 h-2.5 bg-emerald-600')}></span>
            {t('agentDashboardPerformanceChart.listings', {}, { defaultValue: 'Listings' })}
          </span>
          <span
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'gap-1.5 text-secondary',
            )}
          >
            <span className={cm.cn(cm.roundedFull, 'w-2.5 h-2.5 bg-secondary')}></span>
            {t('agentDashboardPerformanceChart.closings', {}, { defaultValue: 'Closings' })}
          </span>
        </div>
      </div>
      {/* Visual Chart Mockup */}
      <div
        className={cm.cn(
          cm.flex({ align: 'end', justify: 'between' }),
          cm.sp('px', 4),
          cm.sp('pt', 4),
          cm.w('full'),
          cm.h(64),
          'relative',
        )}
        data-mol-id="chart_visual"
      >
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', justify: 'between' }),
            cm.sp('py', 1),
            cm.sp('px', 4),
            'absolute inset-0 pointer-events-none',
          )}
        >
          <div className={cm.cn(cm.w('full'), 'border-t border-border h-px')}></div>
          <div className={cm.cn(cm.w('full'), 'border-t border-border h-px')}></div>
          <div className={cm.cn(cm.w('full'), 'border-t border-border h-px')}></div>
          <div className={cm.cn(cm.w('full'), 'border-t border-border h-px')}></div>
        </div>
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
            cm.w(12),
            'group z-10',
          )}
        >
          <div
            className={cm.cn(
              cm.flex({ justify: 'center', align: 'end', gap: 'xs' }),
              cm.w('full'),
              cm.h(40),
            )}
          >
            <div
              className={cm.cn(
                cm.w(3),
                cm.h(32),
                'bg-emerald-600/20 rounded-t-sm group-hover:bg-emerald-600 transition-colors',
              )}
            ></div>
            <div
              className={cm.cn(
                cm.w(3),
                cm.h(20),
                'bg-secondary/20 rounded-t-sm group-hover:bg-secondary transition-colors',
              )}
            ></div>
          </div>
          <span className={cm.cn(cm.fontWeight('bold'), 'text-[10px] text-foreground-tertiary')}>
            {t('common.months.january', {}, { defaultValue: 'JAN' })}
          </span>
        </div>
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
            cm.w(12),
            'group z-10',
          )}
        >
          <div
            className={cm.cn(
              cm.flex({ justify: 'center', align: 'end', gap: 'xs' }),
              cm.w('full'),
              cm.h(40),
            )}
          >
            <div
              className={cm.cn(
                cm.w(3),
                cm.h(36),
                'bg-emerald-600/20 rounded-t-sm group-hover:bg-emerald-600 transition-colors',
              )}
            ></div>
            <div
              className={cm.cn(
                cm.w(3),
                cm.h(28),
                'bg-secondary/20 rounded-t-sm group-hover:bg-secondary transition-colors',
              )}
            ></div>
          </div>
          <span className={cm.cn(cm.fontWeight('bold'), 'text-[10px] text-foreground-tertiary')}>
            {t('common.months.february', {}, { defaultValue: 'FEB' })}
          </span>
        </div>
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
            cm.w(12),
            'group z-10',
          )}
        >
          <div
            className={cm.cn(
              cm.flex({ justify: 'center', align: 'end', gap: 'xs' }),
              cm.w('full'),
              cm.h(40),
            )}
          >
            <div
              className={cm.cn(
                cm.w(3),
                cm.h(48),
                'bg-emerald-600/20 rounded-t-sm group-hover:bg-emerald-600 transition-colors',
              )}
            ></div>
            <div
              className={cm.cn(
                cm.w(3),
                cm.h(32),
                'bg-secondary/20 rounded-t-sm group-hover:bg-secondary transition-colors',
              )}
            ></div>
          </div>
          <span className={cm.cn(cm.fontWeight('bold'), 'text-[10px] text-foreground-tertiary')}>
            {t('common.months.march', {}, { defaultValue: 'MAR' })}
          </span>
        </div>
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
            cm.w(12),
            'group z-10',
          )}
        >
          <div
            className={cm.cn(
              cm.flex({ justify: 'center', align: 'end', gap: 'xs' }),
              cm.w('full'),
              cm.h(40),
            )}
          >
            <div
              className={cm.cn(
                cm.w(3),
                cm.h(44),
                'bg-emerald-600/20 rounded-t-sm group-hover:bg-emerald-600 transition-colors',
              )}
            ></div>
            <div
              className={cm.cn(
                cm.w(3),
                cm.h(40),
                'bg-secondary/20 rounded-t-sm group-hover:bg-secondary transition-colors',
              )}
            ></div>
          </div>
          <span className={cm.cn(cm.fontWeight('bold'), 'text-[10px] text-foreground-tertiary')}>
            {t('common.months.april', {}, { defaultValue: 'APR' })}
          </span>
        </div>
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
            cm.w(12),
            'group z-10',
          )}
        >
          <div
            className={cm.cn(
              cm.flex({ justify: 'center', align: 'end', gap: 'xs' }),
              cm.w('full'),
              cm.h(40),
            )}
          >
            <div
              className={cm.cn(
                cm.w(3),
                cm.h(52),
                'bg-emerald-600/20 rounded-t-sm group-hover:bg-emerald-600 transition-colors',
              )}
            ></div>
            <div
              className={cm.cn(
                cm.w(3),
                cm.h(36),
                'bg-secondary/20 rounded-t-sm group-hover:bg-secondary transition-colors',
              )}
            ></div>
          </div>
          <span className={cm.cn(cm.fontWeight('bold'), 'text-[10px] text-foreground-tertiary')}>
            {t('common.months.may', {}, { defaultValue: 'MAY' })}
          </span>
        </div>
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
            cm.w(12),
            'group z-10',
          )}
        >
          <div
            className={cm.cn(
              cm.flex({ justify: 'center', align: 'end', gap: 'xs' }),
              cm.w('full'),
              cm.h(40),
            )}
          >
            <div className={cm.cn(cm.w(3), cm.h(56), 'bg-emerald-600 rounded-t-sm')}></div>
            <div className={cm.cn(cm.w(3), cm.h(44), 'bg-secondary rounded-t-sm')}></div>
          </div>
          <span className={cm.cn(cm.fontWeight('bold'), 'text-[10px] text-foreground')}>
            {t('common.months.june', {}, { defaultValue: 'JUN' })}
          </span>
        </div>
      </div>
    </section>
  )
}

export default AgentDashboardPerformanceChart
export { AgentDashboardPerformanceChart }
