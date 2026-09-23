import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Gradient hero card — today's tracked time in 6xl-extrabold mono with
 * tabular-nums, frosted-glass billable pill, decorative blurred orbs,
 * and an inline SVG sparkline of the last 7 days.
 *
 * Translated from personal-finance's NetWorthCard.tsx.
 */

export interface TimerHeroCardProps {
  trackedToday: string
  billableToday: string
  trendPct: number
  weekly?: ReadonlyArray<number>
}

export function TimerHeroCard({
  trackedToday,
  billableToday,
  trendPct,
  weekly,
}: TimerHeroCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const series = weekly && weekly.length > 0 ? weekly : [0, 0, 0, 0, 0, 0, 0]
  const max = Math.max(...series, 1)
  const points = series
    .map((v, i) => `${(i / Math.max(series.length - 1, 1)) * 400},${100 - (v / max) * 80}`)
    .join(' ')
  const positive = trendPct >= 0

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        'min-h-[320px] p-6 sm:p-10 bg-gradient-to-br from-blue-600 via-blue-700 to-emerald-600 rounded-[2rem] text-white relative overflow-hidden',
      )}
    >
      <div className={cm.cn('relative z-10')}>
        <h2
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            cm.sp('mb', 2),
            'uppercase tracking-widest text-blue-100/80',
          )}
        >
          {t('timerHeroCard.title', {}, { defaultValue: 'Tracked today' })}
        </h2>
        <div className={cm.cn(cm.flex({ align: 'baseline', gap: 'md' }), 'flex-wrap')}>
          <span
            className={cm.cn(
              'text-4xl sm:text-6xl font-extrabold tracking-tighter font-mono tabular-nums',
            )}
          >
            {t('timerHeroCard.tracked', { time: trackedToday }, { defaultValue: '{{time}}' })}
          </span>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.roundedFull,
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'bg-surface/20 backdrop-blur-md',
            )}
          >
            <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
              {positive ? 'trending_up' : 'trending_down'}
            </span>
            {t(
              positive ? 'timerHeroCard.trendUp' : 'timerHeroCard.trendDown',
              { value: Math.abs(trendPct).toFixed(1) },
              { defaultValue: `${positive ? '+' : '-'}{{value}}% vs last week` },
            )}
          </span>
        </div>
        <p className={cm.cn(cm.sp('mt', 4), cm.textSize('sm'), 'text-blue-50/90')}>
          {t(
            'timerHeroCard.billableSubtitle',
            { amount: billableToday },
            { defaultValue: '{{amount}} billable so far · keep going' },
          )}
        </p>
      </div>

      <div className={cm.cn(cm.sp('mt', 8), cm.h(24), cm.w('full'), 'relative z-10')}>
        <svg
          className={cm.cn(cm.w('full'), cm.h('full'))}
          viewBox="0 0 400 100"
          preserveAspectRatio="none"
        >
          <path d={`M0,100 L${points} L400,100 Z`} fill="white" opacity="0.18" />
          <polyline
            points={points}
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Decorative blurred orbs */}
      <div
        className={cm.cn(
          cm.w(80),
          cm.h(80),
          cm.roundedFull,
          'absolute -right-20 -bottom-20 bg-surface/10 blur-3xl',
        )}
      ></div>
      <div
        className={cm.cn(
          cm.w(20),
          cm.h(20),
          cm.roundedFull,
          'absolute right-10 top-10 bg-emerald-300/30 blur-xl',
        )}
      ></div>
    </div>
  )
}

export default TimerHeroCard
