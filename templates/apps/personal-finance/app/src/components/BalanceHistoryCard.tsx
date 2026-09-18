import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function BalanceHistoryCard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [period, setPeriod] = useState<'30D' | '90D' | '1Y'>('30D')
  const periodLabel = period.endsWith('D')
    ? t(
        'balanceHistoryCard.periodDays',
        { count: parseInt(period, 10) },
        { defaultValue: '{{count}}D' },
      )
    : t(
        'balanceHistoryCard.periodYears',
        { count: parseInt(period, 10) },
        { defaultValue: '{{count}}Y' },
      )
  return (
    <section
      className={cm.cn(
        cm.sp('p', 6),
        'col-span-12 bg-surface-container-lowest rounded-2xl h-[320px] relative hover:shadow-2xl hover:shadow-on-surface/5 transition-all',
      )}
    >
      <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 6))}>
        <div>
          <h3
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('bold'),
              'font-headline text-on-surface',
            )}
          >
            {t('balanceHistoryCard.title', {}, { defaultValue: 'Balance History' })}
          </h3>
          <p className={cm.cn(cm.textSize('xs'), 'text-foreground-secondary')}>
            {t(
              'balanceHistoryCard.subtitle',
              { period: periodLabel },
              { defaultValue: 'Trailing {{period}} performance' },
            )}
          </p>
        </div>
        <div className={cm.flex({ gap: 'sm' })}>
          {(['30D', '90D', '1Y'] as const).map((p) => {
            const label = p.endsWith('D')
              ? t(
                  'balanceHistoryCard.periodDays',
                  { count: parseInt(p, 10) },
                  { defaultValue: '{{count}}D' },
                )
              : t(
                  'balanceHistoryCard.periodYears',
                  { count: parseInt(p, 10) },
                  { defaultValue: '{{count}}Y' },
                )
            return (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cm.cn(
                  'px-4 py-1.5 text-xs font-bold rounded-full',
                  period === p
                    ? 'bg-surface-container-high text-on-surface-variant'
                    : 'hover:bg-surface-container transition-colors text-foreground-tertiary',
                )}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>
      <div className={cm.cn(cm.w('full'), cm.h(40), cm.sp('mt', 4), 'relative')}>
        {/* Simulated SVG Chart */}
        <svg
          className={cm.cn(cm.w('full'), cm.h('full'), 'preserve-3d')}
          preserveAspectRatio="none"
          viewBox="0 0 1000 200"
        >
          <defs>
            <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--mol-color-primary)" stopOpacity="0.2"></stop>
              <stop offset="100%" stopColor="var(--mol-color-primary)" stopOpacity="0"></stop>
            </linearGradient>
          </defs>
          <path
            d="M0,180 C100,160 150,170 200,130 C250,90 300,110 350,90 C400,70 450,100 500,60 C550,20 600,40 650,50 C700,60 750,30 800,20 C850,10 900,15 1000,10 L1000,200 L0,200 Z"
            fill="url(#chartGradient)"
          ></path>
          <path
            d="M0,180 C100,160 150,170 200,130 C250,90 300,110 350,90 C400,70 450,100 500,60 C550,20 600,40 650,50 C700,60 750,30 800,20 C850,10 900,15 1000,10"
            fill="none"
            stroke="var(--mol-color-primary)"
            strokeLinecap="round"
            strokeWidth="4"
          ></path>
          {/* Highlight pulse */}
          <circle cx="1000" cy="10" fill="var(--mol-color-primary)" r="5"></circle>
          <circle cx="1000" cy="10" fill="var(--mol-color-primary)" opacity="0.3" r="10"></circle>
        </svg>
        <div
          className={cm.cn(
            cm.flex({ justify: 'between' }),
            cm.sp('mt', 6),
            cm.fontWeight('bold'),
            'text-[10px] uppercase tracking-widest text-foreground-tertiary',
          )}
        >
          <span>
            {t(
              'balanceHistoryCard.chartDate',
              { month: t('common.months.september', {}, { defaultValue: 'Sep' }), day: '01' },
              { defaultValue: '{{month}} {{day}}' },
            )}
          </span>
          <span>
            {t(
              'balanceHistoryCard.chartDate',
              { month: t('common.months.september', {}, { defaultValue: 'Sep' }), day: '08' },
              { defaultValue: '{{month}} {{day}}' },
            )}
          </span>
          <span>
            {t(
              'balanceHistoryCard.chartDate',
              { month: t('common.months.september', {}, { defaultValue: 'Sep' }), day: '15' },
              { defaultValue: '{{month}} {{day}}' },
            )}
          </span>
          <span>
            {t(
              'balanceHistoryCard.chartDate',
              { month: t('common.months.september', {}, { defaultValue: 'Sep' }), day: '22' },
              { defaultValue: '{{month}} {{day}}' },
            )}
          </span>
          <span>
            {t(
              'balanceHistoryCard.chartDate',
              { month: t('common.months.september', {}, { defaultValue: 'Sep' }), day: '30' },
              { defaultValue: '{{month}} {{day}}' },
            )}
          </span>
        </div>
      </div>
    </section>
  )
}

export default BalanceHistoryCard
export { BalanceHistoryCard }
