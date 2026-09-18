import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Capsiva today hero — gradient cyan-to-aqua surface with the day's adherence
 * percentage in 6xl extrabold, frosted-glass streak pill, decorative blurred
 * orbs, and an inline SVG sparkline showing the last seven days' adherence.
 *
 * Translated from personal-finance's NetWorthCard.tsx — the gradient hero
 * shape, frosted pill, decorative orb placement, and 30%-opacity sparkline are
 * lifted directly; the data shape and palette are Capsiva-specific.
 */
export interface TodayHeroCardProps {
  takenCount: number
  totalDoses: number
  upcomingCount: number
  currentStreak: number
  /** Last 7 days' adherence ratios (0..1), oldest first. */
  weekTrend: number[]
  /** Display-formatted current date, e.g. "Sunday, April 26". */
  todayLabel: string
}

export function TodayHeroCard({
  takenCount,
  totalDoses,
  upcomingCount,
  currentStreak,
  weekTrend,
  todayLabel,
}: TodayHeroCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const adherencePct = totalDoses > 0 ? Math.round((takenCount / totalDoses) * 100) : 0

  // Build sparkline path from weekTrend
  const trend = weekTrend.length > 0 ? weekTrend : [1]
  const w = 400
  const h = 100
  const stepX = trend.length > 1 ? w / (trend.length - 1) : w
  const points = trend.map((v, i) => {
    const x = i * stepX
    const y = h - Math.max(6, v * (h - 12))
    return `${x},${y}`
  })
  const linePath = `M${points.join(' L')}`
  const areaPath = `${linePath} L${w},${h} L0,${h} Z`

  return (
    <section
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('p', 10),
        'min-h-[320px] bg-gradient-to-br from-primary to-primary-container rounded-[2rem] text-on-primary relative overflow-hidden',
      )}
    >
      <div className={cm.cn('relative z-10')}>
        <p
          className={cm.cn(
            cm.fontWeight('bold'),
            cm.textSize('xs'),
            cm.sp('mb', 2),
            'uppercase tracking-widest text-on-primary opacity-80',
          )}
        >
          {t('todayHeroCard.eyebrow', { date: todayLabel }, { defaultValue: 'Today · {{date}}' })}
        </p>
        <div className={cm.cn(cm.flex({ align: 'baseline', gap: 'md' }), 'flex-wrap')}>
          <span className={cm.cn('text-6xl font-extrabold tracking-tighter')}>
            {t('todayHeroCard.adherence', { pct: adherencePct }, { defaultValue: '{{pct}}%' })}
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
              local_fire_department
            </span>
            {t(
              'todayHeroCard.streak',
              { days: currentStreak },
              { defaultValue: '{{days}}-day streak' },
            )}
          </span>
        </div>
        <p className={cm.cn(cm.textSize('lg'), cm.sp('mt', 3), 'text-on-primary opacity-90')}>
          {t(
            'todayHeroCard.summary',
            { taken: takenCount, total: totalDoses, upcoming: upcomingCount },
            {
              defaultValue: '{{taken}} of {{total}} doses taken · {{upcoming}} still ahead today',
            },
          )}
        </p>
      </div>

      <div className={cm.cn(cm.sp('mt', 12), cm.h(24), cm.w('full'), 'relative z-10')}>
        <div className={cm.cn(cm.h('full'), 'opacity-30')}>
          <svg
            className={cm.cn(cm.w('full'), cm.h('full'))}
            viewBox={`0 0 ${w} ${h}`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path d={areaPath} fill="white" />
            <path d={linePath} fill="none" stroke="white" strokeWidth="3" />
          </svg>
        </div>
      </div>

      {/* Decorative blurred orbs */}
      <div
        className={cm.cn(
          cm.w(80),
          cm.h(80),
          cm.roundedFull,
          'absolute -right-20 -bottom-20 bg-surface/10 blur-3xl',
        )}
        aria-hidden="true"
      />
      <div
        className={cm.cn(
          cm.w(20),
          cm.h(20),
          cm.roundedFull,
          'absolute right-10 top-10 bg-primary-fixed/20 blur-xl',
        )}
        aria-hidden="true"
      />
    </section>
  )
}

export default TodayHeroCard
