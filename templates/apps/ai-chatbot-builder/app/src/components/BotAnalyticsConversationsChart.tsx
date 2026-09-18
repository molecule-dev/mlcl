import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function BotAnalyticsConversationsChart() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [activePeriod, setActivePeriod] = useState<'Daily' | 'Weekly'>('Daily')
  return (
    <div
      className={cm.cn(
        cm.sp('p', 8),
        'lg:col-span-2 glass-card rounded-[2rem] border border-surface shadow-sm',
      )}
      data-mol-id="line-chart"
    >
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'center' }), cm.sp('mb', 8))}>
        <div>
          <h4 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}>
            {t(
              'botAnalyticsConversationsChart.title',
              {},
              { defaultValue: 'Conversations Over Time' },
            )}
          </h4>
          <p className={cm.cn(cm.textSize('sm'), 'text-outline')}>
            {t(
              'botAnalyticsConversationsChart.subtitle',
              { days: 30 },
              { defaultValue: 'Growth trends for the last {{days}} days' },
            )}
          </p>
        </div>
        <div className={cm.cn(cm.flex(), 'gap-2')}>
          <button
            className={
              activePeriod === 'Daily'
                ? 'px-4 py-1.5 text-xs font-bold rounded-full bg-primary text-white'
                : 'px-4 py-1.5 text-xs font-bold rounded-full text-outline hover:bg-surface-container transition-colors'
            }
            onClick={() => setActivePeriod('Daily')}
          >
            {t('botAnalyticsConversationsChart.periodDaily', {}, { defaultValue: 'Daily' })}
          </button>
          <button
            className={
              activePeriod === 'Weekly'
                ? 'px-4 py-1.5 text-xs font-bold rounded-full bg-primary text-white'
                : 'px-4 py-1.5 text-xs font-bold rounded-full text-outline hover:bg-surface-container transition-colors'
            }
            onClick={() => setActivePeriod('Weekly')}
          >
            {t('botAnalyticsConversationsChart.periodWeekly', {}, { defaultValue: 'Weekly' })}
          </button>
        </div>
      </div>
      {/* Chart Placeholder Visual */}
      <div
        className={cm.cn(
          cm.flex({ align: 'end', justify: 'between' }),
          cm.sp('mt', 4),
          cm.sp('px', 2),
          'relative h-[300px] w-full gap-1 overflow-hidden',
        )}
      >
        {/* Simulated Line Chart Path */}
        <svg
          className={cm.cn(cm.w('full'), cm.h('full'), 'absolute inset-0 preserve-3d')}
          preserveAspectRatio="none"
          viewBox="0 0 1000 300"
        >
          <defs>
            <linearGradient id="gradient-line" x1="0%" x2="0%" y1="0%" y2="100%">
              <stop
                offset="0%"
                style={{
                  stopColor: 'color-mix(in srgb, var(--color-chart-primary) 20%, transparent)',
                  stopOpacity: '1',
                }}
              ></stop>
              <stop
                offset="100%"
                style={{
                  stopColor: 'color-mix(in srgb, var(--color-chart-primary) 0%, transparent)',
                  stopOpacity: '1',
                }}
              ></stop>
            </linearGradient>
          </defs>
          <path
            d="M0,250 Q100,220 200,240 T400,180 T600,210 T800,100 T1000,130 L1000,300 L0,300 Z"
            fill="url(#gradient-line)"
          ></path>
          <path
            d="M0,250 Q100,220 200,240 T400,180 T600,210 T800,100 T1000,130"
            fill="none"
            stroke="var(--color-chart-primary)"
            strokeLinecap="round"
            strokeWidth="4"
          ></path>
        </svg>
        {/* Grid Lines */}
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', justify: 'between' }),
            cm.sp('py', 2),
            'absolute inset-0 pointer-events-none opacity-20',
          )}
        >
          <div className={cm.cn(cm.w('full'), 'h-px', 'border-t border-outline')}></div>
          <div className={cm.cn(cm.w('full'), 'h-px', 'border-t border-outline')}></div>
          <div className={cm.cn(cm.w('full'), 'h-px', 'border-t border-outline')}></div>
          <div className={cm.cn(cm.w('full'), 'h-px', 'border-t border-outline')}></div>
        </div>
      </div>
      <div
        className={cm.cn(
          cm.flex({ justify: 'between' }),
          cm.sp('mt', 4),
          cm.sp('px', 2),
          cm.fontWeight('bold'),
          'text-[10px] text-outline/60 tracking-widest uppercase',
        )}
      >
        <span>
          {t('botAnalyticsConversationsChart.axisDay', { day: 1 }, { defaultValue: 'Day {{day}}' })}
        </span>
        <span>
          {t(
            'botAnalyticsConversationsChart.axisDay',
            { day: 10 },
            { defaultValue: 'Day {{day}}' },
          )}
        </span>
        <span>
          {t(
            'botAnalyticsConversationsChart.axisDay',
            { day: 20 },
            { defaultValue: 'Day {{day}}' },
          )}
        </span>
        <span>
          {t(
            'botAnalyticsConversationsChart.axisDay',
            { day: 30 },
            { defaultValue: 'Day {{day}}' },
          )}
        </span>
      </div>
    </div>
  )
}

export default BotAnalyticsConversationsChart
export { BotAnalyticsConversationsChart }
